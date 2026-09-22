import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { clienteResumenSchema } from './venta-response.dto';

/** Respuesta de GET /ventas/buscar-cliente. No existir no es un error: `encontrado: false`. */
export const clienteBuscadoResponseSchema = z.object({
  encontrado: z.boolean(),
  cliente: clienteResumenSchema.nullable(),
});

export class ClienteBuscadoResponseDto extends createZodDto(clienteBuscadoResponseSchema) {}
