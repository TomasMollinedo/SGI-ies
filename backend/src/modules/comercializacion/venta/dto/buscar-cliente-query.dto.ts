import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Al menos uno de los dos: es el mismo criterio que `buscarOCrearCliente` en
 * `venta.service.ts` usa para matchear un cliente existente (dni_cuil O email).
 */
export const buscarClienteQuerySchema = z
  .object({
    dni_cuil: z.string().trim().min(1).optional(),
    email: z.string().trim().min(1).optional(),
  })
  .refine((datos) => datos.dni_cuil !== undefined || datos.email !== undefined, {
    message: 'Hay que enviar dni_cuil o email',
  });

export class BuscarClienteQueryDto extends createZodDto(buscarClienteQuerySchema) {}
