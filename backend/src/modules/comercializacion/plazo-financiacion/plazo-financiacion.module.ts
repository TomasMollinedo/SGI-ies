import { Module } from '@nestjs/common';
import { PlazoFinanciacionController } from './plazo-financiacion.controller';
import { PlazoFinanciacionService } from './plazo-financiacion.service';

/** HU-32 — Plazos de financiación. */
@Module({
  controllers: [PlazoFinanciacionController],
  providers: [PlazoFinanciacionService],
  exports: [PlazoFinanciacionService],
})
export class PlazoFinanciacionModule {}
