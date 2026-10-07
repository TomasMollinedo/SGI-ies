import { ESTADO_PROYECTO_LABEL } from '../config/proyecto.config'
import type { EstadoObraDestino, ProyectoResumen } from '../types/proyecto.types'

/**
 * Las reglas de HU-31 que el front anticipa para no ofrecer acciones que el
 * backend va a rechazar. No reemplazan su validación (`ProyectoService`): si
 * el proyecto cambió mientras tanto, el 409 se muestra igual.
 */

type DatosDeReglas = Pick<ProyectoResumen, 'estado' | 'estado_obra' | 'unidades_cargadas'>

/** Ni la edición ni las imágenes se permiten sobre un proyecto dado de baja o Cancelado. */
export function esProyectoModificable(proyecto: Pick<DatosDeReglas, 'estado' | 'estado_obra'>) {
  return proyecto.estado && proyecto.estado_obra !== 'CANCELADO'
}

/**
 * El único avance posible desde cada estado de obra: no hay saltos ni
 * retrocesos. `null` si no hay siguiente (Finalizado, Cancelado) o si el
 * proyecto está dado de baja.
 */
export function siguienteEstadoObra(
  proyecto: Pick<DatosDeReglas, 'estado' | 'estado_obra'>
): EstadoObraDestino | null {
  if (!proyecto.estado) return null
  if (proyecto.estado_obra === 'EN_PLANIFICACION') return 'EN_EJECUCION'
  if (proyecto.estado_obra === 'EN_EJECUCION') return 'FINALIZADO'
  return null
}

/** Por qué no se puede avanzar al estado siguiente, o `null` si se puede. */
export function motivoNoSePuedeAvanzar(proyecto: DatosDeReglas): string | null {
  if (siguienteEstadoObra(proyecto) === 'EN_EJECUCION' && proyecto.unidades_cargadas === 0) {
    return 'el proyecto necesita al menos una unidad funcional activa cargada.'
  }
  return null
}

/**
 * Por qué no se puede dar de baja un proyecto ACTIVO, o `null` si se puede.
 * La baja solo se permite En planificación y sin unidades activas.
 */
export function motivoNoSePuedeDarDeBaja(proyecto: DatosDeReglas): string | null {
  if (proyecto.estado_obra !== 'EN_PLANIFICACION') {
    return `Solo se puede dar de baja un proyecto En planificación; este está ${ESTADO_PROYECTO_LABEL[proyecto.estado_obra]}.`
  }
  if (proyecto.unidades_cargadas > 0) {
    const cantidad = proyecto.unidades_cargadas
    return `Tiene ${cantidad} ${cantidad === 1 ? 'unidad funcional activa' : 'unidades funcionales activas'}: primero hay que darlas de baja.`
  }
  return null
}
