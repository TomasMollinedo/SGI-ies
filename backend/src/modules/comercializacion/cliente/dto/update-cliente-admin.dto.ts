import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { DNI_CUIL_REGEX } from '../../../../common/validaciones/dni-cuil-valido';

/**
 * Modo EDICIÓN de la ficha (HU-33). Solo los datos que la HU habilita:
 * nombre, apellido, DNI/CUIL, teléfono y correo.
 *
 * `FK_usuario_actualizador` NO viaja acá a propósito (ver CLAUDE.md,
 * Auditoría): lo pone el service con el id del usuario autenticado. Si
 * viajara en el body, cualquier cliente podría falsificar quién hizo el
 * cambio.
 *
 * El `email` se acepta en el DTO pero el service lo rechaza si el cliente
 * tiene cuenta de Google vinculada: eso depende del estado del cliente, no
 * de la forma del body, así que no es una validación que Zod pueda hacer.
 */
export const updateClienteAdminSchema = z
  .object({
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
    // Mismo criterio sin separadores que `completarDatosClienteSchema` y
    // `PROVEEDOR.cuit`: una sola fuente de verdad del formato.
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
          'DNI (7-8 dígitos) o CUIT/CUIL (11 dígitos), sin separadores. No puede repetirse entre clientes',
        example: '30712345678',
      }),
    telefono: z.string().trim().min(1).max(30).optional().meta({
      description: 'Solo dígitos, sin espacios, guiones ni "+"',
      example: '3875551234',
    }),
    // Se normaliza ANTES de validar: `z.email()` corre primero y rechazaría
    // un correo con espacios al costado antes de que `.trim()` los saque.
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email('El correo no tiene un formato válido'))
      .optional()
      .meta({
        description:
          'Solo editable mientras el cliente no tenga cuenta de Google vinculada. No puede repetirse entre clientes',
        example: 'cliente@ejemplo.com',
      }),
  })
  .refine(
    (datos) => Object.values(datos).some((valor) => valor !== undefined),
    {
      message: 'Hay que enviar al menos un dato para actualizar',
    },
  );

export class UpdateClienteAdminDto extends createZodDto(
  updateClienteAdminSchema,
) {}
