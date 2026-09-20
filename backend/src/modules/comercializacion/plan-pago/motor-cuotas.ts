import { Prisma } from '../../../../generated/prisma/client';
import { Periodicidad, TipoPlanPago } from '../../../../generated/prisma/enums';

/**
 * MOTOR DE CUOTAS — helper puro de HU-22.
 *
 * A propósito no importa `PrismaService` ni toca la base: recibe las
 * condiciones ya resueltas y devuelve el cronograma que habría que generar.
 * Eso es lo que permite que T110 (adhesión del cliente al plan, HU-27) lo
 * reuse tal cual dentro de su transacción, pasándole las condiciones
 * congeladas de la VENTA en vez de las del PLANPAGO.
 *
 * `Prisma.Decimal` (decimal.js) se importa solo como implementación de
 * números decimales — ningún cálculo de dinero usa `number`, que arrastraría
 * error de punto flotante en importes de millones.
 */

/** Decimales de todo importe de dinero: `CUOTA.importe` es `Decimal(14, 2)`. */
const DECIMALES = 2;

/**
 * Cuántos meses avanza cada período. Todas las periodicidades del enum son
 * múltiplos de un mes, así que el cálculo de vencimientos es uno solo.
 */
const MESES_POR_PERIODO: Record<Periodicidad, number> = {
  MENSUAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
};

/**
 * Condiciones de las que depende el cronograma. `anticipo_monto` llega ya
 * resuelto a un importe: si el plan se cargó con `anticipo_porcentaje`, la
 * conversión a monto la hace el service antes de llamar acá (el motor no
 * conoce esa dualidad).
 */
export interface CondicionesPlanPago {
  precio: Prisma.Decimal;
  tipo: TipoPlanPago;
  /** En CONTADO se ignora: el anticipo es el 100% del precio. */
  anticipo_monto: Prisma.Decimal;
  /** Solo FINANCIADO. Son las cuotas posteriores al anticipo (la 0 no cuenta). */
  cantidad_cuotas: number | null;
  /** Solo FINANCIADO. */
  periodicidad: Periodicidad | null;
  /** Fecha de la venta/adhesión: de acá cuelgan todos los vencimientos. */
  fecha_venta: Date;
}

/** Una fila del cronograma, con la forma que espera `CUOTA`. */
export interface CuotaGenerada {
  /** 0 = anticipo, o el 100% del precio en un plan CONTADO. */
  numero: number;
  importe: Prisma.Decimal;
  fecha_vencimiento: Date;
}

/**
 * Suma `meses` meses a una fecha, en UTC (mismo criterio que
 * `calcularDiasVencido`: nada de dinero ni de vencimientos depende del huso
 * horario del servidor).
 *
 * Caso borde del día 29/30/31: si el día no existe en el mes destino, la
 * cuota vence el ÚLTIMO día de ese mes (venta el 31/01 + 1 mes = 28/02, o
 * 29/02 en año bisiesto), en vez de desbordar al 03/03 como haría
 * `setMonth` a secas. Es la regla que documenta `CUOTA.fecha_vencimiento` en
 * `schema.prisma`.
 */
function sumarMeses(fecha: Date, meses: number): Date {
  const anio = fecha.getUTCFullYear();
  const mes = fecha.getUTCMonth();
  const dia = fecha.getUTCDate();

  // El día 0 de un mes es el último día del mes anterior: pedir el día 0 del
  // mes siguiente al destino devuelve cuántos días tiene el mes destino.
  const ultimoDiaDelMesDestino = new Date(
    Date.UTC(anio, mes + meses + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      anio,
      mes + meses,
      Math.min(dia, ultimoDiaDelMesDestino),
      fecha.getUTCHours(),
      fecha.getUTCMinutes(),
      fecha.getUTCSeconds(),
      fecha.getUTCMilliseconds(),
    ),
  );
}

