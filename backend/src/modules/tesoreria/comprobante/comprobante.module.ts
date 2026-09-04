import { Module } from '@nestjs/common';
import { ComprobanteService } from './comprobante.service';
/**
 * HU-16 — Comprobantes de proveedor. El controller y el service se agregan al
 * implementar la historia; por ahora el módulo existe solo para reservar la
 * estructura.
 */
@Module({
  controllers: [],
  providers: [ComprobanteService],
})
export class ComprobanteModule {}
