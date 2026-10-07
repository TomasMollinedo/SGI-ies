/** Porcentaje con hasta dos decimales y separador local (ej. 12.5 → "12,5 %"). */
export function formatearPorcentaje(valor: number): string {
  return `${Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 2 })} %`
}