/**
 * Red de seguridad del reparto: el total repartido tiene que dar exactamente
 * el precio del plan, ni un centavo de más ni de menos. Si esto saltara
 * sería un bug del motor (no un dato inválido del usuario), por eso es un
 * `Error` pelado y no una excepción de Nest.
 */
function verificarSumaExacta(
  cuotas: CuotaGenerada[],
  precio: Prisma.Decimal,
): void {
  const suma = cuotas.reduce(
    (acumulado, cuota) => acumulado.add(cuota.importe),
    new Prisma.Decimal(0),
  );

  if (!suma.equals(precio)) {
    throw new Error(
      `El reparto de cuotas no cierra: suma ${suma.toFixed(DECIMALES)} contra un precio de ${precio.toFixed(DECIMALES)}`,
    );
  }
}

/**
 * Genera el cronograma completo de cuotas de un plan de pago.
 *
 * - CONTADO: una única cuota número 0 por el precio total, que vence el día
 *   de la venta.
 * - FINANCIADO: cuota 0 por el anticipo (vence el día de la venta) y cuotas
 *   1..N por el resto repartido en partes iguales, cada una venciendo a N
 *   períodos de la fecha de venta. La diferencia de redondeo del reparto se
 *   ajusta SOLO en la última cuota, así la suma de todo el cronograma da
 *   exactamente `precio`.
 *
 * Las validaciones de forma (que FINANCIADO traiga cuotas y periodicidad,
 * que el anticipo no supere el precio, etc.) son del DTO y del service: acá
 * quedan como `Error` defensivo porque el motor también se usa desde T110,
 * donde los datos vienen de la VENTA y no del body.
 */
export function generarCuotas(
  condiciones: CondicionesPlanPago,
): CuotaGenerada[] {
  const { precio, tipo, fecha_venta } = condiciones;

  if (tipo === TipoPlanPago.CONTADO) {
    const cuotas: CuotaGenerada[] = [
      {
        numero: 0,
        importe: new Prisma.Decimal(precio),
        fecha_vencimiento: sumarMeses(fecha_venta, 0),
      },
    ];

    verificarSumaExacta(cuotas, precio);
    return cuotas;
  }

  const { cantidad_cuotas: cantidadCuotas, periodicidad } = condiciones;

  if (cantidadCuotas === null || cantidadCuotas < 1) {
    throw new Error(
      'Un plan FINANCIADO necesita una cantidad de cuotas mayor o igual a 1',
    );
  }
  if (periodicidad === null) {
    throw new Error('Un plan FINANCIADO necesita una periodicidad');
  }

  const anticipo = new Prisma.Decimal(condiciones.anticipo_monto);
  const aFinanciar = precio.sub(anticipo);
  const importeCuota = aFinanciar
    .div(cantidadCuotas)
    .toDecimalPlaces(DECIMALES);
  const mesesPorPeriodo = MESES_POR_PERIODO[periodicidad];

  const cuotas: CuotaGenerada[] = [
    {
      numero: 0,
      importe: anticipo,
      fecha_vencimiento: sumarMeses(fecha_venta, 0),
    },
  ];

  for (let numero = 1; numero < cantidadCuotas; numero++) {
    cuotas.push({
      numero,
      importe: importeCuota,
      fecha_vencimiento: sumarMeses(fecha_venta, mesesPorPeriodo * numero),
    });
  }

  // La última se calcula por diferencia, no repitiendo `importeCuota`: así el
  // sobrante o faltante del redondeo cae entero acá y el cronograma cierra.
  cuotas.push({
    numero: cantidadCuotas,
    importe: aFinanciar.sub(importeCuota.mul(cantidadCuotas - 1)),
    fecha_vencimiento: sumarMeses(
      fecha_venta,
      mesesPorPeriodo * cantidadCuotas,
    ),
  });

  verificarSumaExacta(cuotas, precio);
  return cuotas;
}
