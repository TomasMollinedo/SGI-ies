import { SetMetadata } from '@nestjs/common';

/**
 * Análogo a @Public() (común/decorators/public.decorator.ts), pero para
 * ClienteAuthGuard en vez de para JwtAuthGuard/RolesGuard globales.
 *
 * En ClienteController, TODOS los endpoints llevan @Public() (para que los
 * guards internos, pensados para USUARIO, salgan temprano y no rechacen un
 * token de CLIENTE firmado con otro secreto). @PublicCliente() es la marca
 * aparte que decide, dentro de ese controller, cuáles de esos endpoints
 * además quedan exentos del propio ClienteAuthGuard (login, refresh) — los
 * que no la llevan (logout, me, patch) sí exigen un accessToken de CLIENTE
 * válido.
 */
export const IS_PUBLIC_CLIENTE_KEY = 'isPublicCliente';
export const PublicCliente = () => SetMetadata(IS_PUBLIC_CLIENTE_KEY, true);
