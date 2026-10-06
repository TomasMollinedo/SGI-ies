import { Module } from '@nestjs/common';
import { PlazoFinanciacionModule } from '../plazo-financiacion/plazo-financiacion.module';
import { PlanEjemploController } from './plan-ejemplo.controller';
import { PlanEjemploService } from './plan-ejemplo.service';

/** HU-22 — Planes de pago de ejemplo de las unidades publicadas. */
@Module({
  // Por `PlazoFinanciacionService.findOne`: el plazo de cada plan tiene que
  // existir y estar activo.
  imports: [PlazoFinanciacionModule],
  controllers: [PlanEjemploController],
  providers: [PlanEjemploService],
})
export class PlanEjemploModule {}
