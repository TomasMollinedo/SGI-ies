import { createZodDto } from 'nestjs-zod';
import { createMarcaSchema } from './create-marca.dto';

export const updateMarcaSchema = createMarcaSchema.partial();

export class UpdateMarcaDto extends createZodDto(updateMarcaSchema) {}
