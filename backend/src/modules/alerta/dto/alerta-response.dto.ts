import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { tipoAlertaResponseSchema } from './tipo-alerta-response.dto';

const rolResumenSchema = z.object({
  nombre: z.string(),
});

const usuarioResumenSchema = z.object({
  nombre: z.string(),
  apellido: z.string(),
});

/**
 * Una alerta, tal como la devuelven tanto el listado como el detalle.
 *
 * A diferencia de otros módulos acá no hay una versión "liviana" para el
 * listado: el objeto ya es chico y no tiene campos caros de traer, así que
 * separarlo solo agregaría un DTO más para mantener.
 */
export const alertaResponseSchema = z.object({
  id_alerta: z.number(),
  tipoAlerta: tipoAlertaResponseSchema,
  // Texto ya armado por quien generó la alerta: se muestra tal cual, sin
  // necesidad de interpretar `datos`.
  mensaje: z.string(),
  /**
   * Payload específico del tipo de alerta. Su forma depende de `tipoAlerta`:
   * una REPOSICION trae ids y cantidades de stock, un tipo futuro traerá otra
   * cosa. No hay un contrato único que documentar acá — es una limitación
   * asumida del diseño, no un olvido.
   */
  datos: z.unknown().nullable(),
  // El destinatario es un rol, no una persona. Sirve sobre todo en la vista
  // del Gerente General y el Administrador, que ven alertas dirigidas a varios
  // roles.
  rolDestinatario: rolResumenSchema,
  atendida: z.boolean(),
  // null mientras la alerta no esté atendida.
  usuarioAtencion: usuarioResumenSchema.nullable(),
  fecha_atencion: z.iso.datetime().nullable(),
  hora_creacion: z.iso.datetime(),
});

export class AlertaResponseDto extends createZodDto(alertaResponseSchema) {}

export const alertaListResponseSchema = z.object({
  data: z.array(alertaResponseSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class AlertaListResponseDto extends createZodDto(
  alertaListResponseSchema,
) {}
