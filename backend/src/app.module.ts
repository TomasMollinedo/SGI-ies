import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
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
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
