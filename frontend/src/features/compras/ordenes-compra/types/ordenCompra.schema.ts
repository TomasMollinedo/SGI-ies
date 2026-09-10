import { z } from 'zod'
import { hoyIso } from '../utils/fechaOrdenCompra'

/** Límites calcados de `lineaOrdenCompraSchema` (create-orden-compra.dto.ts). */
export const lineaOrdenCompraFormSchema = z.object({
  FK_articulo: z
    .string()
    .min(1, 'Elegí un artículo')
    .transform((valor) => Number(valor)),
  // El mensaje en el constructor cubre el campo vacío: un input numérico
  // vacío llega como `NaN` (vía `valueAsNumber` de RHF), que ni siquiera pasa
  // el chequeo de tipo de `z.number()` — sin este mensaje, Zod muestra el
  // suyo en inglés ("Invalid input: expected number, received NaN") en vez
  // de fallar recién en `.positive()`.
  cantidad: z
    .number({ message: 'La cantidad es obligatoria' })
    .positive('La cantidad debe ser mayor a 0'),
  precio_unitario: z
    .number({ message: 'El precio unitario es obligatorio' })
    .positive('El precio unitario debe ser mayor a 0'),
})

/**
 * Límites calcados de `documentoOrdenCompraSchema` (create-orden-compra.dto.ts).
 *
 * Sin mínimo de líneas acá a propósito, igual que el backend: se puede
 * guardar un borrador sin detalle todavía. Esa regla ("al menos una línea")
 * aplica recién al confirmar y emitir, y se valida en el componente en ese
 * momento puntual — no en este schema, que se usa para las dos acciones.
 */
export const ordenCompraFormSchema = z
  .object({
    fecha_emision: z
      .string()
      .min(1, 'La fecha de emisión es obligatoria')
      .refine((valor) => valor <= hoyIso(), 'La fecha de emisión no puede ser futura'),
    fecha_entrega_solicitada: z.string().optional().or(z.literal('')),
    FK_proveedor: z
      .string()
      .min(1, 'Elegí un proveedor')
      .transform((valor) => Number(valor)),
    FK_deposito: z
      .string()
      .min(1, 'Elegí un depósito u obrador')
      .transform((valor) => Number(valor)),
    observaciones: z
      .string()
      .trim()
      .max(500, 'Las observaciones no pueden superar los 500 caracteres')
      .optional()
      .or(z.literal('')),
    detalle: z.array(lineaOrdenCompraFormSchema),
  })
  // Misma validación de forma que hace el backend: evita mandar un request
  // que el servidor va a rechazar igual, mostrando el error antes de enviarlo.
  .refine(
    (data) => new Set(data.detalle.map((linea) => linea.FK_articulo)).size === data.detalle.length,
    {
      message: 'No se puede repetir el mismo artículo en el detalle de la orden',
      path: ['detalle'],
    }
  )

export type OrdenCompraFormValues = z.input<typeof ordenCompraFormSchema>
export type OrdenCompraFormOutput = z.output<typeof ordenCompraFormSchema>
export type LineaOrdenCompraFormValues = OrdenCompraFormValues['detalle'][number]
