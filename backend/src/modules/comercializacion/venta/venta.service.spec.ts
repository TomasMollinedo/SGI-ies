import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { VentaService } from './venta.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PublicacionService } from '../publicacion/publicacion.service';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoComercial } from '../../../../generated/prisma/enums';
import type { CancelarVentaDto } from './dto/cancelar-venta.dto';

/**
 * Spec acotado a `cancelar()`: no había ningún test unitario de VentaService
 * en esta rama todavía (ver `git log --all -- venta.service.spec.ts` — solo
 * existe en una rama sin mergear, y ni ahí cubre `cancelar()`). Igual que ese
 * precedente, este archivo no pretende ser un spec completo de
 * VentaService/crear() — esa cobertura más amplia queda pendiente aparte.
 */
describe('VentaService', () => {
  let service: VentaService;
  let prisma: {
    vENTA: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    vENTA: { findUnique: jest.Mock; update: jest.Mock };
    dETALLECOBRO: { findFirst: jest.Mock };
    dECLARACIONPAGO: { findFirst: jest.Mock };
    cUOTA: { updateMany: jest.Mock };
  };
  let publicaciones: { transicionarEstadoComercial: jest.Mock };

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

  /** Shape que espera `obtenerDetalle` (lo que se lee tras el commit de la transacción). */
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
    usuarioCreador: { nombre: 'Ana', apellido: 'Gómez' },
    cuotas: [],
  };

  beforeEach(async () => {
    tx = {
      vENTA: {
        findUnique: jest.fn().mockResolvedValue(ventaVigente),
        update: jest.fn().mockResolvedValue({}),
      },
      // Sin cobro CONFIRMADO ni declaración PENDIENTE por defecto: camino feliz.
      dETALLECOBRO: { findFirst: jest.fn().mockResolvedValue(null) },
      dECLARACIONPAGO: { findFirst: jest.fn().mockResolvedValue(null) },
      cUOTA: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };

    prisma = {
      vENTA: { findUnique: jest.fn().mockResolvedValue(ventaDetalleCompleta) },
      $transaction: jest.fn((callback: (t: typeof tx) => unknown) =>
        callback(tx),
      ),
    };

    publicaciones = {
      transicionarEstadoComercial: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VentaService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicacionService, useValue: publicaciones },
      ],
    }).compile();

    service = module.get(VentaService);
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

    // Chequeo ya existente (no lo toca esta tarea): sigue funcionando igual.
    it('rechaza con 409 si hay un cobro CONFIRMADO sobre alguna cuota de la venta', async () => {
      tx.dETALLECOBRO.findFirst.mockResolvedValue({ id_detalle_cobro: 1 });

      await expect(
        service.cancelar(ID_VENTA, dto, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.dECLARACIONPAGO.findFirst).not.toHaveBeenCalled();
      expect(tx.vENTA.update).not.toHaveBeenCalled();
    });

    // Chequeo nuevo (HU-29): mismo criterio que el de DETALLECOBRO de arriba.
    it('rechaza con 409 si hay una DECLARACIONPAGO en estado PENDIENTE sobre alguna cuota de la venta', async () => {
      tx.dECLARACIONPAGO.findFirst.mockResolvedValue({
        id_declaracion_pago: 1,
      });

      await expect(
        service.cancelar(ID_VENTA, dto, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.dECLARACIONPAGO.findFirst).toHaveBeenCalledWith({
        where: {
          cuota: { FK_venta: ID_VENTA },
          estado: 'PENDIENTE',
        },
      });
      expect(tx.vENTA.update).not.toHaveBeenCalled();
    });

    // Sin falso positivo: declaraciones ya resueltas (VALIDADA/RECHAZADA) no
    // bloquean la cancelación — el filtro de `dECLARACIONPAGO.findFirst` ya
    // exige `estado: 'PENDIENTE'`, así que alcanza con que el mock por
    // default (sin ninguna PENDIENTE) devuelva null, como en el resto de los
    // tests de este describe.
    it('caso feliz: sin cobro confirmado ni declaración pendiente, cancela, anula las cuotas y libera la publicación', async () => {
      const resultado = await service.cancelar(ID_VENTA, dto, USUARIO_ID);

      expect(tx.vENTA.update).toHaveBeenCalledWith({
        where: { id_venta: ID_VENTA },
        data: {
          estado: 'CANCELADA',
          motivo_cancelacion: dto.motivo_cancelacion,
          fecha_cancelacion: expect.any(Date) as Date,
        },
      });
      expect(tx.cUOTA.updateMany).toHaveBeenCalledWith({
        where: { FK_venta: ID_VENTA },
        data: { estado: 'ANULADA' },
      });
      expect(publicaciones.transicionarEstadoComercial).toHaveBeenCalledWith(
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
