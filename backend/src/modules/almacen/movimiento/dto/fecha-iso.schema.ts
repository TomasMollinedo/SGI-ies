import { z } from 'zod';

/**
 * Fecha que llega del cliente como texto ISO 8601 y se convierte a `Date`.
 *
 * No se usa `z.coerce.date()` porque un `ZodDate` no se puede representar en
 * JSON Schema y rompe la generación del documento de Swagger al arrancar la
 * app ("Date cannot be represented in JSON Schema"). Acá el schema de entrada
 * es un string, que Swagger sí documenta, y la conversión a `Date` la hace el
 * `.transform()`.
 *
 * Acepta tanto fecha sola (`2026-08-01`) como fecha y hora (`2026-08-01T14:30:00Z`).
 */
export const fechaIsoSchema = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()])
  .transform((valor) => new Date(valor));
