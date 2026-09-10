import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { AnularPagoDto } from './dto/anular-pago.dto';
import { QueryPagoDto } from './dto/query-pago.dto';

const COMPROBANTE_IMPUTABLE_SELECT = {
  id_comprobante_proveedor: true,
  FK_tipo_comprobante: true,
  letra: true,
  punto_de_venta: true,
  numero: true,
  fecha_emision: true,
  fecha_vencimiento: true,
  importe_total: true,
  saldo_pendiente: true,
  tipoComprobante: {
    select: { nombre: true, aumenta_saldo: true },
  },
} as const;

/** Selección usada al validar los comprobantes que se imputan en un pago (T87). */
const COMPROBANTE_A_IMPUTAR_SELECT = {
  id_comprobante_proveedor: true,
  FK_proveedor: true,
  letra: true,
  punto_de_venta: true,
  numero: true,
  fecha_emision: true,
  estado: true,
  saldo_pendiente: true,
  tipoComprobante: {
    select: { aumenta_saldo: true },
  },
} as const;

type ComprobanteAImputar = Prisma.COMPROBANTEPROVEEDORGetPayload<{
  select: typeof COMPROBANTE_A_IMPUTAR_SELECT;
}>;

const PROVEEDOR_RESUMEN_SELECT = {
  id_proveedor: true,
  razon_social: true,
} as const;

const FORMA_PAGO_RESUMEN_SELECT = {
  id_forma_pago: true,
  nombre: true,
  requiere_referencia: true,
} as const;

const USUARIO_RESUMEN_SELECT = {
  nombre: true,
  apellido: true,
} as const;

/** Ítem del listado (criterio 18): sin el detalle de imputaciones. */
const PAGO_LIST_ITEM_SELECT = {
  id_pago: true,
  fecha_pago: true,
  numero_referencia: true,
  importe_total: true,
  estado: true,
  proveedor: { select: PROVEEDOR_RESUMEN_SELECT },
  formaPago: { select: FORMA_PAGO_RESUMEN_SELECT },
} as const;

/** Datos identificatorios del comprobante imputado en una línea (T88). */
const COMPROBANTE_RESUMEN_SELECT = {
  id_comprobante_proveedor: true,
  FK_tipo_comprobante: true,
  letra: true,
  punto_de_venta: true,
  numero: true,
} as const;

type LineaImputacion = CreatePagoDto['detalle'][number];

const MS_POR_DIA = 1000 * 60 * 60 * 24;

