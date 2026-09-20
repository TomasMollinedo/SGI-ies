import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  EstadoProyecto,
  TipologiaUnidad,
} from '../../../../generated/prisma/enums';

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

const imagenUnidadSchema = z.object({
  id_imagen_unidad: z.number(),
  url: z.string(),
  orden: z.number(),
});

const proyectoResumenSchema = z.object({
  id_proyecto: z.number(),
  codigo: z.string(),
  nombre: z.string(),
  estado: z.enum(EstadoProyecto),
  fecha_fin_estimada: z.iso.datetime().nullable(),
});

const condicionEntregaSchema = z.object({
  codigo: z.enum(['TERMINADA', 'A_ENTREGAR_CON_FECHA', 'A_ENTREGAR_SIN_FECHA']),
  texto: z.string().meta({
    example: 'A entregar, fecha a confirmar',
  }),
  fecha_referencia: z.iso.datetime().nullable(),
});

export const unidadFuncionalResponseSchema = z.object({
  id_unidad_funcional: z.number(),
  identificador: z.string(),
  tipologia: z.enum(TipologiaUnidad),
  superficie_cubierta: z.number(),
  superficie_descubierta: z.number().nullable(),
  piso: z.string().nullable(),
  comodidades: z.string().nullable(),
  observaciones: z.string().nullable(),
  costo: z.number(),
  costo_editable: z.boolean().meta({
    description:
      'false si la unidad tiene o tuvo alguna publicación: el costo queda fijo para siempre',
  }),
  motivo_costo_no_editable: z.string().nullable().meta({
    description:
      'Explicación para mostrar junto al campo costo deshabilitado; null si es editable',
  }),
  estado: z.boolean(),
  proyecto: proyectoResumenSchema,
  condicion_entrega: condicionEntregaSchema,
  imagenes: z.array(imagenUnidadSchema),
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
  usuarioCreador: usuarioResumenSchema,
  usuarioActualizador: usuarioResumenSchema,
});

export class UnidadFuncionalResponseDto extends createZodDto(
  unidadFuncionalResponseSchema,
) {}

export const unidadFuncionalListResponseSchema = z.object({
  data: z.array(unidadFuncionalResponseSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class UnidadFuncionalListResponseDto extends createZodDto(
  unidadFuncionalListResponseSchema,
) {}