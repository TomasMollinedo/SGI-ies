import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { validarNombreUnicoEntreActivos } from '../../../common/validaciones/nombre-unico-entre-activos';
import { CreateTipoMovimientoDto } from './dto/create-tipo-movimiento.dto';
import { UpdateTipoMovimientoDto } from './dto/update-tipo-movimiento.dto';
import { QueryTipoMovimientoDto } from './dto/query-tipo-movimiento.dto';

@Injectable()
export class TipoMovimientoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Alta de un tipo de movimiento. Es el único momento en que se define
   * `indicador_entrada`: después queda bloqueado para siempre, porque de él
   * depende el signo de todos los movimientos que usen este tipo.
   */
  async create(dto: CreateTipoMovimientoDto, usuarioId: number) {
    await this.validarNombreUnico(dto.nombre);

    return this.prisma.tIPOMOVIMIENTO.create({
      data: {
        ...dto,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
      },
    });
  }

  /**
   * Listado paginado. Sin el filtro `estado`, muestra solo los activos
   * (HU-08, criterio 9) — a diferencia de otros catálogos de Almacén.
   */
  async findAll(query: QueryTipoMovimientoDto) {
    const { nombre, estado, indicador_entrada, page, limit } = query;

    const where: Prisma.TIPOMOVIMIENTOWhereInput = {
      estado: estado !== undefined ? estado : true,
      ...(indicador_entrada !== undefined && { indicador_entrada }),
      ...(nombre && { nombre: { contains: nombre, mode: 'insensitive' } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.tIPOMOVIMIENTO.findMany({
        where,
        // Sin los datos de auditoría (quién ni cuándo): el listado no los
        // expone, eso lo da el detalle (findOne).
        select: {
          id_tipo_movimiento: true,
          nombre: true,
          descripcion: true,
          indicador_entrada: true,
          estado: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.tIPOMOVIMIENTO.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  /**
   * Detalle de un tipo de movimiento: a diferencia del listado, incluye
   * nombre y apellido de quién lo creó y de quién lo modificó por última vez.
   */
  async findOne(id: number) {
    const tipoMovimiento = await this.prisma.tIPOMOVIMIENTO.findUnique({
      where: { id_tipo_movimiento: id },
      include: {
        usuarioCreador: { select: { nombre: true, apellido: true } },
        usuarioActualizador: { select: { nombre: true, apellido: true } },
      },
    });

    if (!tipoMovimiento) {
      throw new NotFoundException(
        `No existe un tipo de movimiento con id ${id}`,
      );
    }

    return tipoMovimiento;
  }

  /**
   * Edición: solo `nombre` y `descripcion`. `indicador_entrada` no forma
   * parte del DTO de update (queda bloqueado desde el alta) y `estado` se
   * cambia por los endpoints /baja y /alta.
   */
  async update(id: number, dto: UpdateTipoMovimientoDto, usuarioId: number) {
    await this.findOne(id);

    if (dto.nombre) {
      await this.validarNombreUnico(dto.nombre, id);
    }

    return this.prisma.tIPOMOVIMIENTO.update({
      where: { id_tipo_movimiento: id },
      data: {
        ...dto,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Baja lógica: el único chequeo es que no esté ya inactivo. A propósito NO
   * se valida si tiene movimientos asociados: como nunca hay borrado físico
   * y `indicador_entrada` es inmutable, desactivar un tipo con movimientos
   * no altera ningún cálculo de stock histórico (HU-08, criterios 7 y 8).
   */
  async baja(id: number, usuarioId: number) {
    const tipoMovimiento = await this.findOne(id);

    if (!tipoMovimiento.estado) {
      throw new ConflictException('El tipo de movimiento ya está dado de baja');
    }

    return this.prisma.tIPOMOVIMIENTO.update({
      where: { id_tipo_movimiento: id },
      data: {
        estado: false,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Alta lógica (reactivar): solo si está de baja. Vuelve a validar el
   * nombre entre activos porque, mientras estuvo de baja, otro tipo de
   * movimiento pudo haber tomado ese mismo nombre.
   */
  async activar(id: number, usuarioId: number) {
    const tipoMovimiento = await this.findOne(id);

    if (tipoMovimiento.estado) {
      throw new ConflictException('El tipo de movimiento ya está activo');
    }

    await this.validarNombreUnico(tipoMovimiento.nombre, id);

    return this.prisma.tIPOMOVIMIENTO.update({
      where: { id_tipo_movimiento: id },
      data: {
        estado: true,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  private async validarNombreUnico(nombre: string, idExcluido?: number) {
    await validarNombreUnicoEntreActivos({
      entidadActiva: 'un tipo de movimiento activo',
      nombre,
      existeOtroActivo: () =>
        this.prisma.tIPOMOVIMIENTO
          .findFirst({
            where: {
              nombre: { equals: nombre, mode: 'insensitive' },
              estado: true,
              ...(idExcluido !== undefined && {
                id_tipo_movimiento: { not: idExcluido },
              }),
            },
          })
          .then((tipoMovimiento) => tipoMovimiento !== null),
    });
  }
}
