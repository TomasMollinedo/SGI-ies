import { ejecutarSeed } from './seed-ejecutar';
import { sembrarCuentaCorrientePrueba } from './seed-cuenta-corriente-prueba';
import { sembrarComercializacion } from './seed-comercializacion';
import { sembrarClientePrueba } from './seed-t112-cliente1';
import { sembrarTablero } from './seed-tablero';

/**
 * Todos los datos de prueba en un solo comando:
 *   npm run seed:prueba
 *
 * Corre, en orden y con una sola conexión, los seeds de prueba que van
 * encima de `prisma/seed.ts` (que tiene que haber corrido antes, con
 * `npx prisma db seed`):
 * 1. Cuenta corriente de proveedores: proveedores, comprobantes y pagos.
 * 2. Comercialización: proyectos, unidades, publicaciones, ventas, cobros y
 *    declaraciones de pago.
 * 3. Cliente de prueba para el portal (`SEED_CLIENTE_EMAIL`).
 * 4. Tablero del Gerente: ventas del año anterior, para que los ingresos y
 *    sus variaciones se vean completos.
 *
 * Los cuatro son idempotentes, así que este comando también lo es. Cada uno
 * se puede seguir corriendo suelto con su propio `npm run seed:...`.
 * `seed-muestra.ts` (Almacén) queda aparte a propósito: no es idempotente.
 */
ejecutarSeed(async (prisma) => {
  await sembrarCuentaCorrientePrueba(prisma);
  await sembrarComercializacion(prisma);
  await sembrarClientePrueba(prisma);
  await sembrarTablero(prisma);
});
