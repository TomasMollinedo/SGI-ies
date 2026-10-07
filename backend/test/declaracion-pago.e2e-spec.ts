import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { DeclaracionPagoService } from '../src/modules/comercializacion/declaracion-pago/declaracion-pago.service';
import { CobroService } from '../src/modules/comercializacion/cobro/cobro.service';
import { AlmacenamientoService } from '../src/modules/almacenamiento/almacenamiento.service';
import { Prisma } from '../generated/prisma/client';

interface DeclaracionPagoBody {
  id_declaracion_pago: number;
  estado: string;
  importe: number;
  comprobante_nombre_archivo: string | null;
  comprobante_tipo: string | null;
  tiene_comprobante: boolean;
}

interface ArchivoDePrueba {
  contenido: Buffer;
  filename: string;
  contentType: string;
}

interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

const ENDPOINT = '/api/cliente/declaraciones-pago';

/**
 * Contenidos mínimos con la firma real de cada formato: el tipo del
 * comprobante se valida por contenido (magic numbers), no por el nombre ni
 * por el mimetype que declare el cliente.
 */
const CONTENIDO_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
  'latin1',
);
const CONTENIDO_TXT = Buffer.from('Esto es texto plano, no un PDF.\n');

const PDF_VALIDO: ArchivoDePrueba = {
  contenido: CONTENIDO_PDF,
  filename: 'pago.pdf',
  contentType: 'application/pdf',
};

/**
 * Desglose de las cuotas sueltas que crea este fixture: sin interés (toda la
 * cuota es capital), igual que un plan con TNA 0 % en `calcularPlanPago`. El saldo de
 * capital no forma un cronograma real (cada test crea su propia cuota suelta,
 * no las 10 del plan): alcanza con que sea válido para las columnas NOT NULL.
 */
const DESGLOSE_CUOTA_E2E = {
  importe_capital: new Prisma.Decimal(1000),
  importe_interes: new Prisma.Decimal(0),
  saldo_capital: new Prisma.Decimal(0),
};

/**
 * HU-29: control de acceso (mismo patrón de JWT firmado a mano que
 * cliente.e2e-spec.ts) más un flujo real de punta a punta contra la base —
 * acá lo que importa es que la declaración persista sin tocar
 * CUOTA.saldo_pendiente, algo que un mock no puede confirmar. El fixture
 * arma a mano la cadena PROYECTO → UNIDADFUNCIONAL → PUBLICACIONUNIDAD →
 * PLANEJEMPLO → VENTA → PLANPAGO → CUOTA directo por Prisma (no hay un venta.e2e-spec del
 * que colgarse): el contenido de negocio de cada fila no importa, solo que
 * sea válido para las FK/constraints — la cuota resultante es lo único que
 * el test ejercita.
 */
