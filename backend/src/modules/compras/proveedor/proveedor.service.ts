import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { validarNombreUnicoEntreActivos } from '../../../common/validaciones/nombre-unico-entre-activos';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { QueryProveedorDto } from './dto/query-proveedor.dto';

@Injectable()
export class ProveedorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * El "código único generado por el sistema" que pide la HU es el
   * `id_proveedor` autoincremental (ver comentario en schema.prisma): no
   * hace falta generar nada acá, Postgres ya lo asigna al crear.
   */
  async create(dto: CreateProveedorDto, usuarioId: number) {
    await this.validarCuitUnico(dto.cuit);
    await this.validarRazonSocialUnica(dto.razon_social);

    return this.prisma.pROVEEDOR.create({
      data: {
        ...dto,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
      },
    });
  }

  async findAll(query: QueryProveedorDto) {
    const { busqueda, condicion_iva, estado, page, limit } = query;

    const where: Prisma.PROVEEDORWhereInput = {
      // Sin filtro explícito de estado, el listado muestra solo activos.
      estado: estado ?? true,
      ...(condicion_iva && { condicion_iva }),
      ...(busqueda && {
        OR: [
          { razon_social: { contains: busqueda, mode: 'insensitive' } },
          { cuit: { contains: busqueda } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.pROVEEDOR.findMany({
        where,
        // Sin los datos de auditoría (quién ni cuándo): el listado no los
        // expone, eso lo da el detalle (findOne).
        select: {
          id_proveedor: true,
          razon_social: true,
          cuit: true,
          condicion_iva: true,
          domicilio: true,
          telefono: true,
          correo: true,
          observaciones: true,
          estado: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { razon_social: 'asc' },
      }),
      this.prisma.pROVEEDOR.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  /**
   * Detalle de un proveedor: a diferencia del listado, incluye nombre y
   * apellido de quién lo creó y de quién lo modificó por última vez.
   */
  async findOne(id: number) {
    const proveedor = await this.prisma.pROVEEDOR.findUnique({
      where: { id_proveedor: id },
      include: {
        usuarioCreador: { select: { nombre: true, apellido: true } },
        usuarioActualizador: { select: { nombre: true, apellido: true } },
      },
    });

    if (!proveedor) {
      throw new NotFoundException(`No existe un proveedor con id ${id}`);
    }

    return proveedor;
  }

  async update(id: number, dto: UpdateProveedorDto, usuarioId: number) {
    await this.findOne(id);

    if (dto.cuit) {
      await this.validarCuitUnico(dto.cuit, id);
    }
    if (dto.razon_social) {
      await this.validarRazonSocialUnica(dto.razon_social, id);
    }

    return this.prisma.pROVEEDOR.update({
      where: { id_proveedor: id },
      data: {
        ...dto,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Si el proveedor puede darse de baja. Hoy siempre devuelve `true`: la
   * regla real (por ejemplo, que no tenga órdenes de compra o comprobantes
   * pendientes) se completa en T51.
   */
  puedeDarseDeBaja(id: number): Promise<boolean> {
    void id;
    return Promise.resolve(true);
  }

  /** Baja lógica: no se permite si el proveedor ya está inactivo. */
  async baja(id: number, usuarioId: number) {
    const proveedor = await this.findOne(id);

    if (!proveedor.estado) {
      throw new ConflictException('El proveedor ya está dado de baja');
    }

    if (!(await this.puedeDarseDeBaja(id))) {
      throw new ConflictException(
        'El proveedor no puede darse de baja en este momento',
      );
    }

    return this.prisma.pROVEEDOR.update({
      where: { id_proveedor: id },
      data: {
        estado: false,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  private async validarRazonSocialUnica(
    razonSocial: string,
    idExcluido?: number,
  ) {
    await validarNombreUnicoEntreActivos({
      entidadActiva: 'un proveedor activo',
      nombre: razonSocial,
      existeOtroActivo: () =>
        this.prisma.pROVEEDOR
          .findFirst({
            where: {
              razon_social: { equals: razonSocial, mode: 'insensitive' },
              estado: true,
              ...(idExcluido !== undefined && {
                id_proveedor: { not: idExcluido },
              }),
            },
          })
          .then((proveedor) => proveedor !== null),
    });
  }

  /**
   * A diferencia de la razón social, el CUIT es único entre TODOS los
   * proveedores, activos o no: identifica a una persona jurídica, así que
   * duplicarlo contra uno dado de baja también es un error de datos (ver
   * comentario en schema.prisma — si vuelve, se reactiva, no se recrea).
   */
  private async validarCuitUnico(cuit: string, idExcluido?: number) {
    const existente = await this.prisma.pROVEEDOR.findFirst({
      where: {
        cuit,
        ...(idExcluido !== undefined && {
          id_proveedor: { not: idExcluido },
        }),
      },
    });

    if (existente) {
      throw new ConflictException(
        existente.estado
          ? `Ya existe un proveedor activo con el CUIT ${cuit}`
          : `Ya existe un proveedor dado de baja con el CUIT ${cuit}`,
      );
    }
  }
}
