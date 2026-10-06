import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { VentaService } from './venta.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PublicacionService } from '../publicacion/publicacion.service';

import { Prisma } from '../../../../generated/prisma/client';
import {
  EstadoComercial,
  ModalidadPago,
} from '../../../../generated/prisma/enums';

import type { CreateVentaDto } from './dto/create-venta.dto';
import type { CancelarVentaDto } from './dto/cancelar-venta.dto';

/**
 * Spec parcial de VentaService.
 *
 * Actualmente cubre:
 * - validación de teléfono en buscarOCrearCliente()
 * - completar dni_cuil/teléfono faltantes de clientes existentes
 * - búsqueda y paginación de clientes mediante buscarClientes()
 * - cancelación de ventas mediante cancelar()
 * - doble escritura de crear(): PLANPAGO de la venta y desglose de cuotas (T121)
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
    cLIENTE: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    vENTA: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    dETALLECOBRO: {
      findMany: jest.Mock;
    };
    dECLARACIONPAGO: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  let tx: {
    vENTA: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    pUBLICACIONUNIDAD: {
      findUnique: jest.Mock;
    };
    pLANEJEMPLO: {
      findUnique: jest.Mock;
    };
    pLANPAGO: {
      create: jest.Mock;
    };
    dETALLECOBRO: {
      findFirst: jest.Mock;
    };
    dECLARACIONPAGO: {
      findFirst: jest.Mock;
    };
    cUOTA: {
      createMany: jest.Mock;
      updateMany: jest.Mock;
    };
    cLIENTE: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
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
    fecha_venta: new Date('2026-08-01T00:00:00Z'),
    periodicidad_congelada: 'MENSUAL',
    planPago: {
      modalidad: 'FINANCIADO',
      precio_venta: new Prisma.Decimal(100000),
      anticipo_monto: new Prisma.Decimal(20000),
      cantidad_cuotas: 10,
    },
    estado: 'CANCELADA',
    motivo_cancelacion: dto.motivo_cancelacion,
    fecha_cancelacion: new Date('2026-09-22T00:00:00Z'),
    FK_publicacion: 10,
    FK_plan_ejemplo: 5,
    cliente: {
      id_cliente: 1,
      nombre: 'Valentina',
      apellido: 'Fernández',
      dni_cuil: '20111111112',
      email: 'valen@test.com',
      telefono: '1122223333',
    },
    publicacion: {
      unidadFuncional: {
        id_unidad_funcional: 30,
        identificador: '4A',
        tipologia: 'DOS_DORMITORIOS',
        proyecto: { id_proyecto: 4, codigo: 'TDS', nombre: 'Torres del Sur' },
      },
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
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },

      pUBLICACIONUNIDAD: {
        findUnique: jest.fn(),
      },

      pLANEJEMPLO: {
        findUnique: jest.fn(),
      },

      pLANPAGO: {
        create: jest.fn().mockResolvedValue({ id_plan_pago: 50 }),
      },

      dETALLECOBRO: {
        findFirst: jest.fn().mockResolvedValue(null),
      },

      dECLARACIONPAGO: {
        findFirst: jest.fn().mockResolvedValue(null),
      },

      cUOTA: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },

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

      vENTA: {
        findUnique: jest.fn().mockResolvedValue(ventaDetalleCompleta),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },

      dETALLECOBRO: {
        findMany: jest.fn().mockResolvedValue([]),
      },

      dECLARACIONPAGO: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },

      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
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
        expect.objectContaining({
          skip: 20,
          take: 10,
        }) as unknown,
      );

      expect(resultado).toEqual({
        data: [{ id_cliente: 5 }],
        meta: {
          total: 23,
          page: 3,
          limit: 10,
        },
      });
    });
  });

  describe('crear — doble escritura del plan de pago (T121)', () => {
    const ID_PUBLICACION = 10;
    const ID_PLAN_EJEMPLO = 5;
    const FECHA_VENTA = new Date('2026-04-14T00:00:00.000Z');

    const dtoVenta: CreateVentaDto = {
      FK_publicacion: ID_PUBLICACION,
      FK_plan_pago: ID_PLAN_EJEMPLO,
      cliente: clienteValido,
    };

    /** El plan de ejemplo tal como lo lee `crear`. */
    const planEjemplo = (sobrescribe: Record<string, unknown> = {}) => ({
      id_plan_ejemplo: ID_PLAN_EJEMPLO,
      FK_publicacion: ID_PUBLICACION,
      estado: true,
      tipo: ModalidadPago.FINANCIADO,
      precio: new Prisma.Decimal('27000000.00'),
      anticipo_porcentaje: new Prisma.Decimal('20.00'),
      anticipo_monto: null,
      cantidad_cuotas: 6,
      periodicidad: 'MENSUAL',
      ...sobrescribe,
    });

    type DataPlanPago = {
      FK_venta: number;
      FK_plazo_financiacion: number | null;
      modalidad: string;
      precio_venta: Prisma.Decimal;
      anticipo_monto: Prisma.Decimal;
      cantidad_cuotas: number | null;
      tasa_nominal_anual: Prisma.Decimal | null;
      valor_cuota: Prisma.Decimal | null;
      FK_usuario_creador: number;
    };
    type DataCuota = {
      FK_venta: number;
      FK_plan_pago: number;
      numero: number;
      importe: Prisma.Decimal;
      importe_capital: Prisma.Decimal;
      importe_interes: Prisma.Decimal;
      saldo_capital: Prisma.Decimal;
      saldo_pendiente: Prisma.Decimal;
      estado: string;
    };

    const dataPlanPago = () =>
      (tx.pLANPAGO.create.mock.calls as { data: DataPlanPago }[][])[0][0].data;
    const dataCuotas = () =>
      (tx.cUOTA.createMany.mock.calls as { data: DataCuota[] }[][])[0][0].data;
    const dataVenta = () =>
      (
        tx.vENTA.create.mock.calls as { data: Record<string, unknown> }[][]
      )[0][0].data;

    beforeEach(() => {
      tx.pUBLICACIONUNIDAD.findUnique.mockResolvedValue({
        id_publicacion: ID_PUBLICACION,
        vigente: true,
        estado_comercial: EstadoComercial.DISPONIBLE,
      });
      tx.pLANEJEMPLO.findUnique.mockResolvedValue(planEjemplo());
      tx.vENTA.create.mockResolvedValue({
        id_venta: ID_VENTA,
        fecha_venta: FECHA_VENTA,
      });
    });

    it('FINANCIADO: crea el PLANPAGO con TNA 0 y las cuotas con las dos FK y el desglose', async () => {
      await service.crear(dtoVenta, USUARIO_ID);

      // Las columnas legado de VENTA se siguen escribiendo, más el actualizador.
      expect(dataVenta()).toEqual(
        expect.objectContaining({
          FK_plan_ejemplo: ID_PLAN_EJEMPLO,
          tipo_plan_congelado: ModalidadPago.FINANCIADO,
          cantidad_cuotas_congelada: 6,
          periodicidad_congelada: 'MENSUAL',
          FK_usuario_creador: USUARIO_ID,
          FK_usuario_actualizador: USUARIO_ID,
        }),
      );

      const plan = dataPlanPago();
      expect(plan.FK_venta).toBe(ID_VENTA);
      expect(plan.FK_plazo_financiacion).toBeNull();
      expect(plan.modalidad).toBe(ModalidadPago.FINANCIADO);
      expect(plan.precio_venta.toFixed(2)).toBe('27000000.00');
      expect(plan.anticipo_monto.toFixed(2)).toBe('5400000.00');
      expect(plan.cantidad_cuotas).toBe(6);
      expect(plan.tasa_nominal_anual?.toFixed(2)).toBe('0.00');
      expect(plan.valor_cuota?.toFixed(2)).toBe('3600000.00');
      expect(plan.FK_usuario_creador).toBe(USUARIO_ID);

      const cuotas = dataCuotas();
      expect(cuotas).toHaveLength(7); // la 0 (anticipo) + 6 cuotas
      for (const cuota of cuotas) {
        expect(cuota.FK_venta).toBe(ID_VENTA);
        expect(cuota.FK_plan_pago).toBe(50);
        expect(cuota.importe_capital.equals(cuota.importe)).toBe(true);
        expect(cuota.importe_interes.toFixed(2)).toBe('0.00');
        expect(cuota.saldo_pendiente.equals(cuota.importe)).toBe(true);
        expect(cuota.estado).toBe('PENDIENTE');
      }
      expect(cuotas.map((cuota) => cuota.saldo_capital.toFixed(2))).toEqual([
        '21600000.00',
        '18000000.00',
        '14400000.00',
        '10800000.00',
        '7200000.00',
        '3600000.00',
        '0.00',
      ]);

      // El plan se crea antes que las cuotas: necesitan su id.
      expect(tx.pLANPAGO.create.mock.invocationCallOrder[0]).toBeLessThan(
        tx.cUOTA.createMany.mock.invocationCallOrder[0],
      );
    });

    it('CONTADO: el anticipo del PLANPAGO es el precio y no lleva cuotas, tasa ni valor de cuota', async () => {
      tx.pLANEJEMPLO.findUnique.mockResolvedValue(
        planEjemplo({
          tipo: ModalidadPago.CONTADO,
          precio: new Prisma.Decimal('19000000.00'),
          anticipo_porcentaje: new Prisma.Decimal('100.00'),
          cantidad_cuotas: null,
          periodicidad: null,
        }),
      );

      await service.crear(dtoVenta, USUARIO_ID);

      const plan = dataPlanPago();
      expect(plan.modalidad).toBe(ModalidadPago.CONTADO);
      expect(plan.precio_venta.toFixed(2)).toBe('19000000.00');
      expect(plan.anticipo_monto.toFixed(2)).toBe('19000000.00');
      expect(plan.cantidad_cuotas).toBeNull();
      expect(plan.tasa_nominal_anual).toBeNull();
      expect(plan.valor_cuota).toBeNull();
      expect(plan.FK_plazo_financiacion).toBeNull();

      // La columna legado conserva el 1 que guardaba el Sprint 3 en contado.
      expect(dataVenta().cantidad_cuotas_congelada).toBe(1);

      const cuotas = dataCuotas();
      expect(cuotas).toHaveLength(1);
      expect(cuotas[0].numero).toBe(0);
      expect(cuotas[0].importe_capital.toFixed(2)).toBe('19000000.00');
      expect(cuotas[0].importe_interes.toFixed(2)).toBe('0.00');
      expect(cuotas[0].saldo_capital.toFixed(2)).toBe('0.00');
    });

    it('rechaza con 409 si el plan de ejemplo no tiene precio, sin crear nada', async () => {
      tx.pLANEJEMPLO.findUnique.mockResolvedValue(
        planEjemplo({ precio: null }),
      );

      await expect(service.crear(dtoVenta, USUARIO_ID)).rejects.toThrow(
        new ConflictException('El plan de ejemplo no tiene precio definido'),
      );

      expect(tx.vENTA.create).not.toHaveBeenCalled();
      expect(tx.pLANPAGO.create).not.toHaveBeenCalled();
      expect(tx.cUOTA.createMany).not.toHaveBeenCalled();
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
      const resultado = await service.cancelar(ID_VENTA, dto, USUARIO_ID);

      expect(tx.vENTA.update).toHaveBeenCalledWith({
        where: {
          id_venta: ID_VENTA,
        },
        data: {
          estado: 'CANCELADA',
          motivo_cancelacion: dto.motivo_cancelacion,
          fecha_cancelacion: expect.any(Date) as Date,
          FK_usuario_actualizador: USUARIO_ID,
          hora_actualizacion: expect.any(Date) as Date,
        },
      });

      expect(tx.cUOTA.updateMany).toHaveBeenCalledWith({
        where: {
          FK_venta: ID_VENTA,
        },
        data: {
          estado: 'ANULADA',
          hora_actualizacion: expect.any(Date) as Date,
        },
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

  describe('misVentas', () => {
    const proyectoBase = {
      id_proyecto: 4,
      nombre: 'Torres del Sur',
      localidad: 'Salta',
      estado_obra: 'EN_EJECUCION',
      fecha_fin_estimada: new Date('2027-01-01T00:00:00Z'),
    };

    const ventaBase = {
      id_venta: 20,
      estado: 'VIGENTE',
      fecha_venta: new Date('2026-01-10T00:00:00Z'),
      publicacion: {
        unidadFuncional: {
          id_unidad_funcional: 30,
          identificador: '4A',
          tipologia: 'DOS_DORMITORIOS',
          proyecto: proyectoBase,
        },
      },
      cuotas: [] as {
        saldo_pendiente: Prisma.Decimal;
        fecha_vencimiento: Date;
      }[],
    };

    it('devuelve data: [] si el cliente no tiene ventas vigentes', async () => {
      prisma.vENTA.findMany.mockResolvedValue([]);

      const resultado = await service.misVentas(1);

      expect(prisma.vENTA.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { FK_cliente: 1, estado: 'VIGENTE' },
        }) as unknown,
      );
      expect(resultado).toEqual({ data: [] });
    });

    it('calcula saldo_total_pendiente como la suma de saldo_pendiente de las cuotas', async () => {
      prisma.vENTA.findMany.mockResolvedValue([
        {
          ...ventaBase,
          cuotas: [
            {
              saldo_pendiente: new Prisma.Decimal(1000),
              fecha_vencimiento: new Date('2099-01-01'),
            },
            {
              saldo_pendiente: new Prisma.Decimal(500),
              fecha_vencimiento: new Date('2099-01-01'),
            },
          ],
        },
      ]);

      const resultado = await service.misVentas(1);

      expect(resultado.data[0].saldo_total_pendiente).toBe(1500);
    });

    it('marca tiene_cuotas_vencidas si alguna cuota con saldo tiene fecha de vencimiento pasada', async () => {
      prisma.vENTA.findMany.mockResolvedValue([
        {
          ...ventaBase,
          cuotas: [
            {
              saldo_pendiente: new Prisma.Decimal(1000),
              fecha_vencimiento: new Date('2020-01-01'),
            },
          ],
        },
      ]);

      const resultado = await service.misVentas(1);

      expect(resultado.data[0].tiene_cuotas_vencidas).toBe(true);
    });

    it('no marca tiene_cuotas_vencidas si la cuota vencida ya está saldada (saldo_pendiente = 0)', async () => {
      prisma.vENTA.findMany.mockResolvedValue([
        {
          ...ventaBase,
          cuotas: [
            {
              saldo_pendiente: new Prisma.Decimal(0),
              fecha_vencimiento: new Date('2020-01-01'),
            },
          ],
        },
      ]);

      const resultado = await service.misVentas(1);

      expect(resultado.data[0].tiene_cuotas_vencidas).toBe(false);
    });

    it('mapea unidad, proyecto y condición de entrega de la unidad', async () => {
      prisma.vENTA.findMany.mockResolvedValue([ventaBase]);

      const resultado = await service.misVentas(1);

      expect(resultado.data[0].unidad).toEqual({
        id_unidad_funcional: 30,
        identificador: '4A',
        tipologia: 'DOS_DORMITORIOS',
      });
      expect(resultado.data[0].proyecto).toEqual({
        id_proyecto: 4,
        nombre: 'Torres del Sur',
        localidad: 'Salta',
      });
      // proyecto EN_EJECUCION con fecha_fin_estimada → A_ENTREGAR_CON_FECHA
      // (ver calcularCondicionEntrega).
      expect(resultado.data[0].condicion_entrega.codigo).toBe(
        'A_ENTREGAR_CON_FECHA',
      );
    });
  });

  describe('detalleVentaCliente', () => {
    const proyectoBase = {
      id_proyecto: 4,
      nombre: 'Torres del Sur',
      localidad: 'Salta',
      estado_obra: 'EN_EJECUCION',
      fecha_fin_estimada: new Date('2027-01-01T00:00:00Z'),
    };

    /** Una cuota como la lee el detalle, con su desglose. Por defecto, toda capital. */
    const cuota = (parcial: {
      id_cuota?: number;
      numero: number;
      importe: number;
      importe_interes?: number;
      fecha_vencimiento?: Date;
      saldo_pendiente: number;
      estado: string;
    }) => {
      const interes = parcial.importe_interes ?? 0;
      return {
        id_cuota: parcial.id_cuota ?? parcial.numero + 100,
        numero: parcial.numero,
        importe_capital: new Prisma.Decimal(parcial.importe - interes),
        importe_interes: new Prisma.Decimal(interes),
        importe: new Prisma.Decimal(parcial.importe),
        fecha_vencimiento: parcial.fecha_vencimiento ?? new Date('2099-01-01'),
        saldo_pendiente: new Prisma.Decimal(parcial.saldo_pendiente),
        estado: parcial.estado,
      };
    };

    const ventaDetalleBase = {
      id_venta: 20,
      estado: 'VIGENTE',
      fecha_venta: new Date('2026-01-10T00:00:00Z'),
      planPago: {
        modalidad: 'FINANCIADO',
        precio_venta: new Prisma.Decimal(120000),
        anticipo_monto: new Prisma.Decimal(20000),
        cantidad_cuotas: 10,
        tasa_nominal_anual: new Prisma.Decimal(24),
        valor_cuota: new Prisma.Decimal('11132.65'),
      } as Record<string, unknown> | null,
      publicacion: {
        unidadFuncional: {
          id_unidad_funcional: 30,
          identificador: '4A',
          tipologia: 'DOS_DORMITORIOS',
          superficie_cubierta: new Prisma.Decimal(55),
          superficie_descubierta: null,
          piso: '4',
          comodidades: null,
          observaciones: null,
          proyecto: proyectoBase,
        },
      },
      cuotas: [] as ReturnType<typeof cuota>[],
    };

    it('tira 404 si no existe una venta VIGENTE con ese id para este cliente', async () => {
      prisma.vENTA.findFirst.mockResolvedValue(null);

      await expect(service.detalleVentaCliente(20, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.vENTA.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_venta: 20, FK_cliente: 1, estado: 'VIGENTE' },
        }) as unknown,
      );
    });

    it('devuelve el plan acordado en la venta, leído de su plan de pago y no del plan de ejemplo', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({
        ...ventaDetalleBase,
        cuotas: [
          cuota({
            numero: 0,
            importe: 20000,
            saldo_pendiente: 0,
            estado: 'PAGADA',
          }),
          cuota({
            numero: 1,
            importe: 11132.65,
            importe_interes: 2000,
            saldo_pendiente: 11132.65,
            estado: 'PENDIENTE',
          }),
          cuota({
            numero: 2,
            importe: 11132.65,
            importe_interes: 1817.35,
            saldo_pendiente: 11132.65,
            estado: 'PENDIENTE',
          }),
        ],
      });

      const resultado = await service.detalleVentaCliente(20, 1);

      expect(resultado.plan).toEqual({
        modalidad: 'FINANCIADO',
        precio: 120000,
        anticipo: 20000,
        saldo_financiado: 100000,
        cantidad_cuotas: 10,
        tasa_nominal_anual: 24,
        valor_cuota: 11132.65,
        // Suma del interés de las cuotas del cronograma.
        total_intereses: 3817.35,
        total_a_pagar: 123817.35,
      });

      // Ya no se lee el plan de ejemplo: una venta del Sprint 4 puede no tener.
      const select = (
        prisma.vENTA.findFirst.mock.calls as {
          select: Record<string, unknown>;
        }[][]
      )[0][0].select;
      expect(select).not.toHaveProperty('planEjemplo');
    });

    it('en CONTADO no hay cuotas, tasa ni valor de cuota, y el saldo financiado es 0', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({
        ...ventaDetalleBase,
        planPago: {
          modalidad: 'CONTADO',
          precio_venta: new Prisma.Decimal(120000),
          anticipo_monto: new Prisma.Decimal(120000),
          cantidad_cuotas: null,
          tasa_nominal_anual: null,
          valor_cuota: null,
        },
        cuotas: [
          cuota({
            numero: 0,
            importe: 120000,
            saldo_pendiente: 0,
            estado: 'PAGADA',
          }),
        ],
      });

      const resultado = await service.detalleVentaCliente(20, 1);

      expect(resultado.plan).toEqual({
        modalidad: 'CONTADO',
        precio: 120000,
        anticipo: 120000,
        saldo_financiado: 0,
        cantidad_cuotas: null,
        tasa_nominal_anual: null,
        valor_cuota: null,
        total_intereses: 0,
        total_a_pagar: 120000,
      });
    });

    it('cada cuota del cronograma trae su capital y su interés', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({
        ...ventaDetalleBase,
        cuotas: [
          cuota({
            numero: 1,
            importe: 11132.65,
            importe_interes: 2000,
            saldo_pendiente: 5000,
            estado: 'PARCIAL',
          }),
        ],
      });

      const resultado = await service.detalleVentaCliente(20, 1);

      expect(resultado.cuotas[0]).toMatchObject({
        numero: 1,
        importe_capital: 9132.65,
        importe_interes: 2000,
        importe: 11132.65,
        saldo_pendiente: 5000,
        estado: 'PARCIAL',
      });
    });

    it('tira un 500 con mensaje claro si la venta no tiene plan de pago (dato inconsistente)', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({
        ...ventaDetalleBase,
        planPago: null,
      });

      await expect(service.detalleVentaCliente(20, 1)).rejects.toThrow(
        new InternalServerErrorException('La venta 20 no tiene plan de pago'),
      );
    });

    it('marca vencido y calcula dias_vencido en una cuota PENDIENTE con fecha pasada', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({
        ...ventaDetalleBase,
        cuotas: [
          cuota({
            numero: 3,
            importe: 10000,
            fecha_vencimiento: new Date('2020-01-01T00:00:00Z'),
            saldo_pendiente: 10000,
            estado: 'PENDIENTE',
          }),
        ],
      });

      const resultado = await service.detalleVentaCliente(20, 1);

      expect(resultado.cuotas[0].vencido).toBe(true);
      expect(resultado.cuotas[0].dias_vencido).toBeGreaterThan(0);
    });

    it('una cuota PAGADA (saldo cero) con fecha pasada nunca queda vencida', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({
        ...ventaDetalleBase,
        cuotas: [
          cuota({
            numero: 0,
            importe: 20000,
            fecha_vencimiento: new Date('2020-01-01T00:00:00Z'),
            saldo_pendiente: 0,
            estado: 'PAGADA',
          }),
        ],
      });

      const resultado = await service.detalleVentaCliente(20, 1);

      expect(resultado.cuotas[0].vencido).toBe(false);
      expect(resultado.cuotas[0].dias_vencido).toBe(0);
    });

    it('calcula saldo_total_pendiente como la suma de saldo_pendiente de las cuotas', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({
        ...ventaDetalleBase,
        cuotas: [
          cuota({
            numero: 1,
            importe: 10000,
            saldo_pendiente: 10000,
            estado: 'PENDIENTE',
          }),
          cuota({
            numero: 2,
            importe: 10000,
            saldo_pendiente: 4000,
            estado: 'PARCIAL',
          }),
        ],
      });

      const resultado = await service.detalleVentaCliente(20, 1);

      expect(resultado.saldo_total_pendiente).toBe(14000);
    });

    it('expone id_cuota en cada cuota del cronograma (lo necesita la declaración de pago)', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({
        ...ventaDetalleBase,
        cuotas: [
          cuota({
            id_cuota: 55,
            numero: 1,
            importe: 10000,
            saldo_pendiente: 10000,
            estado: 'PENDIENTE',
          }),
        ],
      });

      const resultado = await service.detalleVentaCliente(20, 1);

      expect(resultado.cuotas[0].id_cuota).toBe(55);
    });

    it('mapea unidad completa (superficies, piso, comodidades, observaciones)', async () => {
      prisma.vENTA.findFirst.mockResolvedValue(ventaDetalleBase);

      const resultado = await service.detalleVentaCliente(20, 1);

      expect(resultado.unidad).toEqual({
        id_unidad_funcional: 30,
        identificador: '4A',
        tipologia: 'DOS_DORMITORIOS',
        superficie_cubierta: 55,
        superficie_descubierta: null,
        piso: '4',
        comodidades: null,
        observaciones: null,
      });
    });
  });

  describe('historialPagosVenta', () => {
    const cobroBase = {
      id_cobro: 100,
      fecha_cobro: new Date('2025-09-01T00:00:00Z'),
      origen: 'ECOMMERCE',
      estado: 'CONFIRMADO',
      numero_referencia: 'TR-8891',
      formaPago: { nombre: 'Transferencia' },
    };

    it('tira 404 si la venta no existe, no es de este cliente, o no está vigente', async () => {
      prisma.vENTA.findFirst.mockResolvedValue(null);

      await expect(
        service.historialPagosVenta(20, 1, { page: 1, limit: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.dETALLECOBRO.findMany).not.toHaveBeenCalled();
    });

    it('devuelve data: [] con meta.total 0 si la unidad no tiene pagos', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });
      prisma.dETALLECOBRO.findMany.mockResolvedValue([]);

      const resultado = await service.historialPagosVenta(20, 1, {
        page: 1,
        limit: 10,
      });

      expect(resultado).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10 },
      });
    });

    it('agrupa varias líneas del mismo cobro en un único ítem, sumando el importe imputado', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });
      prisma.dETALLECOBRO.findMany.mockResolvedValue([
        { importe_imputado: new Prisma.Decimal(300000), cobro: cobroBase },
        { importe_imputado: new Prisma.Decimal(150000), cobro: cobroBase },
      ]);

      const resultado = await service.historialPagosVenta(20, 1, {
        page: 1,
        limit: 10,
      });

      expect(resultado.data).toHaveLength(1);
      expect(resultado.data[0]).toEqual({
        id_cobro: 100,
        fecha_cobro: '2025-09-01T00:00:00.000Z',
        origen: 'ECOMMERCE',
        estado: 'CONFIRMADO',
        forma_pago: { nombre: 'Transferencia' },
        numero_referencia: 'TR-8891',
        importe_imputado: 450000,
      });
    });

    it('un cobro partido entre dos unidades solo suma acá el subtotal de esta venta', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });
      // Simula que DETALLECOBRO ya viene filtrado por FK_venta=20 (así lo
      // pide el where del service): la línea de la otra unidad ni aparece.
      prisma.dETALLECOBRO.findMany.mockResolvedValue([
        { importe_imputado: new Prisma.Decimal(80000), cobro: cobroBase },
      ]);

      const resultado = await service.historialPagosVenta(20, 1, {
        page: 1,
        limit: 10,
      });

      expect(prisma.dETALLECOBRO.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cuota: { FK_venta: 20 } },
        }) as unknown,
      );
      expect(resultado.data[0].importe_imputado).toBe(80000);
    });

    it('incluye un cobro ANULADO en el historial, con su estado', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });
      prisma.dETALLECOBRO.findMany.mockResolvedValue([
        {
          importe_imputado: new Prisma.Decimal(50000),
          cobro: { ...cobroBase, id_cobro: 101, estado: 'ANULADO' },
        },
      ]);

      const resultado = await service.historialPagosVenta(20, 1, {
        page: 1,
        limit: 10,
      });

      expect(resultado.data[0].estado).toBe('ANULADO');
    });

    it('ordena del cobro más reciente al más antiguo', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });
      prisma.dETALLECOBRO.findMany.mockResolvedValue([
        {
          importe_imputado: new Prisma.Decimal(10000),
          cobro: {
            ...cobroBase,
            id_cobro: 1,
            fecha_cobro: new Date('2025-01-01'),
          },
        },
        {
          importe_imputado: new Prisma.Decimal(10000),
          cobro: {
            ...cobroBase,
            id_cobro: 2,
            fecha_cobro: new Date('2025-06-01'),
          },
        },
      ]);

      const resultado = await service.historialPagosVenta(20, 1, {
        page: 1,
        limit: 10,
      });

      expect(resultado.data.map((item) => item.id_cobro)).toEqual([2, 1]);
    });

    it('pagina el historial ya agrupado según page/limit', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });
      prisma.dETALLECOBRO.findMany.mockResolvedValue(
        Array.from({ length: 3 }, (_, indice) => ({
          importe_imputado: new Prisma.Decimal(1000),
          cobro: {
            ...cobroBase,
            id_cobro: indice + 1,
            fecha_cobro: new Date(2025, 0, indice + 1),
          },
        })),
      );

      const resultado = await service.historialPagosVenta(20, 1, {
        page: 1,
        limit: 2,
      });

      expect(resultado.meta).toEqual({ total: 3, page: 1, limit: 2 });
      expect(resultado.data).toHaveLength(2);
      // Más reciente primero: id_cobro 3 (03/01) y 2 (02/01).
      expect(resultado.data.map((item) => item.id_cobro)).toEqual([3, 2]);
    });
  });

  describe('declaracionesPagoVenta', () => {
    const paginaBase = { page: 1, limit: 10 };

    /** Declaración tal como la devuelve el `select` de Prisma. */
    const declaracionBase = (extra: Record<string, unknown> = {}) => ({
      id_declaracion_pago: 1,
      estado: 'PENDIENTE',
      importe: new Prisma.Decimal(5000),
      numero_referencia: 'TR-1',
      motivo_rechazo: null,
      hora_creacion: new Date('2026-09-20T15:00:00.000Z'),
      fecha_resolucion: null,
      comprobante_ruta: null,
      cuota: { id_cuota: 55, numero: 2 },
      formaPago: { nombre: 'Transferencia' },
      cobro: null,
      ...extra,
    });

    it('tira 404 si la venta no existe, no es de este cliente, o no está vigente, sin consultar declaraciones', async () => {
      prisma.vENTA.findFirst.mockResolvedValue(null);

      await expect(
        service.declaracionesPagoVenta(20, 1, paginaBase),
      ).rejects.toBeInstanceOf(NotFoundException);

      // Misma verificación que detalle e historial: el cliente del token va
      // en el WHERE, así una venta ajena da el mismo 404 que una inexistente.
      expect(prisma.vENTA.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_venta: 20, FK_cliente: 1, estado: 'VIGENTE' },
        }) as unknown,
      );
      expect(prisma.dECLARACIONPAGO.findMany).not.toHaveBeenCalled();
      expect(prisma.dECLARACIONPAGO.count).not.toHaveBeenCalled();
    });

    it('acota la consulta a la venta y al cliente, de la más reciente a la más antigua', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });

      await service.declaracionesPagoVenta(20, 1, paginaBase);

      const whereEsperado = { FK_cliente: 1, cuota: { FK_venta: 20 } };
      expect(prisma.dECLARACIONPAGO.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: whereEsperado,
          orderBy: [{ hora_creacion: 'desc' }, { id_declaracion_pago: 'desc' }],
        }) as unknown,
      );
      expect(prisma.dECLARACIONPAGO.count).toHaveBeenCalledWith({
        where: whereEsperado,
      });
    });

    it('pagina en la base según page/limit y devuelve meta con el total', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });
      prisma.dECLARACIONPAGO.findMany.mockResolvedValue([declaracionBase()]);
      prisma.dECLARACIONPAGO.count.mockResolvedValue(21);

      const resultado = await service.declaracionesPagoVenta(20, 1, {
        page: 3,
        limit: 10,
      });

      expect(prisma.dECLARACIONPAGO.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }) as unknown,
      );
      expect(resultado.meta).toEqual({ total: 21, page: 3, limit: 10 });
    });

    it('mapea una PENDIENTE sin cobro y sin datos internos', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });
      prisma.dECLARACIONPAGO.findMany.mockResolvedValue([declaracionBase()]);
      prisma.dECLARACIONPAGO.count.mockResolvedValue(1);

      const resultado = await service.declaracionesPagoVenta(20, 1, paginaBase);

      expect(resultado.data[0]).toEqual({
        id_declaracion_pago: 1,
        estado: 'PENDIENTE',
        importe: 5000,
        numero_referencia: 'TR-1',
        motivo_rechazo: null,
        hora_creacion: '2026-09-20T15:00:00.000Z',
        fecha_resolucion: null,
        tiene_comprobante: false,
        cuota: { id_cuota: 55, numero: 2 },
        forma_pago: { nombre: 'Transferencia' },
        cobro: null,
      });
      expect(resultado.data[0]).not.toHaveProperty('FK_usuario_validador');
    });

    it('indica si la declaración tiene comprobante adjunto, sin exponer su ruta', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });
      prisma.dECLARACIONPAGO.findMany.mockResolvedValue([
        declaracionBase({
          id_declaracion_pago: 2,
          comprobante_ruta: 'declaraciones/2/comprobante.pdf',
        }),
        declaracionBase({ id_declaracion_pago: 1 }),
      ]);
      prisma.dECLARACIONPAGO.count.mockResolvedValue(2);

      const resultado = await service.declaracionesPagoVenta(20, 1, paginaBase);

      expect(resultado.data[0].tiene_comprobante).toBe(true);
      expect(resultado.data[1].tiene_comprobante).toBe(false);
      expect(resultado.data[0]).not.toHaveProperty('comprobante_ruta');
    });

    it('una VALIDADA trae el cobro que generó con su estado, también si después se anuló', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });
      prisma.dECLARACIONPAGO.findMany.mockResolvedValue([
        declaracionBase({
          id_declaracion_pago: 2,
          estado: 'VALIDADA',
          fecha_resolucion: new Date('2026-09-21T12:00:00.000Z'),
          cobro: { id_cobro: 900, estado: 'ANULADO' },
        }),
        declaracionBase({
          id_declaracion_pago: 1,
          estado: 'VALIDADA',
          fecha_resolucion: new Date('2026-09-21T11:00:00.000Z'),
          cobro: { id_cobro: 899, estado: 'CONFIRMADO' },
        }),
      ]);
      prisma.dECLARACIONPAGO.count.mockResolvedValue(2);

      const resultado = await service.declaracionesPagoVenta(20, 1, paginaBase);

      expect(resultado.data[0].estado).toBe('VALIDADA');
      expect(resultado.data[0].cobro).toEqual({
        id_cobro: 900,
        estado: 'ANULADO',
      });
      expect(resultado.data[0].fecha_resolucion).toBe(
        '2026-09-21T12:00:00.000Z',
      );
      expect(resultado.data[1].cobro).toEqual({
        id_cobro: 899,
        estado: 'CONFIRMADO',
      });
    });

    it('una RECHAZADA trae el motivo', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });
      prisma.dECLARACIONPAGO.findMany.mockResolvedValue([
        declaracionBase({
          estado: 'RECHAZADA',
          motivo_rechazo: 'No figura en el extracto',
          fecha_resolucion: new Date('2026-09-21T12:00:00.000Z'),
        }),
      ]);
      prisma.dECLARACIONPAGO.count.mockResolvedValue(1);

      const resultado = await service.declaracionesPagoVenta(20, 1, paginaBase);

      expect(resultado.data[0].motivo_rechazo).toBe('No figura en el extracto');
      expect(resultado.data[0].cobro).toBeNull();
    });
  });
});
