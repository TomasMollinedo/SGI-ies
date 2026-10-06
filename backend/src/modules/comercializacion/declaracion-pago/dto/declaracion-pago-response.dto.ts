import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { estadoCobroSchema } from '../../cobro/dto/cobro-response.dto';

export const ESTADO_DECLARACION_PAGO = [
  'PENDIENTE',
  'VALIDADA',
  'RECHAZADA',
] as const;
export const estadoDeclaracionPagoSchema = z.enum(ESTADO_DECLARACION_PAGO);

export const declaracionPagoResponseSchema = z.object({
  id_declaracion_pago: z.number(),
  FK_cliente: z.number(),
  FK_cuota: z.number(),
  FK_forma_pago: z.number(),
  importe: z.number(),
  numero_referencia: z.string().nullable(),
  estado: estadoDeclaracionPagoSchema,
  // Nulos al declarar: los completa Tesorería recién al validar/rechazar.
  motivo_rechazo: z.string().nullable(),
  fecha_resolucion: z.iso.datetime().nullable(),
  FK_usuario_validador: z.number().nullable(),
  FK_cobro: z.number().nullable(),
  hora_creacion: z.iso.datetime(),
});

export class DeclaracionPagoResponseDto extends createZodDto(
  declaracionPagoResponseSchema,
) {}

/** Mismos datos identificatorios del cliente que el listado de cobros. */
const clienteDeclaracionSchema = z.object({
  id_cliente: z.number(),
  nombre: z.string(),
  apellido: z.string().nullable(),
  dni_cuil: z.string().nullable(),
  email: z.email(),
});

/**
 * Un ítem de la bandeja de Tesorería (T117): la declaración completa más
 * todo lo necesario para cotejarla contra el extracto sin otra consulta.
 * `cuota.saldo_pendiente` es el saldo ACTUAL (no el del momento de
 * declarar): si ya no alcanza para el importe, validar va a dar 409.
 * `cobro` solo viene en una VALIDADA; si ese cobro se anuló después, la
 * declaración sigue VALIDADA y `cobro.estado` es ANULADO.
 */
export const declaracionPagoListItemSchema =
  declaracionPagoResponseSchema.extend({
    cliente: clienteDeclaracionSchema,
    cuota: z.object({
      id_cuota: z.number(),
      numero: z.number(),
      saldo_pendiente: z.number(),
    }),
    venta: z.object({
      id_venta: z.number(),
      unidad: z.object({ identificador: z.string() }),
      proyecto: z.object({ nombre: z.string() }),
    }),
    forma_pago: z.object({ nombre: z.string() }),
    cobro: z
      .object({ id_cobro: z.number(), estado: estadoCobroSchema })
      .nullable(),
  });

export const declaracionPagoListResponseSchema = z.object({
  data: z.array(declaracionPagoListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class DeclaracionPagoListResponseDto extends createZodDto(
  declaracionPagoListResponseSchema,
) {}
