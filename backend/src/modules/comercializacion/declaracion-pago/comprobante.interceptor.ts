import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CAMPO_COMPROBANTE,
  errorDelComprobante,
  LIMITE_MULTER_COMPROBANTE_BYTES,
  MENSAJE_COMPROBANTE_MUY_GRANDE,
  MENSAJE_COMPROBANTE_UNICO,
} from '../../almacenamiento/comprobante.constants';

/**
 * El `FileInterceptor` del comprobante, con los errores de multer en español.
 *
 * Se traduce por la clase de la excepción y no por el código de multer: el
 * `FileInterceptor` de Nest ya convirtió el error antes de que llegue acá y
 * del original solo queda el mensaje en inglés. Por eso cualquier 400 del
 * parseo recibe el mismo mensaje: más de un archivo o el archivo en otro
 * campo (los casos reales), y también un multipart mal formado.
 *
 * El `try/catch` solo cubre el parseo: los errores del handler viajan por el
 * observable que devuelve `super.intercept` y pasan sin tocar.
 */
@Injectable()
export class ComprobanteInterceptor extends FileInterceptor(CAMPO_COMPROBANTE, {
  // Multer corta la subida apenas se pasa del límite, sin cargar el archivo
  // entero en memoria (responde 413).
  limits: { fileSize: LIMITE_MULTER_COMPROBANTE_BYTES, files: 1 },
  // Sin esto multer lee el nombre del archivo como latin1 y rompe las tildes
  // y la ñ.
  defParamCharset: 'utf8',
}) {
  async intercept(context: ExecutionContext, next: CallHandler) {
    try {
      return await super.intercept(context, next);
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw new PayloadTooLargeException(
          errorDelComprobante(MENSAJE_COMPROBANTE_MUY_GRANDE),
        );
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(
          errorDelComprobante(MENSAJE_COMPROBANTE_UNICO),
        );
      }
      throw error;
    }
  }
}
