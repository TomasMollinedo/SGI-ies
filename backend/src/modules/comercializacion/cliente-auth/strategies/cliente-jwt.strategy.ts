import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtClientePayload {
  sub: number;
  email: string;
}

export interface AuthenticatedCliente {
  id: number;
  email: string;
}

/**
 * Strategy 'jwt-cliente': valida el accessToken de CLIENTE contra
 * JWT_CLIENT_SECRET. Independiente de la strategy 'jwt' de USUARIO (distinto
 * secreto, distinto payload) — ver ClienteAuthGuard, que la consume.
 */
@Injectable()
export class ClienteJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-cliente',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_CLIENT_SECRET')!,
    });
  }

  validate(payload: JwtClientePayload): AuthenticatedCliente {
    return { id: payload.sub, email: payload.email };
  }
}
