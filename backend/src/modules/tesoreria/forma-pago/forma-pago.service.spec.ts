import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FormaPagoService } from './forma-pago.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { updateFormaPagoSchema } from './dto/update-forma-pago.dto';
import { queryFormaPagoSchema } from './dto/query-forma-pago.dto';

/** Primer argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = {
  data?: Record<string, unknown>;
  where?: Record<string, unknown>;
};

const primerArgumento = (mock: jest.Mock): ArgumentoPrisma =>
  (mock.mock.calls as ArgumentoPrisma[][])[0][0];

describe('FormaPagoService', () => {
  let service: FormaPagoService;
  let prisma: {
    fORMAPAGO: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
  };

  const USUARIO_ID = 7;

  const formaPagoMock = {
    id_forma_pago: 1,
    nombre: 'Transferencia bancaria',
    descripcion: 'Acreditación en cuenta del proveedor',
    requiere_referencia: true,
    estado: true,
  };

  /**
   * Las tres del seed más una dada de baja: alcanza para distinguir "solo
   * activas" de "todas" sin depender de la base.
   */
  const formasEnLaBase = [
    {
      id_forma_pago: 1,
      nombre: 'Efectivo',
      descripcion: null,
      requiere_referencia: false,
      estado: true,
    },
    {
      id_forma_pago: 2,
      nombre: 'Transferencia bancaria',
      descripcion: null,
      requiere_referencia: true,
      estado: true,
    },
    {
      id_forma_pago: 3,
      nombre: 'Cheque',
      descripcion: null,
      requiere_referencia: true,
      estado: true,
    },
    {
      id_forma_pago: 4,
      nombre: 'Cheque de tercero',
      descripcion: null,
      requiere_referencia: true,
      estado: false,
    },
  ];

  /**
   * `findMany` que filtra de verdad por `where.estado`, en vez de devolver
   * una lista fija: así el test comprueba qué formas de pago salen, no solo
   * cómo quedó armado el `where`.
   */
  const findManyFiltrando = () =>
    jest.fn(({ where }: { where: { estado?: boolean } }) =>
      Promise.resolve(
        formasEnLaBase.filter(
          (forma) =>
            where.estado === undefined || forma.estado === where.estado,
        ),
      ),
    );

  beforeEach(async () => {
    prisma = {
      fORMAPAGO: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormaPagoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(FormaPagoService);
  });

  describe('create', () => {
    it('rechaza un nombre ya usado por una forma de pago activa', async () => {
      prisma.fORMAPAGO.findFirst.mockResolvedValue(formaPagoMock);

      await expect(
        service.create(
          { nombre: 'Transferencia bancaria', requiere_referencia: true },
          USUARIO_ID,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.fORMAPAGO.create).not.toHaveBeenCalled();
    });

    it('persiste requiere_referencia tal como vino y completa la auditoría', async () => {
      prisma.fORMAPAGO.create.mockResolvedValue(formaPagoMock);

      await service.create(
        { nombre: 'Cheque', requiere_referencia: true },
        USUARIO_ID,
      );

      // Sin `codigo` ni `estado`: el código es el id autoincremental que
      // asigna Postgres, y el estado nace en true por el default del schema.
      expect(prisma.fORMAPAGO.create).toHaveBeenCalledWith({
        data: {
          nombre: 'Cheque',
          requiere_referencia: true,
          FK_usuario_creador: USUARIO_ID,
          FK_usuario_actualizador: USUARIO_ID,
        },
      });
    });
  });

  describe('update', () => {
    // Criterio de aceptación del issue.
    it('no modifica el indicador de referencia aunque venga en el body', async () => {
      prisma.fORMAPAGO.findUnique.mockResolvedValue(formaPagoMock);
      prisma.fORMAPAGO.update.mockResolvedValue(formaPagoMock);

      // El bloqueo vive en el schema de Zod: el ZodValidationPipe global
      // descarta las claves antes de que el DTO llegue al service. Se prueban
      // los dos nombres posibles: el de la HU y el de la columna.
      const dto = updateFormaPagoSchema.parse({
        nombre: 'Transferencia',
        requiereNumeroReferencia: false,
        requiere_referencia: false,
      });
      expect(dto).not.toHaveProperty('requiereNumeroReferencia');
      expect(dto).not.toHaveProperty('requiere_referencia');

      await service.update(1, dto, USUARIO_ID);

      const dataEnviada = primerArgumento(prisma.fORMAPAGO.update).data;
      expect(dataEnviada?.requiere_referencia).toBeUndefined();
      expect(dataEnviada?.estado).toBeUndefined();
      expect(dataEnviada?.nombre).toBe('Transferencia');
      expect(dataEnviada?.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('rechaza un nombre ya usado por otra forma de pago activa', async () => {
      prisma.fORMAPAGO.findUnique.mockResolvedValue(formaPagoMock);
      prisma.fORMAPAGO.findFirst.mockResolvedValue({
        ...formaPagoMock,
        id_forma_pago: 2,
      });

      await expect(
        service.update(1, { nombre: 'Efectivo' }, USUARIO_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.fORMAPAGO.update).not.toHaveBeenCalled();
    });

    it('excluye el propio id al revalidar el nombre: renombrarse a sí misma no choca', async () => {
      prisma.fORMAPAGO.findUnique.mockResolvedValue(formaPagoMock);
      prisma.fORMAPAGO.update.mockResolvedValue(formaPagoMock);

      await service.update(1, { nombre: 'Transferencia bancaria' }, USUARIO_ID);

      expect(primerArgumento(prisma.fORMAPAGO.findFirst).where).toMatchObject({
        estado: true,
        id_forma_pago: { not: 1 },
      });
    });

    it('falla si la forma de pago no existe', async () => {
      prisma.fORMAPAGO.findUnique.mockResolvedValue(null);

      await expect(
        service.update(99, { nombre: 'Efectivo' }, USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('tira 404 si no existe', async () => {
      prisma.fORMAPAGO.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('baja', () => {
    it('rechaza si la forma de pago ya está inactiva', async () => {
      prisma.fORMAPAGO.findUnique.mockResolvedValue({
        ...formaPagoMock,
        estado: false,
      });

      await expect(service.baja(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.fORMAPAGO.update).not.toHaveBeenCalled();
    });
  });

  describe('activar', () => {
    it('revalida el nombre único: si otra activa lo tomó, rechaza', async () => {
      prisma.fORMAPAGO.findUnique.mockResolvedValue({
        ...formaPagoMock,
        estado: false,
      });
      prisma.fORMAPAGO.findFirst.mockResolvedValue({
        ...formaPagoMock,
        id_forma_pago: 2,
      });

      await expect(service.activar(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.fORMAPAGO.update).not.toHaveBeenCalled();
    });

    it('rechaza si la forma de pago ya está activa', async () => {
      prisma.fORMAPAGO.findUnique.mockResolvedValue(formaPagoMock);

      await expect(service.activar(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    // Criterio de aceptación del issue. Se parte del schema de Zod y no de un
    // objeto escrito a mano, porque el "solo activas por defecto" lo aporta el
    // `.default(true)` del query DTO: así el test cubre el camino real.
    it('sin filtros devuelve solo las formas de pago activas', async () => {
      const findMany = findManyFiltrando();
      Object.assign(prisma.fORMAPAGO, { findMany });

      const query = queryFormaPagoSchema.parse({});
      const { data } = await service.findAll(query);

      expect(primerArgumento(findMany).where).toEqual({ estado: true });
      expect(data.map((forma) => forma.nombre)).toEqual([
        'Efectivo',
        'Transferencia bancaria',
        'Cheque',
      ]);
      expect(data.every((forma) => forma.estado)).toBe(true);
    });

    it('una forma de pago dada de baja no aparece en el listado por defecto', async () => {
      const findMany = findManyFiltrando();
      Object.assign(prisma.fORMAPAGO, { findMany });

      const { data } = await service.findAll(queryFormaPagoSchema.parse({}));

      expect(data.map((forma) => forma.nombre)).not.toContain(
        'Cheque de tercero',
      );
    });

    it('estado=false lista solo las dadas de baja', async () => {
      const findMany = findManyFiltrando();
      Object.assign(prisma.fORMAPAGO, { findMany });

      const { data } = await service.findAll(
        queryFormaPagoSchema.parse({ estado: 'false' }),
      );

      expect(data.map((forma) => forma.nombre)).toEqual(['Cheque de tercero']);
    });

    it('estado=todos no filtra por estado: trae activas e inactivas', async () => {
      const findMany = findManyFiltrando();
      Object.assign(prisma.fORMAPAGO, { findMany });

      const { data } = await service.findAll(
        queryFormaPagoSchema.parse({ estado: 'todos' }),
      );

      expect(primerArgumento(findMany).where).toEqual({});
      expect(data).toHaveLength(formasEnLaBase.length);
    });

    it('busca por nombre exigiendo cada palabra por separado', async () => {
      await service.findAll(
        queryFormaPagoSchema.parse({ nombre: 'bancaria transferencia' }),
      );

      expect(primerArgumento(prisma.fORMAPAGO.findMany).where).toEqual({
        estado: true,
        AND: [
          { nombre: { contains: 'bancaria', mode: 'insensitive' } },
          { nombre: { contains: 'transferencia', mode: 'insensitive' } },
        ],
      });
    });

    it('devuelve el mismo shape paginado que el resto de los listados', async () => {
      prisma.fORMAPAGO.count.mockResolvedValue(3);

      const resultado = await service.findAll(
        queryFormaPagoSchema.parse({ page: '2', limit: '5' }),
      );

      expect(resultado.meta).toEqual({ total: 3, page: 2, limit: 5 });
      expect(primerArgumento(prisma.fORMAPAGO.findMany)).toMatchObject({
        skip: 5,
        take: 5,
      });
    });
  });
});
