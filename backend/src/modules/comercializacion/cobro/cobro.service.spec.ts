import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CobroService } from './cobro.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PublicacionService } from '../publicacion/publicacion.service';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoComercial } from '../../../../generated/prisma/enums';
import { CreateCobroDto, createCobroSchema } from './dto/create-cobro.dto';
import { AnularCobroDto } from './dto/anular-cobro.dto';
import { QueryCobroDto } from './dto/query-cobro.dto';

/** Primer argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = {
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
};

const primerArgumento = (mock: jest.Mock): ArgumentoPrisma =>
  (mock.mock.calls as ArgumentoPrisma[][])[0][0];

/** Argumento de un `updateMany`/`create` de cuota o cobro dentro de una transacción, ya tipado. */
type ArgumentoTx = {
  where?: { saldo_pendiente?: Prisma.Decimal };
  data: {
    saldo_pendiente?: Prisma.Decimal | { increment: Prisma.Decimal };
    estado?: string;
    saldo_anterior?: Prisma.Decimal;
    saldo_posterior?: Prisma.Decimal;
    importe_imputado?: Prisma.Decimal;
    importe_total?: Prisma.Decimal;
    motivo_anulacion?: string;
  };
};

const argumentoTx = (mock: jest.Mock, llamada = 0): ArgumentoTx =>
  (mock.mock.calls as ArgumentoTx[][])[llamada][0];

const argumentosTx = (mock: jest.Mock): ArgumentoTx[] =>
  (mock.mock.calls as ArgumentoTx[][]).map((llamada) => llamada[0]);

type LineaImputacionCobro = CreateCobroDto['detalle'][number];

/**
 * Los métodos privados se acceden acá con un cast puntual para poder
 * probarlos aislados, mismo criterio que el spec de Pago (T87/T88).
 */
type CobroServicePrivado = {
  buscarCliente(id: number): Promise<{ id_cliente: number }>;
  buscarFormaPagoActiva(
    id: number,
  ): Promise<{ estado: boolean; requiere_referencia: boolean; nombre: string }>;
  validarNumeroReferencia(
    numeroReferencia: string | undefined,
    formaPago: { requiere_referencia: boolean; nombre: string },
  ): void;
  resolverFechaCobro(fecha: Date | undefined): Date;
  buscarCuotasImputables(
    FK_cliente: number,
    detalle: LineaImputacionCobro[],
  ): Promise<Map<number, CuotaAImputar>>;
  validarImportesImputados(
    detalle: LineaImputacionCobro[],
    cuotaPorId: Map<number, CuotaAImputar>,
  ): void;
  validarSumaTotal(detalle: LineaImputacionCobro[], importeTotal: number): void;
  actualizarEstadoVentaSegunSaldo(
    tx: unknown,
    idVenta: number,
    usuarioId: number,
  ): Promise<void>;
};

const privado = (service: CobroService) =>
  service as unknown as CobroServicePrivado;

type CuotaAImputar = {
  id_cuota: number;
  numero: number;
  importe: Prisma.Decimal;
  saldo_pendiente: Prisma.Decimal;
  estado: string;
  FK_venta: number;
  venta: { FK_cliente: number; estado: string; FK_publicacion: number };
};

/** Cuota lista para imputar: venta 1, cliente 1, PENDIENTE, saldo 1000. */
const cuotaAImputar = (
  id: number,
  extra: Partial<CuotaAImputar> = {},
): CuotaAImputar => ({
  id_cuota: id,
  numero: id,
  importe: new Prisma.Decimal(1000),
  saldo_pendiente: new Prisma.Decimal(1000),
  estado: 'PENDIENTE',
  FK_venta: 1,
  venta: { FK_cliente: 1, estado: 'VIGENTE', FK_publicacion: 1 },
  ...extra,
});

const lineaImputacion = (
  FK_cuota: number,
  importe_imputado: number,
): LineaImputacionCobro => ({ FK_cuota, importe_imputado });

