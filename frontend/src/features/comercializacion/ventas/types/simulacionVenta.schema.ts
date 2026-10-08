import { z } from 'zod'
import { formatearImporte } from '@/shared/utils/importe'
import { interpretarImporteAr } from '@/features/ecommerce/mis-compras/utils/importeTexto'

export const MODOS_ANTICIPO = ['PORCENTAJE', 'MONTO'] as const
export type ModoAnticipo = (typeof MODOS_ANTICIPO)[number]

/**
 * Formulario del simulador de la venta (HU-27). Mismas reglas que
 * `crearSimulacionPlanSchema` del catálogo público (anticipo mayor a 0 y
 * menor al precio, porcentaje menor a 100 %), con el agregado de la
 * modalidad: en CONTADO no hay plazo ni anticipo que validar. El backend
 * igual revalida todo al simular y al confirmar.
 *
 * El anticipo se tipea en formato es-AR (coma decimal) y se convierte a
 * número recién después de validarlo.
 */
export function crearSimulacionVentaSchema(precioLista: number) {
  return z
    .object({
      modalidad: z.enum(['CONTADO', 'FINANCIADO']),
      plazo: z.string(),
      modo: z.enum(MODOS_ANTICIPO),
      anticipo: z.string(),
    })
    .superRefine((valores, ctx) => {
      if (valores.modalidad === 'CONTADO') return

      if (!valores.plazo) {
        ctx.addIssue({ code: 'custom', path: ['plazo'], message: 'Elegí un plazo' })
      }

      const error = errorAnticipo(valores.anticipo, valores.modo, precioLista)
      if (error) ctx.addIssue({ code: 'custom', path: ['anticipo'], message: error })
    })
    .transform((valores) =>
      valores.modalidad === 'CONTADO'
        ? ({
            modalidad: 'CONTADO' as const,
            plazo: null,
            modo: valores.modo,
            anticipo: null,
          } as const)
        : ({
            modalidad: 'FINANCIADO' as const,
            plazo: Number(valores.plazo),
            modo: valores.modo,
            // El superRefine ya garantizó el formato: acá nunca da `null`.
            anticipo: interpretarImporteAr(valores.anticipo) ?? 0,
          } as const)
    )
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

export type SimulacionVentaFormValues = z.input<ReturnType<typeof crearSimulacionVentaSchema>>
export type SimulacionVentaFormOutput = z.output<ReturnType<typeof crearSimulacionVentaSchema>>
