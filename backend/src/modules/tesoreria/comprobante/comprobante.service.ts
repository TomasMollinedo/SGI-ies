import {
  BadRequestException,
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
    this.validarFechas(dto.fecha_emision, dto.fecha_vencimiento);

    await this.validarReferencias({
      FK_proveedor: dto.FK_proveedor,
      FK_tipo_comprobante: dto.FK_tipo_comprobante,
      FK_orden_compra: dto.FK_orden_compra,
      FK_comprobante_origen: dto.FK_comprobante_origen,
      articulos: this.articulosDelDetalle(dto.detalle),
    });

    await this.validarNumeracionUnica({
      FK_proveedor: dto.FK_proveedor,
      FK_tipo_comprobante: dto.FK_tipo_comprobante,
      letra: dto.letra,
      punto_de_venta: dto.punto_de_venta,
      numero: dto.numero,
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

    // Cabecera "efectiva": lo guardado, pisado por lo que trae el PATCH. La
    // unicidad de numeración y el "origen del mismo proveedor" tienen que
    // validarse sobre la combinación final, no solo sobre los campos que
    // cambian en esta edición.
    const proveedorEfectivo = dto.FK_proveedor ?? comprobante.FK_proveedor;
    const tipoEfectivo =
      dto.FK_tipo_comprobante ?? comprobante.FK_tipo_comprobante;
    const origenEfectivo =
      dto.FK_comprobante_origen ??
      comprobante.FK_comprobante_origen ??
      undefined;

    this.validarFechas(
      dto.fecha_emision ?? comprobante.fecha_emision,
      dto.fecha_vencimiento ?? comprobante.fecha_vencimiento,
    );

    await this.validarReferencias({
      FK_proveedor: proveedorEfectivo,
      FK_tipo_comprobante: tipoEfectivo,
      FK_orden_compra: dto.FK_orden_compra,
      FK_comprobante_origen: origenEfectivo,
      articulos: detalle ? this.articulosDelDetalle(detalle) : [],
    });

    await this.validarNumeracionUnica(
      {
        FK_proveedor: proveedorEfectivo,
        FK_tipo_comprobante: tipoEfectivo,
        letra: dto.letra ?? comprobante.letra,
        punto_de_venta: dto.punto_de_venta ?? comprobante.punto_de_venta,
        numero: dto.numero ?? comprobante.numero,
      },
      id,
    );

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
   * Valida las entidades referenciadas por la cabecera:
   *
   * - proveedor, tipo de comprobante y artículos del detalle deben existir
   *   (404 con mensaje claro en vez de un error de clave foránea) y estar
   *   activos. El chequeo de "activo" es la misma "última línea de defensa"
   *   que en OrdenCompra: el `<select>` del front ya filtra, pero un request
   *   directo o una baja concurrente no.
   * - la orden de compra vinculada, si viene, debe existir.
   * - el comprobante de origen, si viene, debe existir y pertenecer al mismo
   *   proveedor (HU-16). Es opcional para cualquier tipo: no hay regla de
   *   "obligatorio según el tipo".
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
        select: { id_proveedor: true, estado: true },
      });
      if (!proveedor) {
        throw new NotFoundException(
          `No existe un proveedor con id ${refs.FK_proveedor}`,
        );
      }
      if (!proveedor.estado) {
        throw new ConflictException(
          `El proveedor con id ${refs.FK_proveedor} está dado de baja y no puede usarse en un comprobante`,
        );
      }
    }

    if (refs.FK_tipo_comprobante !== undefined) {
      const tipoComprobante = await this.prisma.tIPOCOMPROBANTE.findUnique({
        where: { id_tipo_comprobante: refs.FK_tipo_comprobante },
        select: { id_tipo_comprobante: true, estado: true },
      });
      if (!tipoComprobante) {
        throw new NotFoundException(
          `No existe un tipo de comprobante con id ${refs.FK_tipo_comprobante}`,
        );
      }
      if (!tipoComprobante.estado) {
        throw new ConflictException(
          `El tipo de comprobante con id ${refs.FK_tipo_comprobante} está dado de baja y no puede usarse en un comprobante`,
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
        select: { id_comprobante_proveedor: true, FK_proveedor: true },
      });
      if (!origen) {
        throw new NotFoundException(
          `No existe un comprobante con id ${refs.FK_comprobante_origen}`,
        );
      }
      if (
        refs.FK_proveedor !== undefined &&
        origen.FK_proveedor !== refs.FK_proveedor
      ) {
        throw new BadRequestException(
          'El comprobante de origen pertenece a otro proveedor',
        );
      }
    }

    if (refs.articulos.length > 0) {
      const encontrados = await this.prisma.aRTICULO.findMany({
        where: { id_articulo: { in: refs.articulos } },
        select: { id_articulo: true, estado: true },
      });
      const porId = new Map(
        encontrados.map((articulo) => [articulo.id_articulo, articulo]),
      );
      const faltantes = refs.articulos.filter((id) => !porId.has(id));
      if (faltantes.length > 0) {
        throw new NotFoundException(
          `No existe un artículo con id: ${faltantes.join(', ')}`,
        );
      }
      const inactivos = refs.articulos.filter((id) => !porId.get(id)!.estado);
      if (inactivos.length > 0) {
        throw new ConflictException(
          `El artículo con id ${inactivos.join(', ')} está dado de baja y no puede usarse en un comprobante`,
        );
      }
    }
  }
  /**
   * HU-16: no puede existir otro comprobante *vigente* — cualquier estado
   * menos ANULADO — con la misma combinación de proveedor + tipo + letra +
   * punto de venta + número. Esa quíntupla es la identidad del documento tal
   * como lo emitió el proveedor.
   *
   * A propósito NO es un `@@unique` de base (ver el comentario en
   * `schema.prisma`): si un comprobante se cargó con el número mal tipeado y
   * se anula, hay que poder volver a cargarlo con el número correcto. El
   * chequeo corre acá y se apoya en el `@@index` por esa combinación.
   */
  private async validarNumeracionUnica(
    clave: {
      FK_proveedor: number;
      FK_tipo_comprobante: number;
      letra: string;
      punto_de_venta: number;
      numero: number;
    },
    idExcluido?: number,
  ) {
    const existente = await this.prisma.cOMPROBANTEPROVEEDOR.findFirst({
      where: {
        FK_proveedor: clave.FK_proveedor,
        FK_tipo_comprobante: clave.FK_tipo_comprobante,
        letra: clave.letra,
        punto_de_venta: clave.punto_de_venta,
        numero: clave.numero,
        estado: { not: EstadoComprobante.ANULADO },
        ...(idExcluido !== undefined && {
          id_comprobante_proveedor: { not: idExcluido },
        }),
      },
      select: { id_comprobante_proveedor: true },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe un comprobante ${clave.letra} ${clave.punto_de_venta}-${clave.numero} vigente para ese proveedor y tipo (comprobante #${existente.id_comprobante_proveedor})`,
      );
    }
  }

  /**
   * HU-16: la fecha de emisión no puede ser futura (el comprobante registra
   * algo ya emitido, mismo criterio que OrdenCompra y Movimiento) y la de
   * vencimiento no puede ser anterior a la de emisión.
   */
  private validarFechas(fechaEmision: Date, fechaVencimiento: Date) {
    if (fechaEmision > new Date()) {
      throw new BadRequestException('La fecha de emisión no puede ser futura');
    }
    if (fechaVencimiento < fechaEmision) {
      throw new BadRequestException(
        'La fecha de vencimiento no puede ser anterior a la de emisión',
      );
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
