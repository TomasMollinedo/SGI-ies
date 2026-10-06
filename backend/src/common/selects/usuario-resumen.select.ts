import type { Prisma } from '../../../generated/prisma/client';

/**
 * Nombre y apellido de un USUARIO, para mostrar quién creó o actualizó un
 * registro (o quién lo atendió, validó, etc.) sin exponer el resto de sus
 * datos.
 */
export const USUARIO_RESUMEN_SELECT = {
  nombre: true,
  apellido: true,
} as const satisfies Prisma.USUARIOSelect;
