import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  EstadoProyecto,
  TipologiaUnidad,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { UnidadFuncionalService } from './unidad-funcional.service';
import { QueryUnidadFuncionalDto } from './dto/query-unidad-funcional.dto';
import {
  unidadFuncionalDetalleResponseSchema,
  unidadFuncionalListItemSchema,
} from './dto/unidad-funcional-response.dto';

type Args = Record<string, unknown>;

/** Primer argumento con el que se llamó a un mock, ya tipado. */
const primerArgumento = (mock: jest.Mock): Args =>
  (mock.mock.calls as Args[][])[0][0];

/** Mensaje con el que se rechazó una operación (falla si no se rechazó con un 409). */
async function mensajeDeRechazo(operacion: Promise<unknown>): Promise<string> {
  const error: unknown = await operacion.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ConflictException);
  return (error as ConflictException).message;
}

describe('UnidadFuncionalService', () => {
  let service: UnidadFuncionalService;

  // `tx` es un objeto DISTINTO de `prisma`: así cada test puede afirmar sobre
  // qué cliente corrió cada operación (lo que pasa dentro de la transacción
  // vs. la lectura final del detalle).
  let tx: {
    $queryRaw: jest.Mock;
    uNIDADFUNCIONAL: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    pUBLICACIONUNIDAD: { findFirst: jest.Mock };
    iMAGENUNIDAD: {
      aggregate: jest.Mock;
      create: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let prisma: {
    $transaction: jest.Mock;
    pROYECTO: { findUnique: jest.Mock };
    uNIDADFUNCIONAL: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
  };

  const USUARIO_ID = 7;
  const ID_UNIDAD = 10;
  const FECHA_FIN = new Date('2027-12-01');

  const DTO_ALTA = {
    FK_proyecto: 1,
    identificador: '3A',
    tipologia: TipologiaUnidad.DOS_DORMITORIOS,
    superficie_cubierta: 55.5,
    costo: 100000,
  };

  const query = (
    sobrescribe: Partial<QueryUnidadFuncionalDto> = {},
  ): QueryUnidadFuncionalDto => ({ page: 1, limit: 10, ...sobrescribe });

  const proyectoMock = (
    estado: EstadoProyecto = EstadoProyecto.EN_PLANIFICACION,
    fechaFin: Date | null = FECHA_FIN,
  ) => ({
    id_proyecto: 1,
    codigo: 'PROY-TN',
    nombre: 'Torre Nogal',
    estado,
    fecha_fin_estimada: fechaFin,
  });

  /** Lo que devuelve `bloquearUnidad` (la fila ya lockeada). */
  const filaBloqueada = (sobrescribe: Args = {}) => ({
    FK_proyecto: 1,
    identificador: '3A',
    costo: new Prisma.Decimal('100000'),
    estado: true,
    proyecto: { estado: EstadoProyecto.EN_PLANIFICACION },
    _count: { publicaciones: 0 },
    ...sobrescribe,
  });

  /** Lo que devuelve la lectura del detalle al final de cada operación. */
  const detalleMock = (sobrescribe: Args = {}) => ({
    id_unidad_funcional: ID_UNIDAD,
    FK_proyecto: 1,
    identificador: '3A',
    tipologia: TipologiaUnidad.DOS_DORMITORIOS,
    superficie_cubierta: new Prisma.Decimal('55.5'),
    superficie_descubierta: null,
    piso: '3',
    comodidades: null,
    observaciones: null,
    costo: new Prisma.Decimal('100000'),
    estado: true,
    hora_creacion: new Date('2026-09-18'),
    hora_actualizacion: null,
    FK_usuario_creador: USUARIO_ID,
    FK_usuario_actualizador: USUARIO_ID,
    usuarioCreador: { nombre: 'Ada', apellido: 'Lovelace' },
    usuarioActualizador: { nombre: 'Ada', apellido: 'Lovelace' },
    proyecto: proyectoMock(),
    imagenes: [],
    _count: { publicaciones: 0 },
    ...sobrescribe,
  });

  beforeEach(async () => {
    tx = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([{ id_unidad_funcional: ID_UNIDAD }]),
      uNIDADFUNCIONAL: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      pUBLICACIONUNIDAD: { findFirst: jest.fn().mockResolvedValue(null) },
      iMAGENUNIDAD: {
        aggregate: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    prisma = {
      $transaction: jest.fn(),
      pROYECTO: { findUnique: jest.fn() },
      uNIDADFUNCIONAL: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(detalleMock()),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    prisma.$transaction.mockImplementation((cb: (t: unknown) => unknown) =>
      cb(tx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnidadFuncionalService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UnidadFuncionalService);
  });

  describe('catálogo de tipologías', () => {
    it('trae las siete tipologías del enum, con su etiqueta legible', () => {
      const catalogo = service.findTipologias();

      expect(catalogo.map((item) => item.id)).toEqual([
        'MONOAMBIENTE',
        'UN_DORMITORIO',
        'DOS_DORMITORIOS',
        'TRES_DORMITORIOS',
        'LOCAL_COMERCIAL',
        'COCHERA',
        'OTRO',
      ]);
      expect(catalogo[1]).toEqual({
        id: 'UN_DORMITORIO',
        code: '1 dormitorio',
        metadata: {},
      });
    });
  });

  describe('alta', () => {
    beforeEach(() => {
      prisma.pROYECTO.findUnique.mockResolvedValue({
        estado: EstadoProyecto.EN_PLANIFICACION,
      });
      prisma.uNIDADFUNCIONAL.create.mockResolvedValue({
        id_unidad_funcional: ID_UNIDAD,
      });
    });

    it('crea la unidad, completa la auditoría con el usuario autenticado y devuelve el detalle', async () => {
      const resultado = await service.create(DTO_ALTA, USUARIO_ID);

      const { data } = primerArgumento(prisma.uNIDADFUNCIONAL.create) as {
        data: Args;
      };
      expect(data).toMatchObject({
        ...DTO_ALTA,
        FK_usuario_creador: USUARIO_ID,
        FK_usuario_actualizador: USUARIO_ID,
      });
      expect(resultado.id_unidad_funcional).toBe(ID_UNIDAD);
      // Los importes salen como número, no como Decimal.
      expect(resultado.costo).toBe(100000);
      expect(resultado.superficie_cubierta).toBe(55.5);
    });

    it('rechaza un identificador repetido entre las unidades activas del mismo proyecto', async () => {
      prisma.uNIDADFUNCIONAL.findFirst.mockResolvedValue({
        id_unidad_funcional: 99,
      });

      const mensaje = await mensajeDeRechazo(
        service.create(DTO_ALTA, USUARIO_ID),
      );

      expect(mensaje).toContain('3A');
      expect(prisma.uNIDADFUNCIONAL.create).not.toHaveBeenCalled();
    });

    // El mismo identificador en otro proyecto, o el de una unidad dada de
    // baja, se aceptan porque la búsqueda de duplicados se acota a ESTE
    // proyecto y a las ACTIVAS.
    it('busca duplicados solo entre las unidades activas del mismo proyecto', async () => {
      await service.create(DTO_ALTA, USUARIO_ID);

      const { where } = primerArgumento(prisma.uNIDADFUNCIONAL.findFirst) as {
        where: Args;
      };
      expect(where.FK_proyecto).toBe(1);
      expect(where.estado).toBe(true);
      expect(where.identificador).toEqual({
        equals: '3A',
        mode: 'insensitive',
      });
      expect(where.id_unidad_funcional).toBeUndefined();
    });

    it.each([
      EstadoProyecto.EN_EJECUCION,
      EstadoProyecto.FINALIZADO,
      EstadoProyecto.CANCELADO,
    ])('rechaza el alta si el proyecto está %s', async (estado) => {
      prisma.pROYECTO.findUnique.mockResolvedValue({ estado });

      const mensaje = await mensajeDeRechazo(
        service.create(DTO_ALTA, USUARIO_ID),
      );

      expect(mensaje).toContain('En planificación');
      expect(prisma.uNIDADFUNCIONAL.create).not.toHaveBeenCalled();
    });

    it('rechaza el alta si el proyecto no existe', async () => {
      prisma.pROYECTO.findUnique.mockResolvedValue(null);

      await expect(service.create(DTO_ALTA, USUARIO_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listado', () => {
    beforeEach(() => {
      prisma.uNIDADFUNCIONAL.findMany.mockResolvedValue([detalleMock()]);
      prisma.uNIDADFUNCIONAL.count.mockResolvedValue(1);
    });

    it('combina los filtros de proyecto, tipología y rango de superficie, con paginación', async () => {
      await service.findAll(
        query({
          FK_proyecto: 1,
          tipologia: TipologiaUnidad.DOS_DORMITORIOS,
          superficie_min: 40,
          superficie_max: 60,
          page: 3,
          limit: 5,
        }),
      );

      const args = primerArgumento(prisma.uNIDADFUNCIONAL.findMany);
      expect(args.where).toEqual({
        estado: true,
        FK_proyecto: 1,
        tipologia: TipologiaUnidad.DOS_DORMITORIOS,
        superficie_cubierta: { gte: 40, lte: 60 },
      });
      expect(args.skip).toBe(10);
      expect(args.take).toBe(5);
      // El orden por defecto es fijo: por proyecto y, dentro, el de carga.
      expect(args.orderBy).toEqual([
        { FK_proyecto: 'asc' },
        { id_unidad_funcional: 'asc' },
      ]);
    });

    it('el rango de superficie admite solo mínimo o solo máximo', async () => {
      await service.findAll(query({ superficie_min: 40 }));
      await service.findAll(query({ superficie_max: 60 }));

      const llamadas = prisma.uNIDADFUNCIONAL.findMany.mock.calls as [
        { where: Args },
      ][];
      expect(llamadas[0][0].where.superficie_cubierta).toEqual({ gte: 40 });
      expect(llamadas[1][0].where.superficie_cubierta).toEqual({ lte: 60 });
    });

    it('sin filtro de estado trae solo las activas; con `todos`, activas y dadas de baja', async () => {
      await service.findAll(query());
      await service.findAll(query({ estado: 'todos' }));
      await service.findAll(query({ estado: false }));

      const llamadas = prisma.uNIDADFUNCIONAL.findMany.mock.calls as [
        { where: Args },
      ][];
      expect(llamadas[0][0].where.estado).toBe(true);
      expect(llamadas[1][0].where).not.toHaveProperty('estado');
      expect(llamadas[2][0].where.estado).toBe(false);
    });

    it('devuelve `data` y `meta`, con los importes como número y el costo editable derivado', async () => {
      prisma.uNIDADFUNCIONAL.findMany.mockResolvedValue([
        detalleMock({ _count: { publicaciones: 2 } }),
      ]);
      prisma.uNIDADFUNCIONAL.count.mockResolvedValue(21);

      const { data, meta } = await service.findAll(
        query({ page: 2, limit: 10 }),
      );

      expect(meta).toEqual({ total: 21, page: 2, limit: 10 });
      expect(data[0].costo).toBe(100000);
      expect(data[0].costo_editable).toBe(false);
      expect(data[0].proyecto.id_proyecto).toBe(1);
    });
  });

  describe('detalle', () => {
    it('rechaza una unidad que no existe', async () => {
      prisma.uNIDADFUNCIONAL.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('un proyecto sin fecha de finalización estimada muestra "A entregar, fecha a confirmar"', async () => {
      prisma.uNIDADFUNCIONAL.findUnique.mockResolvedValue(
        detalleMock({
          proyecto: proyectoMock(EstadoProyecto.EN_PLANIFICACION, null),
        }),
      );

      const { condicion_entrega } = await service.findOne(ID_UNIDAD);

      expect(condicion_entrega.texto).toBe('A entregar, fecha a confirmar');
      expect(condicion_entrega.fecha_referencia).toBeNull();
    });

    it('con fecha estimada, la condición de entrega la incluye como referencia', async () => {
      const { condicion_entrega } = await service.findOne(ID_UNIDAD);

      expect(condicion_entrega.codigo).toBe('A_ENTREGAR_CON_FECHA');
      expect(condicion_entrega.fecha_referencia).toEqual(FECHA_FIN);
    });

    it('una unidad sin publicaciones tiene el costo editable, sin motivo', async () => {
      const unidad = await service.findOne(ID_UNIDAD);

      expect(unidad.costo_editable).toBe(true);
      expect(unidad.motivo_costo_no_editable).toBeNull();
    });

    it('una unidad que tuvo publicaciones tiene el costo bloqueado, con el motivo listo para mostrar', async () => {
      prisma.uNIDADFUNCIONAL.findUnique.mockResolvedValue(
        detalleMock({ _count: { publicaciones: 1 } }),
      );

      const unidad = await service.findOne(ID_UNIDAD);

      expect(unidad.costo_editable).toBe(false);
      expect(unidad.motivo_costo_no_editable).toContain(
        'margen de Comercialización',
      );
    });
  });

  describe('edición y costo congelado', () => {
    it('permite cambiar el costo de una unidad sin publicaciones, y audita', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(filaBloqueada());

      await service.update(ID_UNIDAD, { costo: 120000 }, USUARIO_ID);

      const { data } = primerArgumento(tx.uNIDADFUNCIONAL.update) as {
        data: Args;
      };
      expect(data.costo).toBe(120000);
      expect(data.FK_usuario_actualizador).toBe(USUARIO_ID);
      expect(data.hora_actualizacion).toBeInstanceOf(Date);
    });

    // "Vigente o histórica" da lo mismo: no hay columna que marque el costo
    // como congelado, se deriva de que exista alguna publicación (cualquiera).
    it('rechaza cambiar el costo de una unidad con alguna publicación, y explica el margen de Comercialización', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(
        filaBloqueada({ _count: { publicaciones: 1 } }),
      );

      const mensaje = await mensajeDeRechazo(
        service.update(ID_UNIDAD, { costo: 120000 }, USUARIO_ID),
      );

      expect(mensaje).toContain('margen de Comercialización');
      expect(mensaje).toContain('nunca sobre el costo');
      expect(tx.uNIDADFUNCIONAL.update).not.toHaveBeenCalled();
    });

    it('no falla si el formulario reenvía el mismo costo de una unidad publicada', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(
        filaBloqueada({ _count: { publicaciones: 1 } }),
      );

      await expect(
        service.update(ID_UNIDAD, { costo: 100000, piso: '4' }, USUARIO_ID),
      ).resolves.toBeDefined();
    });

    it('con el proyecto En ejecución, y aun publicada, se siguen editando las características descriptivas', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(
        filaBloqueada({
          proyecto: { estado: EstadoProyecto.EN_EJECUCION },
          _count: { publicaciones: 1 },
        }),
      );

      await expect(
        service.update(ID_UNIDAD, { comodidades: 'Balcón' }, USUARIO_ID),
      ).resolves.toBeDefined();
    });

    it('toma el lock de la fila antes de editar', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(filaBloqueada());

      await service.update(ID_UNIDAD, { piso: '4' }, USUARIO_ID);

      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('al cambiar el identificador, valida que esté libre entre las activas del proyecto, sin contarse a sí misma', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(filaBloqueada());

      await service.update(ID_UNIDAD, { identificador: '4B' }, USUARIO_ID);

      const { where } = primerArgumento(tx.uNIDADFUNCIONAL.findFirst) as {
        where: Args;
      };
      expect(where.FK_proyecto).toBe(1);
      expect(where.estado).toBe(true);
      expect(where.id_unidad_funcional).toEqual({ not: ID_UNIDAD });
    });

    it('rechaza un identificador que ya usa otra unidad activa del proyecto', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(filaBloqueada());
      tx.uNIDADFUNCIONAL.findFirst.mockResolvedValue({
        id_unidad_funcional: 99,
      });

      await mensajeDeRechazo(
        service.update(ID_UNIDAD, { identificador: '4B' }, USUARIO_ID),
      );
    });

    it('si el identificador no cambia, no vuelve a buscar duplicados', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(filaBloqueada());

      await service.update(ID_UNIDAD, { identificador: '3A' }, USUARIO_ID);

      expect(tx.uNIDADFUNCIONAL.findFirst).not.toHaveBeenCalled();
    });

    it('rechaza editar una unidad dada de baja', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(
        filaBloqueada({ estado: false }),
      );

      const mensaje = await mensajeDeRechazo(
        service.update(ID_UNIDAD, { piso: '4' }, USUARIO_ID),
      );

      expect(mensaje).toContain('dada de baja');
    });

    it('rechaza editar una unidad de un proyecto Cancelado', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(
        filaBloqueada({ proyecto: { estado: EstadoProyecto.CANCELADO } }),
      );

      const mensaje = await mensajeDeRechazo(
        service.update(ID_UNIDAD, { piso: '4' }, USUARIO_ID),
      );

      expect(mensaje).toContain('Cancelado');
    });

    it('rechaza editar una unidad que no existe', async () => {
      tx.$queryRaw.mockResolvedValue([]);

      await expect(
        service.update(99, { piso: '4' }, USUARIO_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('baja', () => {
    it('da de baja una unidad de un proyecto En planificación sin publicación vigente, y audita', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(filaBloqueada());

      await service.baja(ID_UNIDAD, USUARIO_ID);

      const { data } = primerArgumento(tx.uNIDADFUNCIONAL.update) as {
        data: Args;
      };
      expect(data.estado).toBe(false);
      expect(data.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('rechaza la baja con una publicación vigente, e indica que primero hay que despublicarla', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(filaBloqueada());
      tx.pUBLICACIONUNIDAD.findFirst.mockResolvedValue({ id_publicacion: 5 });

      const mensaje = await mensajeDeRechazo(
        service.baja(ID_UNIDAD, USUARIO_ID),
      );

      expect(mensaje).toContain('publicación vigente');
      expect(mensaje).toContain('despublicarla');
      expect(mensaje).not.toContain('su proyecto');
      expect(tx.uNIDADFUNCIONAL.update).not.toHaveBeenCalled();
    });

    it.each([
      [EstadoProyecto.EN_EJECUCION, 'En ejecución'],
      [EstadoProyecto.FINALIZADO, 'Finalizado'],
    ])(
      'rechaza la baja con el proyecto %s, con su propio mensaje',
      async (estadoProyecto, etiqueta) => {
        tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(
          filaBloqueada({ proyecto: { estado: estadoProyecto } }),
        );

        const mensaje = await mensajeDeRechazo(
          service.baja(ID_UNIDAD, USUARIO_ID),
        );

        expect(mensaje).toContain(`su proyecto está ${etiqueta}`);
        expect(mensaje).not.toContain('publicación vigente');
        expect(tx.uNIDADFUNCIONAL.update).not.toHaveBeenCalled();
      },
    );

    it('los dos motivos de rechazo tienen mensajes distintos', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValueOnce(filaBloqueada());
      tx.pUBLICACIONUNIDAD.findFirst.mockResolvedValueOnce({
        id_publicacion: 5,
      });
      const porPublicacion = await mensajeDeRechazo(
        service.baja(ID_UNIDAD, USUARIO_ID),
      );

      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValueOnce(
        filaBloqueada({ proyecto: { estado: EstadoProyecto.EN_EJECUCION } }),
      );
      const porProyecto = await mensajeDeRechazo(
        service.baja(ID_UNIDAD, USUARIO_ID),
      );

      expect(porPublicacion).not.toBe(porProyecto);
    });

    it('si se dan los dos motivos a la vez, el mensaje los informa juntos', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(
        filaBloqueada({ proyecto: { estado: EstadoProyecto.EN_EJECUCION } }),
      );
      tx.pUBLICACIONUNIDAD.findFirst.mockResolvedValue({ id_publicacion: 5 });

      const mensaje = await mensajeDeRechazo(
        service.baja(ID_UNIDAD, USUARIO_ID),
      );

      expect(mensaje).toContain('publicación vigente');
      expect(mensaje).toContain('su proyecto está En ejecución');
    });

    it('rechaza dar de baja una unidad que ya está de baja', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(
        filaBloqueada({ estado: false }),
      );

      const mensaje = await mensajeDeRechazo(
        service.baja(ID_UNIDAD, USUARIO_ID),
      );

      expect(mensaje).toContain('ya está dada de baja');
    });

    it('rechaza dar de baja una unidad de un proyecto Cancelado', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(
        filaBloqueada({ proyecto: { estado: EstadoProyecto.CANCELADO } }),
      );

      const mensaje = await mensajeDeRechazo(
        service.baja(ID_UNIDAD, USUARIO_ID),
      );

      expect(mensaje).toContain('Cancelado');
    });

    it('rechaza dar de baja una unidad que no existe', async () => {
      tx.$queryRaw.mockResolvedValue([]);

      await expect(service.baja(99, USUARIO_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reactivación', () => {
    const dadaDeBaja = (sobrescribe: Args = {}) => ({
      FK_proyecto: 1,
      identificador: '3A',
      estado: false,
      proyecto: { estado: EstadoProyecto.EN_PLANIFICACION },
      ...sobrescribe,
    });

    it('reactiva una unidad dada de baja, y audita', async () => {
      prisma.uNIDADFUNCIONAL.findUnique.mockResolvedValueOnce(dadaDeBaja());

      await service.activar(ID_UNIDAD, USUARIO_ID);

      const { data } = primerArgumento(prisma.uNIDADFUNCIONAL.update) as {
        data: Args;
      };
      expect(data.estado).toBe(true);
      expect(data.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('rechaza reactivar una unidad que ya está activa', async () => {
      prisma.uNIDADFUNCIONAL.findUnique.mockResolvedValueOnce(
        dadaDeBaja({ estado: true }),
      );

      const mensaje = await mensajeDeRechazo(
        service.activar(ID_UNIDAD, USUARIO_ID),
      );

      expect(mensaje).toContain('ya está activa');
    });

    it('rechaza reactivar si el proyecto ya no está En planificación', async () => {
      prisma.uNIDADFUNCIONAL.findUnique.mockResolvedValueOnce(
        dadaDeBaja({ proyecto: { estado: EstadoProyecto.EN_EJECUCION } }),
      );

      const mensaje = await mensajeDeRechazo(
        service.activar(ID_UNIDAD, USUARIO_ID),
      );

      expect(mensaje).toContain('En planificación');
    });

    it('rechaza reactivar si otra unidad activa del proyecto tomó el identificador', async () => {
      prisma.uNIDADFUNCIONAL.findUnique.mockResolvedValueOnce(dadaDeBaja());
      prisma.uNIDADFUNCIONAL.findFirst.mockResolvedValue({
        id_unidad_funcional: 99,
      });

      await mensajeDeRechazo(service.activar(ID_UNIDAD, USUARIO_ID));

      expect(prisma.uNIDADFUNCIONAL.update).not.toHaveBeenCalled();
    });

    it('rechaza reactivar una unidad que no existe', async () => {
      prisma.uNIDADFUNCIONAL.findUnique.mockResolvedValueOnce(null);

      await expect(service.activar(99, USUARIO_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('imágenes', () => {
    beforeEach(() => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(filaBloqueada());
    });

    it('sin `orden`, la imagen se agrega al final de la galería', async () => {
      tx.iMAGENUNIDAD.aggregate.mockResolvedValue({ _max: { orden: 2 } });

      await service.agregarImagen(
        ID_UNIDAD,
        { url: 'https://cdn.test/a.png' },
        USUARIO_ID,
      );

      const { data } = primerArgumento(tx.iMAGENUNIDAD.create) as {
        data: Args;
      };
      expect(data).toEqual({
        FK_unidad_funcional: ID_UNIDAD,
        url: 'https://cdn.test/a.png',
        orden: 3,
      });
    });

    it('la primera imagen de una unidad queda con orden 0', async () => {
      tx.iMAGENUNIDAD.aggregate.mockResolvedValue({ _max: { orden: null } });

      await service.agregarImagen(
        ID_UNIDAD,
        { url: 'https://cdn.test/a.png' },
        USUARIO_ID,
      );

      const { data } = primerArgumento(tx.iMAGENUNIDAD.create) as {
        data: Args;
      };
      expect(data.orden).toBe(0);
    });

    it('con `orden` explícito, lo respeta y no consulta el máximo', async () => {
      await service.agregarImagen(
        ID_UNIDAD,
        { url: 'https://cdn.test/a.png', orden: 5 },
        USUARIO_ID,
      );

      const { data } = primerArgumento(tx.iMAGENUNIDAD.create) as {
        data: Args;
      };
      expect(data.orden).toBe(5);
      expect(tx.iMAGENUNIDAD.aggregate).not.toHaveBeenCalled();
    });

    it('agregar una imagen deja auditada la unidad', async () => {
      tx.iMAGENUNIDAD.aggregate.mockResolvedValue({ _max: { orden: null } });

      await service.agregarImagen(
        ID_UNIDAD,
        { url: 'https://cdn.test/a.png' },
        USUARIO_ID,
      );

      const { data } = primerArgumento(tx.uNIDADFUNCIONAL.update) as {
        data: Args;
      };
      expect(data.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('rechaza agregar una imagen a una unidad dada de baja', async () => {
      tx.uNIDADFUNCIONAL.findUnique.mockResolvedValue(
        filaBloqueada({ estado: false }),
      );

      await mensajeDeRechazo(
        service.agregarImagen(
          ID_UNIDAD,
          { url: 'https://cdn.test/a.png' },
          USUARIO_ID,
        ),
      );
      expect(tx.iMAGENUNIDAD.create).not.toHaveBeenCalled();
    });

    it('quita una imagen de la unidad, y deja auditada la unidad', async () => {
      tx.iMAGENUNIDAD.deleteMany.mockResolvedValue({ count: 1 });

      await service.quitarImagen(ID_UNIDAD, 12, USUARIO_ID);

      expect(primerArgumento(tx.iMAGENUNIDAD.deleteMany).where).toEqual({
        id_imagen_unidad: 12,
        FK_unidad_funcional: ID_UNIDAD,
      });
      expect(tx.uNIDADFUNCIONAL.update).toHaveBeenCalledTimes(1);
    });

    it('rechaza quitar una imagen que no pertenece a la unidad', async () => {
      tx.iMAGENUNIDAD.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.quitarImagen(ID_UNIDAD, 99, USUARIO_ID),
      ).rejects.toThrow(NotFoundException);
      expect(tx.uNIDADFUNCIONAL.update).not.toHaveBeenCalled();
    });

    it('reordena la galería: cada imagen queda con su posición como `orden`', async () => {
      tx.iMAGENUNIDAD.findMany.mockResolvedValue([
        { id_imagen_unidad: 10 },
        { id_imagen_unidad: 11 },
        { id_imagen_unidad: 12 },
      ]);

      await service.ordenarImagenes(
        ID_UNIDAD,
        { ids_imagen_unidad: [12, 10, 11] },
        USUARIO_ID,
      );

      expect(tx.iMAGENUNIDAD.update).toHaveBeenCalledTimes(3);
      expect(tx.iMAGENUNIDAD.update).toHaveBeenCalledWith({
        where: { id_imagen_unidad: 12 },
        data: { orden: 0 },
      });
      expect(tx.iMAGENUNIDAD.update).toHaveBeenCalledWith({
        where: { id_imagen_unidad: 10 },
        data: { orden: 1 },
      });
      expect(tx.iMAGENUNIDAD.update).toHaveBeenCalledWith({
        where: { id_imagen_unidad: 11 },
        data: { orden: 2 },
      });
    });

    it.each([
      ['le falta una imagen', [12, 10]],
      ['trae una imagen que no es de la unidad', [12, 10, 99]],
      ['trae de más', [12, 10, 11, 13]],
    ])('rechaza reordenar si la lista %s', async (_caso, ids: number[]) => {
      tx.iMAGENUNIDAD.findMany.mockResolvedValue([
        { id_imagen_unidad: 10 },
        { id_imagen_unidad: 11 },
        { id_imagen_unidad: 12 },
      ]);

      await expect(
        service.ordenarImagenes(
          ID_UNIDAD,
          { ids_imagen_unidad: ids },
          USUARIO_ID,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(tx.iMAGENUNIDAD.update).not.toHaveBeenCalled();
    });
  });

  describe('contrato de respuesta', () => {
    // Sobre HTTP las fechas viajan como string ISO. `.strict()` hace fallar
    // también si el service devuelve una clave que el DTO no documenta: así
    // el Swagger describe exactamente lo que recibe el frontend.
    const comoViajaPorHttp = (valor: unknown): unknown =>
      JSON.parse(JSON.stringify(valor));

    const CAMPOS_DEL_LISTADO = [
      'id_unidad_funcional',
      'FK_proyecto',
      'identificador',
      'tipologia',
      'superficie_cubierta',
      'superficie_descubierta',
      'piso',
      'comodidades',
      'observaciones',
      'costo',
      'estado',
      'proyecto',
      '_count',
    ];

    /** Lo que devuelve el `select` del listado: el detalle, sin auditoría ni galería. */
    const listadoMock = (sobrescribe: Args = {}) => ({
      ...Object.fromEntries(
        Object.entries(detalleMock()).filter(([clave]) =>
          CAMPOS_DEL_LISTADO.includes(clave),
        ),
      ),
      ...sobrescribe,
    });

    it.each([
      ['con el costo editable', 0],
      ['con el costo bloqueado por una publicación', 2],
    ])(
      'el detalle %s cumple el contrato del DTO',
      async (_caso, publicaciones) => {
        prisma.uNIDADFUNCIONAL.findUnique.mockResolvedValue(
          detalleMock({
            _count: { publicaciones },
            imagenes: [
              { id_imagen_unidad: 1, url: 'https://cdn.test/a.png', orden: 0 },
            ],
          }),
        );

        const unidad = await service.findOne(ID_UNIDAD);

        expect(() =>
          unidadFuncionalDetalleResponseSchema
            .strict()
            .parse(comoViajaPorHttp(unidad)),
        ).not.toThrow();
      },
    );

    it('cada ítem del listado cumple el contrato del DTO', async () => {
      prisma.uNIDADFUNCIONAL.findMany.mockResolvedValue([listadoMock()]);
      prisma.uNIDADFUNCIONAL.count.mockResolvedValue(1);

      const { data } = await service.findAll(query());

      expect(() =>
        unidadFuncionalListItemSchema.strict().parse(comoViajaPorHttp(data[0])),
      ).not.toThrow();
    });
  });
});