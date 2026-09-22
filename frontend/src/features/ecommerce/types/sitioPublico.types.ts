import type { LucideIcon } from 'lucide-react'

/** Id de una sección de la landing: es el ancla del menú y el `id` del DOM. */
export type IdSeccion = 'inicio' | 'nosotros' | 'obras' | 'como-funciona' | 'consultanos'

/** Ítem del menú del header. Navega a un ancla de la misma página, no a una ruta. */
export interface ItemNavegacion {
  id: IdSeccion
  label: string
}

/** Una línea del título del hero. `acento` la pinta en dorado en vez de blanco. */
export interface LineaTitulo {
  texto: string
  acento: boolean
}

/** Número de la fila de trayectoria ("15 / AÑOS DE TRAYECTORIA"). */
export interface NumeroDestacado {
  valor: string
  etiqueta: string
}

/** Paso de "Cómo funciona". */
export interface PasoComoFunciona {
  titulo: string
  descripcion: string
  icono: LucideIcon
}

/**
 * Dato de contacto. `href` es el enlace real (tel:, https://wa.me/, mailto:) y
 * `valor` el texto visible; sin `href` el dato no es clickeable (dirección,
 * horario).
 */
export interface DatoContacto {
  etiqueta: string
  valor: string
  href?: string
  icono: LucideIcon
}
