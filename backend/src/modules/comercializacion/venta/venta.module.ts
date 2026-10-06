import { Module } from '@nestjs/common';
import { VentaController } from './venta.controller';
import { VentaClienteController } from './venta-cliente.controller';
import { VentaService } from './venta.service';
import { PublicacionModule } from '../publicacion/publicacion.module';

@Module({
  // Por `PublicacionService.transicionarEstadoComercial`: pasa la publicación
  // a EN_PLAN_DE_PAGO al vender y de vuelta a DISPONIBLE al cancelar, dentro
  // de la misma transacción de VentaService.
  imports: [PublicacionModule],
  controllers: [VentaController, VentaClienteController],
  providers: [VentaService],
})
export class VentaModule {}
