import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import type { EnvConfig } from '../../config/env.schema';
import { extensionDelComprobante } from './comprobante.constants';

@Injectable()
export class AlmacenamientoService {
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
   */
  async subirComprobante(file: Express.Multer.File): Promise<{ ruta: string }> {
    const key = `${randomUUID()}.${extensionDelComprobante(file.mimetype)}`;

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

  async leerComprobante(ruta: string): Promise<{ contenido: Buffer; tipo: string }> {
    const respuesta = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucketComprobantes, Key: ruta }),
    );

    return {
      contenido: Buffer.from(await respuesta.Body!.transformToByteArray()),
      tipo: respuesta.ContentType ?? 'application/octet-stream',
    };
  }
}
