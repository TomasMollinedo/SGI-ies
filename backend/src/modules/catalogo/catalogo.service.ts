import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DECIMALES } from '../../common/constantes/decimales';
import { calcularCondicionEntregaResponse } from '../comercializacion/common/condicion-entrega';
import { montoAnticipoDesdePorcentaje } from '../comercializacion/common/anticipo';
import { calcularPlanPago } from '../comercializacion/plan-pago/motor-cuotas';
import {
  EstadoComercial,
  EstadoProyecto,
  ModalidadPago,
} from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { QueryCatalogoDto } from './dto/query-catalogo.dto';
import { SimularPlanCatalogoDto } from './dto/simular-plan-catalogo.dto';

/** Cantidad máxima de proyectos que muestra la landing (HU-24). */
const CANTIDAD_DESTACADOS = 4;

/**
 * La publicación que el catálogo muestra de una unidad: vigente y Disponible,
 * con la unidad activa. Es la misma condición para el detalle y la simulación,
 * así una unidad que no se ve en el catálogo tampoco se puede simular.
 */
function publicacionDisponibleDeUnidad(
  idUnidadFuncional: number,
): Prisma.PUBLICACIONUNIDADWhereInput {
  return {
    vigente: true,
    estado_comercial: EstadoComercial.DISPONIBLE,
    unidadFuncional: { id_unidad_funcional: idUnidadFuncional, estado: true },
  };
}

type PlazoParaSimular = {
  cantidad_cuotas: number;
  tasa_nominal_anual: Prisma.Decimal;
};

const UNIDAD_CATALOGO_SELECT = {
  id_unidad_funcional: true,
  identificador: true,
  tipologia: true,
  superficie_cubierta: true,
  superficie_descubierta: true,
  piso: true,
  proyecto: {
    select: {
      nombre: true,
      localidad: true,
      estado_obra: true,
      fecha_fin_estimada: true,
    },
  },
  // Solo la portada (la de menor `orden`), para que la tarjeta del catálogo
  // tenga su imagen sin pedir el detalle de cada unidad: Prisma la resuelve
  // dentro de la misma consulta del listado, no una por fila.
  // `obtenerDetalle` vuelve a declarar `imagenes` después de este spread y se
  // queda con la galería completa.
  imagenes: {
    select: { url: true },
    orderBy: { orden: 'asc' as const },
    take: 1,
  },
} as const;

