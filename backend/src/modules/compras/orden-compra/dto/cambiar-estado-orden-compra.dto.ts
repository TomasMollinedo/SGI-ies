import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EstadoOrdenCompra } from '../../../../../generated/prisma/enums';

/**
 * Payload de cualquier cambio de estado (emitir, marcar recepción, cancelar).
 * Fija solo la FORMA del contrato: qué transiciones son válidas desde cada
 * estado es lógica de negocio del service (máquina de estados), no de este
 * DTO — acá no se conoce el estado actual de la orden contra el que se va a
 * validar.
 *
 * `motivo_cancelacion` queda opcional en el schema: es obligatorio recién a
 * nivel de service, y solo cuando `estado` pasa a CANCELADA.
 */
export const cambiarEstadoOrdenCompraSchema = z.object({
  estado: z.enum(EstadoOrdenCompra),
  motivo_cancelacion: z.string().trim().max(500).optional(),
  // Se sobrescribe la observación general de la orden en cada cambio de
  // estado: no hay historial de estados (ver ORDENCOMPRA en el schema).
  observaciones: z.string().trim().max(500).optional(),
});

export class CambiarEstadoOrdenCompraDto extends createZodDto(
  cambiarEstadoOrdenCompraSchema,
) {}
