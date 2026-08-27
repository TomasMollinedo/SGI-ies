import { Module } from '@nestjs/common';
import { MovimientoController } from './movimiento.controller';
import { MovimientoService } from './movimiento.service';

@Module({
  controllers: [MovimientoController],
  providers: [MovimientoService],
})
export class MovimientoModule {}
