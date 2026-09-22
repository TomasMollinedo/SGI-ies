import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoComercial } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { PublicacionService } from '../publicacion/publicacion.service';
import { CreatePlanPagoDto } from './dto/create-plan-pago.dto';
import { UpdatePlanPagoDto } from './dto/update-plan-pago.dto';
import { QueryPlanPagoDto } from './dto/query-plan-pago.dto';
import { SimularCuotasDto } from './dto/simular-cuotas.dto';
import { CuotaGenerada, generarCuotas } from './motor-cuotas';

/** Decimales de todo importe y porcentaje, igual que las columnas del schema. */
const DECIMALES = 2;

@Injectable()
export class PlanPagoService {
  constructor(
    private readonly prisma: PrismaService,
    /**
     * Solo por `transicionarEstadoComercial`: ese método recibe el `tx` del
     * llamador y nunca abre transacción propia, así que el cambio de estado
     * de la publicación viaja dentro de la misma `$transaction` que el alta o
     * la edición del plan. No se duplica acá ninguna regla de transiciones.
     */
    private readonly publicaciones: PublicacionService,
  ) {}

  /**
   * Alta de un plan de pago (HU-22).
   *
   * El plan nace activo por el `@default(true)` de PLANPAGO. Si es el primer
   * plan activo de una publicación EN_PREPARACION, la publicación pasa a
   * DISPONIBLE en la misma transacción: sin ningún plan no hay nada que el
   * cliente pueda comprar.
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
    const warning = this.warningPrecioMenorAlCosto(precio, costo);
    const porcentajeGananciaImplicito = this.calcularGananciaImplicita(
      dto,
      precio,
      costo,
    );

    const plan = await this.prisma.$transaction(async (tx) => {
      const creado = await tx.pLANPAGO.create({
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
          periodicidad:
            dto.periodicidad === undefined ? null : dto.periodicidad,
          FK_usuario_creador: usuarioId,
          FK_usuario_actualizador: usuarioId,
        },
      });

      // Incluye al recién creado, porque corre dentro de la transacción.
      const planesActivos = await tx.pLANPAGO.count({
        where: { FK_publicacion: dto.FK_publicacion, estado: true },
      });

      if (
        planesActivos === 1 &&
        publicacion.estado_comercial === EstadoComercial.EN_PREPARACION
      ) {
        await this.publicaciones.transicionarEstadoComercial(
          tx,
          dto.FK_publicacion,
          EstadoComercial.EN_PREPARACION,
          EstadoComercial.DISPONIBLE,
          usuarioId,
        );
      }

      return creado;
    });

    return {
      ...plan,
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
   * El cambio de `estado` puede arrastrar a la publicación: al inactivar el
   * último plan activo vuelve a EN_PREPARACION, y al reactivar el primero
   * vuelve a DISPONIBLE — siempre en la misma transacción que el update.
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
    const plan = await this.prisma.pLANPAGO.findUnique({
      where: { id_plan_pago: id },
      select: {
        id_plan_pago: true,
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
        : this.warningPrecioMenorAlCosto(precioNuevo, costo);
    const porcentajeGananciaImplicito =
      precioNuevo === null
        ? null
        : this.calcularGananciaImplicita(dto, precioNuevo, costo);

    const cambiaEstado = dto.estado !== undefined && dto.estado !== plan.estado;

    const actualizado = await this.prisma.$transaction(async (tx) => {
      const filaActualizada = await tx.pLANPAGO.update({
        where: { id_plan_pago: id },
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

      if (cambiaEstado) {
        await this.sincronizarEstadoPublicacion(
          tx,
          plan.FK_publicacion,
          estadoComercial,
          usuarioId,
        );
      }

      return filaActualizada;
    });

    return {
      ...actualizado,
      warning,
      porcentaje_ganancia_implicito: porcentajeGananciaImplicito,
    };
  }

  /**
   * Detalle de un plan puntual, para la pantalla interna de Comercialización
   * (incluye el `estado`, que el catálogo público nunca vería).
   */
  async findOne(id: number) {
    const plan = await this.prisma.pLANPAGO.findUnique({
      where: { id_plan_pago: id },
    });
    if (!plan) {
      throw new NotFoundException(`No existe un plan de pago con id ${id}`);
    }

    return plan;
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

    return this.prisma.pLANPAGO.findMany({
      where: {
        FK_publicacion,
        ...(estado !== 'todos' && { estado }),
      },
      orderBy: { id_plan_pago: 'asc' },
    });
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
   * Alinea el `estado_comercial` de la publicación con la cantidad de planes
   * activos que quedaron después del update.
   *
   * `transicionarEstadoComercial` NO contempla el caso "no corresponde hacer
   * nada": valida el par desde/hacia contra su propio mapa y tira un `Error`
   * de programación si no está permitido. Por eso el filtro de
   * EN_PLAN_DE_PAGO / VENDIDA se hace acá, ANTES de llamarla: inactivar un
   * plan de una publicación que ya tiene una venta no cambia nada.
   */
  private async sincronizarEstadoPublicacion(
    tx: Prisma.TransactionClient,
    idPublicacion: number,
    estadoComercial: EstadoComercial,
    usuarioId: number,
  ): Promise<void> {
    const planesActivos = await tx.pLANPAGO.count({
      where: { FK_publicacion: idPublicacion, estado: true },
    });

    if (planesActivos === 0 && estadoComercial === EstadoComercial.DISPONIBLE) {
      await this.publicaciones.transicionarEstadoComercial(
        tx,
        idPublicacion,
        EstadoComercial.DISPONIBLE,
        EstadoComercial.EN_PREPARACION,
        usuarioId,
      );
      return;
    }

    if (
      planesActivos === 1 &&
      estadoComercial === EstadoComercial.EN_PREPARACION
    ) {
      await this.publicaciones.transicionarEstadoComercial(
        tx,
        idPublicacion,
        EstadoComercial.EN_PREPARACION,
        EstadoComercial.DISPONIBLE,
        usuarioId,
      );
    }
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
   * Vender por debajo del costo se permite (puede ser una decisión comercial
   * deliberada), pero la respuesta lo avisa. No se guarda en ninguna columna:
   * es un dato del momento, y tanto el precio como el costo pueden cambiar.
   */
  private warningPrecioMenorAlCosto(
    precio: Prisma.Decimal,
    costo: Prisma.Decimal,
  ): string | null {
    if (!precio.lessThan(costo)) {
      return null;
    }

    return `El precio del plan (${precio.toFixed(DECIMALES)}) es menor al costo de la unidad (${costo.toFixed(DECIMALES)}).`;
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
    // Una unidad con costo 0 no tiene porcentaje de ganancia definido
    // (sería una división por cero, que Decimal rechaza tirando error).
    if (costo.isZero()) {
      return null;
    }

    return precio.sub(costo).div(costo).mul(100).toDecimalPlaces(DECIMALES);
  }
}
