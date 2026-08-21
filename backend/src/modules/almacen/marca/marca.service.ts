import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { validarNombreUnicoEntreActivos } from '../../../common/validaciones/nombre-unico-entre-activos';
import { validarSinArticulosActivosAsociados } from '../../../common/validaciones/sin-articulos-activos-asociados';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { UpdateMarcaDto } from './dto/update-marca.dto';
import { QueryMarcaDto } from './dto/query-marca.dto';

@Injectable()
export class MarcaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMarcaDto, usuarioId: number) {
    await this.validarNombreUnico(dto.nombre);

    return this.prisma.mARCA.create({
      data: {
        ...dto,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
      },
    });
  }

  async findAll(query: QueryMarcaDto) {
    const { nombre, estado, page, limit } = query;

    const where: Prisma.MARCAWhereInput = {
      ...(estado !== undefined && { estado }),
      ...(nombre && { nombre: { contains: nombre, mode: 'insensitive' } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.mARCA.findMany({
        where,
        // Sin los datos de auditoría (quién ni cuándo): el listado no los
        // expone, eso lo da el detalle (findOne).
        select: {
          id_marca: true,
          nombre: true,
          descripcion: true,
          estado: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.mARCA.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  /**
   * Detalle de una marca: a diferencia del listado, incluye nombre y
   * apellido de quién la creó y de quién la modificó por última vez.
   */
  async findOne(id: number) {
    const marca = await this.prisma.mARCA.findUnique({
      where: { id_marca: id },
      include: {
        usuarioCreador: { select: { nombre: true, apellido: true } },
        usuarioActualizador: { select: { nombre: true, apellido: true } },
      },
    });

    if (!marca) {
      throw new NotFoundException(`No existe una marca con id ${id}`);
    }

    return marca;
  }

  async update(id: number, dto: UpdateMarcaDto, usuarioId: number) {
    await this.findOne(id);

    if (dto.nombre) {
      await this.validarNombreUnico(dto.nombre, id);
    }

    return this.prisma.mARCA.update({
      where: { id_marca: id },
      data: {
        ...dto,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Baja lógica: no se permite si la marca ya está inactiva, ni si tiene
   * artículos activos asociados.
   */
  async baja(id: number, usuarioId: number) {
    const marca = await this.findOne(id);

    if (!marca.estado) {
      throw new ConflictException('La marca ya está dada de baja');
    }

    await validarSinArticulosActivosAsociados(this.prisma, 'la marca', {
      FK_Marca: id,
    });

    return this.prisma.mARCA.update({
      where: { id_marca: id },
      data: {
        estado: false,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Alta lógica (reactivar): solo si está de baja. Vuelve a validar el
   * nombre entre activas porque, mientras estuvo de baja, otra marca
   * pudo haber tomado ese mismo nombre.
   */
  async activar(id: number, usuarioId: number) {
    const marca = await this.findOne(id);

    if (marca.estado) {
      throw new ConflictException('La marca ya está activa');
    }

    await this.validarNombreUnico(marca.nombre, id);

    return this.prisma.mARCA.update({
      where: { id_marca: id },
      data: {
        estado: true,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  private async validarNombreUnico(nombre: string, idExcluido?: number) {
    await validarNombreUnicoEntreActivos({
      entidadActiva: 'una marca activa',
      nombre,
      existeOtroActivo: () =>
        this.prisma.mARCA
          .findFirst({
            where: {
              nombre: { equals: nombre, mode: 'insensitive' },
              estado: true,
              ...(idExcluido !== undefined && {
                id_marca: { not: idExcluido },
              }),
            },
          })
          .then((marca) => marca !== null),
    });
  }
}
