import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createDepositoSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  // true = obrador (centro de trabajo en una obra), false = depósito central.
  es_obrador: z.boolean(),
  ubicacion: z.string().trim().max(255).optional(),
  descripcion: z.string().trim().max(255).optional(),
  // Opcional: un depósito central puede no estar vinculado a ningún proyecto.
  FK_Proyecto: z.number().int().positive().optional(),
});

export class CreateDepositoDto extends createZodDto(createDepositoSchema) {}
