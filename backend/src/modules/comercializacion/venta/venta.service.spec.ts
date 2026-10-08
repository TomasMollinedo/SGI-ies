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
import {
  SimulacionVenta,
  VentaSimulacionService,
} from './venta-simulacion.service';
import { calcularPlanPago } from '../plan-pago/motor-cuotas';

import { Prisma } from '../../../../generated/prisma/client';
import {
  EstadoComercial,
  ModalidadPago,
} from '../../../../generated/prisma/enums';

import { createVentaSchema, type CreateVentaDto } from './dto/create-venta.dto';
import type { CancelarVentaDto } from './dto/cancelar-venta.dto';

/**
 * Spec parcial de VentaService.
 *
 * Actualmente cubre:
 * - validación de teléfono en buscarOCrearCliente()
 * - completar dni_cuil/teléfono faltantes de clientes existentes
 * - búsqueda y paginación de clientes mediante buscarClientes()
 * - cancelación de ventas mediante cancelar()
 * - confirmación de la venta con crear(): revalidación contra la simulación,
 *   plan de pago congelado y cuotas del sistema francés (T158)
 * - listado y detalle de ventas, perfil del cliente y sus historiales
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
      count: jest.Mock;
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
    $queryRaw: jest.Mock;
    vENTA: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
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

  let simulaciones: { calcular: jest.Mock; mapear: jest.Mock };

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

  /** Una cuota como la lee el detalle de venta, con su desglose. */
  const cuotaDetalle = (datos: {
    numero: number;
    importe: number;
    interes?: number;
    saldo_capital: number;
    saldo_pendiente: number;
    estado: string;
  }) => ({
    id_cuota: 100 + datos.numero,
    numero: datos.numero,
    fecha_vencimiento: new Date('2026-08-01T00:00:00Z'),
    importe_capital: new Prisma.Decimal(datos.importe - (datos.interes ?? 0)),
    importe_interes: new Prisma.Decimal(datos.interes ?? 0),
    importe: new Prisma.Decimal(datos.importe),
    saldo_capital: new Prisma.Decimal(datos.saldo_capital),
    saldo_pendiente: new Prisma.Decimal(datos.saldo_pendiente),
    estado: datos.estado,
  });

  /**
   * Venta como la lee `obtenerDetalle`: plan acordado con las cuotas de su
   * cronograma. Precio 100.000, anticipo 20.000 y 2 cuotas al 24 %.
   */
  const ventaDetalleCompleta = {
    id_venta: ID_VENTA,
    fecha_venta: new Date('2026-08-01T00:00:00Z'),
    planPago: {
      modalidad: 'FINANCIADO',
      precio_venta: new Prisma.Decimal(100000),
      anticipo_monto: new Prisma.Decimal(20000),
      cantidad_cuotas: 2,
      tasa_nominal_anual: new Prisma.Decimal(24),
      valor_cuota: new Prisma.Decimal('41207.92'),
      plazoFinanciacion: { id_plazo_financiacion: 3, codigo: 'PLZ-003' },
      cuotas: [
        cuotaDetalle({
          numero: 0,
          importe: 20000,
          saldo_capital: 80000,
          saldo_pendiente: 0,
          estado: 'PAGADA',
        }),
        cuotaDetalle({
          numero: 1,
          importe: 41207.92,
          interes: 1600,
          saldo_capital: 40392.08,
          saldo_pendiente: 41207.92,
          estado: 'PENDIENTE',
        }),
        cuotaDetalle({
          numero: 2,
          importe: 41199.92,
          interes: 807.84,
          saldo_capital: 0,
          saldo_pendiente: 10000,
          estado: 'PARCIAL',
        }),
      ],
    } as Record<string, unknown> | null,
    estado: 'VIGENTE',
    motivo_cancelacion: null as string | null,
    fecha_cancelacion: null as Date | null,
    FK_publicacion: 10,
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
      $queryRaw: jest.fn().mockResolvedValue([]),
      vENTA: {
        findUnique: jest.fn().mockResolvedValue(ventaVigente),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
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
        count: jest.fn().mockResolvedValue(0),
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

    simulaciones = { calcular: jest.fn(), mapear: jest.fn() };

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
        {
          provide: VentaSimulacionService,
          useValue: simulaciones,
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

  describe('crear — confirmación de la venta (T158)', () => {
    const ID_PUBLICACION = 10;
    const ID_PLAZO = 3;
    const FECHA_VENTA = new Date('2026-04-14T00:00:00.000Z');

    /** El caso de prueba del sistema francés como simulación vigente. */
    const simulacionFinanciada = (
      sobrescribe: Partial<SimulacionVenta> = {},
    ): SimulacionVenta => ({
      FK_publicacion: ID_PUBLICACION,
      modalidad: ModalidadPago.FINANCIADO,
      fecha_venta: FECHA_VENTA,
      precio_lista: new Prisma.Decimal('20000000.00'),
      anticipo_monto: new Prisma.Decimal('10000000.00'),
      anticipo_porcentaje: new Prisma.Decimal('50'),
      plazo: {
        id_plazo_financiacion: ID_PLAZO,
        codigo: 'PLZ-003',
        cantidad_cuotas: 12,
        tasa_nominal_anual: new Prisma.Decimal('24'),
      },
      ...calcularPlanPago({
        precio: new Prisma.Decimal('20000000.00'),
        tipo: ModalidadPago.FINANCIADO,
        anticipo_monto: new Prisma.Decimal('10000000.00'),
        cantidad_cuotas: 12,
        tasa_nominal_anual: new Prisma.Decimal('24'),
        fecha_venta: FECHA_VENTA,
      }),
      ...sobrescribe,
    });

    const simulacionContado = (): SimulacionVenta => ({
      FK_publicacion: ID_PUBLICACION,
      modalidad: ModalidadPago.CONTADO,
      fecha_venta: FECHA_VENTA,
      precio_lista: new Prisma.Decimal('19000000.00'),
      anticipo_monto: new Prisma.Decimal('19000000.00'),
      anticipo_porcentaje: new Prisma.Decimal('100'),
      plazo: null,
      ...calcularPlanPago({
        precio: new Prisma.Decimal('19000000.00'),
        tipo: ModalidadPago.CONTADO,
        anticipo_monto: new Prisma.Decimal('19000000.00'),
        cantidad_cuotas: null,
        tasa_nominal_anual: null,
        fecha_venta: FECHA_VENTA,
      }),
    });

    const dtoFinanciado = (
      simulacion: {
        precio_lista: number;
        tasa_nominal_anual: number | null;
      } = {
        precio_lista: 20000000,
        tasa_nominal_anual: 24,
      },
    ) =>
      createVentaSchema.parse({
        cliente: clienteValido,
        FK_publicacion: ID_PUBLICACION,
        modalidad: 'FINANCIADO',
        anticipo_porcentaje: 50,
        FK_plazo_financiacion: ID_PLAZO,
        simulacion,
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
      simulaciones.calcular.mockResolvedValue(simulacionFinanciada());
      tx.vENTA.create.mockResolvedValue({
        id_venta: ID_VENTA,
        fecha_venta: FECHA_VENTA,
      });
    });

    const expectNadaCreado = () => {
      expect(tx.vENTA.create).not.toHaveBeenCalled();
      expect(tx.pLANPAGO.create).not.toHaveBeenCalled();
      expect(tx.cUOTA.createMany).not.toHaveBeenCalled();
      expect(publicaciones.transicionarEstadoComercial).not.toHaveBeenCalled();
    };

    it('bloquea la publicación antes que nada y recalcula dentro de la misma transacción', async () => {
      const dto = dtoFinanciado();

      await service.crear(dto, USUARIO_ID);

      const consulta = (tx.$queryRaw.mock.calls as unknown[][])[0][0] as {
        strings: string[];
        values: unknown[];
      };
      expect(consulta.strings.join('?')).toContain('FOR UPDATE');
      expect(consulta.strings.join('?')).toContain('"PUBLICACIONUNIDAD"');
      expect(consulta.values).toEqual([ID_PUBLICACION]);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        simulaciones.calcular.mock.invocationCallOrder[0],
      );

      expect(simulaciones.calcular).toHaveBeenCalledWith(
        dto,
        expect.any(Date),
        tx,
      );
    });

    it('FINANCIADO: congela en el plan modalidad, precio, anticipo, plazo, cuotas, TNA y valor de cuota', async () => {
      await service.crear(dtoFinanciado(), USUARIO_ID);

      const plan = dataPlanPago();
      expect(plan.FK_venta).toBe(ID_VENTA);
      expect(plan.FK_plazo_financiacion).toBe(ID_PLAZO);
      expect(plan.modalidad).toBe(ModalidadPago.FINANCIADO);
      expect(plan.precio_venta.toFixed(2)).toBe('20000000.00');
      expect(plan.anticipo_monto.toFixed(2)).toBe('10000000.00');
      expect(plan.cantidad_cuotas).toBe(12);
      expect(plan.tasa_nominal_anual?.toFixed(2)).toBe('24.00');
      expect(plan.valor_cuota?.toFixed(2)).toBe('945595.97');
      expect(plan.FK_usuario_creador).toBe(USUARIO_ID);
    });

    it('FINANCIADO: crea las cuotas del sistema francés con las dos FK, el desglose y todo el saldo pendiente', async () => {
      await service.crear(dtoFinanciado(), USUARIO_ID);

      const cuotas = dataCuotas();
      expect(cuotas).toHaveLength(13); // la 0 (anticipo) + 12
      for (const cuota of cuotas) {
        expect(cuota.FK_venta).toBe(ID_VENTA);
        expect(cuota.FK_plan_pago).toBe(50);
        expect(cuota.saldo_pendiente.equals(cuota.importe)).toBe(true);
        expect(cuota.estado).toBe('PENDIENTE');
      }
      expect(cuotas[1].importe_interes.toFixed(2)).toBe('200000.00');
      expect(cuotas[1].importe_capital.toFixed(2)).toBe('745595.97');
      expect(cuotas[12].importe.toFixed(2)).toBe('945595.92');
      expect(cuotas[12].saldo_capital.toFixed(2)).toBe('0.00');

      // El plan se crea antes que las cuotas: necesitan su id.
      expect(tx.pLANPAGO.create.mock.invocationCallOrder[0]).toBeLessThan(
        tx.cUOTA.createMany.mock.invocationCallOrder[0],
      );
    });

    it('la venta no escribe columnas legado ni plan de ejemplo, y su fecha es la del cálculo', async () => {
      await service.crear(dtoFinanciado(), USUARIO_ID);

      expect(dataVenta()).toEqual({
        FK_cliente: 1,
        FK_publicacion: ID_PUBLICACION,
        fecha_venta: FECHA_VENTA,
        FK_usuario_creador: USUARIO_ID,
        FK_usuario_actualizador: USUARIO_ID,
      });
    });

    it('pasa la publicación a En Plan de Pago y devuelve el detalle de la venta', async () => {
      const resultado = await service.crear(dtoFinanciado(), USUARIO_ID);

      expect(publicaciones.transicionarEstadoComercial).toHaveBeenCalledWith(
        tx,
        ID_PUBLICACION,
        EstadoComercial.DISPONIBLE,
        EstadoComercial.EN_PLAN_DE_PAGO,
        USUARIO_ID,
      );
      expect(resultado.id_venta).toBe(ID_VENTA);
    });

    it('CONTADO: el anticipo es el precio, sin plazo, cuotas, tasa ni valor de cuota, y una única cuota 0', async () => {
      simulaciones.calcular.mockResolvedValue(simulacionContado());

      await service.crear(
        createVentaSchema.parse({
          cliente: clienteValido,
          FK_publicacion: ID_PUBLICACION,
          modalidad: 'CONTADO',
          simulacion: { precio_lista: 19000000, tasa_nominal_anual: null },
        }),
        USUARIO_ID,
      );

      const plan = dataPlanPago();
      expect(plan.modalidad).toBe(ModalidadPago.CONTADO);
      expect(plan.anticipo_monto.toFixed(2)).toBe('19000000.00');
      expect(plan.FK_plazo_financiacion).toBeNull();
      expect(plan.cantidad_cuotas).toBeNull();
      expect(plan.tasa_nominal_anual).toBeNull();
      expect(plan.valor_cuota).toBeNull();

      const cuotas = dataCuotas();
      expect(cuotas).toHaveLength(1);
      expect(cuotas[0].numero).toBe(0);
      expect(cuotas[0].importe.toFixed(2)).toBe('19000000.00');
    });

    it('si cambió el precio de lista, rechaza con 409 y la simulación recalculada, sin crear nada', async () => {
      simulaciones.calcular.mockResolvedValue(
        simulacionFinanciada({
          precio_lista: new Prisma.Decimal('21000000.00'),
        }),
      );
      simulaciones.mapear.mockReturnValue({ precio_lista: '21000000.00' });

      const error = (await service
        .crear(dtoFinanciado(), USUARIO_ID)
        .catch((e: unknown) => e)) as ConflictException;

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toEqual({
        message: expect.stringContaining('el precio de lista') as string,
        datos: { simulacion: { precio_lista: '21000000.00' } },
      });
      expect(simulaciones.mapear).toHaveBeenCalledWith(
        expect.objectContaining({ modalidad: ModalidadPago.FINANCIADO }),
      );
      expectNadaCreado();
    });

    it('si cambió la TNA del plazo, rechaza con 409 nombrando la TNA, sin crear nada', async () => {
      const error = (await service
        .crear(
          dtoFinanciado({ precio_lista: 20000000, tasa_nominal_anual: 18 }),
          USUARIO_ID,
        )
        .catch((e: unknown) => e)) as ConflictException;

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toContain('la TNA del plazo');
      expect(error.message).not.toContain('el precio de lista');
      expectNadaCreado();
    });

    it('propaga lo que rechaza el cálculo (ej. unidad no disponible) sin crear nada', async () => {
      simulaciones.calcular.mockRejectedValue(
        new ConflictException('La unidad no está disponible para la venta'),
      );

      await expect(service.crear(dtoFinanciado(), USUARIO_ID)).rejects.toThrow(
        'La unidad no está disponible para la venta',
      );
      expectNadaCreado();
    });

    it('rechaza con 409 si ya hay una venta vigente sobre la publicación', async () => {
      tx.vENTA.findFirst.mockResolvedValue({ id_venta: 99 });

      await expect(service.crear(dtoFinanciado(), USUARIO_ID)).rejects.toThrow(
        new ConflictException(
          'Ya existe una venta vigente sobre esta publicación',
        ),
      );
      expectNadaCreado();
    });

    describe('body (schema del DTO)', () => {
      const valida = (body: Record<string, unknown>) =>
        createVentaSchema.safeParse({
          cliente: clienteValido,
          FK_publicacion: ID_PUBLICACION,
          ...body,
        }).success;

      it('exige lo que se mostró en la simulación', () => {
        expect(
          valida({
            modalidad: 'FINANCIADO',
            anticipo_porcentaje: 50,
            FK_plazo_financiacion: ID_PLAZO,
          }),
        ).toBe(false);
      });

      it('en CONTADO la TNA mostrada es null; en FINANCIADO es obligatoria', () => {
        expect(
          valida({
            modalidad: 'CONTADO',
            simulacion: { precio_lista: 1000, tasa_nominal_anual: null },
          }),
        ).toBe(true);
        expect(
          valida({
            modalidad: 'CONTADO',
            simulacion: { precio_lista: 1000, tasa_nominal_anual: 24 },
          }),
        ).toBe(false);
        expect(
          valida({
            modalidad: 'FINANCIADO',
            anticipo_porcentaje: 50,
            FK_plazo_financiacion: ID_PLAZO,
            simulacion: { precio_lista: 1000, tasa_nominal_anual: null },
          }),
        ).toBe(false);
      });

      it('aplica las mismas reglas de condiciones que la simulación', () => {
        // FINANCIADO con los dos anticipos a la vez.
        expect(
          valida({
            modalidad: 'FINANCIADO',
            anticipo_monto: 1000,
            anticipo_porcentaje: 50,
            FK_plazo_financiacion: ID_PLAZO,
            simulacion: { precio_lista: 1000, tasa_nominal_anual: 24 },
          }),
        ).toBe(false);
      });
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
      // La venta como queda después de cancelar: plan conservado y cuotas ANULADA.
      const planPago = ventaDetalleCompleta.planPago as {
        cuotas: { estado: string }[];
      };
      prisma.vENTA.findUnique.mockResolvedValue({
        ...ventaDetalleCompleta,
        estado: 'CANCELADA',
        motivo_cancelacion: dto.motivo_cancelacion,
        fecha_cancelacion: new Date('2026-09-22T00:00:00Z'),
        planPago: {
          ...planPago,
          cuotas: planPago.cuotas.map((cuota) => ({
            ...cuota,
            estado: 'ANULADA',
          })),
        },
      });

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
      // El plan se conserva como registro histórico; ya no se debe nada.
      expect(resultado.plan.precio).toBe(100000);
      expect(resultado.cuotas).toHaveLength(3);
      expect(resultado.saldo_pendiente).toBe(0);
    });
  });

  describe('listar y obtenerDetalle (vista interna)', () => {
    it('el detalle devuelve el plan acordado, el saldo pendiente y el cronograma desglosado', async () => {
      const resultado = await service.obtenerDetalle(ID_VENTA);

      expect(resultado.plan).toEqual({
        modalidad: 'FINANCIADO',
        precio: 100000,
        anticipo: 20000,
        saldo_financiado: 80000,
        plazo: { id_plazo_financiacion: 3, codigo: 'PLZ-003' },
        cantidad_cuotas: 2,
        tasa_nominal_anual: 24,
        valor_cuota: 41207.92,
        // 1.600 + 807,84
        total_intereses: 2407.84,
        total_a_pagar: 102407.84,
      });
      // 0 + 41.207,92 + 10.000
      expect(resultado.saldo_pendiente).toBe(51207.92);
      expect(resultado.cuotas[1]).toEqual({
        id_cuota: 101,
        numero: 1,
        fecha_vencimiento: '2026-08-01T00:00:00.000Z',
        importe_capital: 39607.92,
        importe_interes: 1600,
        importe: 41207.92,
        saldo_capital: 40392.08,
        saldo_pendiente: 41207.92,
        estado: 'PENDIENTE',
      });
      expect(resultado.usuarioCreador).toEqual({
        nombre: 'Ana',
        apellido: 'Gómez',
      });
    });

    it('no expone el contrato del Sprint 3 ni depende del plan de ejemplo', async () => {
      const resultado = await service.obtenerDetalle(ID_VENTA);

      for (const campo of [
        'FK_plan_pago',
        'fecha_adhesion',
        'precio_congelado',
        'anticipo_congelado',
        'tipo_plan_congelado',
        'cantidad_cuotas_congelada',
        'periodicidad_congelada',
      ]) {
        expect(resultado).not.toHaveProperty(campo);
      }
      expect(resultado.fecha_venta).toBe('2026-08-01T00:00:00.000Z');

      const select = (
        prisma.vENTA.findUnique.mock.calls as {
          select: Record<string, unknown>;
        }[][]
      )[0][0].select;
      expect(select).not.toHaveProperty('FK_plan_ejemplo');
      expect(select).not.toHaveProperty('planEjemplo');
      // Las cuotas se leen por el plan de pago, no por la columna legado FK_venta.
      expect(select).not.toHaveProperty('cuotas');
    });

    it('el detalle tira 404 si la venta no existe', async () => {
      prisma.vENTA.findUnique.mockResolvedValue(null);

      await expect(service.obtenerDetalle(ID_VENTA)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('una venta sin plan de pago es un dato inconsistente: 500', async () => {
      prisma.vENTA.findUnique.mockResolvedValue({
        ...ventaDetalleCompleta,
        planPago: null,
      });

      await expect(service.obtenerDetalle(ID_VENTA)).rejects.toThrow(
        new InternalServerErrorException(
          `La venta ${ID_VENTA} no tiene plan de pago`,
        ),
      );
    });

    it('el listado mapea cada venta con su plan y su saldo pendiente', async () => {
      prisma.vENTA.findMany.mockResolvedValue([ventaDetalleCompleta]);
      prisma.vENTA.count.mockResolvedValue(1);

      const resultado = await service.listar({ page: 1, limit: 10 });

      expect(resultado.data[0].plan.modalidad).toBe('FINANCIADO');
      expect(resultado.data[0].plan.tasa_nominal_anual).toBe(24);
      expect(resultado.data[0].saldo_pendiente).toBe(51207.92);
      expect(resultado.data[0]).not.toHaveProperty('cuotas');
      expect(resultado.meta).toEqual({ total: 1, page: 1, limit: 10 });
    });

    it('filtra por modalidad del plan acordado, combinable con el período sobre fecha_venta', async () => {
      const fechaDesde = new Date('2026-01-01T00:00:00Z');

      await service.listar({
        modalidad: 'CONTADO',
        fechaDesde,
        page: 1,
        limit: 10,
      });

      expect(prisma.vENTA.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            planPago: { modalidad: 'CONTADO' },
            fecha_venta: { gte: fechaDesde },
          },
        }) as unknown,
      );
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
        plazo: null,
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
        plazo: null,
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
      comprobante_nombre_archivo: 'pago.pdf',
      comprobante_tipo: 'application/pdf',
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
        comprobante_nombre_archivo: 'pago.pdf',
        comprobante_tipo: 'application/pdf',
        tiene_comprobante: true,
        cuota: { id_cuota: 55, numero: 2 },
        forma_pago: { nombre: 'Transferencia' },
        cobro: null,
      });
      expect(resultado.data[0]).not.toHaveProperty('FK_usuario_validador');
      expect(resultado.data[0]).not.toHaveProperty('comprobante_ruta');
    });

    it('una declaración sin comprobante (anterior a T146) responde tiene_comprobante: false', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });
      prisma.dECLARACIONPAGO.findMany.mockResolvedValue([
        declaracionBase({
          comprobante_nombre_archivo: null,
          comprobante_tipo: null,
        }),
      ]);
      prisma.dECLARACIONPAGO.count.mockResolvedValue(1);

      const resultado = await service.declaracionesPagoVenta(20, 1, paginaBase);

      expect(resultado.data[0].tiene_comprobante).toBe(false);
      expect(resultado.data[0].comprobante_nombre_archivo).toBeNull();
    });

    it('indica si la declaración tiene comprobante adjunto, sin exponer su ruta', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });
      prisma.dECLARACIONPAGO.findMany.mockResolvedValue([
        declaracionBase({ id_declaracion_pago: 2 }),
        declaracionBase({
          id_declaracion_pago: 1,
          comprobante_nombre_archivo: null,
          comprobante_tipo: null,
        }),
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
