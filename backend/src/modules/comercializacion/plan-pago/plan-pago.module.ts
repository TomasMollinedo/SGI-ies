import { Module } from '@nestjs/common';
import { PlanPagoController } from './plan-pago.controller';
import { PlanPagoService } from './plan-pago.service';
import { PublicacionModule } from '../publicacion/publicacion.module';

@Module({
  // Por `PublicacionService.transicionarEstadoComercial`: activar el primer
  // plan de una publicación la pasa a Disponible, e inactivar el último la
  // devuelve a En preparación. Ese módulo ya exporta su service para esto.
  imports: [PublicacionModule],
  controllers: [PlanPagoController],
  providers: [PlanPagoService],
})
export class PlanPagoModule {}
