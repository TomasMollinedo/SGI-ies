import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { DNI_CUIL_REGEX } from '../../../../common/validaciones/dni-cuil-valido';

export const completarDatosClienteSchema = z
  .object({
    // Google los completa en el primer login (given_name/family_name), pero
    // el cliente puede corregirlos después: no siempre coinciden con el
    // nombre que quiere usar frente a la constructora.
    nombre: z
      .string()
      .trim()
      .min(1, 'El nombre es obligatorio')
      .max(100)
      .optional(),
    apellido: z
      .string()
      .trim()
      .min(1, 'El apellido es obligatorio')
      .max(100)
      .optional(),
    // Mismo criterio sin separadores que PROVEEDOR.cuit.
    dni_cuil: z
      .string()
      .trim()
      .regex(
        DNI_CUIL_REGEX,
        'El DNI/CUIT debe tener 7 u 8 dígitos (DNI) u 11 dígitos (CUIT/CUIL), sin puntos ni guiones',
      )
      .optional()
      .meta({
        description:
          'DNI (7-8 dígitos) o CUIT/CUIL (11 dígitos), sin separadores',
        example: '30712345678',
      }),
    telefono: z.string().trim().min(1).max(30).optional(),
  })
  .refine(
    (datos) =>
      datos.nombre !== undefined ||
      datos.apellido !== undefined ||
      datos.dni_cuil !== undefined ||
      datos.telefono !== undefined,
    {
      message: 'Hay que enviar al menos un dato para actualizar',
    },
  );

export class CompletarDatosClienteDto extends createZodDto(
  completarDatosClienteSchema,
) {}
