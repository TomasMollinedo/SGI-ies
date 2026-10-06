import { Module } from '@nestjs/common';
import { ClienteAuthModule } from '../cliente-auth/cliente-auth.module';
import { ConsultaController } from './consulta.controller';
import { ConsultaAdminController } from './consulta-admin.controller';
import { ConsultaService } from './consulta.service';

/** HU-26 — Consultas de clientes sobre unidades publicadas. */
@Module({
  // Por ClienteAuthGuard, que usa ConsultaController: mismo import que
  // ClienteModule/DeclaracionPagoModule.
  imports: [ClienteAuthModule],
  controllers: [ConsultaController, ConsultaAdminController],
  providers: [ConsultaService],
})
export class ConsultaModule {}
