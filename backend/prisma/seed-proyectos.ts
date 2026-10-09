import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../generated/prisma/client';
import { EstadoProyecto, TipoImagenProyecto } from '../generated/prisma/enums';
import { fechaArgentina } from './seed-fechas';

/**
 * Helper compartido por los seeds que siembran proyectos
 * (`seed-comercializacion.ts` y `seed-t112-cliente1.ts`). No es un seed: no
 * se ejecuta solo.
 *
 * Deja cada proyecto como lo deja el ABM de Proyecto (T122):
 * - `codigo` lo genera el sistema como `PROY-` + el id (`PROY-0001`), así
 *   que se busca por nombre (único entre activos) para no duplicarlo;
 * - fechas ancladas a la medianoche de Argentina (`fechaArgentina`), igual
 *   que `fechaIsoSchema`;
 * - imágenes de diseño con un solo `orden` para todo el proyecto, como
 *   `ProyectoService.agregarImagen`.
 */

const URL_IMAGENES = 'https://cdn.axontech.test/proyectos';

export interface ProyectoSeed {
  nombre: string;
  descripcion: string | null;
  localidad: string;
  direccion: string;
  estado_obra: EstadoProyecto;
  /** `'AAAA-MM-DD'`. */
  fecha_inicio: string | null;
  /** `'AAAA-MM-DD'`. */
  fecha_fin_estimada: string | null;
  cantidad_unidades_planificadas: number;
  /** Archivo de la portada, sin la URL base. */
  portada: string | null;
  imagenes: { tipo: TipoImagenProyecto; archivo: string }[];
}

/**
 * Idempotente por nombre. La primera vez lo crea como lo hace
 * `ProyectoService.create`: con un código provisorio y después `PROY-` + el
 * id. Si ya existe, actualiza sus datos sin tocar el código. Las imágenes
 * son idempotentes por orden.
 */
export async function sembrarProyecto(
  prisma: PrismaClient,
  datos: ProyectoSeed,
  usuarioId: number,
) {
  const campos = {
    nombre: datos.nombre,
    descripcion: datos.descripcion,
    localidad: datos.localidad,
    direccion: datos.direccion,
    estado_obra: datos.estado_obra,
    fecha_inicio:
      datos.fecha_inicio === null ? null : fechaArgentina(datos.fecha_inicio),
    fecha_fin_estimada:
      datos.fecha_fin_estimada === null
        ? null
        : fechaArgentina(datos.fecha_fin_estimada),
    cantidad_unidades_planificadas: datos.cantidad_unidades_planificadas,
    imagen_portada_url:
      datos.portada === null ? null : `${URL_IMAGENES}/${datos.portada}`,
  };

  const existente = await prisma.pROYECTO.findFirst({
    where: { nombre: datos.nombre },
  });
  const proyecto = existente
    ? await prisma.pROYECTO.update({
        where: { id_proyecto: existente.id_proyecto },
        data: { ...campos, FK_usuario_actualizador: usuarioId },
      })
    : await prisma.$transaction(async (tx) => {
        const { id_proyecto } = await tx.pROYECTO.create({
          data: {
            ...campos,
            codigo: `TMP-${randomUUID()}`,
            FK_usuario_creador: usuarioId,
            FK_usuario_actualizador: usuarioId,
          },
        });
        return tx.pROYECTO.update({
          where: { id_proyecto },
          data: { codigo: `PROY-${String(id_proyecto).padStart(4, '0')}` },
        });
      });

  for (const [orden, imagen] of datos.imagenes.entries()) {
    const imagenExistente = await prisma.iMAGENPROYECTO.findFirst({
      where: { FK_proyecto: proyecto.id_proyecto, orden },
    });
    if (imagenExistente) continue;

    await prisma.iMAGENPROYECTO.create({
      data: {
        FK_proyecto: proyecto.id_proyecto,
        url: `${URL_IMAGENES}/${imagen.archivo}`,
        tipo: imagen.tipo,
        orden,
      },
    });
  }

  return proyecto;
}
