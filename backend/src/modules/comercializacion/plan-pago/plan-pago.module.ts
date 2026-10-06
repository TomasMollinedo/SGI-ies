import { Module } from '@nestjs/common';
import { PlanPagoController } from './plan-pago.controller';
import { PlanPagoService } from './plan-pago.service';

@Module({
  controllers: [PlanPagoController],
  providers: [PlanPagoService],
})
export class PlanPagoModule {}
