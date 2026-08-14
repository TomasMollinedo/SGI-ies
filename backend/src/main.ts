import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import type { EnvConfig } from './config/env.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvConfig, true>);

  app.enableCors({ origin: configService.get('CORS_ORIGIN', { infer: true }) });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('IES Constructora — API')
    .setDescription('API del backend de gestión para IES Constructora')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, cleanupOpenApiDoc(document));

  await app.listen(configService.get('PORT', { infer: true }));
}
void bootstrap();
