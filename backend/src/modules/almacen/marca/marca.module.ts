import { Module } from '@nestjs/common';
import { MarcaController } from './marca.controller';
import { MarcaService } from './marca.service';

@Module({
  controllers: [MarcaController],
  providers: [MarcaService],
})
export class MarcaModule {}
