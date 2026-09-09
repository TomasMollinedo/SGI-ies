import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ComprobanteService } from './comprobante.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
import { CreateComprobanteDto } from './dto/create-comprobante.dto';
import { updateComprobanteSchema } from './dto/update-comprobante.dto';

/** Primer argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = { data?: any; where?: any };
const primerArgumento = (mock: jest.Mock): ArgumentoPrisma =>
  (mock.mock.calls as ArgumentoPrisma[][])[0][0];

describe('ComprobanteService', () => {
  let service: ComprobanteService;
  let prisma: {
    pROVEEDOR: { findUnique: jest.Mock };
    tIPOCOMPROBANTE: { findUnique: jest.Mock };
    oRDENCOMPRA: { findUnique: jest.Mock };
    aRTICULO: { findMany: jest.Mock };
    cOMPROBANTEPROVEEDOR: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    dETALLECOMPROBANTE: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const USUARIO_ID = 7;

  const cabeceraBase = {
    FK_tipo_comprobante: 1,
    letra: 'A',
    punto_de_venta: 3,
    numero: 55,
    fecha_emision: new Date('2026-08-01'),
    fecha_vencimiento: new Date('2026-08-31'),
    FK_proveedor: 1,
    alicuota_iva: 21,
  };

  const dtoCrear = (
    detalle: CreateComprobanteDto['detalle'] = [
      { descripcion: 'Cemento', cantidad: 2, precio_unitario: 150.5 },
      { descripcion: 'Arena', cantidad: 3, precio_unitario: 99.99 },
    ],
  ): CreateComprobanteDto => ({ ...cabeceraBase, detalle });

  const comprobanteBorrador = (overrides: Record<string, unknown> = {}) => ({
    id_comprobante_proveedor: 10,
    estado: 'BORRADOR',
    letra: 'A',
    punto_de_venta: 3,
    numero: 55,
    fecha_emision: new Date('2026-08-01'),
    fecha_vencimiento: new Date('2026-08-31'),
    alicuota_iva: new Prisma.Decimal(21),
    FK_proveedor: 1,
    FK_tipo_comprobante: 1,
    FK_orden_compra: null,
    FK_comprobante_origen: null,
    detalles: [
      {
        id_detalle_comprobante: 1,
        descripcion: 'Cemento',
        FK_articulo: null,
        cantidad: new Prisma.Decimal(2),
        precio_unitario: new Prisma.Decimal(100),
        subtotal: new Prisma.Decimal(200),
      },
    ],
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      pROVEEDOR: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id_proveedor: 1, estado: true }),
      },
      tIPOCOMPROBANTE: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id_tipo_comprobante: 1, estado: true }),
      },
      oRDENCOMPRA: {
        findUnique: jest.fn().mockResolvedValue({ id_orden_compra: 1 }),
      },
      aRTICULO: { findMany: jest.fn().mockResolvedValue([]) },
      cOMPROBANTEPROVEEDOR: {
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id_comprobante_proveedor: 10, ...data }),
          ),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id_comprobante_proveedor: 10, ...data }),
          ),
      },
      dETALLECOMPROBANTE: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      (cb: (tx: typeof prisma) => unknown) => cb(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComprobanteService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ComprobanteService);
  });

  describe('create — totales calculados en el servidor', () => {
    it('calcula el subtotal de cada línea y los cuatro importes, y coinciden con el cálculo manual', async () => {
      // subtotales: 2 * 150.5 = 301.00 ; 3 * 99.99 = 299.97
      // neto  = 600.97
      // iva   = 600.97 * 21 / 100 = 126.2037 -> 126.20
      // total = 727.17
      await service.create(dtoCrear(), USUARIO_ID);

      const { data } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.create);
      const subtotales = data.detalles.create.map((l: any) =>
        l.subtotal.toFixed(2),
      );

      expect(subtotales).toEqual(['301.00', '299.97']);
      expect(data.importe_neto.toFixed(2)).toBe('600.97');
      expect(data.importe_iva.toFixed(2)).toBe('126.20');
      expect(data.importe_total.toFixed(2)).toBe('727.17');
    });

    it('redondea el subtotal a 2 decimales (medio hacia arriba)', async () => {
      // 1.5 * 3.33 = 4.995 -> 5.00
      await service.create(
        dtoCrear([
          { descripcion: 'Perfil', cantidad: 1.5, precio_unitario: 3.33 },
        ]),
        USUARIO_ID,
      );

      const { data } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.create);
      expect(data.detalles.create[0].subtotal.toFixed(2)).toBe('5.00');
    });

    it('no arrastra error de punto flotante (0.1 + 0.1 + 0.1 = 0.30)', async () => {
      await service.create(
        dtoCrear([
          { descripcion: 'a', cantidad: 1, precio_unitario: 0.1 },
          { descripcion: 'b', cantidad: 1, precio_unitario: 0.1 },
          { descripcion: 'c', cantidad: 1, precio_unitario: 0.1 },
        ]),
        USUARIO_ID,
      );

      const { data } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.create);
      expect(data.importe_neto.toFixed(2)).toBe('0.30');
    });

    it('recalcula siempre: ignora los importes/estado que vengan en el body', async () => {
      await service.create(
        {
          ...dtoCrear(),
          importe_total: 999999,
          estado: 'REGISTRADO',
        } as unknown as CreateComprobanteDto,
        USUARIO_ID,
      );

      const { data } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.create);
      expect(data.importe_total.toFixed(2)).toBe('727.17');
      expect(data.estado).toBe('BORRADOR');
    });

    it('acepta un detalle vacío: los cuatro importes en 0 (el mínimo de una línea es al confirmar)', async () => {
      await service.create(dtoCrear([]), USUARIO_ID);

      const { data } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.create);
      expect(data.detalles.create).toEqual([]);
      expect(data.importe_neto.toFixed(2)).toBe('0.00');
      expect(data.importe_iva.toFixed(2)).toBe('0.00');
      expect(data.importe_total.toFixed(2)).toBe('0.00');
    });
  });

  describe('create — cabecera', () => {
    it('nace en estado BORRADOR y sin saldo', async () => {
      await service.create(dtoCrear(), USUARIO_ID);

      const { data } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.create);
      expect(data.estado).toBe('BORRADOR');
      expect(data.saldo_pendiente).toBeUndefined();
      expect(data.saldo_cancelado).toBeUndefined();
    });

    it('completa la auditoría con el usuario autenticado, no con el body', async () => {
      await service.create(dtoCrear(), USUARIO_ID);

      const { data } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.create);
      expect(data.FK_usuario_creador).toBe(USUARIO_ID);
      expect(data.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('rechaza si el proveedor no existe', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(null);

      await expect(
        service.create(dtoCrear(), USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.cOMPROBANTEPROVEEDOR.create).not.toHaveBeenCalled();
    });

    it('rechaza si el tipo de comprobante no existe', async () => {
      prisma.tIPOCOMPROBANTE.findUnique.mockResolvedValue(null);

      await expect(
        service.create(dtoCrear(), USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza si un artículo del detalle no existe', async () => {
      prisma.aRTICULO.findMany.mockResolvedValue([
        { id_articulo: 5, estado: true },
      ]);

      await expect(
        service.create(
          dtoCrear([
            {
              descripcion: 'Con artículo',
              cantidad: 1,
              precio_unitario: 10,
              FK_articulo: 5,
            },
            {
              descripcion: 'Otro',
              cantidad: 1,
              precio_unitario: 10,
              FK_articulo: 99,
            },
          ]),
          USUARIO_ID,
        ),
      ).rejects.toThrow(/99/);
      expect(prisma.cOMPROBANTEPROVEEDOR.create).not.toHaveBeenCalled();
    });
  });

  describe('create — validaciones de cabecera (T73)', () => {
    it('rechaza una numeración ya usada por otro comprobante vigente del mismo proveedor y tipo', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findFirst.mockResolvedValue({
        id_comprobante_proveedor: 3,
      });

      await expect(
        service.create(dtoCrear(), USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.cOMPROBANTEPROVEEDOR.create).not.toHaveBeenCalled();
    });

    it('la búsqueda de numeración excluye los comprobantes ANULADOS', async () => {
      await service.create(dtoCrear(), USUARIO_ID);

      const { where } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.findFirst);
      expect(where.estado).toEqual({ not: 'ANULADO' });
    });

    it('rechaza una fecha de emisión futura', async () => {
      const futura = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await expect(
        service.create(
          { ...dtoCrear(), fecha_emision: futura, fecha_vencimiento: futura },
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza una fecha de vencimiento anterior a la de emisión', async () => {
      await expect(
        service.create(
          {
            ...dtoCrear(),
            fecha_emision: new Date('2026-08-10'),
            fecha_vencimiento: new Date('2026-08-01'),
          },
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un comprobante de origen de otro proveedor', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue({
        id_comprobante_proveedor: 99,
        FK_proveedor: 2,
      });

      await expect(
        service.create(
          { ...dtoCrear(), FK_comprobante_origen: 99 },
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.cOMPROBANTEPROVEEDOR.create).not.toHaveBeenCalled();
    });

    it('acepta un comprobante de origen del mismo proveedor', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue({
        id_comprobante_proveedor: 99,
        FK_proveedor: 1,
      });

      await expect(
        service.create(
          { ...dtoCrear(), FK_comprobante_origen: 99 },
          USUARIO_ID,
        ),
      ).resolves.toBeDefined();
    });

    it('acepta una nota de crédito/débito sin comprobante de origen', async () => {
      await expect(
        service.create(dtoCrear(), USUARIO_ID),
      ).resolves.toBeDefined();
    });

    it('rechaza si el proveedor está dado de baja', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue({
        id_proveedor: 1,
        estado: false,
      });

      await expect(
        service.create(dtoCrear(), USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza si el tipo de comprobante está dado de baja', async () => {
      prisma.tIPOCOMPROBANTE.findUnique.mockResolvedValue({
        id_tipo_comprobante: 1,
        estado: false,
      });

      await expect(
        service.create(dtoCrear(), USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza si un artículo del detalle está dado de baja', async () => {
      prisma.aRTICULO.findMany.mockResolvedValue([
        { id_articulo: 5, estado: false },
      ]);

      await expect(
        service.create(
          dtoCrear([
            {
              descripcion: 'Con artículo',
              cantidad: 1,
              precio_unitario: 10,
              FK_articulo: 5,
            },
          ]),
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('falla si el comprobante no existe', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(null);

      await expect(
        service.update(99, updateComprobanteSchema.parse({}), USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza editar un comprobante que no está en BORRADOR', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        comprobanteBorrador({ estado: 'REGISTRADO' }),
      );

      await expect(
        service.update(
          10,
          updateComprobanteSchema.parse({ numero: 56 }),
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('recalcula los importes cuando cambia el detalle', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        comprobanteBorrador(),
      );

      const dto = updateComprobanteSchema.parse({
        alicuota_iva: 21,
        detalle: [
          { descripcion: 'Cemento', cantidad: 2, precio_unitario: 150.5 },
          { descripcion: 'Arena', cantidad: 3, precio_unitario: 99.99 },
        ],
      });
      await service.update(10, dto, USUARIO_ID);

      expect(prisma.dETALLECOMPROBANTE.deleteMany).toHaveBeenCalledWith({
        where: { FK_comprobante_proveedor: 10 },
      });

      const { data } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.update);
      expect(data.importe_neto.toFixed(2)).toBe('600.97');
      expect(data.importe_iva.toFixed(2)).toBe('126.20');
      expect(data.importe_total.toFixed(2)).toBe('727.17');
      expect(data.detalles.create).toHaveLength(2);
      expect(data.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('si solo cambia la alícuota, mantiene el detalle y recalcula el IVA', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        comprobanteBorrador(),
      );

      await service.update(
        10,
        updateComprobanteSchema.parse({ alicuota_iva: 27 }),
        USUARIO_ID,
      );

      expect(prisma.dETALLECOMPROBANTE.deleteMany).not.toHaveBeenCalled();

      const { data } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.update);
      expect(data.detalles).toBeUndefined();
      expect(data.importe_neto.toFixed(2)).toBe('200.00');
      expect(data.importe_iva.toFixed(2)).toBe('54.00');
      expect(data.importe_total.toFixed(2)).toBe('254.00');
    });

    it('rechaza editar si la numeración resultante ya la usa otro comprobante vigente', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        comprobanteBorrador(),
      );
      prisma.cOMPROBANTEPROVEEDOR.findFirst.mockResolvedValue({
        id_comprobante_proveedor: 20,
      });

      await expect(
        service.update(
          10,
          updateComprobanteSchema.parse({ numero: 999 }),
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('al editar, excluye el propio comprobante de la búsqueda de numeración', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        comprobanteBorrador(),
      );

      await service.update(
        10,
        updateComprobanteSchema.parse({ observaciones: 'ajuste' }),
        USUARIO_ID,
      );

      const { where } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.findFirst);
      expect(where.id_comprobante_proveedor).toEqual({ not: 10 });
    });

    it('rechaza editar si la fecha de vencimiento efectiva queda antes de la de emisión', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        comprobanteBorrador(),
      );

      await expect(
        service.update(
          10,
          updateComprobanteSchema.parse({
            fecha_vencimiento: '2026-07-01',
          }),
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
