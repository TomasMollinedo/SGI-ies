import type { ProyectoFormOutput, ProyectoFormValues } from '../types/proyecto.schema'
import type {
  CrearProyectoPayload,
  EditarProyectoPayload,
  ProyectoDetalle,
} from '../types/proyecto.types'

/**
 * La parte de fecha (`YYYY-MM-DD`) de lo que devuelve el backend, tal cual,
 * sin pasar por un `Date`: es lo que espera un `<input type="date">`. Una
 * fecha del proyecto puede estar guardada como medianoche de Argentina (lo
 * que graba la API) o como medianoche UTC (los seeds); el corte de string da
 * el día correcto en los dos casos, una conversión de zona horaria no.
 */
function soloFecha(fechaIso: string | null): string {
  return fechaIso?.slice(0, 10) ?? ''
}

export function valoresInicialesProyecto(): ProyectoFormValues {
  return {
    nombre: '',
    direccion: '',
    localidad: '',
    cantidad_unidades_planificadas: undefined as unknown as number,
    descripcion: '',
    fecha_inicio: '',
    fecha_fin_estimada: '',
    imagen_portada_url: '',
  }
}

export function valoresDesdeProyecto(proyecto: ProyectoDetalle): ProyectoFormValues {
  return {
    nombre: proyecto.nombre,
    direccion: proyecto.direccion,
    localidad: proyecto.localidad,
    cantidad_unidades_planificadas: proyecto.cantidad_unidades_planificadas,
    descripcion: proyecto.descripcion ?? '',
    fecha_inicio: soloFecha(proyecto.fecha_inicio),
    fecha_fin_estimada: soloFecha(proyecto.fecha_fin_estimada),
    imagen_portada_url: proyecto.imagen_portada_url ?? '',
  }
}

/** Body del alta: los opcionales vacíos se omiten (el backend los deja en null). */
export function armarPayloadAlta(valores: ProyectoFormOutput): CrearProyectoPayload {
  return {
    nombre: valores.nombre,
    direccion: valores.direccion,
    localidad: valores.localidad,
    cantidad_unidades_planificadas: valores.cantidad_unidades_planificadas,
    ...(valores.descripcion ? { descripcion: valores.descripcion } : {}),
    ...(valores.fecha_inicio ? { fecha_inicio: valores.fecha_inicio } : {}),
    ...(valores.fecha_fin_estimada ? { fecha_fin_estimada: valores.fecha_fin_estimada } : {}),
    ...(valores.imagen_portada_url ? { imagen_portada_url: valores.imagen_portada_url } : {}),
  }
}

/**
 * Body de la edición: solo lo que cambió respecto del proyecto guardado. En
 * los opcionales, vaciar el campo manda `null`, que es lo que borra el valor.
 */
export function armarPayloadEdicion(
  valores: ProyectoFormOutput,
  original: ProyectoDetalle
): EditarProyectoPayload {
  const cambios: EditarProyectoPayload = {}

  if (valores.nombre !== original.nombre) cambios.nombre = valores.nombre
  if (valores.direccion !== original.direccion) cambios.direccion = valores.direccion
  if (valores.localidad !== original.localidad) cambios.localidad = valores.localidad
  if (valores.cantidad_unidades_planificadas !== original.cantidad_unidades_planificadas) {
    cambios.cantidad_unidades_planificadas = valores.cantidad_unidades_planificadas
  }

  // La descripción vacía va como `null`, nunca como `''`: el backend exige al
  // menos un caracter y respondería 400.
  if (valores.descripcion !== (original.descripcion ?? '')) {
    cambios.descripcion = valores.descripcion || null
  }
  if (valores.imagen_portada_url !== (original.imagen_portada_url ?? '')) {
    cambios.imagen_portada_url = valores.imagen_portada_url || null
  }

  Object.assign(cambios, fechasModificadas(valores, original))

  return cambios
}

/**
 * Las fechas se comparan y se mandan por día (`YYYY-MM-DD`).
 *
 * - Si no cambió ninguna de las dos, no viaja ninguna.
 * - La que cambió viaja con su valor nuevo, o `null` si se vació.
 * - Si cambió alguna y el formulario tiene las dos, viajan las dos: el backend
 *   ancla cada fecha que recibe a la medianoche de Argentina, pero una fecha
 *   del seed está guardada a la medianoche UTC (3 horas antes). Mandando una
 *   sola, dos fechas del mismo día quedarían cruzadas por esas 3 horas y la
 *   edición se rechazaría con un 400.
 * - Excepción: con el proyecto Finalizado la fecha de fin no viaja nunca. Ya
 *   no se puede cambiar, y reenviarla anclada a otro instante cuenta como un
 *   cambio para el backend (409).
 */
function fechasModificadas(
  valores: ProyectoFormOutput,
  original: ProyectoDetalle
): Pick<EditarProyectoPayload, 'fecha_inicio' | 'fecha_fin_estimada'> {
  const esFinalizado = original.estado_obra === 'FINALIZADO'
  const inicio = valores.fecha_inicio
  const fin = valores.fecha_fin_estimada

  const cambioInicio = inicio !== soloFecha(original.fecha_inicio)
  const cambioFin = !esFinalizado && fin !== soloFecha(original.fecha_fin_estimada)

  if (!cambioInicio && !cambioFin) return {}

  const mandarLasDos = inicio !== '' && fin !== ''
  const fechas: Pick<EditarProyectoPayload, 'fecha_inicio' | 'fecha_fin_estimada'> = {}

  if (cambioInicio || mandarLasDos) fechas.fecha_inicio = inicio || null
  if (cambioFin || (mandarLasDos && !esFinalizado)) fechas.fecha_fin_estimada = fin || null

  return fechas
}
