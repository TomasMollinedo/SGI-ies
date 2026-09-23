import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const declaracionPagoResponseSchema = z.object({
  id_declaracion_pago: z.number(),
  FK_cliente: z.number(),
  FK_cuota: z.number(),
  FK_forma_pago: z.number(),
  importe: z.number(),
  numero_referencia: z.string().nullable(),
  estado: z.enum(['PENDIENTE', 'VALIDADA', 'RECHAZADA']),
  // Nulos al declarar: los completa Tesorería recién al validar/rechazar
  // (todavía no implementado).
  motivo_rechazo: z.string().nullable(),
  fecha_resolucion: z.iso.datetime().nullable(),
  FK_usuario_validador: z.number().nullable(),
  FK_cobro: z.number().nullable(),
  hora_creacion: z.iso.datetime(),
});

export class DeclaracionPagoResponseDto extends createZodDto(
  declaracionPagoResponseSchema,
) {}
