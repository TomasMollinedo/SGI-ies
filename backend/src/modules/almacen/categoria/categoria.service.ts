import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { USUARIO_HARDCODEADO_ID } from '../../../common/constants/auditoria.constant';
import { validarNombreUnicoEntreActivos } from '../../../common/validaciones/nombre-unico-entre-activos';
import { validarSinArticulosActivosAsociados } from '../../../common/validaciones/sin-articulos-activos-asociados';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { QueryCategoriaDto } from './dto/query-categoria.dto';

@Injectable()
export class CategoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoriaDto) {
    await this.validarNombreUnico(dto.nombre);

    return this.prisma.cATEGORIA.create({
      data: {
        ...dto,
        FK_usuario_creador: USUARIO_HARDCODEADO_ID,
        FK_usuario_actualizador: USUARIO_HARDCODEADO_ID,
      },
    });
  }

  async findAll(query: QueryCategoriaDto) {
    const { nombre, estado, page, limit } = query;

    const where: Prisma.CATEGORIAWhereInput = {
      ...(estado !== undefined && { estado }),
      ...(nombre && { nombre: { contains: nombre, mode: 'insensitive' } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.cATEGORIA.findMany({
        where,
        // Sin los datos de auditoría (quién ni cuándo): el listado no los
        // expone, eso lo da el detalle (findOne).
        select: {
          id_categoria: true,
          nombre: true,
          descripcion: true,
          estado: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.cATEGORIA.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  /**
   * Detalle de una categoría: a diferencia del listado, incluye nombre y
   * apellido de quién la creó y de quién la modificó por última vez.
   */
  async findOne(id: number) {
    const categoria = await this.prisma.cATEGORIA.findUnique({
      where: { id_categoria: id },
      include: {
        usuarioCreador: { select: { nombre: true, apellido: true } },
        usuarioActualizador: { select: { nombre: true, apellido: true } },
      },
    });

    if (!categoria) {
      throw new NotFoundException(`No existe una categoría con id ${id}`);
    }

    return categoria;
  }

  async update(id: number, dto: UpdateCategoriaDto) {
    await this.findOne(id);

    if (dto.nombre) {
      await this.validarNombreUnico(dto.nombre, id);
    }

    return this.prisma.cATEGORIA.update({
      where: { id_categoria: id },
      data: {
        ...dto,
        FK_usuario_actualizador: USUARIO_HARDCODEADO_ID,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Baja lógica: no se permite si la categoría ya está inactiva, ni si tiene
   * artículos activos asociados.
   */
  async baja(id: number) {
    const categoria = await this.findOne(id);

    if (!categoria.estado) {
      throw new ConflictException('La categoría ya está dada de baja');
    }

    await validarSinArticulosActivosAsociados(this.prisma, 'la categoría', {
      FK_Categoria: id,
    });

    return this.prisma.cATEGORIA.update({
      where: { id_categoria: id },
      data: {
        estado: false,
        FK_usuario_actualizador: USUARIO_HARDCODEADO_ID,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Alta lógica (reactivar): solo si está de baja. Vuelve a validar el
   * nombre entre activas porque, mientras estuvo de baja, otra categoría
   * pudo haber tomado ese mismo nombre.
   */
  async activar(id: number) {
    const categoria = await this.findOne(id);

    if (categoria.estado) {
      throw new ConflictException('La categoría ya está activa');
    }

    await this.validarNombreUnico(categoria.nombre, id);

    return this.prisma.cATEGORIA.update({
      where: { id_categoria: id },
      data: {
        estado: true,
        FK_usuario_actualizador: USUARIO_HARDCODEADO_ID,
        hora_actualizacion: new Date(),
      },
    });
  }

  private async validarNombreUnico(nombre: string, idExcluido?: number) {
    await validarNombreUnicoEntreActivos({
      entidad: 'una categoría',
      nombre,
      existeOtroActivo: () =>
        this.prisma.cATEGORIA
          .findFirst({
            where: {
              nombre: { equals: nombre, mode: 'insensitive' },
              estado: true,
              ...(idExcluido !== undefined && {
                id_categoria: { not: idExcluido },
              }),
            },
          })
          .then((categoria) => categoria !== null),
    });
  }
}
