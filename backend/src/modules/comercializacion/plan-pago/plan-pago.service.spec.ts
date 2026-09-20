import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoComercial } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { PublicacionesService } from '../publicaciones/publicaciones.service';
import { PlanPagoService } from './plan-pago.service';
import { createPlanPagoSchema } from './dto/create-plan-pago.dto';
import { updatePlanPagoSchema } from './dto/update-plan-pago.dto';
import { queryPlanPagoSchema } from './dto/query-plan-pago.dto';
import { simularCuotasSchema } from './dto/simular-cuotas.dto';

/** `data` con el que se llamó a un `create`/`update` de PLANPAGO, ya tipado. */
type DataPlanPago = {
  data: {
    precio?: Prisma.Decimal;
    porcentaje_ganancia?: Prisma.Decimal;
    margen?: Prisma.Decimal;
    anticipo_porcentaje?: number | null;
    anticipo_monto?: number | null;
    cantidad_cuotas?: number | null;
    periodicidad?: string | null;
    tipo?: string;
    estado?: boolean;
    FK_usuario_creador?: number;
    FK_usuario_actualizador?: number;
  };
};

const dataDe = (mock: jest.Mock): DataPlanPago['data'] =>
  (mock.mock.calls as DataPlanPago[][])[0][0].data;

const ID_PUBLICACION = 1;
const ID_PLAN = 10;
const USUARIO_ID = 7;
const COSTO = new Prisma.Decimal('15000000.00');

