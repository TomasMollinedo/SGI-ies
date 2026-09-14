import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoComprobante, EstadoOrdenCompra } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateComprobanteDto } from './dto/create-comprobante.dto';
import { UpdateComprobanteDto } from './dto/update-comprobante.dto';
import { AnularComprobanteDto } from './dto/anular-comprobante.dto';
import { QueryComprobanteDto } from './dto/query-comprobante.dto';
import type {
  ComprobanteDetalleResponse,
  ComprobanteListItem,
  ComprobanteResponse,
} from './dto/comprobante-response.dto';

/**
 * Escala de todos los importes del comprobante: 2 decimales, la misma que
 * `Decimal(14,2)` en `schema.prisma`.
 */
const DECIMALES = 2;

/**
 * Estados de una orden de compra a los que se puede vincular un comprobante:
 * la orden ya se emitió al proveedor (no está en BORRADOR) y no fue cancelada.
 * Es la "última línea de defensa": el `<select>` del formulario ya filtra por
 * estos estados, pero un request directo o un cambio de estado concurrente no.
 */
const ESTADOS_OC_VINCULABLES: EstadoOrdenCompra[] = [
  EstadoOrdenCompra.EMITIDA,
  EstadoOrdenCompra.RECIBIDA_PARCIAL,
  EstadoOrdenCompra.RECIBIDA,
];
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

/** Línea del detalle tal como sale de Prisma. */
interface LineaComprobanteRow {
  id_detalle_comprobante: number;
  descripcion: string;
  FK_articulo: number | null;
  cantidad: Prisma.Decimal;
  precio_unitario: Prisma.Decimal;
  subtotal: Prisma.Decimal;
}

/**
 * Campos de cabecera que consumen los mappers de respuesta. La fila real de
 * Prisma tiene más columnas; acá se listan solo las que viajan al contrato.
 */
interface CabeceraComprobanteRow {
  id_comprobante_proveedor: number;
  FK_tipo_comprobante: number;
  letra: string;
  punto_de_venta: number;
  numero: number;
  fecha_emision: Date;
  fecha_vencimiento: Date;
  FK_proveedor: number;
  FK_orden_compra: number | null;
  FK_comprobante_origen: number | null;
  observaciones: string | null;
  importe_neto: Prisma.Decimal;
  alicuota_iva: Prisma.Decimal;
  importe_iva: Prisma.Decimal;
  importe_total: Prisma.Decimal;
  saldo_pendiente: Prisma.Decimal | null;
  saldo_cancelado: boolean | null;
  estado: EstadoComprobante;
  motivo_anulacion: string | null;
  hora_creacion: Date;
  hora_actualizacion: Date | null;
  FK_usuario_creador: number;
  FK_usuario_actualizador: number;
}

/** Cabecera + proveedor y tipo resueltos, para el listado y el detalle. */
interface ComprobanteConResumenRow extends CabeceraComprobanteRow {
  proveedor: { id_proveedor: number; razon_social: string };
  tipoComprobante: { id_tipo_comprobante: number; nombre: string };
}
/** Cabecera + todas las relaciones que muestra el detalle en modo lectura. */
interface ComprobanteLecturaRow extends ComprobanteConResumenRow {
  detalles: LineaComprobanteRow[];
  comprobante_origen: ComprobanteConResumenRow | null;
  notas_aplicadas: ComprobanteConResumenRow[];
  detallesPago: {
    importe_imputado: Prisma.Decimal;
    pago: { id_pago: number; fecha_pago: Date };
  }[];
  usuarioCreador: { nombre: string; apellido: string };
  usuarioActualizador: { nombre: string; apellido: string };
}

/** Traducción del boolean `saldo_cancelado` (base) al enum del contrato. */
function estadoSaldoDesde(
  saldoCancelado: boolean | null,
): 'PENDIENTE' | 'SALDADO' | null {
  if (saldoCancelado === null) return null;
  return saldoCancelado ? 'SALDADO' : 'PENDIENTE';
}

/**
 * HU-16 — Comprobantes de proveedor: ciclo completo (borrador, edición,
 * confirmación, anulación, listado y detalle).
 */
