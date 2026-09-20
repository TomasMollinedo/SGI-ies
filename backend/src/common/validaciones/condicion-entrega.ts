import { EstadoProyecto } from '../../../generated/prisma/enums';

/**
 * Texto público de condición de entrega de una unidad, derivado del estado
 * del PROYECTO al que pertenece (no de la unidad en sí, no hay ningún campo
 * propio para esto). Un proyecto FINALIZADO entrega sus unidades; cualquier
 * otro estado todavía no lo hizo.
 *
 * Reusado por el catálogo público (T107) y pensado para que la futura
 * pantalla interna de proyectos (T103) también lo use, en vez de reimplementar
 * la misma regla dos veces y arriesgarse a que un día digan cosas distintas
 * de la misma unidad (ver `dias-vencido.ts`, mismo criterio de por qué vive acá).
 */
export function calcularCondicionEntrega(
  estadoProyecto: EstadoProyecto,
  fechaFinEstimada: Date | null,
): string {
  if (estadoProyecto === EstadoProyecto.FINALIZADO) {
    return 'Entregada';
  }

  if (fechaFinEstimada) {
    return `A entregar — ${fechaFinEstimada.toISOString().slice(0, 10)}`;
  }

  return 'A entregar, fecha a confirmar';
}