@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * El catálogo se consulta desde PUBLICACIONUNIDAD, no desde UNIDADFUNCIONAL:
   * es la única forma de ordenar por `fecha_publicacion` (campo propio de la
   * publicación) y de leer su `precio_lista` (también propio de la
   * publicación) en la misma consulta.
   */
  async listarCatalogo(query: QueryCatalogoDto) {
    const { FK_proyecto, localidad, tipologia, entregada, page, limit } = query;

    const where: Prisma.PUBLICACIONUNIDADWhereInput = {
      vigente: true,
      estado_comercial: EstadoComercial.DISPONIBLE,
      unidadFuncional: {
        estado: true,
        ...(FK_proyecto !== undefined && { FK_proyecto }),
        ...(tipologia !== undefined && { tipologia }),
        ...((localidad !== undefined || entregada !== undefined) && {
          proyecto: {
            ...(localidad !== undefined && {
              localidad: { contains: localidad, mode: 'insensitive' },
            }),
            ...(entregada !== undefined && {
              estado_obra: entregada
                ? EstadoProyecto.FINALIZADO
                : { not: EstadoProyecto.FINALIZADO },
            }),
          },
        }),
      },
    };

    const [publicaciones, total] = await Promise.all([
      this.prisma.pUBLICACIONUNIDAD.findMany({
        where,
        select: {
          id_publicacion: true,
          fecha_publicacion: true,
          precio_lista: true,
          unidadFuncional: { select: UNIDAD_CATALOGO_SELECT },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fecha_publicacion: 'desc' },
      }),
      this.prisma.pUBLICACIONUNIDAD.count({ where }),
    ]);

    return {
      data: publicaciones.map(mapearItemCatalogo),
      meta: { total, page, limit },
    };
  }

  /**
   * Detalle público de una unidad (HU-25). Además de la ficha trae:
   * - `planes`: los planes de ejemplo activos (HU-22), calculados al responder
   *   con el precio de lista y la TNA vigente de su plazo. Un plan sin plazo
   *   (los del Sprint 3, hasta que T134 los convierta) o con el plazo
   *   inactivo no se devuelve: no hay tasa con la que calcularlo.
   * - `simulador`: los plazos activos entre los que elige la simulación libre
   *   (`simularPlan`), o `null` si no hay ninguno. Sin plazos activos el
   *   detalle informa solo el precio de contado.
   */
  async obtenerDetalle(idUnidadFuncional: number) {
    const [publicacion, plazos] = await Promise.all([
      this.buscarPublicacionConPlanes(idUnidadFuncional),
      this.buscarPlazosActivos(),
    ]);

    // No existe, o existe pero no está publicada/disponible: de cara al
    // catálogo público es lo mismo, no se distingue el motivo.
    if (!publicacion) {
      throw new NotFoundException('No existe una unidad disponible con ese id');
    }

    const precioLista = exigirPrecioLista(publicacion);

    return {
      ...mapearItemCatalogo(publicacion),
      comodidades: publicacion.unidadFuncional.comodidades,
      observaciones: publicacion.unidadFuncional.observaciones,
      imagenes: publicacion.unidadFuncional.imagenes,
      planes: publicacion.planesEjemplo.flatMap((plan) => {
        const { plazoFinanciacion, anticipo_porcentaje } = plan;
        // El `where` ya excluye ambos casos: esto solo ajusta el tipo.
        if (plazoFinanciacion === null || anticipo_porcentaje === null) {
          return [];
        }

        const anticipoMonto = montoAnticipoDesdePorcentaje(
          precioLista,
          anticipo_porcentaje,
        );
        const simulado = simularFinanciacion(
          precioLista,
          anticipoMonto,
          plazoFinanciacion,
        );

        return [
          {
            nombre: plan.nombre,
            anticipo_porcentaje: anticipo_porcentaje.toNumber(),
            anticipo_monto: anticipoMonto.toNumber(),
            saldo_financiado: simulado.saldo_financiado.toNumber(),
            cantidad_cuotas: plazoFinanciacion.cantidad_cuotas,
            tasa_nominal_anual: plazoFinanciacion.tasa_nominal_anual.toNumber(),
            valor_cuota: simulado.valor_cuota.toNumber(),
            total_intereses: simulado.total_intereses.toNumber(),
            total_a_pagar: simulado.total_a_pagar.toNumber(),
          },
        ];
      }),
      simulador: plazos.length === 0 ? null : { plazos },
    };
  }

  /**
   * Simulación libre (HU-25): el visitante elige un plazo activo y el anticipo
   * (monto o porcentaje del precio de lista) y recibe el cronograma completo.
   *
   * Es de solo lectura: no escribe nada, no crea ventas, reservas ni
   * consultas. El cálculo es el del motor de cuotas, el mismo de la venta
   * presencial, así lo que el cliente simula acá es lo que después se le
   * ofrece en la venta con la misma tasa.
   */
  async simularPlan(idUnidadFuncional: number, dto: SimularPlanCatalogoDto) {
    const publicacion = await this.prisma.pUBLICACIONUNIDAD.findFirst({
      where: publicacionDisponibleDeUnidad(idUnidadFuncional),
      select: { id_publicacion: true, precio_lista: true },
    });
    if (!publicacion) {
      throw new NotFoundException('No existe una unidad disponible con ese id');
    }

    const plazo = await this.prisma.pLAZOFINANCIACION.findFirst({
      where: { id_plazo_financiacion: dto.FK_plazo_financiacion, estado: true },
      select: {
        id_plazo_financiacion: true,
        cantidad_cuotas: true,
        tasa_nominal_anual: true,
      },
    });
    if (!plazo) {
      throw new NotFoundException(
        'No existe un plazo de financiación activo con ese id',
      );
    }

    const precioLista = exigirPrecioLista(publicacion);
    const anticipoMonto =
      dto.anticipo_monto !== undefined
        ? new Prisma.Decimal(dto.anticipo_monto)
        : montoAnticipoDesdePorcentaje(
            precioLista,
            new Prisma.Decimal(dto.anticipo_porcentaje ?? 0),
          );

    // "Mayor a cero y menor al precio" (HU-25). Va después de resolver el
    // monto porque un porcentaje muy chico puede redondear a 0,00.
    if (anticipoMonto.lte(0) || anticipoMonto.gte(precioLista)) {
      throw new BadRequestException(
        'El anticipo debe ser mayor a 0 y menor al precio de lista',
      );
    }

    const simulado = simularFinanciacion(precioLista, anticipoMonto, plazo);

    return {
      precio_lista: precioLista.toNumber(),
      anticipo_monto: anticipoMonto.toNumber(),
      // Si el visitante lo cargó en porcentaje se devuelve tal cual; si cargó
      // el monto, se deriva para mostrarlo de las dos formas.
      anticipo_porcentaje:
        dto.anticipo_porcentaje ??
        anticipoMonto
          .div(precioLista)
          .mul(100)
          .toDecimalPlaces(DECIMALES)
          .toNumber(),
      saldo_financiado: simulado.saldo_financiado.toNumber(),
      plazo: mapearPlazo(plazo),
      tasa_mensual: simulado.tasa_mensual.toNumber(),
      valor_cuota: simulado.valor_cuota.toNumber(),
      total_intereses: simulado.total_intereses.toNumber(),
      total_a_pagar: simulado.total_a_pagar.toNumber(),
      cronograma: simulado.cuotas.map((cuota) => ({
        numero: cuota.numero,
        importe_capital: cuota.importe_capital.toNumber(),
        importe_interes: cuota.importe_interes.toNumber(),
        importe: cuota.importe.toNumber(),
      })),
    };
  }

  private buscarPublicacionConPlanes(idUnidadFuncional: number) {
    return this.prisma.pUBLICACIONUNIDAD.findFirst({
      where: publicacionDisponibleDeUnidad(idUnidadFuncional),
      select: {
        id_publicacion: true,
        fecha_publicacion: true,
        precio_lista: true,
        unidadFuncional: {
          select: {
            ...UNIDAD_CATALOGO_SELECT,
            comodidades: true,
            observaciones: true,
            imagenes: {
              select: { url: true, orden: true },
              orderBy: { orden: 'asc' },
            },
          },
        },
        planesEjemplo: {
          // Solo los que se pueden calcular: con anticipo y con un plazo
          // activo (HU-22: si el plazo se inactiva, el plan deja de verse).
          where: {
            estado: true,
            anticipo_porcentaje: { not: null },
            plazoFinanciacion: { is: { estado: true } },
          },
          select: {
            nombre: true,
            anticipo_porcentaje: true,
            plazoFinanciacion: {
              select: { cantidad_cuotas: true, tasa_nominal_anual: true },
            },
          },
          orderBy: [
            { plazoFinanciacion: { cantidad_cuotas: 'asc' } },
            { anticipo_porcentaje: 'asc' },
            { id_plan_ejemplo: 'asc' },
          ],
        },
      },
    });
  }

  /** Los plazos de financiación activos, de menos a más cuotas. */
  private async buscarPlazosActivos() {
    const plazos = await this.prisma.pLAZOFINANCIACION.findMany({
      where: { estado: true },
      select: {
        id_plazo_financiacion: true,
        cantidad_cuotas: true,
        tasa_nominal_anual: true,
      },
      orderBy: { cantidad_cuotas: 'asc' },
    });

    return plazos.map(mapearPlazo);
  }

  /**
   * Los proyectos con más unidades disponibles ahora mismo, hasta 4; a igual
   * cantidad, por orden alfabético del nombre (OBS-11, propuesta pendiente de
   * confirmar con el PO: HU-24 no define el desempate).
   *
   * Se calcula en tres consultas, porque `groupBy` no cruza relaciones y no
   * puede ordenar por el nombre del proyecto: cuántas unidades disponibles
   * tiene cada proyecto, los datos de todos esos proyectos (para desempatar
   * por nombre), y el menor precio de lista de los 4 elegidos. Son pocos
   * proyectos, así que ordenar en memoria es barato.
   */
  async obtenerDestacados() {
    const conteos = await this.prisma.uNIDADFUNCIONAL.groupBy({
      by: ['FK_proyecto'],
      where: {
        estado: true,
        publicaciones: {
          some: { vigente: true, estado_comercial: EstadoComercial.DISPONIBLE },
        },
      },
      _count: true,
    });

    if (conteos.length === 0) {
      return { data: [] };
    }

    const proyectos = await this.prisma.pROYECTO.findMany({
      where: { id_proyecto: { in: conteos.map((c) => c.FK_proyecto) } },
      select: {
        id_proyecto: true,
        nombre: true,
        localidad: true,
        imagen_portada_url: true,
      },
    });
    const cantidadPorProyecto = new Map(
      conteos.map((c) => [c.FK_proyecto, c._count]),
    );

    const destacados = proyectos
      .sort(
        (a, b) =>
          cantidadPorProyecto.get(b.id_proyecto)! -
            cantidadPorProyecto.get(a.id_proyecto)! ||
          a.nombre.localeCompare(b.nombre, 'es'),
      )
      .slice(0, CANTIDAD_DESTACADOS);

    const publicaciones = await this.prisma.pUBLICACIONUNIDAD.findMany({
      where: {
        vigente: true,
        estado_comercial: EstadoComercial.DISPONIBLE,
        unidadFuncional: {
          estado: true,
          FK_proyecto: { in: destacados.map((p) => p.id_proyecto) },
        },
      },
      select: {
        id_publicacion: true,
        precio_lista: true,
        unidadFuncional: { select: { FK_proyecto: true } },
      },
    });

    const precioDesdePorProyecto = new Map<number, Prisma.Decimal>();
    for (const publicacion of publicaciones) {
      const idProyecto = publicacion.unidadFuncional.FK_proyecto;
      const precioLista = exigirPrecioLista(publicacion);

      const precioActual = precioDesdePorProyecto.get(idProyecto);
      if (precioActual === undefined || precioLista.lt(precioActual)) {
        precioDesdePorProyecto.set(idProyecto, precioLista);
      }
    }

    return {
      data: destacados.map((proyecto) => ({
        id_proyecto: proyecto.id_proyecto,
        nombre: proyecto.nombre,
        localidad: proyecto.localidad,
        imagen_portada_url: proyecto.imagen_portada_url,
        cantidad_disponibles: cantidadPorProyecto.get(proyecto.id_proyecto)!,
        precio_desde: precioDesdePorProyecto
          .get(proyecto.id_proyecto)!
          .toNumber(),
      })),
    };
  }
}

