import { Module } from '@nestjs/common';
import { VentaController } from './venta.controller';
import { VentaClienteController } from './venta-cliente.controller';
import { VentaService } from './venta.service';
import { VentaSimulacionService } from './venta-simulacion.service';
import { PublicacionModule } from '../publicacion/publicacion.module';
import { PlazoFinanciacionModule } from '../plazo-financiacion/plazo-financiacion.module';

@Module({
  imports: [
    // Por `PublicacionService.transicionarEstadoComercial`: pasa la
    // publicación a EN_PLAN_DE_PAGO al vender y de vuelta a DISPONIBLE al
    // cancelar, dentro de la misma transacción de VentaService.
    PublicacionModule,
    // Por `PlazoFinanciacionService`: la simulación lee el plazo elegido y su
    // TNA vigente.
    PlazoFinanciacionModule,
  ],
  controllers: [VentaController, VentaClienteController],
  providers: [VentaService, VentaSimulacionService],
})
export class VentaModule {}
