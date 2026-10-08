/**
 * Los `Decimal` del backend (TNA y tasa mensual) viajan como string: es lo que
 * serializa `Prisma.Decimal`. Solo se pasan a número para mostrarlos o para
 * la tasa mensual en vivo del formulario.
 */

/** Fila del listado (GET /plazos-financiacion). No trae auditoría: eso es del detalle. */
export interface PlazoFinanciacion {
  id_plazo_financiacion: number
  /** Lo genera el sistema en el alta (PLZ-001, PLZ-002...). */
  codigo: string
  cantidad_cuotas: number
  /** Porcentaje con dos decimales, ej. "18.50". */
  tasa_nominal_anual: string
  /** TNA ÷ 12 con cuatro decimales, ej. "1.5417". Dato derivado: no se guarda. */
  tasa_mensual: string
  descripcion: string | null
  estado: boolean
}

/** Nombre y apellido de quien creó o modificó un plazo. */
export interface UsuarioResumen {
  nombre: string
  apellido: string
}

/**
 * Shape de crear/editar/dar de baja/reactivar: la fila sin la tasa mensual
 * (esas respuestas no la calculan) y con los campos de auditoría.
 */
export interface PlazoFinanciacionAuditado extends Omit<PlazoFinanciacion, 'tasa_mensual'> {
  hora_creacion: string
  hora_actualizacion: string | null
  FK_usuario_creador: number
  FK_usuario_actualizador: number
}

/** Respuesta de GET /plazos-financiacion/:id: la fila con su auditoría y quién la hizo. */
export interface PlazoFinanciacionDetalle extends PlazoFinanciacionAuditado {
  tasa_mensual: string
  usuarioCreador: UsuarioResumen
  usuarioActualizador: UsuarioResumen
}

/** Body de POST /plazos-financiacion. La cantidad de cuotas solo se define acá. */
export interface CrearPlazoFinanciacionPayload {
  cantidad_cuotas: number
  tasa_nominal_anual: number
  descripcion?: string
}

/**
 * Body de PATCH /plazos-financiacion/:id. A propósito no se deriva del de
 * alta: `cantidad_cuotas: never` hace que el compilador rechace mandarla —
 * incluso con un spread—, porque queda bloqueada desde el alta.
 */
export interface EditarPlazoFinanciacionPayload {
  tasa_nominal_anual?: number
  descripcion?: string
  cantidad_cuotas?: never
}

/**
 * Valor del filtro de estado. No hay opción "sin filtro": omitir el parámetro
 * trae solo los activos, así que para ver todos hay que mandar `'todos'`.
 */
export type FiltroEstado = 'true' | 'false' | 'todos'

/** Query params de GET /plazos-financiacion. Los que van `undefined` no se envían. */
export interface PlazosFinanciacionQuery {
  estado?: FiltroEstado
  page?: number
  limit?: number
}

/** Cómo opera el formulario: lo decide quien lo abre (HU-32). */
export type ModoFormulario = 'insercion' | 'edicion' | 'lectura'

/**
 * Ítem del catálogo de plazos activos (GET /plazos-financiacion/catalogo),
 * para las tablas emergentes de la venta y de los planes de ejemplo (HU-27 /
 * HU-22). `id` es el `id_plazo_financiacion` como string (lo que acepta
 * cualquier `<select>`); `code`, "N cuotas".
 */
export interface PlazoFinanciacionCatalogoItem {
  id: string
  code: string
  metadata: {
    codigo: string
    cantidad_cuotas: number
    /** Porcentaje con dos decimales, ej. "18.50". */
    tasa_nominal_anual: string
    /** TNA ÷ 12 con cuatro decimales, ej. "1.5417". */
    tasa_mensual: string
  }
}
