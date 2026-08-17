import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { UpdateMarcaDto } from './dto/update-marca.dto';
import { QueryMarcaDto } from './dto/query-marca.dto';

/**
 * TODO(auth): reemplazar por el usuario_id real extraído del JWT cuando se
 * implemente autenticación (ver CLAUDE.md, sección "Auditoría"). Hoy se usa
 * un usuario fijo del seed (Ana Gomez, dni 30111222, primer registro
 * insertado) como placeholder para los campos de auditoría.
 */
const USUARIO_HARDCODEADO_ID = 1;

@Injectable()
export class MarcaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMarcaDto) {
    await this.validarNombreUnicoEntreActivas(dto.nombre);

    return this.prisma.mARCA.create({
      data: {
        ...dto,
        FK_usuario_creador: USUARIO_HARDCODEADO_ID,
        FK_usuario_actualizador: USUARIO_HARDCODEADO_ID,
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

  async update(id: number, dto: UpdateMarcaDto) {
    await this.findOne(id);

    if (dto.nombre) {
      await this.validarNombreUnicoEntreActivas(dto.nombre, id);
    }

    return this.prisma.mARCA.update({
      where: { id_marca: id },
      data: {
        ...dto,
        FK_usuario_actualizador: USUARIO_HARDCODEADO_ID,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Baja lógica: no se permite si la marca ya está inactiva, ni si tiene
   * artículos activos asociados.
   */
  async baja(id: number) {
    const marca = await this.findOne(id);

    if (!marca.estado) {
      throw new ConflictException('La marca ya está dada de baja');
    }

    const articulosActivos = await this.prisma.aRTICULO.count({
      where: { FK_Marca: id, activo: true },
    });

    if (articulosActivos > 0) {
      throw new ConflictException(
        'No se puede dar de baja la marca: tiene artículos activos asociados',
      );
    }

    return this.prisma.mARCA.update({
      where: { id_marca: id },
      data: {
        estado: false,
        FK_usuario_actualizador: USUARIO_HARDCODEADO_ID,
        hora_actualizacion: new Date(),
      },
    });
  }

  private async validarNombreUnicoEntreActivas(
    nombre: string,
    idExcluido?: number,
  ) {
    const existente = await this.prisma.mARCA.findFirst({
      where: {
        nombre: { equals: nombre, mode: 'insensitive' },
        estado: true,
        ...(idExcluido !== undefined && { id_marca: { not: idExcluido } }),
      },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe una marca activa con el nombre "${nombre}"`,
      );
    }
  }
}
