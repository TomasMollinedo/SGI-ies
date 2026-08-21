import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  mensaje?: string
  onReintentar?: () => void
}

export function ErrorState({
  mensaje = 'Ocurrió un error al cargar los datos.',
  onReintentar,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <AlertCircle className="text-error" size={40} />
      <p className="text-content font-medium">{mensaje}</p>
      {onReintentar && (
        <button
          type="button"
          onClick={onReintentar}
          className="text-primary text-sm font-medium hover:underline"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
