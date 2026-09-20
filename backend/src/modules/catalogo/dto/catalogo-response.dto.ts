import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  Periodicidad,
  TipoPlanPago,
  TipologiaUnidad,
} from '../../../../generated/prisma/enums';

/**
 * DTOs de la API pública del catálogo (T107). Cada schema se arma campo por
 * campo a propósito, nunca `z.infer` de un `select` de Prisma: es la única
 * forma de garantizar que nunca se cuele `costo`, `presupuesto`,
 * `porcentaje_ganancia`, `margen`, ni ningún dato de cliente/venta/cuota acá.
 */

const proyectoResumenSchema = z.object({
  nombre: z.string(),
  localidad: z.string(),
});

/** Ver `calcularCondicionEntrega` (única fuente de estos textos, T103). */
const condicionEntregaSchema = z.object({
  codigo: z.enum(['TERMINADA', 'A_ENTREGAR_CON_FECHA', 'A_ENTREGAR_SIN_FECHA']),
  texto: z.string(),
  fecha_referencia: z.iso.datetime().nullable(),
});

export const catalogoListItemSchema = z.object({
  id_unidad_funcional: z.number(),
  identificador: z.string(),
  tipologia: z.enum(TipologiaUnidad),
  superficie_cubierta: z.number(),
  superficie_descubierta: z.number().nullable(),
  piso: z.string().nullable(),
  proyecto: proyectoResumenSchema,
  precio_desde: z.number(),
  condicion_entrega: condicionEntregaSchema,
  // Fecha de la publicación vigente: es el criterio de orden del catálogo
  // (más nuevo primero), no un dato de negocio que le importe al frontend.
  fecha_publicacion: z.iso.datetime(),
});

export const catalogoListResponseSchema = z.object({
  data: z.array(catalogoListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class CatalogoListResponseDto extends createZodDto(
  catalogoListResponseSchema,
) {}

const imagenUnidadSchema = z.object({
  url: z.string(),
  orden: z.number(),
});

const planActivoSchema = z.object({
  nombre: z.string(),
  tipo: z.enum(TipoPlanPago),
  precio: z.number(),
  anticipo_porcentaje: z.number().nullable(),
  anticipo_monto: z.number().nullable(),
  cantidad_cuotas: z.number().nullable(),
  periodicidad: z.enum(Periodicidad).nullable(),
});

/**
 * Detalle de una unidad: todo lo del ítem del listado, más lo que no entra en
 * una fila de catálogo (fotos, comodidades, y los planes de pago ACTIVOS con
 * su precio — un plan inactivo no aparece acá).
 */
export const catalogoDetalleSchema = catalogoListItemSchema.extend({
  comodidades: z.string().nullable(),
  observaciones: z.string().nullable(),
  imagenes: z.array(imagenUnidadSchema),
  planes: z.array(planActivoSchema),
});

export class CatalogoDetalleResponseDto extends createZodDto(
  catalogoDetalleSchema,
) {}

export const proyectoDestacadoSchema = z.object({
  id_proyecto: z.number(),
  nombre: z.string(),
  localidad: z.string(),
  imagen_portada_url: z.string().nullable(),
  cantidad_disponibles: z.number(),
  precio_desde: z.number(),
});

export const proyectosDestacadosResponseSchema = z.object({
  data: z.array(proyectoDestacadoSchema),
});

export class ProyectosDestacadosResponseDto extends createZodDto(
  proyectosDestacadosResponseSchema,
) {}
