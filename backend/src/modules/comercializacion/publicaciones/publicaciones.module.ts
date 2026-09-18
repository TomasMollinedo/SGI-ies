import { Module } from '@nestjs/common';
import { PublicacionesController } from './publicaciones.controller';
import { PublicacionesService } from './publicaciones.service';

@Module({
  controllers: [PublicacionesController],
  providers: [PublicacionesService],
  // T105 (pase automático a Disponible) y la adhesión de HU-27 inyectan este
  // service para invocar `transicionarEstadoComercial` dentro de su propia
  // transacción.
  exports: [PublicacionesService],
})
export class PublicacionesModule {}
