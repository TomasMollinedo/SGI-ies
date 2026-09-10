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
  cuit: z.string().trim().refine(esCuitValido, {
    message: 'El CUIT no es válido: debe tener 11 dígitos sin guiones',
  }),
  condicion_iva: z.enum(CondicionIVA),
  domicilio: z.string().trim().max(200).optional(),
  telefono: z.string().trim().max(30).optional(),
  correo: z.email().trim().max(150).optional(),

  // Datos bancarios, todos opcionales. Las regex de CBU y alias aceptan
  // también el string vacío (el `?` del grupo): es lo que manda la edición
  // al borrar un dato ya cargado, igual que con domicilio o teléfono. Va en
  // una sola regex y no con `.or(z.literal(''))` para que el 400 traiga este
  // mensaje y no el "Invalid input" genérico de una unión.
  banco: z.string().trim().max(100).optional().meta({
    description: 'Banco en el que el proveedor tiene la cuenta',
    example: 'Banco Macro',
  }),
  titular: z.string().trim().max(150).optional().meta({
    description: 'Titular de la cuenta bancaria, tal como figura en el banco',
    example: 'Farmacia Bermejo S.A.',
  }),
  cbu: z
    .string()
    .trim()
    .regex(
      /^(\d{22})?$/,
      'El CBU debe tener exactamente 22 dígitos, sin espacios ni guiones',
    )
    .optional()
    .meta({
      description:
        'CBU de la cuenta: exactamente 22 dígitos, sin espacios ni guiones. En la edición, un string vacío borra el CBU cargado.',
      example: '0170099220000067797151',
    }),
  alias: z
    .string()
    .trim()
    .regex(
      /^([A-Za-z0-9.-]{6,20})?$/,
      'El alias debe tener entre 6 y 20 caracteres, y solo puede tener letras, números, puntos o guiones',
    )
    .optional()
    .meta({
      description:
        'Alias de la cuenta: entre 6 y 20 caracteres, solo letras, números, puntos o guiones. En la edición, un string vacío borra el alias cargado.',
      example: 'mi.alias.banco',
    }),

  observaciones: z.string().trim().max(500).optional(),
});

export class CreateProveedorDto extends createZodDto(createProveedorSchema) {}
