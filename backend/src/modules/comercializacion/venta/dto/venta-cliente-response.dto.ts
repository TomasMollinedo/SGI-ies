import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  EstadoVenta,
  TipologiaUnidad,
} from '../../../../../generated/prisma/enums';

const unidadClienteResumenSchema = z.object({
  id_unidad_funcional: z.number(),
  identificador: z.string(),
  tipologia: z.enum(TipologiaUnidad),
});

const proyectoClienteResumenSchema = z.object({
  id_proyecto: z.number(),
  nombre: z.string(),
  localidad: z.string(),
});

/** Ver `calcularCondicionEntrega` (única fuente de estos textos, T103). */
const condicionEntregaSchema = z.object({
  codigo: z.enum(['TERMINADA', 'A_ENTREGAR_CON_FECHA', 'A_ENTREGAR_SIN_FECHA']),
  texto: z.string(),
  fecha_referencia: z.iso.datetime().nullable(),
});

/**
 * Vista del cliente sobre su propia venta (T112, HU-28): solo lo que necesita
 * para reconocer la unidad y su situación de pago, sin ningún dato interno
 * (usuarioCreador, FK_plan_pago, motivo_cancelacion, etc. — eso es de la vista
 * admin en `venta-response.dto.ts`). Por eso no reusa `ventaListItemSchema`.
 */
export const ventaClienteResumenSchema = z.object({
  id_venta: z.number(),
  estado: z.enum(EstadoVenta),
  fecha_adhesion: z.iso.datetime(),
  unidad: unidadClienteResumenSchema,
  proyecto: proyectoClienteResumenSchema,
  condicion_entrega: condicionEntregaSchema,
  saldo_total_pendiente: z.number(),
  /**
   * Evita que el frontend tenga que pedir el detalle completo de cada venta
   * solo para pintar la alerta de la tarjeta del listado.
   */
  tiene_cuotas_vencidas: z.boolean(),
});

/** Sin paginar: un cliente no acumula un volumen de unidades que lo justifique. */
export const misVentasResponseSchema = z.object({
  data: z.array(ventaClienteResumenSchema),
});

export class MisVentasResponseDto extends createZodDto(
  misVentasResponseSchema,
) {}
