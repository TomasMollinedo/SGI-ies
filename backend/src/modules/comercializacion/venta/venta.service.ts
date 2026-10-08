import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  EstadoCobro,
  EstadoComercial,
  EstadoCuota,
  EstadoDeclaracionPago,
  EstadoProyecto,
  EstadoVenta,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { validarTelefonoSoloNumeros } from '../../../common/validaciones/telefono-solo-numeros';
import { validarDniCuilValido } from '../../../common/validaciones/dni-cuil-valido';
import { calcularDiasVencido } from '../../../common/validaciones/dias-vencido';
import { calcularCondicionEntregaResponse } from '../common/condicion-entrega';
import { PublicacionService } from '../publicacion/publicacion.service';
import {
  SimulacionVenta,
  VentaSimulacionService,
} from './venta-simulacion.service';
import {
  PLAN_ACORDADO_SELECT,
  VentaConPlanAcordado,
  mapearPlanAcordado,
  resolverPlanAcordado,
} from './plan-acordado';
import { CreateVentaDto } from './dto/create-venta.dto';
import { CancelarVentaDto } from './dto/cancelar-venta.dto';
import { QueryVentaDto } from './dto/query-venta.dto';
import { QueryHistorialPagosClienteDto } from './dto/query-historial-pagos-cliente.dto';
import { QueryDeclaracionesPagoClienteDto } from './dto/query-declaraciones-pago-cliente.dto';

const CLIENTE_SELECT = {
  id_cliente: true,
  nombre: true,
  apellido: true,
  dni_cuil: true,
  email: true,
  telefono: true,
} as const;

/** Lo que el listado necesita de cada cuota: intereses (para el plan) y saldo. */
const CUOTA_RESUMEN_SELECT = {
  importe_interes: true,
  saldo_pendiente: true,
  estado: true,
} as const;

/** Cada cuota del cronograma en el detalle, con su desglose completo. */
const CUOTA_DETALLE_SELECT = {
  ...CUOTA_RESUMEN_SELECT,
  id_cuota: true,
  numero: true,
  fecha_vencimiento: true,
  importe_capital: true,
  importe: true,
  saldo_capital: true,
} as const;

@Injectable()
export class VentaService {
  constructor(
    private readonly prisma: PrismaService,
    /**
     * Solo por `transicionarEstadoComercial`: recibe el `tx` del llamador y
     * nunca abre transacción propia, así que el cambio de estado de la
     * publicación viaja dentro de la misma `$transaction` que la venta o la
     * cancelación. Es también el mecanismo de bloqueo optimista contra una
     * segunda venta simultánea sobre la misma publicación (ver `crear`).
     */
    private readonly publicaciones: PublicacionService,
    /**
     * La confirmación recalcula con el mismo cálculo de la simulación, dentro
     * de su transacción, para comparar precio y TNA y guardar exactamente lo
     * que se simuló.
     */
    private readonly simulaciones: VentaSimulacionService,
  ) {}

