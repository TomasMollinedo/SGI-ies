import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { EstadoProyecto } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ProyectoService } from './proyecto.service';
import { proyectoResponseSchema } from './dto/proyecto-response.dto';

type Args = Record<string, unknown>;

/** Primer argumento con el que se llamó a un mock, ya tipado. */
const primerArgumento = (mock: jest.Mock): Args =>
  (mock.mock.calls as Args[][])[0][0];

describe('ProyectoService', () => {
  let service: ProyectoService;
  let prisma: {
    pROYECTO: { findMany: jest.Mock; findUnique: jest.Mock; count: jest.Mock };
    uNIDADFUNCIONAL: { groupBy: jest.Mock };
  };

  const proyecto = (id: number, sobrescribe: Args = {}) => ({
    id_proyecto: id,
    codigo: `PROY-00${id}`,
    nombre: `Proyecto ${id}`,
    localidad: 'Resistencia, Chaco',
    direccion: null,
    estado: EstadoProyecto.EN_PLANIFICACION,
    fecha_fin_estimada: null,
    cantidad_unidades_planificadas: 10,
    ...sobrescribe,
  });

  const queryBase = { page: 1, limit: 10 };

  beforeEach(async () => {
    prisma = {
      pROYECTO: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      uNIDADFUNCIONAL: { groupBy: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProyectoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ProyectoService);
  });

  describe('presupuesto derivado', () => {
    it('es la suma del costo de las unidades activas, junto con cuántas hay cargadas contra las planificadas', async () => {
      prisma.pROYECTO.findMany.mockResolvedValue([proyecto(1), proyecto(2)]);
      prisma.pROYECTO.count.mockResolvedValue(2);
      prisma.uNIDADFUNCIONAL.groupBy.mockResolvedValue([
        {
          FK_proyecto: 1,
          _count: { _all: 3 },
          _sum: { costo: new Prisma.Decimal('30000000.50') },
        },
      ]);

      const { data } = await service.findAll(queryBase);

      expect(data[0]).toMatchObject({
        id_proyecto: 1,
        unidades_cargadas: 3,
        cantidad_unidades_planificadas: 10,
        presupuesto: 30000000.5,
      });
      // Sin unidades activas: presupuesto 0 y ninguna cargada.
      expect(data[1]).toMatchObject({ unidades_cargadas: 0, presupuesto: 0 });
    });

    // Es lo que hace que el presupuesto BAJE al dar de baja una unidad (y
    // vuelva a subir al reactivarla): las dadas de baja no entran en la suma.
    it('solo suma las unidades activas, y de los proyectos de la página', async () => {
      prisma.pROYECTO.findMany.mockResolvedValue([proyecto(4), proyecto(9)]);

      await service.findAll(queryBase);

      expect(primerArgumento(prisma.uNIDADFUNCIONAL.groupBy).where).toEqual({
        estado: true,
        FK_proyecto: { in: [4, 9] },
      });
    });

    it('un proyecto sin cantidad planificada la devuelve en null', async () => {
      prisma.pROYECTO.findMany.mockResolvedValue([
        proyecto(1, { cantidad_unidades_planificadas: null }),
      ]);

      const { data } = await service.findAll(queryBase);

      expect(data[0].cantidad_unidades_planificadas).toBeNull();
    });

    it('el detalle de un proyecto trae también su presupuesto', async () => {
      prisma.pROYECTO.findUnique.mockResolvedValue(proyecto(1));
      prisma.uNIDADFUNCIONAL.groupBy.mockResolvedValue([
        {
          FK_proyecto: 1,
          _count: { _all: 2 },
          _sum: { costo: new Prisma.Decimal('500') },
        },
      ]);

      const resultado = await service.findOne(1);

      expect(resultado).toMatchObject({
        unidades_cargadas: 2,
        presupuesto: 500,
      });
    });
  });

  describe('listado', () => {
    it('pagina, y ordena por nombre', async () => {
      prisma.pROYECTO.count.mockResolvedValue(25);

      const { meta } = await service.findAll({ page: 3, limit: 5 });

      const args = primerArgumento(prisma.pROYECTO.findMany);
      expect(args.skip).toBe(10);
      expect(args.take).toBe(5);
      expect(args.orderBy).toEqual({ nombre: 'asc' });
      expect(meta).toEqual({ total: 25, page: 3, limit: 5 });
    });

    it('filtra por estado', async () => {
      await service.findAll({
        ...queryBase,
        estado: EstadoProyecto.EN_EJECUCION,
      });

      expect(primerArgumento(prisma.pROYECTO.findMany).where).toEqual({
        estado: EstadoProyecto.EN_EJECUCION,
      });
    });

    it('busca por las palabras del nombre, sin importar el orden, o por código', async () => {
      await service.findAll({ ...queryBase, busqueda: 'nogal torre' });

      expect(primerArgumento(prisma.pROYECTO.findMany).where).toEqual({
        OR: [
          {
            AND: [
              { nombre: { contains: 'nogal', mode: 'insensitive' } },
              { nombre: { contains: 'torre', mode: 'insensitive' } },
            ],
          },
          { codigo: { contains: 'nogal torre', mode: 'insensitive' } },
        ],
      });
    });

    it('sin filtros, no restringe nada', async () => {
      await service.findAll(queryBase);

      expect(primerArgumento(prisma.pROYECTO.findMany).where).toEqual({});
    });
  });

  describe('detalle', () => {
    it('rechaza un proyecto que no existe', async () => {
      prisma.pROYECTO.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('catálogo de estados', () => {
    it('trae los cuatro estados del proyecto, con su etiqueta legible', () => {
      const catalogo = service.findEstados();

      expect(catalogo).toEqual([
        { id: 'EN_PLANIFICACION', code: 'En planificación', metadata: {} },
        { id: 'EN_EJECUCION', code: 'En ejecución', metadata: {} },
        { id: 'FINALIZADO', code: 'Finalizado', metadata: {} },
        { id: 'CANCELADO', code: 'Cancelado', metadata: {} },
      ]);
    });
  });

  describe('contrato de respuesta', () => {
    // Sobre HTTP las fechas viajan como string ISO. `.strict()` hace fallar
    // también si el service devuelve una clave que el DTO no documenta.
    it('cada proyecto devuelto cumple el contrato del DTO', async () => {
      prisma.pROYECTO.findMany.mockResolvedValue([
        proyecto(1, { fecha_fin_estimada: new Date('2027-12-01') }),
      ]);
      prisma.pROYECTO.count.mockResolvedValue(1);
      prisma.uNIDADFUNCIONAL.groupBy.mockResolvedValue([
        {
          FK_proyecto: 1,
          _count: { _all: 3 },
          _sum: { costo: new Prisma.Decimal('300') },
        },
      ]);

      const { data } = await service.findAll(queryBase);

      expect(() =>
        proyectoResponseSchema
          .strict()
          .parse(JSON.parse(JSON.stringify(data[0]))),
      ).not.toThrow();
    });
  });
});
