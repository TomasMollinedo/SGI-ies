import { z } from 'zod'
import { esPeriodicidad } from '../config/planPago.config'
import type { Periodicidad, TipoPlanPago } from './planPago.types'

/**
 * Validación del formulario de plan de pago, calcada de
 * `condiciones-plan-pago.schema.ts` + `create-plan-pago.dto.ts` del backend.
 *
 * Se replica en el cliente por el mismo motivo que en `ordenCompra.schema.ts`:
 * evitar mandar un request que el servidor va a rechazar igual, mostrando el
 * error al lado del campo en vez de esperar al 400. El backend sigue siendo la
 * autoridad — si rechaza algo igual, el formulario reparte esos issues por
 * campo (ver `PlanPagoForm`).
 *
 * Los campos numéricos viven en el form como STRING, no como `number`: un
 * `<input type="number">` vacío leído con `valueAsNumber` da `NaN`, que en un
 * campo opcional es indistinguible de "no cargó nada". Con string, vacío es
 * `''` y el schema lo transforma en `undefined`, que es exactamente lo que
 * significa "no mandar esta clave".
 */

/** Dos decimales como máximo, los de las columnas `Decimal(14, 2)`. */
const FORMATO_DECIMAL = /^\d+([.,]\d{1,2})?$/
const FORMATO_ENTERO = /^\d+$/

/** Acepta la coma como separador decimal: es lo que escribe un usuario en es-AR. */
function aNumeroDelFormulario(valor: string): number {
  return Number(valor.replace(',', '.'))
}

interface OpcionesDecimal {
  etiqueta: string
  /** Por default 0 (ningún importe ni porcentaje del plan puede ser negativo). */
  min?: number
  max?: number
  /** Para `precio`, que el backend exige `positive()`. */
  mayorACero?: boolean
}

/**
 * Las reglas numéricas, encadenadas sobre el string crudo (todavía sin
 * convertir). Se aplican igual al campo opcional y al obligatorio; lo único
 * que cambia entre los dos es qué hacen con el vacío, que se resuelve en el
 * `.transform()` final de cada uno.
 */
function conReglasDecimal(
  base: z.ZodType<string, string>,
  opciones: OpcionesDecimal
): z.ZodType<string, string> {
  const { etiqueta, min = 0, max, mayorACero = false } = opciones

  return base
    .refine(
      (valor) => valor === '' || FORMATO_DECIMAL.test(valor),
      `${etiqueta} admite hasta dos decimales`
    )
    .refine(
      (valor) => valor === '' || aNumeroDelFormulario(valor) >= min,
      `${etiqueta} no puede ser menor a ${min}`
    )
    .refine(
      (valor) => valor === '' || !mayorACero || aNumeroDelFormulario(valor) > 0,
      `${etiqueta} debe ser mayor a 0`
    )
    .refine(
      (valor) => valor === '' || max === undefined || aNumeroDelFormulario(valor) <= max,
      `${etiqueta} no puede superar ${max}`
    )
}

/**
 * Un decimal opcional: `''` sale como `undefined` y la clave no viaja en el
 * payload, que es como el backend entiende "no lo cargó" (ahí aplica el
 * default 0 de la columna, o la regla que corresponda).
 */
function decimalOpcional(opciones: OpcionesDecimal) {
  return conReglasDecimal(z.string().trim(), opciones).transform((valor) =>
    valor === '' ? undefined : aNumeroDelFormulario(valor)
  )
}

/** Igual que `decimalOpcional`, pero vacío es un error: el precio siempre va. */
function decimalObligatorio(opciones: OpcionesDecimal) {
  return conReglasDecimal(
    z.string().trim().min(1, `${opciones.etiqueta} es obligatorio`),
    opciones
  ).transform(aNumeroDelFormulario)
}

/**
 * Como `decimalOpcional`, pero para Margen: `formatearMilesEnVivo` le agrega
 * puntos de miles mientras se tipea (ej. "20.000,50"), así que antes de
 * aplicar las mismas reglas y el mismo `transform` que el resto de los
 * decimales, hay que sacarlos — si no, "20.000" fallaría la regla de "hasta
 * dos decimales" (la vería como 20 con tres decimales de más).
 */
function decimalConMilesOpcional(opciones: OpcionesDecimal) {
  return z
    .string()
    .transform((valor) => valor.replace(/\./g, ''))
    .pipe(decimalOpcional(opciones))
}
/**
 * Igual que `decimalObligatorio`, pero acepta puntos de miles en pantalla.
 * Ejemplo: "20.000,50" se transforma primero en "20000,50" y recién
 * después se valida y convierte a number.
 */
