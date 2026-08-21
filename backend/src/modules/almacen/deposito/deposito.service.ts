import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { validarNombreUnicoEntreActivos } from '../../../common/validaciones/nombre-unico-entre-activos';
import { CreateDepositoDto } from './dto/create-deposito.dto';
import { UpdateDepositoDto } from './dto/update-deposito.dto';
import { QueryDepositoDto } from './dto/query-deposito.dto';

@Injectable()
export class DepositoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDepositoDto, usuarioId: number) {
    await this.validarNombreUnico(dto.nombre);

    return this.prisma.dEPOSITO.create({
      data: {
        ...dto,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
      },
    });
  }

  async findAll(query: QueryDepositoDto) {
    const { nombre, estado, page, limit } = query;

    const where: Prisma.DEPOSITOWhereInput = {
      ...(estado !== undefined && { estado }),
      ...(nombre && { nombre: { contains: nombre, mode: 'insensitive' } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.dEPOSITO.findMany({
        where,
        // Sin los datos de auditoría (quién ni cuándo): el listado no los
        // expone, eso lo da el detalle (findOne).
        select: {
          id_deposito: true,
          nombre: true,
          es_obrador: true,
          ubicacion: true,
          descripcion: true,
          estado: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.dEPOSITO.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  /**
   * Detalle de un depósito/obrador: a diferencia del listado, incluye
   * nombre y apellido de quién lo creó y de quién lo modificó por última vez.
   */
  async findOne(id: number) {
    const deposito = await this.prisma.dEPOSITO.findUnique({
      where: { id_deposito: id },
      include: {
        usuarioCreador: { select: { nombre: true, apellido: true } },
        usuarioActualizador: { select: { nombre: true, apellido: true } },
      },
    });

    if (!deposito) {
      throw new NotFoundException(`No existe un depósito/obrador con id ${id}`);
    }

    return deposito;
  }

  async update(id: number, dto: UpdateDepositoDto, usuarioId: number) {
    await this.findOne(id);

    if (dto.nombre) {
      await this.validarNombreUnico(dto.nombre, id);
    }

    return this.prisma.dEPOSITO.update({
      where: { id_deposito: id },
      data: {
        ...dto,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Baja lógica: no se permite si el depósito/obrador ya está inactivo, ni
   * si tiene fichas de stock asociadas. El modelo STOCK todavía no registra
   * una cantidad (eso lo define el futuro módulo de Movimientos), así que
   * por ahora se bloquea con que exista al menos una ficha para ese depósito
   * — TODO: cuando STOCK tenga cantidad, ajustar para bloquear solo si
   * cantidad > 0.
   */
  async baja(id: number, usuarioId: number) {
    const deposito = await this.findOne(id);

    if (!deposito.estado) {
      throw new ConflictException('El depósito/obrador ya está dado de baja');
    }

    const fichasDeStock = await this.prisma.sTOCK.count({
      where: { FK_deposito: id },
    });

    if (fichasDeStock > 0) {
      throw new ConflictException(
        'No se puede dar de baja el depósito/obrador: tiene fichas de stock asociadas',
      );
    }

    return this.prisma.dEPOSITO.update({
      where: { id_deposito: id },
      data: {
        estado: false,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Alta lógica (reactivar): solo si está de baja. Vuelve a validar el
   * nombre entre activos porque, mientras estuvo de baja, otro
   * depósito/obrador pudo haber tomado ese mismo nombre.
   */
  async activar(id: number, usuarioId: number) {
    const deposito = await this.findOne(id);

    if (deposito.estado) {
      throw new ConflictException('El depósito/obrador ya está activo');
    }

    await this.validarNombreUnico(deposito.nombre, id);

    return this.prisma.dEPOSITO.update({
      where: { id_deposito: id },
      data: {
        estado: true,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  private async validarNombreUnico(nombre: string, idExcluido?: number) {
    await validarNombreUnicoEntreActivos({
      entidadActiva: 'un depósito/obrador activo',
      nombre,
      existeOtroActivo: () =>
        this.prisma.dEPOSITO
          .findFirst({
            where: {
              nombre: { equals: nombre, mode: 'insensitive' },
              estado: true,
              ...(idExcluido !== undefined && {
                id_deposito: { not: idExcluido },
              }),
            },
          })
          .then((deposito) => deposito !== null),
    });
  }
}
