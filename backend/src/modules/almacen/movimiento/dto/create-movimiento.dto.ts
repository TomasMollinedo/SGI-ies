import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from './fecha-iso.schema';

/**
 * Una línea del detalle. Referencia una ficha de stock ya existente
 * (`FK_Stock`), no un artículo: el formulario del frontend elige primero el
 * depósito y después muestra solo las fichas de ESE depósito, así que el
 * usuario nunca selecciona un artículo sin ficha asociada.
 */
export const lineaMovimientoSchema = z.object({
  FK_Stock: z.number().int().positive(),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a 0'),
  observacion: z.string().trim().max(255).optional(),
});

export const createMovimientoSchema = z
  .object({
    // Opcional: si no viene, el service usa la fecha de hoy. Las fechas
    // futuras las rechaza el service (no se puede validar acá contra "ahora"
    // sin acoplar el schema al reloj).
    fecha_movimiento: fechaIsoSchema.optional(),
    FK_TipoMovimiento: z.number().int().positive(),
    FK_Deposito: z.number().int().positive(),
    referencia: z.string().trim().max(255).optional(),
    observaciones: z.string().trim().max(255).optional(),
    detalle: z
      .array(lineaMovimientoSchema)
      .min(1, 'El movimiento debe tener al menos una línea de detalle'),
  })
  // El frontend ya evita elegir dos veces la misma ficha (la saca del listado
  // de disponibles al seleccionarla), pero se valida igual por si la request
  // llega por fuera de ese flujo. Es una validación de forma, por eso vive en
  // el DTO y no en el service.
  .refine(
    (data) =>
      new Set(data.detalle.map((linea) => linea.FK_Stock)).size ===
      data.detalle.length,
    {
      message:
        'No se puede repetir la misma ficha de stock en el detalle de un movimiento',
      path: ['detalle'],
    },
  );

export class CreateMovimientoDto extends createZodDto(createMovimientoSchema) {}
