import { Module } from '@nestjs/common';
import { TipoComprobanteController } from './tipo-comprobante.controller';
import { TipoComprobanteService } from './tipo-comprobante.service';

@Module({
  controllers: [TipoComprobanteController],
  providers: [TipoComprobanteService],
})
export class TipoComprobanteModule {}
