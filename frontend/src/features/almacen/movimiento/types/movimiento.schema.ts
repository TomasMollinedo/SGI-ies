import { z } from 'zod'
import { aIsoConOffset, desdeValorLocal, esValorLocalValido } from '../utils/fechaIso'

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
    /**
     * La fecha en que ocurrió el movimiento, que es la que se ve en el listado.
     * No se confunde con `hora_creacion`, el momento en que se cargó el
     * registro: esa la pone el backend y es parte de la trazabilidad.
     *
     * Entra como valor local del `<input type="datetime-local">` y sale como
     * ISO 8601 con offset, que es lo que espera el backend.
     */
    fecha_movimiento: z
      .string()
      .min(1, 'La fecha del movimiento es obligatoria')
      .refine(esValorLocalValido, 'Ingresá una fecha válida')
      // El backend rechaza las fechas futuras: se avisa acá para no mandar un
      // request que ya sabemos que va a fallar.
      .refine(
        (valor) => desdeValorLocal(valor) <= new Date(),
        'La fecha del movimiento no puede ser futura'
      )
      .transform((valor) => aIsoConOffset(desdeValorLocal(valor))),
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
