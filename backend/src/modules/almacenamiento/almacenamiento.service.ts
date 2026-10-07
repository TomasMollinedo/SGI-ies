import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import type { EnvConfig } from '../../config/env.schema';
import { extensionDelComprobante } from './comprobante.constants';

@Injectable()
export class AlmacenamientoService {
  private readonly logger = new Logger(AlmacenamientoService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly bucketComprobantes: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    this.bucket = this.configService.get('STORAGE_BUCKET', { infer: true });
    this.bucketComprobantes = this.configService.get(
      'STORAGE_BUCKET_COMPROBANTES',
      { infer: true },
    );
    this.publicUrl = this.configService.get('STORAGE_PUBLIC_URL', {
      infer: true,
    });

    const endpoint = this.configService.get('STORAGE_ENDPOINT', {
      infer: true,
    });
    const port = this.configService.get('STORAGE_PORT', { infer: true });

    this.s3 = new S3Client({
      endpoint: `http://${endpoint}:${port}`,
      // MinIO no usa regiones reales, pero el SDK de AWS exige mandar una.
      region: 'us-east-1',
      // Sin esto, el SDK arma URLs tipo "bucket.localhost", que no existe:
      // MinIO espera el bucket como parte del path ("localhost/bucket").
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.get('STORAGE_ACCESS_KEY', {
          infer: true,
        }),
        secretAccessKey: this.configService.get('STORAGE_SECRET_KEY', {
          infer: true,
        }),
      },
    });
  }

  async subirImagen(file: Express.Multer.File): Promise<{ url: string }> {
    const extension = file.originalname.split('.').pop();
    const key = `${randomUUID()}${extension ? `.${extension}` : ''}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return { url: `${this.publicUrl}/${key}` };
  }

  /**
   * Sube un comprobante al bucket privado. Devuelve la clave del objeto (la
   * ruta que se guarda en la declaración), nunca una URL pública.
   *
   * `file.mimetype` tiene que ser el tipo real del archivo (el controller lo
   * pisa con el detectado por contenido): de ahí salen la extensión y el
   * `ContentType` del objeto. Si no está en la whitelist no se sube nada.
   */
  async subirComprobante(file: Express.Multer.File): Promise<{ ruta: string }> {
    const extension = extensionDelComprobante(file.mimetype);
    if (!extension) {
      throw new BadRequestException(
        'El comprobante tiene que ser un PDF, un JPG o un PNG',
      );
    }
    const key = `${randomUUID()}.${extension}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketComprobantes,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return { ruta: key };
  }

  /**
   * Lee un comprobante del bucket privado. Si el objeto no está (la base
   * apunta a una clave que el bucket ya no tiene), responde 404 en vez de 500
   * y lo deja logueado: es una inconsistencia que hay que revisar.
   */
  async leerComprobante(ruta: string): Promise<{ contenido: Buffer }> {
    try {
      const respuesta = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucketComprobantes, Key: ruta }),
      );

      return {
        contenido: Buffer.from(await respuesta.Body!.transformToByteArray()),
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'NoSuchKey') {
        this.logger.error(
          `El comprobante "${ruta}" figura en la base pero no existe en el bucket "${this.bucketComprobantes}"`,
        );
        throw new NotFoundException('El comprobante no está disponible');
      }
      throw error;
    }
  }

  async eliminarComprobante(ruta: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucketComprobantes, Key: ruta }),
    );
  }
}
