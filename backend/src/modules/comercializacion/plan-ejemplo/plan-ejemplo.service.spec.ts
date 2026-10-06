import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoComercial } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { PlazoFinanciacionService } from '../plazo-financiacion/plazo-financiacion.service';
import { PlanEjemploService } from './plan-ejemplo.service';
import { createPlanEjemploSchema } from './dto/create-plan-ejemplo.dto';
import { updatePlanEjemploSchema } from './dto/update-plan-ejemplo.dto';
import { queryPlanEjemploSchema } from './dto/query-plan-ejemplo.dto';

type Args = { data?: Record<string, unknown>; where?: Record<string, unknown> };

/** Argumento de la N-ésima llamada a un mock de Prisma, ya tipado. */
const argumento = (mock: jest.Mock, llamada = 0): Args =>
  (mock.mock.calls as Args[][])[llamada][0];

const ID_PUBLICACION = 1;
const ID_PLAN = 10;
const ID_PLAZO = 3;
const USUARIO_ID = 7;

/** Plazo como lo devuelve `PlazoFinanciacionService.findOne`. */
const plazo = (parcial: Record<string, unknown> = {}) => ({
  id_plazo_financiacion: ID_PLAZO,
  codigo: 'PLZ-003',
  cantidad_cuotas: 12,
  tasa_nominal_anual: new Prisma.Decimal('24'),
  estado: true,
  ...parcial,
});

/**
 * Plan como lo lee el service (PLAN_EJEMPLO_SELECT). Por defecto, el caso de
 * prueba del sistema francés: precio de lista 20.000.000, anticipo 50 %,
 * 12 cuotas y TNA 24 %.
 */
const planLeido = (
  parcial: Record<string, unknown> = {},
  tna = '24',
  precioLista = '20000000.00',
) => ({
  id_plan_ejemplo: ID_PLAN,
  FK_publicacion: ID_PUBLICACION,
  nombre: 'Anticipo 50 % + 12 cuotas',
  anticipo_porcentaje: new Prisma.Decimal('50'),
  estado: true,
  hora_creacion: new Date('2026-10-01'),
  hora_actualizacion: new Date('2026-10-01'),
  FK_usuario_creador: USUARIO_ID,
  FK_usuario_actualizador: USUARIO_ID,
  plazoFinanciacion: {
    id_plazo_financiacion: ID_PLAZO,
    codigo: 'PLZ-003',
    cantidad_cuotas: 12,
    tasa_nominal_anual: new Prisma.Decimal(tna),
  },
  publicacion: { precio_lista: new Prisma.Decimal(precioLista) },
  ...parcial,
});

/** La publicación como la lee `buscarPublicacionDisponible`. */
const publicacion = (
  estadoComercial: EstadoComercial = EstadoComercial.DISPONIBLE,
  vigente = true,
) => ({
  vigente,
  estado_comercial: estadoComercial,
  precio_lista: new Prisma.Decimal('20000000.00'),
});

