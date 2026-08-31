import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AlertaService } from './alerta.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAlertaDto } from './dto/query-alerta.dto';
import { RolNombre } from '../../common/enums/rol.enum';
import { TipoAlertaNombre } from '../../common/enums/tipo-alerta.enum';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/** Argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = {
  data?: Record<string, unknown>;
  where?: Record<string, unknown>;
};

const argumentosDe = (mock: jest.Mock): ArgumentoPrisma[] =>
  (mock.mock.calls as ArgumentoPrisma[][]).map((llamada) => llamada[0]);

describe('AlertaService', () => {
  let service: AlertaService;
  let prisma: {
    aLERTA: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    tIPOALERTA: { findUnique: jest.Mock; findMany: jest.Mock };
    rOL: { findUnique: jest.Mock };
  };

  const ID_ALERTA = 5;
  const ID_TIPO_ALERTA = 1;
  const ID_ROL_ALMACEN = 3;

  const responsableAlmacen: AuthenticatedUser = {
    id: 7,
    email: 'almacen@axontech.test',
    rol: RolNombre.RESPONSABLE_ALMACEN,
  };
  const gerenteGeneral: AuthenticatedUser = {
    id: 9,
    email: 'gerente@axontech.test',
    rol: RolNombre.GERENTE_GENERAL,
  };
  const administrador: AuthenticatedUser = {
    id: 11,
    email: 'admin@axontech.test',
    rol: RolNombre.ADMINISTRADOR,
  };

  /** Alerta dirigida al Responsable de Almacén, sin atender. */
  const alerta = (extra: Record<string, unknown> = {}) => ({
    id_alerta: ID_ALERTA,
    atendida: false,
    rolDestinatario: { nombre: RolNombre.RESPONSABLE_ALMACEN },
    ...extra,
  });

  /** Query ya "parseado" por el DTO: page y limit siempre traen su default. */
  const query = (filtros: Record<string, unknown> = {}) =>
    ({ page: 1, limit: 10, ...filtros }) as unknown as QueryAlertaDto;

  /** El `where` con el que se llamó a findMany. */
  const whereDelListado = () => argumentosDe(prisma.aLERTA.findMany)[0].where;

  beforeEach(async () => {
    prisma = {
      aLERTA: {
        create: jest.fn().mockResolvedValue({ id_alerta: ID_ALERTA }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(alerta()),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      tIPOALERTA: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id_tipo_alerta: ID_TIPO_ALERTA }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      rOL: {
        findUnique: jest.fn().mockResolvedValue({ id_rol: ID_ROL_ALMACEN }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertaService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AlertaService);
  });

  describe('crear', () => {
    const CLAVE = `${TipoAlertaNombre.REPOSICION}-12`;

    /** Input mínimo para pedir una alerta de reposición de la ficha 12. */
    const input = (extra: Record<string, unknown> = {}) => ({
      tipoAlertaNombre: TipoAlertaNombre.REPOSICION,
      rolDestinatario: RolNombre.RESPONSABLE_ALMACEN,
      mensaje: 'El stock de "Martillo" quedó por debajo de su umbral',
      claveDeduplicacion: CLAVE,
      ...extra,
    });

    it('resuelve el tipo de alerta y el rol destinatario a sus ids', async () => {
      const resultado = await service.crear(
        input({ datos: { stockId: 12, stockNuevo: 2, umbralMinimo: 5 } }),
      );

      // Quien llama trabaja con enums, no con ids: la traducción la hace
      // este service.
      expect(prisma.tIPOALERTA.findUnique).toHaveBeenCalledWith({
        where: { nombre: TipoAlertaNombre.REPOSICION },
      });
      expect(prisma.rOL.findUnique).toHaveBeenCalledWith({
        where: { nombre: RolNombre.RESPONSABLE_ALMACEN },
      });

      const [creacion] = argumentosDe(prisma.aLERTA.create);
      expect(creacion.data).toEqual({
        FK_tipo_alerta: ID_TIPO_ALERTA,
        FK_rol_destinatario: ID_ROL_ALMACEN,
        mensaje: 'El stock de "Martillo" quedó por debajo de su umbral',
        datos: { stockId: 12, stockNuevo: 2, umbralMinimo: 5 },
        clave_deduplicacion: CLAVE,
      });
      expect(resultado.creada).toBe(true);
    });

    it('crea la alerta si no hay ninguna con esa clave todavía', async () => {
      prisma.aLERTA.findFirst.mockResolvedValue(null);

      const resultado = await service.crear(input());

      expect(prisma.aLERTA.findFirst).toHaveBeenCalledWith({
        where: { clave_deduplicacion: CLAVE, atendida: false },
      });
      expect(prisma.aLERTA.create).toHaveBeenCalled();
      expect(resultado.creada).toBe(true);
    });

    it('no duplica si ya hay una alerta sin atender con la misma clave', async () => {
      const yaAbierta = { id_alerta: 99, clave_deduplicacion: CLAVE };
      prisma.aLERTA.findFirst.mockResolvedValue(yaAbierta);

      const resultado = await service.crear(input());

      // Mientras la condición siga reportada y sin atender, no se apila una
      // alerta nueva: se devuelve la que ya está abierta.
      expect(prisma.aLERTA.create).not.toHaveBeenCalled();
      expect(resultado).toEqual({ alerta: yaAbierta, creada: false });
    });

    it('genera una nueva si la anterior con esa clave ya fue atendida', async () => {
      // La búsqueda de deduplicación filtra por atendida:false, así que una
      // alerta ya atendida no aparece — es lo que permite volver a alertar
      // cuando el problema se "reconoció" pero nunca se resolvió.
      prisma.aLERTA.findFirst.mockResolvedValue(null);

      const resultado = await service.crear(input());

      const [busqueda] = argumentosDe(prisma.aLERTA.findFirst);
      expect(busqueda.where).toEqual({
        clave_deduplicacion: CLAVE,
        atendida: false,
      });
      expect(prisma.aLERTA.create).toHaveBeenCalled();
      expect(resultado.creada).toBe(true);
    });

    it('falla con 500 si el tipo de alerta no está sembrado', async () => {
      prisma.tIPOALERTA.findUnique.mockResolvedValue(null);

      // No es NotFoundException: acá no hay un cliente pidiendo algo
      // inexistente, es el seed que no se corrió o un bug de quien llama.
      await expect(service.crear(input())).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(prisma.aLERTA.create).not.toHaveBeenCalled();
    });

    it('falla con 500 si el rol destinatario no existe', async () => {
      prisma.rOL.findUnique.mockResolvedValue(null);

      await expect(service.crear(input())).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(prisma.aLERTA.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('acota el listado al rol del usuario autenticado', async () => {
      await service.findAll(query(), responsableAlmacen);

      expect(whereDelListado()).toEqual({
        rolDestinatario: { nombre: RolNombre.RESPONSABLE_ALMACEN },
      });
    });

    it('no aplica filtro de rol para el Gerente General: ve todas', async () => {
      await service.findAll(query(), gerenteGeneral);

      expect(whereDelListado()).toEqual({});
    });

    it('no aplica filtro de rol para el Administrador: ve todas, incluidas las de Almacén', async () => {
      await service.findAll(query(), administrador);

      expect(whereDelListado()).toEqual({});
    });

    it('combina el filtro de rol con los filtros del query', async () => {
      const desde = new Date('2026-08-01T00:00:00.000Z');
      const hasta = new Date('2026-08-31T00:00:00.000Z');

      await service.findAll(
        query({
          FK_tipo_alerta: ID_TIPO_ALERTA,
          atendida: false,
          fechaDesde: desde,
          fechaHasta: hasta,
        }),
        responsableAlmacen,
      );

      // El filtro por rol se suma a los del cliente, no los reemplaza: un
      // usuario no puede ampliar lo que ve mandando query params.
      expect(whereDelListado()).toEqual({
        rolDestinatario: { nombre: RolNombre.RESPONSABLE_ALMACEN },
        FK_tipo_alerta: ID_TIPO_ALERTA,
        atendida: false,
        hora_creacion: { gte: desde, lte: hasta },
      });
    });

    it('conserva el filtro atendida:false, que es falsy pero significativo', async () => {
      await service.findAll(query({ atendida: false }), gerenteGeneral);

      // Si el service chequeara `atendida &&` en vez de `!== undefined`, este
      // filtro desaparecería y el listado traería también las atendidas.
      expect(whereDelListado()).toEqual({ atendida: false });
    });

    it('usa el mismo where para el listado y para el total de la paginación', async () => {
      await service.findAll(
        query({ FK_tipo_alerta: ID_TIPO_ALERTA }),
        responsableAlmacen,
      );

      expect(argumentosDe(prisma.aLERTA.count)[0].where).toEqual(
        whereDelListado(),
      );
    });
  });

  describe('findOne', () => {
    it('devuelve la alerta si es del rol del usuario', async () => {
      const resultado = await service.findOne(ID_ALERTA, responsableAlmacen);

      expect(resultado.id_alerta).toBe(ID_ALERTA);
    });

    it('devuelve 404 si la alerta es de otro rol', async () => {
      prisma.aLERTA.findUnique.mockResolvedValue(
        alerta({ rolDestinatario: { nombre: RolNombre.RESPONSABLE_COMPRAS } }),
      );

      // 404 y no 403: no hace falta confirmarle a alguien que un recurso
      // existe si no puede verlo.
      await expect(
        service.findOne(ID_ALERTA, responsableAlmacen),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deja al Gerente General ver una alerta de cualquier rol', async () => {
      prisma.aLERTA.findUnique.mockResolvedValue(
        alerta({ rolDestinatario: { nombre: RolNombre.RESPONSABLE_COMPRAS } }),
      );

      const resultado = await service.findOne(ID_ALERTA, gerenteGeneral);

      expect(resultado.id_alerta).toBe(ID_ALERTA);
    });

    it('deja al Administrador ver una alerta dirigida al Responsable de Almacén', async () => {
      const resultado = await service.findOne(ID_ALERTA, administrador);

      expect(resultado.id_alerta).toBe(ID_ALERTA);
    });

    it('devuelve 404 si la alerta no existe', async () => {
      prisma.aLERTA.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(ID_ALERTA, gerenteGeneral),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('atender', () => {
    it('marca la alerta y registra quién la atendió y cuándo', async () => {
      const antes = Date.now();

      await service.atender(ID_ALERTA, responsableAlmacen);

      const [actualizacion] = argumentosDe(prisma.aLERTA.update);
      expect(actualizacion.where).toEqual({ id_alerta: ID_ALERTA });
      expect(actualizacion.data).toMatchObject({
        atendida: true,
        FK_usuario_atencion: responsableAlmacen.id,
      });

      // El usuario sale del token, nunca del body: no hay forma de que un
      // cliente diga que la atendió otro.
      const fecha = actualizacion.data?.fecha_atencion as Date;
      expect(fecha.getTime()).toBeGreaterThanOrEqual(antes);
      expect(fecha.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('rechaza con 409 si la alerta ya estaba atendida', async () => {
      prisma.aLERTA.findUnique.mockResolvedValue(alerta({ atendida: true }));

      // No hay endpoint para desmarcar: es una transición de un solo sentido.
      await expect(
        service.atender(ID_ALERTA, responsableAlmacen),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.aLERTA.update).not.toHaveBeenCalled();
    });

    it('rechaza con 404 si la alerta es de otro rol', async () => {
      prisma.aLERTA.findUnique.mockResolvedValue(
        alerta({ rolDestinatario: { nombre: RolNombre.RESPONSABLE_COMPRAS } }),
      );

      await expect(
        service.atender(ID_ALERTA, responsableAlmacen),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.aLERTA.update).not.toHaveBeenCalled();
    });
  });

  describe('findTipos', () => {
    it('devuelve los tipos ordenados por nombre, sin paginar', async () => {
      await service.findTipos();

      expect(prisma.tIPOALERTA.findMany).toHaveBeenCalledWith({
        orderBy: { nombre: 'asc' },
      });
    });
  });
});