describe('PlanPagoService', () => {
  let service: PlanPagoService;
  let tx: {
    pLANPAGO: { create: jest.Mock; count: jest.Mock; update: jest.Mock };
  };
  let prisma: {
    pUBLICACIONUNIDAD: { findUnique: jest.Mock };
    pLANPAGO: { findUnique: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let publicaciones: { transicionarEstadoComercial: jest.Mock };

  /** La publicación tal como la lee el service: vigente + estado comercial + costo de la unidad. */
  const publicacionEn = (
    estadoComercial: EstadoComercial,
    costo: Prisma.Decimal = COSTO,
    vigente = true,
  ) => ({
    vigente,
    estado_comercial: estadoComercial,
    unidadFuncional: { costo },
  });

  const dtoContado = (extra: Record<string, unknown> = {}) =>
    createPlanPagoSchema.parse({
      FK_publicacion: ID_PUBLICACION,
      nombre: 'Contado 1-A',
      tipo: 'CONTADO',
      precio: 19000000,
      ...extra,
    });

  const dtoFinanciado = (extra: Record<string, unknown> = {}) =>
    createPlanPagoSchema.parse({
      FK_publicacion: ID_PUBLICACION,
      nombre: 'Financiado 6 cuotas',
      tipo: 'FINANCIADO',
      precio: 27000000,
      anticipo_porcentaje: 20,
      cantidad_cuotas: 6,
      periodicidad: 'MENSUAL',
      ...extra,
    });

  /** El plan tal como lo lee `update()`, con su publicación y el costo. */
  const planGuardado = (
    estadoComercial: EstadoComercial,
    estado = true,
    costo: Prisma.Decimal = COSTO,
  ) => ({
    id_plan_pago: ID_PLAN,
    FK_publicacion: ID_PUBLICACION,
    estado,
    publicacion: {
      estado_comercial: estadoComercial,
      unidadFuncional: { costo },
    },
  });

  beforeEach(async () => {
    tx = {
      pLANPAGO: {
        create: jest.fn().mockResolvedValue({ id_plan_pago: ID_PLAN }),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue({ id_plan_pago: ID_PLAN }),
      },
    };

    prisma = {
      pUBLICACIONUNIDAD: { findUnique: jest.fn() },
      pLANPAGO: { findUnique: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn((callback: (t: typeof tx) => unknown) =>
        callback(tx),
      ),
    };

    publicaciones = { transicionarEstadoComercial: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanPagoService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicacionesService, useValue: publicaciones },
      ],
    }).compile();

    service = module.get(PlanPagoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('crea un plan CONTADO: sin cuotas ni periodicidad y con el anticipo al 100%', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        publicacionEn(EstadoComercial.EN_PREPARACION),
      );

      const resultado = await service.create(dtoContado(), USUARIO_ID);

      const data = dataDe(tx.pLANPAGO.create);
      expect(data.tipo).toBe('CONTADO');
      expect(data.cantidad_cuotas).toBeNull();
      expect(data.periodicidad).toBeNull();
      // El DTO normalizó el anticipo; el service guarda lo normalizado.
      expect(data.anticipo_porcentaje).toBe(100);
      expect(data.anticipo_monto).toBeNull();
      expect(data.FK_usuario_creador).toBe(USUARIO_ID);
      expect(data.FK_usuario_actualizador).toBe(USUARIO_ID);
      // En CONTADO el anticipo resuelto es el precio completo.
      expect(resultado.anticipo_monto_calculado.toFixed(2)).toBe('19000000.00');
    });

    it('resuelve el anticipo en % a monto, sin pisar lo que cargó el usuario', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        publicacionEn(EstadoComercial.EN_PREPARACION),
      );

      const resultado = await service.create(dtoFinanciado(), USUARIO_ID);

      // 27.000.000 * 20% = 5.400.000
      expect(resultado.anticipo_monto_calculado.toFixed(2)).toBe('5400000.00');

      // La fila conserva el porcentaje, no el monto resuelto.
      const data = dataDe(tx.pLANPAGO.create);
      expect(data.anticipo_porcentaje).toBe(20);
      expect(data.anticipo_monto).toBeNull();
      expect(data.cantidad_cuotas).toBe(6);
      expect(data.periodicidad).toBe('MENSUAL');
    });

    it('usa el anticipo_monto tal cual cuando el usuario lo cargó como monto', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        publicacionEn(EstadoComercial.EN_PREPARACION),
      );

      const resultado = await service.create(
        dtoFinanciado({
          anticipo_porcentaje: undefined,
          anticipo_monto: 5000000,
        }),
        USUARIO_ID,
      );

      expect(resultado.anticipo_monto_calculado.toFixed(2)).toBe('5000000.00');
      expect(dataDe(tx.pLANPAGO.create).anticipo_monto).toBe(5000000);
    });

    it('avisa con un warning si el precio es menor al costo, pero crea igual', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        publicacionEn(EstadoComercial.EN_PREPARACION),
      );

      const resultado = await service.create(
        dtoContado({ precio: 10000000 }),
        USUARIO_ID,
      );

      expect(tx.pLANPAGO.create).toHaveBeenCalled();
      expect(resultado.warning).toContain('menor al costo');
      expect(resultado.warning).toContain('15000000.00');
    });

    it('no devuelve warning cuando el precio cubre el costo', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        publicacionEn(EstadoComercial.EN_PREPARACION),
      );

      const resultado = await service.create(dtoContado(), USUARIO_ID);

      expect(resultado.warning).toBeNull();
    });

    it('calcula el % de ganancia implícito sin tocar las columnas reales', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        publicacionEn(EstadoComercial.EN_PREPARACION),
      );

      // (19.000.000 - 15.000.000) / 15.000.000 * 100 = 26,666... -> 26,67
      const resultado = await service.create(dtoContado(), USUARIO_ID);

      expect(resultado.porcentaje_ganancia_implicito?.toFixed(2)).toBe('26.67');

      // Las columnas reales quedan con el default 0 de Prisma: ni se mandan.
      const data = dataDe(tx.pLANPAGO.create);
      expect(data.porcentaje_ganancia).toBeUndefined();
      expect(data.margen).toBeUndefined();
    });

    it('no calcula el implícito si el usuario cargó porcentaje_ganancia o margen', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        publicacionEn(EstadoComercial.EN_PREPARACION),
      );

      const resultado = await service.create(
        dtoContado({ porcentaje_ganancia: 26.67, margen: 4000000 }),
        USUARIO_ID,
      );

      expect(resultado.porcentaje_ganancia_implicito).toBeNull();
      expect(dataDe(tx.pLANPAGO.create).porcentaje_ganancia?.toFixed(2)).toBe(
        '26.67',
      );
    });

    it('pasa la publicación a DISPONIBLE cuando es el primer plan activo', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        publicacionEn(EstadoComercial.EN_PREPARACION),
      );
      tx.pLANPAGO.count.mockResolvedValue(1);

      await service.create(dtoContado(), USUARIO_ID);

      expect(publicaciones.transicionarEstadoComercial).toHaveBeenCalledTimes(
        1,
      );
      expect(publicaciones.transicionarEstadoComercial).toHaveBeenCalledWith(
        tx,
        ID_PUBLICACION,
        EstadoComercial.EN_PREPARACION,
        EstadoComercial.DISPONIBLE,
        USUARIO_ID,
      );
    });

    it('no transiciona si la publicación ya tenía planes activos', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        publicacionEn(EstadoComercial.DISPONIBLE),
      );
      tx.pLANPAGO.count.mockResolvedValue(2);

      await service.create(dtoContado(), USUARIO_ID);

      expect(publicaciones.transicionarEstadoComercial).not.toHaveBeenCalled();
    });

    it('rechaza con 404 si la publicación no existe', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(null);

      await expect(service.create(dtoContado(), USUARIO_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza con 404 si la publicación no está vigente (historial de una unidad republicada)', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        publicacionEn(EstadoComercial.DISPONIBLE, COSTO, false),
      );

      await expect(service.create(dtoContado(), USUARIO_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('permite editar el precio si la publicación está EN_PREPARACION', async () => {
      prisma.pLANPAGO.findUnique.mockResolvedValue(
        planGuardado(EstadoComercial.EN_PREPARACION),
      );

      await service.update(
        ID_PLAN,
        updatePlanPagoSchema.parse({ precio: 21000000 }),
        USUARIO_ID,
      );

      const data = dataDe(tx.pLANPAGO.update);
      expect(data.precio?.toFixed(2)).toBe('21000000.00');
      expect(data.FK_usuario_actualizador).toBe(USUARIO_ID);
      expect(publicaciones.transicionarEstadoComercial).not.toHaveBeenCalled();
    });

    it('devuelve warning si el precio nuevo queda por debajo del costo', async () => {
      prisma.pLANPAGO.findUnique.mockResolvedValue(
        planGuardado(EstadoComercial.DISPONIBLE),
      );

      const resultado = await service.update(
        ID_PLAN,
        updatePlanPagoSchema.parse({ precio: 9000000 }),
        USUARIO_ID,
      );

      expect(resultado.warning).toContain('menor al costo');
    });

    it('calcula el % de ganancia implícito cuando la edición carga el precio directo', async () => {
      prisma.pLANPAGO.findUnique.mockResolvedValue(
        planGuardado(EstadoComercial.DISPONIBLE),
      );

      // (19.000.000 - 15.000.000) / 15.000.000 * 100 = 26,666... -> 26,67
      const resultado = await service.update(
        ID_PLAN,
        updatePlanPagoSchema.parse({ precio: 19000000 }),
        USUARIO_ID,
      );

      expect(resultado.porcentaje_ganancia_implicito?.toFixed(2)).toBe('26.67');
    });

    it('no calcula el implícito si la edición trae porcentaje_ganancia o margen junto con el precio', async () => {
      prisma.pLANPAGO.findUnique.mockResolvedValue(
        planGuardado(EstadoComercial.DISPONIBLE),
      );

      const resultado = await service.update(
        ID_PLAN,
        updatePlanPagoSchema.parse({ precio: 19000000, margen: 4000000 }),
        USUARIO_ID,
      );

      expect(resultado.porcentaje_ganancia_implicito).toBeNull();
    });

    it('no calcula warning ni implícito si la edición no tocó el precio', async () => {
      prisma.pLANPAGO.findUnique.mockResolvedValue(
        planGuardado(EstadoComercial.DISPONIBLE),
      );
      tx.pLANPAGO.count.mockResolvedValue(1);

      const resultado = await service.update(
        ID_PLAN,
        updatePlanPagoSchema.parse({ estado: false }),
        USUARIO_ID,
      );

      expect(resultado.warning).toBeNull();
      expect(resultado.porcentaje_ganancia_implicito).toBeNull();
    });

    it('rechaza editar el precio si la publicación está EN_PLAN_DE_PAGO', async () => {
      prisma.pLANPAGO.findUnique.mockResolvedValue(
        planGuardado(EstadoComercial.EN_PLAN_DE_PAGO),
      );

      await expect(
        service.update(
          ID_PLAN,
          updatePlanPagoSchema.parse({ precio: 21000000 }),
          USUARIO_ID,
        ),
      ).rejects.toThrow(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('vuelve a EN_PREPARACION al inactivar el último plan activo', async () => {
      prisma.pLANPAGO.findUnique.mockResolvedValue(
        planGuardado(EstadoComercial.DISPONIBLE),
      );
      tx.pLANPAGO.count.mockResolvedValue(0);

      await service.update(
        ID_PLAN,
        updatePlanPagoSchema.parse({ estado: false }),
        USUARIO_ID,
      );

      expect(publicaciones.transicionarEstadoComercial).toHaveBeenCalledWith(
        tx,
        ID_PUBLICACION,
        EstadoComercial.DISPONIBLE,
        EstadoComercial.EN_PREPARACION,
        USUARIO_ID,
      );
    });

    it('no transiciona al inactivar si quedan otros planes activos', async () => {
      prisma.pLANPAGO.findUnique.mockResolvedValue(
        planGuardado(EstadoComercial.DISPONIBLE),
      );
      tx.pLANPAGO.count.mockResolvedValue(1);

      await service.update(
        ID_PLAN,
        updatePlanPagoSchema.parse({ estado: false }),
        USUARIO_ID,
      );

      expect(publicaciones.transicionarEstadoComercial).not.toHaveBeenCalled();
    });

    it.each([EstadoComercial.EN_PLAN_DE_PAGO, EstadoComercial.VENDIDA])(
      'no transiciona al inactivar un plan de una publicación %s',
      async (estadoComercial) => {
        prisma.pLANPAGO.findUnique.mockResolvedValue(
          planGuardado(estadoComercial),
        );
        tx.pLANPAGO.count.mockResolvedValue(0);

        await service.update(
          ID_PLAN,
          updatePlanPagoSchema.parse({ estado: false }),
          USUARIO_ID,
        );

        // Inactivar un plan de una publicación ya vendida no cambia nada: si
        // se llamara, la función compartida tiraría por transición inválida.
        expect(tx.pLANPAGO.update).toHaveBeenCalled();
        expect(
          publicaciones.transicionarEstadoComercial,
        ).not.toHaveBeenCalled();
      },
    );

    it('vuelve a DISPONIBLE al reactivar el primer plan activo', async () => {
      prisma.pLANPAGO.findUnique.mockResolvedValue(
        planGuardado(EstadoComercial.EN_PREPARACION, false),
      );
      tx.pLANPAGO.count.mockResolvedValue(1);

      await service.update(
        ID_PLAN,
        updatePlanPagoSchema.parse({ estado: true }),
        USUARIO_ID,
      );

      expect(publicaciones.transicionarEstadoComercial).toHaveBeenCalledWith(
        tx,
        ID_PUBLICACION,
        EstadoComercial.EN_PREPARACION,
        EstadoComercial.DISPONIBLE,
        USUARIO_ID,
      );
    });

    it('no transiciona si el estado mandado es el que el plan ya tenía', async () => {
      prisma.pLANPAGO.findUnique.mockResolvedValue(
        planGuardado(EstadoComercial.DISPONIBLE, true),
      );

      await service.update(
        ID_PLAN,
        updatePlanPagoSchema.parse({ estado: true }),
        USUARIO_ID,
      );

      expect(publicaciones.transicionarEstadoComercial).not.toHaveBeenCalled();
    });

    it('rechaza con 404 si el plan no existe', async () => {
      prisma.pLANPAGO.findUnique.mockResolvedValue(null);

      await expect(
        service.update(
          ID_PLAN,
          updatePlanPagoSchema.parse({ precio: 100 }),
          USUARIO_ID,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('devuelve el plan encontrado', async () => {
      prisma.pLANPAGO.findUnique.mockResolvedValue({ id_plan_pago: ID_PLAN });

      await expect(service.findOne(ID_PLAN)).resolves.toEqual({
        id_plan_pago: ID_PLAN,
      });
    });

    it('rechaza con 404 si el plan no existe', async () => {
      prisma.pLANPAGO.findUnique.mockResolvedValue(null);

      await expect(service.findOne(ID_PLAN)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByPublicacion', () => {
    const where = (): Record<string, unknown> =>
      (
        prisma.pLANPAGO.findMany.mock.calls as {
          where: Record<string, unknown>;
        }[][]
      )[0][0].where;

    it('filtra solo los planes activos de la publicación por default', async () => {
      prisma.pLANPAGO.findMany.mockResolvedValue([]);

      await service.findByPublicacion(
        queryPlanPagoSchema.parse({ FK_publicacion: String(ID_PUBLICACION) }),
      );

      expect(where()).toEqual({
        FK_publicacion: ID_PUBLICACION,
        estado: true,
      });
    });

    it('trae solo los inactivos con estado=false', async () => {
      prisma.pLANPAGO.findMany.mockResolvedValue([]);

      await service.findByPublicacion(
        queryPlanPagoSchema.parse({
          FK_publicacion: String(ID_PUBLICACION),
          estado: 'false',
        }),
      );

      expect(where()).toEqual({
        FK_publicacion: ID_PUBLICACION,
        estado: false,
      });
    });

    it('no filtra por estado con estado=todos', async () => {
      prisma.pLANPAGO.findMany.mockResolvedValue([]);

      await service.findByPublicacion(
        queryPlanPagoSchema.parse({
          FK_publicacion: String(ID_PUBLICACION),
          estado: 'todos',
        }),
      );

      expect(where()).toEqual({ FK_publicacion: ID_PUBLICACION });
    });
  });

  describe('simularCuotas', () => {
    it('convierte el anticipo en % a monto antes de pasárselo al motor', () => {
      // 27.000.000 - (20% = 5.400.000) = 21.600.000 / 6 = 3.600.000 por cuota.
      const cuotas = service.simularCuotas(
        simularCuotasSchema.parse({
          tipo: 'FINANCIADO',
          precio: 27000000,
          anticipo_porcentaje: 20,
          cantidad_cuotas: 6,
          periodicidad: 'MENSUAL',
          fecha_venta: '2026-04-14',
        }),
      );

      expect(cuotas).toHaveLength(7);
      expect(cuotas[0].importe.toFixed(2)).toBe('5400000.00');
      expect(cuotas[1].importe.toFixed(2)).toBe('3600000.00');
      expect(cuotas[1].fecha_vencimiento.toISOString().slice(0, 10)).toBe(
        '2026-05-14',
      );
    });

    it('simula un CONTADO como una única cuota por el total', () => {
      const cuotas = service.simularCuotas(
        simularCuotasSchema.parse({
          tipo: 'CONTADO',
          precio: 19000000,
          fecha_venta: '2026-08-01',
        }),
      );

      expect(cuotas).toHaveLength(1);
      expect(cuotas[0].numero).toBe(0);
      expect(cuotas[0].importe.toFixed(2)).toBe('19000000.00');
    });

    it('usa la fecha de hoy si el frontend no manda fecha_venta', () => {
      const hoy = new Date().toISOString().slice(0, 10);

      const cuotas = service.simularCuotas(
        simularCuotasSchema.parse({
          tipo: 'CONTADO',
          precio: 19000000,
        }),
      );

      expect(cuotas[0].fecha_vencimiento.toISOString().slice(0, 10)).toBe(hoy);
    });

    it('no toca la base: simular no escribe ni lee nada', () => {
      service.simularCuotas(
        simularCuotasSchema.parse({ tipo: 'CONTADO', precio: 19000000 }),
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.pUBLICACIONUNIDAD.findUnique).not.toHaveBeenCalled();
      expect(prisma.pLANPAGO.findUnique).not.toHaveBeenCalled();
      expect(prisma.pLANPAGO.findMany).not.toHaveBeenCalled();
    });
  });
});
