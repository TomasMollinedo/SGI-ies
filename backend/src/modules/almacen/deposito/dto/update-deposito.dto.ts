import { createZodDto } from 'nestjs-zod';
import { createDepositoSchema } from './create-deposito.dto';

export const updateDepositoSchema = createDepositoSchema.partial();

export class UpdateDepositoDto extends createZodDto(updateDepositoSchema) {}
