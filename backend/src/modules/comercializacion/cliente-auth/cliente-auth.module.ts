import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ClienteAuthService } from './cliente-auth.service';
import { ClienteJwtStrategy } from './strategies/cliente-jwt.strategy';
import { ClienteAuthGuard } from './guards/cliente-auth.guard';

@Module({
  // Sin configuración por defecto en JwtModule: cada firma/verificación pasa
  // su propio secret (JWT_CLIENT_SECRET / JWT_CLIENT_REFRESH_SECRET)
  // explícitamente, independiente del JwtModule que registra AuthModule para
  // USUARIO. PassportModule habilita la strategy 'jwt-cliente' que consume
  // ClienteAuthGuard.
  imports: [PassportModule, JwtModule.register({})],
  providers: [ClienteAuthService, ClienteJwtStrategy, ClienteAuthGuard],
  exports: [ClienteAuthService, ClienteAuthGuard],
})
export class ClienteAuthModule {}
