import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Helper compartido por los seeds de prueba. No es un seed: no se ejecuta
 * solo.
 *
 * Abre la conexión con `DATABASE_URL`, corre `sembrar` y la cierra. Si falla,
 * muestra el error y deja el proceso con código 1. Lo usan `seed-prueba.ts`
 * (todos los seeds de prueba en orden) y cada seed cuando se corre suelto.
 */
export function ejecutarSeed(
  sembrar: (prisma: PrismaClient) => Promise<void>,
): void {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  sembrar(prisma)
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
