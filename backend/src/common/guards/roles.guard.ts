import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolNombre } from '../enums/rol.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../../modules/auth/strategies/jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RolNombre[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) return true; // sin @Roles(), alcanza con estar logueado

    const { user }: { user: AuthenticatedUser } = context
      .switchToHttp()
      .getRequest();
    if (user?.rol === RolNombre.GERENTE_GENERAL) return true; // acceso transversal

    return requiredRoles.includes(user?.rol);
  }
}
