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
 * - completar dni_cuil/teléfono faltantes de clientes existentes
 * - búsqueda y paginación de clientes mediante buscarClientes()
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
      estado: 'EN_EJECUCION',
      fecha_fin_estimada: new Date('2027-01-01T00:00:00Z'),
    };

    const ventaBase = {
      id_venta: 20,
      estado: 'VIGENTE',
      fecha_adhesion: new Date('2026-01-10T00:00:00Z'),
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
      estado: 'EN_EJECUCION',
      fecha_fin_estimada: new Date('2027-01-01T00:00:00Z'),
    };

    const ventaDetalleBase = {
      id_venta: 20,
      estado: 'VIGENTE',
      fecha_adhesion: new Date('2026-01-10T00:00:00Z'),
      precio_congelado: new Prisma.Decimal(120000),
      anticipo_congelado: new Prisma.Decimal(20000),
      tipo_plan_congelado: 'FINANCIADO',
      cantidad_cuotas_congelada: 10,
      periodicidad_congelada: 'MENSUAL',
      planPago: { nombre: 'Financiado 10 cuotas' },
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
      cuotas: [] as {
        numero: number;
        importe: Prisma.Decimal;
        fecha_vencimiento: Date;
        saldo_pendiente: Prisma.Decimal;
        estado: string;
      }[],
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

    it('mapea el plan con las condiciones congeladas de la venta, no las de PLANPAGO', async () => {
      prisma.vENTA.findFirst.mockResolvedValue(ventaDetalleBase);

      const resultado = await service.detalleVentaCliente(20, 1);

      expect(resultado.plan).toEqual({
        nombre: 'Financiado 10 cuotas',
        tipo: 'FINANCIADO',
        precio: 120000,
        anticipo: 20000,
        cantidad_cuotas: 10,
        periodicidad: 'MENSUAL',
      });
    });

    it('marca vencido y calcula dias_vencido en una cuota PENDIENTE con fecha pasada', async () => {
      prisma.vENTA.findFirst.mockResolvedValue({
        ...ventaDetalleBase,
        cuotas: [
          {
            numero: 3,
            importe: new Prisma.Decimal(10000),
            fecha_vencimiento: new Date('2020-01-01T00:00:00Z'),
            saldo_pendiente: new Prisma.Decimal(10000),
            estado: 'PENDIENTE',
          },
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
          {
            numero: 0,
            importe: new Prisma.Decimal(20000),
            fecha_vencimiento: new Date('2020-01-01T00:00:00Z'),
            saldo_pendiente: new Prisma.Decimal(0),
            estado: 'PAGADA',
          },
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
          {
            numero: 1,
            importe: new Prisma.Decimal(10000),
            fecha_vencimiento: new Date('2099-01-01'),
            saldo_pendiente: new Prisma.Decimal(10000),
            estado: 'PENDIENTE',
          },
          {
            numero: 2,
            importe: new Prisma.Decimal(10000),
            fecha_vencimiento: new Date('2099-01-01'),
            saldo_pendiente: new Prisma.Decimal(4000),
            estado: 'PARCIAL',
          },
        ],
      });

      const resultado = await service.detalleVentaCliente(20, 1);

      expect(resultado.saldo_total_pendiente).toBe(14000);
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

    describe('cobros con la misma fecha_cobro (varios presenciales del mismo día)', () => {
      // Medianoche de Argentina: la fecha que guarda un cobro presencial.
      const MISMO_DIA = new Date('2026-09-24T03:00:00Z');

      /** Líneas de DETALLECOBRO con los cobros en el orden en que "los devolvió la base". */
      const detallesEnOrden = (ids: number[]) =>
        ids.map((id_cobro) => ({
          importe_imputado: new Prisma.Decimal(1000),
          cobro: { ...cobroBase, id_cobro, fecha_cobro: MISMO_DIA },
        }));

      /** Recorre todas las páginas y devuelve los id_cobro en el orden en que se vieron. */
      const recorrerPaginas = async (ids: number[], limit: number) => {
        const vistos: number[] = [];
        for (let page = 1; page <= Math.ceil(ids.length / limit); page++) {
          prisma.dETALLECOBRO.findMany.mockResolvedValueOnce(
            detallesEnOrden(ids),
          );
          const resultado = await service.historialPagosVenta(20, 1, {
            page,
            limit,
          });
          vistos.push(...resultado.data.map((item) => item.id_cobro));
        }
        return vistos;
      };

      beforeEach(() => {
        prisma.vENTA.findFirst.mockResolvedValue({ id_venta: 20 });
      });

      it('desempata por id_cobro descendente (el último registrado primero)', async () => {
        prisma.dETALLECOBRO.findMany.mockResolvedValue(
          detallesEnOrden([2, 5, 1, 4, 3]),
        );

        const resultado = await service.historialPagosVenta(20, 1, {
          page: 1,
          limit: 10,
        });

        expect(resultado.data.map((item) => item.id_cobro)).toEqual([
          5, 4, 3, 2, 1,
        ]);
      });

      it('el orden entre páginas no depende del orden en que los devuelva la base: ningún cobro se repite ni se pierde', async () => {
        const unOrden = await recorrerPaginas([2, 5, 1, 4, 3], 2);
        const otroOrden = await recorrerPaginas([3, 1, 4, 5, 2], 2);

        expect(unOrden).toEqual([5, 4, 3, 2, 1]);
        expect(otroOrden).toEqual(unOrden);
      });

      it('la fecha sigue mandando: un cobro más reciente va primero aunque tenga un id_cobro menor', async () => {
        prisma.dETALLECOBRO.findMany.mockResolvedValue([
          ...detallesEnOrden([8, 9]),
          {
            importe_imputado: new Prisma.Decimal(1000),
            cobro: {
              ...cobroBase,
              id_cobro: 3,
              fecha_cobro: new Date('2026-09-25T03:00:00Z'),
            },
          },
        ]);

        const resultado = await service.historialPagosVenta(20, 1, {
          page: 1,
          limit: 10,
        });

        expect(resultado.data.map((item) => item.id_cobro)).toEqual([3, 9, 8]);
      });
    });
  });
});
