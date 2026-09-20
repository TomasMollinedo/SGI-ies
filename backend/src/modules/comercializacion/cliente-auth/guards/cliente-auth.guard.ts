import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_CLIENTE_KEY } from '../decorators/public-cliente.decorator';

/**
 * Análogo a JwtAuthGuard (común/guards/jwt-auth.guard.ts), pero sobre la
 * strategy 'jwt-cliente' y la metadata @PublicCliente() en vez de @Public().
 *
 * No es un APP_GUARD global (a diferencia de JwtAuthGuard/RolesGuard): se
 * aplica explícito con @UseGuards(ClienteAuthGuard) a nivel de
 * ClienteController, porque solo ese controller necesita validar tokens de
 * CLIENTE. `property: 'cliente'` hace que el resultado de validate() quede en
 * request.cliente en vez de en request.user (ver @CurrentCliente()).
 */
@Injectable()
export class ClienteAuthGuard extends AuthGuard('jwt-cliente') {
  constructor(private reflector: Reflector) {
    super({ property: 'cliente' });
  }

  canActivate(context: ExecutionContext) {
    const esPublicoParaCliente = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_CLIENTE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (esPublicoParaCliente) return true;
    return super.canActivate(context);
  }
}
