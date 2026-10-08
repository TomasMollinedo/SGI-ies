import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  EstadoComercial,
  ModalidadPago,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { PlazoFinanciacionService } from '../plazo-financiacion/plazo-financiacion.service';
import { VentaSimulacionService } from './venta-simulacion.service';
import { simularVentaSchema } from './dto/simular-venta.dto';

const ID_PUBLICACION = 1;
const ID_PLAZO = 3;
const FECHA_VENTA = new Date('2026-04-14T00:00:00.000Z');

/** Plazo como lo devuelve `PlazoFinanciacionService.findOne`. */
const plazo = (parcial: Record<string, unknown> = {}) => ({
  id_plazo_financiacion: ID_PLAZO,
  codigo: 'PLZ-003',
  cantidad_cuotas: 12,
  tasa_nominal_anual: new Prisma.Decimal('24'),
  estado: true,
  ...parcial,
});

/** La publicación como la lee el service. Por defecto, la del caso de prueba. */
const publicacion = (
  estadoComercial: EstadoComercial = EstadoComercial.DISPONIBLE,
  vigente = true,
  precioLista: string | null = '20000000.00',
) => ({
  vigente,
  estado_comercial: estadoComercial,
  precio_lista: precioLista === null ? null : new Prisma.Decimal(precioLista),
});

