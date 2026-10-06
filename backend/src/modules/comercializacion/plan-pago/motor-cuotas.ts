import { Prisma } from '../../../../generated/prisma/client';
import { ModalidadPago } from '../../../../generated/prisma/enums';
import { DECIMALES } from '../../../common/constantes/decimales';

/**
 * MOTOR DE CUOTAS — sistema francés (HU-27, HU-22, HU-25).
 *
 * Único lugar del backend que calcula un plan de pago: lo usan la venta
 * presencial (simulación y confirmación), los planes de ejemplo y el
 * simulador del catálogo. Si cada uno calculara por su cuenta, el cliente
 * podría ver en el catálogo una cuota distinta a la que después firma.
 *
 * A propósito no importa `PrismaService` ni toca la base: recibe las
 * condiciones ya resueltas y devuelve el cronograma con sus totales. Así se
 * puede usar dentro de una transacción (confirmar una venta) o fuera de
 * cualquier transacción (simular).
 *
 * `Prisma.Decimal` (decimal.js) se importa solo como implementación de
 * números decimales — ningún cálculo de dinero usa `number`, que arrastraría
 * error de punto flotante en importes de millones.
 */

/** Meses del año: la TNA se reparte en 12 tasas mensuales iguales. */
const MESES_POR_ANIO = 12;

/** Decimales con los que se informa la tasa mensual (ej. 2,0000 %). */
const DECIMALES_TASA_MENSUAL = 4;

/**
 * Condiciones de las que depende el plan. `anticipo_monto` llega ya resuelto
 * a un importe: si se cargó como porcentaje del precio, la conversión a monto
 * la hace el service antes de llamar acá (el motor no conoce esa dualidad).
 *
 * Todas las cuotas son mensuales (HU-32): no hay periodicidad.
 */
export interface CondicionesPlanPago {
  precio: Prisma.Decimal;
  tipo: ModalidadPago;
  /** En CONTADO se ignora: el anticipo es el 100% del precio. */
  anticipo_monto: Prisma.Decimal;
  /** Solo FINANCIADO. Son las cuotas posteriores al anticipo (la 0 no cuenta). */
  cantidad_cuotas: number | null;
  /**
   * Solo FINANCIADO. Tasa nominal anual del plazo, en porcentaje (24 = 24 %),
   * igual que `PLAZOFINANCIACION.tasa_nominal_anual`. 0 = sin interés.
   */
  tasa_nominal_anual: Prisma.Decimal | null;
  /** Fecha de la venta: de acá cuelgan todos los vencimientos. */
  fecha_venta: Date;
}

/** Una fila del cronograma, con la forma que guarda `CUOTA`. */
export interface CuotaGenerada {
  /** 0 = anticipo, o el 100% del precio en un plan CONTADO. */
  numero: number;
  fecha_vencimiento: Date;
  /** Lo que la cuota amortiza de la deuda. */
  importe_capital: Prisma.Decimal;
  /** Interés de la cuota: saldo de capital anterior × tasa mensual. */
  importe_interes: Prisma.Decimal;
  /** capital + interés: lo que paga el cliente. */
  importe: Prisma.Decimal;
  /** Deuda del plan después de pagar esta cuota (0 en la última). */
  saldo_capital: Prisma.Decimal;
}

