import { Module } from '@nestjs/common';

/**
 * Módulo paraguas del dominio Compras (Proveedores, Órdenes de compra, Tipos
 * de comprobante). Va vacío por ahora: cada submódulo (`compras/proveedor/`,
 * `compras/orden-compra/`, etc.) se va a registrar acá a medida que se
 * implemente, no directo en AppModule como Almacén — esto es lo que permite
 * que el tag "Compras" de Swagger exista desde ya, sin depender de que exista
 * ningún submódulo todavía.
 */
@Module({})
export class ComprasModule {}
