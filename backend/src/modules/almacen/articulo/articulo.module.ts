import { Module } from '@nestjs/common';
import { ArticuloController } from './articulo.controller';
import { ArticuloService } from './articulo.service';

@Module({
  controllers: [ArticuloController],
  providers: [ArticuloService],
})
export class ArticuloModule {}
