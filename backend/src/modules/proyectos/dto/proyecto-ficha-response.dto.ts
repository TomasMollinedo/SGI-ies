import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { TipologiaUnidad } from '../../../../generated/prisma/enums';
import { estadoComercialUnidadSchema } from '../../comercializacion/unidades-funcionales/dto/estado-comercial-unidad';

const unidadFichaSchema = z.object({
  id_unidad_funcional: z.number().meta({
    description:
      'Para abrir el detalle de la unidad (GET /unidades-funcionales/:id)',
  }),
  identificador: z.string(),
  tipologia: z.enum(TipologiaUnidad),
  superficie_cubierta: z.number().meta({ description: 'En m²' }),
  costo: z.number().meta({ description: 'En pesos' }),
  precio_lista: z.number().nullable().meta({
    description:
      'Precio de lista de la publicación vigente, en pesos. Null si la unidad no tiene publicación vigente o todavía no tiene precio (En preparación).',
  }),
  estado_comercial: estadoComercialUnidadSchema.meta({
    description:
      'Estado de la publicación vigente de la unidad; `SIN_PUBLICAR` si no tiene ninguna (nunca publicada o despublicada)',
  }),
});

// Las cinco claves van escritas (y no con `z.record`) para que Swagger las
// muestre una por una. Son los valores de `estadoComercialUnidadSchema`: un
// test de `situacion-comercial.spec.ts` falla si dejan de coincidir.
export const unidadesPorEstadoSchema = z.object({
  SIN_PUBLICAR: z.number(),
  EN_PREPARACION: z.number(),
  DISPONIBLE: z.number(),
  EN_PLAN_DE_PAGO: z.number(),
  VENDIDA: z.number(),
});

/**
 * Ficha del proyecto (GET /proyectos/:id/ficha, HU-31): lo que se calcula
 * sobre sus unidades activas y no viene en el detalle. El presupuesto y las
 * unidades cargadas contra las planificadas siguen saliendo de
 * GET /proyectos/:id. Nada de esto se guarda: se calcula en cada consulta.
 */
export const proyectoFichaResponseSchema = z.object({
  id_proyecto: z.number(),
  precio_estimado: z.object({
    total: z.number().meta({
      description:
        'Precio estimado de venta, en pesos: suma del precio de lista de las unidades activas con publicación vigente y precio cargado. Incluye las que están En Plan de Pago y Vendidas.',
    }),
    unidades_calculadas: z.number().meta({
      description:
        'Sobre cuántas unidades se calculó el precio estimado. Solo cuenta las que tienen precio de lista: una unidad En preparación tiene publicación vigente pero todavía no tiene precio, así que no entra.',
    }),
  }),
  situacion_comercial: z.object({
    por_estado: unidadesPorEstadoSchema.meta({
      description:
        'Cantidad de unidades activas en cada estado comercial. Siempre vienen las cinco claves, en 0 si no hay ninguna. Suman `unidades_cargadas` de GET /proyectos/:id.',
    }),
    porcentaje_vendido: z.number().meta({
      description:
        'Porcentaje de unidades activas con venta vigente (En Plan de Pago o Vendida), de 0 a 100 con 2 decimales. La base son las unidades activas, no las planificadas. Sin unidades activas es 0.',
    }),
    todas_vendidas: z.boolean().meta({
      description:
        'true si el proyecto tiene al menos una unidad activa y todas tienen venta vigente ("Todas las unidades vendidas"). Sin unidades activas es false. Para mostrar el indicador usar este campo, no `porcentaje_vendido`, que está redondeado.',
    }),
  }),
  unidades: z.array(unidadFichaSchema).meta({
    description:
      'Unidades activas del proyecto, ordenadas por identificador con orden natural ("U2" antes que "U10")',
  }),
});

export class ProyectoFichaResponseDto extends createZodDto(
  proyectoFichaResponseSchema,
) {}
