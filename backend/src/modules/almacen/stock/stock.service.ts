import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { QueryStockDto } from './dto/query-stock.dto';
import { AlertaService } from '../../alerta/alerta.service';
import { RolNombre } from '../../../common/enums/rol.enum';
import { TipoAlertaNombre } from '../../../common/enums/tipo-alerta.enum';

const ARTICULO_RESUMEN_SELECT = {
  id_articulo: true,
  nombre: true,
  FK_Categoria: true,
  FK_Marca: true,
} as const;

const DEPOSITO_RESUMEN_SELECT = {
  id_deposito: true,
  nombre: true,
  es_obrador: true,
} as const;

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertaService: AlertaService,
  ) {}

  /**
   * Revisa periódicamente qué fichas activas quedaron por debajo de su umbral
   * mínimo y genera la alerta de reposición correspondiente.
   *
   * Es el complemento del camino reactivo de MovimientoService: aquel solo se
   * entera cuando alguien mueve stock. Este detecta condiciones que siguen
   * vigentes aunque nadie vuelva a tocar la ficha — por ejemplo, una alerta
   * que se marcó como atendida sin que nadie repusiera nada.
   *
   * De no apilar alertas mientras la condición sigue abierta se encarga la
   * deduplicación por clave de AlertaService, así que este método puede correr
   * las veces que haga falta sin generar ruido.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async escanearFichasBajoUmbral() {
    // `cantidad < umbral_minimo` compara dos columnas de la misma fila, y el
    // `where` de Prisma solo compara una columna contra un valor o una
    // relación. Por eso se traen las fichas activas y se filtra en memoria en
    // vez de bajar a SQL crudo: al volumen de fichas de este proyecto, la
    // diferencia es irrelevante.
    const fichasActivas = await this.prisma.sTOCK.findMany({
      where: { estado: true },
      include: { articulo: { select: { nombre: true } } },
    });

    const bajoUmbral = fichasActivas.filter(
      (ficha) => ficha.cantidad < ficha.umbral_minimo,
    );

    let alertasNuevas = 0;

    for (const ficha of bajoUmbral) {
      try {
        const { creada } = await this.alertaService.crear({
          tipoAlertaNombre: TipoAlertaNombre.REPOSICION,
          rolDestinatario: RolNombre.RESPONSABLE_ALMACEN,
          mensaje: `Stock de "${ficha.articulo.nombre}" sigue bajo el umbral (${ficha.cantidad} unidades, umbral: ${ficha.umbral_minimo})`,
          datos: {
            stockId: ficha.id_stock,
            articuloId: ficha.FK_articulo,
            stockActual: ficha.cantidad,
            umbralMinimo: ficha.umbral_minimo,
          },
          // Idéntica a la que arma MovimientoService: si no coincidieran, cada
          // camino alertaría por su cuenta sobre la misma ficha.
          claveDeduplicacion: `${TipoAlertaNombre.REPOSICION}-${ficha.id_stock}`,
        });

        if (creada) {
          alertasNuevas++;
        }
      } catch (error) {
        // Una ficha que falla no puede cortar el escaneo de las demás.
        this.logger.error(
          `No se pudo generar la alerta de reposición para la ficha ${ficha.id_stock} durante el escaneo`,
          error,
        );
      }
    }

    this.logger.log(
      `Escaneo de stock: ${bajoUmbral.length} fichas bajo umbral, ${alertasNuevas} alertas nuevas.`,
    );

    return { fichasBajoUmbral: bajoUmbral.length, alertasNuevas };
  }

  async create(dto: CreateStockDto, usuarioId: number) {
    await this.validarArticuloExiste(dto.FK_articulo);
    await this.validarDepositoActivo(dto.FK_deposito);
    await this.validarFichaUnica(dto.FK_articulo, dto.FK_deposito);

    return this.prisma.sTOCK.create({
      data: {
        FK_articulo: dto.FK_articulo,
        FK_deposito: dto.FK_deposito,
        umbral_minimo: dto.umbral_minimo,
        observaciones: dto.observaciones,
        // El stock actual siempre arranca en 0: lo actualizan exclusivamente
        // los movimientos de HU-07, nunca el alta de la ficha.
        cantidad: 0,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
      },
    });
  }

  async findAll(query: QueryStockDto) {
    const {
      FK_deposito,
      es_obrador,
      FK_Categoria,
      nombreArticulo,
      estado,
      page,
      limit,
    } = query;

    const where: Prisma.STOCKWhereInput = {
      ...(FK_deposito !== undefined && { FK_deposito }),
      ...(estado !== undefined && { estado }),
      ...(es_obrador !== undefined && { deposito: { es_obrador } }),
      ...((FK_Categoria !== undefined || nombreArticulo) && {
        articulo: {
          ...(FK_Categoria !== undefined && { FK_Categoria }),
          ...(nombreArticulo && {
            nombre: { contains: nombreArticulo, mode: 'insensitive' },
          }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.sTOCK.findMany({
        where,
        select: {
          id_stock: true,
          cantidad: true,
          umbral_minimo: true,
          observaciones: true,
          estado: true,
          FK_articulo: true,
          FK_deposito: true,
          articulo: { select: ARTICULO_RESUMEN_SELECT },
          deposito: { select: DEPOSITO_RESUMEN_SELECT },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id_stock: 'asc' },
      }),
      this.prisma.sTOCK.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  /**
   * Detalle de una ficha: a diferencia del listado, incluye nombre y
   * apellido de quién la creó y de quién la modificó por última vez.
   */
  async findOne(id: number) {
    const stock = await this.prisma.sTOCK.findUnique({
      where: { id_stock: id },
      include: {
        articulo: { select: ARTICULO_RESUMEN_SELECT },
        deposito: { select: DEPOSITO_RESUMEN_SELECT },
        usuarioCreador: { select: { nombre: true, apellido: true } },
        usuarioActualizador: { select: { nombre: true, apellido: true } },
      },
    });

    if (!stock) {
      throw new NotFoundException(`No existe una ficha de stock con id ${id}`);
    }

    return stock;
  }

  async update(id: number, dto: UpdateStockDto, usuarioId: number) {
    await this.findOne(id);

    return this.prisma.sTOCK.update({
      where: { id_stock: id },
      data: {
        ...dto,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Baja lógica: no se permite si la ficha ya está inactiva, ni si tiene
   * stock actual mayor a 0.
   */
  async baja(id: number, usuarioId: number) {
    const stock = await this.findOne(id);

    if (!stock.estado) {
      throw new ConflictException('La ficha de stock ya está dada de baja');
    }

    if (stock.cantidad > 0) {
      throw new ConflictException(
        'No se puede dar de baja la ficha: tiene stock actual mayor a 0',
      );
    }

    return this.prisma.sTOCK.update({
      where: { id_stock: id },
      data: {
        estado: false,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Alta lógica (reactivar): solo si está de baja. Vuelve a validar que no
   * haya otra ficha activa para la misma combinación artículo–depósito,
   * porque mientras estuvo de baja pudo haberse creado una nueva.
   */
  async activar(id: number, usuarioId: number) {
    const stock = await this.findOne(id);

    if (stock.estado) {
      throw new ConflictException('La ficha de stock ya está activa');
    }

    await this.validarFichaUnica(stock.FK_articulo, stock.FK_deposito, id);

    return this.prisma.sTOCK.update({
      where: { id_stock: id },
      data: {
        estado: true,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Stock consolidado de un artículo: suma la cantidad de todas sus fichas
   * activas en depósitos/obradores también activos.
   */
  async consolidadoPorArticulo(idArticulo: number) {
    await this.validarArticuloExiste(idArticulo);

    const resultado = await this.prisma.sTOCK.aggregate({
      where: {
        FK_articulo: idArticulo,
        estado: true,
        deposito: { estado: true },
      },
      _sum: { cantidad: true },
    });

    return {
      FK_articulo: idArticulo,
      stock_total: resultado._sum.cantidad ?? 0,
    };
  }

  private async validarArticuloExiste(idArticulo: number) {
    const articulo = await this.prisma.aRTICULO.findUnique({
      where: { id_articulo: idArticulo },
    });

    if (!articulo) {
      throw new NotFoundException(`No existe un artículo con id ${idArticulo}`);
    }
    if (!articulo.estado) {
      throw new ConflictException(
        'no se puede crear una ficha de stock para un articulo dado de baja',
      );
    }
  }

  private async validarDepositoActivo(idDeposito: number) {
    const deposito = await this.prisma.dEPOSITO.findUnique({
      where: { id_deposito: idDeposito },
    });

    if (!deposito) {
      throw new NotFoundException(
        `No existe un depósito/obrador con id ${idDeposito}`,
      );
    }

    if (!deposito.estado) {
      throw new ConflictException(
        'No se puede crear una ficha de stock en un depósito/obrador dado de baja',
      );
    }
  }

  private async validarFichaUnica(
    idArticulo: number,
    idDeposito: number,
    idExcluido?: number,
  ) {
    const existe = await this.prisma.sTOCK.findFirst({
      where: {
        FK_articulo: idArticulo,
        FK_deposito: idDeposito,
        estado: true,
        ...(idExcluido !== undefined && { id_stock: { not: idExcluido } }),
      },
    });

    if (existe) {
      throw new ConflictException(
        'Ya existe una ficha de stock activa para ese artículo en ese depósito/obrador',
      );
    }
  }
}
