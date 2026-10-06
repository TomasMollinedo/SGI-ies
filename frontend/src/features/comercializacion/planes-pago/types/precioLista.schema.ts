import { z } from 'zod'
import {
  decimalConMilesObligatorio,
  decimalConMilesOpcional,
  decimalOpcional,
} from './planPago.schema'

/** `Decimal(14, 2)`: lo máximo que entra en `precio_lista` y en `margen`. */
const IMPORTE_MAXIMO = 999_999_999_999.99

/**
 * Validación del formulario de precio de lista (HU-22), calcada de
 * `definir-precio-lista.dto.ts` del backend. Reusa los mismos campos
 * numéricos que el formulario de planes: precio y margen con puntos de miles,
 * porcentaje con coma.
 *
 * Porcentaje y margen son opcionales y solo de referencia: el precio guardado
 * es el que manda y no tiene por qué cerrar contra ellos.
 */
export const precioListaFormSchema = z.object({
  precio: decimalConMilesObligatorio({
    etiqueta: 'El precio',
    mayorACero: true,
    max: IMPORTE_MAXIMO,
  }),
  porcentaje_ganancia: decimalOpcional({
    etiqueta: 'El porcentaje de ganancia',
    // `Decimal(5, 2)`: no entra nada de 1000 para arriba.
    max: 999.99,
  }),
  margen: decimalConMilesOpcional({ etiqueta: 'El margen', max: IMPORTE_MAXIMO }),
})

export type PrecioListaFormValues = z.input<typeof precioListaFormSchema>
export type PrecioListaFormOutput = z.output<typeof precioListaFormSchema>

export const VALORES_INICIALES_PRECIO_LISTA: PrecioListaFormValues = {
  precio: '',
  porcentaje_ganancia: '',
  margen: '',
}
