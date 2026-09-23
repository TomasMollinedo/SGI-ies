import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { VentaService } from './venta.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PublicacionService } from '../publicacion/publicacion.service';
import type { CreateVentaDto } from './dto/create-venta.dto';

/**
 * Spec acotado: cubre `buscarOCrearCliente` (validación de teléfono y
 * completar dni_cuil/teléfono faltantes) y `buscarClientes` (búsqueda por
 * texto libre). No es un spec completo de VentaService — `crear()`,
 * `cancelar()` y `listar()` no tienen cobertura acá todavía.
 */
type VentaServicePrivado = {
  buscarOCrearCliente(
    tx: unknown,
    datos: CreateVentaDto['cliente'],
  ): Promise<unknown>;
};

const privado = (service: VentaService) =>
  service as unknown as VentaServicePrivado;

describe('VentaService', () => {
  let service: VentaService;
  let tx: {
    cLIENTE: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  };
  let prisma: {
    cLIENTE: { findMany: jest.Mock; count: jest.Mock };
  };

  const clienteValido: CreateVentaDto['cliente'] = {
    nombre: 'Juan',
    apellido: 'Pérez',
    dni_cuil: '20123456789',
    email: 'juan@test.com',
    telefono: '1122223333',
  };

  beforeEach(async () => {
    tx = {
      cLIENTE: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id_cliente: 1 }),
        update: jest.fn().mockResolvedValue({ id_cliente: 1 }),
      },
    };
    prisma = {
      cLIENTE: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VentaService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicacionService, useValue: {} },
      ],
    }).compile();

    service = module.get(VentaService);
  });

  describe('buscarOCrearCliente — validación de teléfono', () => {
    it('crea el cliente si el teléfono tiene solo dígitos', async () => {
      await privado(service).buscarOCrearCliente(tx, clienteValido);

      expect(tx.cLIENTE.create).toHaveBeenCalledWith({
        data: {
          nombre: clienteValido.nombre,
          apellido: clienteValido.apellido,
          dni_cuil: clienteValido.dni_cuil,
          email: clienteValido.email,
          telefono: clienteValido.telefono,
        },
        select: expect.any(Object) as unknown,
      });
    });

    it('lanza BadRequestException si el teléfono tiene caracteres que no son dígitos, sin tocar la base', async () => {
      await expect(
        privado(service).buscarOCrearCliente(tx, {
          ...clienteValido,
          telefono: '11-2222-3333',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(tx.cLIENTE.findFirst).not.toHaveBeenCalled();
      expect(tx.cLIENTE.create).not.toHaveBeenCalled();
    });
  });

  describe('buscarOCrearCliente — completar dni_cuil/teléfono faltantes de un cliente existente', () => {
    it('completa dni_cuil y teléfono si el cliente encontrado no tenía ninguno de los dos (se registró solo por Google, HU-23)', async () => {
      tx.cLIENTE.findFirst.mockResolvedValue({
        id_cliente: 7,
        dni_cuil: null,
        telefono: null,
      });

      await privado(service).buscarOCrearCliente(tx, clienteValido);

      expect(tx.cLIENTE.update).toHaveBeenCalledWith({
        where: { id_cliente: 7 },
        data: {
          dni_cuil: clienteValido.dni_cuil,
          telefono: clienteValido.telefono,
        },
        select: expect.any(Object) as unknown,
      });
      expect(tx.cLIENTE.create).not.toHaveBeenCalled();
    });

    it('completa solo el campo que falta, sin pisar el que ya tenía', async () => {
      tx.cLIENTE.findFirst.mockResolvedValue({
        id_cliente: 7,
        dni_cuil: '99999999999',
        telefono: null,
      });

      await privado(service).buscarOCrearCliente(tx, clienteValido);

      expect(tx.cLIENTE.update).toHaveBeenCalledWith({
        where: { id_cliente: 7 },
        data: { telefono: clienteValido.telefono },
        select: expect.any(Object) as unknown,
      });
    });

    it('no llama a update si el cliente encontrado ya tenía dni_cuil y teléfono', async () => {
      tx.cLIENTE.findFirst.mockResolvedValue({
        id_cliente: 7,
        dni_cuil: '99999999999',
        telefono: '1122223333',
      });

      const resultado = await privado(service).buscarOCrearCliente(
        tx,
        clienteValido,
      );

      expect(tx.cLIENTE.update).not.toHaveBeenCalled();
      expect(resultado).toEqual({
        id_cliente: 7,
        dni_cuil: '99999999999',
        telefono: '1122223333',
      });
    });
  });

  describe('buscarClientes', () => {
    it('exige cada palabra en al menos uno de nombre/apellido/dni_cuil/email (AND de palabras, OR de campos)', async () => {
      await service.buscarClientes({
        busqueda: 'Juan Perez',
        page: 1,
        limit: 10,
      });

      expect(prisma.cLIENTE.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              {
                OR: [
                  { nombre: { contains: 'Juan', mode: 'insensitive' } },
                  { apellido: { contains: 'Juan', mode: 'insensitive' } },
                  { dni_cuil: { contains: 'Juan', mode: 'insensitive' } },
                  { email: { contains: 'Juan', mode: 'insensitive' } },
                ],
              },
              {
                OR: [
                  { nombre: { contains: 'Perez', mode: 'insensitive' } },
                  { apellido: { contains: 'Perez', mode: 'insensitive' } },
                  { dni_cuil: { contains: 'Perez', mode: 'insensitive' } },
                  { email: { contains: 'Perez', mode: 'insensitive' } },
                ],
              },
            ],
          },
        }) as unknown,
      );
    });

    it('pagina con skip/take según page/limit, y devuelve data + meta', async () => {
      prisma.cLIENTE.findMany.mockResolvedValue([{ id_cliente: 5 }]);
      prisma.cLIENTE.count.mockResolvedValue(23);

      const resultado = await service.buscarClientes({
        busqueda: 'juan',
        page: 3,
        limit: 10,
      });

      expect(prisma.cLIENTE.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }) as unknown,
      );
      expect(resultado).toEqual({
        data: [{ id_cliente: 5 }],
        meta: { total: 23, page: 3, limit: 10 },
      });
    });
  });
});
