/** La primera fila del extracto es sintética cuando se manda `fechaDesde`. */
export type ClaseMovimientoCardex = 'APERTURA' | 'COMPROBANTE' | 'PAGO'

/** Lo único que acepta el filtro `clase`: la apertura no se pide, se genera sola. */
export type ClaseFiltroCardex = 'COMPROBANTE' | 'PAGO'

/** Cabecera del extracto: a qué proveedor corresponde. */
export interface ProveedorResumenCardex {
  id_proveedor: number
  razon_social: string
  cuit: string
}

/**
 * Una línea del extracto. `saldo_acumulado` siempre refleja el saldo real
 * (comprobantes + pagos), sin importar qué filtra `clase` — por eso, sin
 * filtros, el de la última fila coincide con el `saldo` de GET /cuentas-corrientes.
 */
export interface MovimientoCuentaCorriente {
  clase: ClaseMovimientoCardex
  id_referencia: number
  fecha: string
  tipo: string
  letra: string
  punto_de_venta: number
  numero: number
  fecha_vencimiento: string | null
  debe: number
  haber: number
  saldo_acumulado: number
}

/** Respuesta de GET /cuentas-corrientes/:id/movimientos. No pagina: es el extracto completo del período. */
export interface CardexCuentaCorrienteResponse {
  proveedor: ProveedorResumenCardex
  movimientos: MovimientoCuentaCorriente[]
}

/**
 * Query params de GET /cuentas-corrientes/:id/movimientos. Filtran por
 * `fecha`, no por `fecha_vencimiento`.
 */
export interface FiltrosCardexCuentaCorriente {
  fechaDesde?: string
  fechaHasta?: string
  clase?: ClaseFiltroCardex
}
