import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  proyectoResumenSchema,
  unidadHeredadaSchema,
} from './publicacion-response.dto';

/**
 * Ítem de la tabla emergente (GET /publicaciones/unidades-publicables):
 * unidades activas, de proyecto no cancelado y sin publicación vigente.
 * `publicable` distingue las que además pasan el gating de estado de
 * proyecto (Decisión cerrada #3) de las que no — hoy solo `EN_PLANIFICACION`
 * cae en `publicable: false`, con el mismo mensaje que rechaza `POST
 * /publicaciones` (ver `MOTIVO_PROYECTO_EN_PLANIFICACION`).
 */
export const unidadPublicableSchema = z.object({
  unidad: unidadHeredadaSchema.omit({ observaciones: true }),
  proyecto: proyectoResumenSchema.pick({
    id_proyecto: true,
    codigo: true,
    nombre: true,
    estado: true,
  }),
  publicable: z.boolean(),
  motivo_no_publicable: z.string().nullable(),
});

export const unidadesPublicablesResponseSchema = z.object({
  data: z.array(unidadPublicableSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class UnidadesPublicablesResponseDto extends createZodDto(
  unidadesPublicablesResponseSchema,
) {}