  /**
   * Confirma una venta presencial (HU-27): crea la venta, su plan de pago y
   * el cronograma de cuotas en una única transacción. Si cualquier paso
   * falla no queda nada a medio crear (nunca una venta sin plan ni un
   * cronograma parcial), tampoco el cliente si se daba de alta acá.
   *
   * Pasos, en orden:
   * 1. Bloquea la fila de la publicación (`SELECT ... FOR UPDATE`): mientras
   *    dura la confirmación nadie puede cambiar su precio de lista ni
   *    venderla, así que el precio que se compara es el mismo que se guarda.
   * 2. Busca o da de alta al cliente.
   * 3. Recalcula el plan con `VentaSimulacionService.calcular`, el mismo
   *    cálculo de la simulación (publicación Disponible, plazo activo,
   *    anticipo válido), dentro de esta transacción.
   * 4. Si el precio de lista o la TNA no son los que se le mostraron al
   *    cliente, rechaza con 409 y devuelve la simulación recalculada en
   *    `datos.simulacion`, para volver a acordarla.
   * 5. Crea la venta, su PLANPAGO con las condiciones congeladas (modalidad,
   *    precio, anticipo, plazo, cuotas, TNA y valor de cuota) y las cuotas
   *    con su desglose. Cambios posteriores del precio de lista o de la TNA
   *    del plazo no la afectan: el plan guarda su propia copia.
   * 6. Pasa la publicación a EN_PLAN_DE_PAGO.
   *
   * No escribe las columnas legado de VENTA (`*_congelado`,
   * `FK_plan_ejemplo`): nada las lee y se eliminan en T159. Las cuotas sí
   * llevan las dos FK (`FK_venta` y `FK_plan_pago`) hasta T159.
   */
  async crear(dto: CreateVentaDto, usuarioId: number) {
    const idVenta = await this.prisma.$transaction(async (tx) => {
      await this.bloquearPublicacion(tx, dto.FK_publicacion);

      const cliente = await this.buscarOCrearCliente(tx, dto.cliente);

      const simulacion = await this.simulaciones.calcular(dto, new Date(), tx);
      this.validarSinCambiosDesdeLaSimulacion(dto.simulacion, simulacion);

      // Chequeo defensivo: por construcción, una publicación DISPONIBLE no
      // debería tener una venta vigente — el `transicionarEstadoComercial`
      // de más abajo es quien realmente lo garantiza.
      const ventaVigente = await tx.vENTA.findFirst({
        where: {
          FK_publicacion: dto.FK_publicacion,
          estado: EstadoVenta.VIGENTE,
        },
      });
      if (ventaVigente) {
        throw new ConflictException(
          'Ya existe una venta vigente sobre esta publicación',
        );
      }

      const venta = await tx.vENTA.create({
        data: {
          FK_cliente: cliente.id_cliente,
          FK_publicacion: dto.FK_publicacion,
          fecha_venta: simulacion.fecha_venta,
          FK_usuario_creador: usuarioId,
          FK_usuario_actualizador: usuarioId,
        },
      });

      const { plazo } = simulacion;
      const planPago = await tx.pLANPAGO.create({
        data: {
          FK_venta: venta.id_venta,
          FK_plazo_financiacion: plazo?.id_plazo_financiacion ?? null,
          modalidad: simulacion.modalidad,
          precio_venta: simulacion.precio_lista,
          anticipo_monto: simulacion.anticipo_monto,
          cantidad_cuotas: plazo?.cantidad_cuotas ?? null,
          tasa_nominal_anual: plazo?.tasa_nominal_anual ?? null,
          valor_cuota: simulacion.valor_cuota,
          FK_usuario_creador: usuarioId,
        },
      });

      await tx.cUOTA.createMany({
        data: simulacion.cuotas.map((cuota) => ({
          FK_venta: venta.id_venta,
          FK_plan_pago: planPago.id_plan_pago,
          numero: cuota.numero,
          importe_capital: cuota.importe_capital,
          importe_interes: cuota.importe_interes,
          importe: cuota.importe,
          fecha_vencimiento: cuota.fecha_vencimiento,
          saldo_capital: cuota.saldo_capital,
          saldo_pendiente: cuota.importe,
          estado: EstadoCuota.PENDIENTE,
        })),
      });

      // Con la publicación bloqueada no debería fallar, pero sigue siendo la
      // garantía de que se vende solo desde DISPONIBLE.
      await this.publicaciones.transicionarEstadoComercial(
        tx,
        dto.FK_publicacion,
        EstadoComercial.DISPONIBLE,
        EstadoComercial.EN_PLAN_DE_PAGO,
        usuarioId,
      );

      return venta.id_venta;
    });

    return this.obtenerDetalle(idVenta);
  }

