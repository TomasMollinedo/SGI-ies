import { Module } from '@nestjs/common';
import { AlertaController } from './alerta.controller';
import { AlertaService } from './alerta.service';

/**
 * Módulo transversal: no pertenece a ningún dominio de negocio, sino que
 * cualquiera de ellos puede generar alertas. Por eso exporta AlertaService,
 * para que otros módulos lo inyecten y llamen a `crear()`.
 */
@Module({
  controllers: [AlertaController],
  providers: [AlertaService],
  exports: [AlertaService],
})
export class AlertaModule {}
