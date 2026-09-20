import { Module } from '@nestjs/common';
import { PublicacionController } from './publicacion.controller';
import { PublicacionService } from './publicacion.service';

@Module({
  controllers: [PublicacionController],
  providers: [PublicacionService],
  // T105 (pase automático a Disponible) y la adhesión de HU-27 inyectan este
  // service para invocar `transicionarEstadoComercial` dentro de su propia
  // transacción.
  exports: [PublicacionService],
})
export class PublicacionModule {}