  /**
   * Bloquea la fila de la publicación hasta el fin de la transacción, mismo
   * patrón que `PublicacionService.publicar` con la unidad. Si no existe no
   * hace nada: el 404 lo da después `VentaSimulacionService.calcular`.
   */
  private async bloquearPublicacion(
    tx: Prisma.TransactionClient,
    idPublicacion: number,
  ) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id_publicacion" FROM "PUBLICACIONUNIDAD" WHERE "id_publicacion" = ${idPublicacion} FOR UPDATE`,
    );
  }

  /**
   * El precio de lista y la TNA vigentes tienen que ser los que se le
   * mostraron al cliente en la simulación. Si alguno cambió, la venta no se
   * confirma: 409 con la simulación recalculada en `datos.simulacion`
   * (`HttpExceptionFilter` propaga `datos` tal cual), para volver a
   * acordarla con el cliente.
   */
  private validarSinCambiosDesdeLaSimulacion(
    mostrada: CreateVentaDto['simulacion'],
    vigente: SimulacionVenta,
  ) {
    const tasaVigente = vigente.plazo?.tasa_nominal_anual ?? null;
    const cambioPrecio = !vigente.precio_lista.equals(mostrada.precio_lista);
    const cambioTasa =
      tasaVigente === null || mostrada.tasa_nominal_anual === null
        ? tasaVigente !== mostrada.tasa_nominal_anual
        : !tasaVigente.equals(mostrada.tasa_nominal_anual);

    if (!cambioPrecio && !cambioTasa) {
      return;
    }

    const cambios = [
      ...(cambioPrecio ? ['el precio de lista'] : []),
      ...(cambioTasa ? ['la TNA del plazo'] : []),
    ].join(' y ');

    throw new ConflictException({
      message: `No se confirmó la venta: cambió ${cambios} desde la simulación. Revisá la simulación recalculada con el cliente antes de volver a confirmar.`,
      datos: { simulacion: this.simulaciones.mapear(vigente) },
    });
  }

  /**
   * Busca un cliente por DNI/CUIL o email; si no existe, lo crea sin
   * `google_sub` ("provisional" — T99 lo vincula solo cuando ese cliente se
   * loguee con Google por primera vez, buscándolo por email). A diferencia de
   * `ClienteAuthService.buscarOCrearCliente` (que busca por `google_sub`/
   * `email`), acá también se busca por `dni_cuil`: quien vende presencial no
   * siempre tiene el email de memoria, pero sí el documento.
   *
   * Si lo encuentra pero le falta dni_cuil o teléfono (cliente que se
   * registró solo por Google, HU-23, antes de comprar), completa acá los
   * campos que falten con lo que mandó el formulario de venta — nunca
   * pisa un valor que el cliente ya tenía. `CreateVentaDto` exige ambos
   * campos siempre, así que `datos.dni_cuil`/`datos.telefono` llegan
   * completos aunque el cliente sea nuevo.
   */
  private async buscarOCrearCliente(
    tx: Prisma.TransactionClient,
    datos: CreateVentaDto['cliente'],
  ) {
    validarTelefonoSoloNumeros(datos.telefono);
    validarDniCuilValido(datos.dni_cuil);

    const existente = await tx.cLIENTE.findFirst({
      where: this.clienteWhere({
        dni_cuil: datos.dni_cuil,
        email: datos.email,
      }),
      select: CLIENTE_SELECT,
    });
    if (existente) {
      const faltantes: Prisma.CLIENTEUpdateInput = {};
      if (existente.dni_cuil === null) faltantes.dni_cuil = datos.dni_cuil;
      if (existente.telefono === null) faltantes.telefono = datos.telefono;

      if (Object.keys(faltantes).length === 0) return existente;

      return tx.cLIENTE.update({
        where: { id_cliente: existente.id_cliente },
        data: faltantes,
        select: CLIENTE_SELECT,
      });
    }

    return tx.cLIENTE.create({
      data: {
        nombre: datos.nombre,
        apellido: datos.apellido,
        dni_cuil: datos.dni_cuil,
        email: datos.email,
        telefono: datos.telefono,
      },
      select: CLIENTE_SELECT,
    });
  }

  /**
   * Buscador por texto libre del alta de venta y del filtro de cliente del
   * listado (HU-27): corre fuera de cualquier transacción y nunca crea nada
   * — a diferencia de `buscarOCrearCliente`, es de solo lectura. Cada
   * palabra de `busqueda` puede matchear parcialmente cualquiera de
   * nombre/apellido/dni_cuil/email — así "Juan Perez" encuentra a alguien
   * con nombre="Juan" y apellido="Perez" aunque ninguno de los dos campos
   * contenga las dos palabras por sí solo. Puede devolver más de un
   * cliente: por eso es paginado, igual que el resto de los listados.
   */
  async buscarClientes(datos: {
    busqueda: string;
    page: number;
    limit: number;
  }) {
    const CAMPOS_BUSCABLES = [
      'nombre',
      'apellido',
      'dni_cuil',
      'email',
    ] as const;
    const tokens = datos.busqueda.trim().split(/\s+/).filter(Boolean);

    const where: Prisma.CLIENTEWhereInput = {
      AND: tokens.map((token) => ({
        OR: CAMPOS_BUSCABLES.map((campo) => ({
          [campo]: { contains: token, mode: 'insensitive' },
        })),
      })),
    };

    const [data, total] = await Promise.all([
      this.prisma.cLIENTE.findMany({
        where,
        select: CLIENTE_SELECT,
        orderBy: { nombre: 'asc' },
        skip: (datos.page - 1) * datos.limit,
        take: datos.limit,
      }),
      this.prisma.cLIENTE.count({ where }),
    ]);

    return { data, meta: { total, page: datos.page, limit: datos.limit } };
  }

  /** Condición `OR` de `buscarOCrearCliente` (match exacto por dni_cuil/email), solo con los campos presentes. */
  private clienteWhere(datos: {
    dni_cuil?: string;
    email?: string;
  }): Prisma.CLIENTEWhereInput {
    const or: Prisma.CLIENTEWhereInput[] = [];
    if (datos.dni_cuil !== undefined) or.push({ dni_cuil: datos.dni_cuil });
    if (datos.email !== undefined) or.push({ email: datos.email });
    return { OR: or };
  }

  /**
   * Cancela una venta vigente: exige motivo, solo si no hay un cobro
   * CONFIRMADO ni una declaración de pago (HU-29) PENDIENTE de resolver
   * sobre alguna de sus cuotas. Las cuotas quedan ANULADA sin borrarse, y la
   * publicación vuelve a DISPONIBLE — misma transacción, mismo mecanismo de
   * `transicionarEstadoComercial` que en `crear`.
   */
  async cancelar(idVenta: number, dto: CancelarVentaDto, usuarioId: number) {
    await this.prisma.$transaction(async (tx) => {
      const venta = await tx.vENTA.findUnique({ where: { id_venta: idVenta } });
      if (!venta) {
        throw new NotFoundException('No existe una venta con ese id');
      }
      if (venta.estado === EstadoVenta.CANCELADA) {
        throw new ConflictException('La venta ya está cancelada');
      }

      const cobroConfirmado = await tx.dETALLECOBRO.findFirst({
        where: {
          cuota: { FK_venta: idVenta },
          cobro: { estado: EstadoCobro.CONFIRMADO },
        },
      });
      if (cobroConfirmado) {
        throw new ConflictException(
          'No se puede cancelar: ya hay un cobro confirmado sobre esta venta',
        );
      }

      const declaracionPendiente = await tx.dECLARACIONPAGO.findFirst({
        where: {
          cuota: { FK_venta: idVenta },
          estado: EstadoDeclaracionPago.PENDIENTE,
        },
      });
      if (declaracionPendiente) {
        throw new ConflictException(
          'No se puede cancelar: hay declaraciones de pago pendientes de resolver (validar o rechazar) sobre esta venta',
        );
      }

      const ahora = new Date();

      await tx.vENTA.update({
        where: { id_venta: idVenta },
        data: {
          estado: EstadoVenta.CANCELADA,
          motivo_cancelacion: dto.motivo_cancelacion,
          fecha_cancelacion: ahora,
          FK_usuario_actualizador: usuarioId,
          hora_actualizacion: ahora,
        },
      });

      await tx.cUOTA.updateMany({
        where: { FK_venta: idVenta },
        data: { estado: EstadoCuota.ANULADA, hora_actualizacion: ahora },
      });

      await this.publicaciones.transicionarEstadoComercial(
        tx,
        venta.FK_publicacion,
        EstadoComercial.EN_PLAN_DE_PAGO,
        EstadoComercial.DISPONIBLE,
        usuarioId,
      );
    });

    return this.obtenerDetalle(idVenta);
  }

  /**
   * Listado interno de ventas (HU-27), con filtros combinables por cliente,
   * publicación, unidad, proyecto, modalidad, estado y período (sobre
   * `fecha_venta`, OBS-16). Cada venta trae su plan acordado y su saldo
   * pendiente.
   */
  async listar(query: QueryVentaDto) {
    const {
      FK_cliente,
      FK_publicacion,
      FK_unidad_funcional,
      FK_proyecto,
      modalidad,
      estado,
      fechaDesde,
      fechaHasta,
      page,
      limit,
    } = query;

    const where: Prisma.VENTAWhereInput = {
      ...(FK_cliente !== undefined && { FK_cliente }),
      ...(FK_publicacion !== undefined && { FK_publicacion }),
      ...(estado !== undefined && { estado }),
      ...(modalidad !== undefined && { planPago: { modalidad } }),
      ...((FK_unidad_funcional !== undefined || FK_proyecto !== undefined) && {
        publicacion: {
          ...(FK_unidad_funcional !== undefined && { FK_unidad_funcional }),
          ...(FK_proyecto !== undefined && {
            unidadFuncional: { FK_proyecto },
          }),
        },
      }),
      ...((fechaDesde !== undefined || fechaHasta !== undefined) && {
        fecha_venta: {
          ...(fechaDesde !== undefined && { gte: fechaDesde }),
          ...(fechaHasta !== undefined && { lte: fechaHasta }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.vENTA.findMany({
        where,
        select: this.ventaSelect(CUOTA_RESUMEN_SELECT),
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fecha_venta: 'desc' },
      }),
      this.prisma.vENTA.count({ where }),
    ]);

    return {
      data: data.map((venta) => this.mapearVenta(venta)),
      meta: { total, page, limit },
    };
  }

  /**
   * Detalle de una venta (HU-27): lo mismo que el listado, más el cronograma
   * completo de su plan de pago con el desglose de cada cuota y quién la
   * registró.
   */
  async obtenerDetalle(idVenta: number) {
    const venta = await this.prisma.vENTA.findUnique({
      where: { id_venta: idVenta },
      select: {
        ...this.ventaSelect(CUOTA_DETALLE_SELECT),
        usuarioCreador: { select: { nombre: true, apellido: true } },
      },
    });

    if (!venta) {
      throw new NotFoundException('No existe una venta con ese id');
    }

    return {
      ...this.mapearVenta(venta),
      usuarioCreador: venta.usuarioCreador,
      cuotas: (venta.planPago?.cuotas ?? []).map((cuota) => ({
        id_cuota: cuota.id_cuota,
        numero: cuota.numero,
        fecha_vencimiento: cuota.fecha_vencimiento.toISOString(),
        importe_capital: cuota.importe_capital.toNumber(),
        importe_interes: cuota.importe_interes.toNumber(),
        importe: cuota.importe.toNumber(),
        saldo_capital: cuota.saldo_capital.toNumber(),
        saldo_pendiente: cuota.saldo_pendiente.toNumber(),
        estado: cuota.estado,
      })),
    };
  }

  /**
   * Lo que se lee de una venta para el listado y el detalle: el plan acordado
   * con las cuotas de su cronograma (el listado solo necesita lo que hace al
   * saldo y a los intereses; el detalle, el desglose completo), el cliente y
   * la unidad.
   *
   * Las cuotas se leen por el plan de pago (`CUOTA.FK_plan_pago`), no por la
   * venta: `CUOTA.FK_venta` es columna legado y se elimina en T159.
   *
   * `unidad`/`proyecto` viajan igual que en `PublicacionController.findAll`
   * (mismo `select` anidado sobre `publicacion.unidadFuncional`): sin esto,
   * el listado y el detalle de venta solo tenían `FK_publicacion`, un id sin
   * significado para quien mira la pantalla.
   */
  private ventaSelect<C extends typeof CUOTA_RESUMEN_SELECT>(cuotas: C) {
    return {
      ...PLAN_ACORDADO_SELECT,
      planPago: {
        select: {
          ...PLAN_ACORDADO_SELECT.planPago.select,
          cuotas: { select: cuotas, orderBy: { numero: 'asc' as const } },
        },
      },
      fecha_venta: true,
      estado: true,
      motivo_cancelacion: true,
      fecha_cancelacion: true,
      FK_publicacion: true,
      cliente: { select: CLIENTE_SELECT },
      publicacion: {
        select: {
          unidadFuncional: {
            select: {
              id_unidad_funcional: true,
              identificador: true,
              tipologia: true,
              proyecto: {
                select: { id_proyecto: true, codigo: true, nombre: true },
              },
            },
          },
        },
      },
    } as const;
  }

  /**
   * Unidades del cliente autenticado (T112, HU-28): solo ventas VIGENTE — una
   * cancelada ya no es "mi unidad comprada". Nunca recibe un id de cliente
   * por parámetro: siempre el del token (`ClienteAuthGuard`/`@CurrentCliente`
   * en el controller). Sin paginar, mismo criterio que `buscarClientes` de
   * un catálogo chico: un cliente no acumula unidades como para justificarla.
   */
  async misVentas(clienteId: number) {
    const ventas = await this.prisma.vENTA.findMany({
      where: { FK_cliente: clienteId, estado: EstadoVenta.VIGENTE },
      select: {
        id_venta: true,
        estado: true,
        fecha_venta: true,
        publicacion: {
          select: {
            unidadFuncional: {
              select: {
                id_unidad_funcional: true,
                identificador: true,
                tipologia: true,
                proyecto: {
                  select: {
                    id_proyecto: true,
                    nombre: true,
                    localidad: true,
                    estado_obra: true,
                    fecha_fin_estimada: true,
                  },
                },
              },
            },
          },
        },
        // ANULADA queda afuera: son cuotas de una venta cancelada, no cuentan
        // para el saldo ni para la alerta de vencidas de una venta vigente.
        cuotas: {
          where: { estado: { not: EstadoCuota.ANULADA } },
          select: { saldo_pendiente: true, fecha_vencimiento: true },
        },
      },
      orderBy: { fecha_venta: 'desc' },
    });

    const hoy = new Date();

    return { data: ventas.map((venta) => this.mapearVentaCliente(venta, hoy)) };
  }

  private mapearVentaCliente(
    venta: {
      id_venta: number;
      estado: string;
      fecha_venta: Date;
      publicacion: {
        unidadFuncional: {
          id_unidad_funcional: number;
          identificador: string;
          tipologia: string;
          proyecto: {
            id_proyecto: number;
            nombre: string;
            localidad: string;
            estado_obra: EstadoProyecto;
            fecha_fin_estimada: Date | null;
          };
        };
      };
      cuotas: { saldo_pendiente: Prisma.Decimal; fecha_vencimiento: Date }[];
    },
    hoy: Date,
  ) {
    const { unidadFuncional } = venta.publicacion;
    const { proyecto, ...unidad } = unidadFuncional;

    const saldoTotalPendiente = venta.cuotas.reduce(
      (acumulado, cuota) => acumulado.plus(cuota.saldo_pendiente),
      new Prisma.Decimal(0),
    );

    // Saldada (saldo_pendiente <= 0) nunca cuenta como vencida aunque su
    // fecha ya haya pasado — mismo criterio documentado en `calcularDiasVencido`.
    const tieneCuotasVencidas = venta.cuotas.some(
      (cuota) =>
        cuota.saldo_pendiente.greaterThan(0) &&
        calcularDiasVencido(cuota.fecha_vencimiento, hoy).vencido,
    );

    return {
      id_venta: venta.id_venta,
      estado: venta.estado,
      fecha_adhesion: venta.fecha_venta.toISOString(),
      unidad: {
        id_unidad_funcional: unidad.id_unidad_funcional,
        identificador: unidad.identificador,
        tipologia: unidad.tipologia,
      },
      proyecto: {
        id_proyecto: proyecto.id_proyecto,
        nombre: proyecto.nombre,
        localidad: proyecto.localidad,
      },
      condicion_entrega: calcularCondicionEntregaResponse(proyecto),
      saldo_total_pendiente: saldoTotalPendiente.toNumber(),
      tiene_cuotas_vencidas: tieneCuotasVencidas,
    };
  }

  /**
   * Detalle de una unidad del cliente autenticado (T112, HU-28): la misma
   * cabecera de `misVentas` + la unidad ampliada, el plan de pago acordado en
   * la venta (`resolverPlanAcordado`, desde T144) y el cronograma completo de
   * cuotas con su desglose de capital e interés y `vencido`/`dias_vencido` ya
   * resueltos.
   *
   * `NotFoundException` genérico si la venta no existe, no es de este
   * cliente, o no está VIGENTE (una cancelada ya no aparece en `misVentas`,
   * así que tampoco se puede entrar a su detalle por URL): nunca hay que
   * distinguirle al cliente cuál de los tres motivos fue.
   */
  async detalleVentaCliente(idVenta: number, clienteId: number) {
    const venta = await this.prisma.vENTA.findFirst({
      where: {
        id_venta: idVenta,
        FK_cliente: clienteId,
        estado: EstadoVenta.VIGENTE,
      },
      select: {
        ...PLAN_ACORDADO_SELECT,
        estado: true,
        fecha_venta: true,
        publicacion: {
          select: {
            unidadFuncional: {
              select: {
                id_unidad_funcional: true,
                identificador: true,
                tipologia: true,
                superficie_cubierta: true,
                superficie_descubierta: true,
                piso: true,
                comodidades: true,
                observaciones: true,
                proyecto: {
                  select: {
                    id_proyecto: true,
                    nombre: true,
                    localidad: true,
                    estado_obra: true,
                    fecha_fin_estimada: true,
                  },
                },
              },
            },
          },
        },
        cuotas: {
          where: { estado: { not: EstadoCuota.ANULADA } },
          select: {
            id_cuota: true,
            numero: true,
            importe_capital: true,
            importe_interes: true,
            importe: true,
            fecha_vencimiento: true,
            saldo_pendiente: true,
            estado: true,
          },
          orderBy: { numero: 'asc' },
        },
      },
    });

    if (!venta) {
      throw new NotFoundException('No existe una venta con ese id');
    }

    const plan = resolverPlanAcordado(venta, venta.cuotas);

    const { unidadFuncional } = venta.publicacion;
    const { proyecto, ...unidad } = unidadFuncional;
    const hoy = new Date();

    const cuotas = venta.cuotas.map((cuota) => {
      const { vencido, dias_vencido } = calcularDiasVencido(
        cuota.fecha_vencimiento,
        hoy,
      );
      // Saldada nunca está vencida aunque su fecha ya haya pasado — mismo
      // criterio que `mapearVentaCliente`.
      const vencidoEfectivo = cuota.saldo_pendiente.greaterThan(0) && vencido;

      return {
        id_cuota: cuota.id_cuota,
        numero: cuota.numero,
        importe_capital: cuota.importe_capital.toNumber(),
        importe_interes: cuota.importe_interes.toNumber(),
        importe: cuota.importe.toNumber(),
        fecha_vencimiento: cuota.fecha_vencimiento.toISOString(),
        saldo_pendiente: cuota.saldo_pendiente.toNumber(),
        estado: cuota.estado,
        vencido: vencidoEfectivo,
        dias_vencido: vencidoEfectivo ? dias_vencido : 0,
      };
    });

    const saldoTotalPendiente = venta.cuotas.reduce(
      (acumulado, cuota) => acumulado.plus(cuota.saldo_pendiente),
      new Prisma.Decimal(0),
    );

    return {
      id_venta: venta.id_venta,
      estado: venta.estado,
      fecha_adhesion: venta.fecha_venta.toISOString(),
      unidad: {
        id_unidad_funcional: unidad.id_unidad_funcional,
        identificador: unidad.identificador,
        tipologia: unidad.tipologia,
        superficie_cubierta: unidad.superficie_cubierta.toNumber(),
        superficie_descubierta:
          unidad.superficie_descubierta?.toNumber() ?? null,
        piso: unidad.piso,
        comodidades: unidad.comodidades,
        observaciones: unidad.observaciones,
      },
      proyecto: {
        id_proyecto: proyecto.id_proyecto,
        nombre: proyecto.nombre,
        localidad: proyecto.localidad,
      },
      condicion_entrega: calcularCondicionEntregaResponse(proyecto),
      plan: mapearPlanAcordado(plan),
      cuotas,
      saldo_total_pendiente: saldoTotalPendiente.toNumber(),
    };
  }

  /** `NotFoundException` genérico si la venta no existe, no es de este cliente, o no está VIGENTE — mismo criterio que `detalleVentaCliente`. */
  private async validarVentaDeCliente(idVenta: number, clienteId: number) {
    const venta = await this.prisma.vENTA.findFirst({
      where: {
        id_venta: idVenta,
        FK_cliente: clienteId,
        estado: EstadoVenta.VIGENTE,
      },
      select: { id_venta: true },
    });

    if (!venta) {
      throw new NotFoundException('No existe una venta con ese id');
    }
  }

  /**
   * Historial de pagos de UNA unidad del cliente (T112, HU-28), paginado.
   *
   * Se arma desde `DETALLECOBRO` filtrando por `cuota.FK_venta`, y no desde
   * `COBRO` filtrando por cliente: un cobro puede haber imputado a cuotas de
   * dos unidades del mismo cliente en una sola operación, y acá tiene que
   * aparecer "partido" — con el subtotal de lo que tocó a ESTA unidad, nunca
   * con su `importe_total` completo (decisión explícita de la HU). Un cobro
   * ANULADO se lista igual, con su estado: no hace falta excluirlo porque
   * `CUOTA.saldo_pendiente` ya refleja la restitución hecha al anular.
   *
   * La agrupación por cobro y la paginación se hacen en memoria: el volumen
   * de cobros de una sola unidad (como mucho, unos pocos por cuota) no
   * justifica una consulta agregada en SQL.
   */
  async historialPagosVenta(
    idVenta: number,
    clienteId: number,
    query: QueryHistorialPagosClienteDto,
  ) {
    await this.validarVentaDeCliente(idVenta, clienteId);

    const detalles = await this.prisma.dETALLECOBRO.findMany({
      where: { cuota: { FK_venta: idVenta } },
      select: {
        importe_imputado: true,
        cobro: {
          select: {
            id_cobro: true,
            fecha_cobro: true,
            origen: true,
            estado: true,
            numero_referencia: true,
            formaPago: { select: { nombre: true } },
          },
        },
      },
    });

    type CobroResumen = (typeof detalles)[number]['cobro'];

    const porCobro = new Map<
      number,
      { cobro: CobroResumen; importeImputado: Prisma.Decimal }
    >();

    for (const detalle of detalles) {
      const entrada = porCobro.get(detalle.cobro.id_cobro) ?? {
        cobro: detalle.cobro,
        importeImputado: new Prisma.Decimal(0),
      };
      entrada.importeImputado = entrada.importeImputado.plus(
        detalle.importe_imputado,
      );
      porCobro.set(detalle.cobro.id_cobro, entrada);
    }

    const historialOrdenado = [...porCobro.values()].sort(
      (a, b) => b.cobro.fecha_cobro.getTime() - a.cobro.fecha_cobro.getTime(),
    );

    const { page, limit } = query;
    const total = historialOrdenado.length;
    const pagina = historialOrdenado.slice(
      (page - 1) * limit,
      (page - 1) * limit + limit,
    );

    return {
      data: pagina.map((entrada) => ({
        id_cobro: entrada.cobro.id_cobro,
        fecha_cobro: entrada.cobro.fecha_cobro.toISOString(),
        origen: entrada.cobro.origen,
        estado: entrada.cobro.estado,
        forma_pago: entrada.cobro.formaPago,
        numero_referencia: entrada.cobro.numero_referencia,
        importe_imputado: entrada.importeImputado.toNumber(),
      })),
      meta: { total, page, limit },
    };
  }

  /**
   * Declaraciones de pago de UNA unidad del cliente (T117, HU-29), de la más
   * reciente a la más antigua, paginadas en la base. Mismo 404 genérico que
   * `historialPagosVenta` si la venta no es propia o no está VIGENTE.
   *
   * Se listan todas, cualquiera sea su estado: el cliente tiene que ver las
   * pendientes (todavía sin efecto en el saldo), las rechazadas (con el
   * motivo, para volver a declarar) y las validadas (con el estado del cobro
   * que generaron). El `FK_cliente` va también en el `where` además de la
   * venta, por las dudas: una declaración siempre es del dueño de la venta.
   */
  async declaracionesPagoVenta(
    idVenta: number,
    clienteId: number,
    query: QueryDeclaracionesPagoClienteDto,
  ) {
    await this.validarVentaDeCliente(idVenta, clienteId);

    const { page, limit } = query;
    const where: Prisma.DECLARACIONPAGOWhereInput = {
      FK_cliente: clienteId,
      cuota: { FK_venta: idVenta },
    };

    const [declaraciones, total] = await Promise.all([
      this.prisma.dECLARACIONPAGO.findMany({
        where,
        select: {
          id_declaracion_pago: true,
          estado: true,
          importe: true,
          numero_referencia: true,
          motivo_rechazo: true,
          hora_creacion: true,
          fecha_resolucion: true,
          // Nombre y tipo, nunca `comprobante_ruta`: la clave del objeto no
          // viaja al cliente (el archivo se sirve por un endpoint propio, T146).
          comprobante_nombre_archivo: true,
          comprobante_tipo: true,
          cuota: { select: { id_cuota: true, numero: true } },
          formaPago: { select: { nombre: true } },
          cobro: { select: { id_cobro: true, estado: true } },
        },
        // Desempate por id: dos declaraciones pueden compartir hora_creacion.
        orderBy: [{ hora_creacion: 'desc' }, { id_declaracion_pago: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dECLARACIONPAGO.count({ where }),
    ]);

    return {
      data: declaraciones.map((declaracion) => ({
        id_declaracion_pago: declaracion.id_declaracion_pago,
        estado: declaracion.estado,
        importe: declaracion.importe.toNumber(),
        numero_referencia: declaracion.numero_referencia,
        motivo_rechazo: declaracion.motivo_rechazo,
        hora_creacion: declaracion.hora_creacion.toISOString(),
        fecha_resolucion: declaracion.fecha_resolucion?.toISOString() ?? null,
        comprobante_nombre_archivo: declaracion.comprobante_nombre_archivo,
        comprobante_tipo: declaracion.comprobante_tipo,
        tiene_comprobante: declaracion.comprobante_tipo !== null,
        cuota: declaracion.cuota,
        forma_pago: declaracion.formaPago,
        cobro: declaracion.cobro,
      })),
      meta: { total, page, limit },
    };
  }

  /**
   * La venta con la forma del contrato (`ventaListItemSchema`): el plan
   * acordado sale de su PLANPAGO (`resolverPlanAcordado`), nunca del plan de
   * ejemplo ni de las columnas `*_congelado` de VENTA, que son legado.
   *
   * El saldo pendiente suma solo las cuotas no anuladas: una venta cancelada
   * conserva su plan y sus cuotas (ANULADA), pero ya no debe nada.
   */
  private mapearVenta(venta: {
    id_venta: number;
    planPago:
      | (NonNullable<VentaConPlanAcordado['planPago']> & {
          cuotas: {
            importe_interes: Prisma.Decimal;
            saldo_pendiente: Prisma.Decimal;
            estado: EstadoCuota;
          }[];
        })
      | null;
    fecha_venta: Date;
    estado: string;
    motivo_cancelacion: string | null;
    fecha_cancelacion: Date | null;
    FK_publicacion: number;
    cliente: {
      id_cliente: number;
      nombre: string;
      apellido: string | null;
      dni_cuil: string | null;
      email: string;
      telefono: string | null;
    };
    publicacion: {
      unidadFuncional: {
        id_unidad_funcional: number;
        identificador: string;
        tipologia: string;
        proyecto: { id_proyecto: number; codigo: string; nombre: string };
      };
    };
  }) {
    const { unidadFuncional } = venta.publicacion;
    const { proyecto, ...unidad } = unidadFuncional;
    const cuotas = venta.planPago?.cuotas ?? [];
    const plan = resolverPlanAcordado(venta, cuotas);

    const saldoPendiente = cuotas
      .filter((cuota) => cuota.estado !== EstadoCuota.ANULADA)
      .reduce(
        (acumulado, cuota) => acumulado.add(cuota.saldo_pendiente),
        new Prisma.Decimal(0),
      );

    return {
      id_venta: venta.id_venta,
      fecha_venta: venta.fecha_venta.toISOString(),
      estado: venta.estado,
      motivo_cancelacion: venta.motivo_cancelacion,
      fecha_cancelacion: venta.fecha_cancelacion?.toISOString() ?? null,
      cliente: venta.cliente,
      FK_publicacion: venta.FK_publicacion,
      unidad,
      proyecto,
      plan: mapearPlanAcordado(plan),
      saldo_pendiente: saldoPendiente.toNumber(),
    };
  }
}
