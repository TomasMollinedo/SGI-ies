import { Module } from '@nestjs/common';
import { PagoController } from './pago.controller';
import { PagoService } from './pago.service';

@Module({
  controllers: [PagoController],
  providers: [PagoService],
  // Lo reutiliza TableroModule para calcular los egresos de cada período.
  exports: [PagoService],
})
export class PagoModule {}
