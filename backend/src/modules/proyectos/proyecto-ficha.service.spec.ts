import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  EstadoComercial,
  TipologiaUnidad,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ProyectoFichaService } from './proyecto-ficha.service';
import { proyectoFichaResponseSchema } from './dto/proyecto-ficha-response.dto';

type Args = Record<string, unknown>;

/** Primer argumento con el que se llamó a un mock, ya tipado. */
const primerArgumento = (mock: jest.Mock): Args =>
  (mock.mock.calls as Args[][])[0][0];

describe('ProyectoFichaService', () => {
  let service: ProyectoFichaService;
  let prisma: {
    pROYECTO: { findUnique: jest.Mock };
    uNIDADFUNCIONAL: { findMany: jest.Mock };
  };

  const ID_PROYECTO = 12;

  const publicacion = (estado_comercial: EstadoComercial, precio?: string) => ({
    estado_comercial,
    precio_lista: precio === undefined ? null : new Prisma.Decimal(precio),
  });

  /** Una unidad activa tal como la devuelve la consulta de la ficha. */
  const unidad = (
    id: number,
    identificador: string,
    publicaciones: ReturnType<typeof publicacion>[] = [],
  ) => ({
    id_unidad_funcional: id,
    identificador,
    tipologia: TipologiaUnidad.UN_DORMITORIO,
    superficie_cubierta: new Prisma.Decimal('45.50'),
    costo: new Prisma.Decimal('15000000'),
    publicaciones,
  });

  beforeEach(async () => {
    prisma = {
      pROYECTO: {
        findUnique: jest.fn().mockResolvedValue({ id_proyecto: ID_PROYECTO }),
      },
      uNIDADFUNCIONAL: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProyectoFichaService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ProyectoFichaService);
  });

  describe('ficha', () => {
    it('rechaza un proyecto que no existe, sin consultar unidades', async () => {
      prisma.pROYECTO.findUnique.mockResolvedValue(null);

      await expect(service.obtenerFicha(99)).rejects.toThrow(NotFoundException);
      expect(prisma.uNIDADFUNCIONAL.findMany).not.toHaveBeenCalled();
    });

    // No filtra por baja lógica ni por estado de obra: igual que el detalle.
    it('busca el proyecto solo por id, esté activo, dado de baja o Cancelado', async () => {
      await service.obtenerFicha(ID_PROYECTO);

      expect(primerArgumento(prisma.pROYECTO.findUnique).where).toEqual({
        id_proyecto: ID_PROYECTO,
      });
    });

    it('hace una sola consulta: las unidades activas del proyecto, cada una con su publicación vigente', async () => {
      await service.obtenerFicha(ID_PROYECTO);

      expect(prisma.uNIDADFUNCIONAL.findMany).toHaveBeenCalledTimes(1);
      const { where, select } = primerArgumento(
        prisma.uNIDADFUNCIONAL.findMany,
      ) as { where: Args; select: { publicaciones: Args } };
      expect(where).toEqual({ FK_proyecto: ID_PROYECTO, estado: true });
      expect(select.publicaciones).toEqual({
        where: { vigente: true },
        select: { estado_comercial: true, precio_lista: true },
        take: 1,
      });
    });

    it('ordena las unidades por identificador con orden natural', async () => {
      prisma.uNIDADFUNCIONAL.findMany.mockResolvedValue([
        unidad(1, 'U10'),
        unidad(2, 'U2'),
        unidad(3, 'PB-A'),
        unidad(4, 'U1'),
      ]);

      const { unidades } = await service.obtenerFicha(ID_PROYECTO);

      expect(unidades.map((u) => u.identificador)).toEqual([
        'PB-A',
        'U1',
        'U2',
        'U10',
      ]);
    });

    it('deriva el estado comercial y el precio de la publicación vigente, con importes y superficie como número', async () => {
      prisma.uNIDADFUNCIONAL.findMany.mockResolvedValue([
        unidad(1, 'U1', [publicacion(EstadoComercial.DISPONIBLE, '19000000')]),
        unidad(2, 'U2', [publicacion(EstadoComercial.EN_PREPARACION)]),
        unidad(3, 'U3'),
      ]);

      const { unidades } = await service.obtenerFicha(ID_PROYECTO);

      expect(unidades).toEqual([
        {
          id_unidad_funcional: 1,
          identificador: 'U1',
          tipologia: TipologiaUnidad.UN_DORMITORIO,
          superficie_cubierta: 45.5,
          costo: 15000000,
          precio_lista: 19000000,
          estado_comercial: 'DISPONIBLE',
        },
        // En preparación: tiene publicación vigente pero todavía sin precio.
        expect.objectContaining({
          id_unidad_funcional: 2,
          precio_lista: null,
          estado_comercial: 'EN_PREPARACION',
        }),
        // Sin publicación vigente (nunca publicada o despublicada).
        expect.objectContaining({
          id_unidad_funcional: 3,
          precio_lista: null,
          estado_comercial: 'SIN_PUBLICAR',
        }),
      ]);
    });

    it('arma el precio estimado y la situación comercial sobre esas unidades', async () => {
      prisma.uNIDADFUNCIONAL.findMany.mockResolvedValue([
        unidad(1, 'PB-A', [publicacion(EstadoComercial.EN_PREPARACION)]),
        unidad(2, '1-A', [publicacion(EstadoComercial.DISPONIBLE, '19000000')]),
        unidad(3, '2-B', [
          publicacion(EstadoComercial.EN_PLAN_DE_PAGO, '27000000'),
        ]),
      ]);

      const ficha = await service.obtenerFicha(ID_PROYECTO);

      expect(ficha.id_proyecto).toBe(ID_PROYECTO);
      expect(ficha.precio_estimado).toEqual({
        total: 46000000,
        unidades_calculadas: 2,
      });
      expect(ficha.situacion_comercial).toEqual({
        por_estado: {
          SIN_PUBLICAR: 0,
          EN_PREPARACION: 1,
          DISPONIBLE: 1,
          EN_PLAN_DE_PAGO: 1,
          VENDIDA: 0,
        },
        porcentaje_vendido: 33.33,
        todas_vendidas: false,
      });
    });

    // `.strict()` hace fallar también si el service devuelve una clave que el
    // DTO no documenta (por ejemplo `unidades_activas`, que no se expone).
    it.each([
      ['con unidades', true],
      ['sin unidades', false],
    ])('cumple el contrato del DTO %s', async (_caso, conUnidades) => {
      if (conUnidades) {
        prisma.uNIDADFUNCIONAL.findMany.mockResolvedValue([
          unidad(1, 'U1', [publicacion(EstadoComercial.VENDIDA, '100.50')]),
          unidad(2, 'U2'),
        ]);
      }

      const ficha = await service.obtenerFicha(ID_PROYECTO);

      const contrato = proyectoFichaResponseSchema.extend({
        precio_estimado:
          proyectoFichaResponseSchema.shape.precio_estimado.strict(),
        situacion_comercial:
          proyectoFichaResponseSchema.shape.situacion_comercial.strict(),
      });
      expect(() =>
        contrato.strict().parse(JSON.parse(JSON.stringify(ficha))),
      ).not.toThrow();
    });
  });

  describe('porcentaje vendido del listado', () => {
    const fila = (FK_proyecto: number, estado?: EstadoComercial) => ({
      FK_proyecto,
      publicaciones: estado ? [publicacion(estado, '100')] : [],
    });

    it('trae en una sola consulta las unidades activas de todos los proyectos pedidos', async () => {
      await service.calcularPorcentajesVendidos([4, 9]);

      expect(prisma.uNIDADFUNCIONAL.findMany).toHaveBeenCalledTimes(1);
      const { where, select } = primerArgumento(
        prisma.uNIDADFUNCIONAL.findMany,
      ) as { where: Args; select: { publicaciones: Args } };
      expect(where).toEqual({ estado: true, FK_proyecto: { in: [4, 9] } });
      expect(select.publicaciones).toMatchObject({
        where: { vigente: true },
        take: 1,
      });
    });

    it('calcula el porcentaje de cada proyecto por separado; uno sin unidades activas no aparece', async () => {
      prisma.uNIDADFUNCIONAL.findMany.mockResolvedValue([
        fila(4, EstadoComercial.VENDIDA),
        fila(9, EstadoComercial.EN_PLAN_DE_PAGO),
        fila(4, EstadoComercial.DISPONIBLE),
        fila(4),
        fila(9, EstadoComercial.VENDIDA),
      ]);

      const porcentajes = await service.calcularPorcentajesVendidos([4, 9, 20]);

      expect([...porcentajes]).toEqual([
        [4, 33.33],
        [9, 100],
      ]);
    });
  });
});
