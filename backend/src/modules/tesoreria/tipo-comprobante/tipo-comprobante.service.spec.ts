import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TipoComprobanteService } from './tipo-comprobante.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { updateTipoComprobanteSchema } from './dto/update-tipo-comprobante.dto';

/** Primer argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = {
  data?: Record<string, unknown>;
  where?: Record<string, unknown>;
};

const primerArgumento = (mock: jest.Mock): ArgumentoPrisma =>
  (mock.mock.calls as ArgumentoPrisma[][])[0][0];

describe('TipoComprobanteService', () => {
  let service: TipoComprobanteService;
  let prisma: {
    tIPOCOMPROBANTE: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const USUARIO_ID = 7;

  const tipoMock = {
    id_tipo_comprobante: 1,
    nombre: 'Factura',
    descripcion: 'Comprobante de compra',
    aumenta_saldo: true,
    requiere_comprobante_origen: false,
    estado: true,
  };

  beforeEach(async () => {
    prisma = {
      tIPOCOMPROBANTE: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipoComprobanteService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TipoComprobanteService);
  });

  describe('create', () => {
    it('rechaza un nombre ya usado por un tipo de comprobante activo', async () => {
      prisma.tIPOCOMPROBANTE.findFirst.mockResolvedValue(tipoMock);

      await expect(
        service.create(
          {
            nombre: 'Factura',
            aumenta_saldo: true,
            requiere_comprobante_origen: false,
          },
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.tIPOCOMPROBANTE.create).not.toHaveBeenCalled();
    });

    it('completa la auditoría con el usuario autenticado', async () => {
      prisma.tIPOCOMPROBANTE.create.mockResolvedValue(tipoMock);

      await service.create(
        {
          nombre: 'Factura',
          aumenta_saldo: true,
          requiere_comprobante_origen: false,
        },
        USUARIO_ID,
      );

      expect(prisma.tIPOCOMPROBANTE.create).toHaveBeenCalledWith({
        data: {
          nombre: 'Factura',
          aumenta_saldo: true,
          requiere_comprobante_origen: false,
          FK_usuario_creador: USUARIO_ID,
          FK_usuario_actualizador: USUARIO_ID,
        },
      });
    });
  });

  describe('update', () => {
    it('no modifica aumenta_saldo ni requiere_comprobante_origen aunque vengan en el body', async () => {
      prisma.tIPOCOMPROBANTE.findUnique.mockResolvedValue(tipoMock);
      prisma.tIPOCOMPROBANTE.update.mockResolvedValue(tipoMock);

      // El bloqueo vive en el schema de Zod: el ZodValidationPipe global
      // descarta las claves antes de que el DTO llegue al service.
      const dto = updateTipoComprobanteSchema.parse({
        nombre: 'Factura A',
        aumenta_saldo: false,
        requiere_comprobante_origen: true,
      });
      expect(dto).not.toHaveProperty('aumenta_saldo');
      expect(dto).not.toHaveProperty('requiere_comprobante_origen');

      await service.update(1, dto, USUARIO_ID);

      const dataEnviada = primerArgumento(prisma.tIPOCOMPROBANTE.update).data;
      expect(dataEnviada?.aumenta_saldo).toBeUndefined();
      expect(dataEnviada?.requiere_comprobante_origen).toBeUndefined();
      expect(dataEnviada?.nombre).toBe('Factura A');
      expect(dataEnviada?.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('falla si el tipo de comprobante no existe', async () => {
      prisma.tIPOCOMPROBANTE.findUnique.mockResolvedValue(null);

      await expect(
        service.update(99, { nombre: 'Ajuste' }, USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('baja', () => {
    it('rechaza si el tipo de comprobante ya está inactivo', async () => {
      prisma.tIPOCOMPROBANTE.findUnique.mockResolvedValue({
        ...tipoMock,
        estado: false,
      });

      await expect(service.baja(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.tIPOCOMPROBANTE.update).not.toHaveBeenCalled();
    });
  });

  describe('activar', () => {
    it('revalida el nombre único: si otro activo lo tomó, rechaza', async () => {
      prisma.tIPOCOMPROBANTE.findUnique.mockResolvedValue({
        ...tipoMock,
        estado: false,
      });
      prisma.tIPOCOMPROBANTE.findFirst.mockResolvedValue({
        ...tipoMock,
        id_tipo_comprobante: 2,
      });

      await expect(service.activar(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.tIPOCOMPROBANTE.update).not.toHaveBeenCalled();
    });

    it('rechaza si el tipo de comprobante ya está activo', async () => {
      prisma.tIPOCOMPROBANTE.findUnique.mockResolvedValue(tipoMock);

      await expect(service.activar(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('sin filtro de estado, lista activos e inactivos', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const count = jest.fn().mockResolvedValue(0);
      Object.assign(prisma.tIPOCOMPROBANTE, { findMany, count });

      await service.findAll({ page: 1, limit: 10 });

      expect(primerArgumento(findMany).where).toEqual({});
    });
  });
});
