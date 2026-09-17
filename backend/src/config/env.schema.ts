import { z } from 'zod';

/**
 * Schema de variables de entorno. Se valida al arrancar la app (ver AppModule)
 * para que el server falle rápido si falta o está mal una variable obligatoria,
 * en vez de romper más adelante en el primer request que la necesite.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().min(1).default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET debe tener al menos 16 caracteres'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
  CORS_ORIGIN: z.url('CORS_ORIGIN debe ser una URL válida'),
  STORAGE_ENDPOINT: z
    .string()
    .min(1, 'STORAGE_ENDPOINT es obligatoria'),
  STORAGE_PORT: z.coerce.number().default(9000),
  STORAGE_ACCESS_KEY: z
    .string()
    .min(1, 'STORAGE_ACCESS_KEY es obligatoria'),
  STORAGE_SECRET_KEY: z
    .string()
    .min(1, 'STORAGE_SECRET_KEY es obligatoria'),
  STORAGE_BUCKET: z.string().min(1, 'STORAGE_BUCKET es obligatoria'),
  STORAGE_PUBLIC_URL: z.url('STORAGE_PUBLIC_URL debe ser una URL válida'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const detalle = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Variables de entorno inválidas o faltantes:\n${detalle}`);
  }

  if (result.data.JWT_SECRET === result.data.JWT_REFRESH_SECRET) {
    throw new Error(
      'Variables de entorno inválidas:\nJWT_REFRESH_SECRET debe ser distinto de JWT_SECRET',
    );
  }

  return result.data;
}
