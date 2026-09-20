import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CatalogoService } from './catalogo.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import {
  EstadoComercial,
  EstadoProyecto,
} from '../../../generated/prisma/enums';

/** Primer argumento con el que se llamó a un mock de `findMany`, ya tipado. */
const primerArgumento = (
  mock: jest.Mock,
): Prisma.PUBLICACIONUNIDADFindManyArgs =>
  (mock.mock.calls as Prisma.PUBLICACIONUNIDADFindManyArgs[][])[0][0];

describe('CatalogoService', () => {
  let service: CatalogoService;
  let prisma: {
    pUBLICACIONUNIDAD: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
    };
    uNIDADFUNCIONAL: { groupBy: jest.Mock };
  };

  /** Publicación "cruda" tal como la devolvería Prisma para el listado/detalle. */
  const publicacionCatalogo = (extra: Record<string, unknown> = {}) => ({
    fecha_publicacion: new Date('2026-06-01'),
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
        estado: EstadoProyecto.EN_EJECUCION,
        fecha_fin_estimada: new Date('2027-12-01'),
      },
    },
    planes: [{ precio: new Prisma.Decimal('19000000') }],
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
    };

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
        estado: { not: EstadoProyecto.FINALIZADO },
      });
    });

    it('ordena por fecha de publicación descendente', async () => {
      prisma.pUBLICACIONUNIDAD.findMany.mockResolvedValue([]);
      prisma.pUBLICACIONUNIDAD.count.mockResolvedValue(0);

      await service.listarCatalogo({ page: 1, limit: 12 });

      const argumento = primerArgumento(prisma.pUBLICACIONUNIDAD.findMany);
      expect(argumento.orderBy).toEqual({ fecha_publicacion: 'desc' });
    });

    it('mapea el precio desde y la condición de entrega, sin exponer costo ni margen', async () => {
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
          precio_desde: 19000000,
          condicion_entrega: 'A entregar — 2027-12-01',
          fecha_publicacion: new Date('2026-06-01').toISOString(),
        },
      ]);
      expect(JSON.stringify(res)).not.toMatch(
        /costo|margen|porcentaje_ganancia/i,
      );
    });
  });

  describe('obtenerDetalle', () => {
    it('tira 404 si no hay una publicación vigente y disponible con ese id', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue(null);

      await expect(service.obtenerDetalle(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve solo los planes activos, con su precio', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue({
        ...publicacionCatalogo(),
        unidadFuncional: {
          ...publicacionCatalogo().unidadFuncional,
          comodidades: 'Balcón',
          observaciones: null,
          imagenes: [{ url: 'https://cdn.test/1-a.jpg', orden: 0 }],
        },
        planes: [
          {
            nombre: 'Contado 1-A',
            tipo: 'CONTADO',
            precio: new Prisma.Decimal('19000000'),
            anticipo_porcentaje: new Prisma.Decimal('100'),
            anticipo_monto: null,
            cantidad_cuotas: null,
            periodicidad: null,
          },
        ],
      });

      const res = await service.obtenerDetalle(2);

      expect(res.planes).toEqual([
        {
          nombre: 'Contado 1-A',
          tipo: 'CONTADO',
          precio: 19000000,
          anticipo_porcentaje: 100,
          anticipo_monto: null,
          cantidad_cuotas: null,
          periodicidad: null,
        },
      ]);
      expect(res.comodidades).toBe('Balcón');
    });
  });

  describe('obtenerDestacados', () => {
    it('devuelve lista vacía sin una segunda consulta si no hay ninguna unidad disponible', async () => {
      prisma.uNIDADFUNCIONAL.groupBy.mockResolvedValue([]);

      const res = await service.obtenerDestacados();

      expect(res).toEqual({ data: [] });
      expect(prisma.pUBLICACIONUNIDAD.findMany).not.toHaveBeenCalled();
    });

    it('calcula el precio más barato del proyecto entre todas sus unidades disponibles', async () => {
      prisma.uNIDADFUNCIONAL.groupBy.mockResolvedValue([
        { FK_proyecto: 1, _count: 2 },
      ]);
      prisma.pUBLICACIONUNIDAD.findMany.mockResolvedValue([
        {
          unidadFuncional: {
            FK_proyecto: 1,
            proyecto: {
              nombre: 'Torre Nogal',
              localidad: 'Resistencia, Chaco',
              imagen_portada_url: null,
            },
          },
          planes: [{ precio: new Prisma.Decimal('19000000') }],
        },
        {
          unidadFuncional: {
            FK_proyecto: 1,
            proyecto: {
              nombre: 'Torre Nogal',
              localidad: 'Resistencia, Chaco',
              imagen_portada_url: null,
            },
          },
          planes: [{ precio: new Prisma.Decimal('15000000') }],
        },
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
  });
});
