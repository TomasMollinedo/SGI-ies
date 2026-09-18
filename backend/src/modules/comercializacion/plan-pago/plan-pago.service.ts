import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoComercial } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { PublicacionesService } from '../publicaciones/publicaciones.service';
import { CreatePlanPagoDto } from './dto/create-plan-pago.dto';
import { UpdatePlanPagoDto } from './dto/update-plan-pago.dto';

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
    private readonly publicaciones: PublicacionesService,
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
   */
  async create(dto: CreatePlanPagoDto, usuarioId: number) {
    const publicacion = await this.prisma.pUBLICACIONUNIDAD.findUnique({
      where: { id_publicacion: dto.FK_publicacion },
      select: {
        estado_comercial: true,
        unidadFuncional: { select: { costo: true } },
      },
    });
    if (!publicacion) {
      throw new NotFoundException(
        `No existe una publicación con id ${dto.FK_publicacion}`,
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

    const warning =
      dto.precio === undefined
        ? null
        : this.warningPrecioMenorAlCosto(
            new Prisma.Decimal(dto.precio),
            plan.publicacion.unidadFuncional.costo,
          );

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

    return { ...actualizado, warning };
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
    dto: CreatePlanPagoDto,
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
   */
  private calcularGananciaImplicita(
    dto: CreatePlanPagoDto,
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
