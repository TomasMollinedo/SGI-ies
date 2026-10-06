import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import type { EnvConfig } from '../../config/env.schema';

@Injectable()
export class AlmacenamientoService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    this.bucket = this.configService.get('STORAGE_BUCKET', { infer: true });
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
}
