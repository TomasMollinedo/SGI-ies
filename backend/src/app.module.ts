import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './config/env.schema';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MarcaModule } from './modules/almacen/marca/marca.module';
import { CategoriaModule } from './modules/almacen/categoria/categoria.module';
import { UnidadMedidaModule } from './modules/almacen/unidad-medida/unidad-medida.module';
import { DepositoModule } from './modules/almacen/deposito/deposito.module';
import { StockModule } from './modules/almacen/stock/stock.module';
import { ArticuloModule } from './modules/almacen/articulo/articulo.module';
import { TipoMovimientoModule } from './modules/almacen/tipo-movimiento/tipo-movimiento.module';
import { MovimientoModule } from './modules/almacen/movimiento/movimiento.module';
import { AlertaModule } from './modules/alerta/alerta.module';
import { OrdenCompraModule } from './modules/compras/orden-compra/orden-compra.module';
import { TipoComprobanteModule } from './modules/tesoreria/tipo-comprobante/tipo-comprobante.module';
import { FormaPagoModule } from './modules/tesoreria/forma-pago/forma-pago.module';
import { ComprobanteModule } from './modules/tesoreria/comprobante/comprobante.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Habilita los @Cron de toda la app (hoy, el escaneo de stock bajo
    // umbral de StockService). Sin esto ningún cron se activa.
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    MarcaModule,
    CategoriaModule,
    UnidadMedidaModule,
    DepositoModule,
    AuthModule,
    StockModule,
    ArticuloModule,
    TipoMovimientoModule,
    MovimientoModule,
    AlertaModule,
    OrdenCompraModule,
    TipoComprobanteModule,
    FormaPagoModule,
    ComprobanteModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
