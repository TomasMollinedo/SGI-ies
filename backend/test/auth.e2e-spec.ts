import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

interface LoginResponseBody {
  accessToken: string;
  usuario: { email: string };
}

interface MeResponseBody {
  email: string;
}

/**
 * Requiere la base de datos migrada y el seed del módulo de Autenticación
 * corrido (ver prisma/seed.ts) — usa el usuario de prueba de Almacén.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  const credencialesValidas = {
    email: 'almacen@axontech.test',
    password: 'Password123!',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('devuelve 200 y un accessToken con credenciales válidas', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(credencialesValidas);

      const body = response.body as LoginResponseBody;
      expect(response.status).toBe(200);
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.usuario.email).toBe(credencialesValidas.email);
    });

    it('devuelve 401 con credenciales inválidas', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: credencialesValidas.email, password: 'incorrecta' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('devuelve 401 sin token', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('devuelve 200 con los datos del usuario autenticado', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(credencialesValidas);
      const { accessToken } = login.body as LoginResponseBody;

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      const body = response.body as MeResponseBody;
      expect(response.status).toBe(200);
      expect(body.email).toBe(credencialesValidas.email);
    });
  });
});
