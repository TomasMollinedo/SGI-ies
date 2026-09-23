import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
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
});
