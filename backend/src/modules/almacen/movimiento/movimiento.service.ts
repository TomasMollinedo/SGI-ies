import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ALERTA, Prisma, STOCK } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { QueryMovimientoDto } from './dto/query-movimiento.dto';
import { AlertaService } from '../../alerta/alerta.service';
import { RolNombre } from '../../../common/enums/rol.enum';
import { TipoAlertaNombre } from '../../../common/enums/tipo-alerta.enum';

const TIPO_MOVIMIENTO_RESUMEN_SELECT = {
  id_tipo_movimiento: true,
  nombre: true,
  indicador_entrada: true,
} as const;

const DEPOSITO_RESUMEN_SELECT = {
  id_deposito: true,
  nombre: true,
  es_obrador: true,
} as const;

const USUARIO_RESUMEN_SELECT = {
  nombre: true,
  apellido: true,
} as const;

/** Ficha de stock con el nombre de su artículo, como se lee al validar el detalle. */
type FichaConArticulo = STOCK & { articulo: { nombre: string } };

/**
 * Efecto de una línea sobre su ficha, tal como quedó aplicado dentro de la
 * transacción. Se acumula para poder evaluar los cruces de umbral después, sin
 * volver a leer la base.
 */
interface ResultadoLinea {
  ficha: FichaConArticulo;
  stockAnterior: number;
  stockNuevo: number;
}

@Injectable()
export class MovimientoService {
  private readonly logger = new Logger(MovimientoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertaService: AlertaService,
  ) {}

  /**
   * Registra un movimiento completo: cabecera, líneas de detalle y la
   * actualización del stock de cada ficha afectada.
   *
   * Todo lo que hace a la integridad de los datos va dentro de una única
   * transacción: si una línea falla (por ejemplo, la tercera de cinco no tiene
   * stock suficiente), se revierte todo, incluidas las líneas que ya se habían
   * aplicado. Las alertas de reposición, en cambio, se generan después de que
   * la transacción confirmó: son un efecto secundario, no parte del registro
   * del movimiento (ver `generarAlertasDeReposicion`).
   */
  async create(dto: CreateMovimientoDto, usuarioId: number) {
    const tipoMovimiento = await this.buscarTipoMovimientoActivo(
      dto.FK_TipoMovimiento,
    );
    await this.validarDepositoExiste(dto.FK_Deposito);

    const fichaPorId = await this.buscarFichasValidadas(dto);
    const fechaMovimiento = this.resolverFechaMovimiento(dto.fecha_movimiento);

    this.validarStockSuficiente(
      dto,
      tipoMovimiento.indicador_entrada,
      fichaPorId,
    );

    const { idMovimiento, resultadosPorLinea } = await this.prisma.$transaction(
      async (tx) => {
        const movimiento = await tx.mOVIMIENTO.create({
          data: {
            fecha_movimiento: fechaMovimiento,
            referencia: dto.referencia,
            observaciones: dto.observaciones,
            FK_TipoMovimiento: dto.FK_TipoMovimiento,
            FK_Deposito: dto.FK_Deposito,
            FK_usuario_creador: usuarioId,
            FK_usuario_actualizador: usuarioId,
          },
        });

        const resultados: ResultadoLinea[] = [];

        for (const linea of dto.detalle) {
          const ficha = fichaPorId.get(linea.FK_Stock)!;
          const delta = tipoMovimiento.indicador_entrada
            ? linea.cantidad
            : -linea.cantidad;

          // updateMany y no update: `update` solo acepta el identificador único
          // en el where, y acá hace falta combinarlo con la condición "alcanza
          // el stock". Que esa condición viaje en el mismo WHERE hace que la
          // base la evalúe atómicamente junto con la escritura — leer primero y
          // escribir después dejaría una ventana para que dos salidas
          // concurrentes sobre la misma ficha la dejen en negativo.
          const resultado = await tx.sTOCK.updateMany({
            where: {
              id_stock: ficha.id_stock,
              ...(!tipoMovimiento.indicador_entrada && {
                cantidad: { gte: linea.cantidad },
              }),
            },
            data: {
              cantidad: { increment: delta },
              hora_actualizacion: new Date(),
              FK_usuario_actualizador: usuarioId,
            },
          });

          if (resultado.count === 0) {
            throw new ConflictException(
              `Stock insuficiente para "${ficha.articulo.nombre}"`,
            );
          }

          const stockAnterior = ficha.cantidad;
          const stockNuevo = stockAnterior + delta;

          await tx.sTOCKMOVIMIENTO.create({
            data: {
              FK_Movimiento: movimiento.id_movimiento,
              FK_Stock: ficha.id_stock,
              cantidad: linea.cantidad,
              stock_anterior: stockAnterior,
              stock_nuevo: stockNuevo,
              observacion: linea.observacion,
            },
          });

          resultados.push({ ficha, stockAnterior, stockNuevo });
        }

        return {
          idMovimiento: movimiento.id_movimiento,
          resultadosPorLinea: resultados,
        };
      },
    );

    const alertasGeneradas = await this.generarAlertasDeReposicion(
      idMovimiento,
      resultadosPorLinea,
    );

    const movimiento = await this.findOne(idMovimiento);
    return { ...movimiento, alertasGeneradas };
  }

