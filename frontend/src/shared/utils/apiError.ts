import type { ApiErrorResponse, ValidationIssue } from '@/shared/types/api.types'

function esArrayDeValidationIssues(message: unknown): message is ValidationIssue[] {
  return (
    Array.isArray(message) &&
    message.length > 0 &&
    typeof message[0] === 'object' &&
    message[0] !== null &&
    'campo' in message[0]
  )
}

/** Traduce el `message` del ApiErrorResponse (string, array de strings o de ValidationIssue) a un texto legible. */
export function formatearMensajeError(message: ApiErrorResponse['message']): string {
  if (typeof message === 'string') {
    return message
  }
  if (esArrayDeValidationIssues(message)) {
    return message.map((issue) => `${issue.campo}: ${issue.error}`).join(', ')
  }
  if (Array.isArray(message)) {
    return message.join(', ')
  }
  return 'Ocurrió un error inesperado.'
}
