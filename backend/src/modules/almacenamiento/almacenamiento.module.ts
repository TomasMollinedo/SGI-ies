import { Module } from '@nestjs/common';
import { AlmacenamientoController } from './almacenamiento.controller';
import { AlmacenamientoService } from './almacenamiento.service';

@Module({
  controllers: [AlmacenamientoController],
  providers: [AlmacenamientoService],
})
export class AlmacenamientoModule {}
