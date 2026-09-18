import { Module } from '@nestjs/common';
import { ClienteAuthModule } from '../cliente-auth/cliente-auth.module';
import { ClienteController } from './cliente.controller';

@Module({
  imports: [ClienteAuthModule],
  controllers: [ClienteController],
})
export class ClienteModule {}
