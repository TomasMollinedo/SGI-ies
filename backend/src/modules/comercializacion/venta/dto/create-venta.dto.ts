import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Datos del cliente al vender presencial. Acá los cuatro campos son
 * obligatorios (a diferencia del modelo CLIENTE, donde son opcionales para
 * el alta por Google) — sin poder contactarlo en persona no tiene sentido
 * la venta. Si el cliente ya existe (por dni_cuil o email), estos datos no
 * pisan los que ya tenía cargados: solo sirven para crearlo si es nuevo.
 */
const clienteVentaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  apellido: z.string().trim().min(1).optional(),
  dni_cuil: z.string().trim().min(1, 'El DNI/CUIL es obligatorio'),
  email: z.email('El correo debe ser una dirección válida'),
  telefono: z.string().trim().min(1, 'El teléfono es obligatorio'),
});

export const createVentaSchema = z.object({
  cliente: clienteVentaSchema,
  FK_publicacion: z.number().int().positive(),
  FK_plan_pago: z.number().int().positive(),
});

export class CreateVentaDto extends createZodDto(createVentaSchema) {}
