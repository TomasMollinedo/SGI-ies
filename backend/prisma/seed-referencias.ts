/**
 * Helper compartido por los seeds de prueba. No es un seed: no se ejecuta
 * solo.
 *
 * Números de referencia con el formato que carga un usuario real, en vez de
 * etiquetas tipo `TRF-2B-1` que delatan que el dato es inventado. Son
 * deterministas (salen de una semilla de texto), así que una segunda corrida
 * del seed genera exactamente los mismos y los que se usan para no duplicar
 * registros siguen funcionando.
 */

/** Hash FNV-1a de 32 bits: chico, sin dependencias y estable entre corridas. */
function hash(texto: string): number {
  let valor = 0x811c9dc5;
  for (const caracter of texto) {
    valor ^= caracter.codePointAt(0)!;
    valor = Math.imul(valor, 0x01000193) >>> 0;
  }
  return valor;
}

/** Número de operación bancaria de 12 dígitos (transferencias). */
export function numeroOperacion(semilla: string): string {
  const alto = hash(`${semilla}#1`) % 1_000_000;
  const bajo = hash(`${semilla}#2`) % 1_000_000;
  return `${String(alto).padStart(6, '0')}${String(bajo).padStart(6, '0')}`;
}

/** Número de recibo con punto de venta: `0003-00000850`. */
export function numeroRecibo(puntoDeVenta: number, numero: number): string {
  return `${String(puntoDeVenta).padStart(4, '0')}-${String(numero).padStart(8, '0')}`;
}
