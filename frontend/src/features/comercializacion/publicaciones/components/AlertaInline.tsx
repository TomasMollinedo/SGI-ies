import type { ReactNode } from 'react'

interface AlertaInlineProps {
  children: ReactNode
}

/**
 * Alerta persistente dentro de un modal: no se va sola como un toast. Mismas
 * clases que el aviso de error de `ConfirmDialog`.
 */
export function AlertaInline({ children }: AlertaInlineProps) {
  return (
    <div
      role="alert"
      className="border-error/30 bg-error/10 text-error rounded-md border px-4 py-3 text-xs"
    >
      {children}
    </div>
  )
}
