import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  camposProyecto,
  fechaFinNoAnteriorAInicio,
} from './create-proyecto.dto';

/**
 * Edición parcial: solo se modifica lo que llega en el body. En los campos
 * opcionales del proyecto, `null` borra el valor guardado; los obligatorios
 * no admiten `null`.
 */
export const updateProyectoSchema = z
  .object({
    nombre: camposProyecto.nombre.optional(),
    direccion: camposProyecto.direccion.optional(),
    localidad: camposProyecto.localidad.optional(),
    cantidad_unidades_planificadas:
      camposProyecto.cantidad_unidades_planificadas.optional(),
    descripcion: camposProyecto.descripcion.nullable().optional(),
    fecha_inicio: camposProyecto.fecha_inicio.nullable().optional(),
    fecha_fin_estimada: camposProyecto.fecha_fin_estimada.nullable().optional(),
    imagen_portada_url: camposProyecto.imagen_portada_url.nullable().optional(),
  })
  .refine(fechaFinNoAnteriorAInicio.validar, fechaFinNoAnteriorAInicio.error);

export class UpdateProyectoDto extends createZodDto(updateProyectoSchema) {}
