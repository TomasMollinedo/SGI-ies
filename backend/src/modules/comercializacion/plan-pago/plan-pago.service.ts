import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PLANEJEMPLO, Prisma } from '../../../../generated/prisma/client';
import { EstadoComercial } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { DECIMALES } from '../../../common/constantes/decimales';
import {
  advertenciaPrecioMenorAlCosto,
  porcentajeGananciaSobreCosto,
} from '../common/precio-sobre-costo';
import { CreatePlanPagoDto } from './dto/create-plan-pago.dto';
import { UpdatePlanPagoDto } from './dto/update-plan-pago.dto';
import { QueryPlanPagoDto } from './dto/query-plan-pago.dto';
import { SimularCuotasDto } from './dto/simular-cuotas.dto';
import {
  exigirPrecioPlanEjemplo,
  exigirTipoPlanEjemplo,
} from './exigir-condiciones-plan-ejemplo';
import { CuotaGenerada, generarCuotas } from './motor-cuotas';

@Injectable()
export class PlanPagoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Alta de un plan de pago (HU-22).
   *
   * El plan nace activo por el `@default(true)` de PLANEJEMPLO. Desde T133 el
   * alta no toca el `estado_comercial` de la publicación: lo que la pasa a
   * DISPONIBLE es definir su precio de lista (`PublicacionService.definirPrecioLista`).
   *
   * Devuelve la fila creada más tres datos derivados que NO se persisten:
   * `warning` (precio menor al costo), `porcentaje_ganancia_implicito` y
   * `anticipo_monto_calculado`.
   *
   * Rechaza con 409 si la publicación ya tiene una venta (EN_PLAN_DE_PAGO o
   * VENDIDA): el contrato con el cliente se cerró sobre el abanico de planes
   * que existía en ese momento, no corresponde sumarle uno nuevo después.
   */
  async create(dto: CreatePlanPagoDto, usuarioId: number) {
    const publicacion = await this.prisma.pUBLICACIONUNIDAD.findUnique({
      where: { id_publicacion: dto.FK_publicacion },
      select: {
        vigente: true,
        estado_comercial: true,
        unidadFuncional: { select: { costo: true } },
      },
    });
    // `vigente: false` es una publicación despublicada o reemplazada por una
    // más nueva (hay varias filas históricas por unidad, ver
    // `PUBLICACIONUNIDAD.vigente` en schema.prisma): no es un destino válido
    // para un plan nuevo, mismo criterio que el resto de las operaciones de
    // Publicaciones (`despublicar`, `transicionarEstadoComercial`).
    if (!publicacion || !publicacion.vigente) {
      throw new NotFoundException(
        `No existe una publicación vigente con id ${dto.FK_publicacion}`,
      );
    }

    // Con una venta ya encima, el contrato con el cliente está cerrado sobre
    // el abanico de planes que existía en ese momento: no tiene sentido
    // comercial sumar una oferta nueva después.
    if (
      publicacion.estado_comercial === EstadoComercial.EN_PLAN_DE_PAGO ||
      publicacion.estado_comercial === EstadoComercial.VENDIDA
    ) {
      throw new ConflictException(
        'No se puede crear un plan nuevo: la publicación ya tiene una venta',
      );
    }

    const precio = new Prisma.Decimal(dto.precio);
    const costo = publicacion.unidadFuncional.costo;

    const anticipoMontoCalculado = this.resolverAnticipoMonto(dto, precio);
    const warning = advertenciaPrecioMenorAlCosto(
      'El precio del plan',
      precio,
      costo,
    );
    const porcentajeGananciaImplicito = this.calcularGananciaImplicita(
      dto,
      precio,
      costo,
    );

    const plan = await this.prisma.pLANEJEMPLO.create({
      data: {
        FK_publicacion: dto.FK_publicacion,
        nombre: dto.nombre,
        tipo: dto.tipo,
        precio,
        // Si no vinieron, se omiten para que Prisma aplique el default 0.
        ...(dto.porcentaje_ganancia !== undefined && {
          porcentaje_ganancia: new Prisma.Decimal(dto.porcentaje_ganancia),
        }),
        ...(dto.margen !== undefined && {
          margen: new Prisma.Decimal(dto.margen),
        }),
        // Se guarda lo que cargó el usuario (porcentaje o monto), no el
        // monto resuelto: `anticipo_monto_calculado` es de uso interno.
        anticipo_porcentaje:
          dto.anticipo_porcentaje === undefined
            ? null
            : dto.anticipo_porcentaje,
        anticipo_monto:
          dto.anticipo_monto === undefined ? null : dto.anticipo_monto,
        cantidad_cuotas:
          dto.cantidad_cuotas === undefined ? null : dto.cantidad_cuotas,
        periodicidad: dto.periodicidad === undefined ? null : dto.periodicidad,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
      },
    });

    return {
      ...this.mapearPlan(plan),
      warning,
      porcentaje_ganancia_implicito: porcentajeGananciaImplicito,
      anticipo_monto_calculado: anticipoMontoCalculado,
    };
  }

  /**
   * Edición de un plan de pago (HU-22). El DTO ya bloquea las condiciones
   * estructurales (tipo, anticipo, cuotas, periodicidad); acá van las reglas
   * que necesitan ir a la base.
   *
   * Desde T133, activar o inactivar un plan no cambia el `estado_comercial`
   * de la publicación: ese estado depende solo de su precio de lista.
   *
   * Precio, porcentaje de ganancia y margen solo se editan con el plan
   * activo: si el plan ya está inactivo y este request no lo reactiva a la
   * vez (`estado: true`), rechaza con 409 — la vía para tocar sus condiciones
   * económicas es reactivarlo primero, no editarlo "apagado" y confiar en que
   * nadie lo revise hasta la próxima vez que se active.
   *
   * Si este request carga un `precio` nuevo, la respuesta trae los mismos
   * dos derivados que `create()`: `warning` (precio por debajo del costo) y
   * `porcentaje_ganancia_implicito` (solo si tampoco vinieron
   * `porcentaje_ganancia` ni `margen`) — Comercialización puede editar el
   * precio a mano igual que en el alta, y necesita ver lo mismo.
   */
  async update(id: number, dto: UpdatePlanPagoDto, usuarioId: number) {
    const plan = await this.prisma.pLANEJEMPLO.findUnique({
      where: { id_plan_ejemplo: id },
      select: {
        id_plan_ejemplo: true,
        FK_publicacion: true,
        estado: true,
        publicacion: {
          select: {
            estado_comercial: true,
            unidadFuncional: { select: { costo: true } },
          },
        },
      },
    });
    if (!plan) {
      throw new NotFoundException(`No existe un plan de pago con id ${id}`);
    }

    const estadoComercial = plan.publicacion.estado_comercial;
    const tieneVenta =
      estadoComercial === EstadoComercial.EN_PLAN_DE_PAGO ||
      estadoComercial === EstadoComercial.VENDIDA;

    // Los tres van juntos: son las condiciones económicas del plan. Se
    // bloquean aunque el vendido sea otro plan de la misma publicación,
    // porque el cliente decidió mirando todo el abanico de planes.
    const editaCondiciones =
      dto.precio !== undefined ||
      dto.porcentaje_ganancia !== undefined ||
      dto.margen !== undefined;

    if (editaCondiciones && tieneVenta) {
      throw new ConflictException(
        'No se puede editar precio/porcentaje/margen: la publicación ya tiene una venta',
      );
    }

    // Un plan inactivo no es una oferta vigente: si el request no lo
    // reactiva en el mismo golpe (`dto.estado` en true), sus condiciones
    // económicas quedan tan congeladas como las de un plan con venta. Para
    // tocarlas hay que reactivarlo primero, desde el listado.
    const estadoResultante = dto.estado ?? plan.estado;
    if (editaCondiciones && !estadoResultante) {
      throw new ConflictException(
        'No se puede editar precio/porcentaje/margen: el plan está inactivo',
      );
    }

    // Los dos derivados solo tienen sentido cuando este request carga un
    // precio nuevo: si no vino `precio`, no hay nada nuevo que avisar ni
    // ganancia implícita que mostrar (mismo criterio que `create()`).
    const precioNuevo =
      dto.precio === undefined ? null : new Prisma.Decimal(dto.precio);
    const costo = plan.publicacion.unidadFuncional.costo;

    const warning =
      precioNuevo === null
        ? null
        : advertenciaPrecioMenorAlCosto(
            'El precio del plan',
            precioNuevo,
            costo,
          );
    const porcentajeGananciaImplicito =
      precioNuevo === null
        ? null
        : this.calcularGananciaImplicita(dto, precioNuevo, costo);

    const actualizado = await this.prisma.pLANEJEMPLO.update({
      where: { id_plan_ejemplo: id },
      data: {
        ...(dto.precio !== undefined && {
          precio: new Prisma.Decimal(dto.precio),
        }),
        ...(dto.porcentaje_ganancia !== undefined && {
          porcentaje_ganancia: new Prisma.Decimal(dto.porcentaje_ganancia),
        }),
        ...(dto.margen !== undefined && {
          margen: new Prisma.Decimal(dto.margen),
        }),
        ...(dto.estado !== undefined && { estado: dto.estado }),
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });

    return {
      ...this.mapearPlan(actualizado),
      warning,
      porcentaje_ganancia_implicito: porcentajeGananciaImplicito,
    };
  }

  /**
   * Detalle de un plan puntual, para la pantalla interna de Comercialización
   * (incluye el `estado`, que el catálogo público nunca vería).
   */
  async findOne(id: number) {
    const plan = await this.prisma.pLANEJEMPLO.findUnique({
      where: { id_plan_ejemplo: id },
    });
    if (!plan) {
      throw new NotFoundException(`No existe un plan de pago con id ${id}`);
    }

    return this.mapearPlan(plan);
  }

  /**
   * Los planes de una publicación, el abanico de formas de pago que se le
   * ofrece al cliente por esa unidad. Por default solo los activos;
   * `estado=todos` incluye los inactivos, que es como la pantalla encuentra
   * uno dado de baja para reactivarlo.
   *
   * Sin paginación: son pocos por diseño (ver `QueryPlanPagoDto`).
   */
  async findByPublicacion(query: QueryPlanPagoDto) {
    const { FK_publicacion, estado } = query;

    const planes = await this.prisma.pLANEJEMPLO.findMany({
      where: {
        FK_publicacion,
        ...(estado !== 'todos' && { estado }),
      },
      orderBy: { id_plan_ejemplo: 'asc' },
    });

    return planes.map((plan) => this.mapearPlan(plan));
  }

  /**
   * La fila de PLANEJEMPLO con la forma que ya tenía el contrato HTTP del
   * plan: la PK sigue saliendo como `id_plan_pago`, y solo viajan los campos
   * de `planPagoResponseSchema` (las columnas que T121 le sumó a la tabla no
   * forman parte de este contrato).
   */
  private mapearPlan(plan: PLANEJEMPLO) {
    return {
      id_plan_pago: plan.id_plan_ejemplo,
      FK_publicacion: plan.FK_publicacion,
      nombre: plan.nombre,
      tipo: exigirTipoPlanEjemplo(plan.tipo),
      precio: exigirPrecioPlanEjemplo(plan.precio),
      porcentaje_ganancia: plan.porcentaje_ganancia,
      margen: plan.margen,
      anticipo_porcentaje: plan.anticipo_porcentaje,
      anticipo_monto: plan.anticipo_monto,
      cantidad_cuotas: plan.cantidad_cuotas,
      periodicidad: plan.periodicidad,
      estado: plan.estado,
      hora_creacion: plan.hora_creacion,
      hora_actualizacion: plan.hora_actualizacion,
      FK_usuario_creador: plan.FK_usuario_creador,
      FK_usuario_actualizador: plan.FK_usuario_actualizador,
    };
  }

  /**
   * Previsualiza el cronograma de cuotas sin guardar nada (T106).
   *
   * No toca la base: no hay publicación, ni plan, ni venta. Resuelve el
   * anticipo a monto igual que `create()` y le pasa las condiciones al motor
   * de cuotas, que es el único dueño del cálculo — el frontend consume esto
   * en vez de reimplementar la división, el redondeo y el caso del día 31 por
   * su cuenta, que es como las dos implementaciones se desincronizarían.
   *
   * La fecha de venta real recién existe en la adhesión (T110): si el
   * frontend no manda una, se simula desde hoy.
   */
  simularCuotas(dto: SimularCuotasDto): CuotaGenerada[] {
    const precio = new Prisma.Decimal(dto.precio);

    return generarCuotas({
      precio,
      tipo: dto.tipo,
      anticipo_monto: this.resolverAnticipoMonto(dto, precio),
      cantidad_cuotas: dto.cantidad_cuotas ?? null,
      periodicidad: dto.periodicidad ?? null,
      fecha_venta: dto.fecha_venta ?? new Date(),
    });
  }

  /**
   * El anticipo resuelto a monto, que es lo único que entiende el motor de
   * cuotas. Es un valor derivado: no se guarda en la fila, que conserva lo
   * que cargó el usuario (porcentaje o monto). T110 vuelve a resolverlo al
   * congelar las condiciones de la VENTA.
   */
  private resolverAnticipoMonto(
    dto: {
      anticipo_porcentaje?: number | null;
      anticipo_monto?: number | null;
    },
    precio: Prisma.Decimal,
  ): Prisma.Decimal {
    if (dto.anticipo_monto !== undefined && dto.anticipo_monto !== null) {
      return new Prisma.Decimal(dto.anticipo_monto);
    }

    // En CONTADO el DTO ya normalizó el porcentaje a 100, así que el monto
    // resuelto termina siendo el precio completo.
    return precio
      .mul(new Prisma.Decimal(dto.anticipo_porcentaje ?? 0))
      .div(100)
      .toDecimalPlaces(DECIMALES);
  }

  /**
   * Porcentaje de ganancia que queda implícito cuando Comercialización
   * escribe el precio final a mano en vez de usar la ayuda de cálculo del
   * formulario: `(precio - costo) / costo * 100`.
   *
   * Solo se calcula si no vinieron `porcentaje_ganancia` ni `margen` — si
   * vinieron, el dato real es el que cargó el usuario. Es de solo lectura:
   * las columnas quedan en 0 por el default de Prisma.
   *
   * Mismo cálculo para el alta y para la edición: el `dto` solo necesita
   * traer estos dos campos, así que le sirve tanto a `CreatePlanPagoDto`
   * (los dos opcionales) como a `UpdatePlanPagoDto` (idem).
   */
  private calcularGananciaImplicita(
    dto: { porcentaje_ganancia?: number; margen?: number },
    precio: Prisma.Decimal,
    costo: Prisma.Decimal,
  ): Prisma.Decimal | null {
    if (dto.porcentaje_ganancia !== undefined || dto.margen !== undefined) {
      return null;
    }

    return porcentajeGananciaSobreCosto(precio, costo);
  }
}
