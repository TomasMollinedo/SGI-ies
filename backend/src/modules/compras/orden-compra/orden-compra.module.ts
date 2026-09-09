import { Module } from '@nestjs/common';
import { OrdenCompraService } from './orden-compra.service';

/**
 * HU-13 — Órdenes de compra. El controller se agrega en otra tarea (la API);
 * el service ya está.
 */
@Module({
  controllers: [],
  providers: [OrdenCompraService],
})
export class OrdenCompraModule {}
