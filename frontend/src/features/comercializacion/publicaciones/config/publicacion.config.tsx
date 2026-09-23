import { Badge } from '@/shared/components/ui/Badge'
import type { BadgeVariant } from '@/shared/components/ui/Badge'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { EstadoComercial, PublicacionListItem } from '../types/publicacion.types'

/** Resultados por página del listado. */
export const LIMITE_PAGINA = 10

/**
 * Cada estado se distingue por color Y por label: el badge siempre lleva el
 * texto, así que el color nunca es lo único que lo diferencia.
 */
export const ESTADO_COMERCIAL_META: Record<
  EstadoComercial,
  { label: string; variant: BadgeVariant }
> = {
  EN_PREPARACION: { label: 'Publicación en preparación', variant: 'warning' },
  DISPONIBLE: { label: 'Disponible', variant: 'active' },
  EN_PLAN_DE_PAGO: { label: 'En Plan de Pago', variant: 'info' },
  VENDIDA: { label: 'Vendida', variant: 'primary' },
}

export const ETIQUETA_DESPUBLICADA = 'Despublicada'

/** Deja que el badge parta línea ("Publicación en preparación" es largo) para que la tabla entre en mobile. */
export const CLASES_BADGE_MOBILE = 'whitespace-normal text-left wrap-anywhere'

/** Opciones del `<Select>` de estado comercial. `''` = todos. */
export const OPCIONES_ESTADO_COMERCIAL: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  ...(Object.entries(ESTADO_COMERCIAL_META) as [EstadoComercial, { label: string }][]).map(
    ([value, meta]) => ({ value, label: meta.label })
  ),
]

export type FiltroVigencia = 'vigentes' | 'despublicadas' | 'todas'

export const VIGENCIA_POR_DEFECTO: FiltroVigencia = 'vigentes'

export const OPCIONES_VIGENCIA: SelectOption[] = [
  { value: 'vigentes', label: 'Vigentes' },
  { value: 'despublicadas', label: 'Despublicadas' },
  { value: 'todas', label: 'Todas' },
]

export function esFiltroVigencia(valor: string): valor is FiltroVigencia {
  return valor === 'vigentes' || valor === 'despublicadas' || valor === 'todas'
}

/** `undefined` = sin filtro (el backend trae vigentes e históricas). */
export function vigenteDeFiltro(filtro: FiltroVigencia): boolean | undefined {
  if (filtro === 'vigentes') return true
  if (filtro === 'despublicadas') return false
  return undefined
}

export function esEstadoComercial(valor: string): valor is EstadoComercial {
  return valor in ESTADO_COMERCIAL_META
}

/** Solo en EN_PREPARACION o DISPONIBLE se puede despublicar (el backend vuelve a validar). */
export function puedeDespublicarse(estado: EstadoComercial): boolean {
  return estado === 'EN_PREPARACION' || estado === 'DISPONIBLE'
}

/**
 * Badge de estado de una publicación del listado. Si no está vigente muestra
 * "Despublicada": el backend no cambia `estado_comercial` al despublicar, así
 * que mostrar ese estado sería engañoso. El estado que tenía queda como dato
 * secundario (ver `estadoAnteriorTexto`).
 */
export function badgeEstadoPublicacion(
  publicacion: Pick<PublicacionListItem, 'vigente' | 'estado_comercial'>
) {
  if (!publicacion.vigente) {
    return (
      <Badge variant="inactive" className={CLASES_BADGE_MOBILE}>
        {ETIQUETA_DESPUBLICADA}
      </Badge>
    )
  }
  const meta = ESTADO_COMERCIAL_META[publicacion.estado_comercial]
  return (
    <Badge variant={meta.variant} className={CLASES_BADGE_MOBILE}>
      {meta.label}
    </Badge>
  )
}

/** Texto secundario de una publicación no vigente: el estado que tenía al despublicarse. */
export function estadoAnteriorTexto(estado: EstadoComercial): string {
  return `Estado al despublicar: ${ESTADO_COMERCIAL_META[estado].label}`
}
