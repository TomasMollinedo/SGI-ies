import { Module } from '@nestjs/common';
import { AlmacenamientoController } from './almacenamiento.controller';
import { AlmacenamientoService } from './almacenamiento.service';

@Module({
  controllers: [AlmacenamientoController],
  providers: [AlmacenamientoService],
  // El módulo de unidad funcional lo inyecta para subir la imagen que recibe
  // en su propio endpoint, sin pasar por este controller.
  exports: [AlmacenamientoService],
})
export class AlmacenamientoModule {}
