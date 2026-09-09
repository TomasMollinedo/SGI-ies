import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { validarNombreUnicoEntreActivos } from '../../../common/validaciones/nombre-unico-entre-activos';
import { reactivarEntidad } from '../../../common/validaciones/reactivar-entidad';
import { condicionBusquedaPorPalabras } from '../../../common/validaciones/busqueda-por-palabras';
import { CreateFormaPagoDto } from './dto/create-forma-pago.dto';
import { UpdateFormaPagoDto } from './dto/update-forma-pago.dto';
import { QueryFormaPagoDto } from './dto/query-forma-pago.dto';

@Injectable()
export class FormaPagoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Alta de una forma de pago. Nace activa por el `@default(true)` de
   * FORMAPAGO, así que el estado no se manda desde acá.
   *
   * El "código único generado por el sistema" que pide la HU es el
   * `id_forma_pago` autoincremental (ver comentario en schema.prisma): no
   * hace falta generar nada, Postgres ya lo asigna al crear.
   *
   * Es el único momento en que se define `requiere_referencia`: después queda
   * bloqueado para siempre, porque de él depende si las órdenes de pago ya
   * registradas con esta forma tenían que llevar número de referencia.
   */
  async create(dto: CreateFormaPagoDto, usuarioId: number) {
    await this.validarNombreUnico(dto.nombre);

    return this.prisma.fORMAPAGO.create({
      data: {
        ...dto,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
      },
    });
  }

  /**
   * Listado paginado. A diferencia del resto de los ABM, el default es traer
   * solo las activas: lo pide la HU-15 y lo resuelve el `.default(true)` del
   * query DTO. `estado: 'todos'` trae activas e inactivas, para poder
   * encontrar una dada de baja y reactivarla.
   */
  async findAll(query: QueryFormaPagoDto) {
    const { nombre, estado, page, limit } = query;

    const where: Prisma.FORMAPAGOWhereInput = {
      ...(estado !== 'todos' && { estado }),
      ...(nombre &&
        condicionBusquedaPorPalabras<Prisma.FORMAPAGOWhereInput>(
          'nombre',
          nombre,
        )),
    };

    const [data, total] = await Promise.all([
      this.prisma.fORMAPAGO.findMany({
        where,
        // Sin los datos de auditoría (quién ni cuándo): el listado no los
        // expone, eso lo da el detalle (findOne).
        select: {
          id_forma_pago: true,
          nombre: true,
          descripcion: true,
          requiere_referencia: true,
          estado: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.fORMAPAGO.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  /**
   * Detalle de una forma de pago: a diferencia del listado, incluye nombre y
   * apellido de quién la creó y de quién la modificó por última vez.
   */
  async findOne(id: number) {
    const formaPago = await this.prisma.fORMAPAGO.findUnique({
      where: { id_forma_pago: id },
      include: {
        usuarioCreador: { select: { nombre: true, apellido: true } },
        usuarioActualizador: { select: { nombre: true, apellido: true } },
      },
    });

    if (!formaPago) {
      throw new NotFoundException(`No existe una forma de pago con id ${id}`);
    }

    return formaPago;
  }

  /**
   * Edición: solo `nombre` y `descripcion`. `requiere_referencia` no forma
   * parte del DTO de update (queda bloqueado desde el alta) y `estado` se
   * cambia por los endpoints /baja y /alta.
   */
  async update(id: number, dto: UpdateFormaPagoDto, usuarioId: number) {
    await this.findOne(id);

    if (dto.nombre) {
      await this.validarNombreUnico(dto.nombre, id);
    }

    return this.prisma.fORMAPAGO.update({
      where: { id_forma_pago: id },
      data: {
        ...dto,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Baja lógica: el único chequeo es que no esté ya inactiva. Nunca se borra
   * físicamente, así que las órdenes de pago históricas siempre conservan su
   * FK.
   *
   * Que una forma de pago inactiva no pueda usarse en órdenes de pago nuevas
   * es una regla del módulo de Órdenes de Pago, no de acá: este service se
   * limita a dejar el listado de activas disponible para que la consulte.
   */
  async baja(id: number, usuarioId: number) {
    const formaPago = await this.findOne(id);

    if (!formaPago.estado) {
      throw new ConflictException('La forma de pago ya está dada de baja');
    }

    return this.prisma.fORMAPAGO.update({
      where: { id_forma_pago: id },
      data: {
        estado: false,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Alta lógica (reactivar): solo si está de baja. Vuelve a validar el nombre
   * entre activas porque, mientras estuvo de baja, otra forma de pago pudo
   * haber tomado ese mismo nombre.
   */
  async activar(id: number, usuarioId: number) {
    const formaPago = await this.findOne(id);

    return reactivarEntidad({
      entidad: formaPago,
      entidadYaActiva: 'La forma de pago ya está activa',
      revalidar: () => this.validarNombreUnico(formaPago.nombre, id),
      activar: () =>
        this.prisma.fORMAPAGO.update({
          where: { id_forma_pago: id },
          data: {
            estado: true,
            FK_usuario_actualizador: usuarioId,
            hora_actualizacion: new Date(),
          },
        }),
    });
  }

  private async validarNombreUnico(nombre: string, idExcluido?: number) {
    await validarNombreUnicoEntreActivos({
      entidadActiva: 'una forma de pago activa',
      nombre,
      existeOtroActivo: () =>
        this.prisma.fORMAPAGO
          .findFirst({
            where: {
              nombre: { equals: nombre, mode: 'insensitive' },
              estado: true,
              ...(idExcluido !== undefined && {
                id_forma_pago: { not: idExcluido },
              }),
            },
          })
          .then((formaPago) => formaPago !== null),
    });
  }
}
