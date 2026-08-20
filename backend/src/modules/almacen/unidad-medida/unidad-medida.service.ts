import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { USUARIO_HARDCODEADO_ID } from '../../../common/constants/auditoria.constant';
import { validarSinArticulosActivosAsociados } from '../../../common/validaciones/sin-articulos-activos-asociados';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { QueryUnidadMedidaDto } from './dto/query-unidad-medida.dto';

@Injectable()
export class UnidadMedidaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUnidadMedidaDto) {
    await this.validarUnicidad(dto.nombre, dto.abreviatura);

    return this.prisma.uNIDADMEDIDA.create({
      data: {
        ...dto,
        FK_usuario_creador: USUARIO_HARDCODEADO_ID,
        FK_usuario_actualizador: USUARIO_HARDCODEADO_ID,
      },
    });
  }

  async findAll(query: QueryUnidadMedidaDto) {
    const { nombre, estado, page, limit } = query;

    const where: Prisma.UNIDADMEDIDAWhereInput = {
      ...(estado !== undefined && { estado }),
      ...(nombre && { nombre: { contains: nombre, mode: 'insensitive' } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.uNIDADMEDIDA.findMany({
        where,
        // Sin los datos de auditoría (quién ni cuándo): el listado no los
        // expone, eso lo da el detalle (findOne).
        select: {
          id_unidad_medida: true,
          nombre: true,
          abreviatura: true,
          estado: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.uNIDADMEDIDA.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  /**
   * Detalle de una unidad de medida: a diferencia del listado, incluye
   * nombre y apellido de quién la creó y de quién la modificó por última vez.
   */
  async findOne(id: number) {
    const unidadMedida = await this.prisma.uNIDADMEDIDA.findUnique({
      where: { id_unidad_medida: id },
      include: {
        usuarioCreador: { select: { nombre: true, apellido: true } },
        usuarioActualizador: { select: { nombre: true, apellido: true } },
      },
    });

    if (!unidadMedida) {
      throw new NotFoundException(`No existe una unidad de medida con id ${id}`);
    }

    return unidadMedida;
  }

  async update(id: number, dto: UpdateUnidadMedidaDto) {
    const unidadMedida = await this.findOne(id);

    if (dto.nombre || dto.abreviatura) {
      await this.validarUnicidad(
        dto.nombre ?? unidadMedida.nombre,
        dto.abreviatura ?? unidadMedida.abreviatura,
        id,
      );
    }

    return this.prisma.uNIDADMEDIDA.update({
      where: { id_unidad_medida: id },
      data: {
        ...dto,
        FK_usuario_actualizador: USUARIO_HARDCODEADO_ID,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Baja lógica: no se permite si la unidad ya está inactiva, ni si tiene
   * artículos activos asociados.
   */
  async baja(id: number) {
    const unidadMedida = await this.findOne(id);

    if (!unidadMedida.estado) {
      throw new ConflictException('La unidad de medida ya está dada de baja');
    }

    await validarSinArticulosActivosAsociados(this.prisma, 'la unidad de medida', {
      FK_UnidadMedida: id,
    });

    return this.prisma.uNIDADMEDIDA.update({
      where: { id_unidad_medida: id },
      data: {
        estado: false,
        FK_usuario_actualizador: USUARIO_HARDCODEADO_ID,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Alta lógica (reactivar): solo si está de baja. Vuelve a validar nombre
   * y abreviatura entre activas porque, mientras estuvo de baja, otra
   * unidad pudo haber tomado ese mismo nombre o abreviatura.
   */
  async activar(id: number) {
    const unidadMedida = await this.findOne(id);

    if (unidadMedida.estado) {
      throw new ConflictException('La unidad de medida ya está activa');
    }

    await this.validarUnicidad(unidadMedida.nombre, unidadMedida.abreviatura, id);

    return this.prisma.uNIDADMEDIDA.update({
      where: { id_unidad_medida: id },
      data: {
        estado: true,
        FK_usuario_actualizador: USUARIO_HARDCODEADO_ID,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Valida que nombre y abreviatura no estén en uso por otra unidad de
   * medida activa. No reutiliza `validarNombreUnicoEntreActivos` (la de
   * Marca/Categoría) porque esa valida un solo campo; acá hay que validar
   * dos, con el mensaje de error apuntando al que realmente choca.
   */
  private async validarUnicidad(
    nombre: string,
    abreviatura: string,
    idExcluido?: number,
  ) {
    const conflicto = await this.prisma.uNIDADMEDIDA.findFirst({
      where: {
        estado: true,
        ...(idExcluido !== undefined && {
          id_unidad_medida: { not: idExcluido },
        }),
        OR: [
          { nombre: { equals: nombre, mode: 'insensitive' } },
          { abreviatura: { equals: abreviatura, mode: 'insensitive' } },
        ],
      },
    });

    if (!conflicto) {
      return;
    }

    if (conflicto.nombre.toLowerCase() === nombre.toLowerCase()) {
      throw new ConflictException(
        `Ya existe una unidad de medida activa con el nombre "${nombre}"`,
      );
    }

    throw new ConflictException(
      `Ya existe una unidad de medida activa con la abreviatura "${abreviatura}"`,
    );
  }
}