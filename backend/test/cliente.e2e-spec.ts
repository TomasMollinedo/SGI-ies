import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ClienteAuthService } from '../src/modules/comercializacion/cliente-auth/cliente-auth.service';

interface LoginResponseBody {
  accessToken: string;
  cliente: { email: string };
}

interface RefreshResponseBody {
  accessToken: string;
}

/**
 * No llama a Google real: ClienteAuthService se mockea entero, así que estos
 * tests verifican el wiring de la capa de API (Public/PublicCliente/
 * ClienteAuthGuard/strategy 'jwt-cliente'), no la lógica de negocio del
 * service (eso ya lo cubre cliente-auth.service.spec.ts).
 */
describe('Cliente (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let jwtClientSecret: string;
  let jwtSecret: string;

  const clientePerfilMock = {
    id: 1,
    nombre: 'Ana',
    apellido: 'Pérez',
    email: 'cliente@test.com',
    dni_cuil: null,
    telefono: null,
  };

  const clienteAuthServiceMock: Record<string, jest.Mock> = {
    loginConGoogle: jest.fn().mockResolvedValue({
      accessToken: 'access-token-cliente',
      refreshToken: 'refresh-token-cliente',
      cliente: clientePerfilMock,
    }),
    refresh: jest.fn().mockResolvedValue({
      accessToken: 'access-token-cliente-nuevo',
      refreshToken: 'refresh-token-cliente-nuevo',
    }),
    logout: jest.fn().mockResolvedValue(undefined),
    perfil: jest.fn().mockResolvedValue(clientePerfilMock),
    actualizarDatos: jest.fn().mockResolvedValue({
      ...clientePerfilMock,
      dni_cuil: '20123456789',
      telefono: '1122223333',
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ClienteAuthService)
      .useValue(clienteAuthServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    await app.init();

    jwtService = new JwtService();
    const configService = app.get(ConfigService);
    jwtClientSecret = configService.get<string>('JWT_CLIENT_SECRET')!;
    jwtSecret = configService.get<string>('JWT_SECRET')!;
  });

  afterEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/cliente/login', () => {
    it('no requiere ningún token (público) y setea la cookie refreshTokenCliente', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/cliente/login')
        .send({ idToken: 'id-token-de-google' });

      const body = response.body as LoginResponseBody;
      expect(response.status).toBe(200);
      expect(body.accessToken).toBe('access-token-cliente');
      expect(body.cliente.email).toBe(clientePerfilMock.email);
      expect(response.headers['set-cookie']?.[0]).toMatch(
        /^refreshTokenCliente=/,
      );
      expect(clienteAuthServiceMock.loginConGoogle).toHaveBeenCalledWith(
        'id-token-de-google',
      );
    });

    it('devuelve 400 si falta idToken', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/cliente/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/cliente/refresh', () => {
    it('devuelve 401 sin cookie, sin llamar al service', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/cliente/refresh',
      );

      expect(response.status).toBe(401);
      expect(clienteAuthServiceMock.refresh).not.toHaveBeenCalled();
    });

    it('renueva el accessToken con la cookie refreshTokenCliente', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/cliente/refresh')
        .set('Cookie', 'refreshTokenCliente=un-refresh-token');

      const body = response.body as RefreshResponseBody;
      expect(response.status).toBe(200);
      expect(body.accessToken).toBe('access-token-cliente-nuevo');
      expect(response.headers['set-cookie']?.[0]).toMatch(
        /^refreshTokenCliente=/,
      );
    });
  });

  describe('GET /api/cliente/me', () => {
    it('devuelve 401 sin token', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/cliente/me',
      );

      expect(response.status).toBe(401);
    });

    it('devuelve 401 con un accessToken de USUARIO (firmado con JWT_SECRET, no JWT_CLIENT_SECRET)', async () => {
      const accessTokenUsuario = jwtService.sign(
        { sub: 1, email: 'interno@test.com', rol: 'Administrador' },
        { secret: jwtSecret, expiresIn: '15m' },
      );

      const response = await request(app.getHttpServer())
        .get('/api/cliente/me')
        .set('Authorization', `Bearer ${accessTokenUsuario}`);

      expect(response.status).toBe(401);
    });

    it('devuelve 200 con un accessToken de CLIENTE válido', async () => {
      const accessTokenCliente = jwtService.sign(
        { sub: clientePerfilMock.id, email: clientePerfilMock.email },
        { secret: jwtClientSecret, expiresIn: '15m' },
      );

      const response = await request(app.getHttpServer())
        .get('/api/cliente/me')
        .set('Authorization', `Bearer ${accessTokenCliente}`);

      expect(response.status).toBe(200);
      expect((response.body as { email: string }).email).toBe(
        clientePerfilMock.email,
      );
      expect(clienteAuthServiceMock.perfil).toHaveBeenCalledWith(
        clientePerfilMock.id,
      );
    });
  });

  describe('Aislamiento entre auth de CLIENTE y auth interna (USUARIO)', () => {
    it('un accessToken de CLIENTE válido devuelve 401 contra un endpoint interno protegido (GET /api/auth/me)', async () => {
      const accessTokenCliente = jwtService.sign(
        { sub: clientePerfilMock.id, email: clientePerfilMock.email },
        { secret: jwtClientSecret, expiresIn: '15m' },
      );

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessTokenCliente}`);

      // 401 y no 403: JwtAuthGuard (strategy 'jwt') rechaza la firma antes de
      // llegar a RolesGuard — un token de CLIENTE nunca pasa a la etapa de
      // roles en un endpoint interno.
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/cliente/logout', () => {
    it('devuelve 401 sin token', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/cliente/logout',
      );

      expect(response.status).toBe(401);
    });

    it('revoca la sesión y limpia la cookie con un accessToken de CLIENTE válido', async () => {
      const accessTokenCliente = jwtService.sign(
        { sub: clientePerfilMock.id, email: clientePerfilMock.email },
        { secret: jwtClientSecret, expiresIn: '15m' },
      );

      const response = await request(app.getHttpServer())
        .post('/api/cliente/logout')
        .set('Authorization', `Bearer ${accessTokenCliente}`);

      expect(response.status).toBe(200);
      expect(clienteAuthServiceMock.logout).toHaveBeenCalledWith(
        clientePerfilMock.id,
      );
    });
  });

  describe('PATCH /api/cliente/me', () => {
    it('devuelve 401 sin token', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/cliente/me')
        .send({ telefono: '1122223333' });

      expect(response.status).toBe(401);
    });

    it('devuelve 400 si no se envía dni_cuil ni telefono', async () => {
      const accessTokenCliente = jwtService.sign(
        { sub: clientePerfilMock.id, email: clientePerfilMock.email },
        { secret: jwtClientSecret, expiresIn: '15m' },
      );

      const response = await request(app.getHttpServer())
        .patch('/api/cliente/me')
        .set('Authorization', `Bearer ${accessTokenCliente}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('actualiza dni_cuil/telefono con un accessToken de CLIENTE válido', async () => {
      const accessTokenCliente = jwtService.sign(
        { sub: clientePerfilMock.id, email: clientePerfilMock.email },
        { secret: jwtClientSecret, expiresIn: '15m' },
      );

      const response = await request(app.getHttpServer())
        .patch('/api/cliente/me')
        .set('Authorization', `Bearer ${accessTokenCliente}`)
        .send({ dni_cuil: '20123456789', telefono: '1122223333' });

      expect(response.status).toBe(200);
      expect(clienteAuthServiceMock.actualizarDatos).toHaveBeenCalledWith(
        clientePerfilMock.id,
        { dni_cuil: '20123456789', telefono: '1122223333' },
      );
    });
  });
});
