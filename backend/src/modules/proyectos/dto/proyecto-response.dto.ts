import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  EstadoProyecto,
  TipoImagenProyecto,
} from '../../../../generated/prisma/enums';

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

const imagenProyectoSchema = z.object({
  id_imagen_proyecto: z.number(),
  url: z.string(),
  tipo: z.enum(TipoImagenProyecto),
  orden: z.number(),
});

/**
 * Ítem del listado (GET /proyectos): los datos propios del proyecto más los
 * tres valores calculados. Sin auditoría ni imágenes de diseño — eso lo trae
 * el detalle (GET /proyectos/:id).
 */
export const proyectoResponseSchema = z.object({
  id_proyecto: z.number(),
  codigo: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  localidad: z.string(),
  direccion: z.string(),
  fecha_inicio: z.iso.datetime().nullable(),
  fecha_fin_estimada: z.iso.datetime().nullable(),
  estado_obra: z.enum(EstadoProyecto).meta({
    description: 'Estado de avance de la obra',
  }),
  estado: z.boolean().meta({
    description: 'Baja lógica: false si el proyecto fue dado de baja',
  }),
  cantidad_unidades_planificadas: z.number(),
  imagen_portada_url: z.string().nullable(),
  unidades_cargadas: z.number().meta({
    description: 'Cantidad de unidades activas cargadas en el proyecto',
  }),
  presupuesto: z.number().meta({
    description:
      'Suma del costo de las unidades activas, en pesos. Se calcula, no se carga ni se edita.',
  }),
  porcentaje_vendido: z.number().meta({
    description:
      'Porcentaje de unidades activas con venta vigente (En Plan de Pago o Vendida), de 0 a 100 con 2 decimales. La base son las unidades activas, no las planificadas. Sin unidades activas es 0. Se calcula, no se guarda. El desglose por estado comercial está en GET /proyectos/:id/ficha.',
  }),
});

export class ProyectoResponseDto extends createZodDto(proyectoResponseSchema) {}

export const proyectoListResponseSchema = z.object({
  data: z.array(proyectoResponseSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class ProyectoListResponseDto extends createZodDto(
  proyectoListResponseSchema,
) {}

/**
 * Detalle (GET /proyectos/:id, y lo que devuelven el alta, la edición, el
 * cambio de estado de obra, la baja y las operaciones de imágenes): lo del
 * listado + la galería de diseño y quién lo creó y modificó.
 */
export const proyectoDetalleResponseSchema = proyectoResponseSchema.extend({
  imagenes: z.array(imagenProyectoSchema).meta({
    description:
      'Renders y planos del proyecto, ordenados por `orden` y después por id',
  }),
  hora_creacion: z.iso.datetime(),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_creador: z.number(),
  FK_usuario_actualizador: z.number(),
  usuarioCreador: usuarioResumenSchema,
  usuarioActualizador: usuarioResumenSchema,
});

export class ProyectoDetalleResponseDto extends createZodDto(
  proyectoDetalleResponseSchema,
) {}
