import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../../common/validaciones/fecha-iso.schema';

/**
 * Una línea del detalle. El `subtotal` no lo manda el cliente: lo calcula el
 * service a partir de `cantidad * precio_unitario`, igual que el `total` de
 * la cabecera.
 */
export const lineaOrdenCompraSchema = z.object({
  FK_articulo: z.number().int().positive(),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  precio_unitario: z.number().positive('El precio unitario debe ser mayor a 0'),
});

export const cabeceraOrdenCompraSchema = z.object({
  // Opcional: si no viene, el service usa la fecha de hoy. Las fechas
  // futuras las rechaza el service (no se puede validar acá contra "ahora"
  // sin acoplar el schema al reloj).
  fecha_emision: fechaIsoSchema.optional(),
  fecha_entrega_solicitada: fechaIsoSchema.optional(),
  observaciones: z.string().trim().max(500).optional(),
  FK_proveedor: z.number().int().positive(),
  FK_deposito: z.number().int().positive(),
});

export const createOrdenCompraSchema = cabeceraOrdenCompraSchema
  .extend({
    // Sin mínimo de líneas acá a propósito: la HU exige al menos una línea
    // recién "antes de confirmarse" (al pasar de BORRADOR a EMITIDA), no al
    // crear. Mientras está en BORRADOR se puede seguir agregando, editando y
    // sacando líneas — ese mínimo lo valida el service en el cambio de
    // estado, no este DTO de creación.
    detalle: z.array(lineaOrdenCompraSchema),
  })
  // La unicidad ya la exige la base (@@unique([FK_orden_compra,
  // FK_articulo])), pero se valida también acá por si la request llega por
  // fuera del flujo normal del formulario — mismo criterio que Movimiento.
  .refine(
    (data) =>
      new Set(data.detalle.map((linea) => linea.FK_articulo)).size ===
      data.detalle.length,
    {
      message:
        'No se puede repetir el mismo artículo en el detalle de una orden de compra',
      path: ['detalle'],
    },
  );

export class CreateOrdenCompraDto extends createZodDto(
  createOrdenCompraSchema,
) {}
