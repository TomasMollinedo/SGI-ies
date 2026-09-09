import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OrdenCompraService } from './orden-compra.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EstadoOrdenCompra } from '../../../../generated/prisma/enums';
import { CambiarEstadoOrdenCompraDto } from './dto/cambiar-estado-orden-compra.dto';

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
      findMany: jest.Mock;
      count: jest.Mock;
    };
    oRDENCOMPRAHISTORIALESTADO: { create: jest.Mock };
    $transaction: jest.Mock;
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
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      oRDENCOMPRAHISTORIALESTADO: { create: jest.fn() },
      // Simula la transacción ejecutando el callback con `prisma` mismo
      // como `tx` — alcanza para probar qué se manda a `oRDENCOMPRA.update`
      // sin necesitar una base de datos real.
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(prisma),
      ),
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

  describe('findAll', () => {
    it('arma el where con todos los filtros combinados y pagina correctamente', async () => {
      const fechaDesde = new Date('2026-01-01');
      const fechaHasta = new Date('2026-01-31');

      await service.findAll({
        FK_proveedor: ID_PROVEEDOR,
        estado: EstadoOrdenCompra.EMITIDA,
        FK_deposito: ID_DEPOSITO,
        fechaDesde,
        fechaHasta,
        page: 2,
        limit: 5,
      });

      const argumentoFindMany = primerArgumento(prisma.oRDENCOMPRA.findMany);
      expect(argumentoFindMany.where).toEqual({
        FK_proveedor: ID_PROVEEDOR,
        estado: EstadoOrdenCompra.EMITIDA,
        FK_deposito: ID_DEPOSITO,
        fecha_emision: { gte: fechaDesde, lte: fechaHasta },
      });
      expect(argumentoFindMany).toMatchObject({ skip: 5, take: 5 });
      expect(primerArgumento(prisma.oRDENCOMPRA.count).where).toEqual(
        argumentoFindMany.where,
      );
    });

    it('no agrega al where los filtros que no vinieron', async () => {
      await service.findAll({ page: 1, limit: 10 });

      expect(primerArgumento(prisma.oRDENCOMPRA.findMany).where).toEqual({});
    });

    it('devuelve data y meta con el total de count', async () => {
      prisma.oRDENCOMPRA.findMany.mockResolvedValue([
        { id_orden_compra: ID_ORDEN },
      ]);
      prisma.oRDENCOMPRA.count.mockResolvedValue(1);

      const resultado = await service.findAll({ page: 1, limit: 10 });

      expect(resultado).toEqual({
        data: [{ id_orden_compra: ID_ORDEN }],
        meta: { total: 1, page: 1, limit: 10 },
      });
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

  describe('cambiarEstado', () => {
    const ordenConDetalle = {
      ...ordenBorradorMock,
      detalles: [{ id_detalle_orden_compra: 1 }],
    };

    const ordenEnEstado = (estado: EstadoOrdenCompra) => ({
      ...ordenConDetalle,
      estado,
    });

    const dtoCambiarEstado = (
      estado: EstadoOrdenCompra,
      extra: Partial<CambiarEstadoOrdenCompraDto> = {},
    ): CambiarEstadoOrdenCompraDto => ({ estado, ...extra });

    it.each([
      [EstadoOrdenCompra.BORRADOR, EstadoOrdenCompra.EMITIDA],
      [EstadoOrdenCompra.EMITIDA, EstadoOrdenCompra.RECIBIDA_PARCIAL],
      [EstadoOrdenCompra.EMITIDA, EstadoOrdenCompra.RECIBIDA],
      [EstadoOrdenCompra.EMITIDA, EstadoOrdenCompra.CANCELADA],
      [EstadoOrdenCompra.RECIBIDA_PARCIAL, EstadoOrdenCompra.RECIBIDA],
      [EstadoOrdenCompra.RECIBIDA_PARCIAL, EstadoOrdenCompra.CANCELADA],
    ])('permite pasar de %s a %s', async (estadoActual, estadoNuevo) => {
      prisma.oRDENCOMPRA.findUnique.mockResolvedValue(
        ordenEnEstado(estadoActual),
      );

      await service.cambiarEstado(
        ID_ORDEN,
        dtoCambiarEstado(estadoNuevo, {
          motivo_cancelacion:
            estadoNuevo === EstadoOrdenCompra.CANCELADA
              ? 'Proveedor sin stock'
              : undefined,
        }),
        USUARIO_ID,
      );

      const dataEnviada = primerArgumento(prisma.oRDENCOMPRA.update).data;
      expect(dataEnviada?.estado).toBe(estadoNuevo);
    });

    it.each([
      [EstadoOrdenCompra.RECIBIDA, EstadoOrdenCompra.EMITIDA],
      [EstadoOrdenCompra.CANCELADA, EstadoOrdenCompra.EMITIDA],
      [EstadoOrdenCompra.EMITIDA, EstadoOrdenCompra.BORRADOR],
      [EstadoOrdenCompra.RECIBIDA_PARCIAL, EstadoOrdenCompra.EMITIDA],
    ])(
      'rechaza pasar de %s a %s por no estar en el mapa de transiciones',
      async (estadoActual, estadoNuevo) => {
        prisma.oRDENCOMPRA.findUnique.mockResolvedValue(
          ordenEnEstado(estadoActual),
        );

        await expect(
          service.cambiarEstado(
            ID_ORDEN,
            dtoCambiarEstado(estadoNuevo),
            USUARIO_ID,
          ),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(prisma.oRDENCOMPRA.update).not.toHaveBeenCalled();
      },
    );

    it('exige al menos una línea de detalle para pasar a EMITIDA', async () => {
      prisma.oRDENCOMPRA.findUnique.mockResolvedValue({
        ...ordenBorradorMock,
        detalles: [],
      });

      await expect(
        service.cambiarEstado(
          ID_ORDEN,
          dtoCambiarEstado(EstadoOrdenCompra.EMITIDA),
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.oRDENCOMPRA.update).not.toHaveBeenCalled();
    });

    it('exige motivo_cancelacion para pasar a CANCELADA', async () => {
      prisma.oRDENCOMPRA.findUnique.mockResolvedValue(
        ordenEnEstado(EstadoOrdenCompra.EMITIDA),
      );

      await expect(
        service.cambiarEstado(
          ID_ORDEN,
          dtoCambiarEstado(EstadoOrdenCompra.CANCELADA),
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.oRDENCOMPRA.update).not.toHaveBeenCalled();
    });

    it('rechaza si la orden no existe', async () => {
      prisma.oRDENCOMPRA.findUnique.mockResolvedValue(null);

      await expect(
        service.cambiarEstado(
          999,
          dtoCambiarEstado(EstadoOrdenCompra.EMITIDA),
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('registra el cambio en ORDENCOMPRAHISTORIALESTADO', async () => {
      prisma.oRDENCOMPRA.findUnique.mockResolvedValue(
        ordenEnEstado(EstadoOrdenCompra.BORRADOR),
      );

      await service.cambiarEstado(
        ID_ORDEN,
        dtoCambiarEstado(EstadoOrdenCompra.EMITIDA, {
          observacion: 'Emitida a proveedor',
        }),
        USUARIO_ID,
      );

      const historialEnviado = primerArgumento(
        prisma.oRDENCOMPRAHISTORIALESTADO.create,
      ).data;
      expect(historialEnviado).toMatchObject({
        FK_orden_compra: ID_ORDEN,
        estado_anterior: EstadoOrdenCompra.BORRADOR,
        estado_nuevo: EstadoOrdenCompra.EMITIDA,
        observacion: 'Emitida a proveedor',
        FK_usuario: USUARIO_ID,
      });
    });
  });
});
