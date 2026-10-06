export type AccionRechazoVenta = 'ELEGIR_OTRA_UNIDAD' | 'ELEGIR_OTRO_PLAN' | 'NINGUNA'

/**
 * Los 409 de `POST /ventas` son texto plano (`venta.service.ts` y
 * `transicionarEstadoComercial` en `publicacion.service.ts`), no un código —
 * se distinguen por el contenido del mensaje. Mapea cada uno a una acción
 * concreta para que el modal de confirmación pueda ofrecer "Volver a elegir
 * unidad/plan" en vez de un error genérico.
 */
export function clasificarRechazoVenta(mensaje: string): AccionRechazoVenta {
  const normalizado = mensaje.toLowerCase()

  if (
    normalizado.includes('no está disponible') ||
    normalizado.includes('ya existe una venta vigente') ||
    normalizado.includes('cambió mientras se procesaba') ||
    normalizado.includes('no está vigente')
  ) {
    return 'ELEGIR_OTRA_UNIDAD'
  }

  if (
    normalizado.includes('inactivado') ||
    normalizado.includes('no pertenece a esta publicación')
  ) {
    return 'ELEGIR_OTRO_PLAN'
  }

  return 'NINGUNA'
}
