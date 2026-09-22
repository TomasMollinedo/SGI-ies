import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

interface LoginResponseBody {
  accessToken: string;
  cliente: { id: number; email: string };
}

interface RefreshResponseBody {
  accessToken: string;
}

function mockGooglePayload(payload: {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
}) {
  mockVerifyIdToken.mockResolvedValueOnce({ getPayload: () => payload });
}

/**
 * e2e con ClienteAuthService REAL — a diferencia de test/cliente.e2e-spec.ts,
 * que lo mockea entero para probar solo el wiring de guards/routing, acá se
 * mockea únicamente la verificación de Google (OAuth2Client.verifyIdToken).
 * Todo lo demás corre contra la base real: cubre comportamiento de negocio
 * (alta vs. recuperación sin duplicar, rotación, revocación) y aislamiento,
 * tanto entre CLIENTE y USUARIO como entre dos CLIENTE distintos.
 *
 * Requiere la base de datos migrada (mismo requisito que auth.e2e-spec.ts,
 * que este archivo no toca). Usa emails/google_sub/dni_cuil únicos por
 * corrida (marcaTemporal) para no chocar con datos de corridas anteriores, y
 * borra todo lo que crea en afterAll.
 */
describe('Auth de Cliente (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let jwtSecret: string;

  const marcaTemporal = Date.now();
  const dniCuilUnico = '2' + String(marcaTemporal).slice(-10);
  const idsClientesCreados: number[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    const configService = app.get(ConfigService);
    jwtSecret = configService.get<string>('JWT_SECRET')!;
    jwtService = new JwtService();
  });

  afterEach(() => mockVerifyIdToken.mockReset());

  afterAll(async () => {
    if (idsClientesCreados.length > 0) {
      await prisma.cLIENTE.deleteMany({
        where: { id_cliente: { in: idsClientesCreados } },
      });
    }
    await app.close();
  });

  describe('alta y recuperación por login', () => {
    it('el primer login crea el CLIENTE y el segundo lo recupera sin duplicar', async () => {
      const email = `primer-login-${marcaTemporal}@e2e.test`;
      const googleSub = `google-sub-primer-login-${marcaTemporal}`;

      mockGooglePayload({
        sub: googleSub,
        email,
        given_name: 'E2E',
        family_name: 'Uno',
      });
      const primeraRespuesta = await request(app.getHttpServer())
        .post('/api/cliente/login')
        .send({ idToken: 'token-1' });

      expect(primeraRespuesta.status).toBe(200);
      const primerBody = primeraRespuesta.body as LoginResponseBody;
      expect(primerBody.cliente.email).toBe(email);
      idsClientesCreados.push(primerBody.cliente.id);

      mockGooglePayload({ sub: googleSub, email });
      const segundaRespuesta = await request(app.getHttpServer())
        .post('/api/cliente/login')
        .send({ idToken: 'token-2' });

      expect(segundaRespuesta.status).toBe(200);
      const segundoBody = segundaRespuesta.body as LoginResponseBody;
      expect(segundoBody.cliente.id).toBe(primerBody.cliente.id);

      const totalEnDb = await prisma.cLIENTE.count({
        where: { google_sub: googleSub },
      });
      expect(totalEnDb).toBe(1);
    });
  });

  describe('rechaza id_token de Google inválido', () => {
    it.each([
      ['con firma inválida', new Error('Invalid token signature')],
      ['expirado', new Error('Token used too late')],
      [
        'de otra app (audience distinta)',
        new Error('Wrong recipient, payload audience != requiredAudience'),
      ],
    ])('%s → 401', async (_caso, error) => {
      mockVerifyIdToken.mockRejectedValueOnce(error);

      const response = await request(app.getHttpServer())
        .post('/api/cliente/login')
        .send({ idToken: 'token-cualquiera' });

      expect(response.status).toBe(401);
    });
  });

  describe('refresh', () => {
    it('rota accessToken y refreshToken', async () => {
      const email = `refresh-${marcaTemporal}@e2e.test`;
      const googleSub = `google-sub-refresh-${marcaTemporal}`;
      mockGooglePayload({ sub: googleSub, email });

      const login = await request(app.getHttpServer())
        .post('/api/cliente/login')
        .send({ idToken: 'token-login' });
      const loginBody = login.body as LoginResponseBody;
      idsClientesCreados.push(loginBody.cliente.id);
      const cookieLogin = login.headers['set-cookie'][0];

      const refresh = await request(app.getHttpServer())
        .post('/api/cliente/refresh')
        .set('Cookie', cookieLogin);

      expect(refresh.status).toBe(200);
      const refreshBody = refresh.body as RefreshResponseBody;
      expect(refreshBody.accessToken).toEqual(expect.any(String));
      expect(refreshBody.accessToken).not.toBe(loginBody.accessToken);
      const cookieRefresh = refresh.headers['set-cookie'][0];
      expect(cookieRefresh).toMatch(/^refreshTokenCliente=/);
      expect(cookieRefresh).not.toBe(cookieLogin);
    });
  });

  describe('logout', () => {
    it('revoca la sesión: un refresh posterior con la misma cookie falla', async () => {
      const email = `logout-${marcaTemporal}@e2e.test`;
      const googleSub = `google-sub-logout-${marcaTemporal}`;
      mockGooglePayload({ sub: googleSub, email });

      const login = await request(app.getHttpServer())
        .post('/api/cliente/login')
        .send({ idToken: 'token-login' });
      const loginBody = login.body as LoginResponseBody;
      idsClientesCreados.push(loginBody.cliente.id);
      const cookieLogin = login.headers['set-cookie'][0];

      const logout = await request(app.getHttpServer())
        .post('/api/cliente/logout')
        .set('Authorization', `Bearer ${loginBody.accessToken}`);
      expect(logout.status).toBe(200);

      const refreshTrasLogout = await request(app.getHttpServer())
        .post('/api/cliente/refresh')
        .set('Cookie', cookieLogin);
      expect(refreshTrasLogout.status).toBe(401);
    });
  });

  describe('aislamiento con la auth interna (USUARIO)', () => {
    it('un accessToken de USUARIO no accede a GET /api/cliente/me', async () => {
      const accessTokenUsuario = jwtService.sign(
        { sub: 1, email: 'interno@test.com', rol: 'Administrador' },
        { secret: jwtSecret, expiresIn: '15m' },
      );

      const response = await request(app.getHttpServer())
        .get('/api/cliente/me')
        .set('Authorization', `Bearer ${accessTokenUsuario}`);

      expect(response.status).toBe(401);
    });

    it('un accessToken de CLIENTE no accede a un endpoint interno (GET /api/pagos)', async () => {
      const email = `aislamiento-interno-${marcaTemporal}@e2e.test`;
      const googleSub = `google-sub-aislamiento-interno-${marcaTemporal}`;
      mockGooglePayload({ sub: googleSub, email });

      const login = await request(app.getHttpServer())
        .post('/api/cliente/login')
        .send({ idToken: 'token-login' });
      const loginBody = login.body as LoginResponseBody;
      idsClientesCreados.push(loginBody.cliente.id);

      const response = await request(app.getHttpServer())
        .get('/api/pagos')
        .set('Authorization', `Bearer ${loginBody.accessToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('aislamiento entre clientes', () => {
    it('el token de un cliente solo lee/modifica sus propios datos, nunca los de otro', async () => {
      const emailA = `aislamiento-a-${marcaTemporal}@e2e.test`;
      mockGooglePayload({
        sub: `google-sub-aislamiento-a-${marcaTemporal}`,
        email: emailA,
      });
      const loginA = await request(app.getHttpServer())
        .post('/api/cliente/login')
        .send({ idToken: 'token-a' });
      const clienteA = loginA.body as LoginResponseBody;
      idsClientesCreados.push(clienteA.cliente.id);

      const emailB = `aislamiento-b-${marcaTemporal}@e2e.test`;
      mockGooglePayload({
        sub: `google-sub-aislamiento-b-${marcaTemporal}`,
        email: emailB,
      });
      const loginB = await request(app.getHttpServer())
        .post('/api/cliente/login')
        .send({ idToken: 'token-b' });
      const clienteB = loginB.body as LoginResponseBody;
      idsClientesCreados.push(clienteB.cliente.id);

      // GET /me con el token de A siempre trae los datos de A, nunca los de B.
      const meA = await request(app.getHttpServer())
        .get('/api/cliente/me')
        .set('Authorization', `Bearer ${clienteA.accessToken}`);
      expect(meA.status).toBe(200);
      expect((meA.body as { id: number }).id).toBe(clienteA.cliente.id);

      // PATCH con el token de A solo puede actualizar el registro de A: no
      // hay forma de apuntar a otro cliente por body, el id sale del token.
      const patchA = await request(app.getHttpServer())
        .patch('/api/cliente/me')
        .set('Authorization', `Bearer ${clienteA.accessToken}`)
        .send({ dni_cuil: dniCuilUnico, telefono: '1100000001' });
      expect(patchA.status).toBe(200);

      const clienteBEnDb = await prisma.cLIENTE.findUnique({
        where: { id_cliente: clienteB.cliente.id },
      });
      expect(clienteBEnDb?.dni_cuil).toBeNull();
      expect(clienteBEnDb?.telefono).toBeNull();

      const clienteAEnDb = await prisma.cLIENTE.findUnique({
        where: { id_cliente: clienteA.cliente.id },
      });
      expect(clienteAEnDb?.dni_cuil).toBe(dniCuilUnico);
    });
  });

  describe('PATCH /api/cliente/me — validación de teléfono', () => {
    it('devuelve 400 si el teléfono tiene caracteres que no son dígitos', async () => {
      const email = `telefono-invalido-${marcaTemporal}@e2e.test`;
      mockGooglePayload({
        sub: `google-sub-telefono-invalido-${marcaTemporal}`,
        email,
      });
      const login = await request(app.getHttpServer())
        .post('/api/cliente/login')
        .send({ idToken: 'token-login' });
      const loginBody = login.body as LoginResponseBody;
      idsClientesCreados.push(loginBody.cliente.id);

      const response = await request(app.getHttpServer())
        .patch('/api/cliente/me')
        .set('Authorization', `Bearer ${loginBody.accessToken}`)
        .send({ telefono: '11-2222-3333' });

      expect(response.status).toBe(400);

      const clienteEnDb = await prisma.cLIENTE.findUnique({
        where: { id_cliente: loginBody.cliente.id },
      });
      expect(clienteEnDb?.telefono).toBeNull();
    });
  });
});
