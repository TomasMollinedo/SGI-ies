/**
 * Superficie con dos decimales máximo y separador local (el backend manda un Decimal).
 *
 * Antes vivía en `catalogo/utils/`; se subió a este nivel (T112) al pasar a
 * usarse también desde `ecommerce/components/FichaUnidad.tsx`, compartido con
 * `mis-compras`. Sigue existiendo una copia en
 * `comercializacion/publicaciones/utils/` (panel interno, otro diseño): esa
 * no se toca acá, es el mismo criterio de "backend y frontend, dos universos
 * separados" aplicado entre el panel interno y el sitio público.
 */
export function formatearSuperficie(valor: number): string {
  return `${Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 2 })} m²`
}
