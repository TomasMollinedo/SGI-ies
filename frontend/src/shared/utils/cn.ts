import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina clases condicionales (clsx) y resuelve conflictos entre utilidades
 * de Tailwind (tailwind-merge), para que el `className` que llega desde afuera
 * pueda pisar los estilos internos de un componente.
 */
export function cn(...clases: ClassValue[]) {
  return twMerge(clsx(clases))
}
