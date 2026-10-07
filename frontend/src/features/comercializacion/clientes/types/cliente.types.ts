import type { TipologiaUnidad } from '@/shared/types/unidadFuncional.types'
import type { EstadoVenta } from '@/features/comercializacion/ventas/types/venta.types'
import type { TipoPlanPago } from '@/features/comercializacion/planes-pago/types/planPago.types'
import type { EstadoConsulta } from '@/features/comercializacion/consultas/types/consulta.types'
import type { EstadoCobro, OrigenCobro } from '@/features/tesoreria/cobranzas/types/cobro.types'
import type { EstadoDeclaracionPago } from '@/features/tesoreria/declaraciones-pago/types/declaracionPago.types'

/**
 * Datos de contacto del cliente. Son los mismos en el listado y en la ficha
 * porque el backend los comparte en un solo schema, y es lo único que el
 * formulario de edición necesita: por eso `ClienteForm` recibe este tipo y
 * sirve igual abierto desde una fila del listado o desde la ficha.
 *
 * Los campos nullable vienen en `null` cuando nunca se cargaron: un cliente
 * que entró con Google puede no tener apellido separado del nombre, ni
 * DNI/CUIL, ni teléfono.
 */
export interface ClienteDatosContacto {
  id_cliente: number
  nombre: string
  apellido: string | null
  dni_cuil: string | null
  email: string
  telefono: string | null
  /** Derivado de `google_sub` en el backend: el cliente ya inició sesión con Google. */
  tiene_cuenta_google: boolean
}

/**
 * Fila del listado (GET /clientes).
 *
 * Los tres indicadores los calcula el backend al consultar y no están
 * almacenados: el frontend los muestra tal cual, no los deriva.
 */
export interface ClienteListItem extends ClienteDatosContacto {
  /** Solo ventas VIGENTE; las canceladas no cuentan. */
  cantidad_ventas_vigentes: number
  /** Suma del saldo pendiente de las cuotas no anuladas de sus ventas vigentes. */
  saldo_total_pendiente: number
  /** Tiene al menos una cuota vencida con saldo pendiente en una venta vigente. */
  en_mora: boolean
}

/**
 * Valor de un filtro booleano del listado, tal como lo maneja el `<Select>`.
 *
 * Son tres estados y no un checkbox porque el backend distingue tres casos:
 * `'true'` filtra por sí, `'false'` filtra por no, y `''` no manda el
 * parámetro y trae todos. Un checkbox solo podría expresar dos de los tres.
 * Mismo patrón que el `FiltroEstado` de artículos y tipos de comprobante.
 */
export type FiltroBooleano = '' | 'true' | 'false'

/**
 * Query params de GET /clientes. Los que quedan en `undefined` no se envían y
 * el backend no filtra por ellos.
 *
 * No hay `sortBy` ni `sortOrder` a propósito: el orden no es configurable, el
 * backend ordena siempre por apellido y después nombre porque así lo pide la
 * HU-33.
 */
export interface ClientesQuery {
  /** Texto libre contra nombre, apellido, DNI/CUIL o correo. */
  busqueda?: string
  /** `true` = solo con alguna venta; `false` = solo interesados sin compras. */
  conCompras?: boolean
  /** `true` = solo en mora; `false` = solo al día. */
  enMora?: boolean
  /** `id_proyecto`: clientes con alguna venta en ese proyecto. */
  FK_proyecto?: number
  page?: number
  limit?: number
}

/** Nombre y apellido del usuario interno que hizo la última modificación. */
export interface UsuarioResumen {
  nombre: string
  apellido: string
}

/** Unidad y proyecto, tal como los anida la ficha en ventas y consultas. */
export interface UnidadResumen {
  id_unidad_funcional: number
  identificador: string
}

export interface ProyectoResumen {
  id_proyecto: number
  nombre: string
}

/**
 * Sección (b) de la ficha: una venta del cliente, vigente o cancelada.
 *
 * Las condiciones salen del plan de pago de la venta. `id_venta` es el acceso
 * a su detalle, donde ya se ven el plan completo y el cronograma de cuotas: la
 * ficha enlaza, no los repite.
 */
