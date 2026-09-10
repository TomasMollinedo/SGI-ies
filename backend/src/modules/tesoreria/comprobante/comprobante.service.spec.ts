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
import { anularComprobanteSchema } from './dto/anular-comprobante.dto';
import { queryComprobanteSchema } from './dto/query-comprobante.dto';

/** Primer argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = { data?: any; where?: any; orderBy?: any };
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
      findMany: jest.Mock;
      count: jest.Mock;
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

  /** Fila cruda de COMPROBANTEPROVEEDOR, con todas sus relaciones de lectura. */
  const filaComprobante = (overrides: Record<string, unknown> = {}) => ({
    id_comprobante_proveedor: 10,
    letra: 'A',
    punto_de_venta: 3,
    numero: 55,
    fecha_emision: new Date('2026-08-01'),
    fecha_vencimiento: new Date('2026-08-31'),
    observaciones: null,
    alicuota_iva: new Prisma.Decimal(21),
    importe_neto: new Prisma.Decimal('200.00'),
    importe_iva: new Prisma.Decimal('42.00'),
    importe_total: new Prisma.Decimal('242.00'),
    saldo_pendiente: null,
    saldo_cancelado: null,
    estado: 'BORRADOR',
    motivo_anulacion: null,
    FK_proveedor: 1,
    FK_tipo_comprobante: 1,
    FK_orden_compra: null,
    FK_comprobante_origen: null,
    FK_usuario_creador: USUARIO_ID,
    FK_usuario_actualizador: USUARIO_ID,
    hora_creacion: new Date('2026-08-01T10:00:00.000Z'),
    hora_actualizacion: new Date('2026-08-01T10:00:00.000Z'),
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
    comprobante_origen: null,
    notas_aplicadas: [],
    detallesPago: [],
    usuarioCreador: { nombre: 'Ada', apellido: 'Lovelace' },
    usuarioActualizador: { nombre: 'Ada', apellido: 'Lovelace' },
    proveedor: { id_proveedor: 1, razon_social: 'Corralón San Martín S.A.' },
    tipoComprobante: { id_tipo_comprobante: 1, nombre: 'Factura' },
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
            Promise.resolve(filaComprobante({ ...data })),
          ),
        findUnique: jest.fn().mockResolvedValue(filaComprobante()),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve(filaComprobante({ ...data })),
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
      // neto  = 600.97 ; iva = 600.97 * 21 / 100 = 126.20 ; total = 727.17
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

    it('acepta un detalle vacío: los cuatro importes en 0', async () => {
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

    it('devuelve la respuesta ya mapeada: importes number y estado_saldo null', async () => {
      const res = await service.create(dtoCrear(), USUARIO_ID);

      expect(typeof res.importe_total).toBe('number');
      expect(res.estado).toBe('BORRADOR');
      expect(res.estado_saldo).toBeNull();
      expect(res.saldo_pendiente).toBeNull();
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
        filaComprobante({ estado: 'REGISTRADO' }),
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
        filaComprobante(),
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
        filaComprobante(),
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
        filaComprobante(),
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
        filaComprobante(),
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
        filaComprobante(),
      );

      await expect(
        service.update(
          10,
          updateComprobanteSchema.parse({
            fecha_vencimiento: new Date('2026-07-01'),
          }),
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('devuelve la respuesta mapeada (importes number)', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        filaComprobante(),
      );

      const res = await service.update(
        10,
        updateComprobanteSchema.parse({ observaciones: 'ajuste' }),
        USUARIO_ID,
      );

      expect(typeof res.importe_total).toBe('number');
      expect(res).not.toHaveProperty('detalle');
    });
  });

  describe('confirmar (T74)', () => {
    it('falla si el comprobante no existe', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(null);

      await expect(service.confirmar(99, USUARIO_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rechaza confirmar un comprobante que no está en BORRADOR', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        filaComprobante({ estado: 'REGISTRADO' }),
      );

      await expect(service.confirmar(10, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.cOMPROBANTEPROVEEDOR.update).not.toHaveBeenCalled();
    });

    it('rechaza confirmar un comprobante sin líneas de detalle', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        filaComprobante({ detalles: [] }),
      );

      await expect(service.confirmar(10, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.cOMPROBANTEPROVEEDOR.update).not.toHaveBeenCalled();
    });

    it('pasa a REGISTRADO e inicializa el saldo con el importe total y estado de saldo PENDIENTE', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        filaComprobante({ importe_total: new Prisma.Decimal('727.17') }),
      );

      const res = await service.confirmar(10, USUARIO_ID);

      const { data } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.update);
      expect(data.estado).toBe('REGISTRADO');
      expect(data.saldo_pendiente.toFixed(2)).toBe('727.17');
      expect(data.saldo_cancelado).toBe(false);
      expect(data.FK_usuario_actualizador).toBe(USUARIO_ID);
      expect(res.estado_saldo).toBe('PENDIENTE');
    });

    it('una nota (tipo que disminuye el saldo) también queda con saldo pendiente propio', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        filaComprobante({ importe_total: new Prisma.Decimal('100.00') }),
      );

      await service.confirmar(10, USUARIO_ID);

      const { data } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.update);
      expect(data.saldo_pendiente.toFixed(2)).toBe('100.00');
      expect(data.saldo_cancelado).toBe(false);
    });
  });

  describe('anular (T76)', () => {
    const dtoAnular = anularComprobanteSchema.parse({
      motivo_anulacion: 'Cargado con el número equivocado',
    });

    it('falla si el comprobante no existe', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(null);

      await expect(
        service.anular(99, dtoAnular, USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza anular un comprobante en BORRADOR', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        filaComprobante(),
      );

      await expect(
        service.anular(10, dtoAnular, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.cOMPROBANTEPROVEEDOR.update).not.toHaveBeenCalled();
    });

    it('rechaza anular un comprobante ya ANULADO', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        filaComprobante({ estado: 'ANULADO' }),
      );

      await expect(
        service.anular(10, dtoAnular, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza anular un comprobante con imputaciones de pago (saldo pendiente < importe total)', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        filaComprobante({
          estado: 'REGISTRADO',
          importe_total: new Prisma.Decimal('1000.00'),
          saldo_pendiente: new Prisma.Decimal('400.00'),
          saldo_cancelado: false,
        }),
      );

      await expect(
        service.anular(10, dtoAnular, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.cOMPROBANTEPROVEEDOR.update).not.toHaveBeenCalled();
    });

    it('anula un REGISTRADO sin imputaciones: ANULADO, con motivo y sin saldo', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        filaComprobante({
          estado: 'REGISTRADO',
          importe_total: new Prisma.Decimal('1000.00'),
          saldo_pendiente: new Prisma.Decimal('1000.00'),
          saldo_cancelado: false,
        }),
      );

      const res = await service.anular(10, dtoAnular, USUARIO_ID);

      const { data } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.update);
      expect(data.estado).toBe('ANULADO');
      expect(data.motivo_anulacion).toBe(dtoAnular.motivo_anulacion);
      expect(data.saldo_pendiente).toBeNull();
      expect(data.saldo_cancelado).toBeNull();
      expect(data.FK_usuario_actualizador).toBe(USUARIO_ID);
      expect(res.estado_saldo).toBeNull();
    });
  });

  describe('findAll (T77)', () => {
    it('devuelve { data, meta } y mapea los importes a number', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findMany.mockResolvedValue([
        filaComprobante({
          estado: 'REGISTRADO',
          importe_total: new Prisma.Decimal('727.17'),
          saldo_pendiente: new Prisma.Decimal('727.17'),
          saldo_cancelado: false,
        }),
      ]);
      prisma.cOMPROBANTEPROVEEDOR.count.mockResolvedValue(1);

      const res = await service.findAll(queryComprobanteSchema.parse({}));

      expect(res.meta).toEqual({ total: 1, page: 1, limit: 10 });
      expect(res.data[0].importe_total).toBe(727.17);
      expect(typeof res.data[0].importe_total).toBe('number');
      expect(res.data[0].estado_saldo).toBe('PENDIENTE');
      expect(res.data[0]).not.toHaveProperty('detalle');
    });

    it('ordena del más reciente al más antiguo por fecha de emisión', async () => {
      await service.findAll(queryComprobanteSchema.parse({}));

      const { orderBy } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.findMany);
      expect(orderBy).toEqual([
        { fecha_emision: 'desc' },
        { id_comprobante_proveedor: 'desc' },
      ]);
    });

    it('traduce el filtro estado_saldo=SALDADO a saldo_cancelado=true', async () => {
      await service.findAll(
        queryComprobanteSchema.parse({ estado_saldo: 'SALDADO' }),
      );

      const { where } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.findMany);
      expect(where.saldo_cancelado).toBe(true);
    });

    it('traduce el filtro de efecto sobre el saldo a un filtro sobre el tipo', async () => {
      await service.findAll(
        queryComprobanteSchema.parse({ aumenta_saldo: 'true' }),
      );

      const { where } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.findMany);
      expect(where.tipoComprobante).toEqual({ aumenta_saldo: true });
    });

    it('arma el rango de fecha_emision con fechaDesde y fechaHasta', async () => {
      await service.findAll(
        queryComprobanteSchema.parse({
          fechaDesde: '2026-08-01',
          fechaHasta: '2026-08-31',
        }),
      );

      const { where } = primerArgumento(prisma.cOMPROBANTEPROVEEDOR.findMany);
      expect(where.fecha_emision).toEqual({
        gte: new Date('2026-08-01'),
        lte: new Date('2026-08-31'),
      });
    });
  });

  describe('findOne (T77)', () => {
    it('falla si el comprobante no existe', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('mapea la cabecera, el detalle y las relaciones a la forma del contrato', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        filaComprobante({
          estado: 'REGISTRADO',
          saldo_pendiente: new Prisma.Decimal('242.00'),
          saldo_cancelado: false,
        }),
      );

      const res = await service.findOne(10);

      expect(res.id_comprobante_proveedor).toBe(10);
      expect(res.estado_saldo).toBe('PENDIENTE');
      expect(res.detalle).toEqual([
        {
          id_detalle_comprobante: 1,
          descripcion: 'Cemento',
          FK_articulo: null,
          cantidad: 2,
          precio_unitario: 100,
          subtotal: 200,
        },
      ]);
      expect(res.comprobanteOrigen).toBeNull();
      expect(res.notasAplicadas).toEqual([]);
      expect(res.ordenesPago).toEqual([]);
      expect(res.usuarioCreador).toEqual({
        nombre: 'Ada',
        apellido: 'Lovelace',
      });
    });

    it('mapea el comprobante de origen y las notas que lo referencian como list items', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        filaComprobante({
          comprobante_origen: filaComprobante({ id_comprobante_proveedor: 5 }),
          notas_aplicadas: [filaComprobante({ id_comprobante_proveedor: 7 })],
        }),
      );

      const res = await service.findOne(10);

      expect(res.comprobanteOrigen?.id_comprobante_proveedor).toBe(5);
      expect(res.notasAplicadas.map((n) => n.id_comprobante_proveedor)).toEqual(
        [7],
      );
      expect(res.comprobanteOrigen).not.toHaveProperty('detalle');
    });

    it('mapea las órdenes de pago que imputaron el comprobante', async () => {
      prisma.cOMPROBANTEPROVEEDOR.findUnique.mockResolvedValue(
        filaComprobante({
          detallesOrdenPago: [
            {
              importe_imputado: new Prisma.Decimal('150.00'),
              ordenPago: {
                id_orden_pago: 3,
                fecha_pago: new Date('2026-09-01T00:00:00.000Z'),
              },
            },
          ],
        }),
      );

      const res = await service.findOne(10);

      expect(res.ordenesPago).toEqual([
        {
          id_orden_pago: 3,
          fecha_pago: '2026-09-01T00:00:00.000Z',
          importe_imputado: 150,
        },
      ]);
    });
  });
});
