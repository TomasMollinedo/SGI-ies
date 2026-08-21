import { createZodDto } from 'nestjs-zod';
import { createCategoriaSchema } from './create-categoria.dto';

export const updateCategoriaSchema = createCategoriaSchema.partial();

export class UpdateCategoriaDto extends createZodDto(updateCategoriaSchema) {}
