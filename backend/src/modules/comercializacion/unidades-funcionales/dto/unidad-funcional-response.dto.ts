import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  EstadoProyecto,
  TipologiaUnidad,
} from '../../../../../generated/prisma/enums';

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

// Los textos posibles salen de `calcularCondicionEntrega`, única fuente de
// verdad (ver comercializacion/common/condicion-entrega.ts).
const condicionEntregaSchema = z.object({
  codigo: z.enum(['TERMINADA', 'A_ENTREGAR_CON_FECHA', 'A_ENTREGAR_SIN_FECHA']),
  texto: z.string().meta({ example: 'A entregar, fecha a confirmar' }),
  fecha_referencia: z.iso.datetime().nullable(),
});

const costoEditableSchema = z.boolean().meta({
  description:
    'false si la unidad tiene o tuvo alguna publicación: el costo queda fijo para siempre',
});

/**
 * Cabecera de la unidad: las columnas propias, con los importes ya como
 * número. El listado y el detalle la extienden con lo que cada uno necesita.
 */
export const unidadFuncionalResponseSchema = z.object({
  id_unidad_funcional: z.number(),
  FK_proyecto: z.number(),
  identificador: z.string(),
  tipologia: z.enum(TipologiaUnidad),
  superficie_cubierta: z.number(),
  superficie_descubierta: z.number().nullable(),
  piso: z.string().nullable(),
  comodidades: z.string().nullable(),
  observaciones: z.string().nullable(),
  costo: z.number(),
  estado: z.boolean(),
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
});

/**
 * Ítem del listado (GET /unidades-funcionales): sin datos de auditoría, ni
 * imágenes ni el motivo del costo bloqueado — eso lo trae el detalle
 * (GET /unidades-funcionales/:id).
 */
export const unidadFuncionalListItemSchema = unidadFuncionalResponseSchema
  .omit({
    hora_creacion: true,
    hora_actualizacion: true,
    FK_usuario_creador: true,
    FK_usuario_actualizador: true,
  })
  .extend({
    costo_editable: costoEditableSchema,
    proyecto: proyectoResumenSchema,
    condicion_entrega: condicionEntregaSchema,
  });

export const unidadFuncionalListResponseSchema = z.object({
  data: z.array(unidadFuncionalListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class UnidadFuncionalListResponseDto extends createZodDto(
  unidadFuncionalListResponseSchema,
) {}

/**
 * Detalle (GET /unidades-funcionales/:id, y lo que devuelven el alta, la
 * edición, la baja, la reactivación y las operaciones de imágenes): cabecera
 * completa + proyecto, condición de entrega, galería y quién la creó y
 * modificó.
 */
export const unidadFuncionalDetalleResponseSchema =
  unidadFuncionalResponseSchema.extend({
    costo_editable: costoEditableSchema,
    motivo_costo_no_editable: z.string().nullable().meta({
      description:
        'Explicación para mostrar junto al campo costo deshabilitado; null si el costo es editable',
    }),
    proyecto: proyectoResumenSchema,
    condicion_entrega: condicionEntregaSchema,
    imagenes: z.array(imagenUnidadSchema),
    usuarioCreador: usuarioResumenSchema,
    usuarioActualizador: usuarioResumenSchema,
  });

export class UnidadFuncionalDetalleResponseDto extends createZodDto(
  unidadFuncionalDetalleResponseSchema,
) {}
