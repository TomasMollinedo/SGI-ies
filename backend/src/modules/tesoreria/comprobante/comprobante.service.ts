import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoComprobante } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateComprobanteDto } from './dto/create-comprobante.dto';
import { UpdateComprobanteDto } from './dto/update-comprobante.dto';

/**
 * Escala de todos los importes del comprobante: 2 decimales, la misma que
 * `Decimal(14,2)` en `schema.prisma`.
 */
const DECIMALES = 2;

/** Línea del detalle con su subtotal ya calculado por el servidor. */
interface LineaConSubtotal {
  descripcion: string;
  FK_articulo: number | null;
  cantidad: Prisma.Decimal;
  precio_unitario: Prisma.Decimal;
  subtotal: Prisma.Decimal;
}

/** Los cuatro importes de la cabecera + las líneas con su subtotal. */
interface TotalesComprobante {
  lineas: LineaConSubtotal[];
  importe_neto: Prisma.Decimal;
  importe_iva: Prisma.Decimal;
  importe_total: Prisma.Decimal;
}

/** Forma mínima de una línea para poder calcular su subtotal. */
interface LineaCalculable {
  descripcion: string;
  FK_articulo?: number | null;
  cantidad: Prisma.Decimal | number | string;
  precio_unitario: Prisma.Decimal | number | string;
}

/**
 * HU-16 — Comprobantes de proveedor.
 *
 * T72 cubre solo el borrador y sus totales: alta en estado BORRADOR con
 * cabecera y detalle editables, con el subtotal de cada línea y los cuatro
 * importes de la cabecera calculados por el servidor.
 *
 */
