import { ArgumentsHost, ConflictException, Logger } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let status: jest.Mock;
  let json: jest.Mock;
  let host: ArgumentsHost;

  const cuerpoRespondido = () =>
    (json.mock.calls as unknown[][])[0][0] as Record<string, unknown>;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/publicaciones' }),
      }),
    } as unknown as ArgumentsHost;
    filter = new HttpExceptionFilter();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('una HttpException con `datos` propaga `datos` tal cual en el body', () => {
    filter.catch(
      new ConflictException({
        message: 'Ya existe una publicación vigente',
        datos: { id_publicacion_vigente: 5 },
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(cuerpoRespondido()).toEqual({
      statusCode: 409,
      message: 'Ya existe una publicación vigente',
      error: 'ConflictException',
      timestamp: expect.any(String) as string,
      path: '/api/publicaciones',
      datos: { id_publicacion_vigente: 5 },
    });
  });

  it('una HttpException sin `datos` no agrega la clave `datos`', () => {
    filter.catch(
      new ConflictException('La publicación ya fue despublicada.'),
      host,
    );

    const cuerpo = cuerpoRespondido();
    expect(cuerpo).not.toHaveProperty('datos');
    expect(Object.keys(cuerpo).sort()).toEqual(
      ['error', 'message', 'path', 'statusCode', 'timestamp'].sort(),
    );
    expect(cuerpo.message).toBe('La publicación ya fue despublicada.');
  });

  it('una excepción de validación de nestjs-zod queda exactamente como antes: sin errors ni campos nuevos', () => {
    const resultado = z.object({ motivo: z.string().min(1) }).safeParse({});
    const excepcion = new ZodValidationException(resultado.error!);

    filter.catch(excepcion, host);

    expect(status).toHaveBeenCalledWith(400);
    const cuerpo = cuerpoRespondido();
    expect(Object.keys(cuerpo).sort()).toEqual(
      ['error', 'message', 'path', 'statusCode', 'timestamp'].sort(),
    );
    expect(cuerpo).not.toHaveProperty('errors');
    expect(cuerpo).not.toHaveProperty('datos');
    expect(cuerpo.error).toBe('Bad Request');
    expect(cuerpo.message).toEqual([
      { campo: 'motivo', error: expect.any(String) as string },
    ]);
  });

  it('una excepción que no es HttpException responde 500 con el mensaje genérico', () => {
    filter.catch(new Error('falla interna con datos sensibles'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(cuerpoRespondido()).toEqual({
      statusCode: 500,
      message: 'Error interno del servidor',
      error: 'Internal Server Error',
      timestamp: expect.any(String) as string,
      path: '/api/publicaciones',
    });
  });
});
