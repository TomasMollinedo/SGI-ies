import { z } from 'zod'

// Límites calcados de `createUnidadFuncionalSchema` (create-unidad-funcional.dto.ts):
// topes de las columnas Decimal(10,2) y Decimal(14,2) del backend.
const MAX_SUPERFICIE = 99_999_999.99
const MAX_COSTO = 999_999_999_999.99

/**
 * Límites calcados de `createUnidadFuncionalSchema` (backend). `tipologia`
 * solo valida que se haya elegido algo: los valores posibles salen del
 * catálogo (`useTipologias`), no se hardcodean acá.
 *
 * `FK_proyecto` se elige con la tabla emergente (`SelectorProyectoModal`), no
 * con un `<select>`: por eso viaja como `number`, no como string transformado.
 */
export const unidadFuncionalFormSchema = z.object({
  FK_proyecto: z.number({ message: 'Elegí un proyecto' }).int().positive('Elegí un proyecto'),
  identificador: z
    .string()
    .trim()
    .min(1, 'El identificador es obligatorio')
    .max(30, 'El identificador no puede superar los 30 caracteres'),
  tipologia: z.string().min(1, 'La tipología es obligatoria'),
  // Un input numérico vacío llega como `NaN` vía `valueAsNumber` de RHF, que
  // ni pasa el chequeo de tipo de `z.number()`: sin este mensaje, Zod
  // mostraría el suyo en inglés en vez de fallar recién en la obligatoriedad.
  superficie_cubierta: z
    .number({ message: 'La superficie cubierta es obligatoria' })
    .positive('La superficie cubierta debe ser mayor a cero')
    .multipleOf(0.01, 'La superficie cubierta admite hasta dos decimales')
    .max(MAX_SUPERFICIE, 'La superficie cubierta es demasiado grande'),
  costo: z
    .number({ message: 'El costo es obligatorio' })
    .positive('El costo debe ser mayor a cero')
    .multipleOf(0.01, 'El costo admite hasta dos decimales')
    .max(MAX_COSTO, 'El costo es demasiado grande'),
  piso: z
    .string()
    .trim()
    .max(20, 'El piso no puede superar los 20 caracteres')
    .optional()
    .or(z.literal('')),
  // Vacío (NaN vía `valueAsNumber`) se normaliza a `null`, que es lo que el
  // backend espera para "sin superficie descubierta" (a diferencia de
  // `undefined`, que en la edición significaría "no tocar este campo").
  superficie_descubierta: z.preprocess(
    (valor) => (typeof valor === 'number' && Number.isNaN(valor) ? null : valor),
    z
      .number()
      .nonnegative('La superficie descubierta no puede ser negativa')
      .multipleOf(0.01, 'La superficie descubierta admite hasta dos decimales')
      .max(MAX_SUPERFICIE, 'La superficie descubierta es demasiado grande')
      .nullable()
      .optional()
  ),
  comodidades: z
    .string()
    .trim()
    .max(500, 'Las comodidades no pueden superar los 500 caracteres')
    .optional()
    .or(z.literal('')),
  observaciones: z
    .string()
    .trim()
    .max(500, 'Las observaciones no pueden superar los 500 caracteres')
    .optional()
    .or(z.literal('')),
})

export type UnidadFuncionalFormValues = z.input<typeof unidadFuncionalFormSchema>
export type UnidadFuncionalFormOutput = z.output<typeof unidadFuncionalFormSchema>
