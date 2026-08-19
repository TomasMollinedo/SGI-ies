import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

interface LoginResponseBody {
  accessToken: string;
  usuario: { email: string };
}

interface MeResponseBody {
  email: string;
}

interface RefreshResponseBody {
  accessToken: string;
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
    app.use(cookieParser());
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
      expect(response.headers['set-cookie']?.[0]).toMatch(/^refreshToken=/);
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

  describe('POST /api/auth/refresh y POST /api/auth/logout', () => {
    it('refresh devuelve un accessToken nuevo usando la cookie del login, y logout revoca la sesión', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(credencialesValidas);
      const { accessToken: accessTokenLogin } = login.body as LoginResponseBody;
      const cookieLogin = login.headers['set-cookie'][0];

      const refresh = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookieLogin);
      const refreshBody = refresh.body as RefreshResponseBody;

      expect(refresh.status).toBe(200);
      expect(refreshBody.accessToken).toEqual(expect.any(String));
      const cookieRefresh = refresh.headers['set-cookie'][0];
      expect(cookieRefresh).toMatch(/^refreshToken=/);

      const logout = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessTokenLogin}`);
      expect(logout.status).toBe(200);

      const refreshTrasLogout = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookieRefresh);
      expect(refreshTrasLogout.status).toBe(401);
    });

    it('refresh devuelve 401 sin cookie', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/auth/refresh',
      );

      expect(response.status).toBe(401);
    });

    it('logout devuelve 401 sin access token', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/auth/logout',
      );

      expect(response.status).toBe(401);
    });
  });
});
