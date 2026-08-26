import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { QueryStockDto } from './dto/query-stock.dto';

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
  constructor(private readonly prisma: PrismaService) {}

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
