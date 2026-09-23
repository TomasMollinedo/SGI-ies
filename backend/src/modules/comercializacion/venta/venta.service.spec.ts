import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { VentaService } from './venta.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PublicacionService } from '../publicacion/publicacion.service';

import { Prisma } from '../../../../generated/prisma/client';
import { EstadoComercial } from '../../../../generated/prisma/enums';

import type { CreateVentaDto } from './dto/create-venta.dto';
import type { CancelarVentaDto } from './dto/cancelar-venta.dto';

/**
 * Spec parcial de VentaService.
 *
 * Actualmente cubre:
 * - validación de teléfono en buscarOCrearCliente()
 * - cancelación de ventas mediante cancelar()
 *
 * No pretende cubrir de forma completa VentaService/crear().
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

  let prisma: {
    vENTA: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  let tx: {
    vENTA: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    dETALLECOBRO: {
      findFirst: jest.Mock;
    };
    dECLARACIONPAGO: {
      findFirst: jest.Mock;
    };
    cUOTA: {
      updateMany: jest.Mock;
    };
    cLIENTE: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  let publicaciones: {
    transicionarEstadoComercial: jest.Mock;
  };

  const ID_VENTA = 1;
  const USUARIO_ID = 7;

  const dto: CancelarVentaDto = {
    motivo_cancelacion: 'El cliente desistió de la compra',
  };

  const ventaVigente = {
    id_venta: ID_VENTA,
    estado: 'VIGENTE',
    FK_publicacion: 10,
  };

  const ventaDetalleCompleta = {
    id_venta: ID_VENTA,
    fecha_adhesion: new Date('2026-08-01T00:00:00Z'),
    precio_congelado: new Prisma.Decimal(100000),
    anticipo_congelado: new Prisma.Decimal(20000),
    tipo_plan_congelado: 'FINANCIADO',
    cantidad_cuotas_congelada: 10,
    periodicidad_congelada: 'MENSUAL',
    estado: 'CANCELADA',
    motivo_cancelacion: dto.motivo_cancelacion,
    fecha_cancelacion: new Date('2026-09-22T00:00:00Z'),
    FK_publicacion: 10,
    FK_plan_pago: 5,
    cliente: {
      id_cliente: 1,
      nombre: 'Valentina',
      apellido: 'Fernández',
      dni_cuil: '20111111112',
      email: 'valen@test.com',
      telefono: '1122223333',
    },
    usuarioCreador: {
      nombre: 'Ana',
      apellido: 'Gómez',
    },
    cuotas: [],
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
      vENTA: {
        findUnique: jest.fn().mockResolvedValue(ventaVigente),
        update: jest.fn().mockResolvedValue({}),
      },

      dETALLECOBRO: {
        findFirst: jest.fn().mockResolvedValue(null),
      },

      dECLARACIONPAGO: {
        findFirst: jest.fn().mockResolvedValue(null),
      },

      cUOTA: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },

      cLIENTE: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id_cliente: 1 }),
      },
    };

    prisma = {
      vENTA: {
        findUnique: jest.fn().mockResolvedValue(ventaDetalleCompleta),
      },

      $transaction: jest.fn(
        (callback: (transaction: typeof tx) => unknown) =>
          callback(tx),
      ),
    };

    publicaciones = {
      transicionarEstadoComercial: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VentaService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: PublicacionService,
          useValue: publicaciones,
        },
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

  describe('cancelar', () => {
    it('tira 404 si la venta no existe', async () => {
      tx.vENTA.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelar(99, dto, USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(tx.vENTA.update).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si la venta ya está cancelada', async () => {
      tx.vENTA.findUnique.mockResolvedValue({
        ...ventaVigente,
        estado: 'CANCELADA',
      });

      await expect(
        service.cancelar(ID_VENTA, dto, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(tx.vENTA.update).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si hay un cobro CONFIRMADO sobre alguna cuota de la venta', async () => {
      tx.dETALLECOBRO.findFirst.mockResolvedValue({
        id_detalle_cobro: 1,
      });

      await expect(
        service.cancelar(ID_VENTA, dto, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(tx.dECLARACIONPAGO.findFirst).not.toHaveBeenCalled();
      expect(tx.vENTA.update).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si hay una DECLARACIONPAGO en estado PENDIENTE sobre alguna cuota de la venta', async () => {
      tx.dECLARACIONPAGO.findFirst.mockResolvedValue({
        id_declaracion_pago: 1,
      });

      await expect(
        service.cancelar(ID_VENTA, dto, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(tx.dECLARACIONPAGO.findFirst).toHaveBeenCalledWith({
        where: {
          cuota: {
            FK_venta: ID_VENTA,
          },
          estado: 'PENDIENTE',
        },
      });

      expect(tx.vENTA.update).not.toHaveBeenCalled();
    });

    it('caso feliz: sin cobro confirmado ni declaración pendiente, cancela, anula las cuotas y libera la publicación', async () => {
      const resultado = await service.cancelar(
        ID_VENTA,
        dto,
        USUARIO_ID,
      );

      expect(tx.vENTA.update).toHaveBeenCalledWith({
        where: {
          id_venta: ID_VENTA,
        },
        data: {
          estado: 'CANCELADA',
          motivo_cancelacion: dto.motivo_cancelacion,
          fecha_cancelacion: expect.any(Date) as Date,
        },
      });

      expect(tx.cUOTA.updateMany).toHaveBeenCalledWith({
        where: {
          FK_venta: ID_VENTA,
        },
        data: {
          estado: 'ANULADA',
        },
      });

      expect(
        publicaciones.transicionarEstadoComercial,
      ).toHaveBeenCalledWith(
        tx,
        ventaVigente.FK_publicacion,
        EstadoComercial.EN_PLAN_DE_PAGO,
        EstadoComercial.DISPONIBLE,
        USUARIO_ID,
      );

      expect(resultado.estado).toBe('CANCELADA');
    });
  });
});