import { Module } from '@nestjs/common';
import { ProyectoController } from './proyecto.controller';
import { ProyectoService } from './proyecto.service';

@Module({
  controllers: [ProyectoController],
  providers: [ProyectoService],
})
export class ProyectoModule {}
