import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

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
}
