import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const clientePublicoSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  apellido: z.string().nullable(),
  email: z.string(),
  dni_cuil: z
    .string()
    .nullable()
    .meta({ description: 'Null hasta que el cliente lo completa' }),
  telefono: z
    .string()
    .nullable()
    .meta({ description: 'Null hasta que el cliente lo completa' }),
});

export class ClienteResponseDto extends createZodDto(clientePublicoSchema) {}

export const loginClienteResponseSchema = z.object({
  accessToken: z.string(),
  cliente: clientePublicoSchema,
});

export class LoginClienteResponseDto extends createZodDto(
  loginClienteResponseSchema,
) {}

export const refreshClienteResponseSchema = z.object({
  accessToken: z.string(),
});

export class RefreshClienteResponseDto extends createZodDto(
  refreshClienteResponseSchema,
) {}
