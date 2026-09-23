import { Module } from '@nestjs/common';
import { CobroController } from './cobro.controller';
import { CobroService } from './cobro.service';
import { PublicacionModule } from '../publicacion/publicacion.module';

@Module({
  // Por `PublicacionService.transicionarEstadoComercial`: soy dueño de las
  // dos transiciones EN_PLAN_DE_PAGO<->VENDIDA (saldo cero / anulación que
  // reabre saldo), dentro de la misma transacción de CobroService.
  imports: [PublicacionModule],
  controllers: [CobroController],
  providers: [CobroService],
  // DeclaracionPagoModule lo necesita para reusar crearInterno (HU-29).
  exports: [CobroService],
})
export class CobroModule {}
