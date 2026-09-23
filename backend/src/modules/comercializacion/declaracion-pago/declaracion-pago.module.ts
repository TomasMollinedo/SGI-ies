import { Module } from '@nestjs/common';
import { ClienteAuthModule } from '../cliente-auth/cliente-auth.module';
import { FormaPagoModule } from '../../tesoreria/forma-pago/forma-pago.module';
import { DeclaracionPagoController } from './declaracion-pago.controller';
import { DeclaracionPagoService } from './declaracion-pago.service';

/** HU-29 (Sprint 3) — Declaración de pago por autogestión del cliente. */
@Module({
  imports: [ClienteAuthModule, FormaPagoModule],
  controllers: [DeclaracionPagoController],
  providers: [DeclaracionPagoService],
})
export class DeclaracionPagoModule {}
