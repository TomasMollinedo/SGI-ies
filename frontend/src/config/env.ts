import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.url('VITE_API_URL debe ser una URL válida'),
})

function validarEnv(config: Record<string, unknown>) {
  const resultado = envSchema.safeParse(config)

  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Variables de entorno inválidas o faltantes:\n${detalle}`)
  }

  return resultado.data
}

const parsedEnv = validarEnv(import.meta.env)

export const env = {
  apiUrl: parsedEnv.VITE_API_URL,
} as const
