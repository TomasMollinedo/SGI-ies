import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  EstadoComercial,
  ModalidadPago,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { DECIMALES } from '../../../common/constantes/decimales';
import { PlazoFinanciacionService } from '../plazo-financiacion/plazo-financiacion.service';
import { montoAnticipoDesdePorcentaje } from '../common/anticipo';
import { PlanPagoCalculado, calcularPlanPago } from '../plan-pago/motor-cuotas';
import { SimularVentaDto } from './dto/simular-venta.dto';

/** Decimales con los que se informa la tasa mensual (ej. 2,0000 %). */
const DECIMALES_TASA_MENSUAL = 4;

/** El plazo elegido, tal como está vigente al simular. */
export interface PlazoSimulado {
  id_plazo_financiacion: number;
  codigo: string;
  cantidad_cuotas: number;
  tasa_nominal_anual: Prisma.Decimal;
}

/**
 * La simulación sin formatear: los importes como `Prisma.Decimal`. Es lo que
 * usa la confirmación de la venta (T158) para volver a calcular y comparar
 * contra lo que se le mostró al cliente.
 */
export interface SimulacionVenta extends PlanPagoCalculado {
  FK_publicacion: number;
  modalidad: ModalidadPago;
  fecha_venta: Date;
  precio_lista: Prisma.Decimal;
  anticipo_monto: Prisma.Decimal;
  anticipo_porcentaje: Prisma.Decimal;
  /** `null` en CONTADO. */
  plazo: PlazoSimulado | null;
}

/**
 * Simulación del plan de pago de una venta presencial (HU-27): calcula con el
 * sistema francés, sin guardar nada, lo que se está acordando con el cliente.
 * El precio de lista y la TNA se leen vigentes de la base: nunca viajan en el
 * body.
 *
 * Aparte de `VentaService` a propósito: no escribe nada, y la confirmación
 * (T158) la reutiliza para revalidar que el precio y la tasa no hayan
 * cambiado entre la simulación y la firma.
 */
