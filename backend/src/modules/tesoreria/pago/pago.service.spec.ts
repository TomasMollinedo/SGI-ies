import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PagoService } from './pago.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
import { CreatePagoDto } from './dto/create-pago.dto';
import { AnularPagoDto } from './dto/anular-pago.dto';
import { QueryPagoDto } from './dto/query-pago.dto';

/** Primer argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = {
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
};

const primerArgumento = (mock: jest.Mock): ArgumentoPrisma =>
  (mock.mock.calls as ArgumentoPrisma[][])[0][0];

/** Argumento de un `create`/`updateMany` de la transacción de `create()` (T88), ya tipado. */
type ArgumentoTx = {
  where?: { saldo_pendiente?: Prisma.Decimal };
  data: {
    saldo_pendiente?: Prisma.Decimal;
    saldo_cancelado?: boolean;
    saldo_anterior?: Prisma.Decimal;
    saldo_posterior?: Prisma.Decimal;
    importe_imputado?: Prisma.Decimal;
    importe_total?: Prisma.Decimal;
    estado?: string;
    banco_utilizado?: string | null;
    titular_utilizado?: string | null;
    cbu_utilizado?: string | null;
    alias_utilizado?: string | null;
  };
};

const argumentoTx = (mock: jest.Mock, llamada = 0): ArgumentoTx =>
  (mock.mock.calls as ArgumentoTx[][])[llamada][0];

const argumentosTx = (mock: jest.Mock): ArgumentoTx[] =>
  (mock.mock.calls as ArgumentoTx[][]).map((llamada) => llamada[0]);

/** Argumento de un `update` de comprobante dentro de la transacción de `anular()` (T89). */
type ArgumentoUpdateComprobante = {
  where: { id_comprobante_proveedor: number };
  data: {
    saldo_pendiente?: { increment: Prisma.Decimal };
    saldo_cancelado?: boolean;
  };
};

const argumentoUpdateComprobante = (
  mock: jest.Mock,
  llamada = 0,
): ArgumentoUpdateComprobante =>
  (mock.mock.calls as ArgumentoUpdateComprobante[][])[llamada][0];

/** Argumento del `update` de cabecera dentro de la transacción de `anular()` (T89). */
type ArgumentoUpdatePago = {
  where: { id_pago: number };
  data: { estado?: string; motivo_anulacion?: string };
};

const argumentoUpdatePago = (mock: jest.Mock): ArgumentoUpdatePago =>
  (mock.mock.calls as ArgumentoUpdatePago[][])[0][0];

type LineaImputacion = CreatePagoDto['detalle'][number];

/**
 * Los métodos de T87 son privados (`create()`, que los invoca, recién llega
 * en T88) — se acceden acá con un cast puntual para poder probarlos
 * aislados, mismo criterio que pide el plan de la HU.
 */
type PagoServicePrivado = {
  buscarProveedorActivo(id: number): Promise<{ estado: boolean }>;
  buscarFormaPagoActiva(
    id: number,
  ): Promise<{ estado: boolean; requiere_referencia: boolean }>;
  validarNumeroReferencia(
    numeroReferencia: string | undefined,
    formaPago: { requiere_referencia: boolean; nombre: string },
  ): void;
  resolverFechaPago(fecha: Date | undefined): Date;
  buscarComprobantesImputables(
    FK_proveedor: number,
    detalle: LineaImputacion[],
  ): Promise<Map<number, ComprobanteAImputar>>;
  validarImportesImputados(
    detalle: LineaImputacion[],
    comprobantePorId: Map<number, ComprobanteAImputar>,
  ): void;
  validarFechaPagoContraEmisiones(
    fechaPago: Date,
    detalle: LineaImputacion[],
    comprobantePorId: Map<number, ComprobanteAImputar>,
  ): void;
  calcularImporteNeto(
    detalle: LineaImputacion[],
    comprobantePorId: Map<number, ComprobanteAImputar>,
  ): Prisma.Decimal;
  validarImporteNetoValido(
    detalle: LineaImputacion[],
    comprobantePorId: Map<number, ComprobanteAImputar>,
  ): void;
};

const privado = (service: PagoService) =>
  service as unknown as PagoServicePrivado;

type ComprobanteAImputar = {
  id_comprobante_proveedor: number;
  FK_proveedor: number;
  letra: string;
  punto_de_venta: number;
  numero: number;
  fecha_emision: Date;
  estado: string;
  saldo_pendiente: Prisma.Decimal | null;
  tipoComprobante: { aumenta_saldo: boolean };
};

