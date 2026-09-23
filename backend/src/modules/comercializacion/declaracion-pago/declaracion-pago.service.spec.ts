import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DeclaracionPagoService } from './declaracion-pago.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { FormaPagoService } from '../../tesoreria/forma-pago/forma-pago.service';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoCuota, EstadoVenta } from '../../../../generated/prisma/enums';
import { CreateDeclaracionPagoDto } from './dto/create-declaracion-pago.dto';

describe('DeclaracionPagoService', () => {
  let service: DeclaracionPagoService;
  let prisma: {
    cLIENTE: { findUniqueOrThrow: jest.Mock };
    cUOTA: { findFirst: jest.Mock };
    dECLARACIONPAGO: { create: jest.Mock };
  };
  let formaPagoService: { buscarActivaHabilitadaAutogestion: jest.Mock };

  const CLIENTE_ID = 1;

  const clienteCompleto = {
    id_cliente: CLIENTE_ID,
    dni_cuil: '20123456789',
    telefono: '1122223333',
  };

  const cuotaBase = {
    id_cuota: 10,
    estado: EstadoCuota.PENDIENTE,
    saldo_pendiente: new Prisma.Decimal(1000),
    venta: { estado: EstadoVenta.VIGENTE },
  };

  const formaPagoHabilitada = {
    id_forma_pago: 5,
    nombre: 'Transferencia bancaria',
    requiere_referencia: true,
    estado: true,
    habilitada_autogestion: true,
  };

  const dtoBase: CreateDeclaracionPagoDto = {
    FK_cuota: cuotaBase.id_cuota,
    FK_forma_pago: formaPagoHabilitada.id_forma_pago,
    importe: 500,
    numero_referencia: 'REF-123',
  };

  beforeEach(async () => {
    prisma = {
      cLIENTE: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(clienteCompleto),
      },
      cUOTA: { findFirst: jest.fn().mockResolvedValue(cuotaBase) },
      dECLARACIONPAGO: {
        create: jest.fn().mockResolvedValue({
          id_declaracion_pago: 1,
          FK_cliente: CLIENTE_ID,
          FK_cuota: cuotaBase.id_cuota,
          FK_forma_pago: formaPagoHabilitada.id_forma_pago,
          importe: new Prisma.Decimal(500),
          numero_referencia: 'REF-123',
          estado: 'PENDIENTE',
          motivo_rechazo: null,
          fecha_resolucion: null,
          FK_usuario_validador: null,
          FK_cobro: null,
          hora_creacion: new Date('2026-09-22T00:00:00.000Z'),
        }),
      },
    };
    formaPagoService = {
      buscarActivaHabilitadaAutogestion: jest
        .fn()
        .mockResolvedValue(formaPagoHabilitada),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeclaracionPagoService,
        { provide: PrismaService, useValue: prisma },
        { provide: FormaPagoService, useValue: formaPagoService },
      ],
    }).compile();

    service = module.get(DeclaracionPagoService);
  });

  it('rechaza si el cliente no tiene dni_cuil/teléfono completos', async () => {
    prisma.cLIENTE.findUniqueOrThrow.mockResolvedValue({
      ...clienteCompleto,
      telefono: null,
    });

    await expect(service.declarar(dtoBase, CLIENTE_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.cUOTA.findFirst).not.toHaveBeenCalled();
    expect(prisma.dECLARACIONPAGO.create).not.toHaveBeenCalled();
  });

  it('rechaza con 404 si la cuota no existe o es de otro cliente (mismo error para los dos casos)', async () => {
    prisma.cUOTA.findFirst.mockResolvedValue(null);

    await expect(service.declarar(dtoBase, CLIENTE_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    // El filtro de pertenencia va en el propio WHERE de la consulta, no en
    // un chequeo aparte: así una cuota ajena da el mismo 404 que una
    // inexistente, sin confirmarle al cliente que la cuota de otro existe.
    expect(prisma.cUOTA.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id_cuota: dtoBase.FK_cuota,
          venta: { FK_cliente: CLIENTE_ID },
        },
      }),
    );
    expect(prisma.dECLARACIONPAGO.create).not.toHaveBeenCalled();
  });

  it('rechaza si la venta de la cuota está cancelada', async () => {
    prisma.cUOTA.findFirst.mockResolvedValue({
      ...cuotaBase,
      venta: { estado: EstadoVenta.CANCELADA },
    });

    await expect(service.declarar(dtoBase, CLIENTE_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.dECLARACIONPAGO.create).not.toHaveBeenCalled();
  });

  it('rechaza si la cuota ya está saldada (PAGADA)', async () => {
    prisma.cUOTA.findFirst.mockResolvedValue({
      ...cuotaBase,
      estado: EstadoCuota.PAGADA,
    });

    await expect(service.declarar(dtoBase, CLIENTE_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.dECLARACIONPAGO.create).not.toHaveBeenCalled();
  });

  it('rechaza si la cuota está anulada', async () => {
    prisma.cUOTA.findFirst.mockResolvedValue({
      ...cuotaBase,
      estado: EstadoCuota.ANULADA,
    });

    await expect(service.declarar(dtoBase, CLIENTE_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.dECLARACIONPAGO.create).not.toHaveBeenCalled();
  });

  it('rechaza si la forma de pago no está activa (la revalidación la delega en FormaPagoService)', async () => {
    formaPagoService.buscarActivaHabilitadaAutogestion.mockRejectedValue(
      new ConflictException(
        'La forma de pago "Cheque" no está disponible para autogestión',
      ),
    );

    await expect(service.declarar(dtoBase, CLIENTE_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(
      formaPagoService.buscarActivaHabilitadaAutogestion,
    ).toHaveBeenCalledWith(dtoBase.FK_forma_pago);
    expect(prisma.dECLARACIONPAGO.create).not.toHaveBeenCalled();
  });

  it('rechaza si la forma de pago no está habilitada para autogestión', async () => {
    formaPagoService.buscarActivaHabilitadaAutogestion.mockRejectedValue(
      new ConflictException(
        'La forma de pago "Efectivo" no está disponible para autogestión',
      ),
    );

    await expect(service.declarar(dtoBase, CLIENTE_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.dECLARACIONPAGO.create).not.toHaveBeenCalled();
  });

  it('rechaza si falta el número de referencia y la forma de pago lo exige', async () => {
    await expect(
      service.declarar(
        { ...dtoBase, numero_referencia: undefined },
        CLIENTE_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.dECLARACIONPAGO.create).not.toHaveBeenCalled();
  });

  it('rechaza si el importe declarado supera el saldo pendiente de la cuota', async () => {
    await expect(
      service.declarar({ ...dtoBase, importe: 1500 }, CLIENTE_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.dECLARACIONPAGO.create).not.toHaveBeenCalled();
  });

  it('caso feliz: declara sobre una cuota PENDIENTE y no toca CUOTA.saldo_pendiente', async () => {
    await service.declarar(dtoBase, CLIENTE_ID);

    expect(prisma.dECLARACIONPAGO.create).toHaveBeenCalledWith({
      data: {
        FK_cliente: CLIENTE_ID,
        FK_cuota: dtoBase.FK_cuota,
        FK_forma_pago: dtoBase.FK_forma_pago,
        importe: new Prisma.Decimal(dtoBase.importe),
        numero_referencia: dtoBase.numero_referencia,
      },
    });
    // Ningún método de CUOTA se invoca: la declaración nace sin efecto en
    // el saldo, eso ocurre recién si Tesorería la valida.
    expect(prisma.cUOTA.findFirst).toHaveBeenCalledTimes(1);
  });

  it('caso feliz: declara también sobre una cuota PARCIAL', async () => {
    prisma.cUOTA.findFirst.mockResolvedValue({
      ...cuotaBase,
      estado: EstadoCuota.PARCIAL,
      saldo_pendiente: new Prisma.Decimal(300),
    });

    await service.declarar({ ...dtoBase, importe: 300 }, CLIENTE_ID);

    expect(prisma.dECLARACIONPAGO.create).toHaveBeenCalledWith({
      data: {
        FK_cliente: CLIENTE_ID,
        FK_cuota: dtoBase.FK_cuota,
        FK_forma_pago: dtoBase.FK_forma_pago,
        importe: new Prisma.Decimal(300),
        numero_referencia: dtoBase.numero_referencia,
      },
    });
    expect(prisma.cUOTA.findFirst).toHaveBeenCalledTimes(1);
  });
});
