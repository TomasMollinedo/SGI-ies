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
import { Prisma } from '../generated/prisma/client';

interface DeclaracionPagoBody {
  id_declaracion_pago: number;
  estado: string;
  importe: number;
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
 * HU-29: control de acceso (mismo patrón de JWT firmado a mano que
 * cliente.e2e-spec.ts) más un flujo real de punta a punta contra la base —
 * acá lo que importa es que la declaración persista sin tocar
 * CUOTA.saldo_pendiente, algo que un mock no puede confirmar. El fixture
 * arma a mano la cadena PROYECTO → UNIDADFUNCIONAL → PUBLICACIONUNIDAD →
 * PLANPAGO → VENTA → CUOTA directo por Prisma (no hay un venta.e2e-spec del
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
  let idPlanPago: number;
  let idVenta: number;
  let idCuota: number;
  let idCliente: number;
  let idFormaPago: number;
  const declaracionesCreadas: number[] = [];

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

    const plan = await prisma.pLANPAGO.create({
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
    idPlanPago = plan.id_plan_pago;

    const venta = await prisma.vENTA.create({
      data: {
        FK_cliente: idCliente,
        FK_publicacion: idPublicacion,
        FK_plan_pago: idPlanPago,
        precio_congelado: new Prisma.Decimal(100000),
        anticipo_congelado: new Prisma.Decimal(20000),
        tipo_plan_congelado: 'FINANCIADO',
        cantidad_cuotas_congelada: 10,
        periodicidad_congelada: 'MENSUAL',
        FK_usuario_creador: admin.id_usuario,
      },
    });
    idVenta = venta.id_venta;

    const cuota = await prisma.cUOTA.create({
      data: {
        FK_venta: idVenta,
        numero: 1,
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
    // Orden inverso al de creación, por las FK con onDelete Restrict.
    await prisma.dECLARACIONPAGO.deleteMany({
      where: { id_declaracion_pago: { in: declaracionesCreadas } },
    });
    await prisma.cUOTA.delete({ where: { id_cuota: idCuota } });
    await prisma.vENTA.delete({ where: { id_venta: idVenta } });
    await prisma.pLANPAGO.delete({ where: { id_plan_pago: idPlanPago } });
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

  it('caso feliz: declara sobre una cuota PENDIENTE real y no toca CUOTA.saldo_pendiente', async () => {
    const response = await request(app.getHttpServer())
      .post(ENDPOINT)
      .set('Authorization', `Bearer ${accessTokenCliente}`)
      .send({ FK_cuota: idCuota, FK_forma_pago: idFormaPago, importe: 500 })
      .expect(201);

    const body = response.body as DeclaracionPagoBody;
    expect(body.estado).toBe('PENDIENTE');
    expect(body.importe).toBe(500);
    declaracionesCreadas.push(body.id_declaracion_pago);

    const cuotaEnBase = await prisma.cUOTA.findUniqueOrThrow({
      where: { id_cuota: idCuota },
    });
    expect(cuotaEnBase.saldo_pendiente.toNumber()).toBe(1000);
    expect(cuotaEnBase.estado).toBe('PENDIENTE');
  });

  it('rechaza con 400 (shape de ApiErrorResponse) si el importe supera el saldo pendiente', async () => {
    const response = await request(app.getHttpServer())
      .post(ENDPOINT)
      .set('Authorization', `Bearer ${accessTokenCliente}`)
      .send({ FK_cuota: idCuota, FK_forma_pago: idFormaPago, importe: 5000 })
      .expect(400);

    const body = response.body as ApiErrorBody;
    expect(body.statusCode).toBe(400);
    expect(typeof body.error).toBe('string');
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.path).toBe(ENDPOINT);
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
          numero: 2,
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
          numero: 4,
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
