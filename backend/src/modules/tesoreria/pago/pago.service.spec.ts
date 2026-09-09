import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PagoService } from './pago.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';

/** Primer argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = {
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
};

const primerArgumento = (mock: jest.Mock): ArgumentoPrisma =>
  (mock.mock.calls as ArgumentoPrisma[][])[0][0];

describe('PagoService', () => {
  let service: PagoService;
  let prisma: {
    pROVEEDOR: { findUnique: jest.Mock };
    cOMPROBANTEPROVEEDOR: { findMany: jest.Mock };
  };

  const ID_PROVEEDOR = 1;

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

  beforeEach(async () => {
    prisma = {
      pROVEEDOR: {
        findUnique: jest.fn().mockResolvedValue({ id_proveedor: ID_PROVEEDOR }),
      },
      cOMPROBANTEPROVEEDOR: { findMany: jest.fn().mockResolvedValue([]) },
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
});
