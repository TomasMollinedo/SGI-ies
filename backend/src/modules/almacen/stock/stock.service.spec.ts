import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { StockService } from './stock.service';
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
  let prisma: { sTOCK: { findMany: jest.Mock } };
  let alertaService: { crear: jest.Mock };

  /** Ficha activa con su artículo resuelto. */
  const ficha = (id: number, cantidad: number, umbral: number) => ({
    id_stock: id,
    cantidad,
    umbral_minimo: umbral,
    estado: true,
    FK_articulo: id * 10,
    articulo: { nombre: `Artículo ${id}` },
  });

  /** Inputs con los que se llamó a AlertaService.crear. */
  const inputsDeAlerta = (): InputAlerta[] =>
    (alertaService.crear.mock.calls as InputAlerta[][]).map(
      (llamada) => llamada[0],
    );

  beforeEach(async () => {
    prisma = { sTOCK: { findMany: jest.fn().mockResolvedValue([]) } };
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
      expect(input.datos).toEqual({
        stockId: 7,
        articuloId: 70,
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
});
