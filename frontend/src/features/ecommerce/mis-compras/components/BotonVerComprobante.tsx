import { FileText } from 'lucide-react'
import { httpClientCliente } from '@/shared/api/httpClientCliente'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useAbrirArchivoProtegido } from '@/shared/hooks/useAbrirArchivoProtegido'
import { COMPROBANTE } from '../config/misCompras.config'
import { rutaComprobanteDeclaracion } from '../services/declaracionesPago.service'

interface BotonVerComprobanteProps {
  idDeclaracionPago: number
  /** Nombre original del archivo, si se conoce: se muestra al lado del texto del botón. */
  nombreArchivo?: string | null
  /** De qué declaración o pago es, para el `aria-label` (ej. "Cuota 3, $ 1.000,00, declarado el 05/10/2026"). */
  descripcion: string
}

/**
 * Abre en una pestaña nueva el comprobante de una declaración de pago propia
 * (T147). Solo lo muestra: una declaración enviada no admite reemplazar ni
 * eliminar el comprobante. Cada botón tiene su propio loading y queda
 * deshabilitado mientras su archivo se está abriendo.
 */
export function BotonVerComprobante({
  idDeclaracionPago,
  nombreArchivo,
  descripcion,
}: BotonVerComprobanteProps) {
  const { abrir, urlAbriendo } = useAbrirArchivoProtegido(httpClientCliente, COMPROBANTE.cargando)
  const ruta = rutaComprobanteDeclaracion(idDeclaracionPago)
  const abriendo = urlAbriendo === ruta

  return (
    <button
      type="button"
      onClick={() => void abrir(ruta)}
      disabled={abriendo}
      aria-busy={abriendo || undefined}
      aria-label={`${COMPROBANTE.ver}: ${descripcion}`}
      className="text-secondary hover:text-light focus-visible:outline-light inline-flex w-fit max-w-full cursor-pointer items-center gap-2 rounded py-1 text-left font-mono text-xs tracking-widest uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-progress disabled:opacity-60"
    >
      {abriendo ? (
        <Spinner className="size-3.5" />
      ) : (
        <FileText size={14} aria-hidden="true" className="shrink-0" />
      )}
      <span className="shrink-0">{COMPROBANTE.ver}</span>
      {nombreArchivo && (
        <span className="text-light/60 min-w-0 truncate font-sans tracking-normal normal-case">
          {nombreArchivo}
        </span>
      )}
    </button>
  )
}
