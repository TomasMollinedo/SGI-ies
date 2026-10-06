import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ModalidadPago } from '../../../../../generated/prisma/enums';

/**
 * Importes y porcentajes viajan como `string` con decimales fijos (dos para
 * importes, anticipo % y TNA, cuatro para la tasa mensual), para que el
 * frontend los muestre sin perder precisión ni redondear por su cuenta.
 */

const plazoSimuladoSchema = z.object({
  id_plazo_financiacion: z.number(),
  codigo: z.string(),
  cantidad_cuotas: z.number(),
  tasa_nominal_anual: z.string(),
});

const cuotaSimuladaSchema = z.object({
  /** 0 = anticipo, o el 100 % del precio en CONTADO. */
  numero: z.number(),
  fecha_vencimiento: z.iso.datetime(),
  importe_capital: z.string(),
  importe_interes: z.string(),
  importe: z.string(),
  /** Deuda del plan después de pagar esta cuota (0 en la última). */
  saldo_capital: z.string(),
});

/**
 * Resultado de la simulación (HU-27). `precio_lista` y
 * `plazo.tasa_nominal_anual` son los vigentes al simular: la confirmación de
 * la venta (T158) los vuelve a comparar para detectar si cambiaron.
 *
 * En CONTADO no hay plazo, tasa ni valor de cuota: `plazo`, `tasa_mensual` y
 * `valor_cuota` vienen en `null`, el anticipo es el 100 % y el cronograma
 * tiene una única cuota (la 0).
 */
export const simulacionVentaResponseSchema = z.object({
  FK_publicacion: z.number(),
  modalidad: z.enum(ModalidadPago),
  /** Fecha de la venta si se confirmara hoy: de acá cuelgan los vencimientos. */
  fecha_venta: z.iso.datetime(),
  precio_lista: z.string(),
  anticipo_monto: z.string(),
  anticipo_porcentaje: z.string(),
  saldo_financiado: z.string(),
  plazo: plazoSimuladoSchema.nullable(),
  /** TNA ÷ 12, en porcentaje (ej. "2.0000"). */
  tasa_mensual: z.string().nullable(),
  /** Cuota fija del sistema francés; la última puede diferir unos centavos. */
  valor_cuota: z.string().nullable(),
  total_intereses: z.string(),
  total_a_pagar: z.string(),
  cuotas: z.array(cuotaSimuladaSchema),
});

export class SimulacionVentaResponseDto extends createZodDto(
  simulacionVentaResponseSchema,
) {}
