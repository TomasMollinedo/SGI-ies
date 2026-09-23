import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  EstadoComercial,
  EstadoCuota,
  OrigenCobro,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { calcularDiasVencido } from '../../../common/validaciones/dias-vencido';
import { validarNumeroReferencia } from '../../../common/validaciones/validar-numero-referencia';
import { PublicacionService } from '../publicacion/publicacion.service';
import { CreateCobroDto } from './dto/create-cobro.dto';
import { AnularCobroDto } from './dto/anular-cobro.dto';
import { QueryCobroDto } from './dto/query-cobro.dto';
import { QueryCuotasImputablesDto } from './dto/query-cuotas-imputables.dto';
import { QueryCuotasVencidasDto } from './dto/query-cuotas-vencidas.dto';

const CLIENTE_RESUMEN_SELECT = {
  id_cliente: true,
  nombre: true,
  apellido: true,
  dni_cuil: true,
  email: true,
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

const COBRO_LIST_ITEM_SELECT = {
  id_cobro: true,
  fecha_cobro: true,
  numero_referencia: true,
  importe_total: true,
  origen: true,
  estado: true,
  cliente: { select: CLIENTE_RESUMEN_SELECT },
  formaPago: { select: FORMA_PAGO_RESUMEN_SELECT },
} as const;

/** Datos identificatorios de la cuota imputada en una línea (detalle del cobro). */
const CUOTA_RESUMEN_SELECT = {
  id_cuota: true,
  numero: true,
  FK_venta: true,
} as const;

/** Selección usada al validar las cuotas que se imputan en un cobro. */
const CUOTA_A_IMPUTAR_SELECT = {
  id_cuota: true,
  numero: true,
  importe: true,
  saldo_pendiente: true,
  estado: true,
  FK_venta: true,
  venta: {
    select: { FK_cliente: true, estado: true, FK_publicacion: true },
  },
} as const;

type CuotaAImputar = Prisma.CUOTAGetPayload<{
  select: typeof CUOTA_A_IMPUTAR_SELECT;
}>;

type LineaImputacionCobro = CreateCobroDto['detalle'][number];

/**
 * Lo mínimo que `crearInterno` necesita de cada cuota imputada — subconjunto
 * de `CuotaAImputar`. Separado a propósito: `DeclaracionPagoService` arma su
 * propio mapa con esta forma (a partir de su propia relectura de la cuota
 * dentro de su transacción) sin depender del resto de los campos de
 * `CuotaAImputar`, que son de uso exclusivo de las validaciones previas de
 * `crear()`.
 */
export type LineaCuotaParaCobro = {
  id_cuota: number;
  numero: number;
  saldo_pendiente: Prisma.Decimal;
  FK_venta: number;
};

@Injectable()
export class CobroService {
  constructor(
    private readonly prisma: PrismaService,
    /**
     * Solo por `transicionarEstadoComercial`: soy dueño de las dos
     * transiciones que HU-27 menciona (saldo cero → VENDIDA; anular reabre
     * saldo → EN_PLAN_DE_PAGO), y las dos se resuelven con este mismo
     * mecanismo, ya armado por T103.
     */
    private readonly publicaciones: PublicacionService,
  ) {}

  /**
   * Cuotas imputables de un cliente: alimenta el formulario de cobro, sin
   * paginar (necesita verlas todas de una vez). Solo cuotas con saldo > 0,
   * excluyendo anuladas y ventas canceladas — mismo criterio de "disponible
   * para imputar" que `PagoService.listarComprobantesImputables`.
   */
  async listarCuotasImputables(query: QueryCuotasImputablesDto) {
    await this.buscarCliente(query.FK_cliente);

    const cuotas = await this.prisma.cUOTA.findMany({
      where: {
        saldo_pendiente: { gt: 0 },
        estado: { not: EstadoCuota.ANULADA },
        venta: {
          FK_cliente: query.FK_cliente,
          estado: { not: 'CANCELADA' },
        },
      },
      select: {
        id_cuota: true,
        numero: true,
        fecha_vencimiento: true,
        importe: true,
        saldo_pendiente: true,
        venta: {
          select: {
            id_venta: true,
            publicacion: {
              select: {
                unidadFuncional: { select: { identificador: true } },
              },
            },
          },
        },
      },
      orderBy: { fecha_vencimiento: 'asc' },
    });

    const hoy = new Date();

    return {
      data: cuotas.map((cuota) => {
        const { vencido, dias_vencido } = calcularDiasVencido(
          cuota.fecha_vencimiento,
          hoy,
        );

        return {
          id_cuota: cuota.id_cuota,
          numero: cuota.numero,
          fecha_vencimiento: cuota.fecha_vencimiento,
          importe: cuota.importe.toNumber(),
          // No nullable en este listado: el where ya exige `gt: 0`.
          saldo_pendiente: cuota.saldo_pendiente.toNumber(),
          vencido,
          dias_vencido,
          venta: {
            id_venta: cuota.venta.id_venta,
            unidad: {
              identificador:
                cuota.venta.publicacion.unidadFuncional.identificador,
            },
          },
        };
      }),
    };
  }

  /**
   * Cuotas vencidas de todo el sistema, filtrables por cliente y por
   * proyecto — consulta de seguimiento para Comercialización, no un
   * formulario. Ordenadas por días de atraso descendente (las más
   * atrasadas primero).
   */
  async listarCuotasVencidas(query: QueryCuotasVencidasDto) {
    const hoy = new Date();

    const cuotas = await this.prisma.cUOTA.findMany({
      where: {
        saldo_pendiente: { gt: 0 },
        estado: { not: EstadoCuota.ANULADA },
        fecha_vencimiento: { lt: hoy },
        venta: {
          estado: { not: 'CANCELADA' },
          ...(query.FK_cliente !== undefined && {
            FK_cliente: query.FK_cliente,
          }),
          ...(query.FK_proyecto !== undefined && {
            publicacion: {
              unidadFuncional: { FK_proyecto: query.FK_proyecto },
            },
          }),
        },
      },
      select: {
        id_cuota: true,
        numero: true,
        fecha_vencimiento: true,
        importe: true,
        saldo_pendiente: true,
        venta: {
          select: {
            id_venta: true,
            cliente: {
              select: { id_cliente: true, nombre: true, apellido: true },
            },
            publicacion: {
              select: {
                unidadFuncional: {
                  select: {
                    identificador: true,
                    proyecto: { select: { id_proyecto: true, nombre: true } },
                  },
                },
              },
            },
          },
        },
      },
      // No hay columna `dias_vencido`: se ordena por fecha de vencimiento
      // ascendente (la más vieja es la más atrasada) y se invierte en
      // memoria, ya que el volumen de cuotas vencidas es chico.
      orderBy: { fecha_vencimiento: 'asc' },
    });

    return {
      data: cuotas
        .map((cuota) => {
          const { dias_vencido } = calcularDiasVencido(
            cuota.fecha_vencimiento,
            hoy,
          );
          const unidad = cuota.venta.publicacion.unidadFuncional;
          return {
            id_cuota: cuota.id_cuota,
            numero: cuota.numero,
            fecha_vencimiento: cuota.fecha_vencimiento,
            importe: cuota.importe.toNumber(),
            saldo_pendiente: cuota.saldo_pendiente.toNumber(),
            dias_vencido,
            cliente: cuota.venta.cliente,
            venta: {
              id_venta: cuota.venta.id_venta,
              unidad: { identificador: unidad.identificador },
              proyecto: unidad.proyecto,
            },
          };
        })
        .sort((a, b) => b.dias_vencido - a.dias_vencido),
    };
  }

  private async buscarCliente(id: number) {
    const cliente = await this.prisma.cLIENTE.findUnique({
      where: { id_cliente: id },
    });

    if (!cliente) {
      throw new NotFoundException(`No existe un cliente con id ${id}`);
    }

    return cliente;
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
        `La forma de pago "${formaPago.nombre}" está dada de baja y no puede usarse en cobros nuevos`,
      );
    }

    return formaPago;
  }

  /** Default "hoy" si no viene. Nunca admite una fecha futura. */
  private resolverFechaCobro(fecha: Date | undefined) {
    const ahora = new Date();

    if (fecha === undefined) {
      return ahora;
    }
    if (fecha > ahora) {
      throw new BadRequestException('La fecha de cobro no puede ser futura');
    }

    return fecha;
  }

  /**
   * Busca las cuotas imputadas y valida, en orden: que existan, que
   * pertenezcan a una venta del cliente del cobro (rechazo "cuota de otro
   * cliente" — validación nueva que la HU no pedía), y que estén
   * disponibles para imputar (no ANULADA, saldo pendiente > 0, y la venta
   * no CANCELADA). Devuelve un Map para que el resto de las validaciones no
   * vuelva a consultar la base.
   */
  private async buscarCuotasImputables(
    FK_cliente: number,
    detalle: LineaImputacionCobro[],
  ): Promise<Map<number, CuotaAImputar>> {
    const ids = detalle.map((linea) => linea.FK_cuota);

    const cuotas = await this.prisma.cUOTA.findMany({
      where: { id_cuota: { in: ids } },
      select: CUOTA_A_IMPUTAR_SELECT,
    });
    const cuotaPorId = new Map(cuotas.map((cuota) => [cuota.id_cuota, cuota]));

    const noEncontradas = ids.filter((id) => !cuotaPorId.has(id));
    if (noEncontradas.length > 0) {
      throw new NotFoundException(
        `No existe una cuota con id: ${noEncontradas.join(', ')}`,
      );
    }

    const deOtroCliente = ids.filter(
      (id) => cuotaPorId.get(id)!.venta.FK_cliente !== FK_cliente,
    );
    if (deOtroCliente.length > 0) {
      throw new BadRequestException(
        `La cuota con id ${deOtroCliente.join(', ')} no pertenece a una venta de este cliente`,
      );
    }

    const noImputables = ids.filter((id) => {
      const cuota = cuotaPorId.get(id)!;
      return (
        cuota.estado === EstadoCuota.ANULADA ||
        cuota.venta.estado === 'CANCELADA' ||
        cuota.saldo_pendiente.lessThanOrEqualTo(0)
      );
    });
    if (noImputables.length > 0) {
      throw new ConflictException(
        `La cuota con id ${noImputables.join(', ')} no está disponible para imputar: tiene que tener saldo pendiente, no estar anulada, y su venta no estar cancelada`,
      );
    }

    return cuotaPorId;
  }

  /**
   * Cada importe imputado no puede superar el saldo pendiente de la cuota
   * que imputa. Acumula todos los errores en vez de cortar en el primero,
   * mismo criterio que `PagoService.validarImportesImputados`.
   */
  private validarImportesImputados(
    detalle: LineaImputacionCobro[],
    cuotaPorId: Map<number, CuotaAImputar>,
  ) {
    const errores = detalle
      .filter((linea) => {
        const saldo = cuotaPorId
          .get(linea.FK_cuota)!
          .saldo_pendiente.toNumber();
        return linea.importe_imputado > saldo;
      })
      .map((linea) => {
        const cuota = cuotaPorId.get(linea.FK_cuota)!;
        const saldo = cuota.saldo_pendiente.toNumber();
        return `La cuota ${cuota.numero} tiene saldo pendiente $${saldo.toFixed(2)}, se intentó imputar $${linea.importe_imputado.toFixed(2)}`;
      });

    if (errores.length > 0) {
      throw new BadRequestException(errores.join('; '));
    }
  }

  /**
   * `COBRO.importe_total` es un dato que manda el cliente (a diferencia de
   * Pago, que lo calcula) — tiene que coincidir exacto con la suma del
   * detalle. Sin molde en Pago: ahí nunca hace falta validar esto porque
   * nunca se recibe un total desde afuera.
   */
  private validarSumaTotal(
    detalle: LineaImputacionCobro[],
    importeTotal: number,
  ) {
    const suma = detalle.reduce(
      (acumulado, linea) => acumulado.plus(linea.importe_imputado),
      new Prisma.Decimal(0),
    );

    if (!suma.equals(importeTotal)) {
      throw new BadRequestException(
        `La suma de las cuotas imputadas ($${suma.toFixed(2)}) no coincide con el importe total del cobro ($${importeTotal.toFixed(2)})`,
      );
    }
  }

  /**
   * Registra un cobro. Corazón reutilizable para un futuro origen ECOMMERCE
   * (HU-29, diferida): esta misma validación de saldos y esta misma
   * transacción sirven sin cambios, cambiando solo `origen` y de dónde sale
   * `usuarioId` (acá siempre el usuario de Comercialización autenticado).
   *
   * Corre las validaciones fuera de la transacción, para fallar barato antes
   * de tocar la base, y delega el resto (crear la cabecera, descontar saldo,
   * registrar la imputación, transicionar la publicación) en `crearInterno`
   * dentro de una `$transaction` propia — ver ese método para el detalle.
   */
  async crear(
    dto: CreateCobroDto,
    usuarioId: number,
    origen: OrigenCobro = OrigenCobro.PRESENCIAL,
  ) {
    await this.buscarCliente(dto.FK_cliente);
    const formaPago = await this.buscarFormaPagoActiva(dto.FK_forma_pago);
    validarNumeroReferencia(dto.numero_referencia, formaPago);
    const fechaCobro = this.resolverFechaCobro(dto.fecha_cobro);

    const cuotaPorId = await this.buscarCuotasImputables(
      dto.FK_cliente,
      dto.detalle,
    );
    this.validarImportesImputados(dto.detalle, cuotaPorId);
    this.validarSumaTotal(dto.detalle, dto.importe_total);

    const idCobro = await this.prisma.$transaction((tx) =>
      this.crearInterno(dto, usuarioId, origen, tx, fechaCobro, cuotaPorId),
    );

    return this.obtenerDetalle(idCobro);
  }

  /**
   * Cuerpo transaccional de `crear`, extraído para que
   * `DeclaracionPagoService.validar` (HU-29) lo pueda invocar dentro de SU
   * propia transacción — pasándole el `tx` que ya tiene abierto, en vez de
   * que este método abra el suyo — y así el alta del `COBRO` y la
   * actualización de la `DECLARACIONPAGO` a `VALIDADA` sean atómicas de
   * verdad, sin tocar una sola línea de acá.
   *
   * Comportamiento idéntico al que tenía `crear` antes de este refactor:
   * crea la cabecera, descuenta el saldo de cada cuota imputada con un lock
   * optimista y registra la imputación con la foto de su saldo antes/después,
   * y por cada venta afectada revisa si hay que transicionar la publicación.
   * No valida nada por su cuenta (cliente, forma de pago, importes): eso es
   * responsabilidad de quien arma `dto`, `fechaCobro` y `cuotaPorId` antes de
   * llamarlo — `crear()` lo hace vía sus propias validaciones previas;
   * `DeclaracionPagoService` lo hace con las suyas.
   */
  async crearInterno(
    dto: CreateCobroDto,
    usuarioId: number,
    origen: OrigenCobro,
    tx: Prisma.TransactionClient,
    fechaCobro: Date,
    cuotaPorId: ReadonlyMap<number, LineaCuotaParaCobro>,
  ): Promise<number> {
    const cobro = await tx.cOBRO.create({
      data: {
        fecha_cobro: fechaCobro,
        numero_referencia: dto.numero_referencia,
        importe_total: new Prisma.Decimal(dto.importe_total),
        observaciones: dto.observaciones,
        origen,
        estado: 'CONFIRMADO',
        FK_cliente: dto.FK_cliente,
        FK_forma_pago: dto.FK_forma_pago,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
      },
    });

    const ventasAfectadas = new Set<number>();

    for (const linea of dto.detalle) {
      const cuota = cuotaPorId.get(linea.FK_cuota)!;
      const saldoAnterior = cuota.saldo_pendiente;
      const importeImputado = new Prisma.Decimal(linea.importe_imputado);
      const saldoPosterior = saldoAnterior.minus(importeImputado);

      // updateMany y no update: el WHERE lleva el saldo exacto que se leyó
      // al validar, así que la base confirma atómicamente que nadie lo
      // tocó entre esa lectura y esta escritura — lock optimista, mismo
      // criterio que `PagoService.create`.
      const { count } = await tx.cUOTA.updateMany({
        where: {
          id_cuota: cuota.id_cuota,
          saldo_pendiente: saldoAnterior,
        },
        data: {
          saldo_pendiente: saldoPosterior,
          estado: saldoPosterior.equals(0)
            ? EstadoCuota.PAGADA
            : EstadoCuota.PARCIAL,
        },
      });

      if (count === 0) {
        throw new ConflictException(
          `El saldo de la cuota ${cuota.numero} cambió mientras se procesaba el cobro; reintentá la operación`,
        );
      }

      await tx.dETALLECOBRO.create({
        data: {
          FK_cobro: cobro.id_cobro,
          FK_cuota: cuota.id_cuota,
          importe_imputado: importeImputado,
          saldo_anterior: saldoAnterior,
          saldo_posterior: saldoPosterior,
        },
      });

      ventasAfectadas.add(cuota.FK_venta);
    }

    for (const idVenta of ventasAfectadas) {
      await this.actualizarEstadoVentaSegunSaldo(tx, idVenta, usuarioId);
    }

    return cobro.id_cobro;
  }

  /**
   * Las dos transiciones de las que soy dueño (HU-27): si TODAS las cuotas
   * no anuladas de la venta llegan a saldo cero, la publicación pasa a
   * VENDIDA; si alguna vuelve a tener saldo > 0 (por una anulación) y la
   * publicación estaba VENDIDA, vuelve a EN_PLAN_DE_PAGO. En cualquier otro
   * caso no hace nada — evita invocar una transición que no corresponde.
   */
  private async actualizarEstadoVentaSegunSaldo(
    tx: Prisma.TransactionClient,
    idVenta: number,
    usuarioId: number,
  ) {
    const venta = await tx.vENTA.findUniqueOrThrow({
      where: { id_venta: idVenta },
      select: {
        FK_publicacion: true,
        publicacion: { select: { estado_comercial: true } },
        cuotas: {
          where: { estado: { not: EstadoCuota.ANULADA } },
          select: { saldo_pendiente: true },
        },
      },
    });

    const saldoTotalAlDia = venta.cuotas.every((cuota) =>
      cuota.saldo_pendiente.lessThanOrEqualTo(0),
    );
    const estadoActual = venta.publicacion.estado_comercial;

    if (saldoTotalAlDia && estadoActual === EstadoComercial.EN_PLAN_DE_PAGO) {
      await this.publicaciones.transicionarEstadoComercial(
        tx,
        venta.FK_publicacion,
        EstadoComercial.EN_PLAN_DE_PAGO,
        EstadoComercial.VENDIDA,
        usuarioId,
      );
    } else if (!saldoTotalAlDia && estadoActual === EstadoComercial.VENDIDA) {
      await this.publicaciones.transicionarEstadoComercial(
        tx,
        venta.FK_publicacion,
        EstadoComercial.VENDIDA,
        EstadoComercial.EN_PLAN_DE_PAGO,
        usuarioId,
      );
    }
  }

  /**
   * Listado paginado de cobros, con filtros combinables por cliente, forma
   * de pago, estado y período (sobre `fecha_cobro`). Suma `resumenPeriodo`
   * (control de ingresos) cuando la query trae `fechaDesde` y `fechaHasta`
   * juntos; `null` en caso contrario.
   */
  async listar(query: QueryCobroDto) {
    const {
      FK_cliente,
      FK_forma_pago,
      estado,
      fechaDesde,
      fechaHasta,
      page,
      limit,
    } = query;

    const where: Prisma.COBROWhereInput = {
      ...(FK_cliente !== undefined && { FK_cliente }),
      ...(FK_forma_pago !== undefined && { FK_forma_pago }),
      ...(estado !== undefined && { estado }),
      ...((fechaDesde !== undefined || fechaHasta !== undefined) && {
        fecha_cobro: {
          ...(fechaDesde !== undefined && { gte: fechaDesde }),
          ...(fechaHasta !== undefined && { lte: fechaHasta }),
        },
      }),
    };

    const [cobros, total, resumenPeriodo] = await Promise.all([
      this.prisma.cOBRO.findMany({
        where,
        select: COBRO_LIST_ITEM_SELECT,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fecha_cobro: 'desc' },
      }),
      this.prisma.cOBRO.count({ where }),
      this.calcularResumenPeriodo(query),
    ]);

    return {
      data: cobros.map((cobro) => ({
        ...cobro,
        importe_total: cobro.importe_total.toNumber(),
      })),
      meta: { total, page, limit },
      resumenPeriodo,
    };
  }

  /**
   * Control de ingresos del período: total + subtotales por cliente y por
   * forma de pago. Se calcula siempre sobre cobros CONFIRMADO (ignora el
   * filtro `estado` de la query), solo cuando la query trae `fechaDesde` y
   * `fechaHasta` juntos — mismo criterio que
   * `PagoService.calcularResumenPeriodo`.
   */
  private async calcularResumenPeriodo(query: QueryCobroDto) {
    if (!query.fechaDesde || !query.fechaHasta) {
      return null;
    }

    const where: Prisma.COBROWhereInput = {
      ...(query.FK_cliente !== undefined && { FK_cliente: query.FK_cliente }),
      ...(query.FK_forma_pago !== undefined && {
        FK_forma_pago: query.FK_forma_pago,
      }),
      fecha_cobro: { gte: query.fechaDesde, lte: query.fechaHasta },
      estado: 'CONFIRMADO',
    };

    const cobros = await this.prisma.cOBRO.findMany({
      where,
      select: {
        importe_total: true,
        cliente: { select: CLIENTE_RESUMEN_SELECT },
        formaPago: { select: FORMA_PAGO_RESUMEN_SELECT },
      },
    });

    let totalIngresos = new Prisma.Decimal(0);
    const porCliente = new Map<
      number,
      { cliente: (typeof cobros)[number]['cliente']; total: Prisma.Decimal }
    >();
    const porFormaPago = new Map<
      number,
      { formaPago: (typeof cobros)[number]['formaPago']; total: Prisma.Decimal }
    >();

    for (const cobro of cobros) {
      totalIngresos = totalIngresos.plus(cobro.importe_total);

      const entradaCliente = porCliente.get(cobro.cliente.id_cliente) ?? {
        cliente: cobro.cliente,
        total: new Prisma.Decimal(0),
      };
      entradaCliente.total = entradaCliente.total.plus(cobro.importe_total);
      porCliente.set(cobro.cliente.id_cliente, entradaCliente);

      const entradaFormaPago = porFormaPago.get(
        cobro.formaPago.id_forma_pago,
      ) ?? {
        formaPago: cobro.formaPago,
        total: new Prisma.Decimal(0),
      };
      entradaFormaPago.total = entradaFormaPago.total.plus(cobro.importe_total);
      porFormaPago.set(cobro.formaPago.id_forma_pago, entradaFormaPago);
    }

    return {
      totalIngresos: totalIngresos.toNumber(),
      subtotalesPorCliente: [...porCliente.values()].map((entrada) => ({
        cliente: entrada.cliente,
        total: entrada.total.toNumber(),
      })),
      subtotalesPorFormaPago: [...porFormaPago.values()].map((entrada) => ({
        formaPago: entrada.formaPago,
        total: entrada.total.toNumber(),
      })),
    };
  }

  /**
   * Detalle completo de un cobro: cabecera + las líneas de imputación con
   * los datos identificatorios de la cuota que cada una imputa, y quién lo
   * creó/actualizó. Es el shape que alimenta también el recibo imprimible
   * (sin generar PDF: la vista de impresión es del frontend).
   */
  async obtenerDetalle(id: number) {
    const cobro = await this.prisma.cOBRO.findUnique({
      where: { id_cobro: id },
      include: {
        cliente: { select: CLIENTE_RESUMEN_SELECT },
        formaPago: { select: FORMA_PAGO_RESUMEN_SELECT },
        usuarioCreador: { select: USUARIO_RESUMEN_SELECT },
        usuarioActualizador: { select: USUARIO_RESUMEN_SELECT },
        detalles: {
          select: {
            id_detalle_cobro: true,
            FK_cuota: true,
            importe_imputado: true,
            saldo_anterior: true,
            saldo_posterior: true,
            cuota: { select: CUOTA_RESUMEN_SELECT },
          },
          orderBy: { id_detalle_cobro: 'asc' },
        },
      },
    });

    if (!cobro) {
      throw new NotFoundException(`No existe un cobro con id ${id}`);
    }

    const { detalles, ...cabecera } = cobro;

    return {
      ...cabecera,
      importe_total: cabecera.importe_total.toNumber(),
      detalle: detalles.map((linea) => ({
        id_detalle_cobro: linea.id_detalle_cobro,
        FK_cuota: linea.FK_cuota,
        importe_imputado: linea.importe_imputado.toNumber(),
        saldo_anterior: linea.saldo_anterior.toNumber(),
        saldo_posterior: linea.saldo_posterior.toNumber(),
        cuota: linea.cuota,
      })),
    };
  }

  private async buscarCobroConfirmado(id: number) {
    const cobro = await this.prisma.cOBRO.findUnique({
      where: { id_cobro: id },
      include: { detalles: true },
    });

    if (!cobro) {
      throw new NotFoundException(`No existe un cobro con id ${id}`);
    }
    if (cobro.estado !== 'CONFIRMADO') {
      throw new ConflictException(
        `El cobro ${id} no está CONFIRMADO (estado actual: ${cobro.estado}); no se puede anular`,
      );
    }

    return cobro;
  }

  /**
   * Anula un cobro confirmado. Restituye a cada cuota imputada exactamente
   * lo que este cobro le había descontado, con `increment` — nunca un valor
   * recalculado desde cero, porque la cuota puede haber recibido otros
   * cobros después de este (recalcular sería, como dice el ticket, "un bug
   * silencioso de plata"). No se tocan las líneas de `DETALLECOBRO`:
   * `saldo_anterior`/`saldo_posterior` son la foto histórica de lo que pasó
   * al confirmar, y siguen valiendo aunque el cobro se anule.
   */
  async anular(id: number, dto: AnularCobroDto, usuarioId: number) {
    const cobro = await this.buscarCobroConfirmado(id);

    await this.prisma.$transaction(async (tx) => {
      const ventasAfectadas = new Set<number>();

      for (const detalle of cobro.detalles) {
        const cuotaActualizada = await tx.cUOTA.update({
          where: { id_cuota: detalle.FK_cuota },
          data: {
            saldo_pendiente: { increment: detalle.importe_imputado },
          },
        });

        // El estado se recalcula contra el saldo YA restituido, no contra
        // el que tenía este cobro al confirmarse — puede haber otros cobros
        // de por medio.
        await tx.cUOTA.update({
          where: { id_cuota: detalle.FK_cuota },
          data: {
            estado: cuotaActualizada.saldo_pendiente.equals(
              cuotaActualizada.importe,
            )
              ? EstadoCuota.PENDIENTE
              : EstadoCuota.PARCIAL,
          },
        });

        const cuota = await tx.cUOTA.findUniqueOrThrow({
          where: { id_cuota: detalle.FK_cuota },
          select: { FK_venta: true },
        });
        ventasAfectadas.add(cuota.FK_venta);
      }

      await tx.cOBRO.update({
        where: { id_cobro: id },
        data: {
          estado: 'ANULADO',
          motivo_anulacion: dto.motivo_anulacion,
          hora_actualizacion: new Date(),
          FK_usuario_actualizador: usuarioId,
        },
      });

      for (const idVenta of ventasAfectadas) {
        await this.actualizarEstadoVentaSegunSaldo(tx, idVenta, usuarioId);
      }
    });

    return this.obtenerDetalle(id);
  }
}
