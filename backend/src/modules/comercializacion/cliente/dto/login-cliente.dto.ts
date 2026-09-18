import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const loginClienteSchema = z.object({
  idToken: z
    .string()
    .min(1, { message: 'El idToken de Google es obligatorio' })
    .meta({
      description:
        'id_token (JWT) que devuelve Google Identity Services al loguearse en el frontend',
    }),
});

export class LoginClienteDto extends createZodDto(loginClienteSchema) {}
