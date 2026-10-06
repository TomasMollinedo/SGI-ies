import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoComercial } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { DECIMALES } from '../../../common/constantes/decimales';
import { PlazoFinanciacionService } from '../plazo-financiacion/plazo-financiacion.service';
import {
  ImportesPlanEjemplo,
  calcularImportesPlanEjemplo,
} from './importes-plan-ejemplo';
import { CreatePlanEjemploDto } from './dto/create-plan-ejemplo.dto';
import { UpdatePlanEjemploDto } from './dto/update-plan-ejemplo.dto';
import { QueryPlanEjemploDto } from './dto/query-plan-ejemplo.dto';
import { SimularPlanEjemploDto } from './dto/simular-plan-ejemplo.dto';

/** Decimales con los que se informa la tasa mensual (ej. 2,0000 %). */
const DECIMALES_TASA_MENSUAL = 4;

/**
 * Lo que se lee de un plan para devolverlo: el plan, su plazo y el precio de
 * lista de su publicación, que es con lo que se calculan los importes.
 */
const PLAN_EJEMPLO_SELECT = {
  id_plan_ejemplo: true,
  FK_publicacion: true,
  nombre: true,
  anticipo_porcentaje: true,
  estado: true,
  hora_creacion: true,
  hora_actualizacion: true,
  FK_usuario_creador: true,
  FK_usuario_actualizador: true,
  plazoFinanciacion: {
    select: {
      id_plazo_financiacion: true,
      codigo: true,
      cantidad_cuotas: true,
      tasa_nominal_anual: true,
    },
  },
  publicacion: { select: { precio_lista: true } },
} as const satisfies Prisma.PLANEJEMPLOSelect;

type PlanEjemploLeido = Prisma.PLANEJEMPLOGetPayload<{
  select: typeof PLAN_EJEMPLO_SELECT;
}>;

/**
 * Qué planes existen para la API (HU-22): los que tienen un plazo activo y su
 * anticipo en porcentaje. Si el plazo se da de baja, el plan deja de
 * devolverse en todos lados (decisión del equipo sobre OBS-08), y reaparece
 * si el plazo se reactiva. Los planes del Sprint 3 sin plazo o sin
 * porcentaje quedan afuera por la misma regla.
 */
const PLAN_VISIBLE_WHERE = {
  plazoFinanciacion: { is: { estado: true } },
  anticipo_porcentaje: { not: null },
} as const satisfies Prisma.PLANEJEMPLOWhereInput;

/**
 * HU-22 — Planes de pago de ejemplo de una publicación: guardan nombre,
 * anticipo en porcentaje, plazo y estado; los importes se calculan cada vez
 * que se muestran (`calcularImportesPlanEjemplo`).
 */
