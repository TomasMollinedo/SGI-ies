import { Module } from '@nestjs/common';

/**
 * Módulo paraguas del dominio Tesorería (Formas de pago, Comprobantes de
 * proveedor, Órdenes de pago). Va vacío por ahora: cada submódulo
 * (`tesoreria/forma-pago/`, `tesoreria/orden-pago/`, etc.) se va a registrar
 * acá a medida que se implemente, no directo en AppModule como Almacén —
 * esto es lo que permite que el tag "Tesorería" de Swagger exista desde ya,
 * sin depender de que exista ningún submódulo todavía.
 */
@Module({})
export class TesoreriaModule {}
