import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoConsulta } from '../../../../../generated/prisma/enums';

const unidadResumenSchema = z.object({
  id_unidad_funcional: z.number(),
  identificador: z.string(),
  proyecto: z.object({ nombre: z.string() }),
});

const clienteResumenSchema = z.object({
  id_cliente: z.number(),
  nombre: z.string(),
  apellido: z.string().nullable(),
  email: z.string(),
});

/**
 * Shape que ve el cliente: su propia consulta, sin ningún dato de quién la
 * respondió (eso es interno). La usan tanto el alta (`POST /consultas`) como
 * el historial (`GET /consultas/mis-consultas`).
 */
export const consultaClienteResponseSchema = z.object({
  id_consulta: z.number(),
  texto: z.string(),
  estado: z.enum(EstadoConsulta),
  respuesta: z.string().nullable(),
  fecha_respuesta: z.iso.datetime().nullable(),
  hora_creacion: z.iso.datetime(),
  unidad: unidadResumenSchema,
});

export class ConsultaClienteResponseDto extends createZodDto(
  consultaClienteResponseSchema,
) {}

export const consultaClienteListResponseSchema = z.object({
  data: z.array(consultaClienteResponseSchema),
  meta: z.object({ total: z.number(), page: z.number(), limit: z.number() }),
});

export class ConsultaClienteListResponseDto extends createZodDto(
  consultaClienteListResponseSchema,
) {}

/** Shape de la cola interna: todo lo anterior + quién es el cliente que consultó. */
export const consultaInternaResponseSchema =
  consultaClienteResponseSchema.extend({
    cliente: clienteResumenSchema,
  });

export class ConsultaInternaResponseDto extends createZodDto(
  consultaInternaResponseSchema,
) {}

export const consultaInternaListResponseSchema = z.object({
  data: z.array(consultaInternaResponseSchema),
  meta: z.object({ total: z.number(), page: z.number(), limit: z.number() }),
});

export class ConsultaInternaListResponseDto extends createZodDto(
  consultaInternaListResponseSchema,
) {}