function decimalConMilesObligatorio(opciones: OpcionesDecimal) {
  return z
    .string()
    .transform((valor) => valor.replace(/\./g, ''))
    .pipe(decimalObligatorio(opciones))
}
export const planPagoFormSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, 'El nombre del plan es obligatorio')
      .max(100, 'El nombre no puede superar los 100 caracteres'),
    tipo: z.enum(['CONTADO', 'FINANCIADO']),
    precio: decimalConMilesObligatorio({
      etiqueta: 'El precio',
      mayorACero: true,
    }),
    // Opcionales: son la ayuda de cálculo del precio, no la fuente de verdad.
    // El backend los defaultea en 0 si no vienen.
    porcentaje_ganancia: decimalOpcional({
      etiqueta: 'El porcentaje de ganancia',
      // `Decimal(5, 2)`: no entra nada de 1000 para arriba.
      max: 999.99,
    }),
    margen: decimalConMilesOpcional({ etiqueta: 'El margen' }),
    anticipo_porcentaje: decimalOpcional({ etiqueta: 'El anticipo', max: 100 }),
    anticipo_monto: decimalOpcional({ etiqueta: 'El anticipo' }),
    cantidad_cuotas: z
      .string()
      .trim()
      .refine(
        (valor) => valor === '' || FORMATO_ENTERO.test(valor),
        'La cantidad de cuotas tiene que ser un número entero'
      )
      .refine(
        (valor) => valor === '' || Number(valor) > 0,
        'La cantidad de cuotas debe ser mayor a 0'
      )
      .transform((valor) => (valor === '' ? undefined : Number(valor))),
    periodicidad: z
      .string()
      .refine((valor) => valor === '' || esPeriodicidad(valor), 'Elegí una periodicidad')
      .transform((valor) => (valor === '' ? undefined : (valor as Periodicidad))),
  })
  // Las mismas reglas cruzadas que `validarCondicionesPlanPago` en el backend.
  .superRefine((datos, ctx) => {
    const tienePorcentaje = datos.anticipo_porcentaje !== undefined
    const tieneMonto = datos.anticipo_monto !== undefined

    if (tienePorcentaje && tieneMonto) {
      ctx.addIssue({
        code: 'custom',
        path: ['anticipo_monto'],
        message: 'El anticipo se define por porcentaje o por monto, no por los dos a la vez',
      })
    }

    // En CONTADO no hace falta: el backend lo normaliza a 100%.
    if (!tienePorcentaje && !tieneMonto && datos.tipo !== 'CONTADO') {
      ctx.addIssue({
        code: 'custom',
        path: ['anticipo_porcentaje'],
        message: 'Falta el anticipo: indicá un porcentaje o un monto',
      })
    }

    if (tieneMonto && datos.precio !== undefined && datos.anticipo_monto! > datos.precio) {
      ctx.addIssue({
        code: 'custom',
        path: ['anticipo_monto'],
        message: 'El anticipo no puede ser mayor al precio del plan',
      })
    }

    if (datos.tipo === 'CONTADO') {
      if (datos.cantidad_cuotas !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['cantidad_cuotas'],
          message: 'Un plan de contado no lleva cantidad de cuotas',
        })
      }
      if (datos.periodicidad !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['periodicidad'],
          message: 'Un plan de contado no lleva periodicidad',
        })
      }
      return
    }

    if (datos.cantidad_cuotas === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['cantidad_cuotas'],
        message: 'Un plan financiado necesita la cantidad de cuotas',
      })
    }
    if (datos.periodicidad === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['periodicidad'],
        message: 'Un plan financiado necesita la periodicidad',
      })
    }
  })

export type PlanPagoFormValues = z.input<typeof planPagoFormSchema>
export type PlanPagoFormOutput = z.output<typeof planPagoFormSchema>

/** Los campos del formulario, para saber qué issues del backend son de campo. */
export const CAMPOS_FORMULARIO = [
  'nombre',
  'tipo',
  'precio',
  'porcentaje_ganancia',
  'margen',
  'anticipo_porcentaje',
  'anticipo_monto',
  'cantidad_cuotas',
  'periodicidad',
] as const

export type CampoFormulario = (typeof CAMPOS_FORMULARIO)[number]

export function esCampoDelFormulario(campo: string): campo is CampoFormulario {
  return (CAMPOS_FORMULARIO as readonly string[]).includes(campo)
}

export const VALORES_INICIALES: PlanPagoFormValues = {
  nombre: '',
  tipo: 'CONTADO' satisfies TipoPlanPago,
  precio: '',
  porcentaje_ganancia: '',
  margen: '',
  anticipo_porcentaje: '',
  anticipo_monto: '',
  cantidad_cuotas: '',
  periodicidad: '',
}
