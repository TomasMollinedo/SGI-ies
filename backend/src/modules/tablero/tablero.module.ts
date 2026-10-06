import { Module } from '@nestjs/common';
import { PagoModule } from '../tesoreria/pago/pago.module';
import { TableroController } from './tablero.controller';
import { TableroService } from './tablero.service';

@Module({
  imports: [PagoModule],
  controllers: [TableroController],
  providers: [TableroService],
})
export class TableroModule {}