  /**
   * Listado paginado. Trae la cabecera y cuántas líneas tiene cada
   * movimiento, pero no las líneas en sí — para eso está el detalle.
   */
  async findAll(query: QueryMovimientoDto) {
    const {
      FK_Deposito,
      FK_TipoMovimiento,
      FK_articulo,
      fechaDesde,
      fechaHasta,
      page,
      limit,
    } = query;

    // Todos los filtros se combinan con AND: un movimiento tiene que cumplir
    // todos los que se hayan mandado, no alguno.
    const where: Prisma.MOVIMIENTOWhereInput = {
      ...(FK_Deposito !== undefined && { FK_Deposito }),
      ...(FK_TipoMovimiento !== undefined && { FK_TipoMovimiento }),
      // ARTICULO no cuelga directo de MOVIMIENTO: la cadena es
      // stockMovimientos -> stock -> FK_articulo. `some` se traduce a un
      // EXISTS, así que un movimiento con varias líneas del mismo artículo
      // aparece una sola vez y la paginación no necesita `distinct`.
      ...(FK_articulo !== undefined && {
        stockMovimientos: { some: { stock: { FK_articulo } } },
      }),
      // Filtra por fecha_movimiento (la fecha de negocio), no por
      // hora_creacion (el timestamp técnico de la fila). Cada extremo del
      // rango es opcional por separado.
      ...((fechaDesde !== undefined || fechaHasta !== undefined) && {
        fecha_movimiento: {
          ...(fechaDesde !== undefined && { gte: fechaDesde }),
          ...(fechaHasta !== undefined && { lte: fechaHasta }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.mOVIMIENTO.findMany({
        where,
        select: {
          id_movimiento: true,
          fecha_movimiento: true,
          referencia: true,
          FK_TipoMovimiento: true,
          FK_Deposito: true,
          tipoMovimiento: { select: TIPO_MOVIMIENTO_RESUMEN_SELECT },
          deposito: { select: DEPOSITO_RESUMEN_SELECT },
          usuarioCreador: { select: USUARIO_RESUMEN_SELECT },
          _count: { select: { stockMovimientos: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        // Más recientes primero: es el orden útil en una pantalla de
        // trazabilidad.
        orderBy: { fecha_movimiento: 'desc' },
      }),
      this.prisma.mOVIMIENTO.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  /** Detalle completo: cabecera + todas sus líneas con el artículo resuelto. */
  async findOne(id: number) {
    const movimiento = await this.prisma.mOVIMIENTO.findUnique({
      where: { id_movimiento: id },
      include: {
        tipoMovimiento: { select: TIPO_MOVIMIENTO_RESUMEN_SELECT },
        deposito: { select: DEPOSITO_RESUMEN_SELECT },
        usuarioCreador: { select: USUARIO_RESUMEN_SELECT },
        stockMovimientos: {
          select: {
            id_stock_movimiento: true,
            FK_Stock: true,
            cantidad: true,
            stock_anterior: true,
            stock_nuevo: true,
            observacion: true,
            stock: {
              select: {
                id_stock: true,
                articulo: { select: { id_articulo: true, nombre: true } },
              },
            },
          },
          orderBy: { id_stock_movimiento: 'asc' },
        },
      },
    });

    if (!movimiento) {
      throw new NotFoundException(`No existe un movimiento con id ${id}`);
    }

    return movimiento;
  }

  /**
   * Genera una alerta de reposición por cada línea cuyo stock haya cruzado el
   * umbral mínimo hacia abajo en este movimiento.
   *
   * Corre FUERA de la transacción y a propósito: registrar el movimiento con
   * el stock consistente es lo crítico; avisar que algo quedó bajo el umbral
   * es un efecto secundario. Por lo mismo, cada alerta va en su propio
   * try/catch: si el módulo de Alertas falla, se loggea y se sigue, pero el
   * movimiento ya está registrado y el cliente recibe su 201.
   */
  private async generarAlertasDeReposicion(
    idMovimiento: number,
    resultadosPorLinea: ResultadoLinea[],
  ) {
    const alertasGeneradas: ALERTA[] = [];

    for (const { ficha, stockNuevo } of resultadosPorLinea) {
      // Alcanza con mirar el estado resultante: ya no hace falta chequear si
      // "cruzó" el umbral en este movimiento, porque de no apilar alertas
      // mientras la condición sigue abierta se encarga la deduplicación por
      // clave de AlertaService.
      if (stockNuevo >= ficha.umbral_minimo) {
        continue;
      }

      try {
        const { alerta, creada } = await this.alertaService.crear({
          tipoAlertaNombre: TipoAlertaNombre.REPOSICION,
          // Fijo: en este sistema los roles no son por depósito.
          //
          // Sigue siendo el Responsable de Almacén aunque los endpoints de
          // este módulo hoy sean del Administrador: el Administrador igual ve
          // esta alerta por su acceso transversal en AlertaService, así que no
          // hace falta duplicar la fila para que le llegue a los dos.
          rolDestinatario: RolNombre.RESPONSABLE_ALMACEN,
          mensaje: `Stock de "${ficha.articulo.nombre}" bajó a ${stockNuevo} unidades (umbral: ${ficha.umbral_minimo})`,
          datos: {
            stockId: ficha.id_stock,
            movimientoId: idMovimiento,
            articuloId: ficha.FK_articulo,
            stockNuevo,
            umbralMinimo: ficha.umbral_minimo,
          },
          // Tiene que ser idéntica a la que arma el escaneo de StockService,
          // o cada camino alertaría por su cuenta sobre la misma ficha.
          claveDeduplicacion: `${TipoAlertaNombre.REPOSICION}-${ficha.id_stock}`,
        });

        // Solo se informan las nuevas: si ya había una alerta abierta por esta
        // ficha, sigue vigente pero no la generó este movimiento.
        if (creada) {
          alertasGeneradas.push(alerta);
        }
      } catch (error) {
        this.logger.error(
          `No se pudo generar la alerta de reposición para la ficha ${ficha.id_stock} del movimiento ${idMovimiento}`,
          error,
        );
      }
    }

    return alertasGeneradas;
  }

  /**
   * El tipo de movimiento tiene que existir y estar activo: uno dado de baja
   * no puede usarse en movimientos nuevos (HU-08, criterio 8), aunque los
   * movimientos históricos que ya lo usaban lo conservan.
   */
  private async buscarTipoMovimientoActivo(id: number) {
    const tipoMovimiento = await this.prisma.tIPOMOVIMIENTO.findUnique({
      where: { id_tipo_movimiento: id },
    });

    if (!tipoMovimiento) {
      throw new NotFoundException(
        `No existe un tipo de movimiento con id ${id}`,
      );
    }
    if (!tipoMovimiento.estado) {
      throw new ConflictException(
        `El tipo de movimiento "${tipoMovimiento.nombre}" está dado de baja y no puede usarse en movimientos nuevos`,
      );
    }

    return tipoMovimiento;
  }

  private async validarDepositoExiste(id: number) {
    const deposito = await this.prisma.dEPOSITO.findUnique({
      where: { id_deposito: id },
    });

    if (!deposito) {
      throw new NotFoundException(`No existe un depósito con id ${id}`);
    }
  }

  /**
   * Valida las fichas del detalle en tres pasos: que existan, que estén
   * activas y que pertenezcan al depósito de la cabecera. Este último chequeo
   * hay que hacerlo a propósito porque el cliente manda el `FK_Stock`
   * directo: nada garantiza por construcción que la ficha sea de ese
   * depósito.
   *
   * Devuelve las fichas indexadas por id, listas para usar en la transacción
   * (los `FK_Stock` duplicados los rechaza antes el DTO).
   */
  private async buscarFichasValidadas(dto: CreateMovimientoDto) {
    const idsStock = dto.detalle.map((linea) => linea.FK_Stock);

    const fichas = await this.prisma.sTOCK.findMany({
      where: { id_stock: { in: idsStock } },
      include: { articulo: { select: { nombre: true } } },
    });
    const fichaPorId = new Map<number, FichaConArticulo>(
      fichas.map((ficha) => [ficha.id_stock, ficha]),
    );

    const noEncontradas = idsStock.filter((id) => !fichaPorId.has(id));
    if (noEncontradas.length > 0) {
      throw new NotFoundException(
        `No existe una ficha de stock con id: ${noEncontradas.join(', ')}`,
      );
    }

    const inactivas = idsStock.filter((id) => !fichaPorId.get(id)!.estado);
    if (inactivas.length > 0) {
      throw new ConflictException(
        `La ficha de stock con id ${inactivas.join(', ')} está dada de baja`,
      );
    }

    const deOtroDeposito = idsStock.filter(
      (id) => fichaPorId.get(id)!.FK_deposito !== dto.FK_Deposito,
    );
    if (deOtroDeposito.length > 0) {
      throw new BadRequestException(
        `La ficha de stock con id ${deOtroDeposito.join(', ')} no pertenece al depósito indicado en la cabecera`,
      );
    }

    return fichaPorId;
  }

  /**
   * Chequeo previo de stock, solo para dar un mensaje de error claro que
   * liste TODAS las fichas sin stock suficiente en vez de cortar en la
   * primera. Lo que realmente garantiza que el stock no quede negativo es la
   * condición atómica del `updateMany` dentro de la transacción.
   */
  private validarStockSuficiente(
    dto: CreateMovimientoDto,
    esEntrada: boolean,
    fichaPorId: Map<number, FichaConArticulo>,
  ) {
    if (esEntrada) {
      return;
    }

    const insuficientes = dto.detalle.filter(
      (linea) => fichaPorId.get(linea.FK_Stock)!.cantidad < linea.cantidad,
    );

    if (insuficientes.length > 0) {
      const detalle = insuficientes
        .map((linea) => {
          const ficha = fichaPorId.get(linea.FK_Stock)!;
          return `"${ficha.articulo.nombre}" (disponible ${ficha.cantidad}, solicitado ${linea.cantidad})`;
        })
        .join('; ');

      throw new ConflictException(`Stock insuficiente para: ${detalle}`);
    }
  }

  /**
   * Si el cliente no manda fecha, se usa la de hoy. Nunca se acepta una fecha
   * futura: un movimiento registra algo que ya pasó.
   */
  private resolverFechaMovimiento(fecha: Date | undefined) {
    const ahora = new Date();

    if (fecha === undefined) {
      return ahora;
    }
    if (fecha > ahora) {
      throw new BadRequestException(
        'La fecha del movimiento no puede ser futura',
      );
    }

    return fecha;
  }
}
