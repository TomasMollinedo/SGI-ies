import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const completarDatosClienteSchema = z
  .object({
    // Acepta DNI (7 u 8 dígitos) o CUIT/CUIL (11 dígitos), sin guiones ni
    // puntos — mismo criterio sin separadores que PROVEEDOR.cuit.
    dni_cuil: z
      .string()
      .trim()
      .regex(
        /^(\d{7,8}|\d{11})$/,
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
    (datos) => datos.dni_cuil !== undefined || datos.telefono !== undefined,
    {
      message: 'Hay que enviar al menos dni_cuil o telefono',
    },
  );

export class CompletarDatosClienteDto extends createZodDto(
  completarDatosClienteSchema,
) {}
