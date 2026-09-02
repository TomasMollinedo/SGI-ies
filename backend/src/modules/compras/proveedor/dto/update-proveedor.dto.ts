import { createZodDto } from 'nestjs-zod';
import { createProveedorSchema } from './create-proveedor.dto';

export const updateProveedorSchema = createProveedorSchema.partial();

export class UpdateProveedorDto extends createZodDto(updateProveedorSchema) {}
