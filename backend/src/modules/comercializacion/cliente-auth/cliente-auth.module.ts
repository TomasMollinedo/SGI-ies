import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClienteAuthService } from './cliente-auth.service';

@Module({
  // Sin configuración por defecto: cada firma/verificación pasa su propio
  // secret (JWT_CLIENT_SECRET / JWT_CLIENT_REFRESH_SECRET) explícitamente,
  // independiente del JwtModule que registra AuthModule para USUARIO.
  imports: [JwtModule.register({})],
  providers: [ClienteAuthService],
  exports: [ClienteAuthService],
})
export class ClienteAuthModule {}
