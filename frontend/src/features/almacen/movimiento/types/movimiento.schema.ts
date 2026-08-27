import { z } from 'zod'

/** Límites calcados de `lineaMovimientoSchema` (create-movimiento.dto.ts). */
export const lineaMovimientoFormSchema = z.object({
  FK_Stock: z
    .string()
    .min(1, 'Elegí un artículo')
    .transform((valor) => Number(valor)),
  cantidad: z
    .number()
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser mayor a 0'),
  observacion: z
    .string()
    .trim()
    .max(255, 'La observación no puede superar los 255 caracteres')
    .optional()
    .or(z.literal('')),
})

/** Límites calcados de `createMovimientoSchema` (create-movimiento.dto.ts). */
export const movimientoFormSchema = z
  .object({
    FK_TipoMovimiento: z
      .string()
      .min(1, 'Elegí un tipo de movimiento')
      .transform((valor) => Number(valor)),
    FK_Deposito: z
      .string()
      .min(1, 'Elegí un depósito')
      .transform((valor) => Number(valor)),
    referencia: z
      .string()
      .trim()
      .max(255, 'La referencia no puede superar los 255 caracteres')
      .optional()
      .or(z.literal('')),
    observaciones: z
      .string()
      .trim()
      .max(255, 'Las observaciones no pueden superar los 255 caracteres')
      .optional()
      .or(z.literal('')),
    detalle: z.array(lineaMovimientoFormSchema).min(1, 'Agregá al menos una línea de detalle'),
  })
  // Misma validación de forma que hace el backend: evita mandar un request que
  // el servidor va a rechazar igual, mostrando el error antes de enviarlo.
  .refine(
    (data) => new Set(data.detalle.map((linea) => linea.FK_Stock)).size === data.detalle.length,
    {
      message: 'No se puede repetir la misma ficha de stock en el detalle',
      path: ['detalle'],
    }
  )

export type MovimientoFormValues = z.input<typeof movimientoFormSchema>
export type MovimientoFormOutput = z.output<typeof movimientoFormSchema>
export type LineaMovimientoFormValues = MovimientoFormValues['detalle'][number]
