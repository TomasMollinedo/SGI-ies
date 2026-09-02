import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { validarNombreUnicoEntreActivos } from '../../../common/validaciones/nombre-unico-entre-activos';
import { condicionBusquedaPorPalabras } from '../../../common/validaciones/busqueda-por-palabras';
import { CreateTipoComprobanteDto } from './dto/create-tipo-comprobante.dto';
import { UpdateTipoComprobanteDto } from './dto/update-tipo-comprobante.dto';
import { QueryTipoComprobanteDto } from './dto/query-tipo-comprobante.dto';

@Injectable()
export class TipoComprobanteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Alta de un tipo de comprobante. Es el único momento en que se definen
   * `aumenta_saldo` y `requiere_comprobante_origen`: después quedan
   * bloqueados para siempre, porque de ellos depende cómo impactó (o va a
   * impactar) cada comprobante ya registrado con este tipo en la cuenta
   * corriente del proveedor.
   */
  async create(dto: CreateTipoComprobanteDto, usuarioId: number) {
    await this.validarNombreUnico(dto.nombre);

    return this.prisma.tIPOCOMPROBANTE.create({
      data: {
        ...dto,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
      },
    });
  }

  /**
   * Listado paginado. Sin el filtro `estado`, trae tanto los activos como
   * los dados de baja — el "por defecto solo activos" lo aplica el frontend
   * mandando `estado=true`.
   */
  async findAll(query: QueryTipoComprobanteDto) {
    const { nombre, estado, aumenta_saldo, page, limit } = query;

    const where: Prisma.TIPOCOMPROBANTEWhereInput = {
      ...(estado !== undefined && { estado }),
      ...(aumenta_saldo !== undefined && { aumenta_saldo }),
      ...(nombre &&
        condicionBusquedaPorPalabras<Prisma.TIPOCOMPROBANTEWhereInput>(
          'nombre',
          nombre,
        )),
    };

    const [data, total] = await Promise.all([
      this.prisma.tIPOCOMPROBANTE.findMany({
        where,
        // Sin los datos de auditoría (quién ni cuándo): el listado no los
        // expone, eso lo da el detalle (findOne).
        select: {
          id_tipo_comprobante: true,
          nombre: true,
          descripcion: true,
          aumenta_saldo: true,
          requiere_comprobante_origen: true,
          estado: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.tIPOCOMPROBANTE.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  /**
   * Detalle de un tipo de comprobante: a diferencia del listado, incluye
   * nombre y apellido de quién lo creó y de quién lo modificó por última vez.
   */
  async findOne(id: number) {
    const tipoComprobante = await this.prisma.tIPOCOMPROBANTE.findUnique({
      where: { id_tipo_comprobante: id },
      include: {
        usuarioCreador: { select: { nombre: true, apellido: true } },
        usuarioActualizador: { select: { nombre: true, apellido: true } },
      },
    });

    if (!tipoComprobante) {
      throw new NotFoundException(
        `No existe un tipo de comprobante con id ${id}`,
      );
    }

    return tipoComprobante;
  }

  /**
   * Edición: solo `nombre` y `descripcion`. `aumenta_saldo` y
   * `requiere_comprobante_origen` no forman parte del DTO de update (quedan
   * bloqueados desde el alta) y `estado` se cambia por los endpoints
   * /baja y /alta.
   */
  async update(id: number, dto: UpdateTipoComprobanteDto, usuarioId: number) {
    await this.findOne(id);

    if (dto.nombre) {
      await this.validarNombreUnico(dto.nombre, id);
    }

    return this.prisma.tIPOCOMPROBANTE.update({
      where: { id_tipo_comprobante: id },
      data: {
        ...dto,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Baja lógica: el único chequeo es que no esté ya inactivo. Nunca se borra
   * físicamente, así que los comprobantes históricos siempre conservan su FK.
   */
  async baja(id: number, usuarioId: number) {
    const tipoComprobante = await this.findOne(id);

    if (!tipoComprobante.estado) {
      throw new ConflictException(
        'El tipo de comprobante ya está dado de baja',
      );
    }

    return this.prisma.tIPOCOMPROBANTE.update({
      where: { id_tipo_comprobante: id },
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
   * comprobante pudo haber tomado ese mismo nombre.
   */
  async activar(id: number, usuarioId: number) {
    const tipoComprobante = await this.findOne(id);

    if (tipoComprobante.estado) {
      throw new ConflictException('El tipo de comprobante ya está activo');
    }

    await this.validarNombreUnico(tipoComprobante.nombre, id);

    return this.prisma.tIPOCOMPROBANTE.update({
      where: { id_tipo_comprobante: id },
      data: {
        estado: true,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  private async validarNombreUnico(nombre: string, idExcluido?: number) {
    await validarNombreUnicoEntreActivos({
      entidadActiva: 'un tipo de comprobante activo',
      nombre,
      existeOtroActivo: () =>
        this.prisma.tIPOCOMPROBANTE
          .findFirst({
            where: {
              nombre: { equals: nombre, mode: 'insensitive' },
              estado: true,
              ...(idExcluido !== undefined && {
                id_tipo_comprobante: { not: idExcluido },
              }),
            },
          })
          .then((tipoComprobante) => tipoComprobante !== null),
    });
  }
}
