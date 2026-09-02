import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CondicionIVA } from '../../../../../generated/prisma/enums';
import { esCuitValido } from '../validaciones/cuit';

export const createProveedorSchema = z.object({
  razon_social: z
    .string()
    .trim()
    .min(1, 'La razón social es obligatoria')
    .max(150),
  // Once dígitos sin guiones (ej. "20304050609"); el detalle del algoritmo
  // de validación vive en esCuitValido, que se testea aislada.
  cuit: z.string().trim().refine(esCuitValido, {
    message: 'El CUIT no es válido: debe tener 11 dígitos sin guiones',
  }),
  condicion_iva: z.enum(CondicionIVA),
  domicilio: z.string().trim().max(200).optional(),
  telefono: z.string().trim().max(30).optional(),
  correo: z.email().trim().max(150).optional(),
  observaciones: z.string().trim().max(500).optional(),
});

export class CreateProveedorDto extends createZodDto(createProveedorSchema) {}
