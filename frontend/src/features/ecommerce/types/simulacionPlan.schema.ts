import { z } from 'zod'
import { formatearImporte } from '@/shared/utils/importe'
import { interpretarImporteAr } from '@/features/ecommerce/mis-compras/utils/importeTexto'

export const MODOS_ANTICIPO = ['PORCENTAJE', 'MONTO'] as const
export type ModoAnticipo = (typeof MODOS_ANTICIPO)[number]

/**
 * Formulario de la simulación libre (HU-25). Se arma por unidad porque el tope
 * del monto es su precio de lista. Las reglas calcan `simularPlanCatalogoSchema`
 * (backend): anticipo mayor a 0 y menor al precio, porcentaje menor al 100 %,
 * hasta dos decimales. El backend igual revalida todo.
 *
 * El anticipo se tipea como texto en formato es-AR (coma decimal, punto de
 * miles opcional) y se convierte a número recién después de validarlo.
 */
export function crearSimulacionPlanSchema(precioLista: number) {
  return z
    .object({
      plazo: z.string().min(1, 'Elegí un plazo'),
      modo: z.enum(MODOS_ANTICIPO),
      anticipo: z.string(),
    })
    .superRefine((valores, ctx) => {
      // Un solo mensaje por vez, en el orden en que se corrige.
      const error = errorAnticipo(valores.anticipo, valores.modo, precioLista)
      if (error) ctx.addIssue({ code: 'custom', path: ['anticipo'], message: error })
    })
    .transform((valores) => ({
      plazo: Number(valores.plazo),
      modo: valores.modo,
      // El superRefine ya garantizó el formato: acá nunca da `null`.
      anticipo: interpretarImporteAr(valores.anticipo) ?? 0,
    }))
}

function errorAnticipo(texto: string, modo: ModoAnticipo, precioLista: number): string | null {
  if (!texto.trim()) return 'Ingresá el anticipo'

  const anticipo = interpretarImporteAr(texto)
  if (anticipo === null) {
    return 'Ingresá un número válido: coma para los decimales (hasta dos). Ej. 1.600.000,50'
  }
  if (anticipo <= 0) return 'El anticipo debe ser mayor a 0'

  if (modo === 'PORCENTAJE' && anticipo >= 100) {
    return 'El anticipo debe ser menor al 100 % del precio'
  }
  if (modo === 'MONTO' && anticipo >= precioLista) {
    return `El anticipo debe ser menor al precio (${formatearImporte(precioLista)})`
  }

  return null
}

export type SimulacionPlanFormValues = z.input<ReturnType<typeof crearSimulacionPlanSchema>>
export type SimulacionPlanFormOutput = z.output<ReturnType<typeof crearSimulacionPlanSchema>>
