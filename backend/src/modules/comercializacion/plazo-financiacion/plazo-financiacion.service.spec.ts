import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  calcularTasaMensual,
  PlazoFinanciacionService,
} from './plazo-financiacion.service';
import {
  createPlazoFinanciacionSchema,
  MAX_CANTIDAD_CUOTAS,
} from './dto/create-plazo-financiacion.dto';
import { updatePlazoFinanciacionSchema } from './dto/update-plazo-financiacion.dto';
import { queryPlazoFinanciacionSchema } from './dto/query-plazo-financiacion.dto';

/** Primer argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = {
  data?: Record<string, unknown>;
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
};

const argumentoDeLlamada = (mock: jest.Mock, llamada = 0): ArgumentoPrisma =>
  (mock.mock.calls as ArgumentoPrisma[][])[llamada][0];

describe('PlazoFinanciacionService', () => {
  let service: PlazoFinanciacionService;
  let prisma: {
    pLAZOFINANCIACION: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const USUARIO_ID = 7;

  const plazoMock = {
    id_plazo_financiacion: 1,
    codigo: 'PLZ-001',
    cantidad_cuotas: 12,
    tasa_nominal_anual: new Prisma.Decimal('24.00'),
    descripcion: null,
    estado: true,
  };

  beforeEach(async () => {
    prisma = {
      pLAZOFINANCIACION: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    // El cliente transaccional expone los mismos delegates que Prisma.
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlazoFinanciacionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PlazoFinanciacionService);
  });

  describe('create', () => {
    it('rechaza un segundo plazo activo con la misma cantidad de cuotas', async () => {
      prisma.pLAZOFINANCIACION.findFirst.mockResolvedValue(plazoMock);

      await expect(
        service.create(
          { cantidad_cuotas: 12, tasa_nominal_anual: 30 },
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      // La unicidad se mira solo entre activos: uno dado de baja no cuenta.
      expect(
        argumentoDeLlamada(prisma.pLAZOFINANCIACION.findFirst).where,
      ).toEqual({ cantidad_cuotas: 12, estado: true });
      expect(prisma.pLAZOFINANCIACION.create).not.toHaveBeenCalled();
    });

    it('registra el usuario que lo crea y reemplaza el código provisorio por el generado a partir del id', async () => {
      prisma.pLAZOFINANCIACION.create.mockResolvedValue({
        ...plazoMock,
        id_plazo_financiacion: 7,
      });
      prisma.pLAZOFINANCIACION.update.mockResolvedValue(plazoMock);

      await service.create(
        { cantidad_cuotas: 12, tasa_nominal_anual: 24 },
        USUARIO_ID,
      );

      const alta = argumentoDeLlamada(prisma.pLAZOFINANCIACION.create).data;
      expect(alta).toMatchObject({
        cantidad_cuotas: 12,
        FK_usuario_creador: USUARIO_ID,
        FK_usuario_actualizador: USUARIO_ID,
      });
      expect(alta?.codigo).toEqual(expect.any(String));
      expect(String(alta?.tasa_nominal_anual)).toBe('24');

      const ajusteDeCodigo = argumentoDeLlamada(
        prisma.pLAZOFINANCIACION.update,
      );
      expect(ajusteDeCodigo.where).toEqual({ id_plazo_financiacion: 7 });
      expect(ajusteDeCodigo.data).toEqual({ codigo: 'PLZ-007' });
    });

    it('acepta una TNA de cero, sin interés', async () => {
      prisma.pLAZOFINANCIACION.create.mockResolvedValue(plazoMock);
      prisma.pLAZOFINANCIACION.update.mockResolvedValue(plazoMock);

      await service.create(
        { cantidad_cuotas: 6, tasa_nominal_anual: 0 },
        USUARIO_ID,
      );

      const alta = argumentoDeLlamada(prisma.pLAZOFINANCIACION.create).data;
      expect(String(alta?.tasa_nominal_anual)).toBe('0');
    });
  });

  describe('createPlazoFinanciacionSchema', () => {
    const valido = { cantidad_cuotas: 12, tasa_nominal_anual: 24 };

    it('acepta cantidad de cuotas entera entre 1 y el máximo, y TNA >= 0', () => {
      expect(createPlazoFinanciacionSchema.safeParse(valido).success).toBe(
        true,
      );
      expect(
        createPlazoFinanciacionSchema.safeParse({
          cantidad_cuotas: 1,
          tasa_nominal_anual: 0,
        }).success,
      ).toBe(true);
      expect(
        createPlazoFinanciacionSchema.safeParse({
          cantidad_cuotas: MAX_CANTIDAD_CUOTAS,
          tasa_nominal_anual: 999.99,
        }).success,
      ).toBe(true);
    });

    it.each([0, -3, 1.5, MAX_CANTIDAD_CUOTAS + 1])(
      'rechaza %s como cantidad de cuotas',
      (cantidad_cuotas) => {
        expect(
          createPlazoFinanciacionSchema.safeParse({
            ...valido,
            cantidad_cuotas,
          }).success,
        ).toBe(false);
      },
    );

    it.each([-0.01, 1000, 12.345])('rechaza %s como TNA', (tasa) => {
      expect(
        createPlazoFinanciacionSchema.safeParse({
          ...valido,
          tasa_nominal_anual: tasa,
        }).success,
      ).toBe(false);
    });
  });

  describe('update', () => {
    it('cambia la TNA y registra quién y cuándo', async () => {
      prisma.pLAZOFINANCIACION.findUnique.mockResolvedValue(plazoMock);
      prisma.pLAZOFINANCIACION.update.mockResolvedValue(plazoMock);

      await service.update(1, { tasa_nominal_anual: 30.5 }, USUARIO_ID);

      const { data } = argumentoDeLlamada(prisma.pLAZOFINANCIACION.update);
      expect(String(data?.tasa_nominal_anual)).toBe('30.5');
      expect(data?.FK_usuario_actualizador).toBe(USUARIO_ID);
      expect(data?.hora_actualizacion).toBeInstanceOf(Date);
    });

    it('no toca los campos que no vinieron en el body', async () => {
      prisma.pLAZOFINANCIACION.findUnique.mockResolvedValue(plazoMock);
      prisma.pLAZOFINANCIACION.update.mockResolvedValue(plazoMock);

      await service.update(1, { descripcion: 'Promo' }, USUARIO_ID);

      const { data } = argumentoDeLlamada(prisma.pLAZOFINANCIACION.update);
      expect(data).not.toHaveProperty('tasa_nominal_anual');
      expect(data?.descripcion).toBe('Promo');
    });

    it('lanza NotFoundException si el plazo no existe', async () => {
      prisma.pLAZOFINANCIACION.findUnique.mockResolvedValue(null);

      await expect(
        service.update(99, { tasa_nominal_anual: 10 }, USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    // La cantidad de cuotas queda bloqueada desde el alta: el schema de
    // update ni la representa, así que aunque el cliente la mande en el body
    // nunca llega al service.
    it('la cantidad de cuotas no se puede modificar: el schema la descarta aunque venga en el body', () => {
      const resultado = updatePlazoFinanciacionSchema.parse({
        cantidad_cuotas: 24,
        tasa_nominal_anual: 30,
      });

      expect(resultado).toEqual({ tasa_nominal_anual: 30 });
      expect(resultado).not.toHaveProperty('cantidad_cuotas');
    });
  });

  describe('findAll', () => {
    it('ordena por cantidad de cuotas ascendente y agrega la tasa mensual (TNA ÷ 12)', async () => {
      prisma.pLAZOFINANCIACION.findMany.mockResolvedValue([
        plazoMock,
        {
          ...plazoMock,
          id_plazo_financiacion: 2,
          cantidad_cuotas: 24,
          tasa_nominal_anual: new Prisma.Decimal('10.00'),
        },
      ]);
      prisma.pLAZOFINANCIACION.count.mockResolvedValue(2);

      const resultado = await service.findAll(
        queryPlazoFinanciacionSchema.parse({}),
      );

      expect(
        argumentoDeLlamada(prisma.pLAZOFINANCIACION.findMany).orderBy,
      ).toEqual({ cantidad_cuotas: 'asc' });
      expect(resultado.data.map((p) => p.tasa_mensual)).toEqual([
        '2.0000',
        '0.8333',
      ]);
      expect(resultado.meta).toEqual({ total: 2, page: 1, limit: 10 });
    });

    it('sin filtro trae solo los activos', async () => {
      await service.findAll(queryPlazoFinanciacionSchema.parse({}));

      expect(
        argumentoDeLlamada(prisma.pLAZOFINANCIACION.findMany).where,
      ).toEqual({ estado: true });
    });

    it('filtra por inactivos con estado=false', async () => {
      await service.findAll(
        queryPlazoFinanciacionSchema.parse({ estado: 'false' }),
      );

      expect(
        argumentoDeLlamada(prisma.pLAZOFINANCIACION.findMany).where,
      ).toEqual({ estado: false });
    });

    it('estado=todos trae activos e inactivos', async () => {
      await service.findAll(
        queryPlazoFinanciacionSchema.parse({ estado: 'todos' }),
      );

      expect(
        argumentoDeLlamada(prisma.pLAZOFINANCIACION.findMany).where,
      ).toEqual({});
    });
  });

  describe('listarCatalogo', () => {
    it('lista solo los plazos activos, por cantidad de cuotas, con TNA y tasa mensual en metadata', async () => {
      prisma.pLAZOFINANCIACION.findMany.mockResolvedValue([
        { ...plazoMock, cantidad_cuotas: 1 },
        plazoMock,
      ]);

      const catalogo = await service.listarCatalogo();

      const consulta = argumentoDeLlamada(prisma.pLAZOFINANCIACION.findMany);
      expect(consulta.where).toEqual({ estado: true });
      expect(consulta.orderBy).toEqual({ cantidad_cuotas: 'asc' });
      expect(catalogo).toEqual([
        {
          id: '1',
          code: '1 cuota',
          metadata: {
            codigo: 'PLZ-001',
            cantidad_cuotas: 1,
            tasa_nominal_anual: '24.00',
            tasa_mensual: '2.0000',
          },
        },
        {
          id: '1',
          code: '12 cuotas',
          metadata: {
            codigo: 'PLZ-001',
            cantidad_cuotas: 12,
            tasa_nominal_anual: '24.00',
            tasa_mensual: '2.0000',
          },
        },
      ]);
    });
  });

  describe('baja', () => {
    it('da de baja y registra quién y cuándo, sin borrar el registro', async () => {
      prisma.pLAZOFINANCIACION.findUnique.mockResolvedValue(plazoMock);
      prisma.pLAZOFINANCIACION.update.mockResolvedValue({
        ...plazoMock,
        estado: false,
      });

      await service.baja(1, USUARIO_ID);

      const { data } = argumentoDeLlamada(prisma.pLAZOFINANCIACION.update);
      expect(data?.estado).toBe(false);
      expect(data?.FK_usuario_actualizador).toBe(USUARIO_ID);
      expect(data?.hora_actualizacion).toBeInstanceOf(Date);
    });

    it('rechaza dar de baja un plazo que ya está de baja', async () => {
      prisma.pLAZOFINANCIACION.findUnique.mockResolvedValue({
        ...plazoMock,
        estado: false,
      });

      await expect(service.baja(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.pLAZOFINANCIACION.update).not.toHaveBeenCalled();
    });
  });

  describe('activar', () => {
    const plazoDeBaja = { ...plazoMock, estado: false };

    it('reactiva un plazo de baja si no hay otro activo con la misma cantidad de cuotas', async () => {
      prisma.pLAZOFINANCIACION.findUnique.mockResolvedValue(plazoDeBaja);
      prisma.pLAZOFINANCIACION.update.mockResolvedValue(plazoMock);

      await service.activar(1, USUARIO_ID);

      const { data } = argumentoDeLlamada(prisma.pLAZOFINANCIACION.update);
      expect(data?.estado).toBe(true);
      expect(data?.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('informa el conflicto si ya existe otro plazo activo con la misma cantidad de cuotas', async () => {
      prisma.pLAZOFINANCIACION.findUnique.mockResolvedValue(plazoDeBaja);
      prisma.pLAZOFINANCIACION.findFirst.mockResolvedValue({
        ...plazoMock,
        id_plazo_financiacion: 5,
        codigo: 'PLZ-005',
      });

      await expect(service.activar(1, USUARIO_ID)).rejects.toThrow(/PLZ-005/);
      // Excluye al propio plazo de la búsqueda de duplicados.
      expect(
        argumentoDeLlamada(prisma.pLAZOFINANCIACION.findFirst).where,
      ).toEqual({
        cantidad_cuotas: 12,
        estado: true,
        id_plazo_financiacion: { not: 1 },
      });
      expect(prisma.pLAZOFINANCIACION.update).not.toHaveBeenCalled();
    });

    it('rechaza reactivar un plazo que ya está activo', async () => {
      prisma.pLAZOFINANCIACION.findUnique.mockResolvedValue(plazoMock);

      await expect(service.activar(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('calcularTasaMensual', () => {
    it('divide la TNA por 12 con cuatro decimales', () => {
      expect(calcularTasaMensual(new Prisma.Decimal('24'))).toBe('2.0000');
      expect(calcularTasaMensual(new Prisma.Decimal('10'))).toBe('0.8333');
      expect(calcularTasaMensual(new Prisma.Decimal('0'))).toBe('0.0000');
    });
  });
});
