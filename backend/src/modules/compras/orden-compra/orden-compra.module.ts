import { Module } from '@nestjs/common';
import { OrdenCompraController } from './orden-compra.controller';
import { OrdenCompraService } from './orden-compra.service';

/** HU-13 — Órdenes de compra. */
@Module({
  controllers: [OrdenCompraController],
  providers: [OrdenCompraService],
})
export class OrdenCompraModule {}