@Injectable()
export class PagoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Comprobantes imputables de un proveedor (T86): alimenta el formulario de
   * emisión de un pago, sin paginar (el usuario necesita verlos todos de una
   * vez para decidir cuáles marcar).
   *
   * Lista DEBE (facturas) y HABER (notas de crédito) ambos tipos llevan saldo
   * propio, así que el único filtro real es `saldo_pendiente > 0`.
   *
   */
  async listarComprobantesImputables(FK_proveedor: number) {
    await this.buscarProveedor(FK_proveedor);

    const comprobantes = await this.prisma.cOMPROBANTEPROVEEDOR.findMany({
      where: {
        FK_proveedor,
        estado: 'REGISTRADO',
        saldo_pendiente: { gt: 0 },
      },
      select: COMPROBANTE_IMPUTABLE_SELECT,
      orderBy: { fecha_vencimiento: 'asc' },
    });

    const hoy = new Date();

    return {
      data: comprobantes.map((comprobante) => {
        const { vencido, dias_vencido } = this.calcularDiasVencido(
          comprobante.fecha_vencimiento,
          hoy,
        );

        return {
          id_comprobante_proveedor: comprobante.id_comprobante_proveedor,
          FK_tipo_comprobante: comprobante.FK_tipo_comprobante,
          tipo_comprobante_nombre: comprobante.tipoComprobante.nombre,
          efecto_saldo: comprobante.tipoComprobante.aumenta_saldo
            ? 'DEBE'
            : 'HABER',
          letra: comprobante.letra,
          punto_de_venta: comprobante.punto_de_venta,
          numero: comprobante.numero,
          fecha_emision: comprobante.fecha_emision,
          fecha_vencimiento: comprobante.fecha_vencimiento,
          importe_total: comprobante.importe_total.toNumber(),
          // No nullable en este listado: el where ya exige `gt: 0`.
          saldo_pendiente: comprobante.saldo_pendiente!.toNumber(),
          vencido,
          dias_vencido,
        };
      }),
    };
  }

  private async buscarProveedor(id: number) {
    const proveedor = await this.prisma.pROVEEDOR.findUnique({
      where: { id_proveedor: id },
    });

    if (!proveedor) {
      throw new NotFoundException(`No existe un proveedor con id ${id}`);
    }

    return proveedor;
  }

  /**
   * Días de calendario entre "hoy" y el vencimiento, normalizando ambas
   * fechas a medianoche UTC antes de restar (para contar días completos, no
   * fracciones de horas). No vencido da `dias_vencido: 0`. Método privado
   * puro para poder testearlo sin base de datos.
   */
  private calcularDiasVencido(fechaVencimiento: Date, hoy: Date) {
    const vencimientoUTC = Date.UTC(
      fechaVencimiento.getUTCFullYear(),
      fechaVencimiento.getUTCMonth(),
      fechaVencimiento.getUTCDate(),
    );
    const hoyUTC = Date.UTC(
      hoy.getUTCFullYear(),
      hoy.getUTCMonth(),
      hoy.getUTCDate(),
    );

    const dias = Math.round((hoyUTC - vencimientoUTC) / MS_POR_DIA);

    return {
      vencido: dias > 0,
      dias_vencido: dias > 0 ? dias : 0,
    };
  }

  /**
   * Validaciones del pago. Cada método valida una sola regla y tira la
   * excepción Nest que corresponde; `create()` (T88) las corre todas antes de
   * abrir la transacción, para fallar barato con mensajes claros.
   */

  private async buscarProveedorActivo(id: number) {
    const proveedor = await this.prisma.pROVEEDOR.findUnique({
      where: { id_proveedor: id },
    });

    if (!proveedor) {
      throw new NotFoundException(`No existe un proveedor con id ${id}`);
    }
    if (!proveedor.estado) {
      throw new ConflictException(
        `El proveedor "${proveedor.razon_social}" está dado de baja y no puede recibir pagos nuevos`,
      );
    }

    return proveedor;
  }

  private async buscarFormaPagoActiva(id: number) {
    const formaPago = await this.prisma.fORMAPAGO.findUnique({
      where: { id_forma_pago: id },
    });

    if (!formaPago) {
      throw new NotFoundException(`No existe una forma de pago con id ${id}`);
    }
    if (!formaPago.estado) {
      throw new ConflictException(
        `La forma de pago "${formaPago.nombre}" está dada de baja y no puede usarse en pagos nuevos`,
      );
    }

    return formaPago;
  }

  private validarNumeroReferencia(
    numeroReferencia: string | undefined,
    formaPago: { requiere_referencia: boolean; nombre: string },
  ) {
    if (formaPago.requiere_referencia && !numeroReferencia) {
      throw new BadRequestException(
        `La forma de pago "${formaPago.nombre}" requiere un número de referencia`,
      );
    }
  }

  /** Default "hoy" si no viene. Nunca admite una fecha futura. */
  private resolverFechaPago(fecha: Date | undefined) {
    const ahora = new Date();

    if (fecha === undefined) {
      return ahora;
    }
    if (fecha > ahora) {
      throw new BadRequestException('La fecha de pago no puede ser futura');
    }

    return fecha;
  }

  /**
   * Busca los comprobantes imputados y valida que existan, que sean del
   * proveedor de la cabecera y que estén disponibles para imputar (REGISTRADO
   * y con saldo pendiente > 0, sea DEBE o HABER — mismo criterio que
   * `listarComprobantesImputables`, T86). Devuelve un Map para que el resto de
   * las validaciones no vuelva a consultar la base.
   */
  private async buscarComprobantesImputables(
    FK_proveedor: number,
    detalle: LineaImputacion[],
  ): Promise<Map<number, ComprobanteAImputar>> {
    const ids = detalle.map((linea) => linea.FK_comprobante_proveedor);

    const comprobantes = await this.prisma.cOMPROBANTEPROVEEDOR.findMany({
      where: { id_comprobante_proveedor: { in: ids } },
      select: COMPROBANTE_A_IMPUTAR_SELECT,
    });
    const comprobantePorId = new Map(
      comprobantes.map((comprobante) => [
        comprobante.id_comprobante_proveedor,
        comprobante,
      ]),
    );

    const noEncontrados = ids.filter((id) => !comprobantePorId.has(id));
    if (noEncontrados.length > 0) {
      throw new NotFoundException(
        `No existe un comprobante con id: ${noEncontrados.join(', ')}`,
      );
    }

    const deOtroProveedor = ids.filter(
      (id) => comprobantePorId.get(id)!.FK_proveedor !== FK_proveedor,
    );
    if (deOtroProveedor.length > 0) {
      throw new BadRequestException(
        `El comprobante con id ${deOtroProveedor.join(', ')} no pertenece al proveedor seleccionado`,
      );
    }

    const noImputables = ids.filter((id) => {
      const comprobante = comprobantePorId.get(id)!;
      return (
        comprobante.estado !== 'REGISTRADO' ||
        !comprobante.saldo_pendiente ||
        comprobante.saldo_pendiente.lessThanOrEqualTo(0)
      );
    });
    if (noImputables.length > 0) {
      throw new ConflictException(
        `El comprobante con id ${noImputables.join(', ')} no está disponible para imputar: tiene que estar REGISTRADO y con saldo pendiente`,
      );
    }

    return comprobantePorId;
  }

  /**
   * Cada importe imputado tiene que ser mayor a 0 (ya lo exige el contrato
   * Zod) y no superar el saldo pendiente del comprobante que imputa — esto sí
   * depende de una consulta a la base, así que se valida acá. Acumula todos
   * los errores en vez de cortar en el primero, mismo criterio que
   * `validarStockSuficiente`.
   */
  private validarImportesImputados(
    detalle: LineaImputacion[],
    comprobantePorId: Map<number, ComprobanteAImputar>,
  ) {
    const errores = detalle
      .filter((linea) => {
        const saldo = comprobantePorId
          .get(linea.FK_comprobante_proveedor)!
          .saldo_pendiente!.toNumber();
        return linea.importe_imputado > saldo;
      })
      .map((linea) => {
        const comprobante = comprobantePorId.get(
          linea.FK_comprobante_proveedor,
        )!;
        const saldo = comprobante.saldo_pendiente!.toNumber();
        return `El comprobante ${this.identificarComprobante(comprobante)} tiene saldo pendiente $${saldo.toFixed(2)}, se intentó imputar $${linea.importe_imputado.toFixed(2)}`;
      });

    if (errores.length > 0) {
      throw new BadRequestException(errores.join('; '));
    }
  }

  /**
   * La fecha de pago no puede ser anterior a la emisión de ninguno de los
   * comprobantes que imputa: no tendría sentido pagar algo antes de que se
   * haya emitido. No se valida contra `fecha_vencimiento` en ningún lado de
   * este service: pagar un comprobante vencido funciona sin advertencias
   * bloqueantes, a propósito.
   */
  private validarFechaPagoContraEmisiones(
    fechaPago: Date,
    detalle: LineaImputacion[],
    comprobantePorId: Map<number, ComprobanteAImputar>,
  ) {
    const masReciente = detalle.reduce((actual, linea) => {
      const comprobante = comprobantePorId.get(linea.FK_comprobante_proveedor)!;
      return comprobante.fecha_emision > actual.fecha_emision
        ? comprobante
        : actual;
    }, comprobantePorId.get(detalle[0].FK_comprobante_proveedor)!);

    if (fechaPago < masReciente.fecha_emision) {
      throw new BadRequestException(
        `La fecha de pago (${this.formatearFecha(fechaPago)}) no puede ser anterior a la fecha de emisión del comprobante ${this.identificarComprobante(masReciente)} (${this.formatearFecha(masReciente.fecha_emision)})`,
      );
    }
  }

  /**
   * Suma por separado lo imputado a comprobantes DEBE (aumentan el saldo,
   * facturas) y HABER (lo disminuyen, notas de crédito), con `Prisma.Decimal`
   * para no perder precisión con floats de JS.
   */
  private totalesPorEfecto(
    detalle: LineaImputacion[],
    comprobantePorId: Map<number, ComprobanteAImputar>,
  ) {
    let totalDebe = new Prisma.Decimal(0);
    let totalHaber = new Prisma.Decimal(0);

    for (const linea of detalle) {
      const comprobante = comprobantePorId.get(linea.FK_comprobante_proveedor)!;
      const importe = new Prisma.Decimal(linea.importe_imputado);

      if (comprobante.tipoComprobante.aumenta_saldo) {
        totalDebe = totalDebe.plus(importe);
      } else {
        totalHaber = totalHaber.plus(importe);
      }
    }

    return { totalDebe, totalHaber };
  }

  /** Importe total del pago: Σ imputado a DEBE − Σ imputado a HABER. */
  private calcularImporteNeto(
    detalle: LineaImputacion[],
    comprobantePorId: Map<number, ComprobanteAImputar>,
  ): Prisma.Decimal {
    const { totalDebe, totalHaber } = this.totalesPorEfecto(
      detalle,
      comprobantePorId,
    );

    return totalDebe.minus(totalHaber);
  }

  /**
   * Tiene que haber al menos un comprobante DEBE imputado (no se puede pagar
   * únicamente con notas de crédito) y el neto no puede dar negativo (las
   * notas de crédito seleccionadas no pueden superar la deuda seleccionada).
   * Un neto en 0 es válido a propósito: representa una deuda liquidada 100%
   * con notas de crédito, sin salida de dinero real.
   */
  private validarImporteNetoValido(
    detalle: LineaImputacion[],
    comprobantePorId: Map<number, ComprobanteAImputar>,
  ) {
    const { totalDebe, totalHaber } = this.totalesPorEfecto(
      detalle,
      comprobantePorId,
    );

    if (totalDebe.isZero()) {
      throw new BadRequestException(
        'El pago debe imputar al menos un comprobante que aumente el saldo (factura); no se puede pagar únicamente con notas de crédito',
      );
    }

    const neto = totalDebe.minus(totalHaber);
    if (neto.isNegative()) {
      throw new BadRequestException(
        `Las notas de crédito imputadas ($${totalHaber.toFixed(2)}) superan la deuda seleccionada ($${totalDebe.toFixed(2)})`,
      );
    }
  }

  private identificarComprobante(comprobante: {
    letra: string;
    punto_de_venta: number;
    numero: number;
  }) {
    const puntoDeVenta = String(comprobante.punto_de_venta).padStart(4, '0');
    const numero = String(comprobante.numero).padStart(8, '0');
    return `${comprobante.letra} ${puntoDeVenta}-${numero}`;
  }

  private formatearFecha(fecha: Date) {
    return fecha.toISOString().slice(0, 10);
  }

  /**
   * Confirma un pago: es el único estado en el que nace (ver Decisiones de
   * la HU), no existe un borrador previo.
   *
   * Corre las nueve validaciones de T87 fuera de la transacción, para fallar
   * barato y con mensajes claros antes de tocar la base. Dentro de una única
   * `$transaction` crea la cabecera y, por cada línea, descuenta el saldo del
   * comprobante imputado con un lock optimista y registra la imputación con
   * la foto de su saldo antes/después — mismo molde que
   * `MovimientoService.create` con el stock.
   */
  async create(dto: CreatePagoDto, usuarioId: number) {
    await this.buscarProveedorActivo(dto.FK_proveedor);
    const formaPago = await this.buscarFormaPagoActiva(dto.FK_forma_pago);
    this.validarNumeroReferencia(dto.numero_referencia, formaPago);
    const fechaPago = this.resolverFechaPago(dto.fecha_pago);

    const comprobantePorId = await this.buscarComprobantesImputables(
      dto.FK_proveedor,
      dto.detalle,
    );
    this.validarImportesImputados(dto.detalle, comprobantePorId);
    this.validarFechaPagoContraEmisiones(
      fechaPago,
      dto.detalle,
      comprobantePorId,
    );
    this.validarImporteNetoValido(dto.detalle, comprobantePorId);

    const importeTotal = this.calcularImporteNeto(
      dto.detalle,
      comprobantePorId,
    );

    const idPago = await this.prisma.$transaction(async (tx) => {
      const pago = await tx.pAGO.create({
        data: {
          fecha_pago: fechaPago,
          numero_referencia: dto.numero_referencia,
          observaciones: dto.observaciones,
          importe_total: importeTotal,
          estado: 'CONFIRMADA',
          ...this.obtenerDatosBancariosProveedor(),
          FK_proveedor: dto.FK_proveedor,
          FK_forma_pago: dto.FK_forma_pago,
          FK_usuario_creador: usuarioId,
          FK_usuario_actualizador: usuarioId,
        },
      });

      for (const linea of dto.detalle) {
        const comprobante = comprobantePorId.get(
          linea.FK_comprobante_proveedor,
        )!;
        // No nulo: buscarComprobantesImputables ya exigió saldo > 0.
        const saldoAnterior = comprobante.saldo_pendiente!;
        const importeImputado = new Prisma.Decimal(linea.importe_imputado);
        const saldoPosterior = saldoAnterior.minus(importeImputado);

        // updateMany y no update: el WHERE lleva el saldo exacto que se leyó
        // al validar, así que la base confirma atómicamente que nadie lo
        // tocó entre esa lectura y esta escritura — lock optimista, mismo
        // criterio que el `updateMany` de stock en `MovimientoService`.
        const { count } = await tx.cOMPROBANTEPROVEEDOR.updateMany({
          where: {
            id_comprobante_proveedor: comprobante.id_comprobante_proveedor,
            saldo_pendiente: saldoAnterior,
            estado: 'REGISTRADO',
          },
          data: {
            saldo_pendiente: saldoPosterior,
            saldo_cancelado: saldoPosterior.equals(0),
            hora_actualizacion: new Date(),
            FK_usuario_actualizador: usuarioId,
          },
        });

        if (count === 0) {
          throw new ConflictException(
            `El saldo del comprobante ${this.identificarComprobante(comprobante)} cambió mientras se procesaba el pago; reintentá la operación`,
          );
        }

        await tx.dETALLEPAGO.create({
          data: {
            FK_pago: pago.id_pago,
            FK_comprobante_proveedor: comprobante.id_comprobante_proveedor,
            importe_imputado: importeImputado,
            saldo_anterior: saldoAnterior,
            saldo_posterior: saldoPosterior,
          },
        });
      }

      return pago.id_pago;
    });

    return this.findOne(idPago);
  }

  /**
   * Listado paginado de pagos (criterio 18), con filtros combinables por
   * proveedor, forma de pago, estado y período (sobre `fecha_pago`, la fecha
   * de negocio). Suma `resumenPeriodo` (control de egresos) cuando la query
   * trae `fechaDesde` y `fechaHasta` juntos; `null` en caso contrario.
   */
  async findAll(query: QueryPagoDto) {
    const {
      FK_proveedor,
      FK_forma_pago,
      estado,
      fechaDesde,
      fechaHasta,
      page,
      limit,
    } = query;

    const where: Prisma.PAGOWhereInput = {
      ...(FK_proveedor !== undefined && { FK_proveedor }),
      ...(FK_forma_pago !== undefined && { FK_forma_pago }),
      ...(estado !== undefined && { estado }),
      ...((fechaDesde !== undefined || fechaHasta !== undefined) && {
        fecha_pago: {
          ...(fechaDesde !== undefined && { gte: fechaDesde }),
          ...(fechaHasta !== undefined && { lte: fechaHasta }),
        },
      }),
    };

    const [pagos, total, resumenPeriodo] = await Promise.all([
      this.prisma.pAGO.findMany({
        where,
        select: PAGO_LIST_ITEM_SELECT,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fecha_pago: 'desc' },
      }),
      this.prisma.pAGO.count({ where }),
      this.calcularResumenPeriodo(query),
    ]);

    return {
      data: pagos.map((pago) => ({
        ...pago,
        importe_total: pago.importe_total.toNumber(),
      })),
      meta: { total, page, limit },
      resumenPeriodo,
    };
  }

  /**
   * Control de egresos del período: total + subtotales por proveedor y por
   * forma de pago. Se calcula siempre sobre pagos CONFIRMADA (ignora el
   * filtro `estado` de la query, si lo hubiera) porque "egresos" tiene que
   * excluir anulados sin importar qué filtro esté aplicado. Solo cuando la
   * query trae `fechaDesde` y `fechaHasta` juntos — si falta alguno de los
   * dos, no hay período definido y se devuelve `null`. El volumen de pagos de
   * un período es chico, así que se agrupa en memoria con un `Map` en vez de
   * un GROUP BY de Postgres.
   */
  private async calcularResumenPeriodo(query: QueryPagoDto) {
    if (!query.fechaDesde || !query.fechaHasta) {
      return null;
    }

    const where: Prisma.PAGOWhereInput = {
      ...(query.FK_proveedor !== undefined && {
        FK_proveedor: query.FK_proveedor,
      }),
      ...(query.FK_forma_pago !== undefined && {
        FK_forma_pago: query.FK_forma_pago,
      }),
      fecha_pago: { gte: query.fechaDesde, lte: query.fechaHasta },
      estado: 'CONFIRMADA',
    };

    const pagos = await this.prisma.pAGO.findMany({
      where,
      select: {
        importe_total: true,
        proveedor: { select: PROVEEDOR_RESUMEN_SELECT },
        formaPago: { select: FORMA_PAGO_RESUMEN_SELECT },
      },
    });

    let totalEgresos = new Prisma.Decimal(0);
    const porProveedor = new Map<
      number,
      { proveedor: (typeof pagos)[number]['proveedor']; total: Prisma.Decimal }
    >();
    const porFormaPago = new Map<
      number,
      { formaPago: (typeof pagos)[number]['formaPago']; total: Prisma.Decimal }
    >();

    for (const pago of pagos) {
      totalEgresos = totalEgresos.plus(pago.importe_total);

      const entradaProveedor = porProveedor.get(
        pago.proveedor.id_proveedor,
      ) ?? {
        proveedor: pago.proveedor,
        total: new Prisma.Decimal(0),
      };
      entradaProveedor.total = entradaProveedor.total.plus(pago.importe_total);
      porProveedor.set(pago.proveedor.id_proveedor, entradaProveedor);

      const entradaFormaPago = porFormaPago.get(
        pago.formaPago.id_forma_pago,
      ) ?? {
        formaPago: pago.formaPago,
        total: new Prisma.Decimal(0),
      };
      entradaFormaPago.total = entradaFormaPago.total.plus(pago.importe_total);
      porFormaPago.set(pago.formaPago.id_forma_pago, entradaFormaPago);
    }

    return {
      totalEgresos: totalEgresos.toNumber(),
      subtotalesPorProveedor: [...porProveedor.values()].map((entrada) => ({
        proveedor: entrada.proveedor,
        total: entrada.total.toNumber(),
      })),
      subtotalesPorFormaPago: [...porFormaPago.values()].map((entrada) => ({
        formaPago: entrada.formaPago,
        total: entrada.total.toNumber(),
      })),
    };
  }

  /**
   * Detalle completo de un pago: cabecera + las líneas de imputación con los
   * datos identificatorios del comprobante que cada una imputa, y quién lo
   * creó/actualizó. Es el shape que alimenta también el documento imprimible
   * ("orden de pago") que pide la HU.
   */
  async findOne(id: number) {
    const pago = await this.prisma.pAGO.findUnique({
      where: { id_pago: id },
      include: {
        proveedor: { select: PROVEEDOR_RESUMEN_SELECT },
        formaPago: { select: FORMA_PAGO_RESUMEN_SELECT },
        usuarioCreador: { select: USUARIO_RESUMEN_SELECT },
        usuarioActualizador: { select: USUARIO_RESUMEN_SELECT },
        detalles: {
          select: {
            id_detalle_pago: true,
            FK_comprobante_proveedor: true,
            importe_imputado: true,
            saldo_anterior: true,
            saldo_posterior: true,
            comprobante: { select: COMPROBANTE_RESUMEN_SELECT },
          },
          orderBy: { id_detalle_pago: 'asc' },
        },
      },
    });

    if (!pago) {
      throw new NotFoundException(`No existe un pago con id ${id}`);
    }

    const { detalles, ...cabecera } = pago;

    return {
      ...cabecera,
      importe_total: cabecera.importe_total.toNumber(),
      detalle: detalles.map((linea) => ({
        id_detalle_pago: linea.id_detalle_pago,
        FK_comprobante_proveedor: linea.FK_comprobante_proveedor,
        importe_imputado: linea.importe_imputado.toNumber(),
        saldo_anterior: linea.saldo_anterior.toNumber(),
        saldo_posterior: linea.saldo_posterior.toNumber(),
        comprobante: linea.comprobante,
      })),
    };
  }

  /**
   * Foto de los datos bancarios del proveedor al confirmar (HU-12, bloqueado
   * hoy: ver Decisiones de la HU). Siempre `null` hasta que `PROVEEDOR` tenga
   * banco/titular/cbu/alias — el día que existan, este método pasa a
   * leerlos, sin tocar el resto del service.
   */
  private obtenerDatosBancariosProveedor() {
    return {
      banco_utilizado: null,
      titular_utilizado: null,
      cbu_utilizado: null,
      alias_utilizado: null,
    };
  }

  private async buscarPagoConfirmado(id: number) {
    const pago = await this.prisma.pAGO.findUnique({
      where: { id_pago: id },
      include: { detalles: true },
    });

    if (!pago) {
      throw new NotFoundException(`No existe un pago con id ${id}`);
    }
    if (pago.estado !== 'CONFIRMADA') {
      throw new ConflictException(
        `El pago ${id} no está CONFIRMADA (estado actual: ${pago.estado}); no se puede anular`,
      );
    }

    return pago;
  }

  /**
   * Anula un pago confirmado. Dentro de una única `$transaction`, restituye a
   * cada comprobante imputado exactamente lo que este pago descontó (con
   * `increment`, no un valor recalculado: el comprobante pudo haber recibido
   * otros pagos después de este) y vuelve a `PENDIENTE` (`saldo_cancelado:
   * false`, criterio 16), y recién después marca la cabecera como ANULADA con
   * su motivo.
   *
   * No se tocan las líneas de `DETALLEPAGO`: `saldo_anterior`/
   * `saldo_posterior` son la foto histórica de lo que pasó al confirmar y
   * siguen valiendo aunque el pago se anule.
   */
  async anular(id: number, dto: AnularPagoDto, usuarioId: number) {
    const pago = await this.buscarPagoConfirmado(id);

    await this.prisma.$transaction(async (tx) => {
      for (const detalle of pago.detalles) {
        await tx.cOMPROBANTEPROVEEDOR.update({
          where: {
            id_comprobante_proveedor: detalle.FK_comprobante_proveedor,
          },
          data: {
            saldo_pendiente: { increment: detalle.importe_imputado },
            saldo_cancelado: false,
            hora_actualizacion: new Date(),
            FK_usuario_actualizador: usuarioId,
          },
        });
      }

      await tx.pAGO.update({
        where: { id_pago: id },
        data: {
          estado: 'ANULADA',
          motivo_anulacion: dto.motivo_anulacion,
          hora_actualizacion: new Date(),
          FK_usuario_actualizador: usuarioId,
        },
      });
    });

    return this.findOne(id);
  }
}
