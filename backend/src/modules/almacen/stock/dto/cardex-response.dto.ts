import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const articuloResumenSchema = z.object({
  id_articulo: z.number(),
  nombre: z.string(),
  FK_Categoria: z.number(),
  FK_Marca: z.number().nullable(),
});

const depositoResumenSchema = z.object({
  id_deposito: z.number(),
  nombre: z.string(),
  es_obrador: z.boolean(),
});

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

const tipoMovimientoResumenSchema = z.object({
  id_tipo_movimiento: z.number(),
  nombre: z.string(),
  // true suma stock, false lo resta.
  indicador_entrada: z.boolean(),
});

/**
 * Cabecera del cardex: la ficha sobre la que se está consultando el
 * historial. `cantidad` es el stock actual y coincide con el `stock_nuevo` de
 * la última línea del cardex COMPLETO (sin filtro de período ni paginación).
 */
export const cardexFichaSchema = z.object({
  id_stock: z.number(),
  cantidad: z.number(),
  umbral_minimo: z.number(),
  estado: z.boolean(),
  articulo: articuloResumenSchema,
  deposito: depositoResumenSchema,
});

/**
 * Una línea del cardex: el movimiento aplanado sobre la línea de detalle que
 * afectó a esta ficha.
 *
 * `fecha_movimiento` es la fecha de negocio (la carga el usuario) y
 * `hora_creacion` la fecha de registro (cuándo se grabó la fila): cuando la
 * segunda es posterior a la primera, el movimiento se cargó de forma
 * retroactiva.
 *
 * `stock_anterior` y `stock_nuevo` son la foto registrada al confirmar el
 * movimiento (HU-07). Se devuelven tal cual quedaron guardados, nunca
 * recalculados.
 */
export const cardexLineaSchema = z.object({
  id_stock_movimiento: z.number(),
  // El "número de movimiento" que muestra la UI: no hay un campo `numero`
  // aparte, es el id de la cabecera.
  id_movimiento: z.number(),
  fecha_movimiento: z.iso.datetime(),
  hora_creacion: z.iso.datetime(),
  cantidad: z.number(),
  stock_anterior: z.number(),
  stock_nuevo: z.number(),
  referencia: z.string().nullable(),
  observacion: z.string().nullable(),
  tipoMovimiento: tipoMovimientoResumenSchema,
  usuarioCreador: usuarioResumenSchema,
});

export const cardexResponseSchema = z.object({
  ficha: cardexFichaSchema,
  data: z.array(cardexLineaSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class CardexResponseDto extends createZodDto(cardexResponseSchema) {}
