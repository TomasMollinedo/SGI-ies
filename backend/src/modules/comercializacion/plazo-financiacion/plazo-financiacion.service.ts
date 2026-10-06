import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { reactivarEntidad } from '../../../common/validaciones/reactivar-entidad';
import { CatalogoItemDto } from '../../../common/dto/catalogo-item.dto';
import { CreatePlazoFinanciacionDto } from './dto/create-plazo-financiacion.dto';
import { UpdatePlazoFinanciacionDto } from './dto/update-plazo-financiacion.dto';
import { QueryPlazoFinanciacionDto } from './dto/query-plazo-financiacion.dto';

/** Decimales con los que se muestra la tasa mensual (TNA ÷ 12). */
const DECIMALES_TASA_MENSUAL = 4;

/**
 * Tasa mensual para mostrar: TNA ÷ 12. Es un dato derivado que no se guarda
 * (ver PLAZOFINANCIACION en schema.prisma); el motor de cuotas parte de la TNA
 * y no de este valor redondeado.
 */
export function calcularTasaMensual(tasaNominalAnual: Prisma.Decimal): string {
  return tasaNominalAnual.div(12).toFixed(DECIMALES_TASA_MENSUAL);
}

@Injectable()
export class PlazoFinanciacionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Alta de un plazo de financiación (HU-32). Nace activo por el
   * `@default(true)` de PLAZOFINANCIACION.
   *
   * El código lo genera el sistema a partir del id (`PLZ-001`, `PLZ-002`,
   * ...): como el id recién existe después del INSERT, el alta se hace en dos
   * pasos dentro de una transacción — se crea con un código provisorio único
   * y se reemplaza por el definitivo — para que nunca quede un plazo sin su
   * código real.
   *
   * `cantidad_cuotas` se define únicamente acá: después queda bloqueada (ver
   * UpdatePlazoFinanciacionDto).
   */
  async create(dto: CreatePlazoFinanciacionDto, usuarioId: number) {
    await this.validarCantidadCuotasUnica(dto.cantidad_cuotas);

    return this.prisma.$transaction(async (tx) => {
      const creado = await tx.pLAZOFINANCIACION.create({
        data: {
          codigo: randomUUID(),
          cantidad_cuotas: dto.cantidad_cuotas,
          tasa_nominal_anual: new Prisma.Decimal(dto.tasa_nominal_anual),
          descripcion: dto.descripcion,
          FK_usuario_creador: usuarioId,
          FK_usuario_actualizador: usuarioId,
        },
      });

      return tx.pLAZOFINANCIACION.update({
        where: { id_plazo_financiacion: creado.id_plazo_financiacion },
        data: { codigo: this.generarCodigo(creado.id_plazo_financiacion) },
      });
    });
  }

  /**
   * Listado paginado, ordenado por cantidad de cuotas ascendente, con la tasa
   * mensual de cada plazo. Por defecto trae solo los activos (lo resuelve el
   * `.default(true)` del query DTO); `estado: 'todos'` trae activos e
   * inactivos.
   */
  async findAll(query: QueryPlazoFinanciacionDto) {
    const { estado, page, limit } = query;

    const where: Prisma.PLAZOFINANCIACIONWhereInput =
      estado === 'todos' ? {} : { estado };

    const [plazos, total] = await Promise.all([
      this.prisma.pLAZOFINANCIACION.findMany({
        where,
        // Sin los datos de auditoría: el listado no los expone, eso lo da el
        // detalle (findOne).
        select: {
          id_plazo_financiacion: true,
          codigo: true,
          cantidad_cuotas: true,
          tasa_nominal_anual: true,
          descripcion: true,
          estado: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { cantidad_cuotas: 'asc' },
      }),
      this.prisma.pLAZOFINANCIACION.count({ where }),
    ]);

    const data = plazos.map((plazo) => ({
      ...plazo,
      tasa_mensual: calcularTasaMensual(plazo.tasa_nominal_anual),
    }));

    return { data, meta: { total, page, limit } };
  }

  /**
   * Catálogo de plazos activos para las tablas emergentes de la venta y de los
   * planes de ejemplo. Sin paginación (es una lista chica por diseño) y
   * ordenado por cantidad de cuotas. Cada fila viaja con lo que esas tablas
   * muestran — cantidad de cuotas y TNA — en `metadata`.
   */
  async listarCatalogo(): Promise<CatalogoItemDto[]> {
    const plazos = await this.prisma.pLAZOFINANCIACION.findMany({
      where: { estado: true },
      select: {
        id_plazo_financiacion: true,
        codigo: true,
        cantidad_cuotas: true,
        tasa_nominal_anual: true,
      },
      orderBy: { cantidad_cuotas: 'asc' },
    });

    return plazos.map((plazo) => ({
      id: String(plazo.id_plazo_financiacion),
      code: `${plazo.cantidad_cuotas} ${plazo.cantidad_cuotas === 1 ? 'cuota' : 'cuotas'}`,
      metadata: {
        codigo: plazo.codigo,
        cantidad_cuotas: plazo.cantidad_cuotas,
        tasa_nominal_anual: plazo.tasa_nominal_anual.toFixed(2),
        tasa_mensual: calcularTasaMensual(plazo.tasa_nominal_anual),
      },
    }));
  }

  /**
   * Detalle de un plazo: a diferencia del listado, incluye nombre y apellido
   * de quién lo creó y de quién lo modificó por última vez.
   */
  async findOne(id: number) {
    const plazo = await this.prisma.pLAZOFINANCIACION.findUnique({
      where: { id_plazo_financiacion: id },
      include: {
        usuarioCreador: { select: { nombre: true, apellido: true } },
        usuarioActualizador: { select: { nombre: true, apellido: true } },
      },
    });

    if (!plazo) {
      throw new NotFoundException(
        `No existe un plazo de financiación con id ${id}`,
      );
    }

    return {
      ...plazo,
      tasa_mensual: calcularTasaMensual(plazo.tasa_nominal_anual),
    };
  }

  /**
   * Edición: solo `tasa_nominal_anual` y `descripcion`. `cantidad_cuotas` no
   * forma parte del DTO de update (queda bloqueada desde el alta) y `estado`
   * se cambia por los endpoints /baja y /alta.
   *
   * Registra quién y cuándo lo cambió (`FK_usuario_actualizador` y
   * `hora_actualizacion`), que es la auditoría que pide HU-32 para los
   * cambios de tasa, sin historial de valores anteriores (OBS-01).
   */
  async update(id: number, dto: UpdatePlazoFinanciacionDto, usuarioId: number) {
    await this.findOne(id);

    return this.prisma.pLAZOFINANCIACION.update({
      where: { id_plazo_financiacion: id },
      data: {
        ...(dto.tasa_nominal_anual !== undefined && {
          tasa_nominal_anual: new Prisma.Decimal(dto.tasa_nominal_anual),
        }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Baja lógica: el único chequeo es que no esté ya inactivo. Nunca se borra
   * físicamente, así que los planes de pago y de ejemplo conservan su FK.
   *
   * Que un plazo inactivo no se ofrezca en ventas ni planes nuevos lo resuelve
   * el catálogo, que solo lista activos.
   */
  async baja(id: number, usuarioId: number) {
    const plazo = await this.findOne(id);

    if (!plazo.estado) {
      throw new ConflictException(
        'El plazo de financiación ya está dado de baja',
      );
    }

    return this.prisma.pLAZOFINANCIACION.update({
      where: { id_plazo_financiacion: id },
      data: {
        estado: false,
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });
  }

  /**
   * Alta lógica (reactivar, OBS-24): solo si está de baja y siempre que no
   * exista ahora otro plazo activo con la misma cantidad de cuotas —mientras
   * estuvo de baja, otro pudo haber tomado ese valor—.
   */
  async activar(id: number, usuarioId: number) {
    const plazo = await this.findOne(id);

    return reactivarEntidad({
      entidad: plazo,
      entidadYaActiva: 'El plazo de financiación ya está activo',
      revalidar: () =>
        this.validarCantidadCuotasUnica(plazo.cantidad_cuotas, id),
      activar: () =>
        this.prisma.pLAZOFINANCIACION.update({
          where: { id_plazo_financiacion: id },
          data: {
            estado: true,
            FK_usuario_actualizador: usuarioId,
            hora_actualizacion: new Date(),
          },
        }),
    });
  }

  private generarCodigo(id: number): string {
    return `PLZ-${String(id).padStart(3, '0')}`;
  }

  /**
   * La cantidad de cuotas no puede repetirse entre plazos activos: uno dado de
   * baja libera su valor. Se valida acá y no con un índice único porque el
   * índice no distingue activos de inactivos.
   */
  private async validarCantidadCuotasUnica(
    cantidadCuotas: number,
    idExcluido?: number,
  ) {
    const existente = await this.prisma.pLAZOFINANCIACION.findFirst({
      where: {
        cantidad_cuotas: cantidadCuotas,
        estado: true,
        ...(idExcluido !== undefined && {
          id_plazo_financiacion: { not: idExcluido },
        }),
      },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe un plazo de financiación activo de ${cantidadCuotas} cuotas (${existente.codigo})`,
      );
    }
  }
}
