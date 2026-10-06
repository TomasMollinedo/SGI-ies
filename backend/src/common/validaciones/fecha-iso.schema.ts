import { z } from 'zod';
import { OFFSET_ARGENTINA_ISO } from './offset-argentina';

/**
 * Fecha que llega del cliente como texto ISO 8601 y se convierte a `Date`.
 *
 * No se usa `z.coerce.date()` porque un `ZodDate` no se puede representar en
 * JSON Schema y rompe la generación del documento de Swagger al arrancar la
 * app ("Date cannot be represented in JSON Schema"). Acá el schema de entrada
 * es un string, que Swagger sí documenta, y la conversión a `Date` la hace el
 * `.transform()`.
 *
 * Acepta tanto fecha sola (`2026-08-01`) como fecha y hora con offset
 * (`2026-08-01T14:30:00.000-03:00`).
 *
 * Una fecha sola se ancla explícitamente a la medianoche de Argentina
 * (`T00:00:00.000-03:00`), nunca a la medianoche UTC que asumiría
 * `new Date('2026-08-01')`. Es el mismo instante que arman
 * `inicioDelDiaIso`/`finDelDiaIso` en el frontend para filtrar por período
 * (`frontend/src/shared/utils/fechaIso.ts`): si acá se ancla a UTC, una fecha
 * de negocio cargada como "hoy" (ej. `fecha_pago`, `fecha_emision`) puede
 * quedar hasta 3 horas por debajo del borde que ese filtro arma para el mismo
 * día, y un registro del primer día del período queda afuera del reporte sin
 * ningún error visible. El offset se fija a mano y no se lee de la zona
 * horaria del proceso de Node, para que el resultado no dependa de en qué
 * servidor corra el backend.
 */
export const fechaIsoSchema = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()])
  .transform((valor) => {
    const conOffset = valor.includes('T')
      ? valor
      : `${valor}T00:00:00.000${OFFSET_ARGENTINA_ISO}`;
    return new Date(conOffset);
  });
