import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProveedorService } from './proveedor.service';
import { PrismaService } from '../../../prisma/prisma.service';

/** Primer argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = {
  data?: Record<string, unknown>;
  where?: Record<string, unknown>;
};

const primerArgumento = (mock: jest.Mock): ArgumentoPrisma =>
  (mock.mock.calls as ArgumentoPrisma[][])[0][0];

describe('ProveedorService', () => {
  let service: ProveedorService;
  let prisma: {
    pROVEEDOR: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };

  const USUARIO_ID = 7;
  const CUIT_VALIDO = '30500010912';

  const proveedorMock = {
    id_proveedor: 1,
    razon_social: 'Acme SA',
    cuit: CUIT_VALIDO,
    condicion_iva: 'RESPONSABLE_INSCRIPTO',
    domicilio: null,
    telefono: null,
    correo: null,
    observaciones: null,
    estado: true,
  };

  beforeEach(async () => {
    prisma = {
      pROVEEDOR: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProveedorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ProveedorService);
  });

  describe('create', () => {
    const dto = {
      razon_social: 'Acme SA',
      cuit: CUIT_VALIDO,
      condicion_iva: 'RESPONSABLE_INSCRIPTO' as const,
    };

    it('rechaza un CUIT ya usado por un proveedor activo', async () => {
      prisma.pROVEEDOR.findFirst.mockResolvedValue(proveedorMock);

      await expect(service.create(dto, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.pROVEEDOR.create).not.toHaveBeenCalled();
    });

    it('rechaza un CUIT ya usado por un proveedor dado de baja (no solo activos)', async () => {
      prisma.pROVEEDOR.findFirst.mockResolvedValue({
        ...proveedorMock,
        estado: false,
      });

      await expect(service.create(dto, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.pROVEEDOR.create).not.toHaveBeenCalled();
    });

    it('rechaza una razón social ya usada por otro proveedor activo', async () => {
      // El CUIT no choca (primera consulta), la razón social sí (segunda).
      prisma.pROVEEDOR.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(proveedorMock);

      await expect(service.create(dto, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.pROVEEDOR.create).not.toHaveBeenCalled();
    });

    it('completa la auditoría con el usuario autenticado', async () => {
      prisma.pROVEEDOR.create.mockResolvedValue(proveedorMock);

      await service.create(dto, USUARIO_ID);

      expect(prisma.pROVEEDOR.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          FK_usuario_creador: USUARIO_ID,
          FK_usuario_actualizador: USUARIO_ID,
        },
      });
    });
  });

  describe('findAll', () => {
    it('sin filtro de estado, lista solo proveedores activos', async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([]);
      prisma.pROVEEDOR.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 });

      expect(primerArgumento(prisma.pROVEEDOR.findMany).where).toEqual({
        estado: true,
      });
    });

    it('con estado=false, lista solo los dados de baja', async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([]);
      prisma.pROVEEDOR.count.mockResolvedValue(0);

      await service.findAll({ estado: false, page: 1, limit: 10 });

      expect(primerArgumento(prisma.pROVEEDOR.findMany).where).toEqual({
        estado: false,
      });
    });

    it("con estado='todos', lista activos e inactivos (para poder reactivar)", async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([]);
      prisma.pROVEEDOR.count.mockResolvedValue(0);

      await service.findAll({ estado: 'todos', page: 1, limit: 10 });

      expect(primerArgumento(prisma.pROVEEDOR.findMany).where).toEqual({});
    });

    it('busqueda con una sola palabra filtra por coincidencia parcial de razón social o CUIT', async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([]);
      prisma.pROVEEDOR.count.mockResolvedValue(0);

      await service.findAll({ busqueda: '3050', page: 1, limit: 10 });

      expect(primerArgumento(prisma.pROVEEDOR.findMany).where).toEqual({
        estado: true,
        OR: [
          {
            AND: [{ razon_social: { contains: '3050', mode: 'insensitive' } }],
          },
          { cuit: { contains: '3050' } },
        ],
      });
    });

    it('busqueda con varias palabras exige las dos en la razón social, sin importar el orden', async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([]);
      prisma.pROVEEDOR.count.mockResolvedValue(0);

      await service.findAll({
        busqueda: 'farmacia bermejo',
        page: 1,
        limit: 10,
      });

      expect(primerArgumento(prisma.pROVEEDOR.findMany).where).toEqual({
        estado: true,
        OR: [
          {
            AND: [
              { razon_social: { contains: 'farmacia', mode: 'insensitive' } },
              { razon_social: { contains: 'bermejo', mode: 'insensitive' } },
            ],
          },
          { cuit: { contains: 'farmacia bermejo' } },
        ],
      });
    });
  });

  describe('update', () => {
    it('falla si el proveedor no existe', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(null);

      await expect(
        service.update(99, { telefono: '1122334455' }, USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('no revalida CUIT ni razón social si no vienen en el body', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(proveedorMock);
      prisma.pROVEEDOR.update.mockResolvedValue(proveedorMock);

      await service.update(1, { telefono: '1122334455' }, USUARIO_ID);

      expect(prisma.pROVEEDOR.findFirst).not.toHaveBeenCalled();
      expect(prisma.pROVEEDOR.update).toHaveBeenCalled();
    });
  });

  describe('puedeDarseDeBaja', () => {
    it('devuelve true (la regla real se completa en T51)', async () => {
      await expect(service.puedeDarseDeBaja(1)).resolves.toBe(true);
    });
  });

  describe('baja', () => {
    it('da de baja un proveedor activo', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(proveedorMock);
      prisma.pROVEEDOR.update.mockResolvedValue({
        ...proveedorMock,
        estado: false,
      });

      await service.baja(1, USUARIO_ID);

      const dataEnviada = primerArgumento(prisma.pROVEEDOR.update).data;
      expect(dataEnviada?.estado).toBe(false);
      expect(dataEnviada?.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('rechaza si el proveedor ya está dado de baja', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue({
        ...proveedorMock,
        estado: false,
      });

      await expect(service.baja(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.pROVEEDOR.update).not.toHaveBeenCalled();
    });
  });

  describe('activar', () => {
    it('reactiva un proveedor dado de baja', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue({
        ...proveedorMock,
        estado: false,
      });
      prisma.pROVEEDOR.update.mockResolvedValue(proveedorMock);

      await service.activar(1, USUARIO_ID);

      const dataEnviada = primerArgumento(prisma.pROVEEDOR.update).data;
      expect(dataEnviada?.estado).toBe(true);
      expect(dataEnviada?.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('rechaza si el proveedor ya está activo', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(proveedorMock);

      await expect(service.activar(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.pROVEEDOR.update).not.toHaveBeenCalled();
    });

    it('revalida la razón social: si otro activo la tomó mientras estaba de baja, rechaza', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue({
        ...proveedorMock,
        estado: false,
      });
      prisma.pROVEEDOR.findFirst.mockResolvedValue({
        ...proveedorMock,
        id_proveedor: 2,
      });

      await expect(service.activar(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.pROVEEDOR.update).not.toHaveBeenCalled();
    });
  });
});
