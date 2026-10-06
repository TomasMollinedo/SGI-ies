import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ClienteAdminService } from './cliente-admin.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
import { updateClienteAdminSchema } from './dto/update-cliente-admin.dto';
import { queryClienteAdminSchema } from './dto/query-cliente-admin.dto';

/** Primer argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = {
  data?: Record<string, unknown>;
  where?: Record<string, unknown>;
  orderBy?: unknown;
  select?: Record<string, unknown>;
  skip?: number;
  take?: number;
};

const primerArgumento = (mock: jest.Mock): ArgumentoPrisma =>
  (mock.mock.calls as ArgumentoPrisma[][])[0][0];

describe('ClienteAdminService', () => {
  let service: ClienteAdminService;
  let prisma: {
    cLIENTE: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    vENTA: { findMany: jest.Mock };
    cOBRO: { findMany: jest.Mock };
    dECLARACIONPAGO: { findMany: jest.Mock };
    cONSULTAUNIDAD: { findMany: jest.Mock };
  };

  const USUARIO_ID = 7;
  const ID_CLIENTE = 3;

  /** Cliente "provisional": sin cuenta de Google vinculada. */
  const clienteSinGoogle = {
    id_cliente: ID_CLIENTE,
    nombre: 'Juan',
    apellido: 'Perez',
    dni_cuil: '30712345678',
    email: 'juan@ejemplo.com',
    telefono: '3875551234',
    google_sub: null,
    hora_creacion: new Date('2026-01-10T12:00:00Z'),
    hora_actualizacion: null,
    FK_usuario_actualizador: null,
    usuarioActualizador: null,
  };

  const clienteConGoogle = {
    ...clienteSinGoogle,
    google_sub: 'google-sub-123',
  };

  /**
   * Cuota tal como la selecciona `calcularIndicadores`: solo saldo y
   * vencimiento (el estado se filtra en el `where`, no se trae).
   */
  const cuota = (saldo: number, fechaVencimiento: string) => ({
    saldo_pendiente: new Prisma.Decimal(saldo),
    fecha_vencimiento: new Date(fechaVencimiento),
  });

  const ventaVigenteCon = (
    idCliente: number,
    cuotas: ReturnType<typeof cuota>[],
  ) => ({ FK_cliente: idCliente, planPago: { cuotas } });

  const listar = (filtros: Record<string, unknown> = {}) =>
    service.listar(queryClienteAdminSchema.parse(filtros));

  const actualizar = (datos: Record<string, unknown>) =>
    service.actualizar(
      ID_CLIENTE,
      updateClienteAdminSchema.parse(datos),
      USUARIO_ID,
    );

  beforeEach(async () => {
    prisma = {
      cLIENTE: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(clienteSinGoogle),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(clienteSinGoogle),
        count: jest.fn().mockResolvedValue(0),
      },
      vENTA: { findMany: jest.fn().mockResolvedValue([]) },
      cOBRO: { findMany: jest.fn().mockResolvedValue([]) },
      dECLARACIONPAGO: { findMany: jest.fn().mockResolvedValue([]) },
      cONSULTAUNIDAD: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClienteAdminService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ClienteAdminService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('listar — datos e indicadores', () => {
    it('deriva tiene_cuenta_google de google_sub y nunca expone el id de Google', async () => {
      prisma.cLIENTE.findMany.mockResolvedValue([
        clienteConGoogle,
        { ...clienteSinGoogle, id_cliente: 4 },
      ]);
      prisma.cLIENTE.count.mockResolvedValue(2);

      const resultado = await listar();

      expect(resultado.data[0].tiene_cuenta_google).toBe(true);
      expect(resultado.data[1].tiene_cuenta_google).toBe(false);
      expect(resultado.data[0]).not.toHaveProperty('google_sub');
    });

    it('cuenta las ventas vigentes y suma el saldo pendiente de sus cuotas', async () => {
      prisma.cLIENTE.findMany.mockResolvedValue([clienteSinGoogle]);
      prisma.cLIENTE.count.mockResolvedValue(1);
      prisma.vENTA.findMany.mockResolvedValue([
        ventaVigenteCon(ID_CLIENTE, [
          cuota(1000.5, '2099-01-01T03:00:00Z'),
          cuota(2000, '2099-02-01T03:00:00Z'),
        ]),
        ventaVigenteCon(ID_CLIENTE, [cuota(500, '2099-03-01T03:00:00Z')]),
      ]);

      const resultado = await listar();

      expect(resultado.data[0].cantidad_ventas_vigentes).toBe(2);
      expect(resultado.data[0].saldo_total_pendiente).toBe(3500.5);
    });

    it('solo pide las ventas VIGENTE y las cuotas no anuladas: una venta cancelada no suma saldo ni cuenta', async () => {
      prisma.cLIENTE.findMany.mockResolvedValue([clienteSinGoogle]);
      prisma.cLIENTE.count.mockResolvedValue(1);

      await listar();

      // Las canceladas y sus cuotas ANULADA quedan afuera en el `where`, que
      // es lo único que un Prisma mockeado puede verificar.
      const argumento = primerArgumento(prisma.vENTA.findMany);
      expect(argumento.where).toEqual({
        FK_cliente: { in: [ID_CLIENTE] },
        estado: 'VIGENTE',
      });
      expect(argumento.select?.planPago).toEqual({
        select: {
          cuotas: {
            where: { estado: { not: 'ANULADA' } },
            select: { saldo_pendiente: true, fecha_vencimiento: true },
          },
        },
      });
    });

    it('marca en mora al cliente con una cuota vencida con saldo pendiente', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-24T13:00:00Z'));
      prisma.cLIENTE.findMany.mockResolvedValue([clienteSinGoogle]);
      prisma.cLIENTE.count.mockResolvedValue(1);
      prisma.vENTA.findMany.mockResolvedValue([
        ventaVigenteCon(ID_CLIENTE, [cuota(1000, '2026-09-23T03:00:00Z')]),
      ]);

      const resultado = await listar();

      expect(resultado.data[0].en_mora).toBe(true);
    });

    it('no marca en mora al cliente que está al día: la cuota que vence hoy todavía no está vencida', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-24T13:00:00Z'));
      prisma.cLIENTE.findMany.mockResolvedValue([clienteSinGoogle]);
      prisma.cLIENTE.count.mockResolvedValue(1);
      prisma.vENTA.findMany.mockResolvedValue([
        ventaVigenteCon(ID_CLIENTE, [
          cuota(1000, '2026-09-24T03:00:00Z'), // vence hoy
          cuota(2000, '2026-10-24T03:00:00Z'), // vence el mes que viene
        ]),
      ]);

      const resultado = await listar();

      expect(resultado.data[0].en_mora).toBe(false);
    });

    it('una cuota saldada no genera mora aunque su fecha ya haya pasado', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-24T13:00:00Z'));
      prisma.cLIENTE.findMany.mockResolvedValue([clienteSinGoogle]);
      prisma.cLIENTE.count.mockResolvedValue(1);
      prisma.vENTA.findMany.mockResolvedValue([
        ventaVigenteCon(ID_CLIENTE, [cuota(0, '2026-01-01T03:00:00Z')]),
      ]);

      const resultado = await listar();

      expect(resultado.data[0].en_mora).toBe(false);
      expect(resultado.data[0].saldo_total_pendiente).toBe(0);
    });

    it('un cliente sin compras sale con los tres indicadores en cero', async () => {
      prisma.cLIENTE.findMany.mockResolvedValue([clienteSinGoogle]);
      prisma.cLIENTE.count.mockResolvedValue(1);
      prisma.vENTA.findMany.mockResolvedValue([]);

      const resultado = await listar();

      expect(resultado.data[0]).toMatchObject({
        cantidad_ventas_vigentes: 0,
        saldo_total_pendiente: 0,
        en_mora: false,
      });
    });

    it('resuelve los indicadores de toda la página en una sola consulta de ventas, no una por cliente', async () => {
      prisma.cLIENTE.findMany.mockResolvedValue([
        { ...clienteSinGoogle, id_cliente: 1 },
        { ...clienteSinGoogle, id_cliente: 2 },
        { ...clienteSinGoogle, id_cliente: 3 },
      ]);
      prisma.cLIENTE.count.mockResolvedValue(3);
      prisma.vENTA.findMany.mockResolvedValue([
        ventaVigenteCon(1, [cuota(100, '2099-01-01T03:00:00Z')]),
        ventaVigenteCon(3, [cuota(300, '2099-01-01T03:00:00Z')]),
      ]);

      const resultado = await listar();

      expect(prisma.vENTA.findMany).toHaveBeenCalledTimes(1);
      expect(primerArgumento(prisma.vENTA.findMany).where).toMatchObject({
        FK_cliente: { in: [1, 2, 3] },
      });
      expect(resultado.data.map((c) => c.saldo_total_pendiente)).toEqual([
        100, 0, 300,
      ]);
    });

    it('no consulta ventas si la página no trae ningún cliente', async () => {
      prisma.cLIENTE.findMany.mockResolvedValue([]);
      prisma.cLIENTE.count.mockResolvedValue(0);

      const resultado = await listar();

      expect(prisma.vENTA.findMany).not.toHaveBeenCalled();
      expect(resultado).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10 },
      });
    });
  });

  describe('listar — orden y paginación', () => {
    it('ordena por apellido y después nombre, dejando al final a los que no tienen apellido', async () => {
      await listar();

      expect(primerArgumento(prisma.cLIENTE.findMany).orderBy).toEqual([
        { apellido: { sort: 'asc', nulls: 'last' } },
        { nombre: 'asc' },
      ]);
    });

    it('pagina con el contrato del proyecto y cuenta el total con el mismo where', async () => {
      prisma.cLIENTE.count.mockResolvedValue(42);

      const resultado = await listar({ page: '3', limit: '5' });

      const argumento = primerArgumento(prisma.cLIENTE.findMany);
      expect(argumento.skip).toBe(10);
      expect(argumento.take).toBe(5);
      expect(resultado.meta).toEqual({ total: 42, page: 3, limit: 5 });
      // El total sale del MISMO where que la página: ningún filtro se aplica
      // en memoria después de paginar, que daría un total incorrecto.
      expect(primerArgumento(prisma.cLIENTE.count).where).toEqual(
        argumento.where,
      );
    });
  });

  describe('listar — filtros', () => {
    const whereDeListar = () => primerArgumento(prisma.cLIENTE.findMany).where;

    it('sin filtros no arma ninguna condición', async () => {
      await listar();

      expect(whereDeListar()).toEqual({});
    });

    it('busqueda: exige cada palabra en alguno de nombre, apellido, DNI/CUIL o correo', async () => {
      await listar({ busqueda: 'juan perez' });

      expect(whereDeListar()).toEqual({
        AND: [
          {
            OR: [
              {
                AND: [
                  { nombre: { contains: 'juan', mode: 'insensitive' } },
                  { nombre: { contains: 'perez', mode: 'insensitive' } },
                ],
              },
              {
                AND: [
                  { apellido: { contains: 'juan', mode: 'insensitive' } },
                  { apellido: { contains: 'perez', mode: 'insensitive' } },
                ],
              },
              {
                AND: [
                  { dni_cuil: { contains: 'juan', mode: 'insensitive' } },
                  { dni_cuil: { contains: 'perez', mode: 'insensitive' } },
                ],
              },
              {
                AND: [
                  { email: { contains: 'juan', mode: 'insensitive' } },
                  { email: { contains: 'perez', mode: 'insensitive' } },
                ],
              },
            ],
          },
        ],
      });
    });

    it('con_compras=true: solo clientes con alguna venta', async () => {
      await listar({ con_compras: 'true' });

      expect(whereDeListar()).toEqual({ AND: [{ ventas: { some: {} } }] });
    });

    it('con_compras=false: los interesados que nunca compraron', async () => {
      await listar({ con_compras: 'false' });

      expect(whereDeListar()).toEqual({ AND: [{ ventas: { none: {} } }] });
    });

    it('FK_proyecto: clientes con alguna venta en ese proyecto', async () => {
      await listar({ FK_proyecto: '9' });

      expect(whereDeListar()).toEqual({
        AND: [
          {
            ventas: {
              some: {
                publicacion: { unidadFuncional: { FK_proyecto: 9 } },
              },
            },
          },
        ],
      });
    });

    it('en_mora=true: resuelve la mora en el where, con el corte del día argentino', async () => {
      // 10:00 de Argentina del 24/09: el corte es la medianoche de ese día.
      jest.useFakeTimers().setSystemTime(new Date('2026-09-24T13:00:00Z'));

      await listar({ en_mora: 'true' });

      expect(whereDeListar()).toEqual({
        AND: [
          {
            ventas: {
              some: {
                estado: 'VIGENTE',
                planPago: {
                  cuotas: {
                    some: {
                      estado: { not: 'ANULADA' },
                      saldo_pendiente: { gt: 0 },
                      fecha_vencimiento: {
                        lt: new Date('2026-09-24T00:00:00Z'),
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      });
    });

    it('en_mora=false: niega la misma condición en vez de filtrar en memoria', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-24T13:00:00Z'));

      await listar({ en_mora: 'false' });

      const where = whereDeListar() as { AND: { NOT: unknown }[] };
      expect(where.AND).toHaveLength(1);
      expect(where.AND[0].NOT).toMatchObject({
        ventas: { some: { estado: 'VIGENTE' } },
      });
    });

    it('a las 22:00 de Argentina el corte sigue siendo la medianoche de ESE día, no la del siguiente', async () => {
      // 01:00Z del 25/09 son las 22:00 del 24/09 en Argentina.
      jest.useFakeTimers().setSystemTime(new Date('2026-09-25T01:00:00Z'));

      await listar({ en_mora: 'true' });

      const where = whereDeListar() as {
        AND: {
          ventas: {
            some: {
              planPago: {
                cuotas: { some: { fecha_vencimiento: { lt: Date } } };
              };
            };
          };
        }[];
      };
      expect(
        where.AND[0].ventas.some.planPago.cuotas.some.fecha_vencimiento.lt,
      ).toEqual(new Date('2026-09-24T00:00:00Z'));
    });

    it('combina búsqueda con mora: las dos condiciones viajan juntas en el AND', async () => {
      await listar({ busqueda: 'perez', en_mora: 'true' });

      const where = whereDeListar() as { AND: Record<string, unknown>[] };
      expect(where.AND).toHaveLength(2);
      expect(where.AND[0]).toHaveProperty('OR');
      expect(where.AND[1]).toHaveProperty('ventas');
    });

    it('combina con_compras y proyecto sin que una condición pise a la otra', async () => {
      await listar({ con_compras: 'true', FK_proyecto: '9' });

      const where = whereDeListar() as { AND: Record<string, unknown>[] };
      // Las dos navegan por la relación `ventas`: en un solo objeto literal
      // la segunda pisaría a la primera, por eso van en un AND.
      expect(where.AND).toEqual([
        { ventas: { some: {} } },
        {
          ventas: {
            some: { publicacion: { unidadFuncional: { FK_proyecto: 9 } } },
          },
        },
      ]);
    });
  });

  describe('obtenerFicha', () => {
    it('devuelve los datos personales con la fecha de alta y la auditoría de la última modificación', async () => {
      prisma.cLIENTE.findUnique.mockResolvedValue({
        ...clienteSinGoogle,
        hora_actualizacion: new Date('2026-02-01T10:00:00Z'),
        FK_usuario_actualizador: USUARIO_ID,
        usuarioActualizador: { nombre: 'Ana', apellido: 'Gomez' },
      });

      const ficha = await service.obtenerFicha(ID_CLIENTE);

      expect(ficha).toMatchObject({
        id_cliente: ID_CLIENTE,
        nombre: 'Juan',
        apellido: 'Perez',
        dni_cuil: '30712345678',
        email: 'juan@ejemplo.com',
        telefono: '3875551234',
        tiene_cuenta_google: false,
        fecha_alta: '2026-01-10T12:00:00.000Z',
        hora_actualizacion: '2026-02-01T10:00:00.000Z',
        FK_usuario_actualizador: USUARIO_ID,
        usuarioActualizador: { nombre: 'Ana', apellido: 'Gomez' },
      });
    });

    it('404 si no existe un cliente con ese id', async () => {
      prisma.cLIENTE.findUnique.mockResolvedValue(null);

      await expect(service.obtenerFicha(999)).rejects.toThrow(
        NotFoundException,
      );
      // No pide ninguna sección de un cliente que no existe.
      expect(prisma.cOBRO.findMany).not.toHaveBeenCalled();
    });

    it('trae las ventas vigentes y canceladas, con las condiciones leídas del plan de pago', async () => {
      prisma.vENTA.findMany.mockResolvedValue([
        {
          id_venta: 11,
          fecha_venta: new Date('2026-03-01T03:00:00Z'),
          estado: 'VIGENTE',
          planPago: {
            id_plan_pago: 21,
            modalidad: 'FINANCIADO',
            cantidad_cuotas: 12,
            tasa_nominal_anual: new Prisma.Decimal('72.50'),
            cuotas: [
              { saldo_pendiente: new Prisma.Decimal(1000) },
              { saldo_pendiente: new Prisma.Decimal(500.25) },
            ],
          },
          publicacion: {
            unidadFuncional: {
              id_unidad_funcional: 31,
              identificador: '3A',
              tipologia: 'DOS_DORMITORIOS',
              proyecto: { id_proyecto: 41, codigo: 'PR1', nombre: 'Torre I' },
            },
          },
        },
      ]);

      const ficha = await service.obtenerFicha(ID_CLIENTE);

      expect(ficha.ventas[0]).toEqual({
        id_venta: 11,
        id_plan_pago: 21,
        fecha_venta: '2026-03-01T03:00:00.000Z',
        estado: 'VIGENTE',
        modalidad: 'FINANCIADO',
        cantidad_cuotas: 12,
        tasa_nominal_anual: 72.5,
        saldo_pendiente: 1500.25,
        unidad: {
          id_unidad_funcional: 31,
          identificador: '3A',
          tipologia: 'DOS_DORMITORIOS',
        },
        proyecto: { id_proyecto: 41, codigo: 'PR1', nombre: 'Torre I' },
      });
      // Sin filtro de estado: la ficha muestra vigentes Y canceladas.
      expect(primerArgumento(prisma.vENTA.findMany).where).toEqual({
        FK_cliente: ID_CLIENTE,
      });
    });

    it('una venta CONTADO viaja sin cantidad de cuotas ni TNA', async () => {
      prisma.vENTA.findMany.mockResolvedValue([
        {
          id_venta: 12,
          fecha_venta: new Date('2026-03-01T03:00:00Z'),
          estado: 'VIGENTE',
          planPago: {
            id_plan_pago: 22,
            modalidad: 'CONTADO',
            cantidad_cuotas: null,
            tasa_nominal_anual: null,
            cuotas: [{ saldo_pendiente: new Prisma.Decimal(0) }],
          },
          publicacion: {
            unidadFuncional: {
              id_unidad_funcional: 31,
              identificador: '3A',
              tipologia: 'COCHERA',
              proyecto: { id_proyecto: 41, codigo: 'PR1', nombre: 'Torre I' },
            },
          },
        },
      ]);

      const ficha = await service.obtenerFicha(ID_CLIENTE);

      expect(ficha.ventas[0]).toMatchObject({
        modalidad: 'CONTADO',
        cantidad_cuotas: null,
        tasa_nominal_anual: null,
        saldo_pendiente: 0,
      });
    });

    it('una venta sin plan de pago es un dato inconsistente: 500, no una ficha a medias', async () => {
      prisma.vENTA.findMany.mockResolvedValue([
        {
          id_venta: 13,
          fecha_venta: new Date('2026-03-01T03:00:00Z'),
          estado: 'VIGENTE',
          planPago: null,
          publicacion: {
            unidadFuncional: {
              id_unidad_funcional: 31,
              identificador: '3A',
              tipologia: 'COCHERA',
              proyecto: { id_proyecto: 41, codigo: 'PR1', nombre: 'Torre I' },
            },
          },
        },
      ]);

      await expect(service.obtenerFicha(ID_CLIENTE)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('trae los cobros presenciales y del ecommerce, y deja afuera los borradores', async () => {
      prisma.cOBRO.findMany.mockResolvedValue([
        {
          id_cobro: 51,
          fecha_cobro: new Date('2026-04-01T03:00:00Z'),
          importe_total: new Prisma.Decimal('1500.75'),
          origen: 'ECOMMERCE',
          estado: 'CONFIRMADO',
          numero_referencia: 'TR-1',
          formaPago: { id_forma_pago: 2, nombre: 'Transferencia' },
        },
      ]);

      const ficha = await service.obtenerFicha(ID_CLIENTE);

      expect(ficha.cobros[0]).toEqual({
        id_cobro: 51,
        fecha_cobro: '2026-04-01T03:00:00.000Z',
        importe_total: 1500.75,
        origen: 'ECOMMERCE',
        estado: 'CONFIRMADO',
        numero_referencia: 'TR-1',
        forma_pago: { id_forma_pago: 2, nombre: 'Transferencia' },
      });
      expect(primerArgumento(prisma.cOBRO.findMany).where).toEqual({
        FK_cliente: ID_CLIENTE,
        estado: { not: 'BORRADOR' },
      });
    });

    it('trae solo las declaraciones pendientes o rechazadas, con los metadatos del comprobante y nunca su ruta', async () => {
      prisma.dECLARACIONPAGO.findMany.mockResolvedValue([
        {
          id_declaracion_pago: 61,
          hora_creacion: new Date('2026-05-01T12:00:00Z'),
          importe: new Prisma.Decimal('2000.00'),
          estado: 'RECHAZADA',
          numero_referencia: 'REF-9',
          motivo_rechazo: 'No se encontró el pago en el extracto',
          comprobante_ruta: 'comprobantes/2026/61.pdf',
          comprobante_nombre_archivo: 'transferencia.pdf',
          comprobante_tipo: 'application/pdf',
          formaPago: { id_forma_pago: 2, nombre: 'Transferencia' },
          cuota: { id_cuota: 71, numero: 3, planPago: { FK_venta: 11 } },
        },
      ]);

      const ficha = await service.obtenerFicha(ID_CLIENTE);

      expect(ficha.declaraciones[0]).toEqual({
        id_declaracion_pago: 61,
        fecha: '2026-05-01T12:00:00.000Z',
        importe: 2000,
        estado: 'RECHAZADA',
        numero_referencia: 'REF-9',
        motivo_rechazo: 'No se encontró el pago en el extracto',
        forma_pago: { id_forma_pago: 2, nombre: 'Transferencia' },
        cuota: { id_cuota: 71, numero: 3 },
        id_venta: 11,
        comprobante: {
          nombre_archivo: 'transferencia.pdf',
          tipo: 'application/pdf',
        },
      });
      // La clave del objeto en el bucket privado no sale en la respuesta.
      expect(JSON.stringify(ficha.declaraciones[0])).not.toContain(
        'comprobantes/2026/61.pdf',
      );
      expect(primerArgumento(prisma.dECLARACIONPAGO.findMany).where).toEqual({
        FK_cliente: ID_CLIENTE,
        estado: { in: ['PENDIENTE', 'RECHAZADA'] },
      });
    });

    it('una declaración del Sprint 3, sin adjunto, viaja con comprobante en null', async () => {
      prisma.dECLARACIONPAGO.findMany.mockResolvedValue([
        {
          id_declaracion_pago: 62,
          hora_creacion: new Date('2026-05-01T12:00:00Z'),
          importe: new Prisma.Decimal('2000.00'),
          estado: 'PENDIENTE',
          numero_referencia: null,
          motivo_rechazo: null,
          comprobante_ruta: null,
          comprobante_nombre_archivo: null,
          comprobante_tipo: null,
          formaPago: { id_forma_pago: 2, nombre: 'Transferencia' },
          cuota: { id_cuota: 72, numero: 4, planPago: { FK_venta: 11 } },
        },
      ]);

      const ficha = await service.obtenerFicha(ID_CLIENTE);

      expect(ficha.declaraciones[0].comprobante).toBeNull();
    });

    it('trae las consultas sobre unidades con su estado y su respuesta', async () => {
      prisma.cONSULTAUNIDAD.findMany.mockResolvedValue([
        {
          id_consulta: 81,
          hora_creacion: new Date('2026-06-01T12:00:00Z'),
          texto: '¿Tiene cochera?',
          estado: 'RESPONDIDA',
          respuesta: 'Sí, una cubierta',
          fecha_respuesta: new Date('2026-06-02T12:00:00Z'),
          FK_publicacion: 91,
          publicacion: {
            unidadFuncional: {
              id_unidad_funcional: 31,
              identificador: '3A',
              proyecto: { id_proyecto: 41, nombre: 'Torre I' },
            },
          },
        },
      ]);

      const ficha = await service.obtenerFicha(ID_CLIENTE);

      expect(ficha.consultas[0]).toEqual({
        id_consulta: 81,
        fecha: '2026-06-01T12:00:00.000Z',
        texto: '¿Tiene cochera?',
        estado: 'RESPONDIDA',
        respuesta: 'Sí, una cubierta',
        fecha_respuesta: '2026-06-02T12:00:00.000Z',
        FK_publicacion: 91,
        unidad: { id_unidad_funcional: 31, identificador: '3A' },
        proyecto: { id_proyecto: 41, nombre: 'Torre I' },
      });
    });

    it('un cliente sin movimientos devuelve las cuatro secciones vacías, no un error', async () => {
      const ficha = await service.obtenerFicha(ID_CLIENTE);

      expect(ficha.ventas).toEqual([]);
      expect(ficha.cobros).toEqual([]);
      expect(ficha.declaraciones).toEqual([]);
      expect(ficha.consultas).toEqual([]);
    });
  });

  describe('actualizar', () => {
    it('graba el usuario autenticado y la fecha en la auditoría', async () => {
      await actualizar({ nombre: 'Juan Carlos' });

      const argumento = primerArgumento(prisma.cLIENTE.update);
      expect(argumento.where).toEqual({ id_cliente: ID_CLIENTE });
      expect(argumento.data).toMatchObject({
        nombre: 'Juan Carlos',
        FK_usuario_actualizador: USUARIO_ID,
      });
      expect(argumento.data?.hora_actualizacion).toBeInstanceOf(Date);
    });

    it('404 si no existe un cliente con ese id, sin intentar el update', async () => {
      prisma.cLIENTE.findUnique.mockResolvedValue(null);

      await expect(
        service.actualizar(
          999,
          updateClienteAdminSchema.parse({ nombre: 'Juan' }),
          USUARIO_ID,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.cLIENTE.update).not.toHaveBeenCalled();
    });

    it('409 si el DNI/CUIL ya es de otro cliente', async () => {
      prisma.cLIENTE.findFirst.mockResolvedValue({ id_cliente: 99 });

      await expect(actualizar({ dni_cuil: '20111111112' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.cLIENTE.update).not.toHaveBeenCalled();
    });

    it('al validar el DNI/CUIL se excluye al propio cliente, para poder guardar sin cambiarlo', async () => {
      await actualizar({ dni_cuil: '30712345678' });

      expect(primerArgumento(prisma.cLIENTE.findFirst).where).toEqual({
        dni_cuil: '30712345678',
        id_cliente: { not: ID_CLIENTE },
      });
      expect(prisma.cLIENTE.update).toHaveBeenCalled();
    });

    // OBS-26, pendiente de respuesta de las POs: la propuesta del equipo es
    // permitir corregir el DNI/CUIL aunque el cliente ya tenga ventas.
    it('permite corregir el DNI/CUIL de un cliente con ventas: no consulta sus ventas para decidir', async () => {
      await actualizar({ dni_cuil: '20111111112' });

      expect(prisma.cLIENTE.update).toHaveBeenCalled();
      // Las únicas lecturas de VENTA son las de la ficha que devuelve al
      // final, no una validación que bloquee el cambio.
      expect(primerArgumento(prisma.vENTA.findMany).where).toEqual({
        FK_cliente: ID_CLIENTE,
      });
    });

    it('409 si el correo ya es de otro cliente', async () => {
      prisma.cLIENTE.findFirst.mockResolvedValue({ id_cliente: 99 });

      await expect(actualizar({ email: 'otro@ejemplo.com' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.cLIENTE.update).not.toHaveBeenCalled();
    });

    it('rechaza cambiar el correo de un cliente con cuenta de Google vinculada, explicando por qué', async () => {
      prisma.cLIENTE.findUnique.mockResolvedValue(clienteConGoogle);

      await expect(actualizar({ email: 'otro@ejemplo.com' })).rejects.toThrow(
        /cuenta de Google vinculada/,
      );
      await expect(actualizar({ email: 'otro@ejemplo.com' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.cLIENTE.update).not.toHaveBeenCalled();
    });

    it('con cuenta de Google vinculada igual se pueden editar los demás datos', async () => {
      prisma.cLIENTE.findUnique.mockResolvedValue(clienteConGoogle);

      await actualizar({ nombre: 'Juan Carlos', telefono: '3875559999' });

      expect(primerArgumento(prisma.cLIENTE.update).data).toMatchObject({
        nombre: 'Juan Carlos',
        telefono: '3875559999',
      });
    });

    it('rechaza un teléfono que no sea solo dígitos', async () => {
      await expect(actualizar({ telefono: '387 555-1234' })).rejects.toThrow(
        /solo números/,
      );
      expect(prisma.cLIENTE.update).not.toHaveBeenCalled();
    });

    it('devuelve la ficha completa ya actualizada', async () => {
      const resultado = await actualizar({ nombre: 'Juan Carlos' });

      expect(resultado).toHaveProperty('ventas');
      expect(resultado).toHaveProperty('cobros');
      expect(resultado).toHaveProperty('declaraciones');
      expect(resultado).toHaveProperty('consultas');
    });
  });

  describe('DTO de edición', () => {
    const validar = (campos: Record<string, unknown>) =>
      updateClienteAdminSchema.safeParse(campos);

    it('rechaza un body vacío: hay que mandar al menos un dato', () => {
      expect(validar({}).success).toBe(false);
    });

    it('rechaza un DNI/CUIL con puntos o guiones', () => {
      expect(validar({ dni_cuil: '30.712.345-678' }).success).toBe(false);
      expect(validar({ dni_cuil: '30712345678' }).success).toBe(true);
    });

    it('rechaza un correo mal formado y normaliza a minúsculas el válido', () => {
      expect(validar({ email: 'no-es-un-correo' }).success).toBe(false);

      const resultado = validar({ email: '  Juan@Ejemplo.COM ' });
      expect(resultado.success).toBe(true);
      expect(resultado.data?.email).toBe('juan@ejemplo.com');
    });

    // La auditoría es responsabilidad exclusiva del servidor: si viajara en
    // el body, cualquier cliente podría falsificar quién hizo el cambio.
    it('ignora un FK_usuario_actualizador mandado en el body', () => {
      const resultado = validar({
        nombre: 'Juan',
        FK_usuario_actualizador: 999,
      });

      expect(resultado.success).toBe(true);
      expect(resultado.data).not.toHaveProperty('FK_usuario_actualizador');
    });
  });
});
