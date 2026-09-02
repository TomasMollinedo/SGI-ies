/**
 * Condición de Prisma para "coincidencia parcial de varias palabras, sin
 * importar el orden": exige que cada palabra de `busqueda` esté contenida en
 * `campo` por separado, en vez de que la frase completa lo esté como
 * substring. Así una búsqueda como "farmacia bermejo" también encuentra
 * "Bermejo Farmacia SA".
 *
 * EXCEPCIÓN al criterio general de "recién se extrae a `common/` la segunda
 * vez que se repite" (ver CLAUDE.md): vive acá desde el primer uso
 * (Proveedor) a propósito, para que todo endpoint de listado con búsqueda de
 * texto lo use desde el principio en vez de reinventar un `contains` de la
 * frase completa.
 */
export function condicionBusquedaPorPalabras<
  Where extends Record<string, unknown>,
>(campo: string & keyof Where, busqueda: string): { AND: Where[] } {
  const tokens = busqueda.trim().split(/\s+/).filter(Boolean);

  return {
    AND: tokens.map(
      (token) =>
        ({ [campo]: { contains: token, mode: 'insensitive' } }) as Where,
    ),
  };
}
