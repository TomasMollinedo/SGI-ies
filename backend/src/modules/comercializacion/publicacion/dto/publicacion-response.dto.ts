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
 * (herencia en vivo): nunca se duplican en la publicación.
 *
 * Sin `costo`: es un dato interno de Proyectos. Lo suma únicamente el detalle
 * (ver `unidadDetalleSchema`), que es un endpoint de la pantalla interna de
 * Comercialización; el listado lo `pick`ea sin él, y el catálogo público
 * (`CatalogoService`) tiene su propio select, que nunca lo toca.
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

/**
 * La unidad tal como la ve el detalle: lo heredado más el `costo`, que
 * Comercialización necesita para armar los planes de pago (HU-22). Es contra
 * el costo que se calcula el precio sugerido del plan, y contra el que el
 * backend avisa —con el `warning` de `PlanPagoCreadoResponseDto`— si el precio
 * quedó por debajo.
 *
 * Solo acá: el detalle es de la pantalla interna y pide el mismo rol
 * ADMINISTRADOR que los planes de pago. El catálogo público nunca ve este
 * schema.
 *
 * `string` y no `number`: la columna es `Decimal(14, 2)` y Prisma la devuelve
 * como `Prisma.Decimal`, que serializa a string. Mismo criterio —y misma
 * pantalla— que `precio` en `PlanPagoResponseDto`. Las superficies de arriba
 * sí son `number` porque el service las convierte con `.toNumber()`; los
 * importes no se convierten.
 */
const unidadDetalleSchema = unidadHeredadaSchema.extend({
  costo: z.string(),
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
 * Cabecera de la publicación. Los datos de la unidad, sus imágenes y el
 * proyecto no viven acá: se leen por relación (herencia en vivo) y se suman
 * en el detalle y en el listado.
 */
export const publicacionResponseSchema = z.object({
  id_publicacion: z.number(),
  FK_unidad_funcional: z.number(),
  estado_comercial: z.enum(EstadoComercial),
  vigente: z.boolean(),
  fecha_publicacion: z.iso.datetime(),
  fecha_despublicacion: z.iso.datetime().nullable(),
  motivo_despublicacion: z.string().nullable(),
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

/**
 * Ítem del listado interno (GET /publicaciones): sin imágenes ni condición
 * de entrega, ni datos de auditoría — eso lo trae el detalle
 * (GET /publicaciones/:id).
 */
export const publicacionListItemSchema = publicacionResponseSchema
  .omit({
    FK_unidad_funcional: true,
    motivo_despublicacion: true,
    hora_creacion: true,
    hora_actualizacion: true,
    FK_usuario_creador: true,
    FK_usuario_actualizador: true,
  })
  .extend({
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

/**
 * Detalle (POST, PATCH despublicar y GET /publicaciones/:id): cabecera
 * completa + la unidad, sus imágenes, el proyecto, la condición de entrega
 * calculada y quién la creó/actualizó.
 */
export const publicacionDetalleResponseSchema =
  publicacionResponseSchema.extend({
    unidad: unidadDetalleSchema,
    imagenes: z.array(imagenUnidadSchema),
    proyecto: proyectoResumenSchema,
    condicion_entrega: condicionEntregaSchema,
    usuarioCreador: usuarioResumenSchema,
    usuarioActualizador: usuarioResumenSchema,
  });

export class PublicacionDetalleResponseDto extends createZodDto(
  publicacionDetalleResponseSchema,
) {}