@Injectable()
export class ComprobanteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Alta de un comprobante en estado BORRADOR. El cliente manda la cabecera y
   * las líneas; el servidor calcula el subtotal de cada línea y los importes
   * neto, IVA y total. El detalle puede venir vacío: el mínimo de una línea se
   * exige recién al confirmar.
   */
  async create(
    dto: CreateComprobanteDto,
    usuarioId: number,
  ): Promise<ComprobanteResponse> {
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

    const creado = await this.prisma.cOMPROBANTEPROVEEDOR.create({
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
    });

    return this.toResponse(creado);
  }

  /**
   * Listado paginado, del más reciente al más antiguo (por fecha de emisión).
   * Filtros combinables (HU-16): proveedor, tipo, efecto del tipo sobre el
   * saldo, estado del comprobante, estado de saldo y período de emisión.
   */
  async findAll(query: QueryComprobanteDto) {
    const {
      FK_proveedor,
      FK_tipo_comprobante,
      aumenta_saldo,
      estado,
      estado_saldo,
      fechaDesde,
      fechaHasta,
      page,
      limit,
    } = query;

    const where: Prisma.COMPROBANTEPROVEEDORWhereInput = {
      ...(FK_proveedor !== undefined && { FK_proveedor }),
      ...(FK_tipo_comprobante !== undefined && { FK_tipo_comprobante }),
      // "Efecto sobre el saldo" es un atributo del tipo, no del comprobante:
      // se filtra a través de la relación.
      ...(aumenta_saldo !== undefined && {
        tipoComprobante: { aumenta_saldo },
      }),
      ...(estado && { estado }),
      // El contrato expone PENDIENTE/SALDADO; en la base es `saldo_cancelado`.
      ...(estado_saldo && { saldo_cancelado: estado_saldo === 'SALDADO' }),
      ...((fechaDesde || fechaHasta) && {
        fecha_emision: {
          ...(fechaDesde && { gte: fechaDesde }),
          ...(fechaHasta && { lte: fechaHasta }),
        },
      }),
    };

    const [filas, total] = await Promise.all([
      this.prisma.cOMPROBANTEPROVEEDOR.findMany({
        where,
        include: {
          proveedor: { select: { id_proveedor: true, razon_social: true } },
          tipoComprobante: {
            select: { id_tipo_comprobante: true, nombre: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { fecha_emision: 'desc' },
          { id_comprobante_proveedor: 'desc' },
        ],
      }),
      this.prisma.cOMPROBANTEPROVEEDOR.count({ where }),
    ]);

    return {
      data: filas.map((fila) => this.toListItem(fila)),
      meta: { total, page, limit },
    };
  }

  /**
   * Detalle en modo lectura (GET /comprobantes/:id): cabecera completa,
   * líneas, el comprobante de origen si lo tuviera, los comprobantes que lo
   * referencian como origen, y las órdenes de pago que lo imputaron (vacías
   * hasta HU-18).
   */
  async findOne(id: number): Promise<ComprobanteDetalleResponse> {
    return this.toDetalle(await this.cargarComprobante(id));
  }

  /**
   * Edición de un comprobante en BORRADOR: cabecera y/o detalle. Cualquier
   * cambio que afecte el detalle o la alícuota recalcula los cuatro importes.
   * Una vez REGISTRADO, la cabecera y el detalle quedan congelados.
   */
  async update(
    id: number,
    dto: UpdateComprobanteDto,
    usuarioId: number,
  ): Promise<ComprobanteResponse> {
    const comprobante = await this.cargarComprobante(id);

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

    const actualizado = await this.prisma.$transaction(async (tx) => {
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
      });
    });

    return this.toResponse(actualizado);
  }

  /**
   * Confirma un comprobante: BORRADOR → REGISTRADO. A partir de acá la cabecera
   * y el detalle quedan congelados y el comprobante entra en la cuenta
   * corriente del proveedor.
   *
   * Inicializa el saldo pendiente con el importe total y el estado de saldo en
   * PENDIENTE para cualquier tipo (HU-16): una factura y una nota arrancan
   * igual. Es una sola escritura sobre la misma fila, sin efectos sobre otras
   * entidades, así que no necesita `$transaction`.
   */
  async confirmar(id: number, usuarioId: number): Promise<ComprobanteResponse> {
    const comprobante = await this.cargarComprobante(id);

    if (comprobante.estado !== EstadoComprobante.BORRADOR) {
      throw new ConflictException(
        'Solo se puede confirmar un comprobante en estado BORRADOR',
      );
    }

    if (comprobante.detalles.length === 0) {
      throw new ConflictException(
        'El comprobante necesita al menos una línea de detalle para confirmarse',
      );
    }

    const confirmado = await this.prisma.cOMPROBANTEPROVEEDOR.update({
      where: { id_comprobante_proveedor: id },
      data: {
        estado: EstadoComprobante.REGISTRADO,
        saldo_pendiente: comprobante.importe_total,
        saldo_cancelado: false,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });

    return this.toResponse(confirmado);
  }

  /**
   * Anula un comprobante REGISTRADO. El motivo es obligatorio y queda en
   * `motivo_anulacion` para la trazabilidad de la cuenta corriente.
   *
   * Solo se puede anular si el comprobante no tiene ninguna imputación de pago:
   * se detecta comparando el saldo pendiente con el importe total. Al anularse
   * queda sin saldo (fuera de la cuenta corriente) y deja de poder imputarse;
   * su combinación de numeración vuelve a quedar libre.
   */
  async anular(
    id: number,
    dto: AnularComprobanteDto,
    usuarioId: number,
  ): Promise<ComprobanteResponse> {
    const comprobante = await this.cargarComprobante(id);

    if (comprobante.estado !== EstadoComprobante.REGISTRADO) {
      throw new ConflictException(
        'Solo se puede anular un comprobante en estado REGISTRADO',
      );
    }

    if (
      !comprobante.saldo_pendiente ||
      !comprobante.saldo_pendiente.equals(comprobante.importe_total)
    ) {
      throw new ConflictException(
        'No se puede anular un comprobante que ya tiene imputaciones de pago',
      );
    }

    const anulado = await this.prisma.cOMPROBANTEPROVEEDOR.update({
      where: { id_comprobante_proveedor: id },
      data: {
        estado: EstadoComprobante.ANULADO,
        motivo_anulacion: dto.motivo_anulacion,
        saldo_pendiente: null,
        saldo_cancelado: null,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });

    return this.toResponse(anulado);
  }

  // --- Mappers: objeto de Prisma → forma del contrato (Swagger) -------------

  private toResponse(c: CabeceraComprobanteRow): ComprobanteResponse {
    return {
      id_comprobante_proveedor: c.id_comprobante_proveedor,
      FK_tipo_comprobante: c.FK_tipo_comprobante,
      letra: c.letra,
      punto_de_venta: c.punto_de_venta,
      numero: c.numero,
      fecha_emision: c.fecha_emision.toISOString(),
      fecha_vencimiento: c.fecha_vencimiento.toISOString(),
      FK_proveedor: c.FK_proveedor,
      FK_orden_compra: c.FK_orden_compra,
      FK_comprobante_origen: c.FK_comprobante_origen,
      observaciones: c.observaciones,
      importe_neto: c.importe_neto.toNumber(),
      alicuota_iva: c.alicuota_iva.toNumber(),
      importe_iva: c.importe_iva.toNumber(),
      importe_total: c.importe_total.toNumber(),
      saldo_pendiente:
        c.saldo_pendiente === null ? null : c.saldo_pendiente.toNumber(),
      estado: c.estado,
      estado_saldo: estadoSaldoDesde(c.saldo_cancelado),
      motivo_anulacion: c.motivo_anulacion,
      hora_creacion: c.hora_creacion.toISOString(),
      hora_actualizacion:
        c.hora_actualizacion === null
          ? null
          : c.hora_actualizacion.toISOString(),
      FK_usuario_creador: c.FK_usuario_creador,
      FK_usuario_actualizador: c.FK_usuario_actualizador,
    };
  }

  private toListItem(c: ComprobanteConResumenRow): ComprobanteListItem {
    return {
      id_comprobante_proveedor: c.id_comprobante_proveedor,
      FK_tipo_comprobante: c.FK_tipo_comprobante,
      letra: c.letra,
      punto_de_venta: c.punto_de_venta,
      numero: c.numero,
      fecha_emision: c.fecha_emision.toISOString(),
      fecha_vencimiento: c.fecha_vencimiento.toISOString(),
      FK_proveedor: c.FK_proveedor,
      importe_total: c.importe_total.toNumber(),
      saldo_pendiente:
        c.saldo_pendiente === null ? null : c.saldo_pendiente.toNumber(),
      estado: c.estado,
      estado_saldo: estadoSaldoDesde(c.saldo_cancelado),
      proveedor: {
        id_proveedor: c.proveedor.id_proveedor,
        razon_social: c.proveedor.razon_social,
      },
      tipoComprobante: {
        id_tipo_comprobante: c.tipoComprobante.id_tipo_comprobante,
        nombre: c.tipoComprobante.nombre,
      },
    };
  }

  private toDetalle(c: ComprobanteLecturaRow): ComprobanteDetalleResponse {
    return {
      ...this.toResponse(c),
      proveedor: {
        id_proveedor: c.proveedor.id_proveedor,
        razon_social: c.proveedor.razon_social,
      },
      tipoComprobante: {
        id_tipo_comprobante: c.tipoComprobante.id_tipo_comprobante,
        nombre: c.tipoComprobante.nombre,
      },
      detalle: c.detalles.map((l) => ({
        id_detalle_comprobante: l.id_detalle_comprobante,
        descripcion: l.descripcion,
        FK_articulo: l.FK_articulo,
        cantidad: l.cantidad.toNumber(),
        precio_unitario: l.precio_unitario.toNumber(),
        subtotal: l.subtotal.toNumber(),
      })),
      comprobanteOrigen: c.comprobante_origen
        ? this.toListItem(c.comprobante_origen)
        : null,
      notasAplicadas: c.notas_aplicadas.map((n) => this.toListItem(n)),
      pagos: c.detallesPago.map((d) => ({
        id_pago: d.pago.id_pago,
        fecha_pago: d.pago.fecha_pago.toISOString(),
        importe_imputado: d.importe_imputado.toNumber(),
      })),
      usuarioCreador: {
        nombre: c.usuarioCreador.nombre,
        apellido: c.usuarioCreador.apellido,
      },
      usuarioActualizador: {
        nombre: c.usuarioActualizador.nombre,
        apellido: c.usuarioActualizador.apellido,
      },
    };
  }

  /**
   * Trae el comprobante crudo con todas sus relaciones de lectura. Uso
   * interno: `update` / `confirmar` / `anular` lo usan para sus chequeos
   * previos, y `findOne` para el detalle en modo lectura.
   */
  private async cargarComprobante(id: number): Promise<ComprobanteLecturaRow> {
    const comprobante = await this.prisma.cOMPROBANTEPROVEEDOR.findUnique({
      where: { id_comprobante_proveedor: id },
      include: {
        proveedor: { select: { id_proveedor: true, razon_social: true } },
        tipoComprobante: {
          select: { id_tipo_comprobante: true, nombre: true },
        },
        detalles: { orderBy: { id_detalle_comprobante: 'asc' } },
        comprobante_origen: {
          include: {
            proveedor: { select: { id_proveedor: true, razon_social: true } },
            tipoComprobante: {
              select: { id_tipo_comprobante: true, nombre: true },
            },
          },
        },
        notas_aplicadas: {
          include: {
            proveedor: { select: { id_proveedor: true, razon_social: true } },
            tipoComprobante: {
              select: { id_tipo_comprobante: true, nombre: true },
            },
          },
          orderBy: { id_comprobante_proveedor: 'asc' },
        },
        detallesPago: {
          include: {
            pago: { select: { id_pago: true, fecha_pago: true } },
          },
          orderBy: { id_detalle_pago: 'asc' },
        },
        usuarioCreador: { select: { nombre: true, apellido: true } },
        usuarioActualizador: { select: { nombre: true, apellido: true } },
      },
    });

    if (!comprobante) {
      throw new NotFoundException(`No existe un comprobante con id ${id}`);
    }

    return comprobante;
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
        select: { id_orden_compra: true, estado: true, FK_proveedor: true },
      });
      if (!ordenCompra) {
        throw new NotFoundException(
          `No existe una orden de compra con id ${refs.FK_orden_compra}`,
        );
      }
      if (
        refs.FK_proveedor !== undefined &&
        ordenCompra.FK_proveedor !== refs.FK_proveedor
      ) {
        throw new BadRequestException(
          'La orden de compra vinculada pertenece a otro proveedor',
        );
      }
      if (!ESTADOS_OC_VINCULABLES.includes(ordenCompra.estado)) {
        throw new ConflictException(
          `La orden de compra con id ${refs.FK_orden_compra} está en estado ${ordenCompra.estado} y no puede vincularse a un comprobante`,
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
   * punto de venta + número. A propósito NO es un `@@unique` de base (ver el
   * comentario en `schema.prisma`): si un comprobante se cargó con el número
   * mal tipeado y se anula, hay que poder volver a cargarlo con el correcto.
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
