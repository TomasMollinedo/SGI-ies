import { createZodDto } from 'nestjs-zod';
import { createUnidadMedidaSchema } from './create-unidad-medida.dto';

export const updateUnidadMedidaSchema = createUnidadMedidaSchema.partial();

export class UpdateUnidadMedidaDto extends createZodDto(
  updateUnidadMedidaSchema,
) {}