describe('VentaSimulacionService', () => {
  let service: VentaSimulacionService;
  let prisma: { pUBLICACIONUNIDAD: { findUnique: jest.Mock } };
  let plazos: { findOne: jest.Mock; listarCatalogo: jest.Mock };

  beforeEach(async () => {
    prisma = {
      pUBLICACIONUNIDAD: {
        findUnique: jest.fn().mockResolvedValue(publicacion()),
      },
    };
    plazos = {
      findOne: jest.fn().mockResolvedValue(plazo()),
      listarCatalogo: jest.fn().mockResolvedValue([{ id: '3' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VentaSimulacionService,
        { provide: PrismaService, useValue: prisma },
        { provide: PlazoFinanciacionService, useValue: plazos },
      ],
    }).compile();

    service = module.get(VentaSimulacionService);
  });

  /** Body parseado por el DTO, como lo recibe el service. */
  const dto = (body: Record<string, unknown>) =>
    simularVentaSchema.parse({ FK_publicacion: ID_PUBLICACION, ...body });

  const financiado = (extra: Record<string, unknown> = {}) =>
    dto({
      modalidad: 'FINANCIADO',
      FK_plazo_financiacion: ID_PLAZO,
      anticipo_monto: 10000000,
      ...extra,
    });

  describe('FINANCIADO: caso de prueba del sistema francés', () => {
    it('devuelve saldo, TNA, tasa mensual, cuota, intereses, total y el cronograma completo', async () => {
      const resultado = await service.simular(financiado());

      expect(resultado).toMatchObject({
        FK_publicacion: ID_PUBLICACION,
        modalidad: ModalidadPago.FINANCIADO,
        precio_lista: '20000000.00',
        anticipo_monto: '10000000.00',
        anticipo_porcentaje: '50.00',
        saldo_financiado: '10000000.00',
        plazo: {
          id_plazo_financiacion: ID_PLAZO,
          codigo: 'PLZ-003',
          cantidad_cuotas: 12,
          tasa_nominal_anual: '24.00',
        },
        tasa_mensual: '2.0000',
        valor_cuota: '945595.97',
        total_intereses: '1347151.59',
        total_a_pagar: '21347151.59',
      });
      expect(resultado.cuotas).toHaveLength(13);
      expect(resultado.cuotas[1]).toMatchObject({
        numero: 1,
        importe_capital: '745595.97',
        importe_interes: '200000.00',
        importe: '945595.97',
        saldo_capital: '9254404.03',
      });
      expect(resultado.cuotas[12]).toMatchObject({
        importe: '945595.92',
        saldo_capital: '0.00',
      });
    });

    it('con el anticipo en porcentaje calcula el monto', async () => {
      const resultado = await service.simular(
        financiado({ anticipo_monto: undefined, anticipo_porcentaje: 30 }),
      );

      expect(resultado.anticipo_monto).toBe('6000000.00');
      expect(resultado.anticipo_porcentaje).toBe('30.00');
      expect(resultado.saldo_financiado).toBe('14000000.00');
    });

    it('con el anticipo en monto calcula el porcentaje, redondeado a dos decimales', async () => {
      // 3.333.333 / 20.000.000 = 16,666665 % -> 16,67 %
      const resultado = await service.simular(
        financiado({ anticipo_monto: 3333333 }),
      );

      expect(resultado.anticipo_monto).toBe('3333333.00');
      expect(resultado.anticipo_porcentaje).toBe('16.67');
    });

    it('los vencimientos se cuentan desde la fecha de la venta', async () => {
      const simulacion = await service.calcular(financiado(), FECHA_VENTA);

      expect(simulacion.fecha_venta).toBe(FECHA_VENTA);
      expect(
        simulacion.cuotas
          .slice(0, 3)
          .map((cuota) => cuota.fecha_vencimiento.toISOString().slice(0, 10)),
      ).toEqual(['2026-04-14', '2026-05-14', '2026-06-14']);
    });

    it('calcular devuelve los importes como Decimal, para que T158 los compare', async () => {
      const simulacion = await service.calcular(financiado(), FECHA_VENTA);

      expect(simulacion.precio_lista).toBeInstanceOf(Prisma.Decimal);
      expect(simulacion.plazo?.tasa_nominal_anual).toBeInstanceOf(
        Prisma.Decimal,
      );
      expect(simulacion.valor_cuota?.toFixed(2)).toBe('945595.97');
    });

    it('con la transacción de quien llama, lee la publicación con ese cliente y no con el común', async () => {
      const tx = {
        pUBLICACIONUNIDAD: {
          findUnique: jest.fn().mockResolvedValue(publicacion()),
        },
      };

      await service.calcular(
        financiado(),
        FECHA_VENTA,
        tx as unknown as Prisma.TransactionClient,
      );

      expect(tx.pUBLICACIONUNIDAD.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.pUBLICACIONUNIDAD.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('CONTADO', () => {
    it('una única cuota 0 por el 100 % del precio de lista, sin interés ni plazo', async () => {
      const resultado = await service.simular(dto({ modalidad: 'CONTADO' }));

      expect(resultado).toMatchObject({
        modalidad: ModalidadPago.CONTADO,
        anticipo_monto: '20000000.00',
        anticipo_porcentaje: '100.00',
        saldo_financiado: '0.00',
        plazo: null,
        tasa_mensual: null,
        valor_cuota: null,
        total_intereses: '0.00',
        total_a_pagar: '20000000.00',
      });
      expect(resultado.cuotas).toEqual([
        expect.objectContaining({
          numero: 0,
          importe: '20000000.00',
          importe_interes: '0.00',
          saldo_capital: '0.00',
        }),
      ]);
      expect(plazos.findOne).not.toHaveBeenCalled();
    });
  });

  describe('validaciones contra la base', () => {
    it('rechaza con 404 una publicación que no existe o no está vigente', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValueOnce(null);
      await expect(service.simular(financiado())).rejects.toThrow(
        NotFoundException,
      );

      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValueOnce(
        publicacion(EstadoComercial.DISPONIBLE, false),
      );
      await expect(service.simular(financiado())).rejects.toThrow(
        NotFoundException,
      );
    });

    it.each([
      EstadoComercial.EN_PREPARACION,
      EstadoComercial.EN_PLAN_DE_PAGO,
      EstadoComercial.VENDIDA,
    ])('rechaza con 409 una unidad %s', async (estadoComercial) => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        publicacion(estadoComercial),
      );

      await expect(
        service.simular(dto({ modalidad: 'CONTADO' })),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza con 400 un anticipo en monto igual o mayor al precio de lista', async () => {
      await expect(
        service.simular(financiado({ anticipo_monto: 20000000 })),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.simular(financiado({ anticipo_monto: 25000000 })),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza con 400 un porcentaje que sobre el precio redondea a 0', async () => {
      // 0,01 % de $10 = $0,001 -> $0,00
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        publicacion(EstadoComercial.DISPONIBLE, true, '10.00'),
      );

      await expect(
        service.simular(
          financiado({ anticipo_monto: undefined, anticipo_porcentaje: 0.01 }),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza con 409 un plazo dado de baja, si quedan otros activos', async () => {
      plazos.findOne.mockResolvedValue(plazo({ estado: false }));

      await expect(service.simular(financiado())).rejects.toThrow(
        /PLZ-003 está dado de baja/,
      );
    });

    it('sin ningún plazo activo, informa que la venta solo puede ser de contado', async () => {
      plazos.findOne.mockResolvedValue(plazo({ estado: false }));
      plazos.listarCatalogo.mockResolvedValue([]);

      await expect(service.simular(financiado())).rejects.toThrow(
        /solo puede ser de contado/,
      );
    });

    it('propaga el 404 de un plazo inexistente', async () => {
      plazos.findOne.mockRejectedValue(new NotFoundException('no existe'));

      await expect(service.simular(financiado())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('body (schema del DTO)', () => {
    const valida = (body: Record<string, unknown>) =>
      simularVentaSchema.safeParse({ FK_publicacion: 1, ...body }).success;

    it('CONTADO no lleva anticipo ni plazo', () => {
      expect(valida({ modalidad: 'CONTADO' })).toBe(true);
      expect(valida({ modalidad: 'CONTADO', anticipo_monto: 1000 })).toBe(
        false,
      );
      expect(valida({ modalidad: 'CONTADO', FK_plazo_financiacion: 3 })).toBe(
        false,
      );
    });

    it('FINANCIADO necesita plazo y exactamente uno de los dos anticipos', () => {
      const base = { modalidad: 'FINANCIADO', FK_plazo_financiacion: 3 };

      expect(valida({ ...base, anticipo_monto: 1000 })).toBe(true);
      expect(valida({ ...base, anticipo_porcentaje: 30 })).toBe(true);
      expect(valida({ ...base })).toBe(false);
      expect(
        valida({ ...base, anticipo_monto: 1000, anticipo_porcentaje: 30 }),
      ).toBe(false);
      expect(valida({ modalidad: 'FINANCIADO', anticipo_porcentaje: 30 })).toBe(
        false,
      );
    });

    it.each([0, 100, -1, 30.123])(
      'rechaza un anticipo en porcentaje de %s',
      (porcentaje) => {
        expect(
          valida({
            modalidad: 'FINANCIADO',
            FK_plazo_financiacion: 3,
            anticipo_porcentaje: porcentaje,
          }),
        ).toBe(false);
      },
    );

    it.each([0, -100, 100.001])(
      'rechaza un anticipo en monto de %s',
      (monto) => {
        expect(
          valida({
            modalidad: 'FINANCIADO',
            FK_plazo_financiacion: 3,
            anticipo_monto: monto,
          }),
        ).toBe(false);
      },
    );
  });
});
