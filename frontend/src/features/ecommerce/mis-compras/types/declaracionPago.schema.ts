import { z } from 'zod'
import { aCentavos, importeSupera } from '@/features/tesoreria/cobranzas/utils/importeCentavos'
import { formatearImporte } from '@/shared/utils/importe'
import { interpretarImporteAr, tieneFormatoImporteAr } from '../utils/importeTexto'
import type { FormaPagoAutogestion } from './declaracionPago.types'

/**
 * Formulario de declaración de pago (HU-29). Se arma por cuota porque el tope
 * del importe es el saldo pendiente de esa cuota, y la referencia es
 * obligatoria o no según la forma de pago elegida. Límites calcados de
 * `createDeclaracionPagoSchema` (create-declaracion-pago.dto.ts); el backend
 * igual revalida todo.
 *
 * El importe se tipea como texto en formato es-AR — punto de miles opcional,
 * coma decimal (ver `interpretarImporteAr`) — y se convierte a número recién
 * después de validarlo.
 */
export function crearDeclaracionPagoSchema(
  saldoPendiente: number,
  formasPago: FormaPagoAutogestion[]
) {
  return z
    .object({
      FK_forma_pago: z.string().min(1, 'Elegí una forma de pago'),
      // Un solo mensaje por vez (superRefine + return), en el orden en que el
      // cliente lo tiene que corregir — mismo criterio que `cobroFormSchema`.
      importe: z
        .string()
        .superRefine((valor, ctx) => {
          if (!valor.trim()) {
            ctx.addIssue({ code: 'custom', message: 'El importe es obligatorio' })
            return
          }
          if (!tieneFormatoImporteAr(valor)) {
            ctx.addIssue({
              code: 'custom',
              message:
                'Ingresá un importe válido: coma para los decimales (hasta dos) y punto solo para los miles. Ej. 1.600.000,50',
            })
            return
          }
          const importe = interpretarImporteAr(valor) ?? 0
          if (aCentavos(importe) <= 0) {
            ctx.addIssue({ code: 'custom', message: 'El importe debe ser mayor a 0' })
            return
          }
          if (importeSupera(importe, saldoPendiente)) {
            ctx.addIssue({
              code: 'custom',
              message: `El importe no puede superar el saldo de la cuota (${formatearImporte(saldoPendiente)})`,
            })
          }
        })
        // El superRefine ya garantizó el formato: acá nunca da `null`.
        .transform((valor) => interpretarImporteAr(valor) ?? 0),
      numero_referencia: z
        .string()
        .trim()
        .max(100, 'El número de referencia no puede superar los 100 caracteres'),
    })
    .superRefine((valores, ctx) => {
      const forma = formasPago.find((item) => item.id === valores.FK_forma_pago)
      if (forma?.metadata.requiere_referencia && !valores.numero_referencia) {
        ctx.addIssue({
          code: 'custom',
          path: ['numero_referencia'],
          message: `El número de referencia es obligatorio para ${forma.code}`,
        })
      }
    })
}

export type DeclaracionPagoFormValues = z.input<ReturnType<typeof crearDeclaracionPagoSchema>>
export type DeclaracionPagoFormOutput = z.output<ReturnType<typeof crearDeclaracionPagoSchema>>
