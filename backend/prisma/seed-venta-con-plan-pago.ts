import { Prisma, PrismaClient } from '../generated/prisma/client';
import {
  EstadoCuota,
  EstadoVenta,
  ModalidadPago,
  Periodicidad,
} from '../generated/prisma/enums';

/**
 * Helper compartido por los seeds que siembran ventas
 * (`seed-comercializacion.ts` y `seed-t112-cliente1.ts`). No es un seed: no
 * se ejecuta solo.
 *
 * Deja cada venta como la dejaría `VentaService.crear` desde T121: la VENTA
 * con sus columnas legado, su PLANPAGO (1 a 1) y cada CUOTA con las dos FK
 * (`FK_venta` y `FK_plan_pago`) y el desglose de capital, interés y saldo de
 * capital. Las ventas del Sprint 3 no tienen interés, así que el plan lleva
 * TNA 0 % (ver `desglosarSinInteres`). Las ventas con sistema francés real
 * las siembra T156.
 */

export interface CuotaSeed {
  numero: number;
  importe: number;
  fecha_vencimiento: Date;
  saldo_pendiente: number;
  estado: EstadoCuota;
}

export interface VentaSeed {
  FK_cliente: number;
  FK_publicacion: number;
  FK_plan_ejemplo: number;
  fecha_venta: Date;
  precio_congelado: number;
  anticipo_congelado: number;
  tipo_plan_congelado: ModalidadPago;
  cantidad_cuotas_congelada: number;
  periodicidad_congelada?: Periodicidad;
  /** Ordenadas por `numero`, y tienen que sumar exactamente el precio. */
  cuotas: CuotaSeed[];
}

/**
 * Desglose de un cronograma SIN interés (TNA 0 %): toda la cuota es capital y
 * el saldo de capital es el precio menos lo pagado hasta esa cuota inclusive.
 * Así la cuota 0 queda con el saldo a financiar y la última en 0.
 *
 * Las cuotas de un seed se escriben a mano (con su saldo pendiente y estado),
 * por eso no salen de `calcularPlanPago`: este helper solo les completa el
 * desglose que exige `CUOTA`.
 */
function desglosarSinInteres(cuotas: CuotaSeed[], precio: Prisma.Decimal) {
  let saldo = precio;

  return cuotas.map((cuota) => {
    const importe = new Prisma.Decimal(cuota.importe);
    saldo = saldo.sub(importe);

    return {
      numero: cuota.numero,
      fecha_vencimiento: cuota.fecha_vencimiento,
      importe,
      importe_capital: importe,
      importe_interes: new Prisma.Decimal(0),
      saldo_capital: saldo,
    };
  });
}

/**
 * Crea la venta, su plan de pago y sus cuotas en una sola transacción, y
 * devuelve la venta con las cuotas ya creadas (ordenadas por `numero`).
 * La idempotencia (no crearla dos veces) queda del lado de cada seed.
 */
export async function crearVentaConPlanPago(
  prisma: PrismaClient,
  datos: VentaSeed,
  usuarioId: number,
) {
  const precio = new Prisma.Decimal(datos.precio_congelado);

  const cuotas = desglosarSinInteres(datos.cuotas, precio);

  // Las cuotas de un seed se escriben a mano: si no suman el precio, el saldo
  // de capital de la última no daría 0 y el dato sembrado sería inválido.
  const saldoFinal = cuotas.at(-1)?.saldo_capital;
  if (saldoFinal === undefined || !saldoFinal.isZero()) {
    throw new Error(
      `Las cuotas de la venta de la publicación ${datos.FK_publicacion} no suman el precio (${precio.toFixed(2)})`,
    );
  }

  // Mismas reglas que `VentaService.crear`: en CONTADO el anticipo es el
  // precio completo y no hay cuotas, tasa ni valor de cuota; en FINANCIADO la
  // tasa es 0 y el valor de cuota es el importe de la cuota 1.
  const esFinanciado = datos.tipo_plan_congelado === ModalidadPago.FINANCIADO;

  return prisma.$transaction(async (tx) => {
    const { cuotas: _cuotas, ...ventaDatos } = datos;

    const venta = await tx.vENTA.create({
      data: {
        ...ventaDatos,
        estado: EstadoVenta.VIGENTE,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
        planPago: {
          create: {
            FK_plazo_financiacion: null,
            modalidad: datos.tipo_plan_congelado,
            precio_venta: precio,
            anticipo_monto: esFinanciado ? datos.anticipo_congelado : precio,
            cantidad_cuotas: esFinanciado
              ? datos.cantidad_cuotas_congelada
              : null,
            tasa_nominal_anual: esFinanciado ? 0 : null,
            valor_cuota: esFinanciado
              ? (cuotas.find((cuota) => cuota.numero === 1)?.importe ?? null)
              : null,
            FK_usuario_creador: usuarioId,
          },
        },
      },
      include: { planPago: true },
    });

    await tx.cUOTA.createMany({
      data: cuotas.map((cuota, indice) => ({
        FK_venta: venta.id_venta,
        FK_plan_pago: venta.planPago!.id_plan_pago,
        numero: cuota.numero,
        importe_capital: cuota.importe_capital,
        importe_interes: cuota.importe_interes,
        importe: cuota.importe,
        fecha_vencimiento: cuota.fecha_vencimiento,
        saldo_capital: cuota.saldo_capital,
        saldo_pendiente: datos.cuotas[indice].saldo_pendiente,
        estado: datos.cuotas[indice].estado,
      })),
    });

    return tx.vENTA.findUniqueOrThrow({
      where: { id_venta: venta.id_venta },
      include: { cuotas: { orderBy: { numero: 'asc' } } },
    });
  });
}
