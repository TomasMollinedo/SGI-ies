import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DeclaracionPagoService } from './declaracion-pago.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { FormaPagoService } from '../../tesoreria/forma-pago/forma-pago.service';
import { CobroService } from '../cobro/cobro.service';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoCuota, EstadoVenta } from '../../../../generated/prisma/enums';
import { CreateDeclaracionPagoDto } from './dto/create-declaracion-pago.dto';
import { RechazarDeclaracionPagoDto } from './dto/rechazar-declaracion-pago.dto';

describe('DeclaracionPagoService', () => {
  let service: DeclaracionPagoService;
  let prisma: {
    cLIENTE: { findUniqueOrThrow: jest.Mock };
    cUOTA: { findFirst: jest.Mock };
    dECLARACIONPAGO: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let tx: {
    dECLARACIONPAGO: {
      updateMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    cUOTA: { findUniqueOrThrow: jest.Mock };
    cOBRO: { create: jest.Mock };
  };
  let formaPagoService: { buscarActivaHabilitadaAutogestion: jest.Mock };
  let cobroService: { crearInterno: jest.Mock };

  const CLIENTE_ID = 1;
  const USUARIO_ID = 7;
  const ID_DECLARACION = 1;

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

  /** Declaración PENDIENTE tal como la devuelve Prisma (importe sin convertir). */
  const declaracionPendiente = (
    extra: Partial<Record<string, unknown>> = {},
  ) => ({
    id_declaracion_pago: ID_DECLARACION,
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
    ...extra,
  });

  const dtoRechazar: RechazarDeclaracionPagoDto = {
    motivo_rechazo: 'El comprobante no coincide con el extracto bancario',
  };

  const ID_COBRO = 999;

  beforeEach(async () => {
    tx = {
      dECLARACIONPAGO: {
        // count: 1 = el lock aplicó (nadie más la tocó mientras tanto).
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue(declaracionPendiente()),
        findUniqueOrThrow: jest.fn().mockResolvedValue(declaracionPendiente()),
        update: jest.fn().mockResolvedValue(
          declaracionPendiente({
            estado: 'VALIDADA',
            FK_cobro: ID_COBRO,
            FK_usuario_validador: USUARIO_ID,
            fecha_resolucion: new Date('2026-09-22T00:00:00.000Z'),
          }),
        ),
      },
      cUOTA: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id_cuota: cuotaBase.id_cuota,
          numero: 3,
          saldo_pendiente: new Prisma.Decimal(1000),
          FK_venta: 1,
        }),
      },
      cOBRO: { create: jest.fn().mockResolvedValue({ id_cobro: ID_COBRO }) },
    };

    prisma = {
      cLIENTE: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(clienteCompleto),
      },
      cUOTA: { findFirst: jest.fn().mockResolvedValue(cuotaBase) },
      dECLARACIONPAGO: {
        create: jest.fn().mockResolvedValue(declaracionPendiente()),
        findUnique: jest.fn().mockResolvedValue(declaracionPendiente()),
        update: jest.fn().mockResolvedValue(
          declaracionPendiente({
            estado: 'RECHAZADA',
            motivo_rechazo: dtoRechazar.motivo_rechazo,
            fecha_resolucion: new Date('2026-09-22T00:00:00.000Z'),
            FK_usuario_validador: USUARIO_ID,
          }),
        ),
      },
      $transaction: jest.fn((callback: (t: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    formaPagoService = {
      buscarActivaHabilitadaAutogestion: jest
        .fn()
        .mockResolvedValue(formaPagoHabilitada),
    };
    cobroService = {
      crearInterno: jest.fn().mockResolvedValue(ID_COBRO),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeclaracionPagoService,
        { provide: PrismaService, useValue: prisma },
        { provide: FormaPagoService, useValue: formaPagoService },
        { provide: CobroService, useValue: cobroService },
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

  it('flujo: declarar → rechazar → declarar de nuevo sobre la misma cuota no está bloqueado, y no pisa la declaración anterior', async () => {
    const primeraDeclaracionCreada = declaracionPendiente();
    const segundaDeclaracionCreada = declaracionPendiente({
      id_declaracion_pago: 2,
    });
    prisma.dECLARACIONPAGO.create
      .mockResolvedValueOnce(primeraDeclaracionCreada)
      .mockResolvedValueOnce(segundaDeclaracionCreada);

    const primera = await service.declarar(dtoBase, CLIENTE_ID);
    expect(primera.id_declaracion_pago).toBe(1);
    expect(primera.estado).toBe('PENDIENTE');

    // buscarDeclaracionPendiente relee vía findUnique, ya mockeado para
    // devolver la declaración PENDIENTE por defecto.
    await service.rechazar(1, dtoRechazar, USUARIO_ID);
    expect(prisma.dECLARACIONPAGO.update).toHaveBeenCalledTimes(1);

    // declarar() no consulta el historial de declaraciones previas de la
    // cuota, así que una RECHAZADA no bloquea volver a declarar: no tira
    // excepción, y crea una fila NUEVA (segundo `create`) en vez de
    // pisar/actualizar la anterior.
    const segunda = await service.declarar(dtoBase, CLIENTE_ID);
    expect(segunda.id_declaracion_pago).toBe(2);
    expect(segunda.estado).toBe('PENDIENTE');

    expect(prisma.dECLARACIONPAGO.create).toHaveBeenCalledTimes(2);
    // La primera declaración (ahora RECHAZADA) nunca se vuelve a tocar: el
    // único update de todo el flujo es el del rechazo.
    expect(prisma.dECLARACIONPAGO.update).toHaveBeenCalledTimes(1);
  });

  describe('rechazar', () => {
    it('caso feliz: persiste el motivo y pasa a RECHAZADA', async () => {
      const resultado = await service.rechazar(
        ID_DECLARACION,
        dtoRechazar,
        USUARIO_ID,
      );

      expect(prisma.dECLARACIONPAGO.update).toHaveBeenCalledWith({
        where: { id_declaracion_pago: ID_DECLARACION },
        data: {
          estado: 'RECHAZADA',
          motivo_rechazo: dtoRechazar.motivo_rechazo,
          fecha_resolucion: expect.any(Date) as Date,
          FK_usuario_validador: USUARIO_ID,
        },
      });
      expect(resultado.estado).toBe('RECHAZADA');
      expect(resultado.motivo_rechazo).toBe(dtoRechazar.motivo_rechazo);
    });

    it('rechaza con 409 si la declaración ya está VALIDADA', async () => {
      prisma.dECLARACIONPAGO.findUnique.mockResolvedValue(
        declaracionPendiente({ estado: 'VALIDADA' }),
      );

      await expect(
        service.rechazar(ID_DECLARACION, dtoRechazar, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.dECLARACIONPAGO.update).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si la declaración ya está RECHAZADA (no se rechaza dos veces)', async () => {
      prisma.dECLARACIONPAGO.findUnique.mockResolvedValue(
        declaracionPendiente({ estado: 'RECHAZADA' }),
      );

      await expect(
        service.rechazar(ID_DECLARACION, dtoRechazar, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.dECLARACIONPAGO.update).not.toHaveBeenCalled();
    });

    // El motivo vacío lo rechaza el ZodValidationPipe global contra
    // rechazarDeclaracionPagoSchema antes de llegar al service — se prueba
    // acá a nivel de schema, mismo criterio que el resto de los DTO del
    // proyecto (ver forma-pago.service.spec.ts, caso `requiere_referencia`).
    it('el schema rechaza un motivo_rechazo vacío', () => {
      const { rechazarDeclaracionPagoSchema } = jest.requireActual<
        typeof import('./dto/rechazar-declaracion-pago.dto')
      >('./dto/rechazar-declaracion-pago.dto');

      expect(() =>
        rechazarDeclaracionPagoSchema.parse({ motivo_rechazo: '' }),
      ).toThrow();
    });

    it('rechaza con 404 si la declaración no existe', async () => {
      prisma.dECLARACIONPAGO.findUnique.mockResolvedValue(null);

      await expect(
        service.rechazar(99, dtoRechazar, USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.dECLARACIONPAGO.update).not.toHaveBeenCalled();
    });
  });

  describe('validar', () => {
    it('caso feliz: genera el cobro con origen ECOMMERCE, dentro del mismo tx, y deja la declaración VALIDADA apuntando a él', async () => {
      const resultado = await service.validar(ID_DECLARACION, USUARIO_ID);

      expect(cobroService.crearInterno).toHaveBeenCalledWith(
        {
          FK_cliente: CLIENTE_ID,
          FK_forma_pago: formaPagoHabilitada.id_forma_pago,
          numero_referencia: 'REF-123',
          importe_total: 500,
          detalle: [{ FK_cuota: cuotaBase.id_cuota, importe_imputado: 500 }],
        },
        USUARIO_ID,
        'ECOMMERCE',
        tx, // mismo tx que abrió $transaction, no uno nuevo
        expect.any(Date),
        expect.any(Map),
      );
      expect(tx.dECLARACIONPAGO.update).toHaveBeenCalledWith({
        where: { id_declaracion_pago: ID_DECLARACION },
        data: {
          estado: 'VALIDADA',
          FK_cobro: ID_COBRO,
          FK_usuario_validador: USUARIO_ID,
          fecha_resolucion: expect.any(Date) as Date,
        },
      });
      expect(resultado.estado).toBe('VALIDADA');
      expect(resultado.FK_cobro).toBe(ID_COBRO);
    });

    it('segundo chequeo de saldo: si ya no alcanza (se pagó por otro lado entre declarar y validar), 409 y la declaración sigue PENDIENTE sin cobro', async () => {
      tx.cUOTA.findUniqueOrThrow.mockResolvedValue({
        id_cuota: cuotaBase.id_cuota,
        numero: 3,
        saldo_pendiente: new Prisma.Decimal(100), // ya no alcanza para los $500 declarados
        FK_venta: 1,
      });

      await expect(
        service.validar(ID_DECLARACION, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(cobroService.crearInterno).not.toHaveBeenCalled();
      expect(tx.dECLARACIONPAGO.update).not.toHaveBeenCalled();
    });

    it('doble validación concurrente: si al tomar el lock ya no está PENDIENTE, 409', async () => {
      tx.dECLARACIONPAGO.updateMany.mockResolvedValue({ count: 0 });
      tx.dECLARACIONPAGO.findUnique.mockResolvedValue(
        declaracionPendiente({ estado: 'VALIDADA' }),
      );

      await expect(
        service.validar(ID_DECLARACION, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(cobroService.crearInterno).not.toHaveBeenCalled();
    });

    it('rechaza con 409 si la declaración ya está RECHAZADA', async () => {
      tx.dECLARACIONPAGO.updateMany.mockResolvedValue({ count: 0 });
      tx.dECLARACIONPAGO.findUnique.mockResolvedValue(
        declaracionPendiente({ estado: 'RECHAZADA' }),
      );

      await expect(
        service.validar(ID_DECLARACION, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(cobroService.crearInterno).not.toHaveBeenCalled();
    });

    it('rechaza con 404 si la declaración no existe', async () => {
      tx.dECLARACIONPAGO.updateMany.mockResolvedValue({ count: 0 });
      tx.dECLARACIONPAGO.findUnique.mockResolvedValue(null);

      await expect(service.validar(99, USUARIO_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(cobroService.crearInterno).not.toHaveBeenCalled();
    });

    /**
     * Prueba de atomicidad: no se puede demostrar un rollback real sin una
     * base de datos real (eso lo prueba el e2e), pero sí se puede probar acá
     * la condición que hace que ese rollback exista — que `crearInterno`
     * escribe con el MISMO `tx` que después falla, dentro de la MISMA (y
     * única) llamada a `$transaction`. Si el escenario fuera dos
     * transacciones separadas, esta aserción fallaría (dos `tx` distintos, o
     * `$transaction` llamado dos veces), y ahí sí habría un cobro que
     * quedaría confirmado sin su declaración.
     */
    it('atomicidad: si el update final de la declaración falla después de que crearInterno ya escribió, todo ocurre dentro del mismo tx (para que el rollback deshaga también el cobro)', async () => {
      cobroService.crearInterno.mockImplementation(
        async (
          _dto: unknown,
          _usuarioId: number,
          _origen: unknown,
          txRecibido: typeof tx,
        ) => {
          // Simula lo que crearInterno realmente hace: escribe el COBRO
          // usando el `tx` que le pasaron, no uno propio.
          await txRecibido.cOBRO.create({ data: {} });
          return ID_COBRO;
        },
      );
      tx.dECLARACIONPAGO.update.mockRejectedValue(
        new Error('fallo simulado al persistir la declaración'),
      );

      await expect(service.validar(ID_DECLARACION, USUARIO_ID)).rejects.toThrow(
        'fallo simulado al persistir la declaración',
      );

      expect(tx.cOBRO.create).toHaveBeenCalled();
      // Una sola transacción abierta: el COBRO de crearInterno y el update
      // que falla comparten el mismo `tx`, así que el mismo rollback los
      // deshace a los dos.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
