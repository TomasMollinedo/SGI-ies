import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { alertaResponseSchema } from '../../../alerta/dto/alerta-response.dto';

const tipoMovimientoResumenSchema = z.object({
  id_tipo_movimiento: z.number(),
  nombre: z.string(),
  // Define el signo del movimiento: true suma stock, false lo resta.
  indicador_entrada: z.boolean(),
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

const articuloResumenSchema = z.object({
  id_articulo: z.number(),
  nombre: z.string(),
});

/**
 * Una línea del detalle tal como quedó registrada. `stock_anterior` y
 * `stock_nuevo` son la foto de la ficha antes y después de aplicar la línea:
 * son el log de auditoría que pide la HU (quién y cuándo salen de la
 * cabecera).
 */
const lineaMovimientoResponseSchema = z.object({
  id_stock_movimiento: z.number(),
  FK_Stock: z.number(),
  cantidad: z.number(),
  stock_anterior: z.number(),
  stock_nuevo: z.number(),
  observacion: z.string().nullable(),
  stock: z.object({
    id_stock: z.number(),
    articulo: articuloResumenSchema,
  }),
});

/**
 * Respuesta del POST y del GET /movimientos/:id: la cabecera completa con
 * todas sus líneas.
 *
 * El "número único generado por el sistema" que pide la HU es
 * `id_movimiento` — no hay un campo `numero` aparte.
 */
export const movimientoResponseSchema = z.object({
  id_movimiento: z.number(),
  // Fecha de negocio, la carga el usuario. Distinta de hora_creacion.
  fecha_movimiento: z.iso.datetime(),
  referencia: z.string().nullable(),
  observaciones: z.string().nullable(),
  hora_creacion: z.iso.datetime(),
  FK_TipoMovimiento: z.number(),
  FK_Deposito: z.number(),
  FK_usuario_creador: z.number(),
  tipoMovimiento: tipoMovimientoResumenSchema,
  deposito: depositoResumenSchema,
  usuarioCreador: usuarioResumenSchema,
  stockMovimientos: z.array(lineaMovimientoResponseSchema),
});

export class MovimientoResponseDto extends createZodDto(
  movimientoResponseSchema,
) {}

/**
 * Respuesta del POST: el movimiento más las alertas que su registro disparó.
 *
 * `alertasGeneradas` solo aparece acá, no en el listado ni en el detalle por
 * id: son alertas de ESTE registro puntual, y una vez creadas se consultan por
 * el módulo de Alertas (GET /alertas), no volviendo a pedir el movimiento.
 * Viene vacío cuando ninguna línea cruzó su umbral mínimo — o cuando el
 * módulo de Alertas falló, que no invalida el movimiento.
 */
export const movimientoCreadoResponseSchema = movimientoResponseSchema.extend({
  alertasGeneradas: z.array(alertaResponseSchema),
});

export class MovimientoCreadoResponseDto extends createZodDto(
  movimientoCreadoResponseSchema,
) {}

/**
 * Ítem del listado: la cabecera sin el detalle completo. En vez de las
 * líneas trae solo cuántas son (`_count.stockMovimientos`); para verlas hay
 * que ir al detalle (GET /movimientos/:id).
 */
export const movimientoListItemSchema = movimientoResponseSchema
  .omit({
    observaciones: true,
    hora_creacion: true,
    FK_usuario_creador: true,
    stockMovimientos: true,
  })
  .extend({
    _count: z.object({ stockMovimientos: z.number() }),
  });

export const movimientoListResponseSchema = z.object({
  data: z.array(movimientoListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class MovimientoListResponseDto extends createZodDto(
  movimientoListResponseSchema,
) {}
