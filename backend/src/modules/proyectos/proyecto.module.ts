import { Module } from '@nestjs/common';
import { ProyectoController } from './proyecto.controller';
import { ProyectoService } from './proyecto.service';
import { ProyectoFichaService } from './proyecto-ficha.service';

@Module({
  controllers: [ProyectoController],
  providers: [ProyectoService, ProyectoFichaService],
})
export class ProyectoModule {}
