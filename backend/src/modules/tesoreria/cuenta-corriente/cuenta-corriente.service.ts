import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoComprobante } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueryCuentaCorrienteDto } from './dto/query-cuenta-corriente.dto';
import { QueryMovimientosCuentaCorrienteDto } from './dto/query-movimientos-cuenta-corriente.dto';

export interface FilaCuentaCorriente {
  id_proveedor: number;
  razon_social: string;
  cuit: string;
  estado: boolean;
  saldo: number;
  cantidad_comprobantes_pendientes: number;
  vencimiento_mas_antiguo: Date | null;
}

/** Una fila del extracto cronológico, sin el saldo acumulado todavía. */
interface FilaMovimientoSinSaldo {
  clase: 'COMPROBANTE' | 'PAGO';
  id_referencia: number;
  fecha: Date;
  tipo: string;
  letra: string | null;
  punto_de_venta: number | null;
  numero: number | null;
  fecha_vencimiento: Date | null;
  debe: number | null;
  haber: number | null;
}

export interface FilaMovimientoCuentaCorriente extends FilaMovimientoSinSaldo {
  saldo_acumulado: number;
}

/** La fila sintética de apertura, o cualquier fila real ya con su saldo. */
export type FilaExtractoCuentaCorriente =
  | FilaMovimientoCuentaCorriente
  | {
      clase: 'APERTURA';
      id_referencia: null;
      fecha: Date;
      tipo: null;
      letra: null;
      punto_de_venta: null;
      numero: null;
      fecha_vencimiento: null;
      debe: null;
      haber: null;
      saldo_acumulado: number;
    };

