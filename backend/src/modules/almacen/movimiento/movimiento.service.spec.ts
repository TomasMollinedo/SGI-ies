import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { MovimientoService } from './movimiento.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateMovimientoDto,
  createMovimientoSchema,
} from './dto/create-movimiento.dto';
import { QueryMovimientoDto } from './dto/query-movimiento.dto';

/** Argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = {
  data?: Record<string, unknown>;
  where?: Record<string, unknown>;
};

const argumentosDe = (mock: jest.Mock): ArgumentoPrisma[] =>
  (mock.mock.calls as ArgumentoPrisma[][]).map((llamada) => llamada[0]);

describe('MovimientoService', () => {
  let service: MovimientoService;
  let tx: {
    mOVIMIENTO: { create: jest.Mock };
    sTOCK: { updateMany: jest.Mock };
    sTOCKMOVIMIENTO: { create: jest.Mock };
  };
  let prisma: {
    tIPOMOVIMIENTO: { findUnique: jest.Mock };
    dEPOSITO: { findUnique: jest.Mock };
    sTOCK: { findMany: jest.Mock };
    mOVIMIENTO: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const USUARIO_ID = 7;
  const ID_DEPOSITO = 1;
  const ID_MOVIMIENTO = 100;

  const entrada = {
    id_tipo_movimiento: 1,
    nombre: 'Entrada por compra',
    indicador_entrada: true,
    estado: true,
  };
  const salida = {
    id_tipo_movimiento: 2,
    nombre: 'Salida por consumo',
    indicador_entrada: false,
    estado: true,
  };

  /** Ficha con 10 unidades en el depósito 1, activa. */
  const ficha = (
    id: number,
    cantidad = 10,
    extra: Partial<Record<string, unknown>> = {},
  ) => ({
    id_stock: id,
    cantidad,
    estado: true,
    FK_deposito: ID_DEPOSITO,
    articulo: { nombre: `Artículo ${id}` },
    ...extra,
  });

  const dtoBase = (detalle = [{ FK_Stock: 1, cantidad: 4 }]) =>
    ({
      FK_TipoMovimiento: entrada.id_tipo_movimiento,
      FK_Deposito: ID_DEPOSITO,
      detalle,
    }) as CreateMovimientoDto;

  beforeEach(async () => {
    tx = {
      mOVIMIENTO: {
        create: jest.fn().mockResolvedValue({ id_movimiento: ID_MOVIMIENTO }),
      },
      // count: 1 = el update aplicó (había stock suficiente).
      sTOCK: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      sTOCKMOVIMIENTO: { create: jest.fn().mockResolvedValue({}) },
    };

    prisma = {
      tIPOMOVIMIENTO: { findUnique: jest.fn().mockResolvedValue(entrada) },
      dEPOSITO: {
        findUnique: jest.fn().mockResolvedValue({ id_deposito: ID_DEPOSITO }),
      },
      sTOCK: { findMany: jest.fn().mockResolvedValue([ficha(1)]) },
      mOVIMIENTO: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id_movimiento: ID_MOVIMIENTO }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn((callback: (t: typeof tx) => unknown) =>
        callback(tx),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimientoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(MovimientoService);
  });

  describe('validación de la cabecera', () => {
    it('rechaza si el tipo de movimiento no existe', async () => {
      prisma.tIPOMOVIMIENTO.findUnique.mockResolvedValue(null);

      await expect(
        service.create(dtoBase(), USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza si el tipo de movimiento está dado de baja', async () => {
      prisma.tIPOMOVIMIENTO.findUnique.mockResolvedValue({
        ...entrada,
        estado: false,
      });

      await expect(
        service.create(dtoBase(), USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza si el depósito no existe', async () => {
      prisma.dEPOSITO.findUnique.mockResolvedValue(null);

      await expect(
        service.create(dtoBase(), USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('validación de las fichas del detalle', () => {
    it('rechaza si alguna ficha del detalle no existe', async () => {
      prisma.sTOCK.findMany.mockResolvedValue([ficha(1)]);

      await expect(
        service.create(
          dtoBase([
            { FK_Stock: 1, cantidad: 2 },
            { FK_Stock: 99, cantidad: 2 },
          ]),
          USUARIO_ID,
        ),
      ).rejects.toThrow(/id: 99/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza si alguna ficha del detalle está dada de baja', async () => {
      prisma.sTOCK.findMany.mockResolvedValue([
        ficha(1, 10, { estado: false }),
      ]);

      await expect(
        service.create(dtoBase(), USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza si alguna ficha no pertenece al depósito de la cabecera', async () => {
      prisma.sTOCK.findMany.mockResolvedValue([
        ficha(1, 10, { FK_deposito: 999 }),
      ]);

      await expect(
        service.create(dtoBase(), USUARIO_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza a nivel DTO si el detalle repite el mismo FK_Stock', () => {
      const resultado = createMovimientoSchema.safeParse({
        FK_TipoMovimiento: 1,
        FK_Deposito: ID_DEPOSITO,
        detalle: [
          { FK_Stock: 1, cantidad: 2 },
          { FK_Stock: 1, cantidad: 3 },
        ],
      });

      expect(resultado.success).toBe(false);
      expect(resultado.error?.issues[0].message).toMatch(/repetir la misma/);
    });
  });

  describe('actualización de stock', () => {
    it('suma en una entrada, y guarda stock_anterior/stock_nuevo correctos', async () => {
      await service.create(dtoBase([{ FK_Stock: 1, cantidad: 4 }]), USUARIO_ID);

      const [updateStock] = argumentosDe(tx.sTOCK.updateMany);
      expect(updateStock.data?.cantidad).toEqual({ increment: 4 });
      // En una entrada no hay condición de stock mínimo en el WHERE.
      expect(updateStock.where).toEqual({ id_stock: 1 });

      const [linea] = argumentosDe(tx.sTOCKMOVIMIENTO.create);
      expect(linea.data).toMatchObject({
        FK_Movimiento: ID_MOVIMIENTO,
        FK_Stock: 1,
        cantidad: 4,
        stock_anterior: 10,
        stock_nuevo: 14,
      });
    });

    it('resta en una salida, con la condición de stock suficiente en el WHERE', async () => {
      prisma.tIPOMOVIMIENTO.findUnique.mockResolvedValue(salida);

      await service.create(
        {
          ...dtoBase([{ FK_Stock: 1, cantidad: 4 }]),
          FK_TipoMovimiento: salida.id_tipo_movimiento,
        },
        USUARIO_ID,
      );

      const [updateStock] = argumentosDe(tx.sTOCK.updateMany);
      expect(updateStock.data?.cantidad).toEqual({ increment: -4 });
      // La condición viaja en el WHERE para que la base la evalúe de forma
      // atómica junto con la escritura.
      expect(updateStock.where).toEqual({
        id_stock: 1,
        cantidad: { gte: 4 },
      });

      const [linea] = argumentosDe(tx.sTOCKMOVIMIENTO.create);
      expect(linea.data).toMatchObject({ stock_anterior: 10, stock_nuevo: 6 });
    });

    it('rechaza sin aplicar nada si una salida dejaría el stock en negativo', async () => {
      prisma.tIPOMOVIMIENTO.findUnique.mockResolvedValue(salida);
      prisma.sTOCK.findMany.mockResolvedValue([ficha(1, 10), ficha(2, 3)]);

      await expect(
        service.create(
          {
            ...dtoBase([
              { FK_Stock: 1, cantidad: 2 },
              { FK_Stock: 2, cantidad: 5 },
            ]),
            FK_TipoMovimiento: salida.id_tipo_movimiento,
          },
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      // Ni siquiera se abre la transacción: la línea 1, que sí tenía stock,
      // tampoco se aplica.
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('aborta la transacción si el updateMany atómico no aplica (carrera)', async () => {
      prisma.tIPOMOVIMIENTO.findUnique.mockResolvedValue(salida);
      // El chequeo previo pasa (la ficha tenía 10), pero para cuando se
      // escribe, otro movimiento concurrente ya consumió el stock.
      tx.sTOCK.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.create(
          {
            ...dtoBase([{ FK_Stock: 1, cantidad: 4 }]),
            FK_TipoMovimiento: salida.id_tipo_movimiento,
          },
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      // La excepción se tira antes de registrar la línea, así que Prisma
      // revierte también la cabecera ya creada.
      expect(tx.sTOCKMOVIMIENTO.create).not.toHaveBeenCalled();
    });
  });

  describe('fecha del movimiento', () => {
    it('rechaza una fecha futura', async () => {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);

      await expect(
        service.create({ ...dtoBase(), fecha_movimiento: manana }, USUARIO_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('usa la fecha de hoy si el cliente no manda ninguna', async () => {
      const antes = Date.now();

      await service.create(dtoBase(), USUARIO_ID);

      const [cabecera] = argumentosDe(tx.mOVIMIENTO.create);
      const fecha = cabecera.data?.fecha_movimiento as Date;
      expect(fecha.getTime()).toBeGreaterThanOrEqual(antes);
      expect(fecha.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('respeta una fecha pasada mandada por el cliente', async () => {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);

      await service.create(
        { ...dtoBase(), fecha_movimiento: ayer },
        USUARIO_ID,
      );

      const [cabecera] = argumentosDe(tx.mOVIMIENTO.create);
      expect(cabecera.data?.fecha_movimiento).toEqual(ayer);
    });
  });

  describe('auditoría', () => {
    it('completa el usuario creador con el usuario autenticado, no con el body', async () => {
      await service.create(dtoBase(), USUARIO_ID);

      const [cabecera] = argumentosDe(tx.mOVIMIENTO.create);
      expect(cabecera.data).toMatchObject({
        FK_usuario_creador: USUARIO_ID,
        FK_usuario_actualizador: USUARIO_ID,
      });
    });
  });

  describe('findAll', () => {
    const ID_ARTICULO = 42;

    /** Query ya "parseado" por el DTO: page y limit siempre vienen con default. */
    const query = (filtros: Record<string, unknown> = {}) =>
      ({ page: 1, limit: 10, ...filtros }) as unknown as QueryMovimientoDto;

    /** El `where` con el que se llamó a findMany. */
    const whereDelListado = () =>
      argumentosDe(prisma.mOVIMIENTO.findMany)[0].where;

    it('filtra por artículo atravesando la relación stockMovimientos -> stock', async () => {
      await service.findAll(query({ FK_articulo: ID_ARTICULO }));

      expect(whereDelListado()).toEqual({
        stockMovimientos: { some: { stock: { FK_articulo: ID_ARTICULO } } },
      });
    });

    it('combina depósito y artículo con AND: pide que se cumplan los dos', async () => {
      await service.findAll(
        query({ FK_Deposito: ID_DEPOSITO, FK_articulo: ID_ARTICULO }),
      );

      // Las dos condiciones van juntas en el mismo objeto where, que Prisma
      // traduce a un AND. Si fueran un OR, entrarían movimientos del depósito
      // que no tienen el artículo (y al revés).
      expect(whereDelListado()).toEqual({
        FK_Deposito: ID_DEPOSITO,
        stockMovimientos: { some: { stock: { FK_articulo: ID_ARTICULO } } },
      });
    });

    it('usa el mismo where para el listado y para el total de la paginación', async () => {
      await service.findAll(
        query({ FK_articulo: ID_ARTICULO, FK_TipoMovimiento: 2 }),
      );

      // Si el count usara otro where, meta.total no coincidiría con los
      // resultados devueltos.
      expect(argumentosDe(prisma.mOVIMIENTO.count)[0].where).toEqual(
        whereDelListado(),
      );
    });

    it('no duplica un movimiento con varias líneas del mismo artículo', async () => {
      prisma.mOVIMIENTO.findMany.mockResolvedValue([
        { id_movimiento: 1, _count: { stockMovimientos: 3 } },
      ]);
      prisma.mOVIMIENTO.count.mockResolvedValue(1);

      const resultado = await service.findAll(
        query({ FK_articulo: ID_ARTICULO }),
      );

      // La deduplicación la hace la base: `some` es un EXISTS, no un JOIN que
      // multiplique filas. Por eso el service no necesita `distinct` ni
      // filtrar en memoria, y la paginación cuenta movimientos, no líneas.
      const argumentos = argumentosDe(prisma.mOVIMIENTO.findMany)[0] as Record<
        string,
        unknown
      >;
      expect(argumentos.distinct).toBeUndefined();
      expect(resultado.data).toHaveLength(1);
      expect(resultado.meta).toEqual({ total: 1, page: 1, limit: 10 });
    });

    describe('rango de fechas', () => {
      const desde = new Date('2026-08-01T00:00:00.000Z');
      const hasta = new Date('2026-08-31T00:00:00.000Z');

      it('acepta solo fechaDesde', async () => {
        await service.findAll(query({ fechaDesde: desde }));

        expect(whereDelListado()).toEqual({
          fecha_movimiento: { gte: desde },
        });
      });

      it('acepta solo fechaHasta', async () => {
        await service.findAll(query({ fechaHasta: hasta }));

        expect(whereDelListado()).toEqual({
          fecha_movimiento: { lte: hasta },
        });
      });

      it('acepta las dos juntas', async () => {
        await service.findAll(query({ fechaDesde: desde, fechaHasta: hasta }));

        expect(whereDelListado()).toEqual({
          fecha_movimiento: { gte: desde, lte: hasta },
        });
      });

      it('no filtra por fecha si no se manda ninguna', async () => {
        await service.findAll(query());

        expect(whereDelListado()).toEqual({});
      });
    });
  });

  describe('findOne', () => {
    it('falla si el movimiento no existe', async () => {
      prisma.mOVIMIENTO.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
