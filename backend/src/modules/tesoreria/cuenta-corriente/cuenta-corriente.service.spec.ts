import { Test, TestingModule } from '@nestjs/testing';
import { CuentaCorrienteService } from './cuenta-corriente.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';

interface GroupByArgs {
  where: {
    tipoComprobante?: { aumenta_saldo?: boolean };
    saldo_cancelado?: boolean;
  };
}

describe('CuentaCorrienteService', () => {
  let service: CuentaCorrienteService;
  let prisma: {
    pROVEEDOR: { findMany: jest.Mock };
    cOMPROBANTEPROVEEDOR: { groupBy: jest.Mock };
  };

  /**
   * Enruta cada `groupBy` según el `where` con el que se lo llamó, así el
   * test no depende del orden en que `Promise.all` dispara las tres
   * llamadas del service (DEBE, HABER, pendientes).
   */
  const mockearGroupBy = (resultados: {
    debe?: unknown[];
    haber?: unknown[];
    pendientes?: unknown[];
  }) =>
    jest.fn(({ where }: GroupByArgs) => {
      if (where.tipoComprobante?.aumenta_saldo === true) {
        return Promise.resolve(resultados.debe ?? []);
      }
      if (where.tipoComprobante?.aumenta_saldo === false) {
        return Promise.resolve(resultados.haber ?? []);
      }
      if (where.saldo_cancelado === false) {
        return Promise.resolve(resultados.pendientes ?? []);
      }
      return Promise.resolve([]);
    });

  beforeEach(async () => {
    prisma = {
      pROVEEDOR: { findMany: jest.fn().mockResolvedValue([]) },
      cOMPROBANTEPROVEEDOR: { groupBy: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuentaCorrienteService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CuentaCorrienteService);
  });

  const proveedor = (id: number, razon_social: string) => ({
    id_proveedor: id,
    razon_social,
    cuit: `2030405060${id}`,
  });

  it('un proveedor con solo notas de crédito (HABER) arroja saldo negativo', async () => {
    prisma.pROVEEDOR.findMany.mockResolvedValue([proveedor(1, 'Acme SA')]);
    prisma.cOMPROBANTEPROVEEDOR.groupBy = mockearGroupBy({
      haber: [
        { FK_proveedor: 1, _sum: { saldo_pendiente: new Prisma.Decimal(500) } },
      ],
      pendientes: [
        {
          FK_proveedor: 1,
          _count: { _all: 1 },
          _min: { fecha_vencimiento: new Date('2026-01-10') },
        },
      ],
    });

    const resultado = await service.findAll({ page: 1, limit: 10 });

    expect(resultado.data).toEqual([
      {
        id_proveedor: 1,
        razon_social: 'Acme SA',
        cuit: '20304050601',
        saldo: -500,
        cantidad_comprobantes_pendientes: 1,
        vencimiento_mas_antiguo: new Date('2026-01-10'),
      },
    ]);
  });

  it('calcula el saldo como DEBE menos HABER por proveedor', async () => {
    prisma.pROVEEDOR.findMany.mockResolvedValue([proveedor(1, 'Acme SA')]);
    prisma.cOMPROBANTEPROVEEDOR.groupBy = mockearGroupBy({
      debe: [
        {
          FK_proveedor: 1,
          _sum: { saldo_pendiente: new Prisma.Decimal(1000) },
        },
      ],
      haber: [
        { FK_proveedor: 1, _sum: { saldo_pendiente: new Prisma.Decimal(300) } },
      ],
    });

    const resultado = await service.findAll({ page: 1, limit: 10 });

    expect(resultado.data[0].saldo).toBe(700);
  });

  it('filtra por condición de saldo (deudor, a favor, sin saldo)', async () => {
    prisma.pROVEEDOR.findMany.mockResolvedValue([
      proveedor(1, 'Deudor SA'),
      proveedor(2, 'Acreedor SA'),
      proveedor(3, 'Sin Saldo SA'),
    ]);
    prisma.cOMPROBANTEPROVEEDOR.groupBy = mockearGroupBy({
      debe: [
        { FK_proveedor: 1, _sum: { saldo_pendiente: new Prisma.Decimal(100) } },
      ],
      haber: [
        { FK_proveedor: 2, _sum: { saldo_pendiente: new Prisma.Decimal(50) } },
      ],
    });

    const deudores = await service.findAll({
      condicion_saldo: 'DEUDOR',
      page: 1,
      limit: 10,
    });
    const aFavor = await service.findAll({
      condicion_saldo: 'A_FAVOR',
      page: 1,
      limit: 10,
    });
    const sinSaldo = await service.findAll({
      condicion_saldo: 'SIN_SALDO',
      page: 1,
      limit: 10,
    });

    expect(deudores.data.map((f) => f.id_proveedor)).toEqual([1]);
    expect(aFavor.data.map((f) => f.id_proveedor)).toEqual([2]);
    expect(sinSaldo.data.map((f) => f.id_proveedor)).toEqual([3]);

    // El resumen es el mismo sin importar qué pestaña/filtro esté mirando la
    // tabla: siempre cuenta sobre el universo completo de proveedores.
    const resumenEsperado = { deudores: 1, a_favor: 1, sin_saldo: 1 };
    expect(deudores.resumen).toEqual(resumenEsperado);
    expect(aFavor.resumen).toEqual(resumenEsperado);
    expect(sinSaldo.resumen).toEqual(resumenEsperado);
  });

  it('ordena el resultado por saldo descendente', async () => {
    prisma.pROVEEDOR.findMany.mockResolvedValue([
      proveedor(1, 'Menor'),
      proveedor(2, 'Mayor'),
    ]);
    prisma.cOMPROBANTEPROVEEDOR.groupBy = mockearGroupBy({
      debe: [
        { FK_proveedor: 1, _sum: { saldo_pendiente: new Prisma.Decimal(100) } },
        { FK_proveedor: 2, _sum: { saldo_pendiente: new Prisma.Decimal(900) } },
      ],
    });

    const resultado = await service.findAll({ page: 1, limit: 10 });

    expect(resultado.data.map((f) => f.id_proveedor)).toEqual([2, 1]);
  });

  it('ejecuta un número fijo de queries, independiente de la cantidad de proveedores', async () => {
    prisma.pROVEEDOR.findMany.mockResolvedValue([
      proveedor(1, 'A'),
      proveedor(2, 'B'),
      proveedor(3, 'C'),
    ]);
    const groupBy = mockearGroupBy({});
    prisma.cOMPROBANTEPROVEEDOR.groupBy = groupBy;

    await service.findAll({ page: 1, limit: 10 });

    expect(prisma.pROVEEDOR.findMany).toHaveBeenCalledTimes(1);
    expect(groupBy).toHaveBeenCalledTimes(3);
  });

  it('pagina el resultado ya ordenado y filtrado', async () => {
    prisma.pROVEEDOR.findMany.mockResolvedValue([
      proveedor(1, 'A'),
      proveedor(2, 'B'),
      proveedor(3, 'C'),
    ]);
    prisma.cOMPROBANTEPROVEEDOR.groupBy = mockearGroupBy({
      debe: [
        { FK_proveedor: 1, _sum: { saldo_pendiente: new Prisma.Decimal(100) } },
        { FK_proveedor: 2, _sum: { saldo_pendiente: new Prisma.Decimal(200) } },
        { FK_proveedor: 3, _sum: { saldo_pendiente: new Prisma.Decimal(300) } },
      ],
    });

    const resultado = await service.findAll({ page: 2, limit: 2 });

    expect(resultado.meta).toEqual({ total: 3, page: 2, limit: 2 });
    expect(resultado.data.map((f) => f.id_proveedor)).toEqual([1]);
  });
});