/** Comprobante listo para imputar: proveedor 1, REGISTRADO, DEBE, saldo 1000. */
const comprobanteAImputar = (
  id: number,
  extra: Partial<ComprobanteAImputar> = {},
): ComprobanteAImputar => ({
  id_comprobante_proveedor: id,
  FK_proveedor: 1,
  letra: 'A',
  punto_de_venta: 1,
  numero: 123,
  fecha_emision: new Date('2026-08-01T00:00:00Z'),
  estado: 'REGISTRADO',
  saldo_pendiente: new Prisma.Decimal('1000.00'),
  tipoComprobante: { aumenta_saldo: true },
  ...extra,
});

const lineaImputacion = (
  FK_comprobante_proveedor: number,
  importe_imputado: number,
): LineaImputacion => ({ FK_comprobante_proveedor, importe_imputado });

describe('PagoService', () => {
  let service: PagoService;
  let tx: {
    pAGO: { create: jest.Mock; update: jest.Mock };
    cOMPROBANTEPROVEEDOR: { updateMany: jest.Mock; update: jest.Mock };
    dETALLEPAGO: { create: jest.Mock };
  };
  let prisma: {
    pROVEEDOR: { findUnique: jest.Mock };
    fORMAPAGO: { findUnique: jest.Mock };
    cOMPROBANTEPROVEEDOR: { findMany: jest.Mock };
    pAGO: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const ID_PROVEEDOR = 1;
  const ID_PAGO = 100;
  const USUARIO_ID = 7;

  /** Comprobante DEBE (factura) o HABER (nota de crédito), ambos con saldo propio. */
  const comprobante = (
    id: number,
    extra: Partial<Record<string, unknown>> = {},
  ) => ({
    id_comprobante_proveedor: id,
    FK_tipo_comprobante: 1,
    letra: 'A',
    punto_de_venta: 1,
    numero: 123,
    fecha_emision: new Date('2026-08-01T00:00:00Z'),
    fecha_vencimiento: new Date('2026-09-01T00:00:00Z'),
    importe_total: new Prisma.Decimal('1000.50'),
    saldo_pendiente: new Prisma.Decimal('1000.50'),
    tipoComprobante: { nombre: 'Factura', aumenta_saldo: true },
    ...extra,
  });

  /** Cabecera completa devuelta por `findOne` al final de `create()`. */
  const pagoCompleto = (extra: Partial<Record<string, unknown>> = {}) => ({
    id_pago: ID_PAGO,
    fecha_pago: new Date('2026-08-15T00:00:00Z'),
    numero_referencia: null,
    importe_total: new Prisma.Decimal(0),
    observaciones: null,
    estado: 'CONFIRMADA',
    motivo_anulacion: null,
    banco_utilizado: null,
    titular_utilizado: null,
    cbu_utilizado: null,
    alias_utilizado: null,
    hora_creacion: new Date('2026-08-15T00:00:00Z'),
    hora_actualizacion: null,
    FK_proveedor: ID_PROVEEDOR,
    FK_forma_pago: 1,
    FK_usuario_creador: USUARIO_ID,
    FK_usuario_actualizador: USUARIO_ID,
    proveedor: { id_proveedor: ID_PROVEEDOR, razon_social: 'Proveedor SA' },
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
   * Pago CONFIRMADA con su detalle "crudo" (Decimal sin convertir), tal como
   * lo devuelve Prisma con `include: { detalles: true }` — es lo que consume
   * `buscarPagoConfirmado` (T89), a diferencia de `pagoCompleto()` que
   * modela la respuesta ya armada de `findOne`.
   */
  const pagoConfirmadoConDetalles = (
    detalles: {
      FK_comprobante_proveedor: number;
      importe_imputado: Prisma.Decimal;
    }[],
    extra: Partial<Record<string, unknown>> = {},
  ) => ({
    id_pago: ID_PAGO,
    estado: 'CONFIRMADA',
    detalles,
    ...extra,
  });

  const crearPagoDto = (detalle: LineaImputacion[]): CreatePagoDto => ({
    FK_proveedor: ID_PROVEEDOR,
    FK_forma_pago: 1,
    // Fija y anterior a cualquier `fecha_emision` de fixture, para no
    // depender de la fecha real del sistema al correr el test.
    fecha_pago: new Date('2026-08-15T00:00:00Z'),
    detalle,
  });

  beforeEach(async () => {
    tx = {
      pAGO: {
        create: jest.fn().mockResolvedValue({ id_pago: ID_PAGO }),
        update: jest.fn().mockResolvedValue({}),
      },
      // count: 1 = el update aplicó (nadie tocó el saldo entre medio).
      cOMPROBANTEPROVEEDOR: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      dETALLEPAGO: { create: jest.fn().mockResolvedValue({}) },
    };

    prisma = {
      pROVEEDOR: {
        findUnique: jest.fn().mockResolvedValue({
          id_proveedor: ID_PROVEEDOR,
          razon_social: 'Proveedor SA',
          estado: true,
        }),
      },
      fORMAPAGO: {
        findUnique: jest.fn().mockResolvedValue({
          id_forma_pago: 1,
          nombre: 'Efectivo',
          requiere_referencia: false,
          estado: true,
        }),
      },
      cOMPROBANTEPROVEEDOR: { findMany: jest.fn().mockResolvedValue([]) },
      pAGO: {
        findUnique: jest.fn().mockResolvedValue(pagoCompleto()),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn((callback: (t: typeof tx) => unknown) =>
        callback(tx),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PagoService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PagoService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('listarComprobantesImputables', () => {
    it('rechaza si el proveedor no existe', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(null);

      await expect(
        service.listarComprobantesImputables(99),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.cOMPROBANTEPROVEEDOR.findMany).not.toHaveBeenCalled();
    });

    it('filtra por proveedor, estado REGISTRADO y saldo pendiente > 0, sin distinguir DEBE de HABER', async () => {
      await service.listarComprobantesImputables(ID_PROVEEDOR);

      const argumento = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.findMany);
      expect(argumento.where).toEqual({
        FK_proveedor: ID_PROVEEDOR,
        estado: 'REGISTRADO',
        saldo_pendiente: { gt: 0 },
      });
      expect(argumento.orderBy).toEqual({ fecha_vencimiento: 'asc' });
    });

    it('lista un comprobante DEBE (factura) con efecto_saldo DEBE', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobante(1, {
          tipoComprobante: { nombre: 'Factura', aumenta_saldo: true },
        }),
      ]);

      const resultado =
        await service.listarComprobantesImputables(ID_PROVEEDOR);

      expect(resultado.data[0]).toMatchObject({
        efecto_saldo: 'DEBE',
        tipo_comprobante_nombre: 'Factura',
      });
    });

    it('lista un comprobante HABER (nota de crédito) con saldo propio y efecto_saldo HABER', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobante(2, {
          tipoComprobante: { nombre: 'Nota de Crédito', aumenta_saldo: false },
        }),
      ]);

      const resultado =
        await service.listarComprobantesImputables(ID_PROVEEDOR);

      expect(resultado.data[0]).toMatchObject({
        efecto_saldo: 'HABER',
        tipo_comprobante_nombre: 'Nota de Crédito',
      });
    });

    it('convierte importe_total y saldo_pendiente de Decimal a number', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([comprobante(1)]);

      const resultado =
        await service.listarComprobantesImputables(ID_PROVEEDOR);

      expect(resultado.data[0].importe_total).toBe(1000.5);
      expect(resultado.data[0].saldo_pendiente).toBe(1000.5);
    });

    it('calcula dias_vencido correcto contra una fecha fija, para un comprobante vencido', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-09T15:00:00Z'));
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobante(1, { fecha_vencimiento: new Date('2026-09-01T00:00:00Z') }),
      ]);

      const resultado =
        await service.listarComprobantesImputables(ID_PROVEEDOR);

      expect(resultado.data[0]).toMatchObject({
        vencido: true,
        dias_vencido: 8,
      });
    });

    it('no vencido (vence hoy o después) da vencido false y dias_vencido 0', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-09T23:00:00Z'));
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobante(1, { fecha_vencimiento: new Date('2026-09-09T00:00:00Z') }),
        comprobante(2, { fecha_vencimiento: new Date('2026-09-20T00:00:00Z') }),
      ]);

      const resultado =
        await service.listarComprobantesImputables(ID_PROVEEDOR);

      expect(resultado.data[0]).toMatchObject({
        vencido: false,
        dias_vencido: 0,
      });
      expect(resultado.data[1]).toMatchObject({
        vencido: false,
        dias_vencido: 0,
      });
    });
  });

  describe('buscarProveedorActivo', () => {
    it('rechaza si el proveedor no existe', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(null);

      await expect(
        privado(service).buscarProveedorActivo(99),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza si el proveedor está dado de baja', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue({
        id_proveedor: ID_PROVEEDOR,
        razon_social: 'Proveedor SA',
        estado: false,
      });

      await expect(
        privado(service).buscarProveedorActivo(ID_PROVEEDOR),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('devuelve el proveedor si existe y está activo', async () => {
      const proveedor =
        await privado(service).buscarProveedorActivo(ID_PROVEEDOR);

      expect(proveedor.estado).toBe(true);
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

    it('devuelve la forma de pago si existe y está activa', async () => {
      const formaPago = await privado(service).buscarFormaPagoActiva(1);

      expect(formaPago.estado).toBe(true);
    });
  });

  describe('validarNumeroReferencia', () => {
    it('rechaza si la forma de pago requiere referencia y no vino ninguna', () => {
      expect(() =>
        privado(service).validarNumeroReferencia(undefined, {
          requiere_referencia: true,
          nombre: 'Transferencia',
        }),
      ).toThrow(BadRequestException);
    });

    it('pasa si la forma de pago requiere referencia y vino una', () => {
      expect(() =>
        privado(service).validarNumeroReferencia('TR-001', {
          requiere_referencia: true,
          nombre: 'Transferencia',
        }),
      ).not.toThrow();
    });

    it('pasa sin referencia si la forma de pago no la requiere', () => {
      expect(() =>
        privado(service).validarNumeroReferencia(undefined, {
          requiere_referencia: false,
          nombre: 'Efectivo',
        }),
      ).not.toThrow();
    });
  });

  describe('resolverFechaPago', () => {
    afterEach(() => jest.useRealTimers());

    it('devuelve hoy si no viene fecha', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-09T12:00:00Z'));

      const fecha = privado(service).resolverFechaPago(undefined);

      expect(fecha).toEqual(new Date('2026-09-09T12:00:00Z'));
    });

    it('rechaza una fecha futura', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-09T12:00:00Z'));

      expect(() =>
        privado(service).resolverFechaPago(new Date('2026-09-10T00:00:00Z')),
      ).toThrow(BadRequestException);
    });

    it('devuelve la fecha tal cual si no es futura', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-09T12:00:00Z'));
      const fecha = new Date('2026-09-01T00:00:00Z');

      expect(privado(service).resolverFechaPago(fecha)).toBe(fecha);
    });
  });

  describe('buscarComprobantesImputables', () => {
    it('rechaza si algún comprobante no existe', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteAImputar(1),
      ]);

      await expect(
        privado(service).buscarComprobantesImputables(ID_PROVEEDOR, [
          lineaImputacion(1, 100),
          lineaImputacion(2, 100),
        ]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza si un comprobante no pertenece al proveedor de la cabecera', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteAImputar(1, { FK_proveedor: 2 }),
      ]);

      await expect(
        privado(service).buscarComprobantesImputables(ID_PROVEEDOR, [
          lineaImputacion(1, 100),
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un comprobante que no está REGISTRADO', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteAImputar(1, { estado: 'BORRADOR' }),
      ]);

      await expect(
        privado(service).buscarComprobantesImputables(ID_PROVEEDOR, [
          lineaImputacion(1, 100),
        ]),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza un comprobante sin saldo pendiente', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteAImputar(1, { saldo_pendiente: new Prisma.Decimal(0) }),
      ]);

      await expect(
        privado(service).buscarComprobantesImputables(ID_PROVEEDOR, [
          lineaImputacion(1, 100),
        ]),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('acepta comprobantes DEBE y HABER del proveedor, REGISTRADOS y con saldo', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteAImputar(1, { tipoComprobante: { aumenta_saldo: true } }),
        comprobanteAImputar(2, { tipoComprobante: { aumenta_saldo: false } }),
      ]);

      const resultado = await privado(service).buscarComprobantesImputables(
        ID_PROVEEDOR,
        [lineaImputacion(1, 100), lineaImputacion(2, 100)],
      );

      expect(resultado.size).toBe(2);
    });
  });

  describe('validarImportesImputados', () => {
    it('rechaza un importe que supera el saldo pendiente', () => {
      const comprobantePorId = new Map([
        [
          1,
          comprobanteAImputar(1, { saldo_pendiente: new Prisma.Decimal(100) }),
        ],
      ]);

      expect(() =>
        privado(service).validarImportesImputados(
          [lineaImputacion(1, 150)],
          comprobantePorId,
        ),
      ).toThrow(BadRequestException);
    });

    it('acumula un error por cada comprobante que excede su saldo', () => {
      const comprobantePorId = new Map([
        [
          1,
          comprobanteAImputar(1, { saldo_pendiente: new Prisma.Decimal(100) }),
        ],
        [
          2,
          comprobanteAImputar(2, { saldo_pendiente: new Prisma.Decimal(50) }),
        ],
      ]);

      try {
        privado(service).validarImportesImputados(
          [lineaImputacion(1, 150), lineaImputacion(2, 60)],
          comprobantePorId,
        );
        fail('Tenía que rechazar');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const mensaje = (error as { message: string }).message;
        expect(mensaje.split(';').length).toBe(2);
      }
    });

    it('pasa si todos los importes están dentro del saldo pendiente', () => {
      const comprobantePorId = new Map([
        [
          1,
          comprobanteAImputar(1, { saldo_pendiente: new Prisma.Decimal(100) }),
        ],
      ]);

      expect(() =>
        privado(service).validarImportesImputados(
          [lineaImputacion(1, 100)],
          comprobantePorId,
        ),
      ).not.toThrow();
    });
  });

  describe('validarFechaPagoContraEmisiones', () => {
    it('rechaza una fecha de pago anterior a la emisión más reciente, y nombra el comprobante', () => {
      const comprobantePorId = new Map([
        [
          1,
          comprobanteAImputar(1, {
            fecha_emision: new Date('2026-09-05T00:00:00Z'),
          }),
        ],
      ]);

      try {
        privado(service).validarFechaPagoContraEmisiones(
          new Date('2026-09-01T00:00:00Z'),
          [lineaImputacion(1, 100)],
          comprobantePorId,
        );
        fail('Tenía que rechazar');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as { message: string }).message).toContain(
          'A 0001-00000123',
        );
      }
    });

    it('pasa si la fecha de pago es igual o posterior a la emisión más reciente, aunque el comprobante esté vencido', () => {
      const comprobantePorId = new Map([
        [
          1,
          comprobanteAImputar(1, {
            fecha_emision: new Date('2026-01-01T00:00:00Z'),
          }),
        ],
      ]);

      expect(() =>
        privado(service).validarFechaPagoContraEmisiones(
          new Date('2026-09-09T00:00:00Z'),
          [lineaImputacion(1, 100)],
          comprobantePorId,
        ),
      ).not.toThrow();
    });
  });

  describe('calcularImporteNeto y validarImporteNetoValido', () => {
    it('neto positivo cuando solo hay comprobantes DEBE', () => {
      const comprobantePorId = new Map([
        [
          1,
          comprobanteAImputar(1, { tipoComprobante: { aumenta_saldo: true } }),
        ],
      ]);
      const detalle = [lineaImputacion(1, 500)];

      expect(
        privado(service)
          .calcularImporteNeto(detalle, comprobantePorId)
          .toNumber(),
      ).toBe(500);
      expect(() =>
        privado(service).validarImporteNetoValido(detalle, comprobantePorId),
      ).not.toThrow();
    });

    it('neto positivo parcialmente compensado con HABER', () => {
      const comprobantePorId = new Map([
        [
          1,
          comprobanteAImputar(1, { tipoComprobante: { aumenta_saldo: true } }),
        ],
        [
          2,
          comprobanteAImputar(2, { tipoComprobante: { aumenta_saldo: false } }),
        ],
      ]);
      const detalle = [lineaImputacion(1, 500), lineaImputacion(2, 200)];

      expect(
        privado(service)
          .calcularImporteNeto(detalle, comprobantePorId)
          .toNumber(),
      ).toBe(300);
      expect(() =>
        privado(service).validarImporteNetoValido(detalle, comprobantePorId),
      ).not.toThrow();
    });

    it('neto exactamente en 0 es válido (deuda liquidada 100% con notas de crédito)', () => {
      const comprobantePorId = new Map([
        [
          1,
          comprobanteAImputar(1, { tipoComprobante: { aumenta_saldo: true } }),
        ],
        [
          2,
          comprobanteAImputar(2, { tipoComprobante: { aumenta_saldo: false } }),
        ],
      ]);
      const detalle = [lineaImputacion(1, 500), lineaImputacion(2, 500)];

      expect(
        privado(service)
          .calcularImporteNeto(detalle, comprobantePorId)
          .toNumber(),
      ).toBe(0);
      expect(() =>
        privado(service).validarImporteNetoValido(detalle, comprobantePorId),
      ).not.toThrow();
    });

    it('neto negativo rechaza, con el importe del exceso en el mensaje', () => {
      const comprobantePorId = new Map([
        [
          1,
          comprobanteAImputar(1, { tipoComprobante: { aumenta_saldo: true } }),
        ],
        [
          2,
          comprobanteAImputar(2, { tipoComprobante: { aumenta_saldo: false } }),
        ],
      ]);
      const detalle = [lineaImputacion(1, 300), lineaImputacion(2, 500)];

      try {
        privado(service).validarImporteNetoValido(detalle, comprobantePorId);
        fail('Tenía que rechazar');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const mensaje = (error as { message: string }).message;
        expect(mensaje).toContain('500.00');
        expect(mensaje).toContain('300.00');
      }
    });

    it('rechaza si no hay ningún comprobante DEBE imputado', () => {
      const comprobantePorId = new Map([
        [
          1,
          comprobanteAImputar(1, { tipoComprobante: { aumenta_saldo: false } }),
        ],
      ]);
      const detalle = [lineaImputacion(1, 500)];

      expect(() =>
        privado(service).validarImporteNetoValido(detalle, comprobantePorId),
      ).toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    it('imputación parcial: descuenta el saldo y no cancela el comprobante', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteAImputar(1, { saldo_pendiente: new Prisma.Decimal(1000) }),
      ]);

      await service.create(crearPagoDto([lineaImputacion(1, 300)]), USUARIO_ID);

      const argUpdate = argumentoTx(tx.cOMPROBANTEPROVEEDOR.updateMany);
      expect(argUpdate.where?.saldo_pendiente).toEqual(
        new Prisma.Decimal(1000),
      );
      expect(argUpdate.data.saldo_pendiente).toEqual(new Prisma.Decimal(700));
      expect(argUpdate.data.saldo_cancelado).toBe(false);

      const argDetalle = argumentoTx(tx.dETALLEPAGO.create);
      expect(argDetalle.data.saldo_anterior).toEqual(new Prisma.Decimal(1000));
      expect(argDetalle.data.saldo_posterior).toEqual(new Prisma.Decimal(700));
    });

    it('imputación total: el saldo queda en 0 y el comprobante se cancela', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteAImputar(1, { saldo_pendiente: new Prisma.Decimal(1000) }),
      ]);

      await service.create(
        crearPagoDto([lineaImputacion(1, 1000)]),
        USUARIO_ID,
      );

      const argUpdate = argumentoTx(tx.cOMPROBANTEPROVEEDOR.updateMany);
      expect(argUpdate.data.saldo_pendiente).toEqual(new Prisma.Decimal(0));
      expect(argUpdate.data.saldo_cancelado).toBe(true);
    });

    it('si el lock optimista falla en una línea, no confirma nada después de esa línea', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteAImputar(1),
        comprobanteAImputar(2),
        comprobanteAImputar(3),
      ]);
      tx.cOMPROBANTEPROVEEDOR.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      await expect(
        service.create(
          crearPagoDto([
            lineaImputacion(1, 100),
            lineaImputacion(2, 100),
            lineaImputacion(3, 100),
          ]),
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(tx.cOMPROBANTEPROVEEDOR.updateMany).toHaveBeenCalledTimes(2);
      // Solo la primera línea (la que sí aplicó) llegó a registrarse.
      expect(tx.dETALLEPAGO.create).toHaveBeenCalledTimes(1);
      expect(prisma.pAGO.findUnique).not.toHaveBeenCalled();
    });

    it('importe_total es el neto exacto DEBE - HABER, con decimales', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteAImputar(1, {
          tipoComprobante: { aumenta_saldo: true },
          saldo_pendiente: new Prisma.Decimal(1000.5),
        }),
        comprobanteAImputar(2, {
          tipoComprobante: { aumenta_saldo: false },
          saldo_pendiente: new Prisma.Decimal(300.25),
        }),
      ]);

      await service.create(
        crearPagoDto([lineaImputacion(1, 1000.5), lineaImputacion(2, 300.25)]),
        USUARIO_ID,
      );

      const argCreate = argumentoTx(tx.pAGO.create);
      expect(argCreate.data.importe_total).toEqual(new Prisma.Decimal(700.25));
    });

    it('compensación total: DEBE == HABER da importe_total 0 y ambos comprobantes quedan cancelados', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteAImputar(1, {
          tipoComprobante: { aumenta_saldo: true },
          saldo_pendiente: new Prisma.Decimal(1000),
        }),
        comprobanteAImputar(2, {
          tipoComprobante: { aumenta_saldo: false },
          saldo_pendiente: new Prisma.Decimal(1000),
        }),
      ]);

      await service.create(
        crearPagoDto([lineaImputacion(1, 1000), lineaImputacion(2, 1000)]),
        USUARIO_ID,
      );

      const argCreate = argumentoTx(tx.pAGO.create);
      expect(argCreate.data.importe_total).toEqual(new Prisma.Decimal(0));

      const cancelados = argumentosTx(tx.cOMPROBANTEPROVEEDOR.updateMany).map(
        (llamada) => llamada.data.saldo_cancelado,
      );
      expect(cancelados).toEqual([true, true]);
    });

    it('los 4 campos de datos bancarios viajan null (bloqueados hasta HU-12)', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteAImputar(1),
      ]);

      await service.create(crearPagoDto([lineaImputacion(1, 100)]), USUARIO_ID);

      const argCreate = argumentoTx(tx.pAGO.create).data;
      expect(argCreate).toMatchObject({
        banco_utilizado: null,
        titular_utilizado: null,
        cbu_utilizado: null,
        alias_utilizado: null,
      });
    });

    it('estado CONFIRMADA explícito y devuelve el detalle vía findOne', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteAImputar(1),
      ]);

      const resultado = await service.create(
        crearPagoDto([lineaImputacion(1, 100)]),
        USUARIO_ID,
      );

      expect(argumentoTx(tx.pAGO.create).data.estado).toBe('CONFIRMADA');
      expect(prisma.pAGO.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_pago: ID_PAGO } }),
      );
      expect(resultado.id_pago).toBe(ID_PAGO);
    });
  });

  describe('anular', () => {
    const anularDto: AnularPagoDto = { motivo_anulacion: 'Error de carga' };

    it('rechaza si el pago no existe', async () => {
      prisma.pAGO.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.anular(999, anularDto, USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza si el pago no está CONFIRMADA', async () => {
      prisma.pAGO.findUnique.mockResolvedValueOnce(
        pagoConfirmadoConDetalles([], { estado: 'ANULADA' }),
      );

      await expect(
        service.anular(ID_PAGO, anularDto, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('restituye el saldo de cada comprobante con increment y lo vuelve a PENDIENTE', async () => {
      prisma.pAGO.findUnique.mockResolvedValueOnce(
        pagoConfirmadoConDetalles([
          {
            FK_comprobante_proveedor: 1,
            importe_imputado: new Prisma.Decimal(300),
          },
          {
            FK_comprobante_proveedor: 2,
            importe_imputado: new Prisma.Decimal(150.5),
          },
        ]),
      );

      await service.anular(ID_PAGO, anularDto, USUARIO_ID);

      const primera = argumentoUpdateComprobante(
        tx.cOMPROBANTEPROVEEDOR.update,
        0,
      );
      expect(primera.where).toEqual({ id_comprobante_proveedor: 1 });
      expect(primera.data).toMatchObject({
        saldo_pendiente: { increment: new Prisma.Decimal(300) },
        saldo_cancelado: false,
      });

      const segunda = argumentoUpdateComprobante(
        tx.cOMPROBANTEPROVEEDOR.update,
        1,
      );
      expect(segunda.where).toEqual({ id_comprobante_proveedor: 2 });
      expect(segunda.data).toMatchObject({
        saldo_pendiente: { increment: new Prisma.Decimal(150.5) },
        saldo_cancelado: false,
      });
    });

    it('no modifica las líneas de DETALLEPAGO: quedan como foto histórica', async () => {
      prisma.pAGO.findUnique.mockResolvedValueOnce(
        pagoConfirmadoConDetalles([
          {
            FK_comprobante_proveedor: 1,
            importe_imputado: new Prisma.Decimal(300),
          },
        ]),
      );

      await service.anular(ID_PAGO, anularDto, USUARIO_ID);

      expect(tx.dETALLEPAGO.create).not.toHaveBeenCalled();
    });

    it('marca la cabecera como ANULADA con el motivo y devuelve el detalle vía findOne', async () => {
      prisma.pAGO.findUnique.mockResolvedValueOnce(
        pagoConfirmadoConDetalles([
          {
            FK_comprobante_proveedor: 1,
            importe_imputado: new Prisma.Decimal(300),
          },
        ]),
      );

      const resultado = await service.anular(ID_PAGO, anularDto, USUARIO_ID);

      const argUpdatePago = argumentoUpdatePago(tx.pAGO.update);
      expect(argUpdatePago.where).toEqual({ id_pago: ID_PAGO });
      expect(argUpdatePago.data).toMatchObject({
        estado: 'ANULADA',
        motivo_anulacion: 'Error de carga',
      });
      expect(prisma.pAGO.findUnique).toHaveBeenCalledTimes(2);
      expect(resultado.id_pago).toBe(ID_PAGO);
    });

    it('el saldo tras confirmar y anular vuelve a ser el original', async () => {
      const saldoOriginal = new Prisma.Decimal(1000);
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteAImputar(1, { saldo_pendiente: saldoOriginal }),
      ]);

      await service.create(crearPagoDto([lineaImputacion(1, 300)]), USUARIO_ID);
      const saldoTrasConfirmar = argumentoTx(tx.cOMPROBANTEPROVEEDOR.updateMany)
        .data.saldo_pendiente!;
      const importeImputado = argumentoTx(tx.dETALLEPAGO.create).data
        .importe_imputado!;

      prisma.pAGO.findUnique.mockResolvedValueOnce(
        pagoConfirmadoConDetalles([
          {
            FK_comprobante_proveedor: 1,
            importe_imputado: importeImputado,
          },
        ]),
      );

      await service.anular(ID_PAGO, anularDto, USUARIO_ID);

      const incrementoAnulacion = argumentoUpdateComprobante(
        tx.cOMPROBANTEPROVEEDOR.update,
      ).data.saldo_pendiente!.increment;

      expect(saldoTrasConfirmar.plus(incrementoAnulacion)).toEqual(
        saldoOriginal,
      );
    });
  });

  describe('findAll', () => {
    const query = (extra: Partial<QueryPagoDto> = {}): QueryPagoDto => ({
      page: 1,
      limit: 10,
      ...extra,
    });

    /** Fila cruda tal como la selecciona `calcularResumenPeriodo`. */
    const pagoDelPeriodo = (
      importeTotal: number,
      proveedor: { id_proveedor: number; razon_social: string },
      formaPago: {
        id_forma_pago: number;
        nombre: string;
        requiere_referencia: boolean;
      },
    ) => ({
      importe_total: new Prisma.Decimal(importeTotal),
      proveedor,
      formaPago,
    });

    const proveedorA = {
      id_proveedor: ID_PROVEEDOR,
      razon_social: 'Proveedor SA',
    };
    const proveedorB = { id_proveedor: 2, razon_social: 'Otro Proveedor SA' };
    const efectivo = {
      id_forma_pago: 1,
      nombre: 'Efectivo',
      requiere_referencia: false,
    };

    it('resumenPeriodo viaja null si falta fechaDesde o fechaHasta', async () => {
      const resultado = await service.findAll(
        query({ fechaDesde: new Date('2026-08-01') }),
      );

      expect(resultado.resumenPeriodo).toBeNull();
      expect(prisma.pAGO.findMany).toHaveBeenCalledTimes(1); // solo el listado, no el resumen
    });

    it('resumenPeriodo trae los totales cuando la query trae fechaDesde y fechaHasta juntos', async () => {
      prisma.pAGO.findMany
        .mockResolvedValueOnce([]) // listado paginado
        .mockResolvedValueOnce([
          pagoDelPeriodo(1000, proveedorA, efectivo),
          pagoDelPeriodo(500, proveedorB, efectivo),
        ]); // resumen del período

      const resultado = await service.findAll(
        query({
          fechaDesde: new Date('2026-08-01'),
          fechaHasta: new Date('2026-08-31'),
        }),
      );

      expect(resultado.resumenPeriodo).toEqual({
        totalEgresos: 1500,
        subtotalesPorProveedor: [
          { proveedor: proveedorA, total: 1000 },
          { proveedor: proveedorB, total: 500 },
        ],
        subtotalesPorFormaPago: [{ formaPago: efectivo, total: 1500 }],
      });
    });

    it('el resumen del período consulta siempre estado CONFIRMADA, sin importar el filtro estado de la query', async () => {
      prisma.pAGO.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await service.findAll(
        query({
          estado: 'ANULADA',
          fechaDesde: new Date('2026-08-01'),
          fechaHasta: new Date('2026-08-31'),
        }),
      );

      // Primera llamada: el listado, respeta el filtro `estado` de la query.
      // Segunda llamada: el resumen del período, siempre CONFIRMADA.
      const llamadas = prisma.pAGO.findMany.mock.calls as {
        where?: { estado?: string };
      }[][];
      expect(llamadas[0][0].where?.estado).toBe('ANULADA');
      expect(llamadas[1][0].where?.estado).toBe('CONFIRMADA');
    });

    it('la paginación y el orden del listado son independientes del resumen', async () => {
      await service.findAll(query({ page: 2, limit: 5 }));

      const llamada = (
        prisma.pAGO.findMany.mock.calls as {
          skip?: number;
          take?: number;
          orderBy?: Record<string, unknown>;
        }[][]
      )[0][0];
      expect(llamada.skip).toBe(5);
      expect(llamada.take).toBe(5);
      expect(llamada.orderBy).toEqual({ fecha_pago: 'desc' });
    });

    it('busquedaProveedor filtra por razón social del proveedor, palabra por palabra', async () => {
      await service.findAll(query({ busquedaProveedor: 'san martin' }));

      const llamada = (
        prisma.pAGO.findMany.mock.calls as {
          where?: {
            proveedor?: {
              AND?: { razon_social?: { contains?: string } }[];
            };
          };
        }[][]
      )[0][0];
      expect(llamada.where?.proveedor?.AND).toEqual([
        { razon_social: { contains: 'san', mode: 'insensitive' } },
        { razon_social: { contains: 'martin', mode: 'insensitive' } },
      ]);
    });
  });
});
