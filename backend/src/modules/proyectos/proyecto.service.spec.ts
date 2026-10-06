import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  EstadoProyecto,
  TipoImagenProyecto,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ProyectoService } from './proyecto.service';
import {
  proyectoDetalleResponseSchema,
  proyectoResponseSchema,
} from './dto/proyecto-response.dto';
import { createProyectoSchema } from './dto/create-proyecto.dto';
import { updateProyectoSchema } from './dto/update-proyecto.dto';
import { cambiarEstadoObraSchema } from './dto/cambiar-estado-obra.dto';
import { queryProyectoSchema } from './dto/query-proyecto.dto';

type Args = Record<string, unknown>;

/** Primer argumento con el que se llamó a un mock, ya tipado. */
const primerArgumento = (mock: jest.Mock): Args =>
  (mock.mock.calls as Args[][])[0][0];

/** `data` de la última llamada a un mock de escritura de Prisma. */
const ultimoData = (mock: jest.Mock): Args =>
  (mock.mock.calls as { data: Args }[][]).at(-1)![0].data;

/** Mensaje con el que se rechazó una operación (falla si no se rechazó con un 409). */
async function mensajeDeRechazo(operacion: Promise<unknown>): Promise<string> {
  const error: unknown = await operacion.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ConflictException);
  return (error as ConflictException).message;
}

