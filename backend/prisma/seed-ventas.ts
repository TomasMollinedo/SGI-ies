import { Prisma, PrismaClient } from '../generated/prisma/client';
import {
  EstadoCobro,
  EstadoComercial,
  EstadoCuota,
  EstadoVenta,
  ModalidadPago,
  OrigenCobro,
  Periodicidad,
} from '../generated/prisma/enums';
import { calcularPlanPago } from '../src/modules/comercializacion/plan-pago/motor-cuotas';

/**
 * Helper compartido por los seeds que siembran ventas. No es un seed: no se
 * ejecuta solo.
 *
 * Deja cada venta como la dejan los servicios del Sprint 4:
 * - el plan de pago lo calcula `calcularPlanPago` (sistema francés, T132),
 *   el mismo motor que usa la API: nada de cuotas escritas a mano;
 * - el PLANPAGO congela modalidad, precio, anticipo, plazo, cuotas, TNA y
 *   valor de cuota (T158);
 * - cada cuota lleva las dos FK (`FK_venta` y `FK_plan_pago`) hasta T159;
 * - cada pago es un COBRO con su DETALLECOBRO, que descuenta el saldo de la
 *   cuota igual que `CobroService` (y uno ANULADO deja la foto del saldo
 *   pero no lo descuenta, como después de `CobroService.anular`). Ninguna
 *   cuota queda PAGADA sin el cobro que la pagó: el tablero (T152) suma
 *   cobros, no cuotas.
 *
 * Mientras T158 no esté en `testing`, la venta sigue escribiendo las
 * columnas legado de VENTA (`FK_plan_ejemplo` y `*_congelado`): el listado de
 * ventas de antes de T158 las necesita. No molestan después; las elimina
 * T159.
 */

/** El plazo elegido, con lo que el plan copia de él. */
export interface PlazoVentaSeed {
  id_plazo_financiacion: number;
  cantidad_cuotas: number;
  tasa_nominal_anual: number;
}

/**
 * Un pago imputado a una cuota. Sin `importe`, paga todo el saldo que le
 * queda; sin `fecha`, se cobra el día que vence la cuota. Se aplican en el
 * orden en que vienen.
 */
export interface PagoCuotaSeed {
  numero_cuota: number;
  importe?: number;
  fecha?: Date;
  origen: OrigenCobro;
  FK_forma_pago: number;
  numero_referencia: string | null;
  /** Cobro anulado: queda la foto del saldo, pero no lo descuenta. */
  anulado?: { motivo: string };
}

export interface VentaSeed {
  FK_cliente: number;
  FK_publicacion: number;
  /** Columna legado (T159): el plan de ejemplo de la publicación. */
  FK_plan_ejemplo: number;
  fecha_venta: Date;
  precio: number;
  modalidad: ModalidadPago;
  /** Solo FINANCIADO. */
  anticipo_porcentaje?: number;
  /** Solo FINANCIADO. */
  plazo?: PlazoVentaSeed;
  pagos?: PagoCuotaSeed[];
  /** Venta cancelada: cuotas ANULADA y plan conservado. Sin pagos. */
  cancelacion?: { fecha: Date; motivo: string };
}

/** Estado de una cuota según su saldo, igual que `CobroService`. */
function estadoSegunSaldo(
  saldo: Prisma.Decimal,
  importe: Prisma.Decimal,
): EstadoCuota {
  if (saldo.isZero()) return EstadoCuota.PAGADA;
  return saldo.equals(importe) ? EstadoCuota.PENDIENTE : EstadoCuota.PARCIAL;
}

/**
 * Crea la venta, su plan de pago, el cronograma y los cobros en una sola
 * transacción. Idempotente por publicación: si ya tiene una venta, la
 * devuelve sin tocar nada.
 *
 * Verifica que el estado comercial sembrado en la publicación sea coherente
 * con la venta (Vendida si no queda saldo, En Plan de Pago si queda,
 * Disponible si se canceló): si no, el seed falla, porque los servicios
 * nunca dejarían esa combinación.
 */
