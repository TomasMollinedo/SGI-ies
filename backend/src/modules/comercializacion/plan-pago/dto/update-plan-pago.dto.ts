import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Campo estructural del plan: se fija en el alta y no se edita nunca más.
 *
 * Se declara como `z.never().optional()` en vez de omitirlo del schema: si
 * solo se omitiera, Zod lo descartaría en silencio y el usuario creería que
 * guardó un cambio que nunca pasó. Así la request se rechaza con 400 y un
 * mensaje que dice qué hacer en su lugar.
 */
const noEditable = (campo: string) =>
  z
    .never({
      error: `El campo "${campo}" no es editable: inactivá el plan y creá uno nuevo`,
    })
    .optional()
    // Para que en Swagger se vea por qué el campo está en el schema de
    // edición pero no acepta ningún valor.
    .meta({
      description: `Condición estructural del plan: no es editable. Para cambiarla, inactivá el plan y creá uno nuevo.`,
    });

/**
 * Edición de un plan de pago (HU-22).
 *
 * A propósito NO se arma como `.partial()` del schema de create, mismo
 * criterio que `UpdateFormaPagoDto`: se declara solo con lo realmente
 * editable, más los campos estructurales bloqueados explícitamente.
 *
 * El motivo del bloqueo está en `schema.prisma`: si cambiaran `tipo`, el
 * anticipo, la cantidad de cuotas o la periodicidad, los planes ya adheridos
 * quedarían describiendo condiciones distintas a las que se pactaron. Para
 * ofrecer otras condiciones se inactiva este plan y se crea uno nuevo.
 *
 * `estado` sí se edita acá (es el activo/inactivo del plan). Al inactivar el
 * último plan activo, la publicación vuelve a EN_PREPARACION — eso es del
 * service, no de este schema.
 *
 * `nombre` y `FK_publicacion` no figuran: no son editables, pero tampoco son
 * condiciones estructurales, así que se descartan en silencio como cualquier
 * clave de más (mismo comportamiento que `UpdateFormaPagoDto` con
 * `requiere_referencia`). Si el equipo decide que el nombre se pueda
 * corregir, se suma como campo editable y listo.
 *
 * REGLAS QUE NO VAN ACÁ, porque dependen de consultas a la base:
 * - "precio menor al costo de la unidad" (necesita UNIDADFUNCIONAL.costo).
 * - El bloqueo de edición cuando la publicación ya está EN_PLAN_DE_PAGO o
 *   VENDIDA (necesita el estado_comercial de la publicación).
 * Las dos se enganchan en `PlanPagoService.update()` (T105 Parte C).
 */
export const updatePlanPagoSchema = z
  .object({
    precio: z
      .number()
      .positive('El precio debe ser mayor a 0')
      .multipleOf(0.01, 'El precio admite hasta dos decimales'),
    porcentaje_ganancia: z
      .number()
      .min(0, 'El porcentaje de ganancia no puede ser negativo')
      .max(999.99, 'El porcentaje de ganancia no puede superar 999,99')
      .multipleOf(0.01, 'El porcentaje de ganancia admite hasta dos decimales'),
    margen: z
      .number()
      .min(0, 'El margen no puede ser negativo')
      .multipleOf(0.01, 'El margen admite hasta dos decimales'),
    estado: z.boolean(),
    // Condiciones estructurales: llegan solo si el cliente se equivocó.
    tipo: noEditable('tipo'),
    anticipo_porcentaje: noEditable('anticipo_porcentaje'),
    anticipo_monto: noEditable('anticipo_monto'),
    cantidad_cuotas: noEditable('cantidad_cuotas'),
    periodicidad: noEditable('periodicidad'),
  })
  .partial();

export class UpdatePlanPagoDto extends createZodDto(updatePlanPagoSchema) {}
