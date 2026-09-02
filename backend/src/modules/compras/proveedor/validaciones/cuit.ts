/**
 * Multiplicadores del algoritmo de dígito verificador de CUIT/CUIL (módulo
 * 11), uno por cada uno de los primeros diez dígitos.
 */
const MULTIPLICADORES = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/**
 * Valida un CUIT: once dígitos numéricos (sin guiones, es el formato que
 * persiste `PROVEEDOR.cuit`) y dígito verificador correcto según el
 * algoritmo de AFIP (módulo 11 sobre los primeros diez dígitos).
 *
 * Función pura para poder testearla aislada del resto del módulo.
 */
export function esCuitValido(cuit: string): boolean {
  if (!/^\d{11}$/.test(cuit)) return false;

  const digitos = cuit.split('').map(Number);

  const suma = MULTIPLICADORES.reduce(
    (acumulado, multiplicador, i) => acumulado + multiplicador * digitos[i],
    0,
  );

  const resto = suma % 11;
  const verificador = resto === 0 ? 0 : 11 - resto;

  // Un resto de 1 da dígito verificador 10, que no es válido: ningún CUIT
  // real puede tenerlo.
  return verificador !== 10 && verificador === digitos[10];
}
