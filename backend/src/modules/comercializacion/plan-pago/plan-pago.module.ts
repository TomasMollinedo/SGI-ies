import { Module } from '@nestjs/common';
import { PlanPagoController } from './plan-pago.controller';
import { PlanPagoService } from './plan-pago.service';
import { PublicacionesModule } from '../publicaciones/publicaciones.module';

@Module({
  // Por `PublicacionesService.transicionarEstadoComercial`: activar el primer
  // plan de una publicación la pasa a Disponible, e inactivar el último la
  // devuelve a En preparación. Ese módulo ya exporta su service para esto.
  imports: [PublicacionesModule],
  controllers: [PlanPagoController],
  providers: [PlanPagoService],
})
export class PlanPagoModule {}
