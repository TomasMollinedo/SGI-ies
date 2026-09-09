import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePagoDto } from './dto/create-pago.dto';

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
}
