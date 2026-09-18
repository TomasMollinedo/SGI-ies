import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  EstadoComercial,
  EstadoProyecto,
  TipologiaUnidad,
} from '../../../../../generated/prisma/enums';

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

/**
 * Datos descriptivos de la unidad, heredados en vivo desde `UNIDADFUNCIONAL`
 * (Decisión cerrada #1): nunca se duplican en la publicación. Sin `costo` a
 * propósito — es un dato interno de Proyectos, la publicación nunca lo
 * expone.
 */
export const unidadHeredadaSchema = z.object({
  id_unidad_funcional: z.number(),
  identificador: z.string(),
  tipologia: z.enum(TipologiaUnidad),
  superficie_cubierta: z.number(),
  superficie_descubierta: z.number().nullable(),
  piso: z.string().nullable(),
  comodidades: z.string().nullable(),
  observaciones: z.string().nullable(),
});

const imagenUnidadSchema = z.object({
  id_imagen_unidad: z.number(),
  url: z.string(),
  orden: z.number(),
});

export const proyectoResumenSchema = z.object({
  id_proyecto: z.number(),
  codigo: z.string(),
  nombre: z.string(),
  localidad: z.string(),
  estado: z.enum(EstadoProyecto),
  fecha_fin_estimada: z.iso.datetime().nullable(),
});

/** Ver `calcularCondicionEntrega` (única fuente de estos textos). */
const condicionEntregaSchema = z.object({
  codigo: z.enum(['TERMINADA', 'A_ENTREGAR_CON_FECHA', 'A_ENTREGAR_SIN_FECHA']),
  texto: z.string(),
  fecha_referencia: z.iso.datetime().nullable(),
});

/**
 * Detalle completo (GET /publicaciones/:id): la unidad, sus imágenes y el
 * proyecto se leen por relación (herencia en vivo), nunca se persisten en
 * esta fila.
 */
export const publicacionResponseSchema = z.object({
  id_publicacion: z.number(),
  estado_comercial: z.enum(EstadoComercial),
  vigente: z.boolean(),
  fecha_publicacion: z.iso.datetime(),
  fecha_despublicacion: z.iso.datetime().nullable(),
  motivo_despublicacion: z.string().nullable(),
  unidad: unidadHeredadaSchema,
  imagenes: z.array(imagenUnidadSchema),
  proyecto: proyectoResumenSchema,
  condicion_entrega: condicionEntregaSchema,
  usuarioCreador: usuarioResumenSchema,
  usuarioActualizador: usuarioResumenSchema,
});

export class PublicacionResponseDto extends createZodDto(
  publicacionResponseSchema,
) {}

/**
 * Ítem del listado interno (GET /publicaciones): sin imágenes ni condición
 * de entrega, eso lo trae el detalle (GET /publicaciones/:id).
 */
export const publicacionListItemSchema = z.object({
  id_publicacion: z.number(),
  estado_comercial: z.enum(EstadoComercial),
  vigente: z.boolean(),
  fecha_publicacion: z.iso.datetime(),
  fecha_despublicacion: z.iso.datetime().nullable(),
  unidad: unidadHeredadaSchema.pick({
    id_unidad_funcional: true,
    identificador: true,
    tipologia: true,
  }),
  proyecto: proyectoResumenSchema.pick({
    id_proyecto: true,
    codigo: true,
    nombre: true,
  }),
});

export const publicacionListResponseSchema = z.object({
  data: z.array(publicacionListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class PublicacionListResponseDto extends createZodDto(
  publicacionListResponseSchema,
) {}