function mapearPlazo(plazo: {
  id_plazo_financiacion: number;
  cantidad_cuotas: number;
  tasa_nominal_anual: Prisma.Decimal;
}) {
  return {
    id_plazo_financiacion: plazo.id_plazo_financiacion,
    cantidad_cuotas: plazo.cantidad_cuotas,
    tasa_nominal_anual: plazo.tasa_nominal_anual.toNumber(),
  };
}

/**
 * Cálculo del plan financiado con el motor de cuotas, el mismo que usa la
 * venta presencial. La fecha de venta es hoy: el catálogo no muestra
 * vencimientos, así que solo afecta a las fechas que el motor genera y que acá
 * se descartan.
 *
 * Para un plan FINANCIADO el motor siempre informa valor de cuota y tasa
 * mensual; el chequeo es solo para que el tipo deje de ser nullable.
 */
function simularFinanciacion(
  precio: Prisma.Decimal,
  anticipoMonto: Prisma.Decimal,
  plazo: PlazoParaSimular,
) {
  const plan = calcularPlanPago({
    precio,
    tipo: ModalidadPago.FINANCIADO,
    anticipo_monto: anticipoMonto,
    cantidad_cuotas: plazo.cantidad_cuotas,
    tasa_nominal_anual: plazo.tasa_nominal_anual,
    fecha_venta: new Date(),
  });

  if (plan.valor_cuota === null || plan.tasa_mensual === null) {
    throw new Error(
      'El motor de cuotas no informó la cuota de un plan financiado',
    );
  }

  return {
    ...plan,
    valor_cuota: plan.valor_cuota,
    tasa_mensual: plan.tasa_mensual,
  };
}

