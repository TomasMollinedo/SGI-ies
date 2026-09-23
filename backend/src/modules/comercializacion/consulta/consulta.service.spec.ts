import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EstadoComercial, EstadoConsulta } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConsultaService } from './consulta.service';

type Args = Record<string, unknown>;

/** Primer argumento con el que se llamó a un mock, ya tipado. */
const primerArgumento = (mock: jest.Mock): Args =>
  (mock.mock.calls as Args[][])[0][0];

describe('ConsultaService', () => {
  let service: ConsultaService;
  let prisma: {
    pUBLICACIONUNIDAD: { findFirst: jest.Mock };
    cONSULTAUNIDAD: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const CLIENTE_ID = 3;
  const USUARIO_ID = 7;

  const unidadResumen = {
    id_unidad_funcional: 12,
    identificador: '3A',
    proyecto: { nombre: 'Torre Nogal' },
  };

  const consultaClienteMock = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id_consulta: 1,
    texto: '¿Tiene cochera?',
    estado: EstadoConsulta.PENDIENTE,
    respuesta: null,
    fecha_respuesta: null,
    hora_creacion: new Date('2026-09-20'),
    publicacion: { unidadFuncional: unidadResumen },
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      pUBLICACIONUNIDAD: { findFirst: jest.fn() },
      cONSULTAUNIDAD: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsultaService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ConsultaService);
  });

  describe('crear', () => {
    it('crea la consulta contra la publicación vigente y disponible de la unidad', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue({ id_publicacion: 99 });
      prisma.cONSULTAUNIDAD.create.mockResolvedValue(consultaClienteMock());

      await service.crear({ FK_unidad_funcional: 12, texto: '¿Tiene cochera?' }, CLIENTE_ID);

      expect(primerArgumento(prisma.pUBLICACIONUNIDAD.findFirst)).toEqual({
        where: {
          FK_unidad_funcional: 12,
          vigente: true,
          estado_comercial: EstadoComercial.DISPONIBLE,
        },
        select: { id_publicacion: true },
      });
      expect(primerArgumento(prisma.cONSULTAUNIDAD.create).data).toEqual({
        FK_cliente: CLIENTE_ID,
        FK_publicacion: 99,
        texto: '¿Tiene cochera?',
      });
    });

    it('rechaza si la unidad no existe o no tiene publicación vigente y disponible', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue(null);

      await expect(
        service.crear({ FK_unidad_funcional: 12, texto: 'Hola' }, CLIENTE_ID),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.cONSULTAUNIDAD.create).not.toHaveBeenCalled();
    });

    it('permite que el mismo cliente consulte dos veces la misma unidad: no valida unicidad', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue({ id_publicacion: 99 });
      prisma.cONSULTAUNIDAD.create.mockResolvedValue(consultaClienteMock());

      await service.crear({ FK_unidad_funcional: 12, texto: 'Primera' }, CLIENTE_ID);
      await service.crear({ FK_unidad_funcional: 12, texto: 'Segunda' }, CLIENTE_ID);

      expect(prisma.cONSULTAUNIDAD.create).toHaveBeenCalledTimes(2);
    });

    it('la consulta nace en estado PENDIENTE (no se manda `estado` en el create: lo define el default del schema)', async () => {
      prisma.pUBLICACIONUNIDAD.findFirst.mockResolvedValue({ id_publicacion: 99 });
      prisma.cONSULTAUNIDAD.create.mockResolvedValue(consultaClienteMock());

      await service.crear({ FK_unidad_funcional: 12, texto: 'Hola' }, CLIENTE_ID);

      expect(primerArgumento(prisma.cONSULTAUNIDAD.create).data).not.toHaveProperty('estado');
    });
  });

  describe('listarDeCliente', () => {
    it('filtra solo por el cliente autenticado, sin ninguna condición sobre la publicación', async () => {
      await service.listarDeCliente(CLIENTE_ID, 1, 10);

      expect(primerArgumento(prisma.cONSULTAUNIDAD.findMany).where).toEqual({
        FK_cliente: CLIENTE_ID,
      });
      expect(primerArgumento(prisma.cONSULTAUNIDAD.findMany).orderBy).toEqual({
        hora_creacion: 'desc',
      });
    });

    it('mapea la unidad desde publicacion.unidadFuncional, sin dato de quién respondió', async () => {
      prisma.cONSULTAUNIDAD.findMany.mockResolvedValue([consultaClienteMock()]);
      prisma.cONSULTAUNIDAD.count.mockResolvedValue(1);

      const resultado = await service.listarDeCliente(CLIENTE_ID, 1, 10);

      expect(resultado.data[0].unidad).toEqual(unidadResumen);
      expect(resultado.data[0]).not.toHaveProperty('cliente');
      expect(resultado.meta).toEqual({ total: 1, page: 1, limit: 10 });
    });

    it('sigue devolviendo la consulta aunque la unidad ya se haya despublicado (no filtra por vigencia)', async () => {
      // La consulta de una unidad despublicada no se distingue de ninguna
      // otra en este service: no hay ningún filtro de `vigente` que la saque.
      await service.listarDeCliente(CLIENTE_ID, 1, 10);

      const where = primerArgumento(prisma.cONSULTAUNIDAD.findMany).where as Record<
        string,
        unknown
      >;
      expect(where).not.toHaveProperty('publicacion');
      expect(JSON.stringify(where)).not.toContain('vigente');
    });
  });

  describe('listar (cola interna)', () => {
    it('combina los cuatro filtros: unidad, cliente, estado y período', async () => {
      await service.listar({
        FK_unidad_funcional: 12,
        FK_cliente: CLIENTE_ID,
        estado: EstadoConsulta.PENDIENTE,
        fechaDesde: new Date('2026-08-01'),
        fechaHasta: new Date('2026-08-31'),
        page: 1,
        limit: 10,
      });

      expect(primerArgumento(prisma.cONSULTAUNIDAD.findMany).where).toEqual({
        FK_cliente: CLIENTE_ID,
        estado: EstadoConsulta.PENDIENTE,
        publicacion: { FK_unidad_funcional: 12 },
        hora_creacion: { gte: new Date('2026-08-01'), lte: new Date('2026-08-31') },
      });
    });

    it('sin filtros, pagina con el orden por defecto (más reciente primero)', async () => {
      await service.listar({ page: 2, limit: 20 });

      const llamada = primerArgumento(prisma.cONSULTAUNIDAD.findMany);
      expect(llamada.where).toEqual({});
      expect(llamada.orderBy).toEqual({ hora_creacion: 'desc' });
      expect(llamada.skip).toBe(20);
      expect(llamada.take).toBe(20);
    });

    it('incluye al cliente en cada fila, a diferencia de la vista del propio cliente', async () => {
      prisma.cONSULTAUNIDAD.findMany.mockResolvedValue([
        { ...consultaClienteMock(), cliente: { id_cliente: 3, nombre: 'Ana', apellido: 'Pérez', email: 'a@a.com' } },
      ]);
      prisma.cONSULTAUNIDAD.count.mockResolvedValue(1);

      const resultado = await service.listar({ page: 1, limit: 10 });

      expect(resultado.data[0].cliente).toEqual({
        id_cliente: 3,
        nombre: 'Ana',
        apellido: 'Pérez',
        email: 'a@a.com',
      });
    });
  });

  describe('responder', () => {
    it('pasa la consulta pendiente a RESPONDIDA, con fecha y usuario', async () => {
      prisma.cONSULTAUNIDAD.findUnique.mockResolvedValue({ estado: EstadoConsulta.PENDIENTE });
      prisma.cONSULTAUNIDAD.update.mockResolvedValue({
        ...consultaClienteMock(),
        cliente: { id_cliente: 3, nombre: 'Ana', apellido: null, email: 'a@a.com' },
      });

      await service.responder(1, { respuesta: 'Sí, tiene cochera' }, USUARIO_ID);

      expect(primerArgumento(prisma.cONSULTAUNIDAD.update).data).toEqual({
        estado: EstadoConsulta.RESPONDIDA,
        respuesta: 'Sí, tiene cochera',
        fecha_respuesta: expect.any(Date) as Date,
        FK_usuario_respuesta: USUARIO_ID,
      });
    });

    it('rechaza responder una consulta que no existe', async () => {
      prisma.cONSULTAUNIDAD.findUnique.mockResolvedValue(null);

      await expect(
        service.responder(999, { respuesta: 'Hola' }, USUARIO_ID),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.cONSULTAUNIDAD.update).not.toHaveBeenCalled();
    });

    it('rechaza volver a responder una consulta ya respondida: no existe endpoint que edite la respuesta', async () => {
      prisma.cONSULTAUNIDAD.findUnique.mockResolvedValue({ estado: EstadoConsulta.RESPONDIDA });

      await expect(
        service.responder(1, { respuesta: 'Otra respuesta' }, USUARIO_ID),
      ).rejects.toThrow(ConflictException);
      expect(prisma.cONSULTAUNIDAD.update).not.toHaveBeenCalled();
    });
  });
});
