import { FileText } from 'lucide-react'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useAbrirComprobanteDeclaracion } from '../hooks/useAbrirComprobanteDeclaracion'

interface BotonVerComprobanteProps {
  idDeclaracionPago: number
  /** De qué declaración es, para el `aria-label` (ej. "la declaración de Juan Pérez, $ 1.000,00, declarada el 05/10/2026 14:32"). */
  descripcion: string
}

/**
 * Abre en una pestaña nueva el comprobante de una declaración de pago (T148),
 * para cotejarlo antes de validarla o rechazarla. Solo lo muestra: sin vista
 * previa embebida ni descarga. Tiene su propio loading y queda deshabilitado
 * mientras su archivo se está abriendo.
 *
 * Solo dibuja el botón: qué mostrar cuando la declaración no tiene
 * comprobante lo decide quien lo usa.
 */
export function BotonVerComprobante({ idDeclaracionPago, descripcion }: BotonVerComprobanteProps) {
  const { abrir, abriendo } = useAbrirComprobanteDeclaracion(idDeclaracionPago)

  return (
    <button
      type="button"
      onClick={() => void abrir()}
      disabled={abriendo}
      aria-busy={abriendo || undefined}
      aria-label={`Ver comprobante de ${descripcion}`}
      className="text-info focus-visible:outline-content inline-flex w-fit cursor-pointer items-center gap-1 rounded py-1 text-xs font-medium whitespace-nowrap underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-progress disabled:no-underline disabled:opacity-60"
    >
      {abriendo ? (
        <Spinner className="size-3.5" />
      ) : (
        <FileText className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      Ver comprobante
    </button>
  )
}
