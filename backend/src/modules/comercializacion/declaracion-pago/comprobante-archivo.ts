const NOMBRE_POR_DEFECTO = 'comprobante';
const MAX_LARGO_NOMBRE = 255;

/**
 * Deja el nombre original del comprobante en condiciones de guardarse y de
 * volver a mandarse en un header: sin caracteres de control ni separadores de
 * ruta, sin espacios en los bordes y de hasta 255 caracteres. No decodifica
 * nada: el nombre ya llega en UTF-8 (`defParamCharset` del `FileInterceptor`).
 */
export function normalizarNombreComprobante(nombre: string): string {
  const limpio = nombre
    .replace(/\p{Cc}/gu, '')
    .replace(/[/\\]/g, '')
    .trim();

  // Por code point, no por unidad UTF-16: cortar con `slice` podría partir un
  // emoji al medio y dejar un carácter inválido.
  const truncado = Array.from(limpio)
    .slice(0, MAX_LARGO_NOMBRE)
    .join('')
    .trim();

  return truncado || NOMBRE_POR_DEFECTO;
}

/**
 * Arma el `Content-Disposition` para ver el comprobante en el navegador.
 * Lleva el nombre dos veces: `filename` en ASCII puro (sin comillas ni
 * barras, para clientes viejos) y `filename*` con el nombre real codificado
 * según RFC 5987, que es el que usan los navegadores actuales.
 */
export function contentDispositionInline(nombre: string): string {
  const ascii =
    nombre
      .replace(/[^\x20-\x7e]/g, '_')
      .replace(/["\\/]/g, '')
      .trim() || NOMBRE_POR_DEFECTO;

  // `encodeURIComponent` deja pasar ' ( ) *, que en RFC 5987 no son válidos
  // sin escapar.
  const codificado = encodeURIComponent(nombre).replace(
    /['()*]/g,
    (caracter) => `%${caracter.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `inline; filename="${ascii}"; filename*=UTF-8''${codificado}`;
}
