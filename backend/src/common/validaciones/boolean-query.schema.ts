import { z } from 'zod';

/**
 * Filtro booleano de query param: llega como string ('true'/'false', lo
 * único que puede viajar en un query string) y se convierte al boolean real
 * que espera el `where` de Prisma. Repetido igual en 2+ módulos (comprobantes,
 * cuenta corriente), se extrae acá en vez de reescribirlo en cada uno.
 */
export const booleanQuerySchema = z
  .enum(['true', 'false'])
  .transform((valor) => valor === 'true');
