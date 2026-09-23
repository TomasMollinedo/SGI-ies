import { Module } from '@nestjs/common';
import { FormaPagoController } from './forma-pago.controller';
import { FormaPagoService } from './forma-pago.service';

/** HU-15 — Formas de pago. */
@Module({
  controllers: [FormaPagoController],
  providers: [FormaPagoService],
  // ClienteModule lo necesita para el catálogo de autogestión (HU-29).
  exports: [FormaPagoService],
})
export class FormaPagoModule {}