describe('CobroService', () => {
  let service: CobroService;
  let tx: {
    cOBRO: { create: jest.Mock; update: jest.Mock };
    cUOTA: {
      updateMany: jest.Mock;
      update: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    dETALLECOBRO: { create: jest.Mock };
    vENTA: { findUniqueOrThrow: jest.Mock };
  };
  let prisma: {
    cLIENTE: { findUnique: jest.Mock };
    fORMAPAGO: { findUnique: jest.Mock };
    cUOTA: { findMany: jest.Mock };
    cOBRO: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };
  let publicaciones: { transicionarEstadoComercial: jest.Mock };

  const ID_CLIENTE = 1;
  const ID_COBRO = 200;
  const USUARIO_ID = 7;

  /** Cabecera completa devuelta por `obtenerDetalle` al final de `crear`/`anular`. */
  const cobroCompleto = (extra: Partial<Record<string, unknown>> = {}) => ({
    id_cobro: ID_COBRO,
    fecha_cobro: new Date('2026-09-15T00:00:00Z'),
    numero_referencia: null,
    importe_total: new Prisma.Decimal(1000),
    observaciones: null,
    origen: 'PRESENCIAL',
    estado: 'CONFIRMADO',
    motivo_anulacion: null,
    hora_creacion: new Date('2026-09-15T00:00:00Z'),
    hora_actualizacion: null,
    FK_cliente: ID_CLIENTE,
    FK_forma_pago: 1,
    FK_usuario_creador: USUARIO_ID,
    FK_usuario_actualizador: USUARIO_ID,
    cliente: {
      id_cliente: ID_CLIENTE,
      nombre: 'Valentina',
      apellido: 'Fernández',
      dni_cuil: '20111111112',
      email: 'valen@test.com',
    },
    formaPago: {
      id_forma_pago: 1,
      nombre: 'Efectivo',
      requiere_referencia: false,
    },
    usuarioCreador: { nombre: 'Ana', apellido: 'Gómez' },
    usuarioActualizador: { nombre: 'Ana', apellido: 'Gómez' },
    detalles: [],
    ...extra,
  });

  /**
   * Cobro CONFIRMADO con su detalle "crudo" (Decimal sin convertir), tal
   * como lo devuelve Prisma con `include: { detalles: true }` — es lo que
   * consume `buscarCobroConfirmado`.
   */
  const cobroConfirmadoConDetalles = (
    detalles: { FK_cuota: number; importe_imputado: Prisma.Decimal }[],
    extra: Partial<Record<string, unknown>> = {},
  ) => ({
    id_cobro: ID_COBRO,
    estado: 'CONFIRMADO',
    detalles,
    ...extra,
  });

  const crearCobroDto = (
    detalle: LineaImputacionCobro[],
    importeTotal: number,
    extra: Partial<CreateCobroDto> = {},
  ): CreateCobroDto => ({
    FK_cliente: ID_CLIENTE,
    FK_forma_pago: 1,
    // Fija, para no depender de la fecha real del sistema al correr el test.
    fecha_cobro: new Date('2026-09-15T00:00:00Z'),
    importe_total: importeTotal,
    detalle,
    ...extra,
  });

  beforeEach(async () => {
    tx = {
      cOBRO: {
        create: jest.fn().mockResolvedValue({ id_cobro: ID_COBRO }),
        update: jest.fn().mockResolvedValue({}),
      },
      // count: 1 = el update aplicó (nadie tocó el saldo entre medio).
      cUOTA: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({
          saldo_pendiente: new Prisma.Decimal(1000),
          importe: new Prisma.Decimal(1000),
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ FK_venta: 1 }),
      },
      dETALLECOBRO: { create: jest.fn().mockResolvedValue({}) },
      vENTA: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          FK_publicacion: 1,
          publicacion: { estado_comercial: EstadoComercial.EN_PLAN_DE_PAGO },
          cuotas: [{ saldo_pendiente: new Prisma.Decimal(0) }],
        }),
      },
    };

    prisma = {
      cLIENTE: {
        findUnique: jest.fn().mockResolvedValue({ id_cliente: ID_CLIENTE }),
      },
      fORMAPAGO: {
        findUnique: jest.fn().mockResolvedValue({
          id_forma_pago: 1,
          nombre: 'Efectivo',
          requiere_referencia: false,
          estado: true,
        }),
      },
      cUOTA: { findMany: jest.fn().mockResolvedValue([]) },
      cOBRO: {
        findUnique: jest.fn().mockResolvedValue(cobroCompleto()),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn((callback: (t: typeof tx) => unknown) =>
        callback(tx),
      ),
    };

    publicaciones = {
      transicionarEstadoComercial: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CobroService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicacionService, useValue: publicaciones },
      ],
    }).compile();

    service = module.get(CobroService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('listarCuotasImputables', () => {
    it('rechaza si el cliente no existe', async () => {
      prisma.cLIENTE.findUnique.mockResolvedValue(null);

      await expect(
        service.listarCuotasImputables({ FK_cliente: 99 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.cUOTA.findMany).not.toHaveBeenCalled();
    });

    it('filtra por cliente, saldo pendiente > 0, no anuladas y venta no cancelada', async () => {
      await service.listarCuotasImputables({ FK_cliente: ID_CLIENTE });

      const argumento = primerArgumento(prisma.cUOTA.findMany);
      expect(argumento.where).toEqual({
        saldo_pendiente: { gt: 0 },
        estado: { not: 'ANULADA' },
        venta: { FK_cliente: ID_CLIENTE, estado: { not: 'CANCELADA' } },
      });
    });

    it('calcula dias_vencido correcto contra una fecha fija, para una cuota vencida', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-21T15:00:00Z'));
      prisma.cUOTA.findMany.mockResolvedValue([
        {
          id_cuota: 1,
          numero: 1,
          fecha_vencimiento: new Date('2026-09-01T00:00:00Z'),
          importe: new Prisma.Decimal(1000),
          saldo_pendiente: new Prisma.Decimal(1000),
          venta: {
            id_venta: 1,
            publicacion: { unidadFuncional: { identificador: 'UF-1' } },
          },
        },
      ]);

      const resultado = await service.listarCuotasImputables({
        FK_cliente: ID_CLIENTE,
      });

      expect(resultado.data[0]).toMatchObject({
        vencido: true,
        dias_vencido: 20,
      });
    });
  });

  describe('listarCuotasVencidas', () => {
    it('sin filtros, solo agrega el criterio de vencidas (fecha_vencimiento < hoy)', async () => {
      await service.listarCuotasVencidas({});

      const argumento = primerArgumento(prisma.cUOTA.findMany);
      expect(argumento.where).toMatchObject({
        saldo_pendiente: { gt: 0 },
        estado: { not: 'ANULADA' },
        venta: { estado: { not: 'CANCELADA' } },
      });
    });

    it('agrega FK_cliente y FK_proyecto al where solo cuando vienen en la query', async () => {
      await service.listarCuotasVencidas({ FK_cliente: 1, FK_proyecto: 5 });

      const argumento = primerArgumento(prisma.cUOTA.findMany) as {
        where: { venta: Record<string, unknown> };
      };
      expect(argumento.where.venta).toMatchObject({
        FK_cliente: 1,
        publicacion: { unidadFuncional: { FK_proyecto: 5 } },
      });
    });

    it('ordena por días de atraso descendente (la más vencida primero)', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-21T12:00:00Z'));
      const cuotaCon = (id: number, fechaVencimiento: string) => ({
        id_cuota: id,
        numero: id,
        fecha_vencimiento: new Date(fechaVencimiento),
        importe: new Prisma.Decimal(1000),
        saldo_pendiente: new Prisma.Decimal(1000),
        venta: {
          id_venta: 1,
          cliente: {
            id_cliente: 1,
            nombre: 'Valentina',
            apellido: 'Fernández',
          },
          publicacion: {
            unidadFuncional: {
              identificador: 'UF-1',
              proyecto: { id_proyecto: 1, nombre: 'Proyecto A' },
            },
          },
        },
      });
      // Poco atrasada, muy atrasada, mediana — a propósito desordenadas.
      prisma.cUOTA.findMany.mockResolvedValue([
        cuotaCon(1, '2026-09-15T00:00:00Z'),
        cuotaCon(2, '2026-08-01T00:00:00Z'),
        cuotaCon(3, '2026-09-01T00:00:00Z'),
      ]);

      const resultado = await service.listarCuotasVencidas({});

      expect(resultado.data.map((c) => c.id_cuota)).toEqual([2, 3, 1]);
    });
  });

  describe('buscarFormaPagoActiva', () => {
    it('rechaza si la forma de pago no existe', async () => {
      prisma.fORMAPAGO.findUnique.mockResolvedValue(null);

      await expect(
        privado(service).buscarFormaPagoActiva(99),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza si la forma de pago está dada de baja', async () => {
      prisma.fORMAPAGO.findUnique.mockResolvedValue({
        id_forma_pago: 1,
        nombre: 'Efectivo',
        requiere_referencia: false,
        estado: false,
      });

      await expect(
        privado(service).buscarFormaPagoActiva(1),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('validarNumeroReferencia (rechazo: referencia faltante)', () => {
    it('rechaza si la forma de pago requiere referencia y no vino ninguna', () => {
      expect(() =>
        privado(service).validarNumeroReferencia(undefined, {
          requiere_referencia: true,
          nombre: 'Transferencia',
        }),
      ).toThrow(BadRequestException);
    });

    it('pasa si vino una referencia, o si la forma de pago no la requiere', () => {
      expect(() =>
        privado(service).validarNumeroReferencia('TR-001', {
          requiere_referencia: true,
          nombre: 'Transferencia',
        }),
      ).not.toThrow();
      expect(() =>
        privado(service).validarNumeroReferencia(undefined, {
          requiere_referencia: false,
          nombre: 'Efectivo',
        }),
      ).not.toThrow();
    });
  });

  describe('resolverFechaCobro', () => {
    it('devuelve hoy si no viene fecha', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-21T12:00:00Z'));

      expect(privado(service).resolverFechaCobro(undefined)).toEqual(
        new Date('2026-09-21T12:00:00Z'),
      );
    });

    it('rechaza una fecha futura', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-21T12:00:00Z'));

      expect(() =>
        privado(service).resolverFechaCobro(new Date('2026-09-22T00:00:00Z')),
      ).toThrow(BadRequestException);
    });
  });

  describe('buscarCuotasImputables (incluye el rechazo: cuota de otro cliente)', () => {
    it('rechaza si alguna cuota no existe', async () => {
      prisma.cUOTA.findMany.mockResolvedValue([cuotaAImputar(1)]);

      await expect(
        privado(service).buscarCuotasImputables(ID_CLIENTE, [
          lineaImputacion(1, 100),
          lineaImputacion(2, 100),
        ]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza una cuota que pertenece a una venta de otro cliente', async () => {
      prisma.cUOTA.findMany.mockResolvedValue([
        cuotaAImputar(1, {
          venta: { FK_cliente: 2, estado: 'VIGENTE', FK_publicacion: 1 },
        }),
      ]);

      await expect(
        privado(service).buscarCuotasImputables(ID_CLIENTE, [
          lineaImputacion(1, 100),
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza una cuota ANULADA', async () => {
      prisma.cUOTA.findMany.mockResolvedValue([
        cuotaAImputar(1, { estado: 'ANULADA' }),
      ]);

      await expect(
        privado(service).buscarCuotasImputables(ID_CLIENTE, [
          lineaImputacion(1, 100),
        ]),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza una cuota de una venta CANCELADA', async () => {
      prisma.cUOTA.findMany.mockResolvedValue([
        cuotaAImputar(1, {
          venta: {
            FK_cliente: ID_CLIENTE,
            estado: 'CANCELADA',
            FK_publicacion: 1,
          },
        }),
      ]);

      await expect(
        privado(service).buscarCuotasImputables(ID_CLIENTE, [
          lineaImputacion(1, 100),
        ]),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza una cuota sin saldo pendiente', async () => {
      prisma.cUOTA.findMany.mockResolvedValue([
        cuotaAImputar(1, { saldo_pendiente: new Prisma.Decimal(0) }),
      ]);

      await expect(
        privado(service).buscarCuotasImputables(ID_CLIENTE, [
          lineaImputacion(1, 100),
        ]),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('acepta cuotas del cliente, no anuladas, de ventas vigentes y con saldo', async () => {
      prisma.cUOTA.findMany.mockResolvedValue([
        cuotaAImputar(1),
        cuotaAImputar(2),
      ]);

      const resultado = await privado(service).buscarCuotasImputables(
        ID_CLIENTE,
        [lineaImputacion(1, 100), lineaImputacion(2, 100)],
      );

      expect(resultado.size).toBe(2);
    });
  });

  describe('validarImportesImputados (rechazo: importe mayor al saldo)', () => {
    it('rechaza un importe que supera el saldo pendiente', () => {
      const cuotaPorId = new Map([
        [1, cuotaAImputar(1, { saldo_pendiente: new Prisma.Decimal(100) })],
      ]);

      expect(() =>
        privado(service).validarImportesImputados(
          [lineaImputacion(1, 150)],
          cuotaPorId,
        ),
      ).toThrow(BadRequestException);
    });

    it('acumula un error por cada cuota que excede su saldo', () => {
      const cuotaPorId = new Map([
        [1, cuotaAImputar(1, { saldo_pendiente: new Prisma.Decimal(100) })],
        [2, cuotaAImputar(2, { saldo_pendiente: new Prisma.Decimal(50) })],
      ]);

      try {
        privado(service).validarImportesImputados(
          [lineaImputacion(1, 150), lineaImputacion(2, 60)],
          cuotaPorId,
        );
        fail('Tenía que rechazar');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as { message: string }).message.split(';').length).toBe(
          2,
        );
      }
    });

    it('pasa si todos los importes están dentro del saldo pendiente', () => {
      const cuotaPorId = new Map([
        [1, cuotaAImputar(1, { saldo_pendiente: new Prisma.Decimal(100) })],
      ]);

      expect(() =>
        privado(service).validarImportesImputados(
          [lineaImputacion(1, 100)],
          cuotaPorId,
        ),
      ).not.toThrow();
    });
  });

  describe('validarSumaTotal (rechazo: la suma no coincide con el total)', () => {
    it('rechaza si la suma del detalle no coincide con el importe total', () => {
      expect(() =>
        privado(service).validarSumaTotal(
          [lineaImputacion(1, 100), lineaImputacion(2, 100)],
          150,
        ),
      ).toThrow(BadRequestException);
    });

    it('pasa si la suma coincide exacto, con decimales', () => {
      expect(() =>
        privado(service).validarSumaTotal(
          [lineaImputacion(1, 100.5), lineaImputacion(2, 99.5)],
          200,
        ),
      ).not.toThrow();
    });
  });

  describe('createCobroSchema (rechazo: importe fuera de rango)', () => {
    // Objeto "crudo" sin `fecha_cobro` (es opcional): el schema real trabaja
    // sobre strings ISO, no sobre `Date` — a diferencia de `crearCobroDto()`,
    // que arma el DTO ya validado que reciben los tests de `service.crear`.
    const dtoCrudo = (
      detalle: LineaImputacionCobro[],
      importeTotal: number,
    ) => ({
      FK_cliente: ID_CLIENTE,
      FK_forma_pago: 1,
      importe_total: importeTotal,
      detalle,
    });

    it('rechaza un importe_total negativo o cero', () => {
      const resultado = createCobroSchema.safeParse(
        dtoCrudo([lineaImputacion(1, 100)], 0),
      );
      expect(resultado.success).toBe(false);
    });

    it('rechaza un importe_imputado con más de dos decimales', () => {
      const resultado = createCobroSchema.safeParse(
        dtoCrudo([lineaImputacion(1, 100.123)], 100.123),
      );
      expect(resultado.success).toBe(false);
    });

    it('rechaza cuotas repetidas en el mismo detalle', () => {
      const resultado = createCobroSchema.safeParse(
        dtoCrudo([lineaImputacion(1, 100), lineaImputacion(1, 100)], 200),
      );
      expect(resultado.success).toBe(false);
    });

    it('acepta un importe_total y un importe_imputado válidos', () => {
      const resultado = createCobroSchema.safeParse(
        dtoCrudo([lineaImputacion(1, 100.5)], 100.5),
      );
      expect(resultado.success).toBe(true);
    });
  });

  describe('crear', () => {
    it('imputación parcial: descuenta el saldo exacto y la cuota queda PARCIAL', async () => {
      prisma.cUOTA.findMany.mockResolvedValue([
        cuotaAImputar(1, { saldo_pendiente: new Prisma.Decimal(1000) }),
      ]);

      await service.crear(
        crearCobroDto([lineaImputacion(1, 300)], 300),
        USUARIO_ID,
      );

      const argUpdate = argumentoTx(tx.cUOTA.updateMany);
      expect(argUpdate.where?.saldo_pendiente).toEqual(
        new Prisma.Decimal(1000),
      );
      expect(argUpdate.data.saldo_pendiente).toEqual(new Prisma.Decimal(700));
      expect(argUpdate.data.estado).toBe('PARCIAL');

      const argDetalle = argumentoTx(tx.dETALLECOBRO.create);
      expect(argDetalle.data.saldo_anterior).toEqual(new Prisma.Decimal(1000));
      expect(argDetalle.data.saldo_posterior).toEqual(new Prisma.Decimal(700));
    });

    it('imputación total: el saldo queda en 0 y la cuota pasa a PAGADA', async () => {
      prisma.cUOTA.findMany.mockResolvedValue([
        cuotaAImputar(1, { saldo_pendiente: new Prisma.Decimal(1000) }),
      ]);

      await service.crear(
        crearCobroDto([lineaImputacion(1, 1000)], 1000),
        USUARIO_ID,
      );

      const argUpdate = argumentoTx(tx.cUOTA.updateMany);
      expect(argUpdate.data.saldo_pendiente).toEqual(new Prisma.Decimal(0));
      expect(argUpdate.data.estado).toBe('PAGADA');
    });

    it('imputación múltiple: un cobro a varias cuotas registra saldo_anterior/posterior por línea', async () => {
      prisma.cUOTA.findMany.mockResolvedValue([
        cuotaAImputar(1, { saldo_pendiente: new Prisma.Decimal(500) }),
        cuotaAImputar(2, { saldo_pendiente: new Prisma.Decimal(300) }),
      ]);

      await service.crear(
        crearCobroDto([lineaImputacion(1, 500), lineaImputacion(2, 100)], 600),
        USUARIO_ID,
      );

      expect(tx.cUOTA.updateMany).toHaveBeenCalledTimes(2);
      expect(tx.dETALLECOBRO.create).toHaveBeenCalledTimes(2);

      const detalles = argumentosTx(tx.dETALLECOBRO.create);
      expect(detalles[0].data).toMatchObject({
        saldo_anterior: new Prisma.Decimal(500),
        saldo_posterior: new Prisma.Decimal(0),
      });
      expect(detalles[1].data).toMatchObject({
        saldo_anterior: new Prisma.Decimal(300),
        saldo_posterior: new Prisma.Decimal(200),
      });
    });

    it('bloqueo optimista: si el saldo cambió entre la validación y la escritura, rechaza y no confirma nada', async () => {
      prisma.cUOTA.findMany.mockResolvedValue([cuotaAImputar(1)]);
      tx.cUOTA.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.crear(
          crearCobroDto([lineaImputacion(1, 100)], 100),
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(tx.dETALLECOBRO.create).not.toHaveBeenCalled();
      expect(prisma.cOBRO.findUnique).not.toHaveBeenCalled();
    });

    it('transición: si la cuota saldada era la última de la venta, pasa la publicación a VENDIDA', async () => {
      prisma.cUOTA.findMany.mockResolvedValue([
        cuotaAImputar(1, { saldo_pendiente: new Prisma.Decimal(500) }),
      ]);
      tx.vENTA.findUniqueOrThrow.mockResolvedValue({
        FK_publicacion: 1,
        publicacion: { estado_comercial: EstadoComercial.EN_PLAN_DE_PAGO },
        cuotas: [{ saldo_pendiente: new Prisma.Decimal(0) }],
      });

      await service.crear(
        crearCobroDto([lineaImputacion(1, 500)], 500),
        USUARIO_ID,
      );

      expect(publicaciones.transicionarEstadoComercial).toHaveBeenCalledWith(
        tx,
        1,
        EstadoComercial.EN_PLAN_DE_PAGO,
        EstadoComercial.VENDIDA,
        USUARIO_ID,
      );
    });

    it('sin saldar todas las cuotas de la venta, no dispara ninguna transición', async () => {
      prisma.cUOTA.findMany.mockResolvedValue([
        cuotaAImputar(1, { saldo_pendiente: new Prisma.Decimal(500) }),
      ]);
      tx.vENTA.findUniqueOrThrow.mockResolvedValue({
        FK_publicacion: 1,
        publicacion: { estado_comercial: EstadoComercial.EN_PLAN_DE_PAGO },
        cuotas: [{ saldo_pendiente: new Prisma.Decimal(200) }],
      });

      await service.crear(
        crearCobroDto([lineaImputacion(1, 300)], 300),
        USUARIO_ID,
      );

      expect(publicaciones.transicionarEstadoComercial).not.toHaveBeenCalled();
    });

    it('nace CONFIRMADO (sin borrador) y devuelve el detalle vía obtenerDetalle', async () => {
      prisma.cUOTA.findMany.mockResolvedValue([cuotaAImputar(1)]);

      const resultado = await service.crear(
        crearCobroDto([lineaImputacion(1, 100)], 100),
        USUARIO_ID,
      );

      expect(argumentoTx(tx.cOBRO.create).data.estado).toBe('CONFIRMADO');
      expect(prisma.cOBRO.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_cobro: ID_COBRO } }),
      );
      expect(resultado.id_cobro).toBe(ID_COBRO);
    });
  });

  describe('anular', () => {
    const anularDto: AnularCobroDto = { motivo_anulacion: 'Error de carga' };

    it('rechaza si el cobro no existe', async () => {
      prisma.cOBRO.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.anular(999, anularDto, USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza si el cobro ya está ANULADO', async () => {
      prisma.cOBRO.findUnique.mockResolvedValueOnce(
        cobroConfirmadoConDetalles([], { estado: 'ANULADO' }),
      );

      await expect(
        service.anular(ID_COBRO, anularDto, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('restituye el saldo de cada cuota imputada con increment', async () => {
      prisma.cOBRO.findUnique.mockResolvedValueOnce(
        cobroConfirmadoConDetalles([
          { FK_cuota: 1, importe_imputado: new Prisma.Decimal(300) },
          { FK_cuota: 2, importe_imputado: new Prisma.Decimal(150.5) },
        ]),
      );

      await service.anular(ID_COBRO, anularDto, USUARIO_ID);

      const primera = argumentosTx(tx.cUOTA.update).find(
        (llamada) =>
          (llamada as unknown as { where: { id_cuota: number } }).where
            .id_cuota === 1 && llamada.data.saldo_pendiente !== undefined,
      )!;
      expect(primera.data.saldo_pendiente).toEqual({
        increment: new Prisma.Decimal(300),
      });

      const segunda = argumentosTx(tx.cUOTA.update).find(
        (llamada) =>
          (llamada as unknown as { where: { id_cuota: number } }).where
            .id_cuota === 2 && llamada.data.saldo_pendiente !== undefined,
      )!;
      expect(segunda.data.saldo_pendiente).toEqual({
        increment: new Prisma.Decimal(150.5),
      });
    });

    it('recalcula el estado contra el saldo YA restituido: vuelve a PENDIENTE si queda igual al importe original', async () => {
      prisma.cOBRO.findUnique.mockResolvedValueOnce(
        cobroConfirmadoConDetalles([
          { FK_cuota: 1, importe_imputado: new Prisma.Decimal(1000) },
        ]),
      );
      tx.cUOTA.update.mockResolvedValueOnce({
        saldo_pendiente: new Prisma.Decimal(1000),
        importe: new Prisma.Decimal(1000),
      });

      await service.anular(ID_COBRO, anularDto, USUARIO_ID);

      const segundoUpdate = argumentosTx(tx.cUOTA.update)[1];
      expect(segundoUpdate.data.estado).toBe('PENDIENTE');
    });

    it('recalcula el estado contra el saldo YA restituido: queda PARCIAL si todavía no llega al importe original (hubo otro cobro después)', async () => {
      prisma.cOBRO.findUnique.mockResolvedValueOnce(
        cobroConfirmadoConDetalles([
          { FK_cuota: 1, importe_imputado: new Prisma.Decimal(300) },
        ]),
      );
      // La cuota tenía saldo 0 (otro cobro posterior la había saldado);
      // al restituir este cobro, vuelve a 300 de 1000 — sigue PARCIAL.
      tx.cUOTA.update.mockResolvedValueOnce({
        saldo_pendiente: new Prisma.Decimal(300),
        importe: new Prisma.Decimal(1000),
      });

      await service.anular(ID_COBRO, anularDto, USUARIO_ID);

      const segundoUpdate = argumentosTx(tx.cUOTA.update)[1];
      expect(segundoUpdate.data.estado).toBe('PARCIAL');
    });

    it('no modifica las líneas de DETALLECOBRO: quedan como foto histórica', async () => {
      prisma.cOBRO.findUnique.mockResolvedValueOnce(
        cobroConfirmadoConDetalles([
          { FK_cuota: 1, importe_imputado: new Prisma.Decimal(300) },
        ]),
      );

      await service.anular(ID_COBRO, anularDto, USUARIO_ID);

      expect(tx.dETALLECOBRO.create).not.toHaveBeenCalled();
    });

    it('marca la cabecera como ANULADO con el motivo y devuelve el detalle vía obtenerDetalle', async () => {
      prisma.cOBRO.findUnique.mockResolvedValueOnce(
        cobroConfirmadoConDetalles([
          { FK_cuota: 1, importe_imputado: new Prisma.Decimal(300) },
        ]),
      );

      const resultado = await service.anular(ID_COBRO, anularDto, USUARIO_ID);

      const argUpdateCobro = argumentoTx(tx.cOBRO.update);
      expect(argUpdateCobro.data).toMatchObject({
        estado: 'ANULADO',
        motivo_anulacion: 'Error de carga',
      });
      expect(prisma.cOBRO.findUnique).toHaveBeenCalledTimes(2);
      expect(resultado.id_cobro).toBe(ID_COBRO);
    });

    it('transición: si el saldo restituido reabre la venta, la publicación vuelve de VENDIDA a EN_PLAN_DE_PAGO', async () => {
      prisma.cOBRO.findUnique.mockResolvedValueOnce(
        cobroConfirmadoConDetalles([
          { FK_cuota: 1, importe_imputado: new Prisma.Decimal(300) },
        ]),
      );
      tx.vENTA.findUniqueOrThrow.mockResolvedValue({
        FK_publicacion: 1,
        publicacion: { estado_comercial: EstadoComercial.VENDIDA },
        cuotas: [{ saldo_pendiente: new Prisma.Decimal(300) }],
      });

      await service.anular(ID_COBRO, anularDto, USUARIO_ID);

      expect(publicaciones.transicionarEstadoComercial).toHaveBeenCalledWith(
        tx,
        1,
        EstadoComercial.VENDIDA,
        EstadoComercial.EN_PLAN_DE_PAGO,
        USUARIO_ID,
      );
    });

    it('anular con un cobro posterior sobre la misma cuota deja el saldo correcto (solo suma lo que este cobro había descontado)', async () => {
      // Cuota con 1000 de importe. Cobro A imputa 300 (saldo 700), después
      // cobro B imputa 400 (saldo 300). Se anula el cobro A: el saldo
      // restituido tiene que ser 300 + 300 = 600, nunca recalculado desde 0.
      prisma.cOBRO.findUnique.mockResolvedValueOnce(
        cobroConfirmadoConDetalles([
          { FK_cuota: 1, importe_imputado: new Prisma.Decimal(300) },
        ]),
      );
      tx.cUOTA.update.mockResolvedValueOnce({
        saldo_pendiente: new Prisma.Decimal(600),
        importe: new Prisma.Decimal(1000),
      });

      await service.anular(ID_COBRO, anularDto, USUARIO_ID);

      const primerUpdate = argumentosTx(tx.cUOTA.update)[0];
      expect(primerUpdate.data.saldo_pendiente).toEqual({
        increment: new Prisma.Decimal(300),
      });
    });
  });

  describe('actualizarEstadoVentaSegunSaldo (las dos transiciones)', () => {
    it('saldo total en cero + EN_PLAN_DE_PAGO -> transiciona a VENDIDA', async () => {
      tx.vENTA.findUniqueOrThrow.mockResolvedValue({
        FK_publicacion: 1,
        publicacion: { estado_comercial: EstadoComercial.EN_PLAN_DE_PAGO },
        cuotas: [
          { saldo_pendiente: new Prisma.Decimal(0) },
          { saldo_pendiente: new Prisma.Decimal(0) },
        ],
      });

      await privado(service).actualizarEstadoVentaSegunSaldo(tx, 1, USUARIO_ID);

      expect(publicaciones.transicionarEstadoComercial).toHaveBeenCalledWith(
        tx,
        1,
        EstadoComercial.EN_PLAN_DE_PAGO,
        EstadoComercial.VENDIDA,
        USUARIO_ID,
      );
    });

    it('saldo que reabre (> 0) + VENDIDA -> transiciona a EN_PLAN_DE_PAGO', async () => {
      tx.vENTA.findUniqueOrThrow.mockResolvedValue({
        FK_publicacion: 1,
        publicacion: { estado_comercial: EstadoComercial.VENDIDA },
        cuotas: [{ saldo_pendiente: new Prisma.Decimal(300) }],
      });

      await privado(service).actualizarEstadoVentaSegunSaldo(tx, 1, USUARIO_ID);

      expect(publicaciones.transicionarEstadoComercial).toHaveBeenCalledWith(
        tx,
        1,
        EstadoComercial.VENDIDA,
        EstadoComercial.EN_PLAN_DE_PAGO,
        USUARIO_ID,
      );
    });

    it('ignora las cuotas ANULADAS al evaluar si el saldo total está en cero', async () => {
      // El where de la consulta ya excluye ANULADA: acá solo comprobamos que
      // con las cuotas no-anuladas en cero, igual transiciona.
      tx.vENTA.findUniqueOrThrow.mockResolvedValue({
        FK_publicacion: 1,
        publicacion: { estado_comercial: EstadoComercial.EN_PLAN_DE_PAGO },
        cuotas: [{ saldo_pendiente: new Prisma.Decimal(0) }],
      });

      await privado(service).actualizarEstadoVentaSegunSaldo(tx, 1, USUARIO_ID);

      const argumento = primerArgumento(tx.vENTA.findUniqueOrThrow) as {
        select: { cuotas: { where: Record<string, unknown> } };
      };
      expect(argumento.select.cuotas.where).toEqual({
        estado: { not: 'ANULADA' },
      });
      expect(publicaciones.transicionarEstadoComercial).toHaveBeenCalled();
    });

    it('ningún otro cruce de estado/saldo dispara una transición', async () => {
      tx.vENTA.findUniqueOrThrow.mockResolvedValue({
        FK_publicacion: 1,
        publicacion: { estado_comercial: EstadoComercial.DISPONIBLE },
        cuotas: [{ saldo_pendiente: new Prisma.Decimal(0) }],
      });

      await privado(service).actualizarEstadoVentaSegunSaldo(tx, 1, USUARIO_ID);

      expect(publicaciones.transicionarEstadoComercial).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    const query = (extra: Partial<QueryCobroDto> = {}): QueryCobroDto => ({
      page: 1,
      limit: 10,
      ...extra,
    });

    /** Fila cruda tal como la selecciona `calcularResumenPeriodo`. */
    const cobroDelPeriodo = (
      importeTotal: number,
      cliente: {
        id_cliente: number;
        nombre: string;
        apellido: string;
        dni_cuil: string;
        email: string;
      },
      formaPago: {
        id_forma_pago: number;
        nombre: string;
        requiere_referencia: boolean;
      },
    ) => ({
      importe_total: new Prisma.Decimal(importeTotal),
      cliente,
      formaPago,
    });

    const clienteA = {
      id_cliente: ID_CLIENTE,
      nombre: 'Valentina',
      apellido: 'Fernández',
      dni_cuil: '20111111112',
      email: 'valen@test.com',
    };
    const clienteB = {
      id_cliente: 2,
      nombre: 'Tomás',
      apellido: 'Rodríguez',
      dni_cuil: '20222222223',
      email: 'tomas@test.com',
    };
    const efectivo = {
      id_forma_pago: 1,
      nombre: 'Efectivo',
      requiere_referencia: false,
    };

    it('resumenPeriodo viaja null si falta fechaDesde o fechaHasta', async () => {
      const resultado = await service.listar(
        query({ fechaDesde: new Date('2026-09-01') }),
      );

      expect(resultado.resumenPeriodo).toBeNull();
      expect(prisma.cOBRO.findMany).toHaveBeenCalledTimes(1); // solo el listado, no el resumen
    });

    it('resumenPeriodo trae subtotales por cliente y por forma de pago, excluyendo anulados', async () => {
      prisma.cOBRO.findMany
        .mockResolvedValueOnce([]) // listado paginado
        .mockResolvedValueOnce([
          cobroDelPeriodo(1000, clienteA, efectivo),
          cobroDelPeriodo(500, clienteB, efectivo),
        ]); // resumen del período (solo CONFIRMADO, ver siguiente test)

      const resultado = await service.listar(
        query({
          fechaDesde: new Date('2026-09-01'),
          fechaHasta: new Date('2026-09-30'),
        }),
      );

      expect(resultado.resumenPeriodo).toEqual({
        totalIngresos: 1500,
        subtotalesPorCliente: [
          { cliente: clienteA, total: 1000 },
          { cliente: clienteB, total: 500 },
        ],
        subtotalesPorFormaPago: [{ formaPago: efectivo, total: 1500 }],
      });
    });

    it('el resumen del período consulta siempre estado CONFIRMADO, sin importar el filtro estado de la query (excluye anulados)', async () => {
      prisma.cOBRO.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await service.listar(
        query({
          estado: 'ANULADO',
          fechaDesde: new Date('2026-09-01'),
          fechaHasta: new Date('2026-09-30'),
        }),
      );

      const llamadas = prisma.cOBRO.findMany.mock.calls as {
        where?: { estado?: string };
      }[][];
      // Primera llamada: el listado, respeta el filtro `estado` de la query.
      expect(llamadas[0][0].where?.estado).toBe('ANULADO');
      // Segunda llamada: el resumen del período, siempre CONFIRMADO.
      expect(llamadas[1][0].where?.estado).toBe('CONFIRMADO');
    });

    it('la paginación del listado es independiente del resumen', async () => {
      await service.listar(query({ page: 2, limit: 5 }));

      const llamada = (
        prisma.cOBRO.findMany.mock.calls as {
          skip?: number;
          take?: number;
          orderBy?: Record<string, unknown>;
        }[][]
      )[0][0];
      expect(llamada.skip).toBe(5);
      expect(llamada.take).toBe(5);
      expect(llamada.orderBy).toEqual({ fecha_cobro: 'desc' });
    });
  });

  describe('obtenerDetalle', () => {
    it('rechaza si el cobro no existe', async () => {
      prisma.cOBRO.findUnique.mockResolvedValueOnce(null);

      await expect(service.obtenerDetalle(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('convierte los Decimal a number, en la cabecera y en cada línea', async () => {
      prisma.cOBRO.findUnique.mockResolvedValueOnce(
        cobroCompleto({
          importe_total: new Prisma.Decimal(1500),
          detalles: [
            {
              id_detalle_cobro: 1,
              FK_cuota: 1,
              importe_imputado: new Prisma.Decimal(300),
              saldo_anterior: new Prisma.Decimal(1000),
              saldo_posterior: new Prisma.Decimal(700),
              cuota: { id_cuota: 1, numero: 1, FK_venta: 1 },
            },
          ],
        }),
      );

      const resultado = await service.obtenerDetalle(ID_COBRO);

      expect(resultado.importe_total).toBe(1500);
      expect(resultado.detalle[0]).toMatchObject({
        importe_imputado: 300,
        saldo_anterior: 1000,
        saldo_posterior: 700,
      });
    });
  });
});
