/** Shape exacto de GET /api/depositos — sin transformar nombres de campo. */
export interface Deposito {
  id_deposito: number
  nombre: string
  es_obrador: boolean
  ubicacion: string | null
  descripcion: string | null
  estado: boolean
  FK_Proyecto: number | null
}

export interface FiltrosDepositos {
  nombre?: string
  estado?: boolean
  esObrador?: boolean
  page?: number
  limit?: number
}

/** Shape de crear/editar/dar de baja/reactivar: Deposito + campos de auditoría. */
export interface DepositoAuditado extends Deposito {
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
}

interface UsuarioResumen {
  nombre: string
  apellido: string
}

/** Shape de GET /depositos/{id}: DepositoAuditado + quién lo creó/modificó. */
export interface DepositoDetalle extends DepositoAuditado {
  usuarioCreador: UsuarioResumen
  usuarioActualizador: UsuarioResumen
}

export interface CrearDepositoPayload {
  nombre: string
  es_obrador: boolean
  ubicacion?: string
  descripcion?: string
  FK_Proyecto?: number
}

/** A diferencia de crear, FK_Proyecto acepta `null` explícito para quitar el proyecto asignado. */
export interface EditarDepositoPayload {
  nombre?: string
  es_obrador?: boolean
  ubicacion?: string
  descripcion?: string
  FK_Proyecto?: number | null
}
