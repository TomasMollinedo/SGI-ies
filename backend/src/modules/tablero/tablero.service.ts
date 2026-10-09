import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OFFSET_ARGENTINA_MS } from '../../common/validaciones/offset-argentina';
import { PagoService } from '../tesoreria/pago/pago.service';
import {
  Agrupacion,
  QueryIngresosEgresosDto,
} from './dto/query-ingresos-egresos.dto';
import { QueryMargenProyectoDto } from './dto/query-margen-proyecto.dto';

/**
 * Tope de períodos por consulta. Los egresos de cada uno se piden por
 * separado a `PagoService.calcularResumenPeriodo` (una consulta por período),
 * así que el rango no puede crecer sin límite: 60 son 5 años por mes.
 */
const MAX_PERIODOS = 60;

const MESES_POR_PERIODO: Record<Agrupacion, number> = {
  MENSUAL: 1,
  TRIMESTRAL: 3,
  ANUAL: 12,
};

type Rango = { desde: Date; hasta: Date };

type Periodo = Rango & { etiqueta: string };

/** Un renglón de cobro imputado a un proyecto: la unidad mínima de los ingresos. */
type IngresoImputado = {
  fecha: Date;
  importe: Prisma.Decimal;
  proyecto: { id_proyecto: number; nombre: string };
};

type ProyectoResumen = IngresoImputado['proyecto'];

type SumaIngresos = {
  total: Prisma.Decimal;
  porProyecto: Map<
    number,
    { proyecto: ProyectoResumen; total: Prisma.Decimal }
  >;
};

/**
 * Margen de un grupo de unidades (vendidas o Disponibles) de un proyecto: la
 * suma de precio − costo, y la suma de los precios (las ventas) como base del
 * porcentaje. Las ventas se acumulan aparte en vez de deducirlas como
 * costo + margen: es el mismo número, pero a la vista.
 */
type AcumuladorMargen = {
  cantidad: number;
  margen: Prisma.Decimal;
  ventas: Prisma.Decimal;
};

function acumuladorVacio(): AcumuladorMargen {
  return {
    cantidad: 0,
    margen: new Prisma.Decimal(0),
    ventas: new Prisma.Decimal(0),
  };
}

function acumular(
  mapa: Map<number, AcumuladorMargen>,
  FK_proyecto: number,
  precio: Prisma.Decimal,
  costo: Prisma.Decimal,
): void {
  const actual = mapa.get(FK_proyecto) ?? acumuladorVacio();
  actual.cantidad += 1;
  actual.margen = actual.margen.plus(precio.minus(costo));
  actual.ventas = actual.ventas.plus(precio);
  mapa.set(FK_proyecto, actual);
}

/**
 * Importe del margen y el porcentaje que representa SOBRE LAS VENTAS
 * (margen ÷ suma de precios), que es la convención comercial: no sobre el
 * costo. Sin ventas de base (ninguna unidad en el grupo) el porcentaje es 0.
 */
function margenDe(acumulador: AcumuladorMargen | undefined) {
  const margen = acumulador?.margen ?? new Prisma.Decimal(0);
  const ventas = acumulador?.ventas ?? new Prisma.Decimal(0);

  return {
    importe: margen.toDecimalPlaces(2).toNumber(),
    porcentaje: ventas.isZero()
      ? 0
      : margen.div(ventas).times(100).toDecimalPlaces(2).toNumber(),
  };
}

