/**
 * Los `Decimal` del backend viajan como string (ver el encabezado de
 * `planPago.types.ts`). Estos helpers son el único lugar donde se los
 * convierte a `number` para mostrarlos o para las cuentas de ayuda del
 * formulario.
 *
 * Las cuentas que se hacen con esto son informativas y se recalculan en cada
 * tecla: el precio sugerido y el porcentaje de ganancia implícito. Los
 * importes que se persisten los calcula el backend con `Prisma.Decimal`, y el
 * cronograma de cuotas sale siempre de `POST /planes-pago/simular-cuotas` —
 * acá nunca se reimplementa ninguno de los dos.
 */

/** Convierte un decimal del backend a número. `null` o un string no numérico dan `null`. */
export function aNumero(valor: string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor.trim() === '') return null

  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

/**
 * Igual que `aNumero`, pero para los campos que el backend nunca manda en
 * `null` (`precio`, `porcentaje_ganancia`, `margen`): si el valor no se puede
 * interpretar, cae en 0 en vez de romper el render.
 */
export function aNumeroOCero(valor: string | null | undefined): number {
  return aNumero(valor) ?? 0
}

/** Redondeo a 2 decimales, los mismos que las columnas `Decimal(14, 2)`. */
export function redondearDosDecimales(valor: number): number {
  return Math.round(valor * 100) / 100
}

const FORMATO_PORCENTAJE = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formatea un porcentaje ya numérico (ej. 26.67 → "26,67 %"). */
export function formatearPorcentaje(valor: number): string {
  return `${FORMATO_PORCENTAJE.format(valor)} %`
}

/**
 * Lo que escribe el usuario en un campo numérico del formulario, a número.
 * Vacío o a medio escribir dan `null`, que es lo que las ayudas de cálculo
 * entienden como "todavía no cargó nada".
 *
 * Acepta la coma como separador decimal: es lo que se escribe en es-AR, y es
 * lo mismo que tolera `planPagoFormSchema`.
 */
export function aNumeroDeTexto(valor: string): number | null {
  return aNumero(valor.replace(',', '.'))
}
