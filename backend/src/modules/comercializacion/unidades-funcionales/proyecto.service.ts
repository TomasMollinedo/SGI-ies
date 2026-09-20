import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoProyecto } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { CatalogoItemDto } from '../../../common/dto/catalogo-item.dto';
import { condicionBusquedaPorPalabras } from '../../../common/validaciones/busqueda-por-palabras';
import { QueryProyectoDto } from './dto/query-proyecto.dto';

/**
 * Etiquetas legibles de `EstadoProyecto`: las usa el catálogo del `<select>`
 * (ver `findEstados`) y `UnidadFuncionalService` para armar sus mensajes de
 * rechazo, para que el texto no quede desincronizado entre los dos.
 */
export const ESTADO_PROYECTO_LABELS: Record<EstadoProyecto, string> = {
  EN_PLANIFICACION: 'En planificación',
  EN_EJECUCION: 'En ejecución',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

const PROYECTO_SELECT = {
  id_proyecto: true,
  codigo: true,
  nombre: true,
  localidad: true,
  direccion: true,
  estado: true,
  fecha_fin_estimada: true,
  cantidad_unidades_planificadas: true,
} satisfies Prisma.PROYECTOSelect;

type ProyectoBase = Prisma.PROYECTOGetPayload<{
  select: typeof PROYECTO_SELECT;
}>;

interface ResumenUnidades {
  cargadas: number;
  presupuesto: number;
}

/**
 * VERSIÓN PROVISIONAL, de solo lectura (T101): no hay ABM de Proyecto en
 * ningún sprint, los proyectos se cargan por seed. Alcanza para la tabla
 * emergente de HU-20 y para que HU-25 filtre por proyecto. Se borra o se
 * reemplaza cuando exista el módulo Proyecto real; T102 consume
 * `presupuesto`, `unidades_cargadas` y `GET /proyectos/estados`.
 */
@Injectable()
export class ProyectoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Catálogo de estados del proyecto para poblar el `<select>` del frontend. */
  findEstados(): CatalogoItemDto[] {
    return Object.entries(ESTADO_PROYECTO_LABELS).map(([id, code]) => ({
      id,
      code,
      metadata: {},
    }));
  }

  /**
   * Listado paginado con filtros por estado y búsqueda por nombre (cada
   * palabra por separado, sin importar el orden) o por código. Cada proyecto
   * trae su presupuesto y cuántas unidades tiene cargadas.
   */
  async findAll(query: QueryProyectoDto) {
    const { busqueda, estado, page, limit } = query;

    const where: Prisma.PROYECTOWhereInput = {
      ...(estado && { estado }),
      ...(busqueda && {
        OR: [
          condicionBusquedaPorPalabras<Prisma.PROYECTOWhereInput>(
            'nombre',
            busqueda,
          ),
          { codigo: { contains: busqueda, mode: 'insensitive' } },
        ],
      }),
    };

    const [proyectos, total] = await Promise.all([
      this.prisma.pROYECTO.findMany({
        where,
        select: PROYECTO_SELECT,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.pROYECTO.count({ where }),
    ]);

    const resumenes = await this.calcularResumenes(
      proyectos.map((proyecto) => proyecto.id_proyecto),
    );

    return {
      data: proyectos.map((proyecto) =>
        this.mapear(proyecto, resumenes.get(proyecto.id_proyecto)),
      ),
      meta: { total, page, limit },
    };
  }

  /** Un proyecto con su presupuesto: sirve para refrescarlo tras un alta o una baja de unidad. */
  async findOne(id: number) {
    const proyecto = await this.prisma.pROYECTO.findUnique({
      where: { id_proyecto: id },
      select: PROYECTO_SELECT,
    });

    if (!proyecto) {
      throw new NotFoundException(`No existe un proyecto con id ${id}`);
    }

    const resumenes = await this.calcularResumenes([id]);
    return this.mapear(proyecto, resumenes.get(id));
  }

  /**
   * Presupuesto y unidades cargadas de varios proyectos en una sola consulta
   * (sin N+1). Solo cuenta las unidades ACTIVAS: por eso el presupuesto baja
   * al dar de baja una unidad y vuelve a subir al reactivarla.
   */
  private async calcularResumenes(idsProyectos: number[]) {
    const grupos = await this.prisma.uNIDADFUNCIONAL.groupBy({
      by: ['FK_proyecto'],
      where: { estado: true, FK_proyecto: { in: idsProyectos } },
      _count: { _all: true },
      _sum: { costo: true },
    });

    return new Map<number, ResumenUnidades>(
      grupos.map((grupo) => [
        grupo.FK_proyecto,
        {
          cargadas: grupo._count._all,
          presupuesto: grupo._sum.costo?.toNumber() ?? 0,
        },
      ]),
    );
  }

  private mapear(proyecto: ProyectoBase, resumen?: ResumenUnidades) {
    return {
      ...proyecto,
      unidades_cargadas: resumen?.cargadas ?? 0,
      presupuesto: resumen?.presupuesto ?? 0,
    };
  }
}