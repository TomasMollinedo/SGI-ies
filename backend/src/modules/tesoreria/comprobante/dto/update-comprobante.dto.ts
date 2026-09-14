import { createZodDto } from 'nestjs-zod';
import { createComprobanteSchema } from './create-comprobante.dto';

// Mismo shape que la creación, todo opcional. El service es quien restringe
// la edición a comprobantes en estado BORRADOR — acá no se puede expresar esa
// regla porque depende del estado actual en la base.
export const updateComprobanteSchema = createComprobanteSchema.partial();

export class UpdateComprobanteDto extends createZodDto(
  updateComprobanteSchema,
) {}
