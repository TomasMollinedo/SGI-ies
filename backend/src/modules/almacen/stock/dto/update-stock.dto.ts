import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// El stock actual (cantidad) NO es editable acá: solo lo tocan los
// movimientos (HU-07). El estado se maneja con /baja y /alta, no acá

export const updateStockSchema = z.object({
  umbral_minimo: z.number().int().min(0).optional(),
  observaciones: z.string().trim().max(255).nullable().optional(),
});

export class UpdateStockDto extends createZodDto(updateStockSchema) {}
