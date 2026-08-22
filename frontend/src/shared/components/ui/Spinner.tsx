import { cn } from '@/shared/utils/cn'

/**
 * Indicador de carga. Toma el color del texto (`currentColor`) y el tamaño de
 * las clases que le pasen, así que se adapta a quien lo contiene.
 *
 * Con `prefers-reduced-motion` no se frena — es la única señal de que algo está
 * trabajando — pero gira mucho más lento.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('shrink-0 animate-spin motion-reduce:[animation-duration:2s]', className)}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-30" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
