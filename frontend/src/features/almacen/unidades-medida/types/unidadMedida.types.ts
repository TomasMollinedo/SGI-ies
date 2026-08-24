/** Shape exacto de GET /unidades-medida — sin transformar nombres de campo. */
export interface UnidadMedida {
  id_unidad_medida: number
  nombre: string
  abreviatura: string
  estado: boolean
}

export interface FiltrosUnidadesMedida {
  nombre?: string
  estado?: boolean
  page?: number
  limit?: number
}

/** Shape de crear/editar/dar de baja/reactivar: UnidadMedida + campos de auditoría. */
export interface UnidadMedidaAuditada extends UnidadMedida {
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
}

interface UsuarioResumen {
  nombre: string
  apellido: string
}

/** Shape de GET /unidades-medida/{id}: UnidadMedidaAuditada + quién la creó/modificó. */
export interface UnidadMedidaDetalle extends UnidadMedidaAuditada {
  usuarioCreador: UsuarioResumen
  usuarioActualizador: UsuarioResumen
}

export interface CrearUnidadMedidaPayload {
  nombre: string
  abreviatura: string
}

export interface EditarUnidadMedidaPayload {
  nombre?: string
  abreviatura?: string
}
