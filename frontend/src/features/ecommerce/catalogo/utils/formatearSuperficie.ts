/**
 * Superficie con dos decimales máximo y separador local (el backend manda un Decimal).
 *
 * Copia local de la utilidad de comercialización — con esto son dos usos, así
 * que es candidata a `shared/utils/` junto con `TIPOLOGIA_LABEL` y
 * `textoCondicionEntrega`; se deja local hasta acordar la promoción.
 */
export function formatearSuperficie(valor: number): string {
  return `${Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 2 })} m²`
}
