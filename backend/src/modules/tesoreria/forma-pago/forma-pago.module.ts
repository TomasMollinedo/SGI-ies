import { Module } from '@nestjs/common';
import { FormaPagoController } from './forma-pago.controller';
import { FormaPagoService } from './forma-pago.service';

/** HU-15 — Formas de pago. */
@Module({
  controllers: [FormaPagoController],
  providers: [FormaPagoService],
})
export class FormaPagoModule {}
