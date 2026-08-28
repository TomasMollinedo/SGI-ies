import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { AlertaModule } from '../../alerta/alerta.module';

@Module({
  // AlertaModule exporta AlertaService, que StockService usa en el escaneo
  // periódico de fichas bajo su umbral mínimo.
  imports: [AlertaModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
