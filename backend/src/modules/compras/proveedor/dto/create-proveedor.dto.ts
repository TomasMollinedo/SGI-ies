import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CondicionIVA } from '../../../../../generated/prisma/enums';

export const createProveedorSchema = z.object({
  razon_social: z
    .string()
    .trim()
    .min(1, 'La razón social es obligatoria')
    .max(150),
  // Solo el formato, sin dígito verificador: once dígitos sin guiones, que
  // es como se persiste en PROVEEDOR.cuit.
  cuit: z
    .string()
    .trim()
    .regex(/^\d{11}$/, 'El CUIT debe tener exactamente 11 dígitos, sin guiones')
    .meta({
      description: 'CUIT del proveedor: exactamente 11 dígitos, sin guiones',
      example: '30712345678',
    }),
  condicion_iva: z.enum(CondicionIVA),
  domicilio: z.string().trim().max(200).optional(),
  telefono: z.string().trim().max(30).optional(),
  // El string vacío pasa: es lo que manda la edición al borrar el correo
  // (mismo criterio que CBU y alias, abajo). Por eso el formato va en un
  // `refine` y no con `z.email()` directo, que rechaza '' y además valida
  // antes de aplicar el trim.
  correo: z
    .string()
    .trim()
    .max(150)
    .refine(
      (valor) => valor === '' || z.email().safeParse(valor).success,
      'El correo no es válido',
    )
    .optional()
    .meta({
      description:
        'Correo de contacto del proveedor. En la edición, un string vacío borra el correo cargado.',
      example: 'contacto@proveedor.com',
    }),

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
