import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface LoginResponseBody {
  accessToken: string;
}

interface ListadoResponseBody<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

interface FormaPagoBody {
  id_forma_pago: number;
  nombre: string;
  estado: boolean;
}

type Metodo = 'get' | 'post' | 'patch';

/**
 * Control de acceso de los endpoints de Formas de Pago (HU-15).
 *
 * A diferencia del e2e de Movimientos, que prueba un flujo de negocio, este
 * cubre solo el `@Roles(RolNombre.ADMINISTRADOR)` del controller sobre HTTP
 * real: que sin token todos den 401 y que con un rol que no es el dueño todos
 * den 403. La lógica del guard en sí ya está cubierta a nivel unitario en
 * `src/common/guards/roles.guard.spec.ts`; lo que agrega este archivo es que
 * los guards estén efectivamente enchufados en la app, para los seis
 * endpoints y no solo para el que alguien probó a mano.
 *
 * Requiere la base migrada y el seed corrido (ver prisma/seed.ts): usa los
 * usuarios de prueba de Administrador, Tesorería y Gerencia. La forma de pago
 * contra la que se prueban las rutas `:id` la crea el propio test, con nombre
 * único por corrida, y se borra al final.
 */
describe('Formas de pago — control de acceso (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tokenAdmin: string;
  let tokenTesoreria: string;
  let tokenGerente: string;
  let idFormaPago: number;

  const login = async (email: string) => {
    const respuesta = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'Password123!' })
      .expect(200);
    return (respuesta.body as LoginResponseBody).accessToken;
  };

  /**
   * Los seis endpoints del módulo. `ruta` es una función y no un string
   * porque `idFormaPago` recién existe en el `beforeAll`, mientras que la
   * tabla de `it.each` se arma cuando Jest recolecta los tests.
   */
  const endpoints: {
    nombre: string;
    metodo: Metodo;
    ruta: () => string;
    body?: object;
  }[] = [
    {
      nombre: 'POST /api/formas-pago',
      metodo: 'post',
      ruta: () => '/api/formas-pago',
      // Body válido a propósito: así un 403 no puede confundirse con el 400
      // de un body mal formado.
      body: {
        nombre: `Forma e2e rechazada ${Date.now()}`,
        requiere_referencia: false,
      },
    },
    {
      nombre: 'GET /api/formas-pago',
      metodo: 'get',
      ruta: () => '/api/formas-pago',
    },
    {
      nombre: 'GET /api/formas-pago/:id',
      metodo: 'get',
      ruta: () => `/api/formas-pago/${idFormaPago}`,
    },
    {
      nombre: 'PATCH /api/formas-pago/:id',
      metodo: 'patch',
      ruta: () => `/api/formas-pago/${idFormaPago}`,
      body: { nombre: 'Nombre que no se llega a guardar' },
    },
    {
      nombre: 'PATCH /api/formas-pago/:id/baja',
      metodo: 'patch',
      ruta: () => `/api/formas-pago/${idFormaPago}/baja`,
    },
    {
      nombre: 'PATCH /api/formas-pago/:id/alta',
      metodo: 'patch',
      ruta: () => `/api/formas-pago/${idFormaPago}/alta`,
    },
  ];

  const casos: [string, (typeof endpoints)[number]][] = endpoints.map(
    (endpoint) => [endpoint.nombre, endpoint],
  );

  const pedir = (endpoint: (typeof endpoints)[number], token?: string) => {
    const agente = request(app.getHttpServer());
    const ruta = endpoint.ruta();
    const peticion =
      endpoint.metodo === 'get'
        ? agente.get(ruta)
        : endpoint.metodo === 'post'
          ? agente.post(ruta)
          : agente.patch(ruta);

    if (token) peticion.set('Authorization', `Bearer ${token}`);
    return endpoint.body ? peticion.send(endpoint.body) : peticion;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // main.ts no corre en los tests, así que hay que replicar acá lo que
    // configura del app (prefijo global y cookies).
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);

    tokenAdmin = await login('admin@axontech.test');
    tokenTesoreria = await login('tesoreria@axontech.test');
    tokenGerente = await login('gerente@axontech.test');

    // Que este alta devuelva 201 ya prueba el caso feliz del POST para el rol
    // dueño; el resto de los endpoints necesita un id real contra el cual
    // pegarle.
    const creada = await request(app.getHttpServer())
      .post('/api/formas-pago')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombre: `Forma de pago e2e ${Date.now()}`,
        descripcion: 'Creada por el e2e de control de acceso',
        requiere_referencia: true,
      })
      .expect(201);
    idFormaPago = (creada.body as FormaPagoBody).id_forma_pago;
  });

  afterAll(async () => {
    // Borrado físico solo para no dejar basura del test: la API nunca borra
    // formas de pago, solo las da de baja.
    if (idFormaPago) {
      await prisma.fORMAPAGO.delete({
        where: { id_forma_pago: idFormaPago },
      });
    }
    await app.close();
  });

  describe('sin token', () => {
    it.each(casos)('%s devuelve 401', async (_nombre, endpoint) => {
      await pedir(endpoint).expect(401);
    });

    it('un token mal formado también devuelve 401', async () => {
      await request(app.getHttpServer())
        .get('/api/formas-pago')
        .set('Authorization', 'Bearer no-es-un-jwt')
        .expect(401);
    });
  });

  describe('con un rol que no es el dueño del recurso', () => {
    // El Responsable de Tesorería es el caso interesante: es quien usa las
    // formas de pago para registrar pagos, pero el ABM es del Administrador
    // (mismo criterio que el resto de los datos maestros del proyecto).
    it.each(casos)(
      '%s devuelve 403 para el Responsable de Tesorería',
      async (_nombre, endpoint) => {
        await pedir(endpoint, tokenTesoreria).expect(403);
      },
    );
  });

  describe('con el rol dueño del recurso', () => {
    // Contracara de los dos bloques de arriba: sin esto, un módulo que
    // rechazara todo con 403 pasaría igual los tests de acceso denegado.
    it('el Administrador lista las formas de pago', async () => {
      const respuesta = await request(app.getHttpServer())
        .get('/api/formas-pago')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      const { data, meta } =
        respuesta.body as ListadoResponseBody<FormaPagoBody>;
      expect(meta.total).toBeGreaterThan(0);
      expect(data.some((f) => f.id_forma_pago === idFormaPago)).toBe(true);
    });

    it('el Administrador ve el detalle de una forma de pago', async () => {
      const respuesta = await request(app.getHttpServer())
        .get(`/api/formas-pago/${idFormaPago}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect((respuesta.body as FormaPagoBody).id_forma_pago).toBe(idFormaPago);
    });

    it('el Gerente General entra por su acceso transversal', async () => {
      await request(app.getHttpServer())
        .get('/api/formas-pago')
        .set('Authorization', `Bearer ${tokenGerente}`)
        .expect(200);
    });
  });
});