@Injectable()
export class ComprobanteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Alta de un comprobante en estado BORRADOR.
   *
   * El cliente manda la cabecera y las líneas (descripción, artículo opcional,
   * cantidad y precio unitario); el servidor calcula el subtotal de cada línea
   * y los importes neto, IVA y total. El punto de
   * venta y el número los ingresa el usuario: son los que imprime el proveedor,
   * el sistema no los genera.
   *
   * El detalle puede venir vacío: recién al confirmar se exige al menos
   * una línea.
   */
  async create(dto: CreateComprobanteDto, usuarioId: number) {
    await this.validarReferencias({
      FK_proveedor: dto.FK_proveedor,
      FK_tipo_comprobante: dto.FK_tipo_comprobante,
      FK_orden_compra: dto.FK_orden_compra,
      FK_comprobante_origen: dto.FK_comprobante_origen,
      articulos: this.articulosDelDetalle(dto.detalle),
    });

    const totales = this.calcularTotales(dto.detalle, dto.alicuota_iva);

    return this.prisma.cOMPROBANTEPROVEEDOR.create({
      data: {
        letra: dto.letra,
        punto_de_venta: dto.punto_de_venta,
        numero: dto.numero,
        fecha_emision: dto.fecha_emision,
        fecha_vencimiento: dto.fecha_vencimiento,
        observaciones: dto.observaciones,
        alicuota_iva: dto.alicuota_iva,
        importe_neto: totales.importe_neto,
        importe_iva: totales.importe_iva,
        importe_total: totales.importe_total,
        // Nace siempre en BORRADOR. El saldo (saldo_pendiente / saldo_cancelado)
        // queda en null hasta la confirmación (T74).
        estado: EstadoComprobante.BORRADOR,
        FK_proveedor: dto.FK_proveedor,
        FK_tipo_comprobante: dto.FK_tipo_comprobante,
        FK_orden_compra: dto.FK_orden_compra,
        FK_comprobante_origen: dto.FK_comprobante_origen,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
        detalles: {
          create: totales.lineas.map((linea) => ({
            descripcion: linea.descripcion,
            FK_articulo: linea.FK_articulo,
            cantidad: linea.cantidad,
            precio_unitario: linea.precio_unitario,
            subtotal: linea.subtotal,
          })),
        },
      },
      include: { detalles: { orderBy: { id_detalle_comprobante: 'asc' } } },
    });
  }

  /**
   * Comprobante con sus líneas. Se usa internamente para editar y devolver el
   * comprobante ya actualizado; el endpoint de detalle en modo lectura (con
   * comprobante de origen, notas aplicadas y órdenes de pago) es de T77.
   */
  async findOne(id: number) {
    const comprobante = await this.prisma.cOMPROBANTEPROVEEDOR.findUnique({
      where: { id_comprobante_proveedor: id },
      include: { detalles: { orderBy: { id_detalle_comprobante: 'asc' } } },
    });

    if (!comprobante) {
      throw new NotFoundException(`No existe un comprobante con id ${id}`);
    }

    return comprobante;
  }

  /**
   * Edición de un comprobante en BORRADOR: cabecera y/o detalle. Cualquier
   * cambio que afecte el detalle o la alícuota recalcula los cuatro importes.
   *
   * Solo se puede editar mientras está en BORRADOR: una vez REGISTRADO (T74) la
   * cabecera y el detalle quedan congelados.
   */
  async update(id: number, dto: UpdateComprobanteDto, usuarioId: number) {
    const comprobante = await this.findOne(id);

    if (comprobante.estado !== EstadoComprobante.BORRADOR) {
      throw new ConflictException(
        'Solo se puede editar un comprobante en estado BORRADOR',
      );
    }

    const { detalle, alicuota_iva: alicuotaDto, ...cabecera } = dto;

    await this.validarReferencias({
      FK_proveedor: dto.FK_proveedor,
      FK_tipo_comprobante: dto.FK_tipo_comprobante,
      FK_orden_compra: dto.FK_orden_compra,
      FK_comprobante_origen: dto.FK_comprobante_origen,
      articulos: detalle ? this.articulosDelDetalle(detalle) : [],
    });

    // Detalle y alícuota "efectivos": si el dto no los trae, se mantienen los
    // actuales, para que el recálculo de los importes sea siempre coherente.
    const detalleEfectivo = detalle ?? comprobante.detalles;
    const alicuotaEfectiva = alicuotaDto ?? comprobante.alicuota_iva;
    const totales = this.calcularTotales(detalleEfectivo, alicuotaEfectiva);

    return this.prisma.$transaction(async (tx) => {
      // Reemplazo completo del detalle: se borran las líneas actuales y se
      // vuelven a crear con los subtotales recalculados. Solo si el dto trae un
      // detalle nuevo; si no, las líneas quedan como están.
      if (detalle !== undefined) {
        await tx.dETALLECOMPROBANTE.deleteMany({
          where: { FK_comprobante_proveedor: id },
        });
      }

      return tx.cOMPROBANTEPROVEEDOR.update({
        where: { id_comprobante_proveedor: id },
        data: {
          ...cabecera,
          alicuota_iva: alicuotaEfectiva,
          importe_neto: totales.importe_neto,
          importe_iva: totales.importe_iva,
          importe_total: totales.importe_total,
          FK_usuario_actualizador: usuarioId,
          hora_actualizacion: new Date(),
          ...(detalle !== undefined && {
            detalles: {
              create: totales.lineas.map((linea) => ({
                descripcion: linea.descripcion,
                FK_articulo: linea.FK_articulo,
                cantidad: linea.cantidad,
                precio_unitario: linea.precio_unitario,
                subtotal: linea.subtotal,
              })),
            },
          }),
        },
        include: { detalles: { orderBy: { id_detalle_comprobante: 'asc' } } },
      });
    });
  }

  /**
   * Calcula, del lado del servidor, el subtotal de cada línea y los cuatro
   * importes de la cabecera:
   *
   * - `subtotal` de la línea = `cantidad * precio_unitario`
   * - `importe_neto` = suma de los subtotales
   * - `importe_iva` = `importe_neto * alicuota_iva / 100`
   * - `importe_total` = `importe_neto + importe_iva`
   *
   * Todo el cálculo usa `Prisma.Decimal` (no `number`) para no arrastrar
   * errores de punto flotante, y redondea cada resultado a 2 decimales.
   *
   * Un detalle vacío da los cuatro importes en 0: es válido mientras el
   * comprobante está en BORRADOR (el mínimo de una línea se exige al confirmar,
   * T74).
   */
  private calcularTotales(
    detalle: LineaCalculable[],
    alicuotaIva: Prisma.Decimal | number | string,
  ): TotalesComprobante {
    const lineas: LineaConSubtotal[] = detalle.map((linea) => {
      const cantidad = new Prisma.Decimal(linea.cantidad);
      const precioUnitario = new Prisma.Decimal(linea.precio_unitario);
      return {
        descripcion: linea.descripcion,
        FK_articulo: linea.FK_articulo ?? null,
        cantidad,
        precio_unitario: precioUnitario,
        subtotal: cantidad.mul(precioUnitario).toDecimalPlaces(DECIMALES),
      };
    });

    const importeNeto = lineas
      .reduce((acc, linea) => acc.add(linea.subtotal), new Prisma.Decimal(0))
      .toDecimalPlaces(DECIMALES);

    const importeIva = importeNeto
      .mul(new Prisma.Decimal(alicuotaIva))
      .div(100)
      .toDecimalPlaces(DECIMALES);

    const importeTotal = importeNeto.add(importeIva).toDecimalPlaces(DECIMALES);

    return {
      lineas,
      importe_neto: importeNeto,
      importe_iva: importeIva,
      importe_total: importeTotal,
    };
  }

  /**
   * Valida que las entidades referenciadas por el comprobante existan, para
   * responder 404 con un mensaje claro en vez de romper con un error de clave
   * foránea. Las reglas de negocio de la cabecera (unicidad de la numeración,
   * comprobante de origen obligatorio y del mismo proveedor, fechas) son de T73.
   */
  private async validarReferencias(refs: {
    FK_proveedor?: number;
    FK_tipo_comprobante?: number;
    FK_orden_compra?: number;
    FK_comprobante_origen?: number;
    articulos: number[];
  }) {
    if (refs.FK_proveedor !== undefined) {
      const proveedor = await this.prisma.pROVEEDOR.findUnique({
        where: { id_proveedor: refs.FK_proveedor },
        select: { id_proveedor: true },
      });
      if (!proveedor) {
        throw new NotFoundException(
          `No existe un proveedor con id ${refs.FK_proveedor}`,
        );
      }
    }

    if (refs.FK_tipo_comprobante !== undefined) {
      const tipoComprobante = await this.prisma.tIPOCOMPROBANTE.findUnique({
        where: { id_tipo_comprobante: refs.FK_tipo_comprobante },
        select: { id_tipo_comprobante: true },
      });
      if (!tipoComprobante) {
        throw new NotFoundException(
          `No existe un tipo de comprobante con id ${refs.FK_tipo_comprobante}`,
        );
      }
    }

    if (refs.FK_orden_compra !== undefined) {
      const ordenCompra = await this.prisma.oRDENCOMPRA.findUnique({
        where: { id_orden_compra: refs.FK_orden_compra },
        select: { id_orden_compra: true },
      });
      if (!ordenCompra) {
        throw new NotFoundException(
          `No existe una orden de compra con id ${refs.FK_orden_compra}`,
        );
      }
    }

    if (refs.FK_comprobante_origen !== undefined) {
      const origen = await this.prisma.cOMPROBANTEPROVEEDOR.findUnique({
        where: { id_comprobante_proveedor: refs.FK_comprobante_origen },
        select: { id_comprobante_proveedor: true },
      });
      if (!origen) {
        throw new NotFoundException(
          `No existe un comprobante con id ${refs.FK_comprobante_origen}`,
        );
      }
    }

    if (refs.articulos.length > 0) {
      const encontrados = await this.prisma.aRTICULO.findMany({
        where: { id_articulo: { in: refs.articulos } },
        select: { id_articulo: true },
      });
      const idsEncontrados = new Set(
        encontrados.map((articulo) => articulo.id_articulo),
      );
      const faltantes = refs.articulos.filter((id) => !idsEncontrados.has(id));
      if (faltantes.length > 0) {
        throw new NotFoundException(
          `No existe un artículo con id: ${faltantes.join(', ')}`,
        );
      }
    }
  }

  /** Ids de artículo distintos presentes en el detalle (las líneas sin artículo se ignoran). */
  private articulosDelDetalle(
    detalle: { FK_articulo?: number | null }[],
  ): number[] {
    return [
      ...new Set(
        detalle.flatMap((linea) =>
          linea.FK_articulo === undefined || linea.FK_articulo === null
            ? []
            : [linea.FK_articulo],
        ),
      ),
    ];
  }
}
