/**
 * Fila del listado (GET /clientes). Los campos nullable vienen en `null`
 * cuando nunca se cargaron: un cliente que entró con Google puede no tener
 * apellido separado del nombre, ni DNI/CUIL, ni teléfono.
 *
 * Los tres indicadores del final los calcula el backend al consultar y no
 * están almacenados: el frontend los muestra tal cual, no los deriva.
 */
export interface ClienteListItem {
  id_cliente: number
  nombre: string
  apellido: string | null
  dni_cuil: string | null
  email: string
  telefono: string | null
  /** Derivado de `google_sub` en el backend: el cliente ya inició sesión con Google. */
  tiene_cuenta_google: boolean
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
