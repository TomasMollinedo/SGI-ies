/** Tipo de alerta (GET /alertas/tipos). Lista chica y estable, pensada para poblar un filtro. */
export interface TipoAlerta {
  id_tipo_alerta: number
  nombre: string
  descripcion: string
}

/** Tipo de alerta embebido en una alerta: mismo shape que `TipoAlerta`, sin el id. */
interface TipoAlertaResumen {
  nombre: string
  descripcion: string
}

interface RolResumen {
  nombre: string
}

interface UsuarioAtencionResumen {
  nombre: string
  apellido: string
}

/**
 * Alerta (GET /alertas, GET /alertas/{id}, PATCH /alertas/{id}/atender): las
 * tres devuelven el mismo shape.
 *
 * `datos` queda sin tipar: por tipo de alerta trae una forma distinta (hoy solo
 * existe `REPOSICION`) y `mensaje` ya alcanza para mostrar la alerta sin
 * interpretarlo — es el fallback pensado para tipos que el frontend no maneja.
 */
export interface Alerta {
  id_alerta: number
  tipoAlerta: TipoAlertaResumen
  mensaje: string
  datos: unknown
  rolDestinatario: RolResumen
  atendida: boolean
  usuarioAtencion: UsuarioAtencionResumen | null
  fecha_atencion: string | null
  hora_creacion: string
}

/** Query params de GET /alertas. Los que van `undefined` no se envían. */
export interface FiltrosAlertas {
  tipoAlertaId?: number
  atendida?: boolean
  fechaDesde?: string
  fechaHasta?: string
  page?: number
  limit?: number
}
