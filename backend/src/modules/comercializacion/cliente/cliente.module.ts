import { Module } from '@nestjs/common';
import { ClienteAuthModule } from '../cliente-auth/cliente-auth.module';
import { FormaPagoModule } from '../../tesoreria/forma-pago/forma-pago.module';
import { ClienteController } from './cliente.controller';

@Module({
  imports: [ClienteAuthModule, FormaPagoModule],
  controllers: [ClienteController],
})
export class ClienteModule {}
