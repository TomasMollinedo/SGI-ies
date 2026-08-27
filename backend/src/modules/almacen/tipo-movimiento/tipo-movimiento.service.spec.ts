import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TipoMovimientoService } from './tipo-movimiento.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { updateTipoMovimientoSchema } from './dto/update-tipo-movimiento.dto';

/** Primer argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = {
  data?: Record<string, unknown>;
  where?: Record<string, unknown>;
};

const primerArgumento = (mock: jest.Mock): ArgumentoPrisma =>
  (mock.mock.calls as ArgumentoPrisma[][])[0][0];

describe('TipoMovimientoService', () => {
  let service: TipoMovimientoService;
  let prisma: {
    tIPOMOVIMIENTO: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const USUARIO_ID = 7;

  const tipoMock = {
    id_tipo_movimiento: 1,
    nombre: 'Compra',
    descripcion: 'Ingreso por compra a proveedor',
    indicador_entrada: true,
    estado: true,
  };

  beforeEach(async () => {
    prisma = {
      tIPOMOVIMIENTO: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipoMovimientoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TipoMovimientoService);
  });

  describe('create', () => {
    it('rechaza un nombre ya usado por un tipo de movimiento activo', async () => {
      prisma.tIPOMOVIMIENTO.findFirst.mockResolvedValue(tipoMock);

      await expect(
        service.create(
          { nombre: 'Compra', indicador_entrada: true },
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.tIPOMOVIMIENTO.create).not.toHaveBeenCalled();
    });

    it('completa la auditoría con el usuario autenticado', async () => {
      prisma.tIPOMOVIMIENTO.create.mockResolvedValue(tipoMock);

      await service.create(
        { nombre: 'Compra', indicador_entrada: true },
        USUARIO_ID,
      );

      expect(prisma.tIPOMOVIMIENTO.create).toHaveBeenCalledWith({
        data: {
          nombre: 'Compra',
          indicador_entrada: true,
          FK_usuario_creador: USUARIO_ID,
          FK_usuario_actualizador: USUARIO_ID,
        },
      });
    });
  });

  describe('update', () => {
    it('no modifica indicador_entrada aunque venga en el body', async () => {
      prisma.tIPOMOVIMIENTO.findUnique.mockResolvedValue(tipoMock);
      prisma.tIPOMOVIMIENTO.update.mockResolvedValue(tipoMock);

      // El bloqueo vive en el schema de Zod: el ZodValidationPipe global
      // descarta la clave antes de que el DTO llegue al service.
      const dto = updateTipoMovimientoSchema.parse({
        nombre: 'Compra a proveedor',
        indicador_entrada: false,
      });
      expect(dto).not.toHaveProperty('indicador_entrada');

      await service.update(1, dto, USUARIO_ID);

      const dataEnviada = primerArgumento(prisma.tIPOMOVIMIENTO.update).data;
      expect(dataEnviada?.indicador_entrada).toBeUndefined();
      expect(dataEnviada?.nombre).toBe('Compra a proveedor');
      expect(dataEnviada?.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('falla si el tipo de movimiento no existe', async () => {
      prisma.tIPOMOVIMIENTO.findUnique.mockResolvedValue(null);

      await expect(
        service.update(99, { nombre: 'Ajuste' }, USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('baja', () => {
    it('da de baja aunque el tipo tenga movimientos registrados', async () => {
      prisma.tIPOMOVIMIENTO.findUnique.mockResolvedValue({
        ...tipoMock,
        movimientos: [{ id_movimiento: 1 }, { id_movimiento: 2 }],
      });
      prisma.tIPOMOVIMIENTO.update.mockResolvedValue({
        ...tipoMock,
        estado: false,
      });

      await service.baja(1, USUARIO_ID);

      const dataEnviada = primerArgumento(prisma.tIPOMOVIMIENTO.update).data;
      expect(dataEnviada?.estado).toBe(false);
    });

    it('rechaza si el tipo de movimiento ya está inactivo', async () => {
      prisma.tIPOMOVIMIENTO.findUnique.mockResolvedValue({
        ...tipoMock,
        estado: false,
      });

      await expect(service.baja(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.tIPOMOVIMIENTO.update).not.toHaveBeenCalled();
    });
  });

  describe('activar', () => {
    it('revalida el nombre único: si otro activo lo tomó, rechaza', async () => {
      prisma.tIPOMOVIMIENTO.findUnique.mockResolvedValue({
        ...tipoMock,
        estado: false,
      });
      prisma.tIPOMOVIMIENTO.findFirst.mockResolvedValue({
        ...tipoMock,
        id_tipo_movimiento: 2,
      });

      await expect(service.activar(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.tIPOMOVIMIENTO.update).not.toHaveBeenCalled();
    });

    it('rechaza si el tipo de movimiento ya está activo', async () => {
      prisma.tIPOMOVIMIENTO.findUnique.mockResolvedValue(tipoMock);

      await expect(service.activar(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('sin filtro de estado, lista activos e inactivos', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const count = jest.fn().mockResolvedValue(0);
      Object.assign(prisma.tIPOMOVIMIENTO, { findMany, count });

      await service.findAll({ page: 1, limit: 10 });

      expect(primerArgumento(findMany).where).toEqual({});
    });
  });
});
