import { z } from 'zod'
import { hoyIso } from '../utils/fechaComprobante'

/** Límites calcados de `lineaComprobanteSchema` (create-comprobante.dto.ts). */
export const lineaComprobanteFormSchema = z.object({
  descripcion: z
    .string()
    .trim()
    .min(1, 'La descripción es obligatoria')
    .max(255, 'La descripción no puede superar los 255 caracteres'),
  // Opcional: una línea puede no corresponder a un artículo del catálogo
  // (flete, servicios). El `<select>` maneja strings; '' significa "sin artículo".
  FK_articulo: z.string().optional().or(z.literal('')),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  precio_unitario: z.number().positive('El precio unitario debe ser mayor a 0'),
})

/**
 * Límites calcados de `createComprobanteSchema` (create-comprobante.dto.ts).
 *
 * Sin mínimo de líneas acá a propósito, igual que el backend: se puede guardar
 * un borrador sin detalle todavía. El "al menos una línea" aplica recién al
 * confirmar y se valida en el componente en ese momento puntual.
 *
 * Los FK opcionales (`FK_orden_compra`, `FK_comprobante_origen`) quedan como
 * string: los convierte a número el `construirPayload` del formulario,
 * mismo criterio que `OrdenesCompraPage`.
 */
export const comprobanteFormSchema = z
  .object({
    FK_tipo_comprobante: z
      .string()
      .min(1, 'Elegí un tipo de comprobante')
      .transform((valor) => Number(valor)),
    FK_proveedor: z
      .string()
      .min(1, 'Elegí un proveedor')
      .transform((valor) => Number(valor)),
    FK_orden_compra: z.string().optional().or(z.literal('')),
    FK_comprobante_origen: z.string().optional().or(z.literal('')),
    letra: z
      .string()
      .trim()
      .length(1, 'La letra debe ser un solo carácter')
      .transform((valor) => valor.toUpperCase()),
    punto_de_venta: z
      .number()
      .int('El punto de venta debe ser un número entero')
      .positive('El punto de venta debe ser mayor a 0'),
    numero: z
      .number()
      .int('El número debe ser un número entero')
      .positive('El número debe ser mayor a 0'),
    fecha_emision: z
      .string()
      .min(1, 'La fecha de emisión es obligatoria')
      .refine((valor) => valor <= hoyIso(), 'La fecha de emisión no puede ser futura'),
    fecha_vencimiento: z.string().min(1, 'La fecha de vencimiento es obligatoria'),
    observaciones: z
      .string()
      .trim()
      .max(500, 'Las observaciones no pueden superar los 500 caracteres')
      .optional()
      .or(z.literal('')),
    alicuota_iva: z
      .number()
      .min(0, 'La alícuota no puede ser negativa')
      .max(100, 'La alícuota no puede superar 100'),
    detalle: z.array(lineaComprobanteFormSchema),
  })
  // Misma regla que valida el backend: comparar strings ISO (`YYYY-MM-DD`) alcanza.
  .refine((data) => data.fecha_vencimiento >= data.fecha_emision, {
    message: 'La fecha de vencimiento no puede ser anterior a la de emisión',
    path: ['fecha_vencimiento'],
  })

export type ComprobanteFormValues = z.input<typeof comprobanteFormSchema>
export type ComprobanteFormOutput = z.output<typeof comprobanteFormSchema>
export type LineaComprobanteFormValues = ComprobanteFormValues['detalle'][number]