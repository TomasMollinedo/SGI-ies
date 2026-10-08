import { httpClientCliente } from '@/shared/api/httpClientCliente'
import type {
  DeclaracionesPagoClienteResponse,
  DeclararPagoPayload,
  FormaPagoAutogestion,
} from '../types/declaracionPago.types'

/**
 * Cuelgan del mismo prefijo que `MIS_VENTAS_QUERY_KEYS`: son datos de las
 * compras del cliente autenticado. `DECLARACIONES_VENTA` es el prefijo de
 * todas las páginas de una venta, el que se invalida al declarar.
 */
export const DECLARACIONES_PAGO_QUERY_KEYS = {
  FORMAS_PAGO: ['mis-ventas', 'formas-pago-autogestion'] as const,
  DECLARACIONES_VENTA: (idVenta: number) => ['mis-ventas', 'declaraciones-pago', idVenta] as const,
  DECLARACIONES: (idVenta: number, page: number) =>
    ['mis-ventas', 'declaraciones-pago', idVenta, page] as const,
}

/**
 * GET /cliente/formas-pago-autogestion (T116, HU-29): formas de pago activas y
 * habilitadas para que el cliente declare un pago. Sin paginar.
 */
export async function listarFormasPagoAutogestion(
  signal?: AbortSignal
): Promise<FormaPagoAutogestion[]> {
  const { data } = await httpClientCliente.get<FormaPagoAutogestion[]>(
    '/cliente/formas-pago-autogestion',
    { signal }
  )
  return data
}

/**
 * POST /cliente/declaraciones-pago (T116, HU-29): la declaración nace
 * PENDIENTE y no toca el saldo de la cuota — eso pasa recién si Tesorería la
 * valida. Viaja como `multipart/form-data` porque lleva el comprobante (T147).
 */
export async function declararPago(payload: DeclararPagoPayload): Promise<void> {
  const formData = new FormData()
  formData.append('FK_cuota', String(payload.FK_cuota))
  formData.append('FK_forma_pago', String(payload.FK_forma_pago))
  formData.append('importe', String(payload.importe))
  if (payload.numero_referencia) {
    formData.append('numero_referencia', payload.numero_referencia)
  }
  formData.append('comprobante', payload.comprobante)

  await httpClientCliente.post('/cliente/declaraciones-pago', formData, {
    // Hace falta pisar el `application/json` por defecto de la instancia: con
    // ese header axios convertiría el FormData a JSON y el archivo se
    // perdería. El navegador lo reemplaza por el definitivo, con el boundary.
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * Ruta de `GET /cliente/declaraciones-pago/:id/comprobante` (T147): devuelve
 * el archivo binario y exige el token del cliente, así que no sirve como
 * `href` — se abre con `useAbrirArchivoProtegido`. 404 si la declaración no es
 * propia o no tiene comprobante.
 */
export function rutaComprobanteDeclaracion(idDeclaracionPago: number): string {
  return `/cliente/declaraciones-pago/${idDeclaracionPago}/comprobante`
}

/**
 * GET /cliente/ventas/:id/declaraciones-pago (T117, HU-29): todas las
 * declaraciones de esta unidad, de la más reciente a la más antigua. Mismo
 * 404 que el detalle si la venta no es propia o no está vigente.
 */
export async function listarDeclaracionesPago(
  idVenta: number,
  page: number,
  limit: number,
  signal?: AbortSignal
): Promise<DeclaracionesPagoClienteResponse> {
  const { data } = await httpClientCliente.get<DeclaracionesPagoClienteResponse>(
    `/cliente/ventas/${idVenta}/declaraciones-pago`,
    { params: { page, limit }, signal }
  )
  return data
}