@Injectable()
export class CuentaCorrienteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cuenta corriente de proveedores: saldo actual (Σ DEBE − Σ HABER de
   * comprobantes REGISTRADOS), cantidad de comprobantes con saldo pendiente
   * y vencimiento más antiguo impago. Sin filtro `estado`, trae TODOS los
   * proveedores (activos e inactivos): es un reporte financiero, no un ABM,
   * y un proveedor dado de baja puede seguir teniendo saldo pendiente.
   *
   * `aumenta_saldo` vive en TIPOCOMPROBANTE, no en COMPROBANTEPROVEEDOR, así
   * que Prisma no puede sumar con signo en un solo `groupBy`. Se resuelve con
   * un número fijo de consultas (independiente de la cantidad de
   * proveedores): una para los proveedores, dos `groupBy` (DEBE y HABER) para
   * el saldo, y un tercer `groupBy` para la cantidad/vencimiento de los
   * pendientes. El filtro por condición de saldo, el orden por saldo
   * descendente y la paginación se aplican después, en memoria, porque el
   * saldo es un valor calculado y no una columna de la base.
   */
  async findAll(query: QueryCuentaCorrienteDto) {
    const { FK_proveedor, condicion_saldo, estado, page, limit } = query;

    const proveedores = await this.prisma.pROVEEDOR.findMany({
      where: {
        ...(estado !== undefined && { estado }),
        ...(FK_proveedor && { id_proveedor: FK_proveedor }),
      },
      select: {
        id_proveedor: true,
        razon_social: true,
        cuit: true,
        estado: true,
      },
    });
    const idsProveedor = proveedores.map((p) => p.id_proveedor);

    const [sumaDebe, sumaHaber, pendientes] = await Promise.all([
      this.prisma.cOMPROBANTEPROVEEDOR.groupBy({
        by: ['FK_proveedor'],
        where: {
          FK_proveedor: { in: idsProveedor },
          estado: EstadoComprobante.REGISTRADO,
          tipoComprobante: { aumenta_saldo: true },
        },
        _sum: { saldo_pendiente: true },
      }),
      this.prisma.cOMPROBANTEPROVEEDOR.groupBy({
        by: ['FK_proveedor'],
        where: {
          FK_proveedor: { in: idsProveedor },
          estado: EstadoComprobante.REGISTRADO,
          tipoComprobante: { aumenta_saldo: false },
        },
        _sum: { saldo_pendiente: true },
      }),
      this.prisma.cOMPROBANTEPROVEEDOR.groupBy({
        by: ['FK_proveedor'],
        where: {
          FK_proveedor: { in: idsProveedor },
          estado: EstadoComprobante.REGISTRADO,
          saldo_cancelado: false,
        },
        _count: { _all: true },
        _min: { fecha_vencimiento: true },
      }),
    ]);

    const mapaDebe = new Map(
      sumaDebe.map((g) => [
        g.FK_proveedor,
        g._sum.saldo_pendiente ?? new Prisma.Decimal(0),
      ]),
    );
    const mapaHaber = new Map(
      sumaHaber.map((g) => [
        g.FK_proveedor,
        g._sum.saldo_pendiente ?? new Prisma.Decimal(0),
      ]),
    );
    const mapaPendientes = new Map(
      pendientes.map((g) => [
        g.FK_proveedor,
        {
          cantidad: g._count._all,
          vencimiento: g._min.fecha_vencimiento,
        },
      ]),
    );

    const todasLasFilas: FilaCuentaCorriente[] = proveedores.map(
      (proveedor) => {
        const debe =
          mapaDebe.get(proveedor.id_proveedor) ?? new Prisma.Decimal(0);
        const haber =
          mapaHaber.get(proveedor.id_proveedor) ?? new Prisma.Decimal(0);
        const pendiente = mapaPendientes.get(proveedor.id_proveedor);

        return {
          id_proveedor: proveedor.id_proveedor,
          razon_social: proveedor.razon_social,
          cuit: proveedor.cuit,
          estado: proveedor.estado,
          saldo: debe.minus(haber).toNumber(),
          cantidad_comprobantes_pendientes: pendiente?.cantidad ?? 0,
          vencimiento_mas_antiguo: pendiente?.vencimiento ?? null,
        };
      },
    );

    // Sobre el total, sin el filtro de condición de saldo: así la card de
    // resumen no cambia según qué pestaña esté mirando la tabla.
    const resumen = this.calcularResumen(todasLasFilas);

    let filas = todasLasFilas;
    if (condicion_saldo === 'DEUDOR') {
      filas = filas.filter((fila) => fila.saldo > 0);
    } else if (condicion_saldo === 'A_FAVOR') {
      filas = filas.filter((fila) => fila.saldo < 0);
    } else if (condicion_saldo === 'SIN_SALDO') {
      filas = filas.filter((fila) => fila.saldo === 0);
    }

    filas.sort((a, b) => b.saldo - a.saldo);

    const total = filas.length;
    const data = filas.slice((page - 1) * limit, (page - 1) * limit + limit);

    return { data, resumen, meta: { total, page, limit } };
  }

  /**
   * Extracto cronológico de la cuenta de UN proveedor: comprobantes
   * REGISTRADOS y pagos CONFIRMADOS mezclados en una sola línea de tiempo,
   * con HABER (facturas y notas de débito), DEBE (notas de crédito y pagos)
   * y saldo acumulado. La cuenta es un pasivo desde el punto de vista de la
   * empresa (le debe al proveedor), así que sigue la convención contable de
   * un pasivo: aumenta por el HABER y disminuye por el DEBE.
   * No hay ninguna tabla de saldos: se recalcula todo acá, leyendo
   * `importe_total` de cada comprobante/pago (no `saldo_pendiente`, que ya
   * está neteado contra pagos) y acumulando en orden — así el saldo de la
   * última fila coincide matemáticamente con `saldo` de `findAll` para el
   * mismo proveedor.
   *
   * El orden y el acumulado se calculan sobre el historial COMPLETO antes de
   * aplicar cualquier filtro: `clase` solo decide qué filas se muestran,
   * nunca qué saldo se muestra en ellas (si no, el saldo dejaría de
   * representar la realidad). Con `fechaDesde`, la fila de apertura es el
   * saldo acumulado real hasta ese punto, no un saldo recalculado desde cero.
   */
  async obtenerMovimientos(
    idProveedor: number,
    query: QueryMovimientosCuentaCorrienteDto,
  ) {
    const proveedor = await this.prisma.pROVEEDOR.findUnique({
      where: { id_proveedor: idProveedor },
      select: { id_proveedor: true, razon_social: true, cuit: true },
    });
    if (!proveedor) {
      throw new NotFoundException(
        `No existe un proveedor con id ${idProveedor}`,
      );
    }

    const { fechaDesde, fechaHasta, clase } = query;

    const [comprobantes, pagos] = await Promise.all([
      this.prisma.cOMPROBANTEPROVEEDOR.findMany({
        where: {
          FK_proveedor: idProveedor,
          estado: EstadoComprobante.REGISTRADO,
        },
        select: {
          id_comprobante_proveedor: true,
          fecha_emision: true,
          fecha_vencimiento: true,
          letra: true,
          punto_de_venta: true,
          numero: true,
          importe_total: true,
          tipoComprobante: { select: { nombre: true, aumenta_saldo: true } },
        },
      }),
      this.prisma.pAGO.findMany({
        where: { FK_proveedor: idProveedor, estado: 'CONFIRMADA' },
        select: {
          id_pago: true,
          fecha_pago: true,
          importe_total: true,
          formaPago: { select: { nombre: true } },
        },
      }),
    ]);

    const filasComprobante: FilaMovimientoSinSaldo[] = comprobantes.map(
      (c) => ({
        clase: 'COMPROBANTE',
        id_referencia: c.id_comprobante_proveedor,
        fecha: c.fecha_emision,
        tipo: c.tipoComprobante.nombre,
        letra: c.letra,
        punto_de_venta: c.punto_de_venta,
        numero: c.numero,
        fecha_vencimiento: c.fecha_vencimiento,
        // aumenta_saldo=true (factura, nota de débito) → HABER: aumenta el
        // pasivo. aumenta_saldo=false (nota de crédito) → DEBE: lo reduce.
        debe: c.tipoComprobante.aumenta_saldo
          ? null
          : c.importe_total.toNumber(),
        haber: c.tipoComprobante.aumenta_saldo
          ? c.importe_total.toNumber()
          : null,
      }),
    );

    // Un pago siempre va al DEBE: es plata que ya salió, reduce el pasivo,
    // sea que haya imputado a facturas o a notas de crédito — ver el
    // análisis en PagoService de por qué `importe_total` (neto) es
    // exactamente lo que hace falta acá para que el acumulado cierre.
    const filasPago: FilaMovimientoSinSaldo[] = pagos.map((p) => ({
      clase: 'PAGO',
      id_referencia: p.id_pago,
      fecha: p.fecha_pago,
      tipo: p.formaPago.nombre,
      letra: null,
      punto_de_venta: null,
      numero: null,
      fecha_vencimiento: null,
      debe: p.importe_total.toNumber(),
      haber: null,
    }));

    const historialCompleto = [...filasComprobante, ...filasPago].sort(
      (a, b) =>
        a.fecha.getTime() - b.fecha.getTime() ||
        a.id_referencia - b.id_referencia,
    );

    // Pasivo: aumenta por el HABER, disminuye por el DEBE.
    let acumulado = 0;
    const historialConSaldo: FilaMovimientoCuentaCorriente[] =
      historialCompleto.map((fila) => {
        acumulado += (fila.haber ?? 0) - (fila.debe ?? 0);
        return { ...fila, saldo_acumulado: acumulado };
      });

    const movimientos: FilaExtractoCuentaCorriente[] = [];

    if (fechaDesde) {
      const filaAnterior = historialConSaldo
        .filter((fila) => fila.fecha < fechaDesde)
        .at(-1);

      movimientos.push({
        clase: 'APERTURA',
        id_referencia: null,
        fecha: fechaDesde,
        tipo: null,
        letra: null,
        punto_de_venta: null,
        numero: null,
        fecha_vencimiento: null,
        debe: null,
        haber: null,
        saldo_acumulado: filaAnterior?.saldo_acumulado ?? 0,
      });
    }

    const enPeriodo = historialConSaldo.filter(
      (fila) =>
        (!fechaDesde || fila.fecha >= fechaDesde) &&
        (!fechaHasta || fila.fecha <= fechaHasta),
    );

    movimientos.push(
      ...(clase ? enPeriodo.filter((fila) => fila.clase === clase) : enPeriodo),
    );

    return { proveedor, movimientos };
  }

  private calcularResumen(filas: FilaCuentaCorriente[]) {
    return filas.reduce(
      (resumen, fila) => {
        if (fila.saldo > 0) resumen.deudores++;
        else if (fila.saldo < 0) resumen.a_favor++;
        else resumen.sin_saldo++;
        resumen.saldo_total += fila.saldo;
        return resumen;
      },
      { deudores: 0, a_favor: 0, sin_saldo: 0, saldo_total: 0 },
    );
  }
}