describe('ProyectoService', () => {
  let service: ProyectoService;

  // `tx` es un objeto DISTINTO de `prisma`: así cada test puede afirmar que
  // las escrituras corrieron dentro de la transacción.
  let tx: {
    $queryRaw: jest.Mock;
    pROYECTO: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    uNIDADFUNCIONAL: { count: jest.Mock };
    iMAGENPROYECTO: {
      aggregate: jest.Mock;
      create: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let prisma: {
    $transaction: jest.Mock;
    pROYECTO: { findMany: jest.Mock; findUnique: jest.Mock; count: jest.Mock };
    uNIDADFUNCIONAL: { groupBy: jest.Mock };
  };

  const USUARIO_ID = 7;
  const ID_PROYECTO = 12;

  const proyecto = (id: number, sobrescribe: Args = {}) => ({
    id_proyecto: id,
    codigo: `PROY-000${id}`,
    nombre: `Proyecto ${id}`,
    descripcion: null,
    localidad: 'Resistencia, Chaco',
    direccion: 'Av. Sarmiento 100',
    fecha_inicio: null,
    fecha_fin_estimada: null,
    estado_obra: EstadoProyecto.EN_PLANIFICACION,
    estado: true,
    cantidad_unidades_planificadas: 10,
    imagen_portada_url: null,
    ...sobrescribe,
  });

  /** Lo que devuelve la lectura del detalle al final de cada operación. */
  const detalleMock = (sobrescribe: Args = {}) => ({
    ...proyecto(ID_PROYECTO),
    hora_creacion: new Date('2026-10-01'),
    hora_actualizacion: new Date('2026-10-02'),
    FK_usuario_creador: USUARIO_ID,
    FK_usuario_actualizador: USUARIO_ID,
    usuarioCreador: { nombre: 'Ada', apellido: 'Lovelace' },
    usuarioActualizador: { nombre: 'Ada', apellido: 'Lovelace' },
    imagenes: [],
    ...sobrescribe,
  });

  /** Lo que devuelve `bloquearProyecto` (la fila ya lockeada). */
  const filaBloqueada = (sobrescribe: Args = {}) => ({
    estado: true,
    estado_obra: EstadoProyecto.EN_PLANIFICACION,
    fecha_inicio: null,
    fecha_fin_estimada: null,
    ...sobrescribe,
  });

  const DTO_ALTA = {
    nombre: 'Torre Nogal',
    direccion: 'Av. Sarmiento 100',
    localidad: 'Resistencia, Chaco',
    cantidad_unidades_planificadas: 10,
  };

  const queryBase = { page: 1, limit: 10 };

  /** Comprueba que una escritura dejó la auditoría del proyecto al día. */
  const esperarAuditoria = (data: Args) => {
    expect(data.FK_usuario_actualizador).toBe(USUARIO_ID);
    expect(data.hora_actualizacion).toBeInstanceOf(Date);
  };

  beforeEach(async () => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id_proyecto: ID_PROYECTO }]),
      pROYECTO: {
        findUnique: jest.fn().mockResolvedValue(filaBloqueada()),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id_proyecto: ID_PROYECTO }),
        update: jest.fn().mockResolvedValue({}),
      },
      uNIDADFUNCIONAL: { count: jest.fn().mockResolvedValue(0) },
      iMAGENPROYECTO: {
        aggregate: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    prisma = {
      $transaction: jest.fn(),
      pROYECTO: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(detalleMock()),
        count: jest.fn().mockResolvedValue(0),
      },
      uNIDADFUNCIONAL: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    prisma.$transaction.mockImplementation((cb: (t: unknown) => unknown) =>
      cb(tx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProyectoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ProyectoService);
  });

  describe('presupuesto derivado', () => {
    it('es la suma del costo de las unidades activas, junto con cuántas hay cargadas contra las planificadas', async () => {
      prisma.pROYECTO.findMany.mockResolvedValue([proyecto(1), proyecto(2)]);
      prisma.pROYECTO.count.mockResolvedValue(2);
      prisma.uNIDADFUNCIONAL.groupBy.mockResolvedValue([
        {
          FK_proyecto: 1,
          _count: { _all: 3 },
          _sum: { costo: new Prisma.Decimal('30000000.50') },
        },
      ]);

      const { data } = await service.findAll(queryBase);

      expect(data[0]).toMatchObject({
        id_proyecto: 1,
        unidades_cargadas: 3,
        cantidad_unidades_planificadas: 10,
        presupuesto: 30000000.5,
      });
      // Sin unidades activas: presupuesto 0 y ninguna cargada.
      expect(data[1]).toMatchObject({ unidades_cargadas: 0, presupuesto: 0 });
    });

    // Es lo que hace que el presupuesto BAJE al dar de baja una unidad (y
    // vuelva a subir al reactivarla): las dadas de baja no entran en la suma.
    it('solo suma las unidades activas, y de los proyectos de la página', async () => {
      prisma.pROYECTO.findMany.mockResolvedValue([proyecto(4), proyecto(9)]);

      await service.findAll(queryBase);

      expect(primerArgumento(prisma.uNIDADFUNCIONAL.groupBy).where).toEqual({
        estado: true,
        FK_proyecto: { in: [4, 9] },
      });
    });

    it('el detalle de un proyecto trae también su presupuesto', async () => {
      prisma.uNIDADFUNCIONAL.groupBy.mockResolvedValue([
        {
          FK_proyecto: ID_PROYECTO,
          _count: { _all: 2 },
          _sum: { costo: new Prisma.Decimal('500') },
        },
      ]);

      const resultado = await service.findOne(ID_PROYECTO);

      expect(resultado).toMatchObject({
        unidades_cargadas: 2,
        presupuesto: 500,
      });
    });
  });

  describe('listado', () => {
    it('pagina, y ordena por nombre', async () => {
      prisma.pROYECTO.count.mockResolvedValue(25);

      const { meta } = await service.findAll({ page: 3, limit: 5 });

      const args = primerArgumento(prisma.pROYECTO.findMany);
      expect(args.skip).toBe(10);
      expect(args.take).toBe(5);
      expect(args.orderBy).toEqual({ nombre: 'asc' });
      expect(meta).toEqual({ total: 25, page: 3, limit: 5 });
    });

    it('sin filtros, trae solo los proyectos activos', async () => {
      await service.findAll(queryBase);

      expect(primerArgumento(prisma.pROYECTO.findMany).where).toEqual({
        estado: true,
      });
    });

    it('con estado=false trae solo los dados de baja, y con estado=todos no filtra por baja', async () => {
      await service.findAll({ ...queryBase, estado: false });
      await service.findAll({ ...queryBase, estado: 'todos' });

      const llamadas = prisma.pROYECTO.findMany.mock.calls as Args[][];
      expect(llamadas[0][0].where).toEqual({ estado: false });
      expect(llamadas[1][0].where).toEqual({});
    });

    it('filtra por estado de obra, sin dejar de filtrar por activos', async () => {
      await service.findAll({
        ...queryBase,
        estado_obra: EstadoProyecto.EN_EJECUCION,
      });

      expect(primerArgumento(prisma.pROYECTO.findMany).where).toEqual({
        estado: true,
        estado_obra: EstadoProyecto.EN_EJECUCION,
      });
    });

    it('filtra por localidad exacta, sin distinguir mayúsculas', async () => {
      await service.findAll({ ...queryBase, localidad: 'salta' });

      expect(primerArgumento(prisma.pROYECTO.findMany).where).toEqual({
        estado: true,
        localidad: { equals: 'salta', mode: 'insensitive' },
      });
    });

    it('busca por las palabras del nombre, sin importar el orden, o por código', async () => {
      await service.findAll({ ...queryBase, busqueda: 'nogal torre' });

      expect(primerArgumento(prisma.pROYECTO.findMany).where).toEqual({
        estado: true,
        OR: [
          {
            AND: [
              { nombre: { contains: 'nogal', mode: 'insensitive' } },
              { nombre: { contains: 'torre', mode: 'insensitive' } },
            ],
          },
          { codigo: { contains: 'nogal torre', mode: 'insensitive' } },
        ],
      });
    });

    it('el query param `estado` ya no acepta un estado de obra', () => {
      expect(
        queryProyectoSchema.safeParse({ estado: 'EN_EJECUCION' }).success,
      ).toBe(false);
      expect(queryProyectoSchema.parse({ estado: 'todos' }).estado).toBe(
        'todos',
      );
      expect(queryProyectoSchema.parse({ estado: 'false' }).estado).toBe(false);
    });
  });

  describe('detalle', () => {
    it('rechaza un proyecto que no existe', async () => {
      prisma.pROYECTO.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('pide las imágenes ordenadas por orden y después por id', async () => {
      await service.findOne(ID_PROYECTO);

      const { select } = primerArgumento(prisma.pROYECTO.findUnique) as {
        select: { imagenes: { orderBy: unknown } };
      };
      expect(select.imagenes.orderBy).toEqual([
        { orden: 'asc' },
        { id_imagen_proyecto: 'asc' },
      ]);
    });
  });

  describe('catálogo de estados', () => {
    it('trae los cuatro estados del proyecto, con su etiqueta legible', () => {
      const catalogo = service.findEstados();

      expect(catalogo).toEqual([
        { id: 'EN_PLANIFICACION', code: 'En planificación', metadata: {} },
        { id: 'EN_EJECUCION', code: 'En ejecución', metadata: {} },
        { id: 'FINALIZADO', code: 'Finalizado', metadata: {} },
        { id: 'CANCELADO', code: 'Cancelado', metadata: {} },
      ]);
    });
  });

  describe('catálogo de localidades', () => {
    it('trae las localidades de los proyectos activos, ordenadas y sin repetir aunque cambien las mayúsculas o los espacios', async () => {
      prisma.pROYECTO.findMany.mockResolvedValue([
        { localidad: 'Salta' },
        { localidad: 'Corrientes' },
        { localidad: 'SALTA' },
        { localidad: ' salta ' },
      ]);

      const catalogo = await service.findLocalidades();

      expect(primerArgumento(prisma.pROYECTO.findMany).where).toEqual({
        estado: true,
      });
      expect(catalogo).toHaveLength(2);
      expect(catalogo[0]).toEqual({
        id: 'Corrientes',
        code: 'Corrientes',
        metadata: {},
      });
      // De las tres grafías de Salta queda una sola: la primera en orden
      // alfabético.
      const grafias = ['Salta', 'SALTA', 'salta'].sort((a, b) =>
        a.localeCompare(b, 'es'),
      );
      expect(catalogo[1].id).toBe(grafias[0]);
    });
  });

  describe('alta', () => {
    it('nace En planificación, con el código PROY-XXXX generado a partir del id', async () => {
      await service.create(DTO_ALTA, USUARIO_ID);

      const creado = ultimoData(tx.pROYECTO.create);
      expect(creado).toMatchObject({
        ...DTO_ALTA,
        estado_obra: EstadoProyecto.EN_PLANIFICACION,
      });
      // El alta no decide la baja lógica: nace activo por el default del esquema.
      expect(creado).not.toHaveProperty('estado');
      // Valor temporal único, corregido en la misma transacción.
      expect(creado.codigo).toMatch(/^TMP-/);
      expect(primerArgumento(tx.pROYECTO.update)).toEqual({
        where: { id_proyecto: ID_PROYECTO },
        data: { codigo: 'PROY-0012' },
      });
    });

    it('registra al usuario autenticado como creador y actualizador', async () => {
      await service.create(DTO_ALTA, USUARIO_ID);

      const creado = ultimoData(tx.pROYECTO.create);
      expect(creado.FK_usuario_creador).toBe(USUARIO_ID);
      esperarAuditoria(creado);
    });

    it('rechaza un nombre que ya usa otro proyecto activo, sin distinguir mayúsculas', async () => {
      tx.pROYECTO.findFirst.mockResolvedValue({ id_proyecto: 3 });

      const mensaje = await mensajeDeRechazo(
        service.create(DTO_ALTA, USUARIO_ID),
      );

      expect(mensaje).toContain('Torre Nogal');
      expect(primerArgumento(tx.pROYECTO.findFirst).where).toEqual({
        nombre: { equals: 'Torre Nogal', mode: 'insensitive' },
        estado: true,
      });
      expect(tx.pROYECTO.create).not.toHaveBeenCalled();
    });

    // El homónimo dado de baja no aparece en la búsqueda (filtra `estado:
    // true`, ver el test de arriba), así que no bloquea el alta.
    it('acepta el nombre de un proyecto dado de baja', async () => {
      tx.pROYECTO.findFirst.mockResolvedValue(null);

      await expect(service.create(DTO_ALTA, USUARIO_ID)).resolves.toBeDefined();
      expect(tx.pROYECTO.create).toHaveBeenCalled();
    });

    it('el DTO rechaza una fecha de fin anterior a la de inicio, y descarta código, estados y auditoría', () => {
      expect(
        createProyectoSchema.safeParse({
          ...DTO_ALTA,
          fecha_inicio: '2027-01-10',
          fecha_fin_estimada: '2027-01-09',
        }).success,
      ).toBe(false);

      const parseado = createProyectoSchema.parse({
        ...DTO_ALTA,
        fecha_inicio: '2027-01-10',
        fecha_fin_estimada: '2027-01-10',
        codigo: 'PROY-9999',
        estado_obra: 'FINALIZADO',
        estado: false,
        FK_usuario_creador: 99,
      });
      expect(parseado).not.toHaveProperty('codigo');
      expect(parseado).not.toHaveProperty('estado_obra');
      expect(parseado).not.toHaveProperty('estado');
      expect(parseado).not.toHaveProperty('FK_usuario_creador');
    });

    it('el DTO exige unidades planificadas enteras y mayores a 0', () => {
      for (const cantidad of [0, -1, 2.5]) {
        expect(
          createProyectoSchema.safeParse({
            ...DTO_ALTA,
            cantidad_unidades_planificadas: cantidad,
          }).success,
        ).toBe(false);
      }
    });
  });

  describe('edición', () => {
    it('toma el lock del proyecto, guarda solo lo que llega y deja la auditoría al día', async () => {
      await service.update(ID_PROYECTO, { descripcion: null }, USUARIO_ID);

      expect(tx.$queryRaw).toHaveBeenCalled();
      const data = ultimoData(tx.pROYECTO.update);
      expect(data).toMatchObject({ descripcion: null });
      expect(data).not.toHaveProperty('nombre');
      esperarAuditoria(data);
    });

    it('rechaza un proyecto que no existe', async () => {
      tx.$queryRaw.mockResolvedValue([]);

      await expect(
        service.update(99, { nombre: 'Otro' }, USUARIO_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it.each([
      ['dado de baja', { estado: false }, 'dado de baja'],
      ['Cancelado', { estado_obra: EstadoProyecto.CANCELADO }, 'Cancelado'],
    ])(
      'rechaza editar un proyecto %s',
      async (_caso, sobrescribe, textoEsperado) => {
        tx.pROYECTO.findUnique.mockResolvedValue(filaBloqueada(sobrescribe));

        const mensaje = await mensajeDeRechazo(
          service.update(ID_PROYECTO, { nombre: 'Otro' }, USUARIO_ID),
        );

        expect(mensaje).toContain(textoEsperado);
        expect(tx.pROYECTO.update).not.toHaveBeenCalled();
      },
    );

    it('valida el nombre contra los otros proyectos activos, excluyéndose a sí mismo', async () => {
      tx.pROYECTO.findFirst.mockResolvedValue({ id_proyecto: 3 });

      await mensajeDeRechazo(
        service.update(ID_PROYECTO, { nombre: 'Torre Nogal' }, USUARIO_ID),
      );

      expect(primerArgumento(tx.pROYECTO.findFirst).where).toEqual({
        nombre: { equals: 'Torre Nogal', mode: 'insensitive' },
        estado: true,
        id_proyecto: { not: ID_PROYECTO },
      });
    });

    it('rechaza bajar las unidades planificadas por debajo de las activas, y dice cuántas hay', async () => {
      tx.uNIDADFUNCIONAL.count.mockResolvedValue(5);

      const mensaje = await mensajeDeRechazo(
        service.update(
          ID_PROYECTO,
          { cantidad_unidades_planificadas: 4 },
          USUARIO_ID,
        ),
      );

      expect(mensaje).toContain('5 unidad(es) activa(s)');
      expect(primerArgumento(tx.uNIDADFUNCIONAL.count).where).toEqual({
        FK_proyecto: ID_PROYECTO,
        estado: true,
      });
    });

    it('acepta unidades planificadas iguales a las activas', async () => {
      tx.uNIDADFUNCIONAL.count.mockResolvedValue(5);

      await service.update(
        ID_PROYECTO,
        { cantidad_unidades_planificadas: 5 },
        USUARIO_ID,
      );

      expect(tx.pROYECTO.update).toHaveBeenCalled();
    });

    describe('fecha de fin estimada con el proyecto Finalizado', () => {
      const FECHA_FIN = new Date('2027-12-01T03:00:00.000Z');

      beforeEach(() => {
        tx.pROYECTO.findUnique.mockResolvedValue(
          filaBloqueada({
            estado_obra: EstadoProyecto.FINALIZADO,
            fecha_fin_estimada: FECHA_FIN,
          }),
        );
      });

      it('rechaza cambiarla', async () => {
        const mensaje = await mensajeDeRechazo(
          service.update(
            ID_PROYECTO,
            { fecha_fin_estimada: new Date('2028-01-01T03:00:00.000Z') },
            USUARIO_ID,
          ),
        );

        expect(mensaje).toContain('Finalizado');
      });

      it('rechaza borrarla', async () => {
        await mensajeDeRechazo(
          service.update(ID_PROYECTO, { fecha_fin_estimada: null }, USUARIO_ID),
        );
      });

      it('acepta que llegue el mismo valor, y el resto de los campos sigue editable', async () => {
        await service.update(
          ID_PROYECTO,
          {
            fecha_fin_estimada: new Date(FECHA_FIN.getTime()),
            direccion: 'Calle Nueva 123',
          },
          USUARIO_ID,
        );

        expect(ultimoData(tx.pROYECTO.update)).toMatchObject({
          direccion: 'Calle Nueva 123',
        });
      });
    });

    // El refine del DTO no puede ver esto: en el body llega una sola fecha.
    it('rechaza con 400 una fecha de fin anterior a la de inicio contando los valores ya guardados', async () => {
      tx.pROYECTO.findUnique.mockResolvedValue(
        filaBloqueada({ fecha_fin_estimada: new Date('2027-06-01') }),
      );

      await expect(
        service.update(
          ID_PROYECTO,
          { fecha_inicio: new Date('2027-07-01') },
          USUARIO_ID,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(tx.pROYECTO.update).not.toHaveBeenCalled();
    });

    it('borrar una de las dos fechas no dispara la validación cruzada', async () => {
      tx.pROYECTO.findUnique.mockResolvedValue(
        filaBloqueada({
          fecha_inicio: new Date('2027-07-01'),
          fecha_fin_estimada: new Date('2027-08-01'),
        }),
      );

      await service.update(
        ID_PROYECTO,
        { fecha_fin_estimada: null },
        USUARIO_ID,
      );

      expect(tx.pROYECTO.update).toHaveBeenCalled();
    });

    it('el DTO acepta null en los opcionales y no en los obligatorios', () => {
      expect(
        updateProyectoSchema.safeParse({
          descripcion: null,
          fecha_inicio: null,
          fecha_fin_estimada: null,
          imagen_portada_url: null,
        }).success,
      ).toBe(true);
      expect(updateProyectoSchema.safeParse({ nombre: null }).success).toBe(
        false,
      );
      expect(updateProyectoSchema.safeParse({ direccion: null }).success).toBe(
        false,
      );
    });
  });

  describe('cambio de estado de obra', () => {
    const conEstado = (estado_obra: EstadoProyecto) =>
      tx.pROYECTO.findUnique.mockResolvedValue(filaBloqueada({ estado_obra }));

    it('pasa a En ejecución si tiene al menos una unidad activa, y deja la auditoría al día', async () => {
      tx.uNIDADFUNCIONAL.count.mockResolvedValue(1);

      await service.cambiarEstadoObra(
        ID_PROYECTO,
        { estado_obra: EstadoProyecto.EN_EJECUCION },
        USUARIO_ID,
      );

      const data = ultimoData(tx.pROYECTO.update);
      expect(data.estado_obra).toBe(EstadoProyecto.EN_EJECUCION);
      esperarAuditoria(data);
    });

    it('rechaza pasar a En ejecución sin unidades activas', async () => {
      tx.uNIDADFUNCIONAL.count.mockResolvedValue(0);

      const mensaje = await mensajeDeRechazo(
        service.cambiarEstadoObra(
          ID_PROYECTO,
          { estado_obra: EstadoProyecto.EN_EJECUCION },
          USUARIO_ID,
        ),
      );

      expect(mensaje).toContain('unidad funcional activa');
      expect(tx.pROYECTO.update).not.toHaveBeenCalled();
    });

    it('pasa de En ejecución a Finalizado sin mirar las unidades', async () => {
      conEstado(EstadoProyecto.EN_EJECUCION);

      await service.cambiarEstadoObra(
        ID_PROYECTO,
        { estado_obra: EstadoProyecto.FINALIZADO },
        USUARIO_ID,
      );

      expect(ultimoData(tx.pROYECTO.update).estado_obra).toBe(
        EstadoProyecto.FINALIZADO,
      );
      expect(tx.uNIDADFUNCIONAL.count).not.toHaveBeenCalled();
    });

    it.each([
      [
        'el salto de En planificación a Finalizado',
        EstadoProyecto.EN_PLANIFICACION,
        EstadoProyecto.FINALIZADO,
      ],
      [
        'el retroceso de Finalizado a En ejecución',
        EstadoProyecto.FINALIZADO,
        EstadoProyecto.EN_EJECUCION,
      ],
      [
        'repetir En ejecución',
        EstadoProyecto.EN_EJECUCION,
        EstadoProyecto.EN_EJECUCION,
      ],
      [
        'repetir Finalizado',
        EstadoProyecto.FINALIZADO,
        EstadoProyecto.FINALIZADO,
      ],
    ] as const)('rechaza %s', async (_caso, actual, destino) => {
      conEstado(actual);
      tx.uNIDADFUNCIONAL.count.mockResolvedValue(3);

      await mensajeDeRechazo(
        service.cambiarEstadoObra(
          ID_PROYECTO,
          { estado_obra: destino },
          USUARIO_ID,
        ),
      );
      expect(tx.pROYECTO.update).not.toHaveBeenCalled();
    });

    it.each([EstadoProyecto.EN_EJECUCION, EstadoProyecto.FINALIZADO] as const)(
      'rechaza cualquier cambio desde Cancelado (a %s)',
      async (destino) => {
        conEstado(EstadoProyecto.CANCELADO);
        tx.uNIDADFUNCIONAL.count.mockResolvedValue(3);

        const mensaje = await mensajeDeRechazo(
          service.cambiarEstadoObra(
            ID_PROYECTO,
            { estado_obra: destino },
            USUARIO_ID,
          ),
        );

        expect(mensaje).toContain('Cancelado');
      },
    );

    it('rechaza el cambio en un proyecto dado de baja', async () => {
      tx.pROYECTO.findUnique.mockResolvedValue(
        filaBloqueada({ estado: false }),
      );
      tx.uNIDADFUNCIONAL.count.mockResolvedValue(3);

      const mensaje = await mensajeDeRechazo(
        service.cambiarEstadoObra(
          ID_PROYECTO,
          { estado_obra: EstadoProyecto.EN_EJECUCION },
          USUARIO_ID,
        ),
      );

      expect(mensaje).toContain('dado de baja');
    });

    it('el DTO solo acepta En ejecución o Finalizado como destino', () => {
      for (const estado_obra of ['EN_EJECUCION', 'FINALIZADO']) {
        expect(cambiarEstadoObraSchema.safeParse({ estado_obra }).success).toBe(
          true,
        );
      }
      for (const estado_obra of ['EN_PLANIFICACION', 'CANCELADO']) {
        expect(cambiarEstadoObraSchema.safeParse({ estado_obra }).success).toBe(
          false,
        );
      }
    });
  });

  describe('baja', () => {
    it('da de baja un proyecto En planificación sin unidades activas, y deja la auditoría al día', async () => {
      await service.baja(ID_PROYECTO, USUARIO_ID);

      const data = ultimoData(tx.pROYECTO.update);
      expect(data.estado).toBe(false);
      esperarAuditoria(data);
    });

    it('rechaza la baja si tiene unidades activas, y dice cuántas', async () => {
      tx.uNIDADFUNCIONAL.count.mockResolvedValue(2);

      const mensaje = await mensajeDeRechazo(
        service.baja(ID_PROYECTO, USUARIO_ID),
      );

      expect(mensaje).toContain('2 unidad(es)');
      expect(tx.pROYECTO.update).not.toHaveBeenCalled();
    });

    it.each([
      [EstadoProyecto.EN_EJECUCION, 'En ejecución'],
      [EstadoProyecto.FINALIZADO, 'Finalizado'],
      [EstadoProyecto.CANCELADO, 'Cancelado'],
    ] as const)(
      'rechaza la baja de un proyecto %s',
      async (estado_obra, etiqueta) => {
        tx.pROYECTO.findUnique.mockResolvedValue(
          filaBloqueada({ estado_obra }),
        );

        const mensaje = await mensajeDeRechazo(
          service.baja(ID_PROYECTO, USUARIO_ID),
        );

        expect(mensaje).toContain(etiqueta);
        expect(tx.pROYECTO.update).not.toHaveBeenCalled();
      },
    );

    it('rechaza la baja de un proyecto que ya está dado de baja', async () => {
      tx.pROYECTO.findUnique.mockResolvedValue(
        filaBloqueada({ estado: false }),
      );

      await mensajeDeRechazo(service.baja(ID_PROYECTO, USUARIO_ID));
    });
  });

  describe('imágenes', () => {
    const DTO_IMAGEN = {
      url: 'https://cdn.ejemplo.com/render.png',
      tipo: TipoImagenProyecto.RENDER,
    };

    it('sin orden, la imagen va al final de la galería, y el proyecto queda auditado', async () => {
      tx.iMAGENPROYECTO.aggregate.mockResolvedValue({ _max: { orden: 4 } });

      await service.agregarImagen(ID_PROYECTO, DTO_IMAGEN, USUARIO_ID);

      expect(ultimoData(tx.iMAGENPROYECTO.create)).toEqual({
        FK_proyecto: ID_PROYECTO,
        ...DTO_IMAGEN,
        orden: 5,
      });
      esperarAuditoria(ultimoData(tx.pROYECTO.update));
    });

    it('la primera imagen sin orden queda en 0, y un orden explícito se respeta', async () => {
      tx.iMAGENPROYECTO.aggregate.mockResolvedValue({ _max: { orden: null } });

      await service.agregarImagen(ID_PROYECTO, DTO_IMAGEN, USUARIO_ID);
      expect(ultimoData(tx.iMAGENPROYECTO.create).orden).toBe(0);

      await service.agregarImagen(
        ID_PROYECTO,
        { ...DTO_IMAGEN, tipo: TipoImagenProyecto.PLANO, orden: 2 },
        USUARIO_ID,
      );
      expect(ultimoData(tx.iMAGENPROYECTO.create)).toMatchObject({
        tipo: TipoImagenProyecto.PLANO,
        orden: 2,
      });
    });

    it.each([
      ['dado de baja', { estado: false }],
      ['Cancelado', { estado_obra: EstadoProyecto.CANCELADO }],
    ])(
      'no se tocan las imágenes de un proyecto %s',
      async (_caso, sobrescribe) => {
        tx.pROYECTO.findUnique.mockResolvedValue(filaBloqueada(sobrescribe));

        await mensajeDeRechazo(
          service.agregarImagen(ID_PROYECTO, DTO_IMAGEN, USUARIO_ID),
        );
        await mensajeDeRechazo(
          service.quitarImagen(ID_PROYECTO, 1, USUARIO_ID),
        );
        await mensajeDeRechazo(
          service.ordenarImagenes(
            ID_PROYECTO,
            { ids_imagen_proyecto: [1] },
            USUARIO_ID,
          ),
        );

        expect(tx.iMAGENPROYECTO.create).not.toHaveBeenCalled();
        expect(tx.iMAGENPROYECTO.deleteMany).not.toHaveBeenCalled();
        expect(tx.iMAGENPROYECTO.update).not.toHaveBeenCalled();
      },
    );

    it('quitar una imagen la borra físicamente, solo si es de ese proyecto', async () => {
      tx.iMAGENPROYECTO.deleteMany.mockResolvedValue({ count: 1 });

      await service.quitarImagen(ID_PROYECTO, 30, USUARIO_ID);

      expect(primerArgumento(tx.iMAGENPROYECTO.deleteMany).where).toEqual({
        id_imagen_proyecto: 30,
        FK_proyecto: ID_PROYECTO,
      });
      esperarAuditoria(ultimoData(tx.pROYECTO.update));
    });

    it('rechaza quitar una imagen que no pertenece al proyecto', async () => {
      tx.iMAGENPROYECTO.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.quitarImagen(ID_PROYECTO, 30, USUARIO_ID),
      ).rejects.toThrow(NotFoundException);
      expect(tx.pROYECTO.update).not.toHaveBeenCalled();
    });

    it('reordenar deja cada imagen con su posición en la lista', async () => {
      tx.iMAGENPROYECTO.findMany.mockResolvedValue([
        { id_imagen_proyecto: 10 },
        { id_imagen_proyecto: 11 },
        { id_imagen_proyecto: 12 },
      ]);

      await service.ordenarImagenes(
        ID_PROYECTO,
        { ids_imagen_proyecto: [12, 10, 11] },
        USUARIO_ID,
      );

      expect(tx.iMAGENPROYECTO.update.mock.calls).toEqual([
        [{ where: { id_imagen_proyecto: 12 }, data: { orden: 0 } }],
        [{ where: { id_imagen_proyecto: 10 }, data: { orden: 1 } }],
        [{ where: { id_imagen_proyecto: 11 }, data: { orden: 2 } }],
      ]);
      esperarAuditoria(ultimoData(tx.pROYECTO.update));
    });

    it.each([
      ['falta una imagen', [10, 11]],
      ['hay una imagen de otro proyecto', [10, 11, 99]],
    ])('rechaza reordenar si %s', async (_caso, ids) => {
      tx.iMAGENPROYECTO.findMany.mockResolvedValue([
        { id_imagen_proyecto: 10 },
        { id_imagen_proyecto: 11 },
        { id_imagen_proyecto: 12 },
      ]);

      await expect(
        service.ordenarImagenes(
          ID_PROYECTO,
          { ids_imagen_proyecto: ids },
          USUARIO_ID,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(tx.iMAGENPROYECTO.update).not.toHaveBeenCalled();
    });
  });

  describe('contrato de respuesta', () => {
    // Sobre HTTP las fechas viajan como string ISO. `.strict()` hace fallar
    // también si el service devuelve una clave que el DTO no documenta.
    it('cada proyecto del listado cumple el contrato del DTO', async () => {
      prisma.pROYECTO.findMany.mockResolvedValue([
        proyecto(1, {
          fecha_inicio: new Date('2026-12-01'),
          fecha_fin_estimada: new Date('2027-12-01'),
        }),
      ]);
      prisma.pROYECTO.count.mockResolvedValue(1);
      prisma.uNIDADFUNCIONAL.groupBy.mockResolvedValue([
        {
          FK_proyecto: 1,
          _count: { _all: 3 },
          _sum: { costo: new Prisma.Decimal('300') },
        },
      ]);

      const { data } = await service.findAll(queryBase);

      expect(() =>
        proyectoResponseSchema
          .strict()
          .parse(JSON.parse(JSON.stringify(data[0]))),
      ).not.toThrow();
      // Los dos campos conviven: `estado` ya no es el estado de obra.
      expect(data[0]).toMatchObject({
        estado: true,
        estado_obra: EstadoProyecto.EN_PLANIFICACION,
      });
    });

    it('el detalle cumple el contrato del DTO, con imágenes y auditoría', async () => {
      prisma.pROYECTO.findUnique.mockResolvedValue(
        detalleMock({
          imagenes: [
            {
              id_imagen_proyecto: 1,
              url: 'https://cdn.ejemplo.com/plano.png',
              tipo: TipoImagenProyecto.PLANO,
              orden: 0,
            },
          ],
        }),
      );

      const detalle = await service.findOne(ID_PROYECTO);

      expect(() =>
        proyectoDetalleResponseSchema
          .strict()
          .parse(JSON.parse(JSON.stringify(detalle))),
      ).not.toThrow();
    });
  });
});
