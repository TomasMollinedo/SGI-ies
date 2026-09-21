import { Module } from '@nestjs/common';
import { UnidadFuncionalController } from './unidad-funcional.controller';
import { UnidadFuncionalService } from './unidad-funcional.service';
import { ProyectoController } from './proyecto.controller';
import { ProyectoService } from './proyecto.service';

@Module({
  // ProyectoController/ProyectoService son provisorios (solo lectura): se
  // sacan de acá cuando exista el módulo Proyecto real.
  controllers: [UnidadFuncionalController, ProyectoController],
  providers: [UnidadFuncionalService, ProyectoService],
})
export class UnidadFuncionalModule {}