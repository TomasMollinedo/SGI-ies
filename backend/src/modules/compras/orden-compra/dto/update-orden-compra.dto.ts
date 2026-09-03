import { createZodDto } from 'nestjs-zod';
import {
  documentoOrdenCompraSchema,
  sinArticulosRepetidos,
} from './create-orden-compra.dto';

/**
 * Solo se usa para editar una orden en BORRADOR (lo valida el service, no
 * este DTO). Si viene `detalle`, reemplaza TODAS las líneas existentes — no
 * es un merge línea por línea; así es como lo espera el formulario único de
 * edición del frontend (cabecera + detalle juntos, un solo "Guardar").
 */
export const updateOrdenCompraSchema = documentoOrdenCompraSchema
  .partial()
  .refine((data) => sinArticulosRepetidos(data.detalle), {
    message:
      'No se puede repetir el mismo artículo en el detalle de una orden de compra',
    path: ['detalle'],
  });

export class UpdateOrdenCompraDto extends createZodDto(
  updateOrdenCompraSchema,
) {}
