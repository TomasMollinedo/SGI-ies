import { Module } from '@nestjs/common';
import { ClienteAuthModule } from '../cliente-auth/cliente-auth.module';
import { FormaPagoModule } from '../../tesoreria/forma-pago/forma-pago.module';
import { ClienteController } from './cliente.controller';
import { ClienteAdminController } from './cliente-admin.controller';
import { ClienteAdminService } from './cliente-admin.service';

/**
 * Dos controllers con el mismo dominio y distinto mecanismo de auth, igual
 * que `ConsultaModule`: `ClienteController` es el del cliente del ecommerce
 * (`@Public()` + `ClienteAuthGuard`) y `ClienteAdminController` el panel
 * interno de Comercialización (HU-33), con los guards globales de USUARIO.
 */
@Module({
  imports: [ClienteAuthModule, FormaPagoModule],
  controllers: [ClienteController, ClienteAdminController],
  providers: [ClienteAdminService],
})
export class ClienteModule {}
