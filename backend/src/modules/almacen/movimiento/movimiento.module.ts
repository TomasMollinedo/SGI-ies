import { Module } from '@nestjs/common';
import { MovimientoController } from './movimiento.controller';
import { MovimientoService } from './movimiento.service';
import { AlertaModule } from '../../alerta/alerta.module';

@Module({
  // AlertaModule exporta AlertaService, que MovimientoService usa para generar
  // las alertas de reposición al cerrar un movimiento.
  imports: [AlertaModule],
  controllers: [MovimientoController],
  providers: [MovimientoService],
})
export class MovimientoModule {}
