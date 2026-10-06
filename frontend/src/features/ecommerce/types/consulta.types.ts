export type EstadoConsulta = 'PENDIENTE' | 'RESPONDIDA'

/** La unidad consultada, tal como viaja embebida en la consulta. */
export interface UnidadDeConsulta {
  id_unidad_funcional: number
  identificador: string
  proyecto: { nombre: string }
}

/**
 * Una consulta propia del cliente autenticado — shape de
 * `POST /cliente/consultas` y de cada fila de `GET /cliente/consultas/mis-consultas`.
 * Sin dato de quién la respondió: eso es interno, no le compete al cliente.
 */
export interface Consulta {
  id_consulta: number
  texto: string
  estado: EstadoConsulta
  respuesta: string | null
  fecha_respuesta: string | null
  hora_creacion: string
  unidad: UnidadDeConsulta
}

/** Body de POST /cliente/consultas. */
export interface CrearConsultaPayload {
  FK_unidad_funcional: number
  texto: string
}

/** Query params de GET /cliente/consultas/mis-consultas. */
export interface MisConsultasQuery {
  page?: number
  limit?: number
}
