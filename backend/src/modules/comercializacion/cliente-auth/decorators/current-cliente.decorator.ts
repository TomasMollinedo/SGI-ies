import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedCliente } from '../strategies/cliente-jwt.strategy';

/**
 * Análogo a @CurrentUser() (común/decorators/current-user.decorator.ts), pero
 * lee request.cliente en vez de request.user — ClienteAuthGuard lo deja ahí
 * (property: 'cliente' en el AuthGuard('jwt-cliente')) para no pisar ni
 * confundirse con el request.user que deja el guard interno.
 */
export const CurrentCliente = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedCliente => {
    const request = ctx.switchToHttp().getRequest<{
      cliente: AuthenticatedCliente;
    }>();
    return request.cliente;
  },
);