describe('PlanEjemploService', () => {
  let service: PlanEjemploService;
  let prisma: {
    pUBLICACIONUNIDAD: { findUnique: jest.Mock };
    pLANEJEMPLO: {
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let plazos: { findOne: jest.Mock };

  beforeEach(async () => {
    prisma = {
      pUBLICACIONUNIDAD: {
        findUnique: jest.fn().mockResolvedValue(publicacion()),
      },
      pLANEJEMPLO: {
        create: jest.fn().mockResolvedValue(planLeido()),
        update: jest.fn().mockResolvedValue(planLeido()),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    plazos = { findOne: jest.fn().mockResolvedValue(plazo()) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanEjemploService,
        { provide: PrismaService, useValue: prisma },
        { provide: PlazoFinanciacionService, useValue: plazos },
      ],
    }).compile();

    service = module.get(PlanEjemploService);
  });

  const dtoAlta = (extra: Record<string, unknown> = {}) =>
    createPlanEjemploSchema.parse({
      FK_publicacion: ID_PUBLICACION,
      nombre: 'Anticipo 50 % + 12 cuotas',
      anticipo_porcentaje: 50,
      FK_plazo_financiacion: ID_PLAZO,
      ...extra,
    });

  describe('create', () => {
    it('guarda solo nombre, anticipo en %, plazo y auditoría: ni precio ni tipo ni cuotas', async () => {
      await service.create(dtoAlta(), USUARIO_ID);

      const data = argumento(prisma.pLANEJEMPLO.create).data!;
      expect(Object.keys(data).sort()).toEqual([
        'FK_plazo_financiacion',
        'FK_publicacion',
        'FK_usuario_actualizador',
        'FK_usuario_creador',
        'anticipo_porcentaje',
        'nombre',
      ]);
      expect((data.anticipo_porcentaje as Prisma.Decimal).toFixed(2)).toBe(
        '50.00',
      );
      expect(data.FK_usuario_creador).toBe(USUARIO_ID);
      expect(data.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('devuelve el plan con sus importes calculados por sistema francés', async () => {
      const resultado = await service.create(dtoAlta(), USUARIO_ID);

      expect(resultado.plazo).toEqual({
        id_plazo_financiacion: ID_PLAZO,
        codigo: 'PLZ-003',
        cantidad_cuotas: 12,
        tasa_nominal_anual: '24.00',
      });
      expect(resultado.importes).toEqual({
        precio_lista: '20000000.00',
        anticipo_monto: '10000000.00',
        saldo_financiado: '10000000.00',
        tasa_mensual: '2.0000',
        valor_cuota: '945595.97',
        total_intereses: '1347151.59',
        total_a_pagar: '21347151.59',
      });
    });

    it.each([
      EstadoComercial.EN_PREPARACION,
      EstadoComercial.EN_PLAN_DE_PAGO,
      EstadoComercial.VENDIDA,
    ])('rechaza con 409 si la publicación está %s', async (estadoComercial) => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        publicacion(estadoComercial),
      );

      await expect(service.create(dtoAlta(), USUARIO_ID)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.pLANEJEMPLO.create).not.toHaveBeenCalled();
    });

    it('rechaza con 404 si la publicación no existe o no está vigente', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValueOnce(null);
      await expect(service.create(dtoAlta(), USUARIO_ID)).rejects.toThrow(
        NotFoundException,
      );

      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValueOnce(
        publicacion(EstadoComercial.DISPONIBLE, false),
      );
      await expect(service.create(dtoAlta(), USUARIO_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.pLANEJEMPLO.create).not.toHaveBeenCalled();
    });

    it('rechaza con 409 un plazo dado de baja', async () => {
      plazos.findOne.mockResolvedValue(plazo({ estado: false }));

      await expect(service.create(dtoAlta(), USUARIO_ID)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.pLANEJEMPLO.create).not.toHaveBeenCalled();
    });

    it('propaga el 404 de un plazo inexistente', async () => {
      plazos.findOne.mockRejectedValue(new NotFoundException('no existe'));

      await expect(service.create(dtoAlta(), USUARIO_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const planGuardado = (idPlazo: number | null = ID_PLAZO) => ({
      FK_publicacion: ID_PUBLICACION,
      FK_plazo_financiacion: idPlazo,
      anticipo_porcentaje: new Prisma.Decimal('50'),
    });

    beforeEach(() => {
      prisma.pLANEJEMPLO.findUnique.mockResolvedValue(planGuardado());
    });

    it('inactiva el plan y registra quién y cuándo', async () => {
      await service.update(
        ID_PLAN,
        updatePlanEjemploSchema.parse({ estado: false }),
        USUARIO_ID,
      );

      const data = argumento(prisma.pLANEJEMPLO.update).data!;
      expect(data.estado).toBe(false);
      expect(data.FK_usuario_actualizador).toBe(USUARIO_ID);
      expect(data.hora_actualizacion).toBeInstanceOf(Date);
    });

    it('edita anticipo y plazo, validando el plazo nuevo', async () => {
      await service.update(
        ID_PLAN,
        updatePlanEjemploSchema.parse({
          anticipo_porcentaje: 30,
          FK_plazo_financiacion: 5,
        }),
        USUARIO_ID,
      );

      expect(plazos.findOne).toHaveBeenCalledWith(5);
      const data = argumento(prisma.pLANEJEMPLO.update).data!;
      expect((data.anticipo_porcentaje as Prisma.Decimal).toFixed(2)).toBe(
        '30.00',
      );
      expect(data.FK_plazo_financiacion).toBe(5);
    });

    it('si no cambia el plazo, valida que el que ya tenía siga activo', async () => {
      plazos.findOne.mockResolvedValue(plazo({ estado: false }));

      await expect(
        service.update(
          ID_PLAN,
          updatePlanEjemploSchema.parse({ nombre: 'Otro nombre' }),
          USUARIO_ID,
        ),
      ).rejects.toThrow(ConflictException);
      expect(plazos.findOne).toHaveBeenCalledWith(ID_PLAZO);
      expect(prisma.pLANEJEMPLO.update).not.toHaveBeenCalled();
    });

    it('un plan del Sprint 3 sin plazo solo se modifica eligiéndole uno', async () => {
      prisma.pLANEJEMPLO.findUnique.mockResolvedValue(planGuardado(null));

      await expect(
        service.update(
          ID_PLAN,
          updatePlanEjemploSchema.parse({ estado: false }),
          USUARIO_ID,
        ),
      ).rejects.toThrow(ConflictException);
      expect(prisma.pLANEJEMPLO.update).not.toHaveBeenCalled();
    });

    it.each([
      EstadoComercial.EN_PREPARACION,
      EstadoComercial.EN_PLAN_DE_PAGO,
      EstadoComercial.VENDIDA,
    ])(
      'rechaza con 409 cualquier cambio, incluida la inactivación, si la publicación está %s',
      async (estadoComercial) => {
        prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
          publicacion(estadoComercial),
        );

        await expect(
          service.update(
            ID_PLAN,
            updatePlanEjemploSchema.parse({ estado: false }),
            USUARIO_ID,
          ),
        ).rejects.toThrow(ConflictException);
        expect(prisma.pLANEJEMPLO.update).not.toHaveBeenCalled();
      },
    );

    it('rechaza con 404 si el plan no existe', async () => {
      prisma.pLANEJEMPLO.findUnique.mockResolvedValue(null);

      await expect(
        service.update(
          ID_PLAN,
          updatePlanEjemploSchema.parse({ estado: false }),
          USUARIO_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne y findByPublicacion', () => {
    it('findOne solo encuentra planes con plazo activo y anticipo en %', async () => {
      prisma.pLANEJEMPLO.findFirst.mockResolvedValue(planLeido());

      await service.findOne(ID_PLAN);

      expect(argumento(prisma.pLANEJEMPLO.findFirst).where).toEqual({
        id_plan_ejemplo: ID_PLAN,
        plazoFinanciacion: { is: { estado: true } },
        anticipo_porcentaje: { not: null },
      });
    });

    it('findOne tira 404 si el plan no existe o su plazo está dado de baja', async () => {
      prisma.pLANEJEMPLO.findFirst.mockResolvedValue(null);

      await expect(service.findOne(ID_PLAN)).rejects.toThrow(NotFoundException);
    });

    it('el listado filtra por publicación, estado y plazo activo', async () => {
      await service.findByPublicacion(
        queryPlanEjemploSchema.parse({ FK_publicacion: '1' }),
      );

      expect(argumento(prisma.pLANEJEMPLO.findMany).where).toEqual({
        FK_publicacion: ID_PUBLICACION,
        estado: true,
        plazoFinanciacion: { is: { estado: true } },
        anticipo_porcentaje: { not: null },
      });
    });

    it('con estado=todos no filtra por estado, pero sigue ocultando los de plazo inactivo', async () => {
      await service.findByPublicacion(
        queryPlanEjemploSchema.parse({ FK_publicacion: '1', estado: 'todos' }),
      );

      const where = argumento(prisma.pLANEJEMPLO.findMany).where!;
      expect(where).not.toHaveProperty('estado');
      expect(where.plazoFinanciacion).toEqual({ is: { estado: true } });
    });

    it('si cambian el precio de lista o la TNA, cambian los importes devueltos sin editar el plan', async () => {
      prisma.pLANEJEMPLO.findMany.mockResolvedValueOnce([planLeido()]);
      const [antes] = await service.findByPublicacion(
        queryPlanEjemploSchema.parse({ FK_publicacion: '1' }),
      );

      prisma.pLANEJEMPLO.findMany.mockResolvedValueOnce([
        planLeido({}, '0', '22000000.00'),
      ]);
      const [despues] = await service.findByPublicacion(
        queryPlanEjemploSchema.parse({ FK_publicacion: '1' }),
      );

      expect(antes.importes.valor_cuota).toBe('945595.97');
      // 22.000.000 * 50 % = 11.000.000 a financiar, sin interés, en 12 cuotas.
      expect(despues.importes.anticipo_monto).toBe('11000000.00');
      expect(despues.importes.valor_cuota).toBe('916666.67');
      expect(despues.importes.total_intereses).toBe('0.00');
    });
  });

  describe('simular', () => {
    const dtoSimular = {
      FK_publicacion: ID_PUBLICACION,
      anticipo_porcentaje: 50,
      FK_plazo_financiacion: ID_PLAZO,
    };

    it('devuelve importes y cronograma con el precio de lista y la TNA vigentes, sin guardar nada', async () => {
      const resultado = await service.simular(dtoSimular);

      expect(resultado.valor_cuota).toBe('945595.97');
      expect(resultado.total_intereses).toBe('1347151.59');
      expect(resultado.cantidad_cuotas).toBe(12);
      expect(resultado.tasa_nominal_anual).toBe('24.00');
      expect(resultado.cuotas).toHaveLength(13);
      expect(resultado.cuotas[1]).toMatchObject({
        numero: 1,
        importe_capital: '745595.97',
        importe_interes: '200000.00',
        importe: '945595.97',
        saldo_capital: '9254404.03',
      });
      expect(resultado.cuotas[12].importe).toBe('945595.92');
      expect(prisma.pLANEJEMPLO.create).not.toHaveBeenCalled();
      expect(prisma.pLANEJEMPLO.update).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si la publicación no está Disponible', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        publicacion(EstadoComercial.EN_PREPARACION),
      );

      await expect(service.simular(dtoSimular)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('anticipo (schema del DTO)', () => {
    it.each([0, 100, -5, 100.5, 33.333])(
      'rechaza un anticipo de %s %',
      (anticipo) => {
        expect(
          createPlanEjemploSchema.safeParse({
            FK_publicacion: 1,
            nombre: 'Plan',
            anticipo_porcentaje: anticipo,
            FK_plazo_financiacion: 1,
          }).success,
        ).toBe(false);
      },
    );

    it.each([0.01, 30, 99.99])('acepta un anticipo de %s %', (anticipo) => {
      expect(
        createPlanEjemploSchema.safeParse({
          FK_publicacion: 1,
          nombre: 'Plan',
          anticipo_porcentaje: anticipo,
          FK_plazo_financiacion: 1,
        }).success,
      ).toBe(true);
    });
  });
});
