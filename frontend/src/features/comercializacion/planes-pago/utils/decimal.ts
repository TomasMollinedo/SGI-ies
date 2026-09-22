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

/**
 * Normaliza a coma el separador decimal que haya tipeado el usuario, sea
 * cual sea. La validación (`FORMATO_DECIMAL` en `planPagoFormSchema`) ya
 * tolera un punto o una coma indistintamente; esto es solo para que lo que
 * se VE en el campo sea siempre es-AR, tipee lo que tipee.
 */
export function normalizarSeparadorDecimal(valor: string): string {
  return valor.replace('.', ',')
}

/**
 * Formatea en vivo lo que se tipea en Porcentaje de ganancia: normaliza el
 * separador a coma y corta la parte decimal a dos dígitos mientras se
 * tipea, en vez de esperar a que la validación lo rechace después de
 * escribirlo. Es lo mismo que hace `formatearMilesEnVivo` con Margen, pero
 * sin puntos de miles — un porcentaje nunca llega a los miles.
 */
export function limitarADosDecimalesEnVivo(valorTipeado: string): string {
  const limpio = normalizarSeparadorDecimal(valorTipeado).replace(/[^\d,]/g, '')
  const [enteros, ...resto] = limpio.split(',')

  if (!limpio.includes(',')) return enteros
  return `${enteros},${resto.join('').slice(0, 2)}`
}

/**
 * Formatea en vivo lo que se tipea en el campo Margen, con puntos de miles
 * es-AR (ej. "20000" -> "20.000"). A diferencia de los demás decimales del
 * formulario, acá el punto NO es el separador decimal (ese es siempre la
 * coma): por eso Margen tiene su propio parser (`aMilesANumero`) y su propio
 * schema (`decimalConMilesOpcional` en `planPago.schema.ts`) en vez de
 * compartir `aNumeroDeTexto`/`decimalOpcional` con el resto de los campos.
 *
 * Tolera que todavía se esté escribiendo la parte decimal (una coma sola, o
 * con un solo dígito) sin reformatear de más en cada tecla.
 */
export function formatearMilesEnVivo(valorTipeado: string): string {
  // Solo dígitos y una coma: cualquier punto de un formateo anterior se
  // descarta, se vuelve a armar entero.
  const limpio = valorTipeado.replace(/[^\d,]/g, '')
  const [enteros, ...resto] = limpio.split(',')
  const enterosConPuntos = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  if (!limpio.includes(',')) return enterosConPuntos

  const decimales = resto.join('').slice(0, 2)
  return `${enterosConPuntos},${decimales}`
}

/** El inverso de `formatearMilesEnVivo`: a número, sacando los puntos de miles antes de interpretar la coma. */
export function aMilesANumero(valor: string): number | null {
  return aNumero(valor.replace(/\./g, '').replace(',', '.'))
}

/** Un número ya guardado, al formato con puntos de miles del campo Margen (para precargar el formulario al editar). */
export function numeroAMilesTexto(valor: number): string {
  return formatearMilesEnVivo(String(valor).replace('.', ','))
}
