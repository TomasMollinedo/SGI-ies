export type AccionRechazoVenta = 'ELEGIR_OTRA_UNIDAD' | 'NINGUNA'

/**
 * Los 409/404 de `POST /ventas` son texto plano (`venta.service.ts` y
 * `venta-simulacion.service.ts`), no un código — se distinguen por el
 * contenido del mensaje. El cambio de precio o de TNA no pasa por acá: ese
 * 409 trae la simulación recalculada en `datos.simulacion` y se maneja aparte
 * (ver `simulacionDelError`). Esto es para el resto: si la unidad dejó de
 * estar disponible, no tiene sentido mostrar una simulación corregida — hay
 * que elegir otra.
 */
export function clasificarRechazoVenta(mensaje: string): AccionRechazoVenta {
  const normalizado = mensaje.toLowerCase()

  if (
    normalizado.includes('no está disponible') ||
    normalizado.includes('no existe una publicación vigente') ||
    normalizado.includes('ya existe una venta vigente')
  ) {
    return 'ELEGIR_OTRA_UNIDAD'
  }

  return 'NINGUNA'
}
