import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoComprobante } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueryCuentaCorrienteDto } from './dto/query-cuenta-corriente.dto';

export interface FilaCuentaCorriente {
  id_proveedor: number;
  razon_social: string;
  cuit: string;
  saldo: number;
  cantidad_comprobantes_pendientes: number;
  vencimiento_mas_antiguo: Date | null;
}

@Injectable()
export class CuentaCorrienteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cuenta corriente de proveedores: saldo actual (Σ DEBE − Σ HABER de
   * comprobantes REGISTRADOS), cantidad de comprobantes con saldo pendiente
   * y vencimiento más antiguo impago, por proveedor activo.
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
    const { FK_proveedor, condicion_saldo, page, limit } = query;

    const proveedores = await this.prisma.pROVEEDOR.findMany({
      where: {
        estado: true,
        ...(FK_proveedor && { id_proveedor: FK_proveedor }),
      },
      select: { id_proveedor: true, razon_social: true, cuit: true },
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

  private calcularResumen(filas: FilaCuentaCorriente[]) {
    return filas.reduce(
      (resumen, fila) => {
        if (fila.saldo > 0) resumen.deudores++;
        else if (fila.saldo < 0) resumen.a_favor++;
        else resumen.sin_saldo++;
        return resumen;
      },
      { deudores: 0, a_favor: 0, sin_saldo: 0 },
    );
  }
}
