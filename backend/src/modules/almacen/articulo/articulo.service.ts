import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { validarNombreUnicoEntreActivos } from '../../../common/validaciones/nombre-unico-entre-activos';
import { CreateArticuloDto } from './dto/create-articulo.dto';
import { UpdateArticuloDto } from './dto/update-articulo.dto';
import { QueryArticuloDto } from './dto/query-articulo.dto';

const CATEGORIA_RESUMEN_SELECT = { id_categoria: true, nombre: true } as const;
const MARCA_RESUMEN_SELECT = { id_marca: true, nombre: true } as const;
const UNIDAD_MEDIDA_RESUMEN_SELECT = {
  id_unidad_medida: true,
  nombre: true,
  abreviatura: true,
} as const;

@Injectable()
export class ArticuloService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateArticuloDto, usuarioId: number) {
    await this.validarNombreUnico(dto.nombre);
    await this.validarCategoriaActiva(dto.FK_Categoria);
    await this.validarUnidadMedidaActiva(dto.FK_UnidadMedida);
    if (dto.FK_Marca !== undefined) {
      await this.validarMarcaActiva(dto.FK_Marca);
    }

    return this.prisma.aRTICULO.create({
      data: {
        ...dto,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
      },
    });
  }

  async findAll(query: QueryArticuloDto) {
    const { busqueda, FK_Categoria, FK_Marca, estado, page, limit } = query;

    // Si lo que se busca es un número entero, también matchea contra
    // id_articulo (el "código" que muestra el frontend, hardcodeado al id).
    const busquedaComoId = busqueda !== undefined ? Number(busqueda) : NaN;
    const esBusquedaNumerica = Number.isInteger(busquedaComoId);

    const where: Prisma.ARTICULOWhereInput = {
      estado: estado ?? true,
      ...(FK_Categoria !== undefined && { FK_Categoria }),
      ...(FK_Marca !== undefined && { FK_Marca }),
      ...(busqueda && {
        OR: [
          { nombre: { contains: busqueda, mode: 'insensitive' } },
          ...(esBusquedaNumerica ? [{ id_articulo: busquedaComoId }] : []),
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.aRTICULO.findMany({
        where,
        select: {
          id_articulo: true,
          nombre: true,
          descripcion: true,
          estado: true,
          FK_Categoria: true,
          FK_Marca: true,
          FK_UnidadMedida: true,
          categoria: { select: CATEGORIA_RESUMEN_SELECT },
          marca: { select: MARCA_RESUMEN_SELECT },
          unidadMedida: { select: UNIDAD_MEDIDA_RESUMEN_SELECT },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.aRTICULO.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  /**
   * Detalle de un artículo: a diferencia del listado, incluye nombre y
   * apellido de quién lo creó y de quién lo modificó por última vez.
   */
  async findOne(id: number) {
    const articulo = await this.prisma.aRTICULO.findUnique({
      where: { id_articulo: id },
      include: {
        categoria: { select: CATEGORIA_RESUMEN_SELECT },
        marca: { select: MARCA_RESUMEN_SELECT },
        unidadMedida: { select: UNIDAD_MEDIDA_RESUMEN_SELECT },
        usuarioCreador: { select: { nombre: true, apellido: true } },
        usuarioActualizador: { select: { nombre: true, apellido: true } },
      },
    });

    if (!articulo) {
      throw new NotFoundException(`No existe un artículo con id ${id}`);
    }

    return articulo;
  }

  async update(id: number, dto: UpdateArticuloDto, usuarioId: number) {
    await this.findOne(id);

    if (dto.nombre) {
      await this.validarNombreUnico(dto.nombre, id);
    }
    if (dto.FK_Categoria !== undefined) {
      await this.validarCategoriaActiva(dto.FK_Categoria);
    }
    if (dto.FK_UnidadMedida !== undefined) {
      await this.validarUnidadMedidaActiva(dto.FK_UnidadMedida);
    }
    // dto.FK_Marca: undefined = no tocar la marca asignada, null = quitarla,
    // number = cambiarla (y hay que validar que esté activa).
    if (typeof dto.FK_Marca === 'number') {
      await this.validarMarcaActiva(dto.FK_Marca);
    }

    return this.prisma.aRTICULO.update({
      where: { id_articulo: id },
      data: {
        ...dto,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Baja lógica: no se permite si el artículo ya está inactivo.
   */
  async baja(id: number, usuarioId: number) {
    const articulo = await this.findOne(id);

    if (!articulo.estado) {
      throw new ConflictException('El artículo ya está dado de baja');
    }

    return this.prisma.aRTICULO.update({
      where: { id_articulo: id },
      data: {
        estado: false,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Alta lógica (reactivar): solo si está de baja. Vuelve a validar el
   * nombre entre activos porque, mientras estuvo de baja, otro artículo
   * pudo haber tomado ese mismo nombre.
   */
  async activar(id: number, usuarioId: number) {
    const articulo = await this.findOne(id);

    if (articulo.estado) {
      throw new ConflictException('El artículo ya está activo');
    }

    await this.validarNombreUnico(articulo.nombre, id);

    return this.prisma.aRTICULO.update({
      where: { id_articulo: id },
      data: {
        estado: true,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  private async validarNombreUnico(nombre: string, idExcluido?: number) {
    await validarNombreUnicoEntreActivos({
      entidadActiva: 'un artículo activo',
      nombre,
      existeOtroActivo: () =>
        this.prisma.aRTICULO
          .findFirst({
            where: {
              nombre: { equals: nombre, mode: 'insensitive' },
              estado: true,
              ...(idExcluido !== undefined && {
                id_articulo: { not: idExcluido },
              }),
            },
          })
          .then((articulo) => articulo !== null),
    });
  }

  private async validarCategoriaActiva(idCategoria: number) {
    const categoria = await this.prisma.cATEGORIA.findUnique({
      where: { id_categoria: idCategoria },
    });

    if (!categoria) {
      throw new NotFoundException(
        `No existe una categoría con id ${idCategoria}`,
      );
    }
    if (!categoria.estado) {
      throw new ConflictException('La categoría indicada está dada de baja');
    }
  }

  private async validarUnidadMedidaActiva(idUnidadMedida: number) {
    const unidadMedida = await this.prisma.uNIDADMEDIDA.findUnique({
      where: { id_unidad_medida: idUnidadMedida },
    });

    if (!unidadMedida) {
      throw new NotFoundException(
        `No existe una unidad de medida con id ${idUnidadMedida}`,
      );
    }
    if (!unidadMedida.estado) {
      throw new ConflictException(
        'La unidad de medida indicada está dada de baja',
      );
    }
  }

  private async validarMarcaActiva(idMarca: number) {
    const marca = await this.prisma.mARCA.findUnique({
      where: { id_marca: idMarca },
    });

    if (!marca) {
      throw new NotFoundException(`No existe una marca con id ${idMarca}`);
    }
    if (!marca.estado) {
      throw new ConflictException('La marca indicada está dada de baja');
    }
  }
}
