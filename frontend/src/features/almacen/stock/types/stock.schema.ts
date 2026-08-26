import { z } from 'zod'

/** Límites calcados del DTO Zod del backend (create-stock.dto.ts). FK_articulo/FK_deposito viajan como string porque los completa un Combobox. */
export const crearStockFormSchema = z.object({
  FK_articulo: z
    .string()
    .min(1, 'Elegí un artículo')
    .transform((valor) => Number(valor)),
  FK_deposito: z
    .string()
    .min(1, 'Elegí un depósito')
    .transform((valor) => Number(valor)),
  umbral_minimo: z
    .number()
    .int('El umbral mínimo debe ser un número entero')
    .min(0, 'El umbral mínimo no puede ser negativo'),
  observaciones: z
    .string()
    .trim()
    .max(255, 'Las observaciones no pueden superar los 255 caracteres')
    .optional()
    .or(z.literal('')),
})

export type CrearStockFormValues = z.input<typeof crearStockFormSchema>
export type CrearStockFormOutput = z.output<typeof crearStockFormSchema>

/** Límites calcados del DTO Zod del backend (update-stock.dto.ts). */
export const editarStockFormSchema = z.object({
  umbral_minimo: z
    .number()
    .int('El umbral mínimo debe ser un número entero')
    .min(0, 'El umbral mínimo no puede ser negativo'),
  observaciones: z
    .string()
    .trim()
    .max(255, 'Las observaciones no pueden superar los 255 caracteres')
    .optional()
    .or(z.literal('')),
})

export type EditarStockFormValues = z.input<typeof editarStockFormSchema>
export type EditarStockFormOutput = z.output<typeof editarStockFormSchema>
