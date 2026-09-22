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

/**
 * Variante para el header de la landing (T109): monoespaciada en mayúsculas y
 * activo en dorado, sin pastilla de fondo. Hasta `lg` estos enlaces viven
 * dentro del panel desplegable, con un área táctil de ~45px.
 */
export const claseEnlaceNavLanding = ({ isActive }: { isActive: boolean }) =>
  cn(CLASE_BASE_NAV_LANDING, isActive ? 'text-secondary' : 'text-light hover:text-secondary')

export const CLASE_BASE_NAV_LANDING = [
  'rounded px-3 py-3 font-mono text-xs tracking-widest uppercase lg:py-1.5',
  'transition-colors focus-visible:outline-light focus-visible:outline-2 focus-visible:outline-offset-2',
].join(' ')
