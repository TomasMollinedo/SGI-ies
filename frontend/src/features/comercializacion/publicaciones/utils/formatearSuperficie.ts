/** Superficie con dos decimales máximo y separador local (el backend manda un Decimal). */
export function formatearSuperficie(valor: number): string {
  return `${Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 2 })} m²`
}
