import { z } from 'zod'

/**
 * Reglas numéricas compartidas por los formularios de precio de lista (HU-22)
 * y de plan de ejemplo, calcadas de los schemas de Zod del backend.
 *
 * Se replican en el cliente para mostrar el error al lado del campo en vez de
 * esperar al 400; el backend sigue siendo la autoridad.
 *
 * Los campos numéricos viven en el form como STRING, no como `number`: un
 * `<input type="number">` vacío leído con `valueAsNumber` da `NaN`, que en un
 * campo opcional es indistinguible de "no cargó nada". Con string, vacío es
 * `''` y el schema lo transforma en `undefined`, que es exactamente lo que
 * significa "no mandar esta clave".
 */

/** Dos decimales como máximo, los de las columnas `Decimal(14, 2)`. */
const FORMATO_DECIMAL = /^\d+([.,]\d{1,2})?$/

/** Acepta la coma como separador decimal: es lo que escribe un usuario en es-AR. */
function aNumeroDelFormulario(valor: string): number {
  return Number(valor.replace(',', '.'))
}

interface OpcionesDecimal {
  etiqueta: string
  /** Por default 0 (ningún importe ni porcentaje del plan puede ser negativo). */
  min?: number
  max?: number
  /** Para `precio`, que el backend exige `positive()`. */
  mayorACero?: boolean
}

/**
 * Las reglas numéricas, encadenadas sobre el string crudo (todavía sin
 * convertir). Se aplican igual al campo opcional y al obligatorio; lo único
 * que cambia entre los dos es qué hacen con el vacío, que se resuelve en el
 * `.transform()` final de cada uno.
 */
function conReglasDecimal(
  base: z.ZodType<string, string>,
  opciones: OpcionesDecimal
): z.ZodType<string, string> {
  const { etiqueta, min = 0, max, mayorACero = false } = opciones

  return base
    .refine(
      (valor) => valor === '' || FORMATO_DECIMAL.test(valor),
      `${etiqueta} admite hasta dos decimales`
    )
    .refine(
      (valor) => valor === '' || aNumeroDelFormulario(valor) >= min,
      `${etiqueta} no puede ser menor a ${min}`
    )
    .refine(
      (valor) => valor === '' || !mayorACero || aNumeroDelFormulario(valor) > 0,
      `${etiqueta} debe ser mayor a 0`
    )
    .refine(
      (valor) => valor === '' || max === undefined || aNumeroDelFormulario(valor) <= max,
      `${etiqueta} no puede superar ${max}`
    )
}

/**
 * Un decimal opcional: `''` sale como `undefined` y la clave no viaja en el
 * payload, que es como el backend entiende "no lo cargó" (ahí aplica el
 * default 0 de la columna, o la regla que corresponda).
 */
export function decimalOpcional(opciones: OpcionesDecimal) {
  return conReglasDecimal(z.string().trim(), opciones).transform((valor) =>
    valor === '' ? undefined : aNumeroDelFormulario(valor)
  )
}

/** Igual que `decimalOpcional`, pero vacío es un error: el precio siempre va. */
export function decimalObligatorio(opciones: OpcionesDecimal) {
  return conReglasDecimal(
    z.string().trim().min(1, `${opciones.etiqueta} es obligatorio`),
    opciones
  ).transform(aNumeroDelFormulario)
}

/**
 * Como `decimalOpcional`, pero para Margen: `formatearMilesEnVivo` le agrega
 * puntos de miles mientras se tipea (ej. "20.000,50"), así que antes de
 * aplicar las mismas reglas y el mismo `transform` que el resto de los
 * decimales, hay que sacarlos — si no, "20.000" fallaría la regla de "hasta
 * dos decimales" (la vería como 20 con tres decimales de más).
 */
export function decimalConMilesOpcional(opciones: OpcionesDecimal) {
  return z
    .string()
    .transform((valor) => valor.replace(/\./g, ''))
    .pipe(decimalOpcional(opciones))
}
/**
 * Igual que `decimalObligatorio`, pero acepta puntos de miles en pantalla.
 * Ejemplo: "20.000,50" se transforma primero en "20000,50" y recién
 * después se valida y convierte a number.
 */
export function decimalConMilesObligatorio(opciones: OpcionesDecimal) {
  return z
    .string()
    .transform((valor) => valor.replace(/\./g, ''))
    .pipe(decimalObligatorio(opciones))
}