@Injectable()
export class VentaSimulacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plazos: PlazoFinanciacionService,
  ) {}

  /** Simulación lista para la respuesta HTTP (ver `SimulacionVentaResponseDto`). */
  async simular(dto: SimularVentaDto) {
    return this.mapear(await this.calcular(dto));
  }

  /**
   * Valida y calcula la simulación, sin formatear.
   *
   * - La publicación tiene que existir, estar vigente y Disponible (que por
   *   definición ya tiene precio de lista).
   * - CONTADO: una única cuota 0 por el precio de lista, sin interés.
   * - FINANCIADO: el plazo tiene que estar activo; sin ningún plazo activo
   *   solo se admite contado (HU-32). El anticipo, en monto o en porcentaje,
   *   tiene que ser mayor a 0 y menor al precio; se calcula el otro valor.
   *
   * `fechaVenta` es hoy por defecto: la fecha de una venta es la del día en
   * que se confirma y no es editable.
   *
   * `cliente` es la transacción de quien llama, si la hay: la confirmación de
   * la venta (T158) recalcula dentro de su propia `$transaction`, después de
   * bloquear la publicación, para que el precio que compara sea el mismo que
   * guarda. Simular, sin transacción, usa el cliente común.
   */
  async calcular(
    dto: SimularVentaDto,
    fechaVenta: Date = new Date(),
    cliente: Prisma.TransactionClient = this.prisma,
  ): Promise<SimulacionVenta> {
    const precioLista = await this.buscarPrecioListaDisponible(
      dto.FK_publicacion,
      cliente,
    );

    if (dto.modalidad === ModalidadPago.CONTADO) {
      return {
        FK_publicacion: dto.FK_publicacion,
        modalidad: ModalidadPago.CONTADO,
        fecha_venta: fechaVenta,
        precio_lista: precioLista,
        anticipo_monto: precioLista,
        anticipo_porcentaje: new Prisma.Decimal(100),
        plazo: null,
        ...calcularPlanPago({
          precio: precioLista,
          tipo: ModalidadPago.CONTADO,
          anticipo_monto: precioLista,
          cantidad_cuotas: null,
          tasa_nominal_anual: null,
          fecha_venta: fechaVenta,
        }),
      };
    }

    // El DTO ya exige plazo y uno de los dos anticipos en FINANCIADO.
    const plazo = await this.buscarPlazoActivo(dto.FK_plazo_financiacion!);
    const { monto, porcentaje } = this.resolverAnticipo(dto, precioLista);

    return {
      FK_publicacion: dto.FK_publicacion,
      modalidad: ModalidadPago.FINANCIADO,
      fecha_venta: fechaVenta,
      precio_lista: precioLista,
      anticipo_monto: monto,
      anticipo_porcentaje: porcentaje,
      plazo,
      ...calcularPlanPago({
        precio: precioLista,
        tipo: ModalidadPago.FINANCIADO,
        anticipo_monto: monto,
        cantidad_cuotas: plazo.cantidad_cuotas,
        tasa_nominal_anual: plazo.tasa_nominal_anual,
        fecha_venta: fechaVenta,
      }),
    };
  }

  /**
   * Precio de lista de una publicación vigente y Disponible. Una publicación
   * Disponible siempre lo tiene (definirlo es lo que la pasa a Disponible,
   * T133): si falta es un dato inconsistente, no un error del usuario.
   */
  private async buscarPrecioListaDisponible(
    idPublicacion: number,
    cliente: Prisma.TransactionClient,
  ): Promise<Prisma.Decimal> {
    const publicacion = await cliente.pUBLICACIONUNIDAD.findUnique({
      where: { id_publicacion: idPublicacion },
      select: { vigente: true, estado_comercial: true, precio_lista: true },
    });
    if (!publicacion || !publicacion.vigente) {
      throw new NotFoundException(
        `No existe una publicación vigente con id ${idPublicacion}`,
      );
    }
    if (publicacion.estado_comercial !== EstadoComercial.DISPONIBLE) {
      throw new ConflictException('La unidad no está disponible para la venta');
    }
    if (publicacion.precio_lista === null) {
      throw new InternalServerErrorException(
        `La publicación ${idPublicacion} está Disponible sin precio de lista`,
      );
    }

    return publicacion.precio_lista;
  }

  /**
   * El plazo tiene que existir (404, lo resuelve T126) y estar activo. Si
   * está dado de baja, el mensaje distingue si queda algún otro plazo activo
   * o si la venta solo puede ser de contado.
   */
  private async buscarPlazoActivo(idPlazo: number): Promise<PlazoSimulado> {
    const plazo = await this.plazos.findOne(idPlazo);

    if (!plazo.estado) {
      const plazosActivos = await this.plazos.listarCatalogo();
      throw new ConflictException(
        plazosActivos.length === 0
          ? 'No hay plazos de financiación activos: la venta solo puede ser de contado'
          : `El plazo de financiación ${plazo.codigo} está dado de baja: elegí un plazo activo`,
      );
    }

    return {
      id_plazo_financiacion: plazo.id_plazo_financiacion,
      codigo: plazo.codigo,
      cantidad_cuotas: plazo.cantidad_cuotas,
      tasa_nominal_anual: plazo.tasa_nominal_anual,
    };
  }

  /**
   * El anticipo en monto y en porcentaje del precio de lista: se calcula el
   * que no vino. Los dos se redondean a dos decimales; el que manda para el
   * cálculo de las cuotas es siempre el monto.
   *
   * Tiene que quedar mayor a 0 y menor al precio: el DTO ya lo asegura para
   * el porcentaje, pero un monto solo se puede comparar acá, contra el
   * precio, y un porcentaje muy chico sobre un precio bajo podría
   * redondear a 0.
   */
  private resolverAnticipo(
    dto: SimularVentaDto,
    precioLista: Prisma.Decimal,
  ): { monto: Prisma.Decimal; porcentaje: Prisma.Decimal } {
    let monto: Prisma.Decimal;
    let porcentaje: Prisma.Decimal;

    if (dto.anticipo_monto !== undefined && dto.anticipo_monto !== null) {
      monto = new Prisma.Decimal(dto.anticipo_monto);
      if (monto.greaterThanOrEqualTo(precioLista)) {
        throw new BadRequestException(
          `El anticipo debe ser menor al precio de lista (${precioLista.toFixed(DECIMALES)})`,
        );
      }
      porcentaje = monto.div(precioLista).mul(100).toDecimalPlaces(DECIMALES);
    } else {
      porcentaje = new Prisma.Decimal(dto.anticipo_porcentaje!);
      monto = montoAnticipoDesdePorcentaje(precioLista, porcentaje);
    }

    if (!monto.greaterThan(0)) {
      throw new BadRequestException('El anticipo debe ser mayor a 0');
    }

    return { monto, porcentaje };
  }

  /**
   * La simulación con los importes como strings de decimales fijos (ver
   * `SimulacionVentaResponseDto`). Pública porque la confirmación (T158) la
   * devuelve recalculada cuando el precio o la TNA cambiaron.
   */
  mapear(simulacion: SimulacionVenta) {
    const plazo = simulacion.plazo;

    return {
      FK_publicacion: simulacion.FK_publicacion,
      modalidad: simulacion.modalidad,
      fecha_venta: simulacion.fecha_venta,
      precio_lista: simulacion.precio_lista.toFixed(DECIMALES),
      anticipo_monto: simulacion.anticipo_monto.toFixed(DECIMALES),
      anticipo_porcentaje: simulacion.anticipo_porcentaje.toFixed(DECIMALES),
      saldo_financiado: simulacion.saldo_financiado.toFixed(DECIMALES),
      plazo:
        plazo === null
          ? null
          : {
              id_plazo_financiacion: plazo.id_plazo_financiacion,
              codigo: plazo.codigo,
              cantidad_cuotas: plazo.cantidad_cuotas,
              tasa_nominal_anual: plazo.tasa_nominal_anual.toFixed(DECIMALES),
            },
      tasa_mensual:
        simulacion.tasa_mensual?.toFixed(DECIMALES_TASA_MENSUAL) ?? null,
      valor_cuota: simulacion.valor_cuota?.toFixed(DECIMALES) ?? null,
      total_intereses: simulacion.total_intereses.toFixed(DECIMALES),
      total_a_pagar: simulacion.total_a_pagar.toFixed(DECIMALES),
      cuotas: simulacion.cuotas.map((cuota) => ({
        numero: cuota.numero,
        fecha_vencimiento: cuota.fecha_vencimiento,
        importe_capital: cuota.importe_capital.toFixed(DECIMALES),
        importe_interes: cuota.importe_interes.toFixed(DECIMALES),
        importe: cuota.importe.toFixed(DECIMALES),
        saldo_capital: cuota.saldo_capital.toFixed(DECIMALES),
      })),
    };
  }
}
