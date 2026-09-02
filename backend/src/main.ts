import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import type { EnvConfig } from './config/env.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvConfig, true>);

  app.setGlobalPrefix('api');

  app.use(cookieParser());

  app.enableCors({
    origin: configService.get('CORS_ORIGIN', { infer: true }),
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('IES Constructora — API')
    .setDescription('API del backend de gestión para IES Constructora')
    .addBearerAuth()
    .addCookieAuth('refreshToken')
    .addTag(
      'Auth',
      `
Esquema de doble token:

1. \`POST /auth/login\` devuelve un \`accessToken\` de vida corta en el body (el frontend lo guarda en memoria, nunca en localStorage) y setea una cookie \`httpOnly\` \`refreshToken\` de vida larga que el frontend no toca directamente.
2. Cada request a un endpoint protegido manda el \`accessToken\` como \`Authorization: Bearer <token>\`.
3. Cuando ese \`accessToken\` expira (401), el frontend llama a \`POST /auth/refresh\` una vez — la cookie \`httpOnly\` se manda sola si el request va con \`credentials: 'include'\` — y reintenta el request original con el \`accessToken\` nuevo. Cada refresh rota también el refresh token.
4. \`POST /auth/logout\` revoca la sesión del lado del servidor (invalida el refresh token) y limpia la cookie; el frontend debe descartar el \`accessToken\` en memoria por su cuenta.

Todas las llamadas a \`/auth/*\` desde el frontend necesitan \`credentials: 'include'\` para que el browser envíe/reciba la cookie \`refreshToken\`.`,
    )
    .addTag('Compras', 'Proveedores, órdenes de compra y tipos de comprobante.')
    .addTag('Tesorería', 'Formas de pago, comprobantes y órdenes de pago.')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, cleanupOpenApiDoc(document));

  await app.listen(configService.get('PORT', { infer: true }));
}
void bootstrap();
