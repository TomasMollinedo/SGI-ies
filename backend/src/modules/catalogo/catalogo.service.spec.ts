import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CatalogoService } from './catalogo.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import {
  EstadoComercial,
  EstadoProyecto,
  ModalidadPago,
} from '../../../generated/prisma/enums';
import { calcularPlanPago } from '../comercializacion/plan-pago/motor-cuotas';

/** Primer argumento con el que se llamó a un mock de `findMany`, ya tipado. */
const primerArgumento = (
  mock: jest.Mock,
): Prisma.PUBLICACIONUNIDADFindManyArgs =>
  (mock.mock.calls as Prisma.PUBLICACIONUNIDADFindManyArgs[][])[0][0];

/**
 * El `select` anidado que arma Prisma es una unión de tipos (puede ser `true`,
 * o un objeto con `select`), así que para inspeccionarlo desde el test se lo
 * mira con la forma puntual que interesa.
 */
type SelectDelListado = {
  unidadFuncional: { select: { imagenes: unknown } };
};

describe('CatalogoService', () => {
  let service: CatalogoService;
  let prisma: {
    pUBLICACIONUNIDAD: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
    };
    uNIDADFUNCIONAL: { groupBy: jest.Mock };
    pROYECTO: { findMany: jest.Mock };
    pLAZOFINANCIACION: { findMany: jest.Mock; findFirst: jest.Mock };
  };

  /** Plazo activo "crudo" tal como lo devolvería Prisma. */
  const plazoDe = (id: number, cuotas: number, tna: string) => ({
    id_plazo_financiacion: id,
    cantidad_cuotas: cuotas,
    tasa_nominal_anual: new Prisma.Decimal(tna),
  });

  /** Publicación "cruda" tal como la devolvería Prisma para el listado/detalle. */
  const publicacionCatalogo = (extra: Record<string, unknown> = {}) => ({
    id_publicacion: 5,
    fecha_publicacion: new Date('2026-06-01'),
    precio_lista: new Prisma.Decimal('19000000') as Prisma.Decimal | null,
    unidadFuncional: {
      id_unidad_funcional: 2,
      identificador: '1-A',
      tipologia: 'UN_DORMITORIO',
      superficie_cubierta: new Prisma.Decimal('45'),
      superficie_descubierta: new Prisma.Decimal('6'),
      piso: '1',
      proyecto: {
        nombre: 'Torre Nogal',
        localidad: 'Resistencia, Chaco',
        estado_obra: EstadoProyecto.EN_EJECUCION,
        fecha_fin_estimada: new Date('2027-12-01'),
      },
      imagenes: [{ url: 'https://cdn.test/1-a.jpg' }],
    },
    ...extra,
  });

  beforeEach(async () => {
    prisma = {
      pUBLICACIONUNIDAD: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      uNIDADFUNCIONAL: { groupBy: jest.fn() },
      pROYECTO: { findMany: jest.fn() },
      pLAZOFINANCIACION: { findMany: jest.fn(), findFirst: jest.fn() },
    };
    prisma.pLAZOFINANCIACION.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CatalogoService);
  });

  describe('listarCatalogo', () => {
    it('filtra siempre por publicación vigente y estado comercial disponible', async () => {
      prisma.pUBLICACIONUNIDAD.findMany.mockResolvedValue([]);
      prisma.pUBLICACIONUNIDAD.count.mockResolvedValue(0);

      await service.listarCatalogo({ page: 1, limit: 12 });

      const argumento = primerArgumento(prisma.pUBLICACIONUNIDAD.findMany);
      expect(argumento.where?.vigente).toBe(true);
      expect(argumento.where?.estado_comercial).toBe(
        EstadoComercial.DISPONIBLE,
      );
    });

    it('arma el filtro de localidad y de condición de entrega contra el proyecto, no en memoria', async () => {
      prisma.pUBLICACIONUNIDAD.findMany.mockResolvedValue([]);
      prisma.pUBLICACIONUNIDAD.count.mockResolvedValue(0);

      await service.listarCatalogo({
        page: 1,
        limit: 12,
        localidad: 'Rosario',
        entregada: false,
      });

      const argumento = primerArgumento(prisma.pUBLICACIONUNIDAD.findMany);
      expect(
        (argumento.where as { unidadFuncional?: { proyecto?: unknown } })
          .unidadFuncional?.proyecto,
      ).toEqual({
        localidad: { contains: 'Rosario', mode: 'insensitive' },
        estado_obra: { not: EstadoProyecto.FINALIZADO },
      });
    });

    it('ordena por fecha de publicación descendente', async () => {
      prisma.pUBLICACIONUNIDAD.findMany.mockResolvedValue([]);
      prisma.pUBLICACIONUNIDAD.count.mockResolvedValue(0);

      await service.listarCatalogo({ page: 1, limit: 12 });

      const argumento = primerArgumento(prisma.pUBLICACIONUNIDAD.findMany);
      expect(argumento.orderBy).toEqual({ fecha_publicacion: 'desc' });
    });

    it('lee el precio de la publicación, no de sus planes', async () => {
      prisma.pUBLICACIONUNIDAD.findMany.mockResolvedValue([]);
      prisma.pUBLICACIONUNIDAD.count.mockResolvedValue(0);

      await service.listarCatalogo({ page: 1, limit: 12 });

      const select = primerArgumento(prisma.pUBLICACIONUNIDAD.findMany)
        .select as Record<string, unknown>;
      expect(select.precio_lista).toBe(true);
      expect(select).not.toHaveProperty('planesEjemplo');
    });

    it('una publicación Disponible sin precio de lista es un dato inconsistente: 500', async () => {
      prisma.pUBLICACIONUNIDAD.findMany.mockResolvedValue([
        publicacionCatalogo({ precio_lista: null }),
      ]);
      prisma.pUBLICACIONUNIDAD.count.mockResolvedValue(1);

      await expect(
        service.listarCatalogo({ page: 1, limit: 12 }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('mapea el precio de lista como precio desde y la condición de entrega, sin exponer costo ni margen', async () => {
      prisma.pUBLICACIONUNIDAD.findMany.mockResolvedValue([
        publicacionCatalogo(),
      ]);
      prisma.pUBLICACIONUNIDAD.count.mockResolvedValue(1);

      const res = await service.listarCatalogo({ page: 1, limit: 12 });

      expect(res.data).toEqual([
        {
          id_unidad_funcional: 2,
          identificador: '1-A',
          tipologia: 'UN_DORMITORIO',
          superficie_cubierta: 45,
          superficie_descubierta: 6,
          piso: '1',
          proyecto: { nombre: 'Torre Nogal', localidad: 'Resistencia, Chaco' },
          imagen_url: 'https://cdn.test/1-a.jpg',
          precio_desde: 19000000,
          condicion_entrega: {
            codigo: 'A_ENTREGAR_CON_FECHA',
            texto: 'A entregar, fecha estimada',
            fecha_referencia: new Date('2027-12-01').toISOString(),
          },
          fecha_publicacion: new Date('2026-06-01').toISOString(),
        },
      ]);
      expect(JSON.stringify(res)).not.toMatch(
        /costo|margen|porcentaje_ganancia/i,
      );
    });

    it('pide una sola imagen por unidad, la de menor orden', async () => {
      prisma.pUBLICACIONUNIDAD.findMany.mockResolvedValue([]);
      prisma.pUBLICACIONUNIDAD.count.mockResolvedValue(0);

      await service.listarCatalogo({ page: 1, limit: 12 });

      const argumento = primerArgumento(prisma.pUBLICACIONUNIDAD.findMany);
      const select = argumento.select as unknown as SelectDelListado;
      expect(select.unidadFuncional.select.imagenes).toEqual({
        select: { url: true },
        orderBy: { orden: 'asc' },
        take: 1,
      });
    });

    it('devuelve imagen_url en null si la unidad no tiene imágenes', async () => {
      const sinImagenes = publicacionCatalogo();
      sinImagenes.unidadFuncional.imagenes = [];
      prisma.pUBLICACIONUNIDAD.findMany.mockResolvedValue([sinImagenes]);
      prisma.pUBLICACIONUNIDAD.count.mockResolvedValue(1);

      const res = await service.listarCatalogo({ page: 1, limit: 12 });

      expect(res.data[0].imagen_url).toBeNull();
    });
  });

  describe('obtenerDetalle', () => {
    const detalleCrudo = (planesEjemplo: unknown[] = []) => ({
      ...publicacionCatalogo(),
      unidadFuncional: {
        ...publicacionCatalogo().unidadFuncional,
        comodidades: 'Balcón',
        observaciones: null,
        imagenes: [{ url: 'https://cdn.test/1-a.jpg', orden: 0 }],
      },
      planesEjemplo,
    });

    it('tira 404 si no hay una publicación vigente y disponible con ese id', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue(null);

      await expect(service.obtenerDetalle(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('solo pide los planes activos, con anticipo y con un plazo activo', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue(detalleCrudo());

      await service.obtenerDetalle(2);

      const select = primerArgumento(prisma.pUBLICACIONUNIDAD.findFirst)
        .select as unknown as {
        planesEjemplo: { where: unknown };
      };
      expect(select.planesEjemplo.where).toEqual({
        estado: true,
        anticipo_porcentaje: { not: null },
        plazoFinanciacion: { is: { estado: true } },
      });
    });

    it('calcula cada plan con el precio de lista y la TNA de su plazo, sin importes guardados', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue(
        detalleCrudo([
          {
            nombre: 'Anticipo 30% a 12 cuotas',
            anticipo_porcentaje: new Prisma.Decimal('30'),
            plazoFinanciacion: {
              cantidad_cuotas: 12,
              tasa_nominal_anual: new Prisma.Decimal('0'),
            },
          },
        ]),
      );

      const res = await service.obtenerDetalle(2);

      // 19.000.000 − 30 % = 13.300.000 a financiar, en 12 cuotas sin interés.
      expect(res.planes).toEqual([
        {
          nombre: 'Anticipo 30% a 12 cuotas',
          anticipo_porcentaje: 30,
          anticipo_monto: 5700000,
          saldo_financiado: 13300000,
          cantidad_cuotas: 12,
          tasa_nominal_anual: 0,
          valor_cuota: 1108333.33,
          total_intereses: 0,
          total_a_pagar: 19000000,
        },
      ]);
      expect(res.comodidades).toBe('Balcón');
    });

    it('con TNA mayor a 0 el valor de cuota, los intereses y el total salen del motor de cuotas', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue(
        detalleCrudo([
          {
            nombre: 'Anticipo 20% a 24 cuotas',
            anticipo_porcentaje: new Prisma.Decimal('20'),
            plazoFinanciacion: {
              cantidad_cuotas: 24,
              tasa_nominal_anual: new Prisma.Decimal('36'),
            },
          },
        ]),
      );

      const res = await service.obtenerDetalle(2);

      const esperado = calcularPlanPago({
        precio: new Prisma.Decimal('19000000'),
        tipo: ModalidadPago.FINANCIADO,
        anticipo_monto: new Prisma.Decimal('3800000'),
        cantidad_cuotas: 24,
        tasa_nominal_anual: new Prisma.Decimal('36'),
        fecha_venta: new Date(),
      });
      expect(res.planes[0].valor_cuota).toBe(esperado.valor_cuota?.toNumber());
      expect(res.planes[0].total_intereses).toBe(
        esperado.total_intereses.toNumber(),
      );
      expect(res.planes[0].total_a_pagar).toBe(
        esperado.total_a_pagar.toNumber(),
      );
      expect(res.planes[0].total_intereses).toBeGreaterThan(0);
    });

    it('un plan sin plazo (Sprint 3) no se devuelve: no hay tasa con la que calcularlo', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue(
        detalleCrudo([
          {
            nombre: 'Contado 1-A',
            anticipo_porcentaje: new Prisma.Decimal('100'),
            plazoFinanciacion: null,
          },
        ]),
      );

      const res = await service.obtenerDetalle(2);

      expect(res.planes).toEqual([]);
    });

    it('devuelve los plazos activos con su cantidad de cuotas y TNA como simulador', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue(detalleCrudo());
      prisma.pLAZOFINANCIACION.findMany.mockResolvedValue([
        plazoDe(1, 12, '24'),
        plazoDe(2, 24, '30.5'),
      ]);

      const res = await service.obtenerDetalle(2);

      expect(res.simulador).toEqual({
        plazos: [
          {
            id_plazo_financiacion: 1,
            cantidad_cuotas: 12,
            tasa_nominal_anual: 24,
          },
          {
            id_plazo_financiacion: 2,
            cantidad_cuotas: 24,
            tasa_nominal_anual: 30.5,
          },
        ],
      });
      expect(prisma.pLAZOFINANCIACION.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { estado: true } }),
      );
    });

    it('sin plazos activos no hay simulador y el precio de contado sigue informado', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue(detalleCrudo());
      prisma.pLAZOFINANCIACION.findMany.mockResolvedValue([]);

      const res = await service.obtenerDetalle(2);

      expect(res.simulador).toBeNull();
      expect(res.precio_desde).toBe(19000000);
    });

    it('no expone costo, presupuesto, margen ni porcentaje de ganancia', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue(detalleCrudo());
      prisma.pLAZOFINANCIACION.findMany.mockResolvedValue([
        plazoDe(1, 12, '24'),
      ]);

      const res = await service.obtenerDetalle(2);

      expect(JSON.stringify(res)).not.toMatch(
        /"costo"|presupuesto|margen|porcentaje_ganancia|cliente|dni_cuil/i,
      );
    });
  });

  describe('simularPlan', () => {
    const publicacionDisponible = {
      id_publicacion: 5,
      precio_lista: new Prisma.Decimal('19000000') as Prisma.Decimal | null,
    };

    beforeEach(() => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue(
        publicacionDisponible,
      );
      prisma.pLAZOFINANCIACION.findFirst.mockResolvedValue(
        plazoDe(1, 12, '24'),
      );
    });

    it('tira 404 si la unidad no está publicada y disponible', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue(null);

      await expect(
        service.simularPlan(999, {
          FK_plazo_financiacion: 1,
          anticipo_porcentaje: 30,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('tira 404 si el plazo no existe o está inactivo, y busca solo entre los activos', async () => {
      prisma.pLAZOFINANCIACION.findFirst.mockResolvedValue(null);

      await expect(
        service.simularPlan(2, {
          FK_plazo_financiacion: 99,
          anticipo_porcentaje: 30,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.pLAZOFINANCIACION.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_plazo_financiacion: 99, estado: true },
        }),
      );
    });

    it('con el anticipo en porcentaje devuelve el cronograma del motor de cuotas', async () => {
      const res = await service.simularPlan(2, {
        FK_plazo_financiacion: 1,
        anticipo_porcentaje: 30,
      });

      const esperado = calcularPlanPago({
        precio: new Prisma.Decimal('19000000'),
        tipo: ModalidadPago.FINANCIADO,
        anticipo_monto: new Prisma.Decimal('5700000'),
        cantidad_cuotas: 12,
        tasa_nominal_anual: new Prisma.Decimal('24'),
        fecha_venta: new Date(),
      });

      expect(res).toMatchObject({
        precio_lista: 19000000,
        anticipo_monto: 5700000,
        anticipo_porcentaje: 30,
        saldo_financiado: 13300000,
        plazo: {
          id_plazo_financiacion: 1,
          cantidad_cuotas: 12,
          tasa_nominal_anual: 24,
        },
        tasa_mensual: 2,
        valor_cuota: esperado.valor_cuota?.toNumber(),
        total_intereses: esperado.total_intereses.toNumber(),
        total_a_pagar: esperado.total_a_pagar.toNumber(),
      });
      // Cuota 0 (el anticipo) + 12 cuotas.
      expect(res.cronograma).toHaveLength(13);
      expect(res.cronograma[0]).toEqual({
        numero: 0,
        importe_capital: 5700000,
        importe_interes: 0,
        importe: 5700000,
      });
      // Primera cuota: 13.300.000 × 2 % de interés mensual.
      expect(res.cronograma[1].importe_interes).toBe(266000);
      expect(
        res.cronograma.reduce((suma, cuota) => suma + cuota.importe_capital, 0),
      ).toBeCloseTo(19000000, 2);
    });

    it('con el anticipo en monto deriva el porcentaje', async () => {
      const res = await service.simularPlan(2, {
        FK_plazo_financiacion: 1,
        anticipo_monto: 4750000,
      });

      expect(res.anticipo_monto).toBe(4750000);
      expect(res.anticipo_porcentaje).toBe(25);
    });

    it.each([0, 19000000, 25000000])(
      'rechaza con 400 un anticipo en monto de %s (debe ser mayor a 0 y menor al precio)',
      async (monto) => {
        await expect(
          service.simularPlan(2, {
            FK_plazo_financiacion: 1,
            anticipo_monto: monto,
          }),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('rechaza con 400 un porcentaje tan chico que el monto redondea a cero', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue({
        ...publicacionDisponible,
        precio_lista: new Prisma.Decimal('10'),
      });

      await expect(
        service.simularPlan(2, {
          FK_plazo_financiacion: 1,
          anticipo_porcentaje: 0.01,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('es de solo lectura: el service nunca toca un método de escritura', async () => {
      await service.simularPlan(2, {
        FK_plazo_financiacion: 1,
        anticipo_porcentaje: 30,
      });

      // El mock de Prisma no define create/update/delete: si el service los
      // llamara, el test fallaría con un TypeError.
      expect(prisma.pUBLICACIONUNIDAD).not.toHaveProperty('create');
      expect(prisma.pUBLICACIONUNIDAD).not.toHaveProperty('update');
      expect(prisma.pLAZOFINANCIACION).not.toHaveProperty('create');
    });
  });

  describe('obtenerDestacados', () => {
    const publicacionDeProyecto = (idProyecto: number, precio: string) => ({
      id_publicacion: idProyecto * 100,
      precio_lista: new Prisma.Decimal(precio),
      unidadFuncional: { FK_proyecto: idProyecto },
    });
    const proyecto = (id: number, nombre: string) => ({
      id_proyecto: id,
      nombre,
      localidad: 'Resistencia, Chaco',
      imagen_portada_url: null,
    });

    it('devuelve lista vacía sin más consultas si no hay ninguna unidad disponible', async () => {
      prisma.uNIDADFUNCIONAL.groupBy.mockResolvedValue([]);

      const res = await service.obtenerDestacados();

      expect(res).toEqual({ data: [] });
      expect(prisma.pROYECTO.findMany).not.toHaveBeenCalled();
      expect(prisma.pUBLICACIONUNIDAD.findMany).not.toHaveBeenCalled();
    });

    it('calcula el menor precio de lista del proyecto entre todas sus unidades disponibles', async () => {
      prisma.uNIDADFUNCIONAL.groupBy.mockResolvedValue([
        { FK_proyecto: 1, _count: 2 },
      ]);
      prisma.pROYECTO.findMany.mockResolvedValue([proyecto(1, 'Torre Nogal')]);
      prisma.pUBLICACIONUNIDAD.findMany.mockResolvedValue([
        publicacionDeProyecto(1, '19000000'),
        publicacionDeProyecto(1, '15000000'),
      ]);

      const res = await service.obtenerDestacados();

      expect(res.data).toEqual([
        {
          id_proyecto: 1,
          nombre: 'Torre Nogal',
          localidad: 'Resistencia, Chaco',
          imagen_portada_url: null,
          cantidad_disponibles: 2,
          precio_desde: 15000000,
        },
      ]);
    });

    it('ordena por cantidad de unidades disponibles y desempata por nombre', async () => {
      prisma.uNIDADFUNCIONAL.groupBy.mockResolvedValue([
        { FK_proyecto: 1, _count: 3 },
        { FK_proyecto: 2, _count: 5 },
        { FK_proyecto: 3, _count: 3 },
      ]);
      prisma.pROYECTO.findMany.mockResolvedValue([
        proyecto(1, 'Torre Zafiro'),
        proyecto(2, 'Edificio Roble'),
        proyecto(3, 'Barrio Alamo'),
      ]);
      prisma.pUBLICACIONUNIDAD.findMany.mockResolvedValue([
        publicacionDeProyecto(1, '10'),
        publicacionDeProyecto(2, '10'),
        publicacionDeProyecto(3, '10'),
      ]);

      const res = await service.obtenerDestacados();

      expect(res.data.map((p) => p.nombre)).toEqual([
        'Edificio Roble',
        'Barrio Alamo',
        'Torre Zafiro',
      ]);
    });

    it('con más de 4 proyectos, el empate en el último lugar lo gana el nombre', async () => {
      prisma.uNIDADFUNCIONAL.groupBy.mockResolvedValue([
        { FK_proyecto: 1, _count: 9 },
        { FK_proyecto: 2, _count: 8 },
        { FK_proyecto: 3, _count: 7 },
        { FK_proyecto: 4, _count: 2 },
        { FK_proyecto: 5, _count: 2 },
      ]);
      prisma.pROYECTO.findMany.mockResolvedValue([
        proyecto(1, 'A'),
        proyecto(2, 'B'),
        proyecto(3, 'C'),
        proyecto(4, 'Zeta'),
        proyecto(5, 'Alfa'),
      ]);
      prisma.pUBLICACIONUNIDAD.findMany.mockResolvedValue([
        publicacionDeProyecto(1, '10'),
        publicacionDeProyecto(2, '10'),
        publicacionDeProyecto(3, '10'),
        publicacionDeProyecto(5, '10'),
      ]);

      const res = await service.obtenerDestacados();

      expect(res.data.map((p) => p.nombre)).toEqual(['A', 'B', 'C', 'Alfa']);
      // El precio solo se busca para los 4 elegidos.
      const donde = primerArgumento(prisma.pUBLICACIONUNIDAD.findMany)
        .where as {
        unidadFuncional: { FK_proyecto: { in: number[] } };
      };
      expect(donde.unidadFuncional.FK_proyecto.in).toEqual([1, 2, 3, 5]);
    });
  });
});
