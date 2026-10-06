import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  EstadoComercial,
  EstadoProyecto,
  TipologiaUnidad,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { PublicacionService } from './publicacion.service';
import { despublicarPublicacionSchema } from './dto/despublicar-publicacion.dto';
import { definirPrecioListaSchema } from './dto/definir-precio-lista.dto';

type Args = Record<string, unknown>;

/** Primer argumento con el que se llamó a un mock, ya tipado. */
const primerArgumento = (mock: jest.Mock): Args =>
  (mock.mock.calls as Args[][])[0][0];

const MENSAJE_EN_PLANIFICACION =
  'No se puede publicar la unidad: su proyecto está En planificación. Solo pueden publicarse unidades de proyectos En ejecución (venta en pozo) o Finalizados (unidad terminada).';

describe('PublicacionService', () => {
  let service: PublicacionService;

  // `tx` es un objeto DISTINTO de `prisma`: así cada test puede afirmar sobre
  // qué cliente corrió cada operación.
  let tx: {
    $queryRaw: jest.Mock;
    pROYECTO: { findUnique: jest.Mock };
    pUBLICACIONUNIDAD: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    pLANEJEMPLO: Record<string, jest.Mock>;
    cONSULTAUNIDAD: Record<string, jest.Mock>;
  };
  let prisma: {
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
    pUBLICACIONUNIDAD: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
    };
    uNIDADFUNCIONAL: { findMany: jest.Mock; count: jest.Mock };
  };

  const USUARIO_ID = 7;
  const FECHA_FIN = new Date('2027-12-01');

  const detalleMock = (estadoProyecto: EstadoProyecto = 'EN_EJECUCION') => ({
    id_publicacion: 7,
    FK_unidad_funcional: 12,
    estado_comercial: EstadoComercial.EN_PREPARACION,
    vigente: true,
    precio_lista: null,
    porcentaje_ganancia: null,
    margen: null,
    fecha_publicacion: new Date('2026-09-18'),
    fecha_despublicacion: null,
    motivo_despublicacion: null,
    hora_creacion: new Date('2026-09-18'),
    hora_actualizacion: new Date('2026-09-18'),
    FK_usuario_creador: USUARIO_ID,
    FK_usuario_actualizador: USUARIO_ID,
    usuarioCreador: { nombre: 'Ada', apellido: 'Lovelace' },
    usuarioActualizador: { nombre: 'Ada', apellido: 'Lovelace' },
    unidadFuncional: {
      id_unidad_funcional: 12,
      identificador: '1-A',
      tipologia: TipologiaUnidad.UN_DORMITORIO,
      superficie_cubierta: new Prisma.Decimal(45),
      superficie_descubierta: new Prisma.Decimal(6.5),
      piso: '1',
      comodidades: null,
      observaciones: null,
      costo: new Prisma.Decimal(15000000),
      imagenes: [{ id_imagen_unidad: 1, url: 'https://x/1.jpg', orden: 0 }],
      proyecto: {
        id_proyecto: 1,
        codigo: 'PROY-TN',
        nombre: 'Torre Nogal',
        localidad: 'Resistencia, Chaco',
        estado_obra: estadoProyecto,
        fecha_fin_estimada: FECHA_FIN,
      },
    },
  });

  /** Deja todo listo para que `publicar` termine bien, con el proyecto en el estado dado. */
  const prepararPublicar = (estadoProyecto: EstadoProyecto) => {
    tx.$queryRaw.mockResolvedValue([
      { id_unidad_funcional: 12, estado: true, FK_proyecto: 1 },
    ]);
    tx.pROYECTO.findUnique.mockResolvedValue({ estado_obra: estadoProyecto });
    tx.pUBLICACIONUNIDAD.findFirst.mockResolvedValue(null);
    tx.pUBLICACIONUNIDAD.create.mockResolvedValue({ id_publicacion: 7 });
    prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
      detalleMock(estadoProyecto),
    );
  };

  beforeEach(async () => {
    tx = {
      $queryRaw: jest.fn(),
      pROYECTO: { findUnique: jest.fn() },
      pUBLICACIONUNIDAD: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      pLANEJEMPLO: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      cONSULTAUNIDAD: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
    };
    prisma = {
      $transaction: jest
        .fn()
        .mockImplementation((callback: (cliente: typeof tx) => unknown) =>
          callback(tx),
        ),
      $queryRaw: jest.fn(),
      pUBLICACIONUNIDAD: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn(),
      },
      uNIDADFUNCIONAL: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicacionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PublicacionService);
  });

  describe('publicar', () => {
    it.each<EstadoProyecto>(['EN_EJECUCION', 'FINALIZADO'])(
      'unidad de proyecto %s: crea la publicación EN_PREPARACION, vigente y con la auditoría del usuario',
      async (estadoProyecto) => {
        prepararPublicar(estadoProyecto);

        await service.publicar({ FK_unidad_funcional: 12 }, USUARIO_ID);

        expect(tx.pUBLICACIONUNIDAD.create).toHaveBeenCalledTimes(1);
        expect(primerArgumento(tx.pUBLICACIONUNIDAD.create).data).toEqual({
          FK_unidad_funcional: 12,
          estado_comercial: EstadoComercial.EN_PREPARACION,
          vigente: true,
          FK_usuario_creador: USUARIO_ID,
          FK_usuario_actualizador: USUARIO_ID,
        });
      },
    );

    it('nace sin precio de lista, también al volver a publicar una unidad despublicada', async () => {
      // La unidad ya tuvo una publicación con precio (no vigente): publicar
      // crea una fila nueva, nunca reutiliza ni copia la anterior.
      prepararPublicar('EN_EJECUCION');

      await service.publicar({ FK_unidad_funcional: 12 }, USUARIO_ID);

      const data = primerArgumento(tx.pUBLICACIONUNIDAD.create).data as Args;
      expect(data).not.toHaveProperty('precio_lista');
      expect(data).not.toHaveProperty('porcentaje_ganancia');
      expect(data).not.toHaveProperty('margen');
      expect(tx.pUBLICACIONUNIDAD.updateMany).not.toHaveBeenCalled();
    });

    it('devuelve el detalle de la publicación creada', async () => {
      prepararPublicar('EN_EJECUCION');

      const resultado = await service.publicar(
        { FK_unidad_funcional: 12 },
        USUARIO_ID,
      );

      expect(resultado.id_publicacion).toBe(7);
      expect(resultado.condicion_entrega.codigo).toBe('A_ENTREGAR_CON_FECHA');
    });

    it('bloquea la unidad con $queryRaw sobre tx (no sobre prisma) y ANTES de buscar la publicación vigente', async () => {
      prepararPublicar('EN_EJECUCION');

      await service.publicar({ FK_unidad_funcional: 12 }, USUARIO_ID);

      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.pUBLICACIONUNIDAD.findFirst.mock.invocationCallOrder[0],
      );
      // Es un FOR UPDATE sobre la tabla de la unidad, con el id parametrizado.
      const consulta = (tx.$queryRaw.mock.calls as unknown[][])[0][0] as {
        strings: string[];
        values: unknown[];
      };
      expect(consulta.strings.join('?')).toContain('FOR UPDATE');
      expect(consulta.strings.join('?')).toContain('"UNIDADFUNCIONAL"');
      expect(consulta.values).toEqual([12]);
    });

    it('todo corre dentro de la transacción: la búsqueda de la vigente y el create usan tx', async () => {
      prepararPublicar('EN_EJECUCION');

      await service.publicar({ FK_unidad_funcional: 12 }, USUARIO_ID);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.pUBLICACIONUNIDAD.findFirst).toHaveBeenCalledWith({
        where: { FK_unidad_funcional: 12, vigente: true },
        select: { id_publicacion: true },
      });
    });

    it('rechaza con NotFoundException si la unidad no existe', async () => {
      tx.$queryRaw.mockResolvedValue([]);

      await expect(
        service.publicar({ FK_unidad_funcional: 99 }, USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.pUBLICACIONUNIDAD.create).not.toHaveBeenCalled();
    });

    it('rechaza una unidad dada de baja', async () => {
      tx.$queryRaw.mockResolvedValue([
        { id_unidad_funcional: 12, estado: false, FK_proyecto: 1 },
      ]);

      const error = await service
        .publicar({ FK_unidad_funcional: 12 }, USUARIO_ID)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toBe(
        'No se puede publicar la unidad: fue dada de baja.',
      );
      expect(tx.pUBLICACIONUNIDAD.create).not.toHaveBeenCalled();
    });

    it('rechaza un proyecto EN_PLANIFICACION con el mensaje explicativo completo', async () => {
      prepararPublicar('EN_PLANIFICACION');

      const error = await service
        .publicar({ FK_unidad_funcional: 12 }, USUARIO_ID)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toBe(
        MENSAJE_EN_PLANIFICACION,
      );
      expect(tx.pUBLICACIONUNIDAD.create).not.toHaveBeenCalled();
    });

    it('rechaza un proyecto CANCELADO con su propio mensaje', async () => {
      prepararPublicar('CANCELADO');

      const error = await service
        .publicar({ FK_unidad_funcional: 12 }, USUARIO_ID)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toBe(
        'No se puede publicar la unidad: su proyecto fue cancelado.',
      );
      expect(tx.pUBLICACIONUNIDAD.create).not.toHaveBeenCalled();
    });

    it('rechaza si ya hay una publicación vigente, ofreciendo despublicar e incluyendo su id en datos', async () => {
      prepararPublicar('EN_EJECUCION');
      tx.pUBLICACIONUNIDAD.findFirst.mockResolvedValue({ id_publicacion: 5 });

      const error = await service
        .publicar({ FK_unidad_funcional: 12 }, USUARIO_ID)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual({
        message:
          'La unidad ya tiene una publicación vigente. Para volver a publicarla, primero despublicá la publicación actual.',
        datos: { id_publicacion_vigente: 5 },
      });
      expect(tx.pUBLICACIONUNIDAD.create).not.toHaveBeenCalled();
    });
  });

  describe('despublicar', () => {
    const MOTIVO = 'Retirada por refacción';

    const prepararDespublicar = (estadoComercial: EstadoComercial) => {
      tx.pUBLICACIONUNIDAD.findUnique.mockResolvedValue({
        vigente: true,
        estado_comercial: estadoComercial,
      });
      tx.pUBLICACIONUNIDAD.updateMany.mockResolvedValue({ count: 1 });
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(detalleMock());
    };

    it.each<EstadoComercial>(['EN_PREPARACION', 'DISPONIBLE'])(
      'desde %s: despublica con lock optimista y sin tocar el estado comercial',
      async (estadoComercial) => {
        prepararDespublicar(estadoComercial);

        await service.despublicar(
          7,
          { motivo_despublicacion: MOTIVO },
          USUARIO_ID,
        );

        const args = primerArgumento(tx.pUBLICACIONUNIDAD.updateMany);
        expect(args.where).toEqual({
          id_publicacion: 7,
          vigente: true,
          estado_comercial: { in: ['EN_PREPARACION', 'DISPONIBLE'] },
        });
        expect(args.data).toEqual({
          vigente: false,
          fecha_despublicacion: expect.any(Date) as Date,
          motivo_despublicacion: MOTIVO,
          FK_usuario_actualizador: USUARIO_ID,
          hora_actualizacion: expect.any(Date) as Date,
        });
        expect(args.data).not.toHaveProperty('estado_comercial');
      },
    );

    it('no toca planes de pago ni consultas', async () => {
      prepararDespublicar('DISPONIBLE');

      await service.despublicar(
        7,
        { motivo_despublicacion: MOTIVO },
        USUARIO_ID,
      );

      for (const accessor of [tx.pLANEJEMPLO, tx.cONSULTAUNIDAD]) {
        for (const mock of Object.values(accessor)) {
          expect(mock).not.toHaveBeenCalled();
        }
      }
    });

    it.each<[EstadoComercial, string]>([
      ['EN_PLAN_DE_PAGO', 'En Plan de Pago'],
      ['VENDIDA', 'Vendida'],
    ])(
      'rechaza desde %s, con el estado real en el mensaje',
      async (estadoComercial, etiqueta) => {
        prepararDespublicar(estadoComercial);

        const error = await service
          .despublicar(7, { motivo_despublicacion: MOTIVO }, USUARIO_ID)
          .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).message).toBe(
          `No se puede despublicar: la unidad está ${etiqueta}. Solo pueden despublicarse unidades en Publicación en preparación o Disponible.`,
        );
        expect(tx.pUBLICACIONUNIDAD.updateMany).not.toHaveBeenCalled();
      },
    );

    it('rechaza una publicación ya despublicada', async () => {
      tx.pUBLICACIONUNIDAD.findUnique.mockResolvedValue({
        vigente: false,
        estado_comercial: EstadoComercial.DISPONIBLE,
      });

      const error = await service
        .despublicar(7, { motivo_despublicacion: MOTIVO }, USUARIO_ID)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toBe(
        'La publicación ya fue despublicada.',
      );
      expect(tx.pUBLICACIONUNIDAD.updateMany).not.toHaveBeenCalled();
    });

    it('falla con NotFoundException si la publicación no existe', async () => {
      tx.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(null);

      await expect(
        service.despublicar(99, { motivo_despublicacion: MOTIVO }, USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('si el updateMany no actualiza ninguna fila (count 0), rechaza por modificación concurrente', async () => {
      prepararDespublicar('DISPONIBLE');
      tx.pUBLICACIONUNIDAD.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.despublicar(7, { motivo_despublicacion: MOTIVO }, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('motivo_despublicacion (schema del DTO)', () => {
    it.each<[string, unknown]>([
      ['ausente', undefined],
      ['vacío', ''],
      ['solo espacios', '   '],
      ['de más de 500 caracteres', 'a'.repeat(501)],
    ])('rechaza un motivo %s', (_caso, valor) => {
      const resultado = despublicarPublicacionSchema.safeParse({
        motivo_despublicacion: valor,
      });

      expect(resultado.success).toBe(false);
    });

    it('acepta un motivo con espacios alrededor y lo recorta', () => {
      const resultado = despublicarPublicacionSchema.safeParse({
        motivo_despublicacion: '  Por refacción  ',
      });

      expect(resultado.success).toBe(true);
      expect(resultado.data?.motivo_despublicacion).toBe('Por refacción');
    });

    it('acepta un motivo de exactamente 500 caracteres', () => {
      const resultado = despublicarPublicacionSchema.safeParse({
        motivo_despublicacion: 'a'.repeat(500),
      });

      expect(resultado.success).toBe(true);
    });
  });

  describe('definirPrecioLista', () => {
    const COSTO = new Prisma.Decimal(15000000);

    /** La publicación tal como la lee `definirPrecioLista` dentro del tx. */
    const prepararPrecio = (
      estadoComercial: EstadoComercial,
      vigente = true,
    ) => {
      tx.pUBLICACIONUNIDAD.findUnique.mockResolvedValue({
        vigente,
        estado_comercial: estadoComercial,
        unidadFuncional: { costo: COSTO },
      });
      tx.pUBLICACIONUNIDAD.updateMany.mockResolvedValue({ count: 1 });
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(detalleMock());
    };

    const definir = (body: Record<string, unknown>) =>
      service.definirPrecioLista(
        7,
        definirPrecioListaSchema.parse(body),
        USUARIO_ID,
      );

    /** `data` de la N-ésima llamada a `tx.pUBLICACIONUNIDAD.updateMany`. */
    const dataDeUpdate = (llamada: number) =>
      (tx.pUBLICACIONUNIDAD.updateMany.mock.calls as Args[][])[llamada][0]
        .data as Record<string, unknown>;

    it('en preparación: guarda el precio y pasa a DISPONIBLE dentro de la misma transacción', async () => {
      prepararPrecio(EstadoComercial.EN_PREPARACION);

      await definir({ precio_lista: 19000000 });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.pUBLICACIONUNIDAD.updateMany).not.toHaveBeenCalled();
      expect(tx.pUBLICACIONUNIDAD.updateMany).toHaveBeenCalledTimes(2);

      // 1) El precio, con lock optimista sobre el estado leído.
      const precio = primerArgumento(tx.pUBLICACIONUNIDAD.updateMany);
      expect(precio.where).toEqual({
        id_publicacion: 7,
        vigente: true,
        estado_comercial: EstadoComercial.EN_PREPARACION,
      });
      expect((dataDeUpdate(0).precio_lista as Prisma.Decimal).toFixed(2)).toBe(
        '19000000.00',
      );
      expect(dataDeUpdate(0).FK_usuario_actualizador).toBe(USUARIO_ID);

      // 2) La transición EN_PREPARACION -> DISPONIBLE.
      expect(dataDeUpdate(1).estado_comercial).toBe(EstadoComercial.DISPONIBLE);
    });

    it('disponible: actualiza el precio sin transicionar', async () => {
      prepararPrecio(EstadoComercial.DISPONIBLE);

      await definir({ precio_lista: 21000000 });

      expect(tx.pUBLICACIONUNIDAD.updateMany).toHaveBeenCalledTimes(1);
      expect(primerArgumento(tx.pUBLICACIONUNIDAD.updateMany).where).toEqual({
        id_publicacion: 7,
        vigente: true,
        estado_comercial: EstadoComercial.DISPONIBLE,
      });
      expect(dataDeUpdate(0)).not.toHaveProperty('estado_comercial');
    });

    it('precio cargado directo: calcula el porcentaje sobre el costo y deja el margen vacío', async () => {
      prepararPrecio(EstadoComercial.DISPONIBLE);

      // (19.000.000 - 15.000.000) / 15.000.000 * 100 = 26,666... -> 26,67
      await definir({ precio_lista: 19000000 });

      const data = dataDeUpdate(0);
      expect((data.porcentaje_ganancia as Prisma.Decimal).toFixed(2)).toBe(
        '26.67',
      );
      expect(data.margen).toBeNull();
    });

    it('con la ayuda de cálculo: guarda porcentaje y margen tal cual vinieron', async () => {
      prepararPrecio(EstadoComercial.DISPONIBLE);

      await definir({
        precio_lista: 20000000,
        porcentaje_ganancia: 30,
        margen: 500000,
      });

      const data = dataDeUpdate(0);
      expect((data.porcentaje_ganancia as Prisma.Decimal).toFixed(2)).toBe(
        '30.00',
      );
      expect((data.margen as Prisma.Decimal).toFixed(2)).toBe('500000.00');
    });

    it('con solo uno de los dos (margen), el otro queda vacío y no se calcula nada', async () => {
      prepararPrecio(EstadoComercial.DISPONIBLE);

      await definir({ precio_lista: 15500000, margen: 500000 });

      const data = dataDeUpdate(0);
      expect(data.porcentaje_ganancia).toBeNull();
      expect((data.margen as Prisma.Decimal).toFixed(2)).toBe('500000.00');
    });

    it('precio menor al costo: lo guarda igual, con porcentaje y margen vacíos, y la respuesta lo advierte', async () => {
      prepararPrecio(EstadoComercial.EN_PREPARACION);

      const resultado = await definir({ precio_lista: 10000000 });

      const data = dataDeUpdate(0);
      expect((data.precio_lista as Prisma.Decimal).toFixed(2)).toBe(
        '10000000.00',
      );
      expect(data.porcentaje_ganancia).toBeNull();
      expect(data.margen).toBeNull();
      expect(resultado.warning).toContain('menor al costo');
      expect(resultado.warning).toContain('15000000.00');
    });

    it('sin warning cuando el precio cubre el costo, y devuelve el detalle', async () => {
      prepararPrecio(EstadoComercial.DISPONIBLE);

      const resultado = await definir({ precio_lista: 19000000 });

      expect(resultado.warning).toBeNull();
      expect(resultado.id_publicacion).toBe(7);
      expect(resultado.condicion_entrega.codigo).toBe('A_ENTREGAR_CON_FECHA');
    });

    it('si el porcentaje calculado no entra en la columna (más de 999,99 %), lo deja vacío en vez de fallar', async () => {
      prepararPrecio(EstadoComercial.DISPONIBLE);

      // (200.000.000 - 15.000.000) / 15.000.000 * 100 = 1233,33 %
      await definir({ precio_lista: 200000000 });

      expect(dataDeUpdate(0).porcentaje_ganancia).toBeNull();
    });

    it('nunca modifica el costo de la unidad: solo escribe precio, porcentaje, margen y auditoría', async () => {
      prepararPrecio(EstadoComercial.DISPONIBLE);

      await definir({ precio_lista: 19000000 });

      expect(Object.keys(dataDeUpdate(0)).sort()).toEqual([
        'FK_usuario_actualizador',
        'hora_actualizacion',
        'margen',
        'porcentaje_ganancia',
        'precio_lista',
      ]);
    });

    it.each([EstadoComercial.EN_PLAN_DE_PAGO, EstadoComercial.VENDIDA])(
      'rechaza con 409 si la unidad está %s, sin escribir nada',
      async (estadoComercial) => {
        prepararPrecio(estadoComercial);

        await expect(
          definir({ precio_lista: 19000000 }),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(tx.pUBLICACIONUNIDAD.updateMany).not.toHaveBeenCalled();
      },
    );

    it('rechaza con 409 una publicación despublicada', async () => {
      prepararPrecio(EstadoComercial.DISPONIBLE, false);

      await expect(definir({ precio_lista: 19000000 })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(tx.pUBLICACIONUNIDAD.updateMany).not.toHaveBeenCalled();
    });

    it('rechaza con 404 si la publicación no existe', async () => {
      tx.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(null);

      await expect(definir({ precio_lista: 19000000 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('si la publicación cambió entre la lectura y la escritura (count 0), rechaza sin transicionar', async () => {
      prepararPrecio(EstadoComercial.EN_PREPARACION);
      tx.pUBLICACIONUNIDAD.updateMany.mockResolvedValue({ count: 0 });

      await expect(definir({ precio_lista: 19000000 })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(tx.pUBLICACIONUNIDAD.updateMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('precio de lista (schema del DTO)', () => {
    it.each<[string, Record<string, unknown>]>([
      ['sin precio', {}],
      ['con precio 0', { precio_lista: 0 }],
      ['con precio negativo', { precio_lista: -1 }],
      ['con más de dos decimales', { precio_lista: 100.123 }],
      [
        'con porcentaje negativo',
        { precio_lista: 100, porcentaje_ganancia: -1 },
      ],
      [
        'con porcentaje mayor a 999,99',
        { precio_lista: 100, porcentaje_ganancia: 1000 },
      ],
      ['con margen negativo', { precio_lista: 100, margen: -1 }],
    ])('rechaza un body %s', (_caso, body) => {
      expect(definirPrecioListaSchema.safeParse(body).success).toBe(false);
    });

    it('acepta porcentaje y margen en null (precio cargado directo)', () => {
      const resultado = definirPrecioListaSchema.safeParse({
        precio_lista: 19000000,
        porcentaje_ganancia: null,
        margen: null,
      });

      expect(resultado.success).toBe(true);
    });
  });

  describe('transicionarEstadoComercial', () => {
    const TRANSICIONES: [EstadoComercial, EstadoComercial][] = [
      ['EN_PREPARACION', 'DISPONIBLE'],
      ['DISPONIBLE', 'EN_PLAN_DE_PAGO'],
      ['EN_PLAN_DE_PAGO', 'DISPONIBLE'],
      ['EN_PLAN_DE_PAGO', 'VENDIDA'],
      ['VENDIDA', 'EN_PLAN_DE_PAGO'],
    ];

    const transicionar = (desde: EstadoComercial, hacia: EstadoComercial) =>
      service.transicionarEstadoComercial(
        tx as unknown as Prisma.TransactionClient,
        7,
        desde,
        hacia,
        USUARIO_ID,
      );

    it.each(TRANSICIONES)('%s -> %s: permitida', async (desde, hacia) => {
      tx.pUBLICACIONUNIDAD.updateMany.mockResolvedValue({ count: 1 });

      await expect(transicionar(desde, hacia)).resolves.toBeUndefined();

      const args = primerArgumento(tx.pUBLICACIONUNIDAD.updateMany);
      expect(args.where).toEqual({
        id_publicacion: 7,
        vigente: true,
        estado_comercial: desde,
      });
      expect(args.data).toEqual({
        estado_comercial: hacia,
        FK_usuario_actualizador: USUARIO_ID,
        hora_actualizacion: expect.any(Date) as Date,
      });
    });

    it('usa el tx recibido y no abre ninguna transacción propia', async () => {
      tx.pUBLICACIONUNIDAD.updateMany.mockResolvedValue({ count: 1 });

      await transicionar('EN_PREPARACION', 'DISPONIBLE');

      expect(tx.pUBLICACIONUNIDAD.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.pUBLICACIONUNIDAD.updateMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it.each<[EstadoComercial, EstadoComercial]>([
      ['VENDIDA', 'DISPONIBLE'],
      ['EN_PREPARACION', 'VENDIDA'],
      ['EN_PREPARACION', 'EN_PLAN_DE_PAGO'],
      ['DISPONIBLE', 'VENDIDA'],
      ['DISPONIBLE', 'DISPONIBLE'],
      // Desde T133 ya no existe: el precio de lista no se puede quitar.
      ['DISPONIBLE', 'EN_PREPARACION'],
    ])(
      '%s -> %s: fuera del mapa, lanza un Error de programación sin tocar la base',
      async (desde, hacia) => {
        const error = await transicionar(desde, hacia).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(HttpException);
        expect((error as Error).message).toContain(
          'Transición de estado comercial no permitida',
        );
        expect(tx.pUBLICACIONUNIDAD.updateMany).not.toHaveBeenCalled();
      },
    );

    it('si el updateMany no actualiza ninguna fila (count 0), lanza ConflictException', async () => {
      tx.pUBLICACIONUNIDAD.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        transicionar('EN_PREPARACION', 'DISPONIBLE'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findOne', () => {
    it('falla con NotFoundException si la publicación no existe', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('devuelve la condición de entrega calculada y las superficies como number', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(
        detalleMock('FINALIZADO'),
      );

      const resultado = await service.findOne(7);

      expect(resultado.condicion_entrega).toEqual({
        codigo: 'TERMINADA',
        texto: 'Terminada, disponible para entrega inmediata',
        fecha_referencia: FECHA_FIN,
      });
      expect(resultado.unidad.superficie_cubierta).toBe(45);
      expect(resultado.unidad.superficie_descubierta).toBe(6.5);
      expect(resultado.imagenes).toHaveLength(1);
    });

    it('el select de la unidad incluye costo y ordena las imágenes por orden ascendente', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(detalleMock());

      await service.findOne(7);

      const args = primerArgumento(prisma.pUBLICACIONUNIDAD.findUnique);
      const unidadSelect = (
        args.select as { unidadFuncional: { select: Args } }
      ).unidadFuncional.select;
      // El detalle es de la pantalla interna (rol ADMINISTRADOR) y es la
      // única lectura de PUBLICACIONUNIDAD que expone el costo: lo necesita
      // Comercialización para armar los planes de pago (HU-22).
      expect(unidadSelect.costo).toBe(true);
      expect(unidadSelect.imagenes).toEqual({
        select: { id_imagen_unidad: true, url: true, orden: true },
        orderBy: { orden: 'asc' },
      });
    });

    it('el select trae precio de lista, porcentaje de ganancia y margen', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(detalleMock());

      await service.findOne(7);

      const select = primerArgumento(prisma.pUBLICACIONUNIDAD.findUnique)
        .select as Args;
      expect(select).toMatchObject({
        precio_lista: true,
        porcentaje_ganancia: true,
        margen: true,
      });
    });

    it('devuelve el costo de la unidad en el detalle', async () => {
      prisma.pUBLICACIONUNIDAD.findUnique.mockResolvedValue(detalleMock());

      const resultado = await service.findOne(7);

      // Sigue siendo un Decimal: serializa a string por HTTP, igual que
      // `precio` en los planes de pago (ver `unidadDetalleSchema`).
      expect(resultado.unidad.costo).toStrictEqual(
        new Prisma.Decimal(15000000),
      );
    });
  });

  describe('findAll', () => {
    it('sin filtro de vigencia no filtra: devuelve también el historial', async () => {
      await service.findAll({ page: 1, limit: 10 });

      expect(primerArgumento(prisma.pUBLICACIONUNIDAD.findMany).where).toEqual(
        {},
      );
    });

    it('con vigente=false filtra por publicaciones no vigentes', async () => {
      await service.findAll({ vigente: false, page: 1, limit: 10 });

      expect(primerArgumento(prisma.pUBLICACIONUNIDAD.findMany).where).toEqual({
        vigente: false,
      });
    });

    it('combina los filtros de vigencia, estado comercial, proyecto y tipología', async () => {
      await service.findAll({
        vigente: true,
        estado_comercial: EstadoComercial.DISPONIBLE,
        FK_proyecto: 3,
        tipologia: TipologiaUnidad.COCHERA,
        page: 1,
        limit: 10,
      });

      const where = {
        vigente: true,
        estado_comercial: 'DISPONIBLE',
        unidadFuncional: { FK_proyecto: 3, tipologia: 'COCHERA' },
      };
      expect(primerArgumento(prisma.pUBLICACIONUNIDAD.findMany).where).toEqual(
        where,
      );
      expect(prisma.pUBLICACIONUNIDAD.count).toHaveBeenCalledWith({ where });
    });

    it('el select trae precio de lista, porcentaje de ganancia y margen', async () => {
      await service.findAll({ page: 1, limit: 10 });

      const select = primerArgumento(prisma.pUBLICACIONUNIDAD.findMany)
        .select as Args;
      expect(select).toMatchObject({
        precio_lista: true,
        porcentaje_ganancia: true,
        margen: true,
      });
    });

    it('calcula skip y take a partir de page y limit, y devuelve meta', async () => {
      prisma.pUBLICACIONUNIDAD.count.mockResolvedValue(42);

      const resultado = await service.findAll({ page: 3, limit: 5 });

      const args = primerArgumento(prisma.pUBLICACIONUNIDAD.findMany);
      expect(args.skip).toBe(10);
      expect(args.take).toBe(5);
      expect(resultado.meta).toEqual({ total: 42, page: 3, limit: 5 });
    });
  });

  describe('findUnidadesPublicables', () => {
    const unidadMock = (estadoProyecto: EstadoProyecto, id = 1) => ({
      id_unidad_funcional: id,
      identificador: `U${id}`,
      tipologia: TipologiaUnidad.UN_DORMITORIO,
      superficie_cubierta: new Prisma.Decimal(45),
      superficie_descubierta: null,
      piso: null,
      comodidades: null,
      proyecto: {
        id_proyecto: 1,
        codigo: 'PROY-X',
        nombre: 'Proyecto X',
        estado_obra: estadoProyecto,
      },
    });

    it('el where exige unidad activa, proyecto no cancelado y ninguna publicación vigente', async () => {
      await service.findUnidadesPublicables({ page: 1, limit: 10 });

      const where = {
        estado: true,
        proyecto: { estado_obra: { not: 'CANCELADO' } },
        publicaciones: { none: { vigente: true } },
      };
      expect(primerArgumento(prisma.uNIDADFUNCIONAL.findMany).where).toEqual(
        where,
      );
      expect(prisma.uNIDADFUNCIONAL.count).toHaveBeenCalledWith({ where });
    });

    it('aplica los filtros de proyecto y tipología', async () => {
      await service.findUnidadesPublicables({
        FK_proyecto: 4,
        tipologia: TipologiaUnidad.LOCAL_COMERCIAL,
        page: 1,
        limit: 10,
      });

      expect(primerArgumento(prisma.uNIDADFUNCIONAL.findMany).where).toEqual({
        estado: true,
        proyecto: { estado_obra: { not: 'CANCELADO' } },
        publicaciones: { none: { vigente: true } },
        FK_proyecto: 4,
        tipologia: 'LOCAL_COMERCIAL',
      });
    });

    it('marca publicable: false las de proyecto EN_PLANIFICACION, con el mismo mensaje que rechaza publicar', async () => {
      prisma.uNIDADFUNCIONAL.findMany.mockResolvedValue([
        unidadMock('EN_PLANIFICACION'),
      ]);
      const [item] = (
        await service.findUnidadesPublicables({ page: 1, limit: 10 })
      ).data;

      expect(item.publicable).toBe(false);
      expect(item.motivo_no_publicable).toBe(MENSAJE_EN_PLANIFICACION);

      // Y es exactamente el mensaje con el que `publicar` rechaza esa unidad.
      prepararPublicar('EN_PLANIFICACION');
      const error = await service
        .publicar({ FK_unidad_funcional: 12 }, USUARIO_ID)
        .catch((e: unknown) => e);
      expect((error as ConflictException).message).toBe(
        item.motivo_no_publicable,
      );
    });

    it.each<EstadoProyecto>(['EN_EJECUCION', 'FINALIZADO'])(
      'marca publicable: true, sin motivo, las de proyecto %s',
      async (estadoProyecto) => {
        prisma.uNIDADFUNCIONAL.findMany.mockResolvedValue([
          unidadMock(estadoProyecto),
        ]);

        const [item] = (
          await service.findUnidadesPublicables({ page: 1, limit: 10 })
        ).data;

        expect(item.publicable).toBe(true);
        expect(item.motivo_no_publicable).toBeNull();
        expect(item.unidad.superficie_cubierta).toBe(45);
      },
    );

    it('calcula skip y take a partir de page y limit, y devuelve meta', async () => {
      prisma.uNIDADFUNCIONAL.count.mockResolvedValue(25);

      const resultado = await service.findUnidadesPublicables({
        page: 2,
        limit: 20,
      });

      const args = primerArgumento(prisma.uNIDADFUNCIONAL.findMany);
      expect(args.skip).toBe(20);
      expect(args.take).toBe(20);
      expect(resultado.meta).toEqual({ total: 25, page: 2, limit: 20 });
    });

    it('nunca selecciona costo', async () => {
      await service.findUnidadesPublicables({ page: 1, limit: 10 });

      expect(
        JSON.stringify(primerArgumento(prisma.uNIDADFUNCIONAL.findMany)),
      ).not.toContain('costo');
    });
  });
});