@Injectable()
export class TableroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagos: PagoService,
  ) {}

  /**
   * Ingresos, egresos y resultado de la empresa por período (HU-34).
   *
   * - Ingresos: cobros CONFIRMADO (presenciales y ecommerce, sin anulados),
   *   abiertos por proyecto. Se suman las líneas de imputación
   *   (`DETALLECOBRO`) y no `COBRO.importe_total`, porque un cobro puede
   *   imputar cuotas de ventas de proyectos distintos; el total coincide con
   *   el de la cabecera porque `CobroService` exige que el detalle sume
   *   exacto el importe total.
   * - Egresos: pagos CONFIRMADA, reutilizando
   *   `PagoService.calcularResumenPeriodo`. Los pagos no se asocian a
   *   proyectos, así que el filtro por proyecto no los toca.
   * - Resultado: ingresos − egresos. Con filtro por proyecto no se devuelve
   *   (`null`): comparar ingresos de un proyecto con egresos de toda la
   *   empresa no significa nada.
   *
   * Los períodos son meses, trimestres o años calendario de Argentina; los
   * de los extremos pueden ser parciales. Sin rango se usa el año en curso.
   * La variación es contra el rango anterior contiguo de igual duración.
   */
  async obtenerIngresosEgresos(query: QueryIngresosEgresosDto) {
    const { agrupacion, FK_proyecto } = query;

    if (FK_proyecto !== undefined) {
      await this.buscarProyecto(FK_proyecto);
    }

    const rango = this.resolverRango(query);
    const periodos = this.generarPeriodos(agrupacion, rango);
    const anterior = this.calcularRangoAnterior(rango);

    const [ingresos, ingresosAnteriores, egresosPorPeriodo, egresosAnterior] =
      await Promise.all([
        this.obtenerIngresos(rango, FK_proyecto),
        this.obtenerIngresos(anterior, FK_proyecto),
        Promise.all(periodos.map((periodo) => this.obtenerEgresos(periodo))),
        this.obtenerEgresos(anterior),
      ]);

    const ingresosPorEtiqueta = new Map<string, IngresoImputado[]>();
    for (const ingreso of ingresos) {
      const etiqueta = this.etiquetaDe(ingreso.fecha, agrupacion);
      const delPeriodo = ingresosPorEtiqueta.get(etiqueta) ?? [];
      delPeriodo.push(ingreso);
      ingresosPorEtiqueta.set(etiqueta, delPeriodo);
    }

    const sinProyecto = FK_proyecto === undefined;
    const resultadoDe = (ingresos: Prisma.Decimal, egresos: Prisma.Decimal) =>
      sinProyecto ? ingresos.minus(egresos).toNumber() : null;

    const filasPeriodos = periodos.map((periodo, indice) => {
      const suma = this.sumarIngresos(
        ingresosPorEtiqueta.get(periodo.etiqueta) ?? [],
      );
      const egresos = egresosPorPeriodo[indice];

      return {
        etiqueta: periodo.etiqueta,
        desde: periodo.desde.toISOString(),
        hasta: periodo.hasta.toISOString(),
        ingresos: suma.total.toNumber(),
        egresos: egresos.toNumber(),
        resultado: resultadoDe(suma.total, egresos),
        ingresosPorProyecto: this.listarPorProyecto(suma),
      };
    });

    const sumaTotal = this.sumarIngresos(ingresos);
    const egresosTotal = egresosPorPeriodo.reduce(
      (acumulado, egresos) => acumulado.plus(egresos),
      new Prisma.Decimal(0),
    );
    const sumaAnterior = this.sumarIngresos(ingresosAnteriores);

    return {
      filtros: {
        agrupacion,
        fechaDesde: rango.desde.toISOString(),
        fechaHasta: rango.hasta.toISOString(),
        FK_proyecto: FK_proyecto ?? null,
      },
      periodos: filasPeriodos,
      totales: {
        ingresos: sumaTotal.total.toNumber(),
        egresos: egresosTotal.toNumber(),
        resultado: resultadoDe(sumaTotal.total, egresosTotal),
        ingresosPorProyecto: this.listarPorProyecto(sumaTotal),
      },
      rangoAnterior: {
        desde: anterior.desde.toISOString(),
        hasta: anterior.hasta.toISOString(),
        ingresos: sumaAnterior.total.toNumber(),
        egresos: egresosAnterior.toNumber(),
        resultado: resultadoDe(sumaAnterior.total, egresosAnterior),
      },
      variacion: {
        ingresos: this.calcularVariacion(sumaTotal.total, sumaAnterior.total),
        egresos: this.calcularVariacion(egresosTotal, egresosAnterior),
        resultado: sinProyecto
          ? this.calcularVariacion(
              sumaTotal.total.minus(egresosTotal),
              sumaAnterior.total.minus(egresosAnterior),
            )
          : null,
      },
    };
  }

  /**
   * Margen comercial por proyecto activo (HU-34). No incluye intereses de
   * financiación: usa `PLANPAGO.precio_venta` (lo que se acordó vender), no
   * `total_a_pagar` (que suma los intereses de un plan financiado).
   *
   * - Realizado: unidades con una `VENTA` vigente — `precio_venta − costo`.
   * - Proyectado: unidades con publicación vigente en `DISPONIBLE` — `precio_lista − costo`.
   * - Quedan fuera del cálculo las unidades activas sin publicación vigente, o
   *   publicadas `EN_PREPARACION` (sin precio de lista todavía).
   * - Todo se calcula al consultar: nada de esto se guarda.
   *
   * Orden: del proyecto más reciente al más antiguo, por `fecha_inicio`; el
   * que no la tiene cargada entra en el mismo orden con su fecha de alta en
   * el sistema (`hora_creacion`), en vez de quedar relegado al final.
   *
   * El filtro por proyecto, el orden y la paginación se aplican en memoria:
   * el orden cae a otra columna cuando falta la fecha de inicio, y eso no se
   * puede expresar en un `orderBy` de Prisma — mismo recurso que la cuenta
   * corriente de proveedores. El margen total realizado es siempre el de
   * toda la empresa: ni el filtro ni la página lo cambian.
   */
  async obtenerMargenProyecto(query: QueryMargenProyectoDto) {
    const { FK_proyecto, page, limit } = query;

    const [proyectosActivos, ventasVigentes, publicacionesDisponibles] =
      await Promise.all([
        this.prisma.pROYECTO.findMany({
          where: { estado: true },
          select: {
            id_proyecto: true,
            codigo: true,
            nombre: true,
            fecha_inicio: true,
            hora_creacion: true,
            _count: {
              select: { unidadesFuncionales: { where: { estado: true } } },
            },
          },
          orderBy: { nombre: 'asc' },
        }),
        this.prisma.vENTA.findMany({
          where: { estado: 'VIGENTE' },
          select: {
            publicacion: {
              select: {
                unidadFuncional: {
                  select: { estado: true, costo: true, FK_proyecto: true },
                },
              },
            },
            planPago: { select: { precio_venta: true } },
          },
        }),
        this.prisma.pUBLICACIONUNIDAD.findMany({
          where: { vigente: true, estado_comercial: 'DISPONIBLE' },
          select: {
            precio_lista: true,
            unidadFuncional: {
              select: { estado: true, costo: true, FK_proyecto: true },
            },
          },
        }),
      ]);

    // Una unidad con venta vigente, o con publicación vigente Disponible,
    // siempre está activa (no se puede dar de baja con publicación vigente);
    // el filtro es una red de seguridad, no cambia el resultado esperado.
    const realizadoPorProyecto = new Map<number, AcumuladorMargen>();
    let margenTotalRealizado = new Prisma.Decimal(0);
    for (const venta of ventasVigentes) {
      const unidad = venta.publicacion.unidadFuncional;
      if (!unidad.estado || !venta.planPago) continue;

      const precioVenta = venta.planPago.precio_venta;
      margenTotalRealizado = margenTotalRealizado.plus(
        precioVenta.minus(unidad.costo),
      );
      acumular(
        realizadoPorProyecto,
        unidad.FK_proyecto,
        precioVenta,
        unidad.costo,
      );
    }

    const proyectadoPorProyecto = new Map<number, AcumuladorMargen>();
    for (const publicacion of publicacionesDisponibles) {
      const unidad = publicacion.unidadFuncional;
      // Comentario del schema: una vez definido, `precio_lista` nunca vuelve
      // a `null`; `Disponible` sólo se llega habiéndolo definido. Si de
      // todos modos faltara, la unidad queda fuera del cálculo, no rompe.
      if (!unidad.estado || publicacion.precio_lista === null) continue;

      acumular(
        proyectadoPorProyecto,
        unidad.FK_proyecto,
        publicacion.precio_lista,
        unidad.costo,
      );
    }

    // `sort` es estable y los proyectos ya vienen por nombre: a igual fecha
    // quedan en orden alfabético, así que las páginas no se pisan entre sí.
    const fechaDeOrden = (proyecto: (typeof proyectosActivos)[number]) =>
      (proyecto.fecha_inicio ?? proyecto.hora_creacion).getTime();
    const proyectosOrdenados = [...proyectosActivos].sort(
      (a, b) => fechaDeOrden(b) - fechaDeOrden(a),
    );

    const todasLasFilas = proyectosOrdenados.map((proyecto) => {
      const realizado = realizadoPorProyecto.get(proyecto.id_proyecto);
      const proyectado = proyectadoPorProyecto.get(proyecto.id_proyecto);
      const unidadesActivas = proyecto._count.unidadesFuncionales;
      const unidadesVendidas = realizado?.cantidad ?? 0;
      const unidadesDisponibles = proyectado?.cantidad ?? 0;

      const margenRealizado = margenDe(realizado);
      const margenProyectado = margenDe(proyectado);

      return {
        proyecto: {
          id_proyecto: proyecto.id_proyecto,
          codigo: proyecto.codigo,
          nombre: proyecto.nombre,
        },
        unidades_activas: unidadesActivas,
        unidades_vendidas: unidadesVendidas,
        porcentaje_vendidas:
          unidadesActivas === 0
            ? 0
            : new Prisma.Decimal(unidadesVendidas)
                .div(unidadesActivas)
                .times(100)
                .toDecimalPlaces(2)
                .toNumber(),
        unidades_fuera_de_calculo:
          unidadesActivas - unidadesVendidas - unidadesDisponibles,
        margen_realizado: margenRealizado,
        margen_proyectado: margenProyectado,
        margen_total_esperado: new Prisma.Decimal(margenRealizado.importe)
          .plus(margenProyectado.importe)
          .toDecimalPlaces(2)
          .toNumber(),
      };
    });

    const filas =
      FK_proyecto === undefined
        ? todasLasFilas
        : todasLasFilas.filter(
            (fila) => fila.proyecto.id_proyecto === FK_proyecto,
          );

    const total = filas.length;
    const data = filas.slice((page - 1) * limit, (page - 1) * limit + limit);

    return {
      data,
      margen_total_realizado: margenTotalRealizado
        .toDecimalPlaces(2)
        .toNumber(),
      // Sobre todas las filas del filtro, no solo las de la página.
      total_unidades_fuera_de_calculo: filas.reduce(
        (suma, fila) => suma + fila.unidades_fuera_de_calculo,
        0,
      ),
      meta: { total, page, limit },
    };
  }

  private async buscarProyecto(id: number) {
    const proyecto = await this.prisma.pROYECTO.findUnique({
      where: { id_proyecto: id },
      select: { id_proyecto: true },
    });

    if (!proyecto) {
      throw new NotFoundException(`No existe un proyecto con id ${id}`);
    }
  }

  /** Sin fechas: el año en curso (de Argentina), de enero a diciembre. */
  private resolverRango(query: QueryIngresosEgresosDto): Rango {
    if (query.fechaDesde && query.fechaHasta) {
      return { desde: query.fechaDesde, hasta: query.fechaHasta };
    }

    const { anio } = this.partesArgentina(new Date());

    return {
      desde: this.inicioDeMes(anio, 0),
      hasta: new Date(this.inicioDeMes(anio + 1, 0).getTime() - 1),
    };
  }

  /**
   * Rango contiguo anterior de igual duración: termina un milisegundo antes
   * de que empiece el actual y dura lo mismo (los bordes son inclusivos).
   */
  private calcularRangoAnterior({ desde, hasta }: Rango): Rango {
    const duracion = hasta.getTime() - desde.getTime() + 1;

    return {
      desde: new Date(desde.getTime() - duracion),
      hasta: new Date(desde.getTime() - 1),
    };
  }

  /**
   * Meses, trimestres o años calendario que cubren el rango, con el primero
   * y el último recortados a `desde`/`hasta`. Todos los períodos aparecen,
   * aunque no tengan movimientos (el gráfico los necesita en cero).
   */
  private generarPeriodos(agrupacion: Agrupacion, rango: Rango): Periodo[] {
    const mesesPorPeriodo = MESES_POR_PERIODO[agrupacion];
    const { anio, mes } = this.partesArgentina(rango.desde);

    // Índice absoluto de mes, alineado al calendario: `anio * 12` es múltiplo
    // de 1, 3 y 12, así que restar el resto cae en enero, abril, julio y
    // octubre para los trimestres, y en enero para los años.
    const indiceInicial = anio * 12 + mes;
    let indice = indiceInicial - (indiceInicial % mesesPorPeriodo);

    const periodos: Periodo[] = [];

    while (true) {
      const anioPeriodo = Math.floor(indice / 12);
      const mesPeriodo = indice % 12;
      const inicio = this.inicioDeMes(anioPeriodo, mesPeriodo);

      if (inicio > rango.hasta) {
        return periodos;
      }
      if (periodos.length >= MAX_PERIODOS) {
        throw new BadRequestException(
          `El rango pedido tiene más de ${MAX_PERIODOS} períodos; acortá el rango o agrupá por trimestre o año`,
        );
      }

      const fin = new Date(
        this.inicioDeMes(anioPeriodo, mesPeriodo + mesesPorPeriodo).getTime() -
          1,
      );

      periodos.push({
        etiqueta: this.etiqueta(anioPeriodo, mesPeriodo, agrupacion),
        desde: inicio > rango.desde ? inicio : rango.desde,
        hasta: fin < rango.hasta ? fin : rango.hasta,
      });

      indice += mesesPorPeriodo;
    }
  }

  /**
   * Cobros confirmados del rango, una fila por línea de imputación. Con
   * `FK_proyecto` solo trae las líneas imputadas a cuotas de ese proyecto.
   */
  private async obtenerIngresos(
    rango: Rango,
    FK_proyecto: number | undefined,
  ): Promise<IngresoImputado[]> {
    const detalles = await this.prisma.dETALLECOBRO.findMany({
      where: {
        cobro: {
          estado: 'CONFIRMADO',
          fecha_cobro: { gte: rango.desde, lte: rango.hasta },
        },
        ...(FK_proyecto !== undefined && {
          cuota: {
            venta: { publicacion: { unidadFuncional: { FK_proyecto } } },
          },
        }),
      },
      select: {
        importe_imputado: true,
        cobro: { select: { fecha_cobro: true } },
        cuota: {
          select: {
            venta: {
              select: {
                publicacion: {
                  select: {
                    unidadFuncional: {
                      select: {
                        proyecto: {
                          select: { id_proyecto: true, nombre: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return detalles.map((detalle) => ({
      fecha: detalle.cobro.fecha_cobro,
      importe: detalle.importe_imputado,
      proyecto: detalle.cuota.venta.publicacion.unidadFuncional.proyecto,
    }));
  }

  /** Pagos confirmados del rango: el cálculo existente de Pago, sin filtros extra. */
  private async obtenerEgresos(rango: Rango) {
    const resumen = await this.pagos.calcularResumenPeriodo({
      fechaDesde: rango.desde,
      fechaHasta: rango.hasta,
    });

    // `null` solo si faltara alguna fecha, y acá siempre vienen las dos.
    return new Prisma.Decimal(resumen?.totalEgresos ?? 0);
  }

  private sumarIngresos(ingresos: IngresoImputado[]): SumaIngresos {
    const suma: SumaIngresos = {
      total: new Prisma.Decimal(0),
      porProyecto: new Map(),
    };

    for (const { importe, proyecto } of ingresos) {
      suma.total = suma.total.plus(importe);

      const entrada = suma.porProyecto.get(proyecto.id_proyecto) ?? {
        proyecto,
        total: new Prisma.Decimal(0),
      };
      entrada.total = entrada.total.plus(importe);
      suma.porProyecto.set(proyecto.id_proyecto, entrada);
    }

    return suma;
  }

  /** Apertura por proyecto, del que más cobró al que menos. */
  private listarPorProyecto(suma: SumaIngresos) {
    return [...suma.porProyecto.values()]
      .sort((a, b) => b.total.comparedTo(a.total))
      .map((entrada) => ({
        proyecto: entrada.proyecto,
        total: entrada.total.toNumber(),
      }));
  }

  /**
   * Variación porcentual (2 decimales) contra el rango anterior. Si el
   * anterior fue cero no hay base para el porcentaje: devuelve `null`
   * (el frontend muestra "sin datos del período anterior"), salvo que el
   * actual también sea cero, que es una variación nula de verdad. El divisor
   * es el valor absoluto, para que un resultado que pasa de −100 a −50 figure
   * como una mejora (+50 %) y no como una caída.
   */
  private calcularVariacion(
    actual: Prisma.Decimal,
    anterior: Prisma.Decimal,
  ): number | null {
    if (anterior.isZero()) {
      return actual.isZero() ? 0 : null;
    }

    return actual
      .minus(anterior)
      .div(anterior.abs())
      .times(100)
      .toDecimalPlaces(2)
      .toNumber();
  }

  /**
   * Año y mes (0–11) del calendario de Argentina. Correr el instante por el
   * offset deja en los campos UTC la fecha de pared de Argentina — mismo
   * recurso que `calcularDiasVencido`.
   */
  private partesArgentina(fecha: Date) {
    const local = new Date(fecha.getTime() + OFFSET_ARGENTINA_MS);

    return { anio: local.getUTCFullYear(), mes: local.getUTCMonth() };
  }

  /** Medianoche de Argentina del día 1 del mes (acepta `mes` fuera de 0–11). */
  private inicioDeMes(anio: number, mes: number) {
    return new Date(Date.UTC(anio, mes, 1) - OFFSET_ARGENTINA_MS);
  }

  private etiquetaDe(fecha: Date, agrupacion: Agrupacion) {
    const { anio, mes } = this.partesArgentina(fecha);

    return this.etiqueta(anio, mes, agrupacion);
  }

  private etiqueta(anio: number, mes: number, agrupacion: Agrupacion) {
    switch (agrupacion) {
      case 'MENSUAL':
        return `${anio}-${String(mes + 1).padStart(2, '0')}`;
      case 'TRIMESTRAL':
        return `${anio}-T${Math.floor(mes / 3) + 1}`;
      case 'ANUAL':
        return `${anio}`;
    }
  }
}
