import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { fechaIsoSchema } from '../../../common/validaciones/fecha-iso.schema';

/**
 * Campos que carga el usuario al dar de alta un proyecto. Se exportan sueltos
 * (sin el refine de fechas) para que `update-proyecto.dto.ts` arme su propio
 * objeto a partir de ellos: derivar el update con `.partial()` de un schema
 * que ya tiene un refine no es seguro en Zod 4.
 *
 * No hay `codigo` (lo genera el sistema), `estado_obra` (nace En
 * planificación y cambia por PATCH /:id/estado-obra), `estado` (baja lógica,
 * por PATCH /:id/baja) ni auditoría: Zod descarta cualquier clave que no esté
 * declarada.
 */
export const camposProyecto = {
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  direccion: z.string().trim().min(1, 'La dirección es obligatoria').max(255),
  localidad: z.string().trim().min(1, 'La localidad es obligatoria').max(100),
  cantidad_unidades_planificadas: z
    .number()
    .int()
    .positive('La cantidad de unidades planificadas debe ser mayor a 0'),
  descripcion: z.string().trim().min(1).max(2000),
  fecha_inicio: fechaIsoSchema,
  fecha_fin_estimada: fechaIsoSchema,
  // Solo http(s): `javascript:` y compañía también son URLs válidas para Zod.
  imagen_portada_url: z
    .url({ protocol: /^https?$/ })
    .max(500)
    .meta({
      description: 'URL pública que devolvió POST /almacenamiento/imagenes',
    }),
};

/**
 * Regla compartida por el alta y la edición: si llegan las dos fechas, la de
 * fin no puede ser anterior a la de inicio. En la edición solo cubre el caso
 * en que vienen las dos en el body; contra los valores ya guardados la
 * revalida el service.
 */
export const fechaFinNoAnteriorAInicio = {
  validar: (datos: {
    fecha_inicio?: Date | null;
    fecha_fin_estimada?: Date | null;
  }) =>
    !datos.fecha_inicio ||
    !datos.fecha_fin_estimada ||
    datos.fecha_fin_estimada.getTime() >= datos.fecha_inicio.getTime(),
  error: {
    message:
      'La fecha de fin estimada no puede ser anterior a la fecha de inicio',
    path: ['fecha_fin_estimada'],
  },
};

export const createProyectoSchema = z
  .object({
    nombre: camposProyecto.nombre,
    direccion: camposProyecto.direccion,
    localidad: camposProyecto.localidad,
    cantidad_unidades_planificadas:
      camposProyecto.cantidad_unidades_planificadas,
    descripcion: camposProyecto.descripcion.optional(),
    fecha_inicio: camposProyecto.fecha_inicio.optional(),
    fecha_fin_estimada: camposProyecto.fecha_fin_estimada.optional(),
    imagen_portada_url: camposProyecto.imagen_portada_url.optional(),
  })
  .refine(fechaFinNoAnteriorAInicio.validar, fechaFinNoAnteriorAInicio.error);

export class CreateProyectoDto extends createZodDto(createProyectoSchema) {}
