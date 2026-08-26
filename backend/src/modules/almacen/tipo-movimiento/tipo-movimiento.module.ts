import { Module } from '@nestjs/common';
import { TipoMovimientoController } from './tipo-movimiento.controller';
import { TipoMovimientoService } from './tipo-movimiento.service';

@Module({
  controllers: [TipoMovimientoController],
  providers: [TipoMovimientoService],
})
export class TipoMovimientoModule {}
