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
    pROVEEDOR: { findMany: jest.Mock; findUnique: jest.Mock };
    cOMPROBANTEPROVEEDOR: { groupBy: jest.Mock; findMany: jest.Mock };
    pAGO: { findMany: jest.Mock };
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
      pROVEEDOR: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      cOMPROBANTEPROVEEDOR: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      pAGO: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuentaCorrienteService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CuentaCorrienteService);
  });

  const proveedor = (id: number, razon_social: string, estado = true) => ({
    id_proveedor: id,
    razon_social,
    cuit: `2030405060${id}`,
    estado,
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
        estado: true,
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
    const resumenEsperado = {
      deudores: 1,
      a_favor: 1,
      sin_saldo: 1,
      saldo_total: 50, // 100 (proveedor 1) − 50 (proveedor 2) + 0
    };
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

  describe('saldo_total (balance neto del resumen)', () => {
    it('da positivo cuando el conjunto de proveedores es deudor neto', async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([
        proveedor(1, 'A'),
        proveedor(2, 'B'),
      ]);
      prisma.cOMPROBANTEPROVEEDOR.groupBy = mockearGroupBy({
        debe: [
          {
            FK_proveedor: 1,
            _sum: { saldo_pendiente: new Prisma.Decimal(1000) },
          },
        ],
        haber: [
          {
            FK_proveedor: 2,
            _sum: { saldo_pendiente: new Prisma.Decimal(300) },
          },
        ],
      });

      const resultado = await service.findAll({ page: 1, limit: 10 });

      expect(resultado.resumen.saldo_total).toBe(700);
    });

    it('da negativo cuando el conjunto de proveedores es acreedor neto', async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([proveedor(1, 'A')]);
      prisma.cOMPROBANTEPROVEEDOR.groupBy = mockearGroupBy({
        haber: [
          {
            FK_proveedor: 1,
            _sum: { saldo_pendiente: new Prisma.Decimal(200) },
          },
        ],
      });

      const resultado = await service.findAll({ page: 1, limit: 10 });

      expect(resultado.resumen.saldo_total).toBe(-200);
    });

    it('da cero sin proveedores o sin comprobantes con saldo', async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([proveedor(1, 'A')]);

      const resultado = await service.findAll({ page: 1, limit: 10 });

      expect(resultado.resumen.saldo_total).toBe(0);
    });
  });

  describe('filtro por estado del proveedor', () => {
    const whereDeLaUltimaLlamada = () =>
      (prisma.pROVEEDOR.findMany.mock.calls.at(-1) as [{ where: unknown }])[0]
        .where;

    it('sin filtro, trae activos e inactivos (no filtra por estado)', async () => {
      await service.findAll({ page: 1, limit: 10 });

      expect(whereDeLaUltimaLlamada()).not.toHaveProperty('estado');
    });

    it('estado=true trae solo proveedores activos', async () => {
      await service.findAll({ estado: true, page: 1, limit: 10 });

      expect(whereDeLaUltimaLlamada()).toMatchObject({ estado: true });
    });

    it('estado=false trae solo proveedores dados de baja', async () => {
      await service.findAll({ estado: false, page: 1, limit: 10 });

      expect(whereDeLaUltimaLlamada()).toMatchObject({ estado: false });
    });

    it('un proveedor dado de baja puede aparecer con saldo pendiente', async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([
        proveedor(1, 'Ex Proveedor SA', false),
      ]);
      prisma.cOMPROBANTEPROVEEDOR.groupBy = mockearGroupBy({
        debe: [
          {
            FK_proveedor: 1,
            _sum: { saldo_pendiente: new Prisma.Decimal(400) },
          },
        ],
      });

      const resultado = await service.findAll({
        estado: false,
        page: 1,
        limit: 10,
      });

      expect(resultado.data[0]).toMatchObject({ estado: false, saldo: 400 });
    });
  });

  describe('obtenerMovimientos', () => {
    const proveedorDetalle = {
      id_proveedor: 5,
      razon_social: 'Corralón Test SRL',
      cuit: '30712345612',
    };

    /** Factura A del 10/01, aumenta_saldo=true → va a HABER. */
    const comprobanteHaber = {
      id_comprobante_proveedor: 101,
      fecha_emision: new Date('2026-01-10'),
      fecha_vencimiento: new Date('2026-02-10'),
      letra: 'A',
      punto_de_venta: 1,
      numero: 100,
      importe_total: new Prisma.Decimal(1000),
      hora_creacion: new Date('2026-01-10T09:00:00Z'),
      tipoComprobante: { nombre: 'Factura A', aumenta_saldo: true },
    };

    /** Nota de crédito del 05/02, aumenta_saldo=false → va a DEBE. */
    const comprobanteDebe = {
      id_comprobante_proveedor: 102,
      fecha_emision: new Date('2026-02-05'),
      fecha_vencimiento: new Date('2026-02-05'),
      letra: 'A',
      punto_de_venta: 1,
      numero: 5,
      importe_total: new Prisma.Decimal(200),
      hora_creacion: new Date('2026-02-05T09:00:00Z'),
      tipoComprobante: { nombre: 'Nota de Crédito A', aumenta_saldo: false },
    };

    /** Pago del 15/02 → siempre DEBE. */
    const pago = {
      id_pago: 50,
      fecha_pago: new Date('2026-02-15'),
      importe_total: new Prisma.Decimal(500),
      hora_creacion: new Date('2026-02-15T09:00:00Z'),
      formaPago: { nombre: 'Transferencia' },
    };

    beforeEach(() => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(proveedorDetalle);
    });

    it('tira 404 si el proveedor no existe', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(null);

      await expect(service.obtenerMovimientos(999, {})).rejects.toThrow(
        'No existe un proveedor con id 999',
      );
    });

    it('solo consulta comprobantes REGISTRADOS y pagos CONFIRMADOS', async () => {
      await service.obtenerMovimientos(5, {});

      const whereComprobante = (
        prisma.cOMPROBANTEPROVEEDOR.findMany.mock.calls as [
          { where: unknown },
        ][]
      )[0][0].where;
      const wherePago = (
        prisma.pAGO.findMany.mock.calls as [{ where: unknown }][]
      )[0][0].where;

      expect(whereComprobante).toMatchObject({
        FK_proveedor: 5,
        estado: 'REGISTRADO',
      });
      expect(wherePago).toMatchObject({
        FK_proveedor: 5,
        estado: 'CONFIRMADA',
      });
    });

    it('arma el debe/haber por clase y acumula en orden cronológico', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteDebe,
        comprobanteHaber,
      ]);
      prisma.pAGO.findMany.mockResolvedValue([pago]);

      const resultado = await service.obtenerMovimientos(5, {});

      expect(resultado.proveedor).toEqual(proveedorDetalle);
      expect(resultado.movimientos).toEqual([
        expect.objectContaining({
          clase: 'COMPROBANTE',
          id_referencia: 101,
          debe: null,
          haber: 1000,
          saldo_acumulado: 1000,
        }),
        expect.objectContaining({
          clase: 'COMPROBANTE',
          id_referencia: 102,
          debe: 200,
          haber: null,
          saldo_acumulado: 800,
        }),
        expect.objectContaining({
          clase: 'PAGO',
          id_referencia: 50,
          tipo: 'Transferencia',
          debe: 500,
          haber: null,
          saldo_acumulado: 300,
        }),
      ]);
    });

    it('desempata por hora_creacion (no por id) cuando dos movimientos caen el mismo día', async () => {
      // fecha_emision y fecha_pago caen el mismo día (típico: se cargan sin
      // hora). El comprobante se creó antes en el sistema aunque tenga un id
      // más alto que el pago — hora_creacion tiene que ganarle al id.
      const comprobanteA = {
        ...comprobanteDebe,
        id_comprobante_proveedor: 9,
        hora_creacion: new Date('2026-02-05T09:00:00Z'),
      };
      const pagoMismoDia = {
        ...pago,
        id_pago: 3,
        fecha_pago: comprobanteDebe.fecha_emision,
        hora_creacion: new Date('2026-02-05T16:00:00Z'),
      };
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([comprobanteA]);
      prisma.pAGO.findMany.mockResolvedValue([pagoMismoDia]);

      const resultado = await service.obtenerMovimientos(5, {});

      // El comprobante (id 9, creado primero) va antes que el pago (id 3,
      // creado después) — si desempatara por id solo, el orden sería [3, 9].
      expect(resultado.movimientos.map((m) => m.id_referencia)).toEqual([9, 3]);
    });

    it('cae al id como último recurso si hora_creacion también empata', async () => {
      const comprobanteA = {
        ...comprobanteDebe,
        id_comprobante_proveedor: 9,
        hora_creacion: new Date('2026-02-05T09:00:00Z'),
      };
      const pagoMismoInstante = {
        ...pago,
        id_pago: 3,
        fecha_pago: comprobanteDebe.fecha_emision,
        hora_creacion: comprobanteA.hora_creacion,
      };
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([comprobanteA]);
      prisma.pAGO.findMany.mockResolvedValue([pagoMismoInstante]);

      const resultado = await service.obtenerMovimientos(5, {});

      expect(resultado.movimientos.map((m) => m.id_referencia)).toEqual([3, 9]);
    });

    it('con fechaDesde antepone una fila de apertura y el acumulado sigue cerrando', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteDebe,
        comprobanteHaber,
      ]);
      prisma.pAGO.findMany.mockResolvedValue([pago]);

      const sinFiltro = await service.obtenerMovimientos(5, {});
      const saldoFinalSinFiltro = sinFiltro.movimientos.at(-1)!.saldo_acumulado;

      const conFiltro = await service.obtenerMovimientos(5, {
        fechaDesde: new Date('2026-02-10'),
      });

      // Apertura = acumulado real justo antes del 10/02 (factura en HABER +
      // NC en DEBE, sin el pago del 15/02 todavía): 1000 - 200 = 800.
      expect(conFiltro.movimientos[0]).toMatchObject({
        clase: 'APERTURA',
        id_referencia: null,
        saldo_acumulado: 800,
      });
      // El acumulado sigue cerrando: la última fila da lo mismo que sin filtro.
      expect(conFiltro.movimientos.at(-1)!.saldo_acumulado).toBe(
        saldoFinalSinFiltro,
      );
    });

    it('sin fechaDesde no hay fila de apertura', async () => {
      const resultado = await service.obtenerMovimientos(5, {});

      expect(resultado.movimientos.some((m) => m.clase === 'APERTURA')).toBe(
        false,
      );
    });

    it('clase filtra qué filas se muestran, pero no recalcula el saldo_acumulado', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        comprobanteDebe,
        comprobanteHaber,
      ]);
      prisma.pAGO.findMany.mockResolvedValue([pago]);

      const resultado = await service.obtenerMovimientos(5, {
        clase: 'PAGO',
      });

      expect(resultado.movimientos).toHaveLength(1);
      // Sigue siendo 300 (real), no -500 (como si el pago fuera lo único
      // que existió en la cuenta).
      expect(resultado.movimientos[0]).toMatchObject({
        clase: 'PAGO',
        saldo_acumulado: 300,
      });
    });
  });
});