/** El cronograma completo y los totales que muestran simulador, venta y perfil. */
export interface PlanPagoCalculado {
  cuotas: CuotaGenerada[];
  /** precio − anticipo; 0 en CONTADO. */
  saldo_financiado: Prisma.Decimal;
  /** TNA ÷ 12, en porcentaje y a 4 decimales; `null` en CONTADO. Solo informativa. */
  tasa_mensual: Prisma.Decimal | null;
  /** Cuota fija del sistema francés (la última puede diferir unos centavos); `null` en CONTADO. */
  valor_cuota: Prisma.Decimal | null;
  total_intereses: Prisma.Decimal;
  /** anticipo + suma de cuotas = precio + intereses. */
  total_a_pagar: Prisma.Decimal;
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
 * Valor de la cuota fija del sistema francés, a dos decimales:
 * `S × i / (1 − (1 + i)^−n)`. Con tasa 0 la fórmula divide por cero, y el
 * resultado correcto es el reparto en partes iguales: `S ÷ n`.
 */
function calcularValorCuota(
  saldoFinanciado: Prisma.Decimal,
  tasaMensual: Prisma.Decimal,
  cantidadCuotas: number,
): Prisma.Decimal {
  if (tasaMensual.isZero()) {
    return saldoFinanciado.div(cantidadCuotas).toDecimalPlaces(DECIMALES);
  }

  const factor = new Prisma.Decimal(1).sub(
    tasaMensual.add(1).pow(-cantidadCuotas),
  );
  return saldoFinanciado
    .mul(tasaMensual)
    .div(factor)
    .toDecimalPlaces(DECIMALES);
}

/**
 * Red de seguridad: lo amortizado entre todas las cuotas tiene que dar
 * exactamente el precio, ni un centavo de más ni de menos. Si esto saltara
 * sería un bug del motor (no un dato inválido del usuario), por eso es un
 * `Error` pelado y no una excepción de Nest.
 */
function verificarCapitalExacto(
  cuotas: CuotaGenerada[],
  precio: Prisma.Decimal,
): void {
  const capital = cuotas.reduce(
    (acumulado, cuota) => acumulado.add(cuota.importe_capital),
    new Prisma.Decimal(0),
  );

  if (!capital.equals(precio)) {
    throw new Error(
      `El cronograma no cierra: amortiza ${capital.toFixed(DECIMALES)} contra un precio de ${precio.toFixed(DECIMALES)}`,
    );
  }
}

/** Arma los totales a partir del cronograma ya calculado. */
function conTotales(
  cuotas: CuotaGenerada[],
  precio: Prisma.Decimal,
  datos: Pick<
    PlanPagoCalculado,
    'saldo_financiado' | 'tasa_mensual' | 'valor_cuota'
  >,
): PlanPagoCalculado {
  verificarCapitalExacto(cuotas, precio);

  const totalIntereses = cuotas.reduce(
    (acumulado, cuota) => acumulado.add(cuota.importe_interes),
    new Prisma.Decimal(0),
  );

  return {
    cuotas,
    ...datos,
    total_intereses: totalIntereses,
    total_a_pagar: precio.add(totalIntereses),
  };
}

/**
 * Calcula el plan de pago completo: cronograma de cuotas y totales.
 *
 * - CONTADO: una única cuota número 0 por el precio total, sin interés, que
 *   vence el día de la venta.
 * - FINANCIADO: cuota 0 por el anticipo (sin interés, vence el día de la
 *   venta) y cuotas 1..N por sistema francés sobre el saldo a financiar. La
 *   cuota k vence a k meses de la fecha de venta. Por cuota:
 *   interés = saldo anterior × i (a dos decimales), capital = cuota − interés.
 *   La última amortiza exactamente el saldo que queda, así el saldo de capital
 *   cierra en 0 aunque su importe difiera unos centavos de las demás.
 *
 * `i` (TNA ÷ 12) se usa sin redondear: solo se redondean la cuota y cada
 * interés, que son los importes que se cobran.
 *
 * Las validaciones de forma (que FINANCIADO traiga cuotas y tasa, que el
 * anticipo no supere el precio, etc.) son de los DTO y los services: acá
 * quedan como `Error` defensivo, porque el motor también recibe condiciones
 * que salen de la base y no del body.
 */
export function calcularPlanPago(
  condiciones: CondicionesPlanPago,
): PlanPagoCalculado {
  const { precio, tipo, fecha_venta } = condiciones;
  const cero = new Prisma.Decimal(0);

  if (tipo === ModalidadPago.CONTADO) {
    const cuotas: CuotaGenerada[] = [
      {
        numero: 0,
        fecha_vencimiento: sumarMeses(fecha_venta, 0),
        importe_capital: new Prisma.Decimal(precio),
        importe_interes: cero,
        importe: new Prisma.Decimal(precio),
        saldo_capital: cero,
      },
    ];

    return conTotales(cuotas, precio, {
      saldo_financiado: cero,
      tasa_mensual: null,
      valor_cuota: null,
    });
  }

  const { cantidad_cuotas: cantidadCuotas, tasa_nominal_anual: tna } =
    condiciones;

  if (cantidadCuotas === null || cantidadCuotas < 1) {
    throw new Error(
      'Un plan FINANCIADO necesita una cantidad de cuotas mayor o igual a 1',
    );
  }
  if (tna === null || tna.isNegative()) {
    throw new Error(
      'Un plan FINANCIADO necesita una tasa nominal anual mayor o igual a 0',
    );
  }

  const anticipo = new Prisma.Decimal(condiciones.anticipo_monto);
  const saldoFinanciado = precio.sub(anticipo);
  const tasaMensual = tna.div(100).div(MESES_POR_ANIO);
  const valorCuota = calcularValorCuota(
    saldoFinanciado,
    tasaMensual,
    cantidadCuotas,
  );

  const cuotas: CuotaGenerada[] = [
    {
      numero: 0,
      fecha_vencimiento: sumarMeses(fecha_venta, 0),
      importe_capital: anticipo,
      importe_interes: cero,
      importe: anticipo,
      saldo_capital: saldoFinanciado,
    },
  ];

  let saldo = saldoFinanciado;
  for (let numero = 1; numero <= cantidadCuotas; numero++) {
    const interes = saldo.mul(tasaMensual).toDecimalPlaces(DECIMALES);
    const esUltima = numero === cantidadCuotas;
    // La última amortiza lo que queda, no `valorCuota − interés`: así el
    // sobrante o faltante del redondeo cae entero acá y el saldo cierra en 0.
    const capital = esUltima ? saldo : valorCuota.sub(interes);
    saldo = saldo.sub(capital);

    cuotas.push({
      numero,
      fecha_vencimiento: sumarMeses(fecha_venta, numero),
      importe_capital: capital,
      importe_interes: interes,
      importe: capital.add(interes),
      saldo_capital: saldo,
    });
  }

  return conTotales(cuotas, precio, {
    saldo_financiado: saldoFinanciado,
    tasa_mensual: tasaMensual.mul(100).toDecimalPlaces(DECIMALES_TASA_MENSUAL),
    valor_cuota: valorCuota,
  });
}
