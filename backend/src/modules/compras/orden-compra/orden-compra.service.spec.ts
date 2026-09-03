import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OrdenCompraService } from './orden-compra.service';
import { PrismaService } from '../../../prisma/prisma.service';

/** Primer argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = {
  data?: Record<string, unknown>;
  where?: Record<string, unknown>;
};

const primerArgumento = (mock: jest.Mock): ArgumentoPrisma =>
  (mock.mock.calls as ArgumentoPrisma[][])[0][0];

describe('OrdenCompraService', () => {
  let service: OrdenCompraService;
  let prisma: {
    pROVEEDOR: { findUnique: jest.Mock };
    dEPOSITO: { findUnique: jest.Mock };
    aRTICULO: { findMany: jest.Mock };
    oRDENCOMPRA: {
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  const USUARIO_ID = 7;
  const ID_PROVEEDOR = 1;
  const ID_DEPOSITO = 1;
  const ID_ORDEN = 100;

  const ordenBorradorMock = {
    id_orden_compra: ID_ORDEN,
    estado: 'BORRADOR',
    total: 200,
  };

  beforeEach(async () => {
    prisma = {
      pROVEEDOR: {
        findUnique: jest.fn().mockResolvedValue({ id_proveedor: ID_PROVEEDOR }),
      },
      dEPOSITO: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id_deposito: ID_DEPOSITO, estado: true }),
      },
      aRTICULO: { findMany: jest.fn() },
      oRDENCOMPRA: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdenCompraService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(OrdenCompraService);
  });

  describe('create', () => {
    const dto = {
      FK_proveedor: ID_PROVEEDOR,
      FK_deposito: ID_DEPOSITO,
      detalle: [
        { FK_articulo: 1, cantidad: 2, precio_unitario: 50 },
        { FK_articulo: 2, cantidad: 1, precio_unitario: 100 },
      ],
    };

    beforeEach(() => {
      prisma.aRTICULO.findMany.mockResolvedValue([
        { id_articulo: 1, estado: true },
        { id_articulo: 2, estado: true },
      ]);
      prisma.oRDENCOMPRA.create.mockResolvedValue({
        id_orden_compra: ID_ORDEN,
      });
      prisma.oRDENCOMPRA.findUnique.mockResolvedValue({
        ...ordenBorradorMock,
        total: 200,
      });
    });

    it('calcula el subtotal de cada línea y el total de la orden en el servidor', async () => {
      await service.create(dto, USUARIO_ID);

      const dataEnviada = primerArgumento(prisma.oRDENCOMPRA.create).data;
      expect(dataEnviada?.total).toBe(200); // (2*50) + (1*100)
      expect(dataEnviada?.detalles).toEqual({
        create: [
          { FK_articulo: 1, cantidad: 2, precio_unitario: 50, subtotal: 100 },
          { FK_articulo: 2, cantidad: 1, precio_unitario: 100, subtotal: 100 },
        ],
      });
    });

    it('redondea a 2 decimales para evitar el arrastre de coma flotante', async () => {
      await service.create(
        {
          ...dto,
          detalle: [{ FK_articulo: 1, cantidad: 3, precio_unitario: 33.33 }],
        },
        USUARIO_ID,
      );

      const dataEnviada = primerArgumento(prisma.oRDENCOMPRA.create).data;
      expect(dataEnviada?.total).toBe(99.99);
    });

    it('un "total" manipulado no puede llegar al servidor: el DTO nunca lo transporta', async () => {
      // El propio tipo de entrada no tiene `total` ni `subtotal` — este test
      // deja constancia explícita de la regla "Listo cuando" del ticket.
      await service.create(dto, USUARIO_ID);

      const dataEnviada = primerArgumento(prisma.oRDENCOMPRA.create).data;
      expect(dataEnviada?.total).toBe(200);
    });

    it('usa la fecha de hoy si no se manda fecha_emision', async () => {
      const antes = new Date();
      await service.create(dto, USUARIO_ID);
      const despues = new Date();

      const dataEnviada = primerArgumento(prisma.oRDENCOMPRA.create).data;
      const fecha = dataEnviada?.fecha_emision as Date;
      expect(fecha.getTime()).toBeGreaterThanOrEqual(antes.getTime());
      expect(fecha.getTime()).toBeLessThanOrEqual(despues.getTime());
    });

    it('rechaza una fecha de emisión futura', async () => {
      const mañana = new Date();
      mañana.setDate(mañana.getDate() + 1);

      await expect(
        service.create({ ...dto, fecha_emision: mañana }, USUARIO_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.oRDENCOMPRA.create).not.toHaveBeenCalled();
    });

    it('acepta una fecha de emisión de hoy o del pasado', async () => {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);

      await service.create({ ...dto, fecha_emision: ayer }, USUARIO_ID);

      const dataEnviada = primerArgumento(prisma.oRDENCOMPRA.create).data;
      expect(dataEnviada?.fecha_emision).toBe(ayer);
    });

    it('rechaza si el proveedor no existe', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, USUARIO_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.oRDENCOMPRA.create).not.toHaveBeenCalled();
    });

    it('rechaza si el depósito no existe', async () => {
      prisma.dEPOSITO.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, USUARIO_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.oRDENCOMPRA.create).not.toHaveBeenCalled();
    });

    it('rechaza si el depósito está dado de baja', async () => {
      prisma.dEPOSITO.findUnique.mockResolvedValue({
        id_deposito: ID_DEPOSITO,
        estado: false,
      });

      await expect(service.create(dto, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.oRDENCOMPRA.create).not.toHaveBeenCalled();
    });

    it('rechaza si algún artículo del detalle no existe', async () => {
      prisma.aRTICULO.findMany.mockResolvedValue([{ id_articulo: 1 }]); // falta el 2

      await expect(service.create(dto, USUARIO_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.oRDENCOMPRA.create).not.toHaveBeenCalled();
    });

    it('rechaza si algún artículo del detalle está dado de baja', async () => {
      prisma.aRTICULO.findMany.mockResolvedValue([
        { id_articulo: 1, estado: true },
        { id_articulo: 2, estado: false },
      ]);

      await expect(service.create(dto, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.oRDENCOMPRA.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('rechaza editar una orden que no está en BORRADOR', async () => {
      prisma.oRDENCOMPRA.findUnique.mockResolvedValue({
        ...ordenBorradorMock,
        estado: 'EMITIDA',
      });

      await expect(
        service.update(ID_ORDEN, { observaciones: 'nueva' }, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.oRDENCOMPRA.update).not.toHaveBeenCalled();
    });

    it('rechaza si la orden no existe', async () => {
      prisma.oRDENCOMPRA.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999, { observaciones: 'nueva' }, USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza actualizar con una fecha de emisión futura', async () => {
      prisma.oRDENCOMPRA.findUnique.mockResolvedValue(ordenBorradorMock);
      const mañana = new Date();
      mañana.setDate(mañana.getDate() + 1);

      await expect(
        service.update(ID_ORDEN, { fecha_emision: mañana }, USUARIO_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.oRDENCOMPRA.update).not.toHaveBeenCalled();
    });

    it('reemplaza el detalle completo y recalcula el total cuando se manda `detalle`', async () => {
      prisma.oRDENCOMPRA.findUnique.mockResolvedValue(ordenBorradorMock);
      prisma.aRTICULO.findMany.mockResolvedValue([
        { id_articulo: 3, estado: true },
      ]);
      prisma.oRDENCOMPRA.update.mockResolvedValue(ordenBorradorMock);

      await service.update(
        ID_ORDEN,
        { detalle: [{ FK_articulo: 3, cantidad: 4, precio_unitario: 10 }] },
        USUARIO_ID,
      );

      const dataEnviada = primerArgumento(prisma.oRDENCOMPRA.update).data;
      expect(dataEnviada?.total).toBe(40);
      expect(dataEnviada?.detalles).toEqual({
        deleteMany: {},
        create: [
          { FK_articulo: 3, cantidad: 4, precio_unitario: 10, subtotal: 40 },
        ],
      });
    });

    it('no toca el detalle ni el total si no vienen en el body', async () => {
      prisma.oRDENCOMPRA.findUnique.mockResolvedValue(ordenBorradorMock);
      prisma.oRDENCOMPRA.update.mockResolvedValue(ordenBorradorMock);

      await service.update(ID_ORDEN, { observaciones: 'nueva' }, USUARIO_ID);

      const dataEnviada = primerArgumento(prisma.oRDENCOMPRA.update).data;
      expect(dataEnviada).not.toHaveProperty('detalles');
      expect(dataEnviada).not.toHaveProperty('total');
      expect(prisma.aRTICULO.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si no existe', async () => {
      prisma.oRDENCOMPRA.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('validarPuedeConfirmarse', () => {
    // Todavía no hay un método `confirmar` que llame a esto — el test
    // prueba la regla aislada, lista para que la próxima tarea (máquina de
    // estados) la enganche.
    it('rechaza una orden sin ninguna línea de detalle', () => {
      expect(() => service.validarPuedeConfirmarse({ detalles: [] })).toThrow(
        ConflictException,
      );
    });

    it('no rechaza una orden con al menos una línea de detalle', () => {
      expect(() =>
        service.validarPuedeConfirmarse({ detalles: [{}] }),
      ).not.toThrow();
    });
  });
});