@Injectable()
export class PlanEjemploService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plazos: PlazoFinanciacionService,
  ) {}

  /**
   * Alta de un plan de ejemplo. Solo con la publicación Disponible, que es
   * cuando ya tiene precio de lista (sin precio no hay importes que
   * calcular), y con un plazo activo. Nace activo.
   */
  async create(dto: CreatePlanEjemploDto, usuarioId: number) {
    await this.buscarPublicacionDisponible(dto.FK_publicacion);
    await this.buscarPlazoActivo(dto.FK_plazo_financiacion);

    const plan = await this.prisma.pLANEJEMPLO.create({
      data: {
        FK_publicacion: dto.FK_publicacion,
        nombre: dto.nombre,
        anticipo_porcentaje: new Prisma.Decimal(dto.anticipo_porcentaje),
        FK_plazo_financiacion: dto.FK_plazo_financiacion,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
      },
      select: PLAN_EJEMPLO_SELECT,
    });

    return this.mapearPlan(plan);
  }

  /**
   * Edición de nombre, anticipo, plazo y estado (activo / inactivo). Toda
   * modificación, incluida la inactivación, exige la publicación Disponible:
   * con la unidad En Plan de Pago o Vendida los planes quedan como estaban.
   *
   * El plazo con el que queda el plan tiene que estar activo: si el request
   * cambia el plazo, se valida el nuevo; si no, el que ya tenía. Así un plan
   * cuyo plazo se dio de baja solo se puede volver a tocar eligiéndole otro.
   */
  async update(id: number, dto: UpdatePlanEjemploDto, usuarioId: number) {
    const plan = await this.prisma.pLANEJEMPLO.findUnique({
      where: { id_plan_ejemplo: id },
      select: {
        FK_publicacion: true,
        FK_plazo_financiacion: true,
        anticipo_porcentaje: true,
      },
    });
    if (!plan) {
      throw new NotFoundException(`No existe un plan de ejemplo con id ${id}`);
    }

    await this.buscarPublicacionDisponible(plan.FK_publicacion);

    const idPlazo = dto.FK_plazo_financiacion ?? plan.FK_plazo_financiacion;
    if (idPlazo === null) {
      throw new ConflictException(
        'El plan no tiene plazo de financiación: elegí uno para poder modificarlo',
      );
    }
    await this.buscarPlazoActivo(idPlazo);

    if (
      dto.anticipo_porcentaje === undefined &&
      plan.anticipo_porcentaje === null
    ) {
      throw new ConflictException(
        'El plan no tiene anticipo en porcentaje: cargalo para poder modificarlo',
      );
    }

    const actualizado = await this.prisma.pLANEJEMPLO.update({
      where: { id_plan_ejemplo: id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.anticipo_porcentaje !== undefined && {
          anticipo_porcentaje: new Prisma.Decimal(dto.anticipo_porcentaje),
        }),
        ...(dto.FK_plazo_financiacion !== undefined && {
          FK_plazo_financiacion: dto.FK_plazo_financiacion,
        }),
        ...(dto.estado !== undefined && { estado: dto.estado }),
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
      select: PLAN_EJEMPLO_SELECT,
    });

    return this.mapearPlan(actualizado);
  }

  /** Detalle de un plan, con sus importes calculados. */
  async findOne(id: number) {
    const plan = await this.prisma.pLANEJEMPLO.findFirst({
      where: { id_plan_ejemplo: id, ...PLAN_VISIBLE_WHERE },
      select: PLAN_EJEMPLO_SELECT,
    });
    if (!plan) {
      throw new NotFoundException(`No existe un plan de ejemplo con id ${id}`);
    }

    return this.mapearPlan(plan);
  }

  /**
   * Los planes de ejemplo de una publicación, del más viejo al más nuevo, con
   * sus importes calculados. Por default solo los activos.
   */
  async findByPublicacion(query: QueryPlanEjemploDto) {
    const { FK_publicacion, estado } = query;

    const planes = await this.prisma.pLANEJEMPLO.findMany({
      where: {
        FK_publicacion,
        ...(estado !== 'todos' && { estado }),
        ...PLAN_VISIBLE_WHERE,
      },
      select: PLAN_EJEMPLO_SELECT,
      orderBy: { id_plan_ejemplo: 'asc' },
    });

    return planes.map((plan) => this.mapearPlan(plan));
  }

  /**
   * Calcula en vivo, sin guardar nada, los importes y el cronograma de un
   * plan mientras se arma (HU-22). El precio de lista y la TNA se leen de la
   * base, así el resultado es el mismo que va a mostrar el plan guardado. Los
   * vencimientos se cuentan desde hoy: la fecha real recién existe en la
   * venta.
   */
  async simular(dto: SimularPlanEjemploDto) {
    const precioLista = await this.buscarPublicacionDisponible(
      dto.FK_publicacion,
    );
    const plazo = await this.buscarPlazoActivo(dto.FK_plazo_financiacion);

    const importes = calcularImportesPlanEjemplo({
      precio_lista: precioLista,
      anticipo_porcentaje: new Prisma.Decimal(dto.anticipo_porcentaje),
      cantidad_cuotas: plazo.cantidad_cuotas,
      tasa_nominal_anual: plazo.tasa_nominal_anual,
    });

    return {
      ...this.mapearImportes(importes),
      cantidad_cuotas: importes.cantidad_cuotas,
      tasa_nominal_anual: importes.tasa_nominal_anual.toFixed(DECIMALES),
      cuotas: importes.cuotas.map((cuota) => ({
        numero: cuota.numero,
        fecha_vencimiento: cuota.fecha_vencimiento,
        importe_capital: cuota.importe_capital.toFixed(DECIMALES),
        importe_interes: cuota.importe_interes.toFixed(DECIMALES),
        importe: cuota.importe.toFixed(DECIMALES),
        saldo_capital: cuota.saldo_capital.toFixed(DECIMALES),
      })),
    };
  }

  /**
   * La publicación tiene que existir, estar vigente y estar Disponible.
   * Devuelve su precio de lista: una publicación Disponible siempre lo tiene
   * (definirlo es lo que la pasa a Disponible, T133).
   */
  private async buscarPublicacionDisponible(
    idPublicacion: number,
  ): Promise<Prisma.Decimal> {
    const publicacion = await this.prisma.pUBLICACIONUNIDAD.findUnique({
      where: { id_publicacion: idPublicacion },
      select: { vigente: true, estado_comercial: true, precio_lista: true },
    });
    if (!publicacion || !publicacion.vigente) {
      throw new NotFoundException(
        `No existe una publicación vigente con id ${idPublicacion}`,
      );
    }
    if (publicacion.estado_comercial !== EstadoComercial.DISPONIBLE) {
      throw new ConflictException(
        'Los planes de ejemplo solo se pueden crear, modificar o inactivar con la publicación Disponible',
      );
    }

    return this.exigirPrecioLista(idPublicacion, publicacion.precio_lista);
  }

  /** El plazo tiene que existir (404, lo resuelve T126) y estar activo. */
  private async buscarPlazoActivo(idPlazo: number) {
    const plazo = await this.plazos.findOne(idPlazo);
    if (!plazo.estado) {
      throw new ConflictException(
        `El plazo de financiación ${plazo.codigo} está dado de baja: elegí un plazo activo`,
      );
    }

    return plazo;
  }

  /**
   * Una publicación con planes de ejemplo visibles siempre tiene precio de
   * lista: si falta es un dato inconsistente, no un error del usuario.
   */
  private exigirPrecioLista(
    idPublicacion: number,
    precioLista: Prisma.Decimal | null,
  ): Prisma.Decimal {
    if (precioLista === null) {
      throw new InternalServerErrorException(
        `La publicación ${idPublicacion} no tiene precio de lista`,
      );
    }
    return precioLista;
  }

  /**
   * El plan con la forma del contrato HTTP y sus importes calculados. Recibe
   * solo planes con plazo y anticipo cargados: los lee con
   * `PLAN_VISIBLE_WHERE`, o vienen de un alta o edición que los validó.
   */
  private mapearPlan(plan: PlanEjemploLeido) {
    const { plazoFinanciacion: plazo, anticipo_porcentaje: anticipo } = plan;
    if (plazo === null || anticipo === null) {
      throw new InternalServerErrorException(
        `El plan de ejemplo ${plan.id_plan_ejemplo} no tiene plazo o anticipo en porcentaje`,
      );
    }

    const importes = calcularImportesPlanEjemplo({
      precio_lista: this.exigirPrecioLista(
        plan.FK_publicacion,
        plan.publicacion.precio_lista,
      ),
      anticipo_porcentaje: anticipo,
      cantidad_cuotas: plazo.cantidad_cuotas,
      tasa_nominal_anual: plazo.tasa_nominal_anual,
    });

    return {
      id_plan_ejemplo: plan.id_plan_ejemplo,
      FK_publicacion: plan.FK_publicacion,
      nombre: plan.nombre,
      anticipo_porcentaje: anticipo.toFixed(DECIMALES),
      estado: plan.estado,
      plazo: {
        id_plazo_financiacion: plazo.id_plazo_financiacion,
        codigo: plazo.codigo,
        cantidad_cuotas: plazo.cantidad_cuotas,
        tasa_nominal_anual: plazo.tasa_nominal_anual.toFixed(DECIMALES),
      },
      importes: this.mapearImportes(importes),
      hora_creacion: plan.hora_creacion,
      hora_actualizacion: plan.hora_actualizacion,
      FK_usuario_creador: plan.FK_usuario_creador,
      FK_usuario_actualizador: plan.FK_usuario_actualizador,
    };
  }

  /**
   * Los totales como strings con decimales fijos. Un plan de ejemplo siempre
   * es FINANCIADO, así que el motor siempre devuelve tasa mensual y valor de
   * cuota.
   */
  private mapearImportes(importes: ImportesPlanEjemplo) {
    return {
      precio_lista: importes.precio_lista.toFixed(DECIMALES),
      anticipo_monto: importes.anticipo_monto.toFixed(DECIMALES),
      saldo_financiado: importes.saldo_financiado.toFixed(DECIMALES),
      tasa_mensual: importes.tasa_mensual!.toFixed(DECIMALES_TASA_MENSUAL),
      valor_cuota: importes.valor_cuota!.toFixed(DECIMALES),
      total_intereses: importes.total_intereses.toFixed(DECIMALES),
      total_a_pagar: importes.total_a_pagar.toFixed(DECIMALES),
    };
  }
}