export interface VentaFicha {
  id_venta: number
  id_plan_pago: number
  fecha_venta: string
  estado: EstadoVenta
  modalidad: TipoPlanPago
  /** Null en modalidad CONTADO: no hay cronograma. */
  cantidad_cuotas: number | null
  /** Porcentaje congelado al confirmar la venta. Null en CONTADO. */
  tasa_nominal_anual: number | null
  saldo_pendiente: number
  unidad: UnidadResumen & { tipologia: TipologiaUnidad }
  proyecto: ProyectoResumen & { codigo: string }
}

/** Sección (c): un cobro recibido, presencial o del ecommerce. */
export interface CobroFicha {
  id_cobro: number
  fecha_cobro: string
  importe_total: number
  origen: OrigenCobro
  estado: EstadoCobro
  numero_referencia: string | null
  forma_pago: { id_forma_pago: number; nombre: string }
}

/**
 * Metadatos del comprobante adjunto a una declaración. La ruta del
 * repositorio privado no viaja al frontend a propósito: el endpoint que
 * entrega el archivo es T146.
 */
export interface ComprobanteDeclaracion {
  nombre_archivo: string | null
  /** MIME: `application/pdf`, `image/jpeg` o `image/png`. */
  tipo: string | null
}

/**
 * Sección (d): una declaración de pago pendiente o rechazada. Las validadas no
 * vienen — ya figuran como cobro en la sección anterior.
 */
export interface DeclaracionFicha {
  id_declaracion_pago: number
  fecha: string
  importe: number
  estado: Extract<EstadoDeclaracionPago, 'PENDIENTE' | 'RECHAZADA'>
  numero_referencia: string | null
  motivo_rechazo: string | null
  forma_pago: { id_forma_pago: number; nombre: string }
  cuota: { id_cuota: number; numero: number }
  /** Venta de la cuota declarada, para enlazar. */
  id_venta: number
  /** Null si la declaración no tiene adjunto (las del Sprint 3 no lo tienen). */
  comprobante: ComprobanteDeclaracion | null
}

/** Sección (e): una consulta del cliente sobre una unidad publicada. */
export interface ConsultaFicha {
  id_consulta: number
  fecha: string
  texto: string
  estado: EstadoConsulta
  respuesta: string | null
  fecha_respuesta: string | null
  FK_publicacion: number
  unidad: UnidadResumen
  proyecto: ProyectoResumen
}

/**
 * Ficha completa del cliente (GET /clientes/:id), con las cinco secciones de
 * HU-33.
 *
 * No trae `saldo_total_pendiente` ni `en_mora`: esos dos indicadores son del
 * listado y los calcula el backend. No se derivan acá sumando `ventas`, porque
 * duplicar la regla de negocio en el frontend es justo lo que el proyecto
 * evita; si la ficha llegara a necesitarlos, se agregan en el backend.
 *
 * Tampoco hay `usuarioCreador`: un cliente no tiene creador, se autocrea con
 * el login de Google o nace junto con una venta. Por eso la trazabilidad se
 * muestra con `DetailRow` y no con el componente compartido `AuditInfo`, que
 * exige un `createdBy`.
 */
export interface ClienteFicha extends ClienteDatosContacto {
  /** `hora_creacion` del cliente. */
  fecha_alta: string
  hora_actualizacion: string | null
  /**
   * Null cuando la última modificación la hizo el propio cliente desde el
   * ecommerce: ahí no hay usuario interno que registrar, solo la fecha
   * (propuesta del equipo para OBS-25).
   */
  FK_usuario_actualizador: number | null
  usuarioActualizador: UsuarioResumen | null
  ventas: VentaFicha[]
  cobros: CobroFicha[]
  declaraciones: DeclaracionFicha[]
  consultas: ConsultaFicha[]
}

/**
 * Body de PATCH /clientes/:id. Todos los campos son opcionales, pero el
 * backend exige al menos uno: solo viajan los que cambiaron.
 *
 * `email` no se incluye cuando el cliente tiene cuenta de Google vinculada
 * (ver `ClienteForm`). No existe forma de vaciar un campo: el backend no
 * acepta strings vacíos, así que un campo que se borra en el formulario se
 * trata como "sin cambios".
 */
export interface EditarClientePayload {
  nombre?: string
  apellido?: string
  dni_cuil?: string
  telefono?: string
  email?: string
}
