import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { TipologiaUnidad } from '../../../../generated/prisma/enums';

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
  /** Portada de la unidad (la imagen de menor `orden`). Null si no tiene ninguna. */
  imagen_url: z.string().nullable(),
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

/**
 * Plan de ejemplo (HU-22) tal como lo ve el visitante: nunca trae importes
 * guardados, todo se calcula al responder con el precio de lista y la TNA
 * vigente de su plazo. Un plan inactivo, o de un plazo inactivo, no aparece.
 */
const planEjemploSchema = z.object({
  nombre: z.string(),
  anticipo_porcentaje: z.number(),
  anticipo_monto: z.number(),
  saldo_financiado: z.number(),
  cantidad_cuotas: z.number(),
  tasa_nominal_anual: z.number(),
  valor_cuota: z.number(),
  total_intereses: z.number(),
  total_a_pagar: z.number(),
});

/** Plazo activo que el visitante puede elegir en la simulación libre. */
const plazoSimuladorSchema = z.object({
  id_plazo_financiacion: z.number(),
  cantidad_cuotas: z.number(),
  tasa_nominal_anual: z.number(),
});

/**
 * Detalle de una unidad: todo lo del ítem del listado, más lo que no entra en
 * una fila de catálogo (fotos, comodidades, planes de ejemplo y plazos del
 * simulador).
 *
 * `simulador` es `null` cuando no hay ningún plazo activo: en ese caso el
 * detalle informa únicamente el precio de contado (`precio_desde`).
 */
export const catalogoDetalleSchema = catalogoListItemSchema.extend({
  comodidades: z.string().nullable(),
  observaciones: z.string().nullable(),
  imagenes: z.array(imagenUnidadSchema),
  planes: z.array(planEjemploSchema),
  simulador: z.object({ plazos: z.array(plazoSimuladorSchema) }).nullable(),
});

export class CatalogoDetalleResponseDto extends createZodDto(
  catalogoDetalleSchema,
) {}

/**
 * Resultado de la simulación libre. No hay fechas de vencimiento: es una
 * simulación sin venta, y el cronograma real nace recién al registrarla
 * (HU-27). La cuota 0 es el anticipo.
 */
export const simulacionCatalogoSchema = z.object({
  precio_lista: z.number(),
  anticipo_monto: z.number(),
  anticipo_porcentaje: z.number(),
  saldo_financiado: z.number(),
  plazo: plazoSimuladorSchema,
  tasa_mensual: z.number(),
  valor_cuota: z.number(),
  total_intereses: z.number(),
  total_a_pagar: z.number(),
  cronograma: z.array(
    z.object({
      numero: z.number(),
      importe_capital: z.number(),
      importe_interes: z.number(),
      importe: z.number(),
    }),
  ),
});

export class SimulacionCatalogoResponseDto extends createZodDto(
  simulacionCatalogoSchema,
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
