import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

/**
 * Filtro global de excepciones. Da formato consistente a los errores HTTP:
 * - ZodValidationException (nestjs-zod): detalle de issues por campo, útil para el frontend.
 * - Excepciones propias de Nest (NotFoundException, ConflictException, etc.): formato estándar.
 * - Cualquier otra excepción no controlada: 500, loggeado con Logger.
 */
@Catch()
export class HttpExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as ZodError;
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: zodError.issues.map((issue) => ({
          campo: issue.path.join('.'),
          error: issue.message,
        })),
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as { message?: string | string[] }).message ??
            exception.message);
      // Vía de escape explícita para datos extra en el body del error (ej.
      // `id_publicacion_vigente` al rechazar una republicación): el service
      // tira `new ConflictException({ message, datos: {...} })` y esa única
      // clave se propaga tal cual. A propósito NO se hace spread de todo
      // `exceptionResponse`: ZodValidationException (nestjs-zod) trae su
      // propio `errors`, y expandirlo cambiaría el contrato de todas las
      // respuestas de validación del sistema.
      const datos =
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'datos' in exceptionResponse
          ? { datos: exceptionResponse.datos }
          : {};

      response.status(status).json({
        statusCode: status,
        message,
        error: exception.name,
        timestamp: new Date().toISOString(),
        path: request.url,
        ...datos,
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
