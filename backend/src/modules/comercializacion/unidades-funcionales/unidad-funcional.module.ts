import { Module } from '@nestjs/common';
import { UnidadFuncionalController } from './unidad-funcional.controller';
import { UnidadFuncionalService } from './unidad-funcional.service';

@Module({
  controllers: [UnidadFuncionalController],
  providers: [UnidadFuncionalService],
})
export class UnidadFuncionalModule {}