/**
 * Una publicación DISPONIBLE siempre tiene precio de lista: es justamente
 * definirlo lo que la pasa a DISPONIBLE (`PublicacionService.definirPrecioLista`),
 * y una vez definido no se puede quitar. Si falta es un dato inconsistente,
 * no un error del visitante: por eso es un 500.
 */
function exigirPrecioLista(publicacion: {
  id_publicacion: number;
  precio_lista: Prisma.Decimal | null;
}): Prisma.Decimal {
  if (publicacion.precio_lista === null) {
    throw new InternalServerErrorException(
      `La publicación ${publicacion.id_publicacion} está Disponible sin precio de lista`,
    );
  }
  return publicacion.precio_lista;
}

type PublicacionParaListado = {
  id_publicacion: number;
  fecha_publicacion: Date;
  precio_lista: Prisma.Decimal | null;
  unidadFuncional: {
    id_unidad_funcional: number;
    identificador: string;
    tipologia: string;
    superficie_cubierta: Prisma.Decimal;
    superficie_descubierta: Prisma.Decimal | null;
    piso: string | null;
    proyecto: {
      nombre: string;
      localidad: string;
      estado_obra: EstadoProyecto;
      fecha_fin_estimada: Date | null;
    };
    imagenes: { url: string }[];
  };
};

function mapearItemCatalogo(publicacion: PublicacionParaListado) {
  const { unidadFuncional } = publicacion;
  const { proyecto } = unidadFuncional;

  return {
    id_unidad_funcional: unidadFuncional.id_unidad_funcional,
    identificador: unidadFuncional.identificador,
    tipologia: unidadFuncional.tipologia,
    superficie_cubierta: unidadFuncional.superficie_cubierta.toNumber(),
    superficie_descubierta:
      unidadFuncional.superficie_descubierta?.toNumber() ?? null,
    piso: unidadFuncional.piso,
    proyecto: { nombre: proyecto.nombre, localidad: proyecto.localidad },
    imagen_url: unidadFuncional.imagenes[0]?.url ?? null,
    // El nombre del campo es del contrato del Sprint 3; desde T133 es el
    // precio de lista (precio de contado) de la publicación.
    precio_desde: exigirPrecioLista(publicacion).toNumber(),
    condicion_entrega: calcularCondicionEntregaResponse(proyecto),
    fecha_publicacion: publicacion.fecha_publicacion.toISOString(),
  };
}
