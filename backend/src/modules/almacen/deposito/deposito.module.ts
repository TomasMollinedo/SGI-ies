import { Module } from '@nestjs/common';
import { DepositoController } from './deposito.controller';
import { DepositoService } from './deposito.service';

@Module({
  controllers: [DepositoController],
  providers: [DepositoService],
})
export class DepositoModule {}
