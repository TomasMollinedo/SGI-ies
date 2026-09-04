import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';

/**
 * Una línea del detalle. El `subtotal` no lo manda el cliente: lo calcula el
 * service a partir de `cantidad * precio_unitario`, igual que en OrdenCompra.
 * A diferencia de OrdenCompra, `FK_articulo` es opcional: una línea puede
 * corresponder a un concepto sin artículo de catálogo (flete, servicios).
 */
export const lineaComprobanteSchema = z.object({
  descripcion: z
    .string()
    .trim()
    .min(1, 'La descripción es obligatoria')
    .max(255),
  FK_articulo: z.number().int().positive().optional(),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  precio_unitario: z.number().positive('El precio unitario debe ser mayor a 0'),
});

/**
 * Cabecera del comprobante. No incluye `estado`, `estado_saldo`,
 * `saldo_pendiente` ni los importes: son responsabilidad exclusiva del
 * service (ver HU-16, service de confirmación).
 */
export const cabeceraComprobanteSchema = z.object({
  FK_tipo_comprobante: z.number().int().positive(),
  letra: z.string().trim().length(1, 'La letra debe ser un solo carácter'),
  punto_de_venta: z.number().int().positive(),
  numero: z.number().int().positive(),
  // Fechas obligatorias: las imprime el proveedor, no las genera el sistema
  // (a diferencia de OrdenCompra.fecha_emision, que defaultea a "hoy").
  fecha_emision: fechaIsoSchema,
  fecha_vencimiento: fechaIsoSchema,
  FK_proveedor: z.number().int().positive(),
  // Vínculo opcional a la orden de compra que origina el comprobante.
  FK_orden_compra: z.number().int().positive().optional(),
  // Obligatorio a nivel de service cuando el tipo de comprobante lo requiere
  // (TIPOCOMPROBANTE.requiere_comprobante_origen) — no se puede validar acá
  // porque depende de una consulta a la base.
  FK_comprobante_origen: z.number().int().positive().optional(),
  observaciones: z.string().trim().max(500).optional(),
  // La carga el usuario: no hay catálogo de alícuotas en el schema. A partir
  // de este valor + el detalle, el service calcula importe_neto/iva/total.
  alicuota_iva: z
    .number()
    .min(0, 'La alícuota no puede ser negativa')
    .max(100, 'La alícuota no puede superar 100'),
});

export const createComprobanteSchema = cabeceraComprobanteSchema.extend({
  // Sin mínimo de líneas acá a propósito, mismo criterio que OrdenCompra: la
  // HU exige al menos una línea recién "antes de confirmarse" (BORRADOR →
  // REGISTRADO), no al crear el borrador.
  detalle: z.array(lineaComprobanteSchema),
});

export class CreateComprobanteDto extends createZodDto(
  createComprobanteSchema,
) {}
