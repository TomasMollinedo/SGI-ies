import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, STOCK } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { QueryMovimientoDto } from './dto/query-movimiento.dto';

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

@Injectable()
export class MovimientoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un movimiento completo: cabecera, líneas de detalle y la
   * actualización del stock de cada ficha afectada.
   *
   * Todo va dentro de una única transacción: si una línea falla (por ejemplo,
   * la tercera de cinco no tiene stock suficiente), se revierte todo,
   * incluidas las líneas que ya se habían aplicado.
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

    const idMovimiento = await this.prisma.$transaction(async (tx) => {
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

        await tx.sTOCKMOVIMIENTO.create({
          data: {
            FK_Movimiento: movimiento.id_movimiento,
            FK_Stock: ficha.id_stock,
            cantidad: linea.cantidad,
            stock_anterior: ficha.cantidad,
            stock_nuevo: ficha.cantidad + delta,
            observacion: linea.observacion,
          },
        });
      }

      return movimiento.id_movimiento;
    });

    return this.findOne(idMovimiento);
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
