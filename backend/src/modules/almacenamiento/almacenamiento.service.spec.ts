import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { AlmacenamientoService } from './almacenamiento.service';
import type { EnvConfig } from '../../config/env.schema';
import {
  REGEX_TIPOS_COMPROBANTE,
  extensionDelComprobante,
} from './comprobante.constants';

/**
 * Solo la parte de comprobantes (T146). No hay MinIO de por medio: se
 * reemplaza `S3Client.send`, que es el único punto de contacto con el bucket.
 */
describe('AlmacenamientoService — comprobantes', () => {
  let service: AlmacenamientoService;
  let send: jest.SpyInstance;

  const configuracion: Record<string, string | number> = {
    STORAGE_BUCKET: 'ies-imagenes',
    STORAGE_BUCKET_COMPROBANTES: 'ies-comprobantes',
    STORAGE_PUBLIC_URL: 'http://localhost:9000/ies-imagenes',
    STORAGE_ENDPOINT: 'localhost',
    STORAGE_PORT: 9000,
    STORAGE_ACCESS_KEY: 'clave',
    STORAGE_SECRET_KEY: 'secreto',
  };

  const archivo = (mimetype: string) =>
    ({
      originalname: 'pago.pdf',
      mimetype,
      buffer: Buffer.from('contenido'),
    }) as Express.Multer.File;

  beforeEach(() => {
    send = jest
      .spyOn(S3Client.prototype, 'send')
      .mockImplementation(() => ({}));
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    service = new AlmacenamientoService({
      get: (clave: string) => configuracion[clave],
    } as unknown as ConfigService<EnvConfig, true>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('subirComprobante', () => {
    it('sube al bucket privado con la extensión y el ContentType del tipo real', async () => {
      const { ruta } = await service.subirComprobante(archivo('image/png'));

      expect(ruta).toMatch(/^[0-9a-f-]{36}\.png$/);
      const comando = (send.mock.calls as [PutObjectCommand][])[0][0];
      expect(comando).toBeInstanceOf(PutObjectCommand);
      expect(comando.input).toMatchObject({
        Bucket: 'ies-comprobantes',
        Key: ruta,
        ContentType: 'image/png',
      });
    });

    it.each(['text/html', 'image/svg+xml', 'image/png+algo', ''])(
      'rechaza el mimetype "%s", fuera de la whitelist, sin subir nada',
      async (mimetype) => {
        await expect(
          service.subirComprobante(archivo(mimetype)),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(send).not.toHaveBeenCalled();
      },
    );
  });

  describe('leerComprobante', () => {
    it('devuelve el contenido del objeto', async () => {
      send.mockImplementation(() => ({
        Body: { transformToByteArray: () => new Uint8Array([1, 2, 3]) },
      }));

      const { contenido } = await service.leerComprobante('clave.pdf');

      expect(contenido).toEqual(Buffer.from([1, 2, 3]));
    });

    it('si el objeto no existe en el bucket (NoSuchKey), responde 404 y lo loguea', async () => {
      const noSuchKey = Object.assign(new Error('The key does not exist'), {
        name: 'NoSuchKey',
      });
      send.mockImplementation(() => {
        throw noSuchKey;
      });

      await expect(service.leerComprobante('clave.pdf')).rejects.toThrow(
        new NotFoundException('El comprobante no está disponible'),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('clave.pdf'),
      );
    });

    it('cualquier otro error del almacenamiento se propaga tal cual (no se disfraza de 404)', async () => {
      const errorDeRed = new Error('ECONNREFUSED');
      send.mockImplementation(() => {
        throw errorDeRed;
      });

      await expect(service.leerComprobante('clave.pdf')).rejects.toBe(
        errorDeRed,
      );
    });
  });

  describe('eliminarComprobante', () => {
    it('borra el objeto del bucket privado', async () => {
      await service.eliminarComprobante('clave.pdf');

      const comando = (send.mock.calls as [DeleteObjectCommand][])[0][0];
      expect(comando).toBeInstanceOf(DeleteObjectCommand);
      expect(comando.input).toEqual({
        Bucket: 'ies-comprobantes',
        Key: 'clave.pdf',
      });
    });
  });
});

describe('constantes del comprobante', () => {
  it('la regex de tipos está anclada: solo matchea los tres tipos exactos', () => {
    expect(REGEX_TIPOS_COMPROBANTE.source).toBe(
      '^(application\\/pdf|image\\/jpeg|image\\/png)$',
    );
    expect('application/pdf').toMatch(REGEX_TIPOS_COMPROBANTE);
    expect('image/png+xml').not.toMatch(REGEX_TIPOS_COMPROBANTE);
    expect('ximage/png').not.toMatch(REGEX_TIPOS_COMPROBANTE);
  });

  it('extensionDelComprobante devuelve undefined para un tipo desconocido', () => {
    expect(extensionDelComprobante('image/jpeg')).toBe('jpg');
    expect(extensionDelComprobante('text/html')).toBeUndefined();
    // Una clave heredada de Object.prototype no cuenta como tipo permitido.
    expect(extensionDelComprobante('constructor')).toBeUndefined();
  });
});
