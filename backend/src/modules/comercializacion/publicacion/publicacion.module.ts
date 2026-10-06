import { Module } from '@nestjs/common';
import { PublicacionController } from './publicacion.controller';
import { PublicacionService } from './publicacion.service';

@Module({
  controllers: [PublicacionController],
  providers: [PublicacionService],
  // La venta (HU-27) y los cobros inyectan este service para invocar
  // `transicionarEstadoComercial` dentro de su propia transacción.
  exports: [PublicacionService],
})
export class PublicacionModule {}