describe('Declaración de pago (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let jwtClientSecret: string;
  let jwtSecret: string;
  let accessTokenCliente: string;

  let idProyecto: number;
  let idUnidad: number;
  let idPublicacion: number;
  let idPlanEjemplo: number;
  let idPlanPago: number;
  let idVenta: number;
  let idCuota: number;
  let idCliente: number;
  let idFormaPago: number;
  const declaracionesCreadas: number[] = [];

  /**
   * POST multipart como lo manda el frontend. Sin `archivo`, la request va
   * sin la parte `comprobante`.
   */
  const declarar = (importe: number, archivo?: ArchivoDePrueba) => {
    const peticion = request(app.getHttpServer())
      .post(ENDPOINT)
      .set('Authorization', `Bearer ${accessTokenCliente}`)
      .field('FK_cuota', String(idCuota))
      .field('FK_forma_pago', String(idFormaPago))
      .field('importe', String(importe));

    return archivo
      ? peticion.attach('comprobante', archivo.contenido, {
          filename: archivo.filename,
          contentType: archivo.contentType,
        })
      : peticion;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = new JwtService();
    const configService = app.get(ConfigService);
    jwtClientSecret = configService.get<string>('JWT_CLIENT_SECRET')!;
    jwtSecret = configService.get<string>('JWT_SECRET')!;

    const admin = await prisma.uSUARIO.findUniqueOrThrow({
      where: { email: 'admin@axontech.test' },
    });
    const sufijo = Date.now();

    const cliente = await prisma.cLIENTE.create({
      data: {
        email: `cliente-declaracion-${sufijo}@e2e.test`,
        nombre: 'Cliente',
        apellido: 'E2E',
        dni_cuil: `E2E-DNI-${sufijo}`,
        telefono: '1122223333',
      },
    });
    idCliente = cliente.id_cliente;

    const formaPago = await prisma.fORMAPAGO.create({
      data: {
        nombre: `Forma autogestión e2e ${sufijo}`,
        requiere_referencia: false,
        habilitada_autogestion: true,
        FK_usuario_creador: admin.id_usuario,
        FK_usuario_actualizador: admin.id_usuario,
      },
    });
    idFormaPago = formaPago.id_forma_pago;

    const proyecto = await prisma.pROYECTO.create({
      data: {
        codigo: `E2E-DP-${sufijo}`,
        nombre: `Proyecto declaración e2e ${sufijo}`,
        localidad: 'CABA',
        direccion: 'Av. Siempre Viva 742',
        cantidad_unidades_planificadas: 1,
        FK_usuario_creador: admin.id_usuario,
        FK_usuario_actualizador: admin.id_usuario,
      },
    });
    idProyecto = proyecto.id_proyecto;

    const unidad = await prisma.uNIDADFUNCIONAL.create({
      data: {
        FK_proyecto: idProyecto,
        identificador: `UF-DP-${sufijo}`,
        tipologia: 'MONOAMBIENTE',
        superficie_cubierta: new Prisma.Decimal(50),
        costo: new Prisma.Decimal(100000),
        FK_usuario_creador: admin.id_usuario,
        FK_usuario_actualizador: admin.id_usuario,
      },
    });
    idUnidad = unidad.id_unidad_funcional;

    const publicacion = await prisma.pUBLICACIONUNIDAD.create({
      data: {
        FK_unidad_funcional: idUnidad,
        FK_usuario_creador: admin.id_usuario,
        FK_usuario_actualizador: admin.id_usuario,
      },
    });
    idPublicacion = publicacion.id_publicacion;

    const plan = await prisma.pLANEJEMPLO.create({
      data: {
        FK_publicacion: idPublicacion,
        nombre: 'Plan e2e',
        tipo: 'FINANCIADO',
        precio: new Prisma.Decimal(100000),
        anticipo_monto: new Prisma.Decimal(20000),
        cantidad_cuotas: 10,
        periodicidad: 'MENSUAL',
        FK_usuario_creador: admin.id_usuario,
        FK_usuario_actualizador: admin.id_usuario,
      },
    });
    idPlanEjemplo = plan.id_plan_ejemplo;

    const venta = await prisma.vENTA.create({
      data: {
        FK_cliente: idCliente,
        FK_publicacion: idPublicacion,
        FK_plan_ejemplo: idPlanEjemplo,
        precio_congelado: new Prisma.Decimal(100000),
        anticipo_congelado: new Prisma.Decimal(20000),
        tipo_plan_congelado: 'FINANCIADO',
        cantidad_cuotas_congelada: 10,
        periodicidad_congelada: 'MENSUAL',
        FK_usuario_creador: admin.id_usuario,
        FK_usuario_actualizador: admin.id_usuario,
      },
    });
    idVenta = venta.id_venta;

    // Toda venta tiene su plan de pago (T121), con las mismas reglas que
    // `VentaService.crear` para un FINANCIADO sin interés: TNA 0 y valor de
    // cuota igual al importe de la cuota 1.
    const planPago = await prisma.pLANPAGO.create({
      data: {
        FK_venta: idVenta,
        FK_plazo_financiacion: null,
        modalidad: 'FINANCIADO',
        precio_venta: new Prisma.Decimal(100000),
        anticipo_monto: new Prisma.Decimal(20000),
        cantidad_cuotas: 10,
        tasa_nominal_anual: new Prisma.Decimal(0),
        valor_cuota: new Prisma.Decimal(1000),
        FK_usuario_creador: admin.id_usuario,
      },
    });
    idPlanPago = planPago.id_plan_pago;

    const cuota = await prisma.cUOTA.create({
      data: {
        FK_venta: idVenta,
        FK_plan_pago: idPlanPago,
        numero: 1,
        ...DESGLOSE_CUOTA_E2E,
        importe: new Prisma.Decimal(1000),
        fecha_vencimiento: new Date('2027-01-01'),
        saldo_pendiente: new Prisma.Decimal(1000),
        estado: 'PENDIENTE',
      },
    });
    idCuota = cuota.id_cuota;

    accessTokenCliente = jwtService.sign(
      { sub: idCliente, email: cliente.email },
      { secret: jwtClientSecret, expiresIn: '15m' },
    );
  });

  afterAll(async () => {
    // Los comprobantes que este test subió a MinIO: se leen las claves de la
    // base antes de borrar las filas. Si un borrado falla no se cae la suite
    // (queda un objeto suelto en el bucket de desarrollo, nada más).
    const almacenamientoService = app.get(AlmacenamientoService);
    const conComprobante = await prisma.dECLARACIONPAGO.findMany({
      where: {
        id_declaracion_pago: { in: declaracionesCreadas },
        comprobante_ruta: { not: null },
      },
      select: { comprobante_ruta: true },
    });
    for (const { comprobante_ruta } of conComprobante) {
      await almacenamientoService
        .eliminarComprobante(comprobante_ruta!)
        .catch((error: unknown) =>
          console.warn(
            `No se pudo borrar el comprobante de prueba ${comprobante_ruta}`,
            error,
          ),
        );
    }

    // Orden inverso al de creación, por las FK con onDelete Restrict.
    await prisma.dECLARACIONPAGO.deleteMany({
      where: { id_declaracion_pago: { in: declaracionesCreadas } },
    });
    await prisma.cUOTA.delete({ where: { id_cuota: idCuota } });
    await prisma.pLANPAGO.delete({ where: { id_plan_pago: idPlanPago } });
    await prisma.vENTA.delete({ where: { id_venta: idVenta } });
    await prisma.pLANEJEMPLO.delete({
      where: { id_plan_ejemplo: idPlanEjemplo },
    });
    await prisma.pUBLICACIONUNIDAD.delete({
      where: { id_publicacion: idPublicacion },
    });
    await prisma.uNIDADFUNCIONAL.delete({
      where: { id_unidad_funcional: idUnidad },
    });
    await prisma.pROYECTO.delete({ where: { id_proyecto: idProyecto } });
    await prisma.fORMAPAGO.delete({ where: { id_forma_pago: idFormaPago } });
    await prisma.cLIENTE.delete({ where: { id_cliente: idCliente } });
    await app.close();
  });

  it('devuelve 401 sin token', async () => {
    const response = await request(app.getHttpServer())
      .post(ENDPOINT)
      .send({ FK_cuota: idCuota, FK_forma_pago: idFormaPago, importe: 500 });

    expect(response.status).toBe(401);
  });

  it('devuelve 401 con un accessToken de USUARIO interno (firmado con JWT_SECRET, no JWT_CLIENT_SECRET)', async () => {
    const accessTokenUsuario = jwtService.sign(
      { sub: 1, email: 'interno@test.com', rol: 'Administrador' },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    const response = await request(app.getHttpServer())
      .post(ENDPOINT)
      .set('Authorization', `Bearer ${accessTokenUsuario}`)
      .send({ FK_cuota: idCuota, FK_forma_pago: idFormaPago, importe: 500 });

    expect(response.status).toBe(401);
  });

  it('caso feliz: declara sobre una cuota PENDIENTE real, con su comprobante, y no toca CUOTA.saldo_pendiente', async () => {
    const response = await declarar(500, PDF_VALIDO).expect(201);

    const body = response.body as DeclaracionPagoBody;
    declaracionesCreadas.push(body.id_declaracion_pago);
    expect(body.estado).toBe('PENDIENTE');
    expect(body.importe).toBe(500);
    expect(body.tiene_comprobante).toBe(true);
    expect(body.comprobante_nombre_archivo).toBe('pago.pdf');
    expect(body.comprobante_tipo).toBe('application/pdf');
    // La clave del objeto en el bucket no sale de la API.
    expect(body).not.toHaveProperty('comprobante_ruta');

    const cuotaEnBase = await prisma.cUOTA.findUniqueOrThrow({
      where: { id_cuota: idCuota },
    });
    expect(cuotaEnBase.saldo_pendiente.toNumber()).toBe(1000);
    expect(cuotaEnBase.estado).toBe('PENDIENTE');
  });

  it('rechaza con 400 (shape de ApiErrorResponse) si el importe supera el saldo pendiente', async () => {
    const response = await declarar(5000, PDF_VALIDO).expect(400);

    const body = response.body as ApiErrorBody;
    expect(body.statusCode).toBe(400);
    // El mensaje confirma que el 400 lo dio el service (el saldo) y no la
    // validación del archivo.
    expect(body.message).toEqual(expect.stringContaining('saldo pendiente'));
    expect(typeof body.error).toBe('string');
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.path).toBe(ENDPOINT);
  });

  describe('comprobante adjunto (T146)', () => {
    it('sin archivo: 400', async () => {
      const response = await declarar(500).expect(400);

      expect((response.body as ApiErrorBody).statusCode).toBe(400);
    });

    it('un PDF renombrado como .png y declarado image/png se guarda como application/pdf: manda el contenido, no lo que dice el cliente', async () => {
      const response = await declarar(500, {
        contenido: CONTENIDO_PDF,
        filename: 'pago.png',
        contentType: 'image/png',
      }).expect(201);

      const body = response.body as DeclaracionPagoBody;
      declaracionesCreadas.push(body.id_declaracion_pago);
      expect(body.comprobante_tipo).toBe('application/pdf');

      const enBase = await prisma.dECLARACIONPAGO.findUniqueOrThrow({
        where: { id_declaracion_pago: body.id_declaracion_pago },
      });
      expect(enBase.comprobante_tipo).toBe('application/pdf');
      // La extensión de la clave también sale del tipo real.
      expect(enBase.comprobante_ruta).toMatch(/\.pdf$/);
    });

    it('un TXT renombrado como .pdf y declarado application/pdf: 400, y no crea ninguna declaración', async () => {
      const antes = await prisma.dECLARACIONPAGO.count({
        where: { FK_cliente: idCliente },
      });

      await declarar(500, {
        contenido: CONTENIDO_TXT,
        filename: 'pago.pdf',
        contentType: 'application/pdf',
      }).expect(400);

      const despues = await prisma.dECLARACIONPAGO.count({
        where: { FK_cliente: idCliente },
      });
      expect(despues).toBe(antes);
    });

    it('un archivo de más de 5 MB: 413', async () => {
      const grande = Buffer.concat([
        CONTENIDO_PDF,
        Buffer.alloc(5 * 1024 * 1024),
      ]);

      await declarar(500, { ...PDF_VALIDO, contenido: grande }).expect(413);
    });

    it('guarda el nombre con tildes y caracteres fuera de latin1 tal cual, y lo sirve con headers seguros', async () => {
      const nombre = 'constancia año–2026.pdf';
      const alta = await declarar(500, {
        ...PDF_VALIDO,
        filename: nombre,
      }).expect(201);

      const body = alta.body as DeclaracionPagoBody;
      declaracionesCreadas.push(body.id_declaracion_pago);
      expect(body.comprobante_nombre_archivo).toBe(nombre);

      const response = await request(app.getHttpServer())
        .get(`${ENDPOINT}/${body.id_declaracion_pago}/comprobante`)
        .set('Authorization', `Bearer ${accessTokenCliente}`)
        .buffer(true)
        .parse((res, callback) => {
          const partes: Buffer[] = [];
          res.on('data', (parte: Buffer) => partes.push(parte));
          res.on('end', () => callback(null, Buffer.concat(partes)));
        })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.headers['content-disposition']).toBe(
        `inline; filename="constancia a_o_2026.pdf"; filename*=UTF-8''constancia%20a%C3%B1o%E2%80%932026.pdf`,
      );
      expect((response.body as Buffer).equals(CONTENIDO_PDF)).toBe(true);
    });
  });

  /**
   * Integración contra la base real de desarrollo (no mockeada): el test
   * estructural con mocks de `declaracion-pago.service.spec.ts` prueba que
   * `crearInterno` y el update final comparten el mismo `tx`, pero no puede
   * probar el rollback en sí — eso es una garantía de Postgres, no de
   * JavaScript. Acá se fuerza una excepción real DESPUÉS de que
   * `crearInterno` ya escribió dentro de la transacción (parcheando solo
   * `tx.dECLARACIONPAGO.update`, el único paso que falla — todo lo demás
   * corre contra la base de verdad) y se relee la base directamente (no la
   * respuesta del service) para confirmar que el rollback deshizo todo.
   *
   * No hay un patrón `*.integration-spec.ts` en el proyecto: va acá, en el
   * mismo archivo e2e de este dominio, porque ya monta el mismo `AppModule`
   * contra Postgres real y ya tiene el fixture de cliente/forma de pago
   * armado — un archivo aparte solo para este test hubiera sido duplicar
   * ese setup sin necesidad.
   */
  describe('Atomicidad de validar() — integración con Postgres real', () => {
    let declaracionPagoService: DeclaracionPagoService;
    let idUsuarioAdmin: number;
    let idCuotaAtomicidad: number;
    let idDeclaracionAtomicidad: number;

    beforeAll(async () => {
      declaracionPagoService = app.get(DeclaracionPagoService);

      const admin = await prisma.uSUARIO.findUniqueOrThrow({
        where: { email: 'admin@axontech.test' },
      });
      idUsuarioAdmin = admin.id_usuario;

      // Cuota propia, separada de la que usan los tests de arriba, para no
      // depender del orden en que corran.
      const cuota = await prisma.cUOTA.create({
        data: {
          FK_venta: idVenta,
          FK_plan_pago: idPlanPago,
          numero: 2,
          ...DESGLOSE_CUOTA_E2E,
          importe: new Prisma.Decimal(1000),
          fecha_vencimiento: new Date('2027-01-01'),
          saldo_pendiente: new Prisma.Decimal(1000),
          estado: 'PENDIENTE',
        },
      });
      idCuotaAtomicidad = cuota.id_cuota;

      const declaracion = await prisma.dECLARACIONPAGO.create({
        data: {
          FK_cliente: idCliente,
          FK_cuota: idCuotaAtomicidad,
          FK_forma_pago: idFormaPago,
          importe: new Prisma.Decimal(500),
        },
      });
      idDeclaracionAtomicidad = declaracion.id_declaracion_pago;
    });

    afterAll(async () => {
      await prisma.dECLARACIONPAGO.deleteMany({
        where: { id_declaracion_pago: idDeclaracionAtomicidad },
      });
      await prisma.cUOTA.delete({ where: { id_cuota: idCuotaAtomicidad } });
    });

    it('si el update final de DECLARACIONPAGO falla, el rollback real de Postgres deshace también el COBRO y el descuento de saldo que ya había escrito crearInterno', async () => {
      type CallbackTransaccion = (
        tx: Prisma.TransactionClient,
      ) => Promise<unknown>;
      type FnTransaccion = (callback: CallbackTransaccion) => Promise<unknown>;
      // El método real de Prisma es genérico (`<T extends ...>`); acá alcanza
      // con una firma simple para lo único que este test necesita: leer
      // `data.estado` y reenviar el resto tal cual.
      type ArgsUpdateDeclaracion = {
        where: { id_declaracion_pago: number };
        data: { estado?: string; [key: string]: unknown };
      };
      type FnUpdateDeclaracion = (
        args: ArgsUpdateDeclaracion,
      ) => Promise<unknown>;

      // `.bind()` sobre un método sobrecargado/genérico de Prisma pierde su
      // tipo específico (TS lo colapsa a algo laxo) — se reafirma el tipo
      // real acá (pasando por `unknown` porque el método original es
      // genérico y TS no deja convertir directo) para no perder el chequeo
      // estático en el resto del test.
      const transaccionOriginal = prisma.$transaction.bind(
        prisma,
      ) as unknown as FnTransaccion;
      const mensajeFallo =
        'Fallo forzado para probar atomicidad (test de integración)';

      const spy = jest
        .spyOn(prisma, '$transaction')
        .mockImplementation((callback: CallbackTransaccion) =>
          transaccionOriginal((tx) => {
            const updateOriginal = tx.dECLARACIONPAGO.update.bind(
              tx.dECLARACIONPAGO,
            ) as unknown as FnUpdateDeclaracion;

            // Solo intercepta el update FINAL (el que marca VALIDADA): el
            // updateMany del lock y el resto de las escrituras de
            // crearInterno pasan de largo, sin tocar.
            tx.dECLARACIONPAGO.update = ((args: ArgsUpdateDeclaracion) => {
              if (args.data.estado === 'VALIDADA') {
                throw new Error(mensajeFallo);
              }
              return updateOriginal(args);
            }) as unknown as Prisma.TransactionClient['dECLARACIONPAGO']['update'];

            return callback(tx);
          }),
        );

      try {
        await expect(
          declaracionPagoService.validar(
            idDeclaracionAtomicidad,
            idUsuarioAdmin,
          ),
        ).rejects.toThrow(mensajeFallo);
      } finally {
        spy.mockRestore();
      }

      // Las tres confirmaciones, leyendo la base directamente — no la
      // respuesta del service, que en este escenario ni siquiera existe.
      const cobros = await prisma.cOBRO.findMany({
        where: {
          FK_cliente: idCliente,
          detalles: { some: { FK_cuota: idCuotaAtomicidad } },
        },
      });
      expect(cobros).toHaveLength(0);

      const cuotaEnBase = await prisma.cUOTA.findUniqueOrThrow({
        where: { id_cuota: idCuotaAtomicidad },
      });
      expect(cuotaEnBase.saldo_pendiente.toNumber()).toBe(1000);
      expect(cuotaEnBase.estado).toBe('PENDIENTE');

      const declaracionEnBase = await prisma.dECLARACIONPAGO.findUniqueOrThrow({
        where: { id_declaracion_pago: idDeclaracionAtomicidad },
      });
      expect(declaracionEnBase.estado).toBe('PENDIENTE');
    });
  });

  /**
   * Integración contra Postgres real (sin mocks de Prisma): cruza HU-29
   * (validar) con HU-30 (anular un cobro). El único test de este describe
   * confirma dos cosas en dos momentos distintos:
   * 1) Justo después de validar (antes de anular): que crearInterno generó
   *    de verdad un COBRO CONFIRMADO de origen ECOMMERCE, con su
   *    DETALLECOBRO (snapshot de saldo correcto) y la CUOTA ya descontada
   *    — no solo mockeado, como en el spec unitario.
   * 2) Después de anular: que DeclaracionPagoService no interfiere con el
   *    mecanismo de anulación ya existente de CobroService — la
   *    declaración queda como registro histórico de que en algún momento
   *    SÍ fue validada, aunque el cobro que generó después se haya anulado
   *    (ver comentario de `FK_cobro` en el schema de DECLARACIONPAGO: "si
   *    ese cobro se anula después, esta declaración sigue VALIDADA como
   *    registro histórico").
   */
  describe('validar() → anular() (integración con Postgres real, HU-29 + HU-30)', () => {
    let declaracionPagoService: DeclaracionPagoService;
    let cobroService: CobroService;
    let idUsuarioAdmin: number;
    let idCuotaValidarAnular: number;
    let idDeclaracionValidarAnular: number;
    let idCobroValidarAnular: number | undefined;

    beforeAll(async () => {
      declaracionPagoService = app.get(DeclaracionPagoService);
      cobroService = app.get(CobroService);

      const admin = await prisma.uSUARIO.findUniqueOrThrow({
        where: { email: 'admin@axontech.test' },
      });
      idUsuarioAdmin = admin.id_usuario;

      // Cuota y declaración propias, separadas de las que usan los demás
      // tests de este archivo, para no depender del orden en que corran.
      const cuota = await prisma.cUOTA.create({
        data: {
          FK_venta: idVenta,
          FK_plan_pago: idPlanPago,
          numero: 4,
          ...DESGLOSE_CUOTA_E2E,
          importe: new Prisma.Decimal(1000),
          fecha_vencimiento: new Date('2027-01-01'),
          saldo_pendiente: new Prisma.Decimal(1000),
          estado: 'PENDIENTE',
        },
      });
      idCuotaValidarAnular = cuota.id_cuota;

      const declaracion = await prisma.dECLARACIONPAGO.create({
        data: {
          FK_cliente: idCliente,
          FK_cuota: idCuotaValidarAnular,
          FK_forma_pago: idFormaPago,
          importe: new Prisma.Decimal(500),
        },
      });
      idDeclaracionValidarAnular = declaracion.id_declaracion_pago;
    });

    afterAll(async () => {
      // Orden inverso al de creación, por las FK con onDelete Restrict —
      // DETALLECOBRO antes que COBRO, COBRO antes que CUOTA.
      await prisma.dECLARACIONPAGO.deleteMany({
        where: { id_declaracion_pago: idDeclaracionValidarAnular },
      });
      if (idCobroValidarAnular !== undefined) {
        await prisma.dETALLECOBRO.deleteMany({
          where: { FK_cobro: idCobroValidarAnular },
        });
        await prisma.cOBRO.delete({
          where: { id_cobro: idCobroValidarAnular },
        });
      }
      await prisma.cUOTA.delete({ where: { id_cuota: idCuotaValidarAnular } });
    });

    it('anular el cobro generado al validar no revierte ni "desconecta" la declaración: queda VALIDADA, con el mismo FK_cobro, apuntando a un cobro ANULADO — y el saldo vuelve al valor previo a la validación', async () => {
      const declaracionValidada = await declaracionPagoService.validar(
        idDeclaracionValidarAnular,
        idUsuarioAdmin,
      );
      expect(declaracionValidada.estado).toBe('VALIDADA');
      expect(declaracionValidada.FK_cobro).not.toBeNull();
      idCobroValidarAnular = declaracionValidada.FK_cobro!;

      // Punto intermedio, ANTES de anular: confirma que crearInterno generó
      // de verdad un cobro CONFIRMADO de origen ECOMMERCE, con su detalle
      // (snapshot de saldo correcto), y que la cuota quedó con el saldo
      // posterior ya descontado — no solo que "volvió a estar bien después
      // de anular", sino que estuvo bien inmediatamente después de validar.
      const cobroTrasValidar = await prisma.cOBRO.findUniqueOrThrow({
        where: { id_cobro: idCobroValidarAnular },
      });
      expect(cobroTrasValidar.origen).toBe('ECOMMERCE');
      expect(cobroTrasValidar.estado).toBe('CONFIRMADO');

      const detallesTrasValidar = await prisma.dETALLECOBRO.findMany({
        where: { FK_cobro: idCobroValidarAnular },
      });
      expect(detallesTrasValidar).toHaveLength(1);
      const detalle = detallesTrasValidar[0];
      expect(detalle.FK_cuota).toBe(idCuotaValidarAnular);
      expect(detalle.importe_imputado.toNumber()).toBe(500);
      expect(detalle.saldo_anterior.toNumber()).toBe(1000);
      expect(detalle.saldo_posterior.toNumber()).toBe(500);

      const cuotaTrasValidar = await prisma.cUOTA.findUniqueOrThrow({
        where: { id_cuota: idCuotaValidarAnular },
      });
      expect(cuotaTrasValidar.saldo_pendiente.toNumber()).toBe(
        detalle.saldo_posterior.toNumber(),
      );

      // Mecanismo real de HU-30, sin tocarlo.
      await cobroService.anular(
        idCobroValidarAnular,
        { motivo_anulacion: 'Anulado para probar la integración con HU-29' },
        idUsuarioAdmin,
      );

      // Las tres confirmaciones (a, b, c) y el saldo, leyendo la base
      // directamente — no la respuesta cacheada de `validar()`.
      const declaracionEnBase = await prisma.dECLARACIONPAGO.findUniqueOrThrow({
        where: { id_declaracion_pago: idDeclaracionValidarAnular },
      });
      expect(declaracionEnBase.estado).toBe('VALIDADA');
      expect(declaracionEnBase.FK_cobro).toBe(idCobroValidarAnular);

      const cobroEnBase = await prisma.cOBRO.findUniqueOrThrow({
        where: { id_cobro: idCobroValidarAnular },
      });
      expect(cobroEnBase.estado).toBe('ANULADO');

      const cuotaEnBase = await prisma.cUOTA.findUniqueOrThrow({
        where: { id_cuota: idCuotaValidarAnular },
      });
      expect(cuotaEnBase.saldo_pendiente.toNumber()).toBe(1000);
    });
  });
});
