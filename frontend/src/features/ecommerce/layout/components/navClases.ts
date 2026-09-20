import { cn } from '@/shared/utils/cn'

/**
 * Mismo estilo que los ítems del Sidebar del panel interno (activo en
 * `secondary`, hover translúcido). El padding vertical es mayor en el menú
 * móvil para que el área táctil llegue a ~44px.
 */
export const claseEnlaceNav = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded px-3 py-2.5 text-xs md:py-1.5',
    isActive ? 'bg-secondary text-content' : 'text-light hover:bg-light/10'
  )
