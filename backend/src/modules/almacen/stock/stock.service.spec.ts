import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException } from '@nestjs/common';
import { StockService } from './stock.service';
import { QueryCardexDto } from './dto/query-cardex.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlertaService } from '../../alerta/alerta.service';
import { RolNombre } from '../../../common/enums/rol.enum';
import { TipoAlertaNombre } from '../../../common/enums/tipo-alerta.enum';

interface InputAlerta {
  tipoAlertaNombre: string;
  rolDestinatario: string;
  mensaje: string;
  datos: Record<string, unknown>;
  claveDeduplicacion: string;
}

describe('StockService', () => {
  let service: StockService;
  let prisma: {
    sTOCK: { findMany: jest.Mock; findUnique: jest.Mock };
    sTOCKMOVIMIENTO: { findMany: jest.Mock; count: jest.Mock };
  };
  let alertaService: { crear: jest.Mock };

  /** Ficha activa con su artículo y su depósito resueltos. */
  const ficha = (id: number, cantidad: number, umbral: number) => ({
    id_stock: id,
    cantidad,
    umbral_minimo: umbral,
    estado: true,
    FK_articulo: id * 10,
    FK_deposito: id * 100,
    articulo: { nombre: `Artículo ${id}` },
    deposito: { nombre: `Depósito ${id}` },
  });

  /** Query del cardex con los defaults que ya aplicó el DTO Zod. */
  const filtros = (parcial: Partial<QueryCardexDto> = {}): QueryCardexDto => ({
    page: 1,
    limit: 10,
    ...parcial,
  });

  /** Inputs con los que se llamó a AlertaService.crear. */
  const inputsDeAlerta = (): InputAlerta[] =>
    (alertaService.crear.mock.calls as InputAlerta[][]).map(
      (llamada) => llamada[0],
    );

  beforeEach(async () => {
    prisma = {
      sTOCK: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      sTOCKMOVIMIENTO: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    alertaService = {
      crear: jest
        .fn()
        .mockResolvedValue({ alerta: { id_alerta: 1 }, creada: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: PrismaService, useValue: prisma },
        { provide: AlertaService, useValue: alertaService },
      ],
    }).compile();

    service = module.get(StockService);
  });

  describe('escanearFichasBajoUmbral', () => {
    it('solo mira las fichas activas', async () => {
      await service.escanearFichasBajoUmbral();

      // Una ficha dada de baja no debería generar alertas de reposición.
      expect(prisma.sTOCK.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { estado: true } }),
      );
    });

    it('alerta por cada ficha activa que está por debajo de su umbral', async () => {
      prisma.sTOCK.findMany.mockResolvedValue([
        ficha(1, 2, 5), // bajo umbral
        ficha(2, 10, 5), // por encima
        ficha(3, 0, 1), // bajo umbral
      ]);

      const resultado = await service.escanearFichasBajoUmbral();

      expect(alertaService.crear).toHaveBeenCalledTimes(2);
      expect(inputsDeAlerta().map((i) => i.claveDeduplicacion)).toEqual([
        `${TipoAlertaNombre.REPOSICION}-1`,
        `${TipoAlertaNombre.REPOSICION}-3`,
      ]);
      expect(resultado).toEqual({ fichasBajoUmbral: 2, alertasNuevas: 2 });
    });

    it('no alerta si la cantidad es exactamente el umbral', async () => {
      // El umbral es el mínimo aceptable, no el punto de quiebre: estar justo
      // en él todavía no es un problema.
      prisma.sTOCK.findMany.mockResolvedValue([ficha(1, 5, 5)]);

      await service.escanearFichasBajoUmbral();

      expect(alertaService.crear).not.toHaveBeenCalled();
    });

    it('manda el tipo, el rol y los datos de la ficha', async () => {
      prisma.sTOCK.findMany.mockResolvedValue([ficha(7, 2, 5)]);

      await service.escanearFichasBajoUmbral();

      const [input] = inputsDeAlerta();
      expect(input.tipoAlertaNombre).toBe(TipoAlertaNombre.REPOSICION);
      expect(input.rolDestinatario).toBe(RolNombre.RESPONSABLE_ALMACEN);
      expect(input.mensaje).toContain('Artículo 7');
      // El depósito va en el mensaje porque la misma combinación
      // artículo/depósito es una ficha distinta: sin él no se sabe dónde
      // reponer.
      expect(input.mensaje).toContain('Depósito 7');
      expect(input.datos).toEqual({
        stockId: 7,
        articuloId: 70,
        depositoId: 700,
        stockActual: 2,
        umbralMinimo: 5,
      });
    });

    it('usa la misma clave de deduplicación que MovimientoService', async () => {
      prisma.sTOCK.findMany.mockResolvedValue([ficha(42, 1, 5)]);

      await service.escanearFichasBajoUmbral();

      // Si el formato no coincidiera exactamente entre los dos caminos, cada
      // uno creería que la condición es nueva y alertaría por su cuenta.
      expect(inputsDeAlerta()[0].claveDeduplicacion).toBe('REPOSICION-42');
    });

    it('no cuenta como nueva una alerta que AlertaService dedupó', async () => {
      prisma.sTOCK.findMany.mockResolvedValue([ficha(1, 2, 5)]);
      alertaService.crear.mockResolvedValue({
        alerta: { id_alerta: 1 },
        creada: false,
      });

      const resultado = await service.escanearFichasBajoUmbral();

      // Es el caso normal en las corridas siguientes: la condición sigue
      // vigente y ya estaba reportada.
      expect(resultado).toEqual({ fichasBajoUmbral: 1, alertasNuevas: 0 });
    });

    it('sigue con las demás fichas si una falla', async () => {
      prisma.sTOCK.findMany.mockResolvedValue([ficha(1, 2, 5), ficha(2, 1, 5)]);
      alertaService.crear
        .mockRejectedValueOnce(new Error('Alertas caído'))
        .mockResolvedValueOnce({ alerta: { id_alerta: 2 }, creada: true });
      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      const resultado = await service.escanearFichasBajoUmbral();

      expect(alertaService.crear).toHaveBeenCalledTimes(2);
      expect(resultado).toEqual({ fichasBajoUmbral: 2, alertasNuevas: 1 });
      expect(logError).toHaveBeenCalled();

      logError.mockRestore();
    });
  });

  describe('cardex', () => {
    /** Ficha tal como la devuelve el `findUnique` del cardex. */
    const fichaCardex = {
      id_stock: 1,
      cantidad: 12,
      umbral_minimo: 5,
      estado: true,
      articulo: {
        id_articulo: 10,
        nombre: 'Cemento',
        FK_Categoria: 1,
        FK_Marca: null,
      },
      deposito: { id_deposito: 2, nombre: 'Central', es_obrador: false },
    };

    /** Línea de cardex tal como la devuelve Prisma, con su movimiento anidado. */
    const linea = (
      idLinea: number,
      idMovimiento: number,
      anterior: number,
      nuevo: number,
    ) => ({
      id_stock_movimiento: idLinea,
      cantidad: Math.abs(nuevo - anterior),
      stock_anterior: anterior,
      stock_nuevo: nuevo,
      observacion: null,
      movimiento: {
        id_movimiento: idMovimiento,
        fecha_movimiento: new Date('2026-08-10'),
        // Posterior a fecha_movimiento: es una carga retroactiva.
        hora_creacion: new Date('2026-08-15'),
        referencia: `REM-${idMovimiento}`,
        tipoMovimiento: {
          id_tipo_movimiento: 1,
          nombre: 'Ingreso por compra',
          indicador_entrada: true,
        },
        usuarioCreador: { nombre: 'Ana', apellido: 'Pérez' },
      },
    });

    beforeEach(() => {
      prisma.sTOCK.findUnique.mockResolvedValue(fichaCardex);
    });

    it('falla si no existe la ficha', async () => {
      prisma.sTOCK.findUnique.mockResolvedValue(null);

      await expect(service.cardex(99, filtros())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('pide las líneas de esa ficha ordenadas por número de movimiento ascendente', async () => {
      await service.cardex(1, filtros());

      // Orden de registro y no por fecha: es lo que hace que el stock_nuevo de
      // cada línea cierre con el stock_anterior de la siguiente aunque haya
      // movimientos cargados de forma retroactiva.
      expect(prisma.sTOCKMOVIMIENTO.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { FK_Stock: 1 },
          orderBy: { FK_Movimiento: 'asc' },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('devuelve los saldos registrados y aplana el movimiento sobre la línea', async () => {
      prisma.sTOCKMOVIMIENTO.findMany.mockResolvedValue([
        linea(1, 5, 0, 10),
        linea(2, 8, 10, 12),
      ]);
      prisma.sTOCKMOVIMIENTO.count.mockResolvedValue(2);

      const resultado = await service.cardex(1, filtros());

      expect(resultado.ficha).toEqual(fichaCardex);
      expect(resultado.meta).toEqual({ total: 2, page: 1, limit: 10 });
      expect(resultado.data).toHaveLength(2);

      const [primera, segunda] = resultado.data;
      expect(primera.id_movimiento).toBe(5);
      expect(primera.referencia).toBe('REM-5');
      expect(primera.tipoMovimiento.indicador_entrada).toBe(true);
      expect(primera.usuarioCreador).toEqual({
        nombre: 'Ana',
        apellido: 'Pérez',
      });
      // Las dos fechas viajan por separado para poder detectar las cargas
      // retroactivas.
      expect(primera.fecha_movimiento).toEqual(new Date('2026-08-10'));
      expect(primera.hora_creacion).toEqual(new Date('2026-08-15'));

      // La cadena cierra: cada saldo posterior es el anterior de la siguiente,
      // y el último coincide con el stock actual de la ficha.
      expect(primera.stock_nuevo).toBe(segunda.stock_anterior);
      expect(segunda.stock_nuevo).toBe(resultado.ficha.cantidad);
    });

    it('filtra por período contra la fecha del movimiento, sin recalcular los saldos', async () => {
      prisma.sTOCKMOVIMIENTO.findMany.mockResolvedValue([linea(2, 8, 10, 12)]);
      prisma.sTOCKMOVIMIENTO.count.mockResolvedValue(1);

      const resultado = await service.cardex(
        1,
        filtros({
          fechaDesde: new Date('2026-08-01'),
          fechaHasta: new Date('2026-08-31'),
        }),
      );

      expect(prisma.sTOCKMOVIMIENTO.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            FK_Stock: 1,
            movimiento: {
              fecha_movimiento: {
                gte: new Date('2026-08-01'),
                lte: new Date('2026-08-31'),
              },
            },
          },
        }),
      );
      // El saldo de la línea es el que quedó registrado al confirmar el
      // movimiento: acotar el período no lo rebasea a 0.
      expect(resultado.data[0].stock_anterior).toBe(10);
    });

    it('pagina sobre el historial completo', async () => {
      await service.cardex(1, filtros({ page: 3, limit: 20 }));

      expect(prisma.sTOCKMOVIMIENTO.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });
  });
});