export async function sembrarVenta(
  prisma: PrismaClient,
  datos: VentaSeed,
  usuarioId: number,
) {
  const existente = await prisma.vENTA.findFirst({
    where: { FK_publicacion: datos.FK_publicacion },
  });
  if (existente) return existente;

  const precio = new Prisma.Decimal(datos.precio);
  const esFinanciado = datos.modalidad === ModalidadPago.FINANCIADO;
  if (esFinanciado && (!datos.plazo || !datos.anticipo_porcentaje)) {
    throw new Error(
      `La venta de la publicación ${datos.FK_publicacion} es FINANCIADA y le falta plazo o anticipo`,
    );
  }
  if (datos.cancelacion && datos.pagos?.length) {
    throw new Error(
      `La venta de la publicación ${datos.FK_publicacion} está cancelada: no puede tener cobros confirmados`,
    );
  }

  // Misma cuenta que la simulación de la venta: el porcentaje del precio,
  // redondeado a centavos.
  const anticipo = esFinanciado
    ? precio.mul(datos.anticipo_porcentaje!).div(100).toDecimalPlaces(2)
    : precio;
  const tna = esFinanciado
    ? new Prisma.Decimal(datos.plazo!.tasa_nominal_anual)
    : null;

  const plan = calcularPlanPago({
    precio,
    tipo: datos.modalidad,
    anticipo_monto: anticipo,
    cantidad_cuotas: esFinanciado ? datos.plazo!.cantidad_cuotas : null,
    tasa_nominal_anual: tna,
    fecha_venta: datos.fecha_venta,
  });

  return prisma.$transaction(async (tx) => {
    const venta = await tx.vENTA.create({
      data: {
        FK_cliente: datos.FK_cliente,
        FK_publicacion: datos.FK_publicacion,
        fecha_venta: datos.fecha_venta,
        estado: datos.cancelacion ? EstadoVenta.CANCELADA : EstadoVenta.VIGENTE,
        motivo_cancelacion: datos.cancelacion?.motivo ?? null,
        fecha_cancelacion: datos.cancelacion?.fecha ?? null,
        // Legado (T159), ver el comentario del archivo.
        FK_plan_ejemplo: datos.FK_plan_ejemplo,
        precio_congelado: precio,
        anticipo_congelado: anticipo,
        tipo_plan_congelado: datos.modalidad,
        cantidad_cuotas_congelada: esFinanciado
          ? datos.plazo!.cantidad_cuotas
          : 1,
        periodicidad_congelada: esFinanciado ? Periodicidad.MENSUAL : null,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
      },
    });

    const planPago = await tx.pLANPAGO.create({
      data: {
        FK_venta: venta.id_venta,
        FK_plazo_financiacion: datos.plazo?.id_plazo_financiacion ?? null,
        modalidad: datos.modalidad,
        precio_venta: precio,
        anticipo_monto: anticipo,
        cantidad_cuotas: esFinanciado ? datos.plazo!.cantidad_cuotas : null,
        tasa_nominal_anual: tna,
        valor_cuota: plan.valor_cuota,
        FK_usuario_creador: usuarioId,
      },
    });

    await tx.cUOTA.createMany({
      data: plan.cuotas.map((cuota) => ({
        FK_venta: venta.id_venta,
        FK_plan_pago: planPago.id_plan_pago,
        numero: cuota.numero,
        importe_capital: cuota.importe_capital,
        importe_interes: cuota.importe_interes,
        importe: cuota.importe,
        fecha_vencimiento: cuota.fecha_vencimiento,
        saldo_capital: cuota.saldo_capital,
        saldo_pendiente: cuota.importe,
        estado: datos.cancelacion ? EstadoCuota.ANULADA : EstadoCuota.PENDIENTE,
      })),
    });

    const cuotas = await tx.cUOTA.findMany({
      where: { FK_plan_pago: planPago.id_plan_pago },
      orderBy: { numero: 'asc' },
    });
    const cuotaPorNumero = new Map(cuotas.map((c) => [c.numero, c]));

    for (const pago of datos.pagos ?? []) {
      const cuota = cuotaPorNumero.get(pago.numero_cuota);
      if (!cuota) {
        throw new Error(
          `La venta de la publicación ${datos.FK_publicacion} no tiene cuota ${pago.numero_cuota}`,
        );
      }

      const saldoAnterior = cuota.saldo_pendiente;
      const imputado =
        pago.importe === undefined
          ? saldoAnterior
          : new Prisma.Decimal(pago.importe);
      if (imputado.greaterThan(saldoAnterior) || !imputado.greaterThan(0)) {
        throw new Error(
          `El pago a la cuota ${cuota.numero} de la publicación ${datos.FK_publicacion} supera su saldo o no es positivo`,
        );
      }
      const saldoPosterior = saldoAnterior.sub(imputado);
      const fechaCobro = pago.fecha ?? cuota.fecha_vencimiento;
      if (fechaCobro.getTime() > Date.now()) {
        throw new Error(
          `El pago a la cuota ${cuota.numero} de la publicación ${datos.FK_publicacion} quedaría con fecha futura`,
        );
      }

      await tx.cOBRO.create({
        data: {
          fecha_cobro: fechaCobro,
          FK_cliente: datos.FK_cliente,
          FK_forma_pago: pago.FK_forma_pago,
          numero_referencia: pago.numero_referencia,
          importe_total: imputado,
          origen: pago.origen,
          estado: pago.anulado ? EstadoCobro.ANULADO : EstadoCobro.CONFIRMADO,
          motivo_anulacion: pago.anulado?.motivo ?? null,
          FK_usuario_creador: usuarioId,
          FK_usuario_actualizador: usuarioId,
          detalles: {
            create: {
              FK_cuota: cuota.id_cuota,
              importe_imputado: imputado,
              saldo_anterior: saldoAnterior,
              saldo_posterior: saldoPosterior,
            },
          },
        },
      });

      // Anulado: la anulación ya restituyó lo que había descontado.
      if (pago.anulado) continue;

      const actualizada = await tx.cUOTA.update({
        where: { id_cuota: cuota.id_cuota },
        data: {
          saldo_pendiente: saldoPosterior,
          estado: estadoSegunSaldo(saldoPosterior, cuota.importe),
        },
      });
      cuotaPorNumero.set(cuota.numero, actualizada);
    }

    const saldoTotal = [...cuotaPorNumero.values()].reduce(
      (acumulado, cuota) => acumulado.add(cuota.saldo_pendiente),
      new Prisma.Decimal(0),
    );
    const publicacion = await tx.pUBLICACIONUNIDAD.findUniqueOrThrow({
      where: { id_publicacion: datos.FK_publicacion },
      select: { estado_comercial: true },
    });
    const esperado = datos.cancelacion
      ? EstadoComercial.DISPONIBLE
      : saldoTotal.isZero()
        ? EstadoComercial.VENDIDA
        : EstadoComercial.EN_PLAN_DE_PAGO;
    if (publicacion.estado_comercial !== esperado) {
      throw new Error(
        `La publicación ${datos.FK_publicacion} está sembrada como ${publicacion.estado_comercial}, pero con esta venta los servicios la dejarían ${esperado}`,
      );
    }

    return { venta, cuotas: [...cuotaPorNumero.values()] };
  });
}
