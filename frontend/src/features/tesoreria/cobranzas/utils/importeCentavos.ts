/**
 * Comparaciones de importes en centavos enteros. Sumar y comparar floats
 * directo falla con decimales (0.1 + 0.2 !== 0.3), y un cobro que no cierra
 * por un centavo fantasma es un error de plata: toda comparación de la suma
 * contra el total, o de un importe contra el saldo, pasa por acá.
 */

export function aCentavos(importe: number): number {
  return Math.round(importe * 100)
}

/** Suma exacta de importes (en pesos), acumulada en centavos. */
export function sumarImportes(importes: number[]): number {
  return importes.reduce((acumulado, importe) => acumulado + aCentavos(importe), 0) / 100
}

export function importesIguales(a: number, b: number): boolean {
  return aCentavos(a) === aCentavos(b)
}

export function importeSupera(importe: number, limite: number): boolean {
  return aCentavos(importe) > aCentavos(limite)
}

/** `true` si el texto es un importe con hasta dos decimales (ej. "1500", "1500.5", "1500.50"). */
export function tieneFormatoImporte(texto: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(texto.trim())
}
