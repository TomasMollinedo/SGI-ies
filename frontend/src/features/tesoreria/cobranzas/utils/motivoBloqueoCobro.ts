import { formatearImporte } from '@/shared/utils/importe'
import { cobroFormSchema } from '../types/cobro.schema'
import type { CobroFormValues } from '../types/cobro.schema'
import type { CuotaImputable } from '../types/cobro.types'
import { aCentavos, importeSupera, sumarImportes, tieneFormatoImporte } from './importeCentavos'

/** Importe que el usuario editó para cada cuota seleccionada, como string (input controlado). Ausente = no seleccionada. */
export type SeleccionCuotas = Record<number, string>

/** La cabecera tal como está en el formulario, más si la forma de pago elegida exige referencia. */
export interface CabeceraParaBloqueo extends CobroFormValues {
  requiereReferencia: boolean
}

/** Un importe de línea es válido si tiene formato de importe, es > 0 y no supera el saldo pendiente. */
export function esImporteLineaValido(texto: string, saldoPendiente: number): boolean {
  if (!tieneFormatoImporte(texto)) return false
  const importe = Number(texto)
  return aCentavos(importe) > 0 && !importeSupera(importe, saldoPendiente)
}

/** Las cuotas marcadas, en el orden en que las devuelve el backend. */
export function cuotasSeleccionadas(
  cuotas: CuotaImputable[],
  seleccion: SeleccionCuotas
): CuotaImputable[] {
  return cuotas.filter((cuota) => seleccion[cuota.id_cuota] !== undefined)
}

/** Suma exacta (en centavos) de lo imputado. Un importe no numérico cuenta como 0. */
export function sumaImputada(cuotas: CuotaImputable[], seleccion: SeleccionCuotas): number {
  return sumarImportes(
    cuotasSeleccionadas(cuotas, seleccion).map((cuota) => Number(seleccion[cuota.id_cuota]) || 0)
  )
}

/**
 * Por qué todavía no se puede confirmar el cobro, o `null` si ya se puede.
 * Devuelve un solo motivo, el de mayor prioridad:
 *
 * 1. Falta completar la cabecera (cliente, forma de pago, importe total
 *    válido; o algún otro campo con error, que se ve en el propio campo).
 * 2. Falta la referencia que exige la forma de pago.
 * 3. No hay cuotas seleccionadas.
 * 4. Hay importes inválidos (≤ 0 o mayores al saldo).
 * 5. La suma de lo imputado no coincide con el importe total declarado.
 *
 * Pura a propósito: la pantalla la recalcula en cada render y solo muestra
 * el resultado junto al botón.
 */
export function motivoBloqueoCobro(
  cabecera: CabeceraParaBloqueo,
  seleccion: SeleccionCuotas,
  cuotas: CuotaImputable[]
): string | null {
  const { requiereReferencia, ...valores } = cabecera

  if (!valores.FK_cliente) return 'Elegí el cliente que realiza el pago.'
  if (!valores.FK_forma_pago) return 'Elegí la forma de pago.'
  if (!cobroFormSchema.shape.importe_total.safeParse(valores.importe_total).success) {
    return 'Ingresá un importe total recibido válido, mayor a 0 y con hasta dos decimales.'
  }
  if (!cobroFormSchema.safeParse(valores).success) {
    return 'Revisá los campos marcados de la cabecera.'
  }

  if (requiereReferencia && !valores.numero_referencia?.trim()) {
    return 'Esta forma de pago exige un número de referencia.'
  }

  const seleccionadas = cuotasSeleccionadas(cuotas, seleccion)
  if (seleccionadas.length === 0) return 'Seleccioná al menos una cuota para imputar.'

  const hayImportesInvalidos = seleccionadas.some(
    (cuota) => !esImporteLineaValido(seleccion[cuota.id_cuota], cuota.saldo_pendiente)
  )
  if (hayImportesInvalidos) {
    return 'Revisá los importes marcados: deben ser mayores a 0 y no superar el saldo pendiente.'
  }

  const suma = sumaImputada(cuotas, seleccion)
  const total = Number(valores.importe_total)
  const diferenciaCentavos = aCentavos(total) - aCentavos(suma)
  if (diferenciaCentavos !== 0) {
    const diferencia = formatearImporte(Math.abs(diferenciaCentavos) / 100)
    return `La suma de las imputaciones (${formatearImporte(suma)}) no coincide con el importe total (${formatearImporte(total)}): ${diferenciaCentavos > 0 ? 'falta imputar' : 'sobran'} ${diferencia}.`
  }

  return null
}
