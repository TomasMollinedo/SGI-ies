export type EstadoConsulta = 'PENDIENTE' | 'RESPONDIDA'

/** Valor del filtro de estado: `''` = todos, sin mandar el parámetro. */
export type FiltroEstadoConsulta = EstadoConsulta | ''

export interface UnidadDeConsulta {
  id_unidad_funcional: number
  identificador: string
  proyecto: { nombre: string }
}

export interface ClienteDeConsulta {
  id_cliente: number
  nombre: string
  apellido: string | null
  email: string
}

/** Fila de la cola interna (GET /consultas): la consulta completa, con el cliente que la hizo. */
export interface ConsultaInterna {
  id_consulta: number
  texto: string
  estado: EstadoConsulta
  respuesta: string | null
  fecha_respuesta: string | null
  hora_creacion: string
  unidad: UnidadDeConsulta
  cliente: ClienteDeConsulta
}

/**
 * Query params de GET /consultas. Los que van `undefined` no se envían.
 *
 * `identificador` es independiente de `FK_proyecto`: busca por coincidencia
 * parcial del identificador de la unidad sin importar el proyecto (puede
 * traer resultados de proyectos distintos si no se combina con `FK_proyecto`).
 */
export interface ConsultasQuery {
  FK_proyecto?: number
  identificador?: string
  FK_cliente?: number
  estado?: EstadoConsulta
  fechaDesde?: string
  fechaHasta?: string
  page?: number
  limit?: number
}

/** Body de PATCH /consultas/:id/responder. */
export interface ResponderConsultaPayload {
  respuesta: string
}
