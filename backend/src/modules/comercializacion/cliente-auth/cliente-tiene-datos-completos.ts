import type { CLIENTE } from '../../../../generated/prisma/client';

/**
 * HU-29 (declaración de pago) exige que el cliente tenga dni_cuil y teléfono
 * cargados antes de dejarlo declarar un pago. Se expone standalone, no como
 * método de ClienteAuthService, para que el módulo de Cobros/Pagos lo importe
 * directo sin depender de todo el service de autenticación.
 */
export function clienteTieneDatosCompletos(
  cliente: Pick<CLIENTE, 'dni_cuil' | 'telefono'>,
): boolean {
  return cliente.dni_cuil !== null && cliente.telefono !== null;
}
