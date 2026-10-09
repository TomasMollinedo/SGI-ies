import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PagoService } from '../tesoreria/pago/pago.service';
import { TableroService } from './tablero.service';
import {
  QueryIngresosEgresosDto,
  queryIngresosEgresosSchema,
} from './dto/query-ingresos-egresos.dto';
import {
  QueryMargenProyectoDto,
  queryMargenProyectoSchema,
} from './dto/query-margen-proyecto.dto';

type Proyecto = { id_proyecto: number; nombre: string };

const PROYECTO_A: Proyecto = { id_proyecto: 1, nombre: 'Torre A' };
const PROYECTO_B: Proyecto = { id_proyecto: 2, nombre: 'Barrio B' };

/** Una línea de cobro confirmado, tal como la trae `DETALLECOBRO.findMany`. */
type LineaCobro = { fecha: string; importe: number; proyecto: Proyecto };
/** Un pago confirmado: el service solo ve su total a través de `PagoService`. */
type PagoConfirmado = { fecha: string; importe: number };

type ArgumentoFindMany = {
  where: {
    cobro: { estado: string; fecha_cobro: { gte: Date; lte: Date } };
    cuota?: unknown;
  };
};

const parsear = (entrada: object): QueryIngresosEgresosDto =>
  queryIngresosEgresosSchema.parse(entrada);

const parsearMargen = (entrada: object = {}): QueryMargenProyectoDto =>
  queryMargenProyectoSchema.parse(entrada);

