/**
 * Contrato genérico de respuestas del backend. Ningún endpoint de auth lo usa
 * (login/refresh/logout/me devuelven objetos planos, sin envolver en `data`);
 * queda disponible para los módulos de negocio que sí devuelvan este shape.
 */
export interface ApiResponse<T> {
  data: T
  message?: string
}

/** Nombres tomados de la convención de paginación documentada en el backend. */
export interface PaginationMeta {
  total: number
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/** Issue de validación individual devuelto por el ZodValidationException del backend. */
export interface ValidationIssue {
  campo: string
  error: string
}

/** Shape exacto del HttpExceptionFilter global del backend — aplica a todo error HTTP. */
export interface ApiErrorResponse {
  statusCode: number
  message: string | string[] | ValidationIssue[]
  error: string
  timestamp: string
  path: string
}
