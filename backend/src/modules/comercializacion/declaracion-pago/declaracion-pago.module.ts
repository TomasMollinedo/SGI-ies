import { Module } from '@nestjs/common';
import { ClienteAuthModule } from '../cliente-auth/cliente-auth.module';
import { FormaPagoModule } from '../../tesoreria/forma-pago/forma-pago.module';
import { CobroModule } from '../cobro/cobro.module';
import { DeclaracionPagoController } from './declaracion-pago.controller';
import { DeclaracionPagoAdminController } from './declaracion-pago-admin.controller';
import { DeclaracionPagoService } from './declaracion-pago.service';

/** HU-29 (Sprint 3) — Declaración de pago por autogestión del cliente. */
@Module({
  imports: [ClienteAuthModule, FormaPagoModule, CobroModule],
  controllers: [DeclaracionPagoController, DeclaracionPagoAdminController],
  providers: [DeclaracionPagoService],
})
export class DeclaracionPagoModule {}