describe('TableroService', () => {
  let service: TableroService;
  let detalleCobroFindMany: jest.Mock;
  let proyectoFindUnique: jest.Mock;
  let calcularResumenPeriodo: jest.Mock;

  // obtenerMargenProyecto (T153): tres consultas independientes, cada una
  // con su propia semilla configurable por test.
  let proyectoFindMany: jest.Mock;
  let ventaFindMany: jest.Mock;
  let publicacionFindMany: jest.Mock;
  let proyectosActivosSeed: {
    id_proyecto: number;
    codigo: string;
    nombre: string;
    unidadesActivas: number;
    /** Sin cargar: el proyecto no tiene fecha de inicio. */
    fechaInicio?: string;
    /** Por defecto, la misma para todos: el orden queda por nombre. */
    horaCreacion?: string;
  }[];
  let ventasVigentesSeed: {
    FK_proyecto: number;
    unidadActiva: boolean;
    costo: number;
    precioVenta: number | null;
  }[];
  let publicacionesDisponiblesSeed: {
    FK_proyecto: number;
    unidadActiva: boolean;
    costo: number;
    precioLista: number | null;
  }[];

  let lineasCobro: LineaCobro[];
  let pagos: PagoConfirmado[];

  beforeEach(() => {
    lineasCobro = [];
    pagos = [];
    proyectosActivosSeed = [];
    ventasVigentesSeed = [];
    publicacionesDisponiblesSeed = [];

    proyectoFindMany = jest.fn(() =>
      Promise.resolve(
        proyectosActivosSeed.map((p) => ({
          id_proyecto: p.id_proyecto,
          codigo: p.codigo,
          nombre: p.nombre,
          fecha_inicio: p.fechaInicio ? new Date(p.fechaInicio) : null,
          hora_creacion: new Date(p.horaCreacion ?? '2026-01-01T12:00:00Z'),
          _count: { unidadesFuncionales: p.unidadesActivas },
        })),
      ),
    );
    ventaFindMany = jest.fn(() =>
      Promise.resolve(
        ventasVigentesSeed.map((v) => ({
          publicacion: {
            unidadFuncional: {
              estado: v.unidadActiva,
              costo: new Prisma.Decimal(v.costo),
              FK_proyecto: v.FK_proyecto,
            },
          },
          planPago:
            v.precioVenta === null
              ? null
              : { precio_venta: new Prisma.Decimal(v.precioVenta) },
        })),
      ),
    );
    publicacionFindMany = jest.fn(() =>
      Promise.resolve(
        publicacionesDisponiblesSeed.map((p) => ({
          precio_lista:
            p.precioLista === null ? null : new Prisma.Decimal(p.precioLista),
          unidadFuncional: {
            estado: p.unidadActiva,
            costo: new Prisma.Decimal(p.costo),
            FK_proyecto: p.FK_proyecto,
          },
        })),
      ),
    );

    // Simula la base: filtra por el rango que pide el service, así los
    // cobros del rango anterior y del actual no se mezclan.
    detalleCobroFindMany = jest.fn(({ where }: ArgumentoFindMany) => {
      const { gte, lte } = where.cobro.fecha_cobro;

      return Promise.resolve(
        lineasCobro
          .filter((linea) => {
            const fecha = new Date(linea.fecha);
            return fecha >= gte && fecha <= lte;
          })
          .map((linea) => ({
            importe_imputado: new Prisma.Decimal(linea.importe),
            cobro: { fecha_cobro: new Date(linea.fecha) },
            cuota: {
              venta: {
                publicacion: {
                  unidadFuncional: { proyecto: linea.proyecto },
                },
              },
            },
          })),
      );
    });
    proyectoFindUnique = jest.fn().mockResolvedValue({ id_proyecto: 1 });
    calcularResumenPeriodo = jest.fn(
      ({ fechaDesde, fechaHasta }: { fechaDesde: Date; fechaHasta: Date }) =>
        Promise.resolve({
          totalEgresos: pagos
            .filter((pago) => {
              const fecha = new Date(pago.fecha);
              return fecha >= fechaDesde && fecha <= fechaHasta;
            })
            .reduce((total, pago) => total + pago.importe, 0),
        }),
    );

    service = new TableroService(
      {
        dETALLECOBRO: { findMany: detalleCobroFindMany },
        pROYECTO: {
          findUnique: proyectoFindUnique,
          findMany: proyectoFindMany,
        },
        vENTA: { findMany: ventaFindMany },
        pUBLICACIONUNIDAD: { findMany: publicacionFindMany },
      } as unknown as PrismaService,
      { calcularResumenPeriodo } as unknown as PagoService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rango y períodos', () => {
    it('sin fechas usa el año en curso agrupado por mes', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-06T12:00:00Z'));

      const resultado = await service.obtenerIngresosEgresos(parsear({}));

      expect(resultado.filtros).toEqual({
        agrupacion: 'MENSUAL',
        fechaDesde: '2026-01-01T03:00:00.000Z',
        fechaHasta: '2027-01-01T02:59:59.999Z',
        FK_proyecto: null,
      });
      expect(resultado.periodos).toHaveLength(12);
      expect(resultado.periodos[0].etiqueta).toBe('2026-01');
      expect(resultado.periodos[11].etiqueta).toBe('2026-12');
    });

    it('el año en curso se toma de Argentina: el 1 de enero a las 01:00 UTC todavía es diciembre', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2027-01-01T01:00:00Z'));

      const resultado = await service.obtenerIngresosEgresos(parsear({}));

      expect(resultado.periodos[0].etiqueta).toBe('2026-01');
    });

    it('agrupa por trimestre calendario', async () => {
      const resultado = await service.obtenerIngresosEgresos(
        parsear({
          agrupacion: 'TRIMESTRAL',
          fechaDesde: '2026-01-01',
          fechaHasta: '2026-12-31',
        }),
      );

      expect(resultado.periodos.map((p) => p.etiqueta)).toEqual([
        '2026-T1',
        '2026-T2',
        '2026-T3',
        '2026-T4',
      ]);
    });

    it('agrupa por año', async () => {
      const resultado = await service.obtenerIngresosEgresos(
        parsear({
          agrupacion: 'ANUAL',
          fechaDesde: '2024-06-15',
          fechaHasta: '2026-02-01',
        }),
      );

      expect(resultado.periodos.map((p) => p.etiqueta)).toEqual([
        '2024',
        '2025',
        '2026',
      ]);
    });

    it('recorta el primer y el último período al rango pedido', async () => {
      const resultado = await service.obtenerIngresosEgresos(
        parsear({
          fechaDesde: '2026-01-15',
          fechaHasta: '2026-02-10',
        }),
      );

      expect(resultado.periodos).toHaveLength(2);
      expect(resultado.periodos[0].desde).toBe('2026-01-15T03:00:00.000Z');
      expect(resultado.periodos[0].hasta).toBe('2026-02-01T02:59:59.999Z');
      expect(resultado.periodos[1].desde).toBe('2026-02-01T03:00:00.000Z');
      expect(resultado.periodos[1].hasta).toBe('2026-02-11T02:59:59.999Z');
    });

    it('una fechaHasta sin hora incluye todo ese día', async () => {
      const resultado = await service.obtenerIngresosEgresos(
        parsear({ fechaDesde: '2026-01-01', fechaHasta: '2026-01-31' }),
      );

      expect(resultado.filtros.fechaHasta).toBe('2026-02-01T02:59:59.999Z');
    });

    it('el rango anterior dura lo mismo y termina justo antes del actual', async () => {
      // Del 1 de enero al 31 de marzo: 90 días.
      const resultado = await service.obtenerIngresosEgresos(
        parsear({ fechaDesde: '2026-01-01', fechaHasta: '2026-03-31' }),
      );

      expect(resultado.rangoAnterior.desde).toBe('2025-10-03T03:00:00.000Z');
      expect(resultado.rangoAnterior.hasta).toBe('2026-01-01T02:59:59.999Z');
    });

    it('rechaza un rango con más de 60 períodos', async () => {
      await expect(
        service.obtenerIngresosEgresos(
          parsear({ fechaDesde: '2020-01-01', fechaHasta: '2026-12-31' }),
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validación de la query', () => {
    it('exige fechaDesde y fechaHasta juntas', () => {
      expect(
        queryIngresosEgresosSchema.safeParse({ fechaDesde: '2026-01-01' })
          .success,
      ).toBe(false);
      expect(
        queryIngresosEgresosSchema.safeParse({ fechaHasta: '2026-01-31' })
          .success,
      ).toBe(false);
    });

    it('rechaza un rango invertido', () => {
      expect(
        queryIngresosEgresosSchema.safeParse({
          fechaDesde: '2026-02-01',
          fechaHasta: '2026-01-01',
        }).success,
      ).toBe(false);
    });

    it('rechaza una agrupación desconocida', () => {
      expect(
        queryIngresosEgresosSchema.safeParse({ agrupacion: 'SEMANAL' }).success,
      ).toBe(false);
    });
  });

  describe('ingresos, egresos y resultado', () => {
    const consulta = parsear({
      fechaDesde: '2026-01-01',
      fechaHasta: '2026-03-31',
    });

    beforeEach(() => {
      lineasCobro = [
        // Rango actual
        {
          fecha: '2026-01-15T12:00:00-03:00',
          importe: 1000,
          proyecto: PROYECTO_A,
        },
        {
          fecha: '2026-01-20T12:00:00-03:00',
          importe: 500,
          proyecto: PROYECTO_A,
        },
        {
          fecha: '2026-01-20T12:00:00-03:00',
          importe: 250,
          proyecto: PROYECTO_B,
        },
        {
          fecha: '2026-02-10T12:00:00-03:00',
          importe: 2000,
          proyecto: PROYECTO_B,
        },
        // Rango anterior
        {
          fecha: '2025-12-10T12:00:00-03:00',
          importe: 400,
          proyecto: PROYECTO_A,
        },
      ];
      pagos = [
        { fecha: '2026-01-05T12:00:00-03:00', importe: 800 },
        { fecha: '2026-02-05T12:00:00-03:00', importe: 100 },
        { fecha: '2025-11-05T12:00:00-03:00', importe: 200 },
      ];
    });

    it('calcula ingresos, egresos y resultado de cada período', async () => {
      const { periodos } = await service.obtenerIngresosEgresos(consulta);

      expect(
        periodos.map(({ etiqueta, ingresos, egresos, resultado }) => ({
          etiqueta,
          ingresos,
          egresos,
          resultado,
        })),
      ).toEqual([
        { etiqueta: '2026-01', ingresos: 1750, egresos: 800, resultado: 950 },
        { etiqueta: '2026-02', ingresos: 2000, egresos: 100, resultado: 1900 },
        { etiqueta: '2026-03', ingresos: 0, egresos: 0, resultado: 0 },
      ]);
    });

    it('abre los ingresos por proyecto en cada período y en el total, del mayor al menor', async () => {
      const { periodos, totales } =
        await service.obtenerIngresosEgresos(consulta);

      expect(periodos[0].ingresosPorProyecto).toEqual([
        { proyecto: PROYECTO_A, total: 1500 },
        { proyecto: PROYECTO_B, total: 250 },
      ]);
      expect(periodos[2].ingresosPorProyecto).toEqual([]);
      expect(totales.ingresosPorProyecto).toEqual([
        { proyecto: PROYECTO_B, total: 2250 },
        { proyecto: PROYECTO_A, total: 1500 },
      ]);
    });

    it('totaliza el rango y lo compara con el rango anterior', async () => {
      const { totales, rangoAnterior, variacion } =
        await service.obtenerIngresosEgresos(consulta);

      expect(totales).toMatchObject({
        ingresos: 3750,
        egresos: 900,
        resultado: 2850,
      });
      expect(rangoAnterior).toMatchObject({
        ingresos: 400,
        egresos: 200,
        resultado: 200,
      });
      expect(variacion).toEqual({
        ingresos: 837.5,
        egresos: 350,
        resultado: 1325,
      });
    });

    it('solo suma cobros confirmados', async () => {
      await service.obtenerIngresosEgresos(consulta);

      const [argumento] = detalleCobroFindMany.mock.calls[0] as [
        ArgumentoFindMany,
      ];
      expect(argumento.where.cobro.estado).toBe('CONFIRMADO');
    });

    it('un cobro de la última hora del mes en Argentina cuenta en ese mes, no en el siguiente', async () => {
      // 23:30 del 31 de enero en Argentina = 02:30 UTC del 1 de febrero.
      lineasCobro = [
        {
          fecha: '2026-01-31T23:30:00-03:00',
          importe: 10,
          proyecto: PROYECTO_A,
        },
      ];

      const { periodos } = await service.obtenerIngresosEgresos(consulta);

      expect(periodos[0].ingresos).toBe(10);
      expect(periodos[1].ingresos).toBe(0);
    });

    it('un resultado que pasa de -100 a -50 figura como mejora', async () => {
      lineasCobro = [];
      pagos = [
        { fecha: '2026-01-05T12:00:00-03:00', importe: 50 },
        { fecha: '2025-11-05T12:00:00-03:00', importe: 100 },
      ];

      const { variacion } = await service.obtenerIngresosEgresos(consulta);

      expect(variacion.resultado).toBe(50);
    });

    it('la variación es null si el rango anterior estuvo en cero y el actual no', async () => {
      lineasCobro = lineasCobro.filter((l) => l.fecha > '2026');
      pagos = pagos.filter((p) => p.fecha > '2026');

      const { variacion } = await service.obtenerIngresosEgresos(consulta);

      expect(variacion).toEqual({
        ingresos: null,
        egresos: null,
        resultado: null,
      });
    });
  });

  describe('filtro por proyecto', () => {
    const consulta = parsear({
      fechaDesde: '2026-01-01',
      fechaHasta: '2026-03-31',
      FK_proyecto: 1,
    });

    beforeEach(() => {
      lineasCobro = [
        {
          fecha: '2026-01-15T12:00:00-03:00',
          importe: 1000,
          proyecto: PROYECTO_A,
        },
        {
          fecha: '2025-12-10T12:00:00-03:00',
          importe: 400,
          proyecto: PROYECTO_A,
        },
      ];
      pagos = [
        { fecha: '2026-01-05T12:00:00-03:00', importe: 800 },
        { fecha: '2025-11-05T12:00:00-03:00', importe: 200 },
      ];
    });

    it('no devuelve el resultado en ningún nivel', async () => {
      const resultado = await service.obtenerIngresosEgresos(consulta);

      expect(resultado.filtros.FK_proyecto).toBe(1);
      expect(resultado.totales.resultado).toBeNull();
      expect(resultado.rangoAnterior.resultado).toBeNull();
      expect(resultado.variacion.resultado).toBeNull();
      expect(resultado.periodos.every((p) => p.resultado === null)).toBe(true);
    });

    it('filtra los ingresos por proyecto pero no los egresos', async () => {
      const resultado = await service.obtenerIngresosEgresos(consulta);

      const [argumento] = detalleCobroFindMany.mock.calls[0] as [
        ArgumentoFindMany,
      ];
      expect(argumento.where.cuota).toEqual({
        venta: { publicacion: { unidadFuncional: { FK_proyecto: 1 } } },
      });
      expect(resultado.totales.egresos).toBe(800);
      const filtrosDeEgresos = calcularResumenPeriodo.mock.calls as object[][];
      expect(
        filtrosDeEgresos.some(([filtros]) => 'FK_proyecto' in filtros),
      ).toBe(false);
    });

    it('responde 404 si el proyecto no existe', async () => {
      proyectoFindUnique.mockResolvedValue(null);

      await expect(service.obtenerIngresosEgresos(consulta)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('sin datos', () => {
    it('cada indicador devuelve cero, no null ni error', async () => {
      const resultado = await service.obtenerIngresosEgresos(
        parsear({ fechaDesde: '2026-01-01', fechaHasta: '2026-03-31' }),
      );

      expect(resultado.totales).toEqual({
        ingresos: 0,
        egresos: 0,
        resultado: 0,
        ingresosPorProyecto: [],
      });
      expect(resultado.rangoAnterior).toMatchObject({
        ingresos: 0,
        egresos: 0,
        resultado: 0,
      });
      expect(resultado.variacion).toEqual({
        ingresos: 0,
        egresos: 0,
        resultado: 0,
      });
      expect(
        resultado.periodos.every(
          (p) => p.ingresos === 0 && p.egresos === 0 && p.resultado === 0,
        ),
      ).toBe(true);
    });
  });

  describe('obtenerMargenProyecto (T153)', () => {
    it('separa margen realizado (vendidas) y proyectado (Disponibles), y suma el total esperado', async () => {
      proyectosActivosSeed = [
        { id_proyecto: 1, codigo: 'P1', nombre: 'Torre A', unidadesActivas: 3 },
      ];
      ventasVigentesSeed = [
        {
          FK_proyecto: 1,
          unidadActiva: true,
          costo: 10000,
          precioVenta: 15000,
        },
      ];
      publicacionesDisponiblesSeed = [
        { FK_proyecto: 1, unidadActiva: true, costo: 9000, precioLista: 12000 },
      ];

      const resultado = await service.obtenerMargenProyecto(parsearMargen());

      expect(resultado.data).toHaveLength(1);
      const [torreA] = resultado.data;
      expect(torreA.unidades_activas).toBe(3);
      expect(torreA.unidades_vendidas).toBe(1);
      expect(torreA.unidades_fuera_de_calculo).toBe(1); // 3 - 1 vendida - 1 disponible
      expect(torreA.margen_realizado).toEqual({
        importe: 5000,
        porcentaje: 33.33,
      });
      expect(torreA.margen_proyectado).toEqual({
        importe: 3000,
        porcentaje: 25,
      });
      expect(torreA.margen_total_esperado).toBe(8000);
      expect(resultado.margen_total_realizado).toBe(5000);
    });

    // Costo 8.000 y precio 10.000: sobre las ventas el margen es 20 %; sobre
    // el costo sería 25 %. Los dos números son distintos a propósito, para que
    // un cambio de denominador no pase silencioso.
    it('el porcentaje del margen es sobre las ventas (margen ÷ precio), no sobre el costo', async () => {
      proyectosActivosSeed = [
        { id_proyecto: 1, codigo: 'P1', nombre: 'Torre A', unidadesActivas: 2 },
      ];
      ventasVigentesSeed = [
        {
          FK_proyecto: 1,
          unidadActiva: true,
          costo: 8000,
          precioVenta: 10000,
        },
      ];
      publicacionesDisponiblesSeed = [
        { FK_proyecto: 1, unidadActiva: true, costo: 8000, precioLista: 10000 },
      ];

      const resultado = await service.obtenerMargenProyecto(parsearMargen());

      const [torreA] = resultado.data;
      expect(torreA.margen_realizado).toEqual({
        importe: 2000,
        porcentaje: 20,
      });
      expect(torreA.margen_proyectado).toEqual({
        importe: 2000,
        porcentaje: 20,
      });
    });

    it('el porcentaje de unidades vendidas es sobre las activas del proyecto', async () => {
      proyectosActivosSeed = [
        { id_proyecto: 1, codigo: 'P1', nombre: 'Torre A', unidadesActivas: 4 },
      ];
      ventasVigentesSeed = [
        {
          FK_proyecto: 1,
          unidadActiva: true,
          costo: 10000,
          precioVenta: 12000,
        },
      ];

      const resultado = await service.obtenerMargenProyecto(parsearMargen());

      expect(resultado.data[0].porcentaje_vendidas).toBe(25);
    });

    it('sin unidades activas, los porcentajes dan 0 y no NaN ni Infinity', async () => {
      proyectosActivosSeed = [
        { id_proyecto: 1, codigo: 'P1', nombre: 'Vacío', unidadesActivas: 0 },
      ];

      const resultado = await service.obtenerMargenProyecto(parsearMargen());

      expect(resultado.data[0]).toMatchObject({
        unidades_activas: 0,
        porcentaje_vendidas: 0,
        margen_realizado: { importe: 0, porcentaje: 0 },
        margen_proyectado: { importe: 0, porcentaje: 0 },
        margen_total_esperado: 0,
      });
    });

    it('una unidad activa sin publicación o sin precio queda fuera del cálculo, no rompe nada', async () => {
      proyectosActivosSeed = [
        { id_proyecto: 1, codigo: 'P1', nombre: 'Torre A', unidadesActivas: 2 },
      ];
      // Ninguna venta ni publicación Disponible para este proyecto.

      const resultado = await service.obtenerMargenProyecto(parsearMargen());

      expect(resultado.data[0].unidades_fuera_de_calculo).toBe(2);
      expect(resultado.data[0].margen_realizado.importe).toBe(0);
      expect(resultado.data[0].margen_proyectado.importe).toBe(0);
    });

    it('el margen realizado total incluye ventas de proyectos dados de baja; el listado por proyecto no', async () => {
      proyectosActivosSeed = [
        { id_proyecto: 1, codigo: 'P1', nombre: 'Torre A', unidadesActivas: 1 },
      ];
      ventasVigentesSeed = [
        {
          FK_proyecto: 1,
          unidadActiva: true,
          costo: 10000,
          precioVenta: 13000,
        },
        // Proyecto 2 no está en proyectosActivosSeed: está de baja.
        { FK_proyecto: 2, unidadActiva: true, costo: 5000, precioVenta: 7000 },
      ];

      const resultado = await service.obtenerMargenProyecto(parsearMargen());

      expect(resultado.data).toHaveLength(1);
      expect(resultado.data[0].margen_realizado.importe).toBe(3000);
      // 3000 (proyecto activo) + 2000 (proyecto de baja) = 5000.
      expect(resultado.margen_total_realizado).toBe(5000);
    });

    it('no cuenta una venta ni una publicación de una unidad dada de baja (red de seguridad)', async () => {
      proyectosActivosSeed = [
        { id_proyecto: 1, codigo: 'P1', nombre: 'Torre A', unidadesActivas: 1 },
      ];
      ventasVigentesSeed = [
        {
          FK_proyecto: 1,
          unidadActiva: false,
          costo: 10000,
          precioVenta: 13000,
        },
      ];
      publicacionesDisponiblesSeed = [
        {
          FK_proyecto: 1,
          unidadActiva: false,
          costo: 9000,
          precioLista: 11000,
        },
      ];

      const resultado = await service.obtenerMargenProyecto(parsearMargen());

      expect(resultado.data[0].unidades_vendidas).toBe(0);
      expect(resultado.data[0].margen_realizado.importe).toBe(0);
      expect(resultado.data[0].margen_proyectado.importe).toBe(0);
      expect(resultado.margen_total_realizado).toBe(0);
    });

    it('no incluye intereses: usa precio_venta, no un total con financiación', async () => {
      proyectosActivosSeed = [
        { id_proyecto: 1, codigo: 'P1', nombre: 'Torre A', unidadesActivas: 1 },
      ];
      // precio_venta = 10000 (lo acordado); si incluyera intereses sería más.
      ventasVigentesSeed = [
        { FK_proyecto: 1, unidadActiva: true, costo: 8000, precioVenta: 10000 },
      ];

      const resultado = await service.obtenerMargenProyecto(parsearMargen());

      expect(resultado.data[0].margen_realizado.importe).toBe(2000);
    });

    describe('filtro, orden y paginación', () => {
      // Orden esperado, del más reciente al más antiguo: P3 (inicio 2026-06),
      // P4 (sin inicio, alta 2026-03), P1 (inicio 2025-08), P2 (inicio 2024-02).
      beforeEach(() => {
        proyectosActivosSeed = [
          {
            id_proyecto: 1,
            codigo: 'P1',
            nombre: 'Alfa',
            unidadesActivas: 2,
            fechaInicio: '2025-08-01T03:00:00Z',
          },
          {
            id_proyecto: 2,
            codigo: 'P2',
            nombre: 'Beta',
            unidadesActivas: 1,
            fechaInicio: '2024-02-01T03:00:00Z',
            // Dado de alta último: con fecha de inicio, el alta no cuenta.
            horaCreacion: '2026-09-01T12:00:00Z',
          },
          {
            id_proyecto: 3,
            codigo: 'P3',
            nombre: 'Gama',
            unidadesActivas: 4,
            fechaInicio: '2026-06-01T03:00:00Z',
          },
          {
            id_proyecto: 4,
            codigo: 'P4',
            nombre: 'Zeta',
            unidadesActivas: 3,
            horaCreacion: '2026-03-10T12:00:00Z',
          },
        ];
        // Margen total esperado: P1 = 1000, P2 = 3000, P3 = 2000, P4 = 0.
        ventasVigentesSeed = [
          {
            FK_proyecto: 1,
            unidadActiva: true,
            costo: 9000,
            precioVenta: 10000,
          },
          {
            FK_proyecto: 2,
            unidadActiva: true,
            costo: 7000,
            precioVenta: 10000,
          },
          {
            FK_proyecto: 3,
            unidadActiva: true,
            costo: 8000,
            precioVenta: 10000,
          },
        ];
      });

      it('sin parámetros usa la página 1 de a 10 y ordena por fecha de inicio, del más reciente al más antiguo', async () => {
        const resultado = await service.obtenerMargenProyecto(parsearMargen());

        // El margen no interviene: P2 tiene el mayor y queda último.
        expect(resultado.data.map((fila) => fila.proyecto.codigo)).toEqual([
          'P3',
          'P4',
          'P1',
          'P2',
        ]);
        expect(resultado.meta).toEqual({ total: 4, page: 1, limit: 10 });
      });

      it('un proyecto sin fecha de inicio se ordena por su fecha de alta, entre los demás', async () => {
        proyectosActivosSeed[3].horaCreacion = '2023-01-01T12:00:00Z';

        const resultado = await service.obtenerMargenProyecto(parsearMargen());

        expect(resultado.data.map((fila) => fila.proyecto.codigo)).toEqual([
          'P3',
          'P1',
          'P2',
          'P4',
        ]);
      });

      it('devuelve solo la página pedida; el total y los agregados son de todas las filas', async () => {
        const resultado = await service.obtenerMargenProyecto(
          parsearMargen({ page: '2', limit: '3' }),
        );

        expect(resultado.data.map((fila) => fila.proyecto.codigo)).toEqual([
          'P2',
        ]);
        expect(resultado.meta).toEqual({ total: 4, page: 2, limit: 3 });
        expect(resultado.margen_total_realizado).toBe(6000);
        // 1 (P1) + 0 (P2) + 3 (P3) + 3 (P4), aunque la página solo trae P2.
        expect(resultado.total_unidades_fuera_de_calculo).toBe(7);
      });

      it('a igual fecha, desempata por nombre', async () => {
        proyectosActivosSeed = proyectosActivosSeed.map((proyecto) => ({
          ...proyecto,
          fechaInicio: '2026-01-01T03:00:00Z',
        }));

        const resultado = await service.obtenerMargenProyecto(parsearMargen());

        expect(resultado.data.map((fila) => fila.proyecto.nombre)).toEqual([
          'Alfa',
          'Beta',
          'Gama',
          'Zeta',
        ]);
      });

      it('una página más allá del final vuelve vacía, con el total real', async () => {
        const resultado = await service.obtenerMargenProyecto(
          parsearMargen({ page: '3', limit: '5' }),
        );

        expect(resultado.data).toEqual([]);
        expect(resultado.meta).toEqual({ total: 4, page: 3, limit: 5 });
      });

      it('FK_proyecto limita las filas y sus unidades fuera del cálculo, no el margen total realizado', async () => {
        const resultado = await service.obtenerMargenProyecto(
          parsearMargen({ FK_proyecto: '3' }),
        );

        expect(resultado.data).toHaveLength(1);
        expect(resultado.data[0].proyecto.codigo).toBe('P3');
        expect(resultado.meta.total).toBe(1);
        expect(resultado.total_unidades_fuera_de_calculo).toBe(3);
        expect(resultado.margen_total_realizado).toBe(6000);
      });

      it('FK_proyecto de un proyecto que no está activo vuelve vacío, sin error', async () => {
        const resultado = await service.obtenerMargenProyecto(
          parsearMargen({ FK_proyecto: '99' }),
        );

        expect(resultado.data).toEqual([]);
        expect(resultado.meta.total).toBe(0);
        expect(resultado.total_unidades_fuera_de_calculo).toBe(0);
      });

      it('rechaza page y limit fuera de rango', () => {
        expect(() => parsearMargen({ page: '0' })).toThrow();
        expect(() => parsearMargen({ limit: '0' })).toThrow();
        expect(() => parsearMargen({ limit: '101' })).toThrow();
      });
    });
  });
});
