import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProveedorService } from './proveedor.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { createProveedorSchema } from './dto/create-proveedor.dto';
import { updateProveedorSchema } from './dto/update-proveedor.dto';

/** Primer argumento con el que se llamó a un mock de Prisma, ya tipado. */
type ArgumentoPrisma = {
  data?: Record<string, unknown>;
  where?: Record<string, unknown>;
  select?: Record<string, unknown>;
};

const primerArgumento = (mock: jest.Mock): ArgumentoPrisma =>
  (mock.mock.calls as ArgumentoPrisma[][])[0][0];

describe('ProveedorService', () => {
  let service: ProveedorService;
  let prisma: {
    pROVEEDOR: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    oRDENCOMPRA: { findFirst: jest.Mock };
    cOMPROBANTEPROVEEDOR: { findFirst: jest.Mock };
  };

  const USUARIO_ID = 7;
  const CUIT_VALIDO = '30500010912';
  const CBU_VALIDO = '0170099220000067797151';
  const ALIAS_VALIDO = 'mi.alias.banco';

  const proveedorMock = {
    id_proveedor: 1,
    razon_social: 'Acme SA',
    cuit: CUIT_VALIDO,
    condicion_iva: 'RESPONSABLE_INSCRIPTO',
    domicilio: null,
    telefono: null,
    correo: null,
    banco: null,
    titular: null,
    cbu: null,
    alias: null,
    observaciones: null,
    estado: true,
  };

  // Para las validaciones de DTO: solo los obligatorios del alta, así el único
  // motivo de rechazo posible es el campo que prueba cada caso.
  const DTO_BASE = {
    razon_social: 'Acme SA',
    cuit: CUIT_VALIDO,
    condicion_iva: 'RESPONSABLE_INSCRIPTO',
  };

  const validarAlta = (campos: Record<string, unknown>) =>
    createProveedorSchema.safeParse({ ...DTO_BASE, ...campos });

  beforeEach(async () => {
    prisma = {
      pROVEEDOR: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      oRDENCOMPRA: { findFirst: jest.fn().mockResolvedValue(null) },
      cOMPROBANTEPROVEEDOR: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProveedorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ProveedorService);
  });

  describe('findCondicionesIva', () => {
    it('devuelve el catálogo con id (valor de base) y code (etiqueta)', () => {
      const catalogo = service.findCondicionesIva();

      expect(catalogo).toContainEqual({
        id: 'RESPONSABLE_INSCRIPTO',
        code: 'Responsable Inscripto',
        metadata: {},
      });
      expect(catalogo).toHaveLength(4);
    });
  });

  describe('create', () => {
    const dto = {
      razon_social: 'Acme SA',
      cuit: CUIT_VALIDO,
      condicion_iva: 'RESPONSABLE_INSCRIPTO' as const,
    };

    it('rechaza un CUIT ya usado por un proveedor activo', async () => {
      prisma.pROVEEDOR.findFirst.mockResolvedValue(proveedorMock);

      await expect(service.create(dto, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.pROVEEDOR.create).not.toHaveBeenCalled();
    });

    it('rechaza un CUIT ya usado por un proveedor dado de baja (no solo activos)', async () => {
      prisma.pROVEEDOR.findFirst.mockResolvedValue({
        ...proveedorMock,
        estado: false,
      });

      await expect(service.create(dto, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.pROVEEDOR.create).not.toHaveBeenCalled();
    });

    it('rechaza una razón social ya usada por otro proveedor activo', async () => {
      // El CUIT no choca (primera consulta), la razón social sí (segunda).
      prisma.pROVEEDOR.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(proveedorMock);

      await expect(service.create(dto, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.pROVEEDOR.create).not.toHaveBeenCalled();
    });

    it('completa la auditoría con el usuario autenticado', async () => {
      prisma.pROVEEDOR.create.mockResolvedValue(proveedorMock);

      await service.create(dto, USUARIO_ID);

      expect(prisma.pROVEEDOR.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          FK_usuario_creador: USUARIO_ID,
          FK_usuario_actualizador: USUARIO_ID,
        },
      });
    });

    it('guarda los datos bancarios que vienen en el body', async () => {
      prisma.pROVEEDOR.create.mockResolvedValue(proveedorMock);
      const datosBancarios = {
        banco: 'Banco Macro',
        titular: 'Acme SA',
        cbu: CBU_VALIDO,
        alias: ALIAS_VALIDO,
      };

      await service.create({ ...dto, ...datosBancarios }, USUARIO_ID);

      expect(primerArgumento(prisma.pROVEEDOR.create).data).toMatchObject(
        datosBancarios,
      );
    });
  });

  describe('findAll', () => {
    it('sin filtro de estado, lista solo proveedores activos', async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([]);
      prisma.pROVEEDOR.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 });

      expect(primerArgumento(prisma.pROVEEDOR.findMany).where).toEqual({
        estado: true,
      });
    });

    it('con estado=false, lista solo los dados de baja', async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([]);
      prisma.pROVEEDOR.count.mockResolvedValue(0);

      await service.findAll({ estado: false, page: 1, limit: 10 });

      expect(primerArgumento(prisma.pROVEEDOR.findMany).where).toEqual({
        estado: false,
      });
    });

    it("con estado='todos', lista activos e inactivos (para poder reactivar)", async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([]);
      prisma.pROVEEDOR.count.mockResolvedValue(0);

      await service.findAll({ estado: 'todos', page: 1, limit: 10 });

      expect(primerArgumento(prisma.pROVEEDOR.findMany).where).toEqual({});
    });

    it('busqueda con una sola palabra filtra por coincidencia parcial de razón social o CUIT', async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([]);
      prisma.pROVEEDOR.count.mockResolvedValue(0);

      await service.findAll({ busqueda: '3050', page: 1, limit: 10 });

      expect(primerArgumento(prisma.pROVEEDOR.findMany).where).toEqual({
        estado: true,
        OR: [
          {
            AND: [{ razon_social: { contains: '3050', mode: 'insensitive' } }],
          },
          { cuit: { contains: '3050' } },
        ],
      });
    });

    it('busqueda con varias palabras exige las dos en la razón social, sin importar el orden', async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([]);
      prisma.pROVEEDOR.count.mockResolvedValue(0);

      await service.findAll({
        busqueda: 'farmacia bermejo',
        page: 1,
        limit: 10,
      });

      expect(primerArgumento(prisma.pROVEEDOR.findMany).where).toEqual({
        estado: true,
        OR: [
          {
            AND: [
              { razon_social: { contains: 'farmacia', mode: 'insensitive' } },
              { razon_social: { contains: 'bermejo', mode: 'insensitive' } },
            ],
          },
          { cuit: { contains: 'farmacia bermejo' } },
        ],
      });
    });

    it('trae los datos bancarios, porque la edición se arma con la fila del listado', async () => {
      prisma.pROVEEDOR.findMany.mockResolvedValue([]);
      prisma.pROVEEDOR.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 });

      expect(primerArgumento(prisma.pROVEEDOR.findMany).select).toMatchObject({
        banco: true,
        titular: true,
        cbu: true,
        alias: true,
      });
    });
  });

  describe('update', () => {
    it('falla si el proveedor no existe', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(null);

      await expect(
        service.update(99, { telefono: '1122334455' }, USUARIO_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('no revalida CUIT ni razón social si no vienen en el body', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(proveedorMock);
      prisma.pROVEEDOR.update.mockResolvedValue(proveedorMock);

      await service.update(1, { telefono: '1122334455' }, USUARIO_ID);

      expect(prisma.pROVEEDOR.findFirst).not.toHaveBeenCalled();
      expect(prisma.pROVEEDOR.update).toHaveBeenCalled();
    });

    it('actualiza los datos bancarios, y un string vacío borra el dato cargado', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue({
        ...proveedorMock,
        cbu: CBU_VALIDO,
        alias: ALIAS_VALIDO,
      });
      prisma.pROVEEDOR.update.mockResolvedValue(proveedorMock);

      // Pasa por el schema como en un request real: el ZodValidationPipe
      // global valida el body antes de que llegue al service.
      const dto = updateProveedorSchema.parse({
        banco: 'Banco Galicia',
        cbu: '',
        alias: '',
      });

      await service.update(1, dto, USUARIO_ID);

      const dataEnviada = primerArgumento(prisma.pROVEEDOR.update).data;
      expect(dataEnviada).toMatchObject({
        banco: 'Banco Galicia',
        cbu: '',
        alias: '',
      });
      expect(dataEnviada?.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('un string vacío en correo borra el correo cargado', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue({
        ...proveedorMock,
        correo: 'contacto@proveedor.com',
      });
      prisma.pROVEEDOR.update.mockResolvedValue(proveedorMock);

      const dto = updateProveedorSchema.parse({ correo: '' });

      await service.update(1, dto, USUARIO_ID);

      expect(primerArgumento(prisma.pROVEEDOR.update).data?.correo).toBe('');
    });
  });

  describe('baja', () => {
    it('da de baja un proveedor activo sin operaciones vigentes', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(proveedorMock);
      prisma.pROVEEDOR.update.mockResolvedValue({
        ...proveedorMock,
        estado: false,
      });

      await service.baja(1, USUARIO_ID);

      const dataEnviada = primerArgumento(prisma.pROVEEDOR.update).data;
      expect(dataEnviada?.estado).toBe(false);
      expect(dataEnviada?.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('rechaza si el proveedor ya está dado de baja', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue({
        ...proveedorMock,
        estado: false,
      });

      await expect(service.baja(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.pROVEEDOR.update).not.toHaveBeenCalled();
    });

    it('rechaza con una OC EMITIDA', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(proveedorMock);
      prisma.oRDENCOMPRA.findFirst.mockResolvedValue({ id_orden_compra: 1 });

      await expect(service.baja(1, USUARIO_ID)).rejects.toThrow(
        /órdenes de compra en curso/,
      );
      expect(prisma.pROVEEDOR.update).not.toHaveBeenCalled();
    });

    it('rechaza con una OC RECIBIDA_PARCIAL', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(proveedorMock);
      // El mock no filtra por `where`, así que alcanza con simular "existe
      // una coincidencia" para el estado bajo prueba.
      prisma.oRDENCOMPRA.findFirst.mockResolvedValue({ id_orden_compra: 2 });

      await expect(service.baja(1, USUARIO_ID)).rejects.toThrow(
        /órdenes de compra en curso/,
      );
    });

    it('rechaza con una OC en BORRADOR', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(proveedorMock);
      prisma.oRDENCOMPRA.findFirst.mockResolvedValue({ id_orden_compra: 3 });

      await expect(service.baja(1, USUARIO_ID)).rejects.toThrow(
        /órdenes de compra en curso/,
      );
      expect(prisma.pROVEEDOR.update).not.toHaveBeenCalled();
    });

    it('una OC en RECIBIDA o CANCELADA (estados finales) no bloquea la baja', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(proveedorMock);
      prisma.pROVEEDOR.update.mockResolvedValue({
        ...proveedorMock,
        estado: false,
      });
      // RECIBIDA/CANCELADA no matchean el `where` real (que solo busca
      // BORRADOR/EMITIDA/RECIBIDA_PARCIAL), así que el mock devuelve null.
      prisma.oRDENCOMPRA.findFirst.mockResolvedValue(null);

      await expect(service.baja(1, USUARIO_ID)).resolves.toBeDefined();
    });

    it('rechaza con un comprobante REGISTRADO con saldo pendiente', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(proveedorMock);
      prisma.cOMPROBANTEPROVEEDOR.findFirst.mockResolvedValue({
        id_comprobante_proveedor: 1,
      });

      await expect(service.baja(1, USUARIO_ID)).rejects.toThrow(
        /comprobantes con saldo pendiente/,
      );
      expect(prisma.pROVEEDOR.update).not.toHaveBeenCalled();
    });

    it('un comprobante ANULADO o con saldo ya cancelado no bloquea la baja', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(proveedorMock);
      prisma.pROVEEDOR.update.mockResolvedValue({
        ...proveedorMock,
        estado: false,
      });
      // ANULADO/saldo_cancelado=true no matchean el `where` real (que exige
      // REGISTRADO + saldo_cancelado=false), así que el mock devuelve null.
      prisma.cOMPROBANTEPROVEEDOR.findFirst.mockResolvedValue(null);

      await expect(service.baja(1, USUARIO_ID)).resolves.toBeDefined();
    });

    it('combina los dos motivos en un solo mensaje si fallan ambas condiciones', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(proveedorMock);
      prisma.oRDENCOMPRA.findFirst.mockResolvedValue({ id_orden_compra: 1 });
      prisma.cOMPROBANTEPROVEEDOR.findFirst.mockResolvedValue({
        id_comprobante_proveedor: 1,
      });

      await expect(service.baja(1, USUARIO_ID)).rejects.toThrow(
        /órdenes de compra en curso.*comprobantes con saldo pendiente/,
      );
    });
  });

  describe('activar', () => {
    it('reactiva un proveedor dado de baja', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue({
        ...proveedorMock,
        estado: false,
      });
      prisma.pROVEEDOR.update.mockResolvedValue(proveedorMock);

      await service.activar(1, USUARIO_ID);

      const dataEnviada = primerArgumento(prisma.pROVEEDOR.update).data;
      expect(dataEnviada?.estado).toBe(true);
      expect(dataEnviada?.FK_usuario_actualizador).toBe(USUARIO_ID);
    });

    it('rechaza si el proveedor ya está activo', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue(proveedorMock);

      await expect(service.activar(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.pROVEEDOR.update).not.toHaveBeenCalled();
    });

    it('revalida la razón social: si otro activo la tomó mientras estaba de baja, rechaza', async () => {
      prisma.pROVEEDOR.findUnique.mockResolvedValue({
        ...proveedorMock,
        estado: false,
      });
      prisma.pROVEEDOR.findFirst.mockResolvedValue({
        ...proveedorMock,
        id_proveedor: 2,
      });

      await expect(service.activar(1, USUARIO_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.pROVEEDOR.update).not.toHaveBeenCalled();
    });
  });

  describe('validación del CUIT (DTO)', () => {
    // Solo se valida el formato: cualquier combinación de once dígitos pasa,
    // aunque su último dígito no cierre con el algoritmo de AFIP.
    it.each(['30712345678', '20123456789', CUIT_VALIDO])(
      'acepta %s',
      (cuit) => {
        expect(validarAlta({ cuit }).success).toBe(true);
      },
    );

    it('recorta los espacios de los extremos antes de validar', () => {
      expect(validarAlta({ cuit: ` ${CUIT_VALIDO} ` }).data?.cuit).toBe(
        CUIT_VALIDO,
      );
    });

    it.each([
      ['vacío', ''],
      ['de 10 dígitos', '3071234567'],
      ['de 12 dígitos', '307123456789'],
      ['con guiones', '30-71234567-8'],
      ['con letras', '3071234567a'],
      ['con espacios intermedios', '30712 345678'],
    ])('rechaza un CUIT %s', (_caso, cuit) => {
      const resultado = validarAlta({ cuit });

      expect(resultado.success).toBe(false);
      expect(resultado.error?.issues[0].path).toEqual(['cuit']);
      expect(resultado.error?.issues[0].message).toMatch(/11 dígitos/);
    });

    it('la edición aplica la misma regla', () => {
      expect(
        updateProveedorSchema.safeParse({ cuit: '30712345678' }).success,
      ).toBe(true);
      expect(
        updateProveedorSchema.safeParse({ cuit: '3071234567' }).success,
      ).toBe(false);
    });
  });

  describe('validación del correo (DTO)', () => {
    it('acepta un correo válido, y le recorta los espacios de los extremos', () => {
      expect(
        validarAlta({ correo: ' contacto@proveedor.com ' }).data?.correo,
      ).toBe('contacto@proveedor.com');
    });

    it('la edición acepta el string vacío: así se borra el correo cargado', () => {
      expect(updateProveedorSchema.safeParse({ correo: '' }).success).toBe(
        true,
      );
    });

    it.each([
      ['sin arroba', 'contacto.proveedor.com'],
      ['sin dominio', 'contacto@'],
      ['con espacios intermedios', 'contacto @proveedor.com'],
    ])('rechaza un correo %s', (_caso, correo) => {
      const resultado = validarAlta({ correo });

      expect(resultado.success).toBe(false);
      expect(resultado.error?.issues[0].path).toEqual(['correo']);
      expect(resultado.error?.issues[0].message).toBe('El correo no es válido');
    });
  });

  describe('validación de datos bancarios (DTO)', () => {
    it('los cuatro son opcionales: un alta sin datos bancarios es válida', () => {
      expect(validarAlta({}).success).toBe(true);
    });

    describe('cbu', () => {
      it('acepta 22 dígitos', () => {
        expect(validarAlta({ cbu: CBU_VALIDO }).success).toBe(true);
      });

      it('acepta el string vacío (así borra el CBU la edición)', () => {
        expect(validarAlta({ cbu: '' }).success).toBe(true);
      });

      it('recorta los espacios de los extremos antes de validar', () => {
        expect(validarAlta({ cbu: ` ${CBU_VALIDO} ` }).data?.cbu).toBe(
          CBU_VALIDO,
        );
      });

      it.each([
        ['21 dígitos', CBU_VALIDO.slice(0, 21)],
        ['23 dígitos', `${CBU_VALIDO}0`],
        ['una letra', `${CBU_VALIDO.slice(0, 21)}A`],
        ['guiones', `${CBU_VALIDO.slice(0, 8)}-${CBU_VALIDO.slice(8)}`],
        [
          'espacios intermedios',
          `${CBU_VALIDO.slice(0, 8)} ${CBU_VALIDO.slice(8)}`,
        ],
      ])('rechaza un CBU con %s', (_caso, cbu) => {
        const resultado = validarAlta({ cbu });

        expect(resultado.success).toBe(false);
        expect(resultado.error?.issues[0].path).toEqual(['cbu']);
        expect(resultado.error?.issues[0].message).toMatch(/22 dígitos/);
      });
    });

    describe('alias', () => {
      it.each([
        ['con puntos', ALIAS_VALIDO],
        ['con guiones', 'proveedor-acme-01'],
        ['de 6 caracteres (el mínimo)', 'abc123'],
        ['de 20 caracteres (el máximo)', 'a'.repeat(20)],
      ])('acepta un alias %s', (_caso, alias) => {
        expect(validarAlta({ alias }).success).toBe(true);
      });

      it('acepta el string vacío (así borra el alias la edición)', () => {
        expect(validarAlta({ alias: '' }).success).toBe(true);
      });

      it.each([
        ['de 5 caracteres', 'abc12'],
        ['de 21 caracteres', 'a'.repeat(21)],
        ['con espacios', 'mi alias banco'],
        ['con guion bajo', 'mi_alias_banco'],
        ['con ñ', 'mañana.banco'],
      ])('rechaza un alias %s', (_caso, alias) => {
        const resultado = validarAlta({ alias });

        expect(resultado.success).toBe(false);
        expect(resultado.error?.issues[0].path).toEqual(['alias']);
        expect(resultado.error?.issues[0].message).toMatch(/entre 6 y 20/);
      });
    });

    it('rechaza un banco de más de 100 caracteres', () => {
      expect(validarAlta({ banco: 'B'.repeat(101) }).success).toBe(false);
    });

    it('la edición aplica las mismas reglas de CBU y alias', () => {
      expect(updateProveedorSchema.safeParse({ cbu: '123' }).success).toBe(
        false,
      );
      expect(updateProveedorSchema.safeParse({ alias: 'abc' }).success).toBe(
        false,
      );
    });
  });
});
