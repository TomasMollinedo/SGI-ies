import {
  BadRequestException,
  Controller,
  INestApplication,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpExceptionFilter } from '../../../common/filters/http-exception.filter';
import { MAX_TAMANO_COMPROBANTE_BYTES } from '../../almacenamiento/comprobante.constants';
import { ComprobanteInterceptor } from './comprobante.interceptor';

/** Un endpoint mínimo: solo el interceptor, sin base ni autenticación. */
@Controller('prueba')
class ControllerDePrueba {
  @Post()
  @UseInterceptors(ComprobanteInterceptor)
  subir(
    @UploadedFile() comprobante: Express.Multer.File | undefined,
    @Query('fallar') fallar?: string,
  ) {
    if (fallar) {
      throw new BadRequestException('Error del handler');
    }
    return { tamano: comprobante?.size ?? null };
  }
}

interface ErrorBody {
  message: unknown;
}

describe('ComprobanteInterceptor', () => {
  let app: INestApplication<App>;

  const UNICO = [
    {
      campo: 'comprobante',
      error: 'Adjuntá un único archivo en el campo comprobante',
    },
  ];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ControllerDePrueba],
      providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('acepta un archivo de exactamente 5 MB', async () => {
    const response = await request(app.getHttpServer())
      .post('/prueba')
      .attach(
        'comprobante',
        Buffer.alloc(MAX_TAMANO_COMPROBANTE_BYTES),
        'a.pdf',
      )
      .expect(201);

    expect(response.body).toEqual({ tamano: MAX_TAMANO_COMPROBANTE_BYTES });
  });

  it('un byte más de 5 MB: 413 con el error en español en el campo comprobante', async () => {
    const response = await request(app.getHttpServer())
      .post('/prueba')
      .attach(
        'comprobante',
        Buffer.alloc(MAX_TAMANO_COMPROBANTE_BYTES + 1),
        'a.pdf',
      )
      .expect(413);

    expect((response.body as ErrorBody).message).toEqual([
      {
        campo: 'comprobante',
        error: 'El comprobante no puede superar los 5 MB',
      },
    ]);
  });

  it('el archivo en otro campo: 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/prueba')
      .attach('archivo', Buffer.from('hola'), 'a.pdf')
      .expect(400);

    expect((response.body as ErrorBody).message).toEqual(UNICO);
  });

  it('más de un archivo: 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/prueba')
      .attach('comprobante', Buffer.from('uno'), 'a.pdf')
      .attach('comprobante', Buffer.from('dos'), 'b.pdf')
      .expect(400);

    expect((response.body as ErrorBody).message).toEqual(UNICO);
  });

  it('no toca los errores del handler', async () => {
    const response = await request(app.getHttpServer())
      .post('/prueba?fallar=1')
      .attach('comprobante', Buffer.from('hola'), 'a.pdf')
      .expect(400);

    expect((response.body as ErrorBody).message).toBe('Error del handler');
  });

  it('sin archivo deja pasar la request: que falte lo valida el service', async () => {
    const response = await request(app.getHttpServer())
      .post('/prueba')
      .field('otro', 'dato')
      .expect(201);

    expect(response.body).toEqual({ tamano: null });
  });
});
