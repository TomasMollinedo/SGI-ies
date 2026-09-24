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
import { generarCuotas } from '../plan-pago/motor-cuotas';
import { CreateVentaDto } from './dto/create-venta.dto';
import { CancelarVentaDto } from './dto/cancelar-venta.dto';
import { QueryVentaDto } from './dto/query-venta.dto';
import { QueryHistorialPagosClienteDto } from './dto/query-historial-pagos-cliente.dto';

/** Decimales de todo importe/porcentaje, igual que las columnas del schema. */
const DECIMALES = 2;

const CLIENTE_SELECT = {
  id_cliente: true,
  nombre: true,
  apellido: true,
  dni_cuil: true,
  email: true,
  telefono: true,
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
  ) {}

  /**
   * Registra una venta presencial (HU-27). Orden de validación exacto,
   * documentado también en el modelo VENTA del schema: cliente → publicación
   * vigente → disponible → plan activo → el plan es de esta publicación → no
   * hay otra venta vigente → crear venta → generar cuotas → pasar la
   * publicación a EN_PLAN_DE_PAGO. Todo en una sola transacción: si cualquier
   * paso falla, no queda nada a medio crear (nunca un cronograma parcial).
   */
  async crear(dto: CreateVentaDto, usuarioId: number) {
    const idVenta = await this.prisma.$transaction(async (tx) => {
      const cliente = await this.buscarOCrearCliente(tx, dto.cliente);

      const publicacion = await tx.pUBLICACIONUNIDAD.findUnique({
        where: { id_publicacion: dto.FK_publicacion },
      });
      if (!publicacion || !publicacion.vigente) {
        throw new ConflictException('La publicación no está vigente');
      }
      if (publicacion.estado_comercial !== EstadoComercial.DISPONIBLE) {
        throw new ConflictException(
          'La unidad no está disponible para la venta',
        );
      }

      const plan = await tx.pLANPAGO.findUnique({
        where: { id_plan_pago: dto.FK_plan_pago },
      });
      if (!plan || !plan.estado) {
        throw new ConflictException('El plan de pago está inactivado');
      }
      if (plan.FK_publicacion !== dto.FK_publicacion) {
        throw new ConflictException(
          'El plan de pago no pertenece a esta publicación',
        );
      }

      // Chequeo defensivo previo: por construcción, una publicación DISPONIBLE
      // no debería tener una venta vigente — el `transicionarEstadoComercial`
      // de más abajo es quien realmente lo garantiza contra condiciones de
      // carrera (ver comentario del constructor).
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

      const anticipoCongelado = this.resolverAnticipoMonto(plan);

      const venta = await tx.vENTA.create({
        data: {
          FK_cliente: cliente.id_cliente,
          FK_publicacion: dto.FK_publicacion,
          FK_plan_pago: dto.FK_plan_pago,
          precio_congelado: plan.precio,
          anticipo_congelado: anticipoCongelado,
          tipo_plan_congelado: plan.tipo,
          cantidad_cuotas_congelada: plan.cantidad_cuotas ?? 1,
          periodicidad_congelada: plan.periodicidad,
          FK_usuario_creador: usuarioId,
        },
      });

      const cuotas = generarCuotas({
        precio: plan.precio,
        tipo: plan.tipo,
        anticipo_monto: anticipoCongelado,
        cantidad_cuotas: plan.cantidad_cuotas,
        periodicidad: plan.periodicidad,
        fecha_venta: venta.fecha_adhesion,
      });

      await tx.cUOTA.createMany({
        data: cuotas.map((cuota) => ({
          FK_venta: venta.id_venta,
          numero: cuota.numero,
          importe: cuota.importe,
          fecha_vencimiento: cuota.fecha_vencimiento,
          saldo_pendiente: cuota.importe,
          estado: EstadoCuota.PENDIENTE,
        })),
      });

      // Última validación, y la única con garantía real contra condiciones de
      // carrera: si otra venta ganó la publicación entre que la leímos arriba
      // y este `updateMany`, acá tira ConflictException y revierte todo.
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
   * `PLANPAGO.anticipo_monto`/`anticipo_porcentaje` es uno u otro, nunca
   * ambos (regla de service de T105, no expresable en el schema). El motor de
   * cuotas solo acepta el monto ya resuelto — misma fórmula que
   * `PlanPagoService.resolverAnticipoMonto` (privada ahí, no reusable desde
   * acá).
   */
  private resolverAnticipoMonto(plan: {
    precio: Prisma.Decimal;
    anticipo_monto: Prisma.Decimal | null;
    anticipo_porcentaje: Prisma.Decimal | null;
  }): Prisma.Decimal {
    if (plan.anticipo_monto !== null) {
      return plan.anticipo_monto;
    }
    return plan.precio
      .mul(plan.anticipo_porcentaje ?? new Prisma.Decimal(0))
      .div(100)
      .toDecimalPlaces(DECIMALES);
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

      await tx.vENTA.update({
        where: { id_venta: idVenta },
        data: {
          estado: EstadoVenta.CANCELADA,
          motivo_cancelacion: dto.motivo_cancelacion,
          fecha_cancelacion: new Date(),
        },
      });

      await tx.cUOTA.updateMany({
        where: { FK_venta: idVenta },
        data: { estado: EstadoCuota.ANULADA },
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

  async listar(query: QueryVentaDto) {
    const {
      FK_cliente,
      FK_publicacion,
      FK_unidad_funcional,
      FK_proyecto,
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
      ...((FK_unidad_funcional !== undefined || FK_proyecto !== undefined) && {
        publicacion: {
          ...(FK_unidad_funcional !== undefined && { FK_unidad_funcional }),
          ...(FK_proyecto !== undefined && {
            unidadFuncional: { FK_proyecto },
          }),
        },
      }),
      ...((fechaDesde !== undefined || fechaHasta !== undefined) && {
        fecha_adhesion: {
          ...(fechaDesde !== undefined && { gte: fechaDesde }),
          ...(fechaHasta !== undefined && { lte: fechaHasta }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.vENTA.findMany({
        where,
        select: this.ventaSelect(),
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fecha_adhesion: 'desc' },
      }),
      this.prisma.vENTA.count({ where }),
    ]);

    return {
      data: data.map((venta) => this.mapearVenta(venta)),
      meta: { total, page, limit },
    };
  }

  async obtenerDetalle(idVenta: number) {
    const venta = await this.prisma.vENTA.findUnique({
      where: { id_venta: idVenta },
      select: {
        ...this.ventaSelect(),
        usuarioCreador: { select: { nombre: true, apellido: true } },
        cuotas: {
          select: {
            numero: true,
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

    return {
      ...this.mapearVenta(venta),
      usuarioCreador: venta.usuarioCreador,
      cuotas: venta.cuotas.map((cuota) => ({
        numero: cuota.numero,
        importe: cuota.importe.toNumber(),
        fecha_vencimiento: cuota.fecha_vencimiento.toISOString(),
        saldo_pendiente: cuota.saldo_pendiente.toNumber(),
        estado: cuota.estado,
      })),
    };
  }

  /**
   * `unidad`/`proyecto` viajan igual que en `PublicacionController.findAll`
   * (mismo `select` anidado sobre `publicacion.unidadFuncional`): sin esto,
   * el listado y el detalle de venta solo tenían `FK_publicacion`, un id sin
   * significado para quien mira la pantalla — no había forma de saber qué
   * unidad se vendió sin un pedido aparte por cada fila.
   */
  private ventaSelect() {
    return {
      id_venta: true,
      fecha_adhesion: true,
      precio_congelado: true,
      anticipo_congelado: true,
      tipo_plan_congelado: true,
      cantidad_cuotas_congelada: true,
      periodicidad_congelada: true,
      estado: true,
      motivo_cancelacion: true,
      fecha_cancelacion: true,
      FK_publicacion: true,
      FK_plan_pago: true,
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
        fecha_adhesion: true,
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
                    estado: true,
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
      orderBy: { fecha_adhesion: 'desc' },
    });

    const hoy = new Date();

    return { data: ventas.map((venta) => this.mapearVentaCliente(venta, hoy)) };
  }

  private mapearVentaCliente(
    venta: {
      id_venta: number;
      estado: string;
      fecha_adhesion: Date;
      publicacion: {
        unidadFuncional: {
          id_unidad_funcional: number;
          identificador: string;
          tipologia: string;
          proyecto: {
            id_proyecto: number;
            nombre: string;
            localidad: string;
            estado: EstadoProyecto;
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
      fecha_adhesion: venta.fecha_adhesion.toISOString(),
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
   * cabecera de `misVentas` + la unidad ampliada, el plan (condiciones
   * congeladas de la VENTA, nunca las de PLANPAGO) y el cronograma completo
   * de cuotas con `vencido`/`dias_vencido` ya resueltos.
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
        id_venta: true,
        estado: true,
        fecha_adhesion: true,
        precio_congelado: true,
        anticipo_congelado: true,
        tipo_plan_congelado: true,
        cantidad_cuotas_congelada: true,
        periodicidad_congelada: true,
        planPago: { select: { nombre: true } },
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
                    estado: true,
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
            numero: true,
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
        numero: cuota.numero,
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
      fecha_adhesion: venta.fecha_adhesion.toISOString(),
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
      plan: {
        nombre: venta.planPago.nombre,
        tipo: venta.tipo_plan_congelado,
        precio: venta.precio_congelado.toNumber(),
        anticipo: venta.anticipo_congelado.toNumber(),
        cantidad_cuotas: venta.cantidad_cuotas_congelada,
        periodicidad: venta.periodicidad_congelada,
      },
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

  private mapearVenta(venta: {
    id_venta: number;
    fecha_adhesion: Date;
    precio_congelado: Prisma.Decimal;
    anticipo_congelado: Prisma.Decimal;
    tipo_plan_congelado: string;
    cantidad_cuotas_congelada: number;
    periodicidad_congelada: string | null;
    estado: string;
    motivo_cancelacion: string | null;
    fecha_cancelacion: Date | null;
    FK_publicacion: number;
    FK_plan_pago: number;
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

    return {
      id_venta: venta.id_venta,
      fecha_adhesion: venta.fecha_adhesion.toISOString(),
      precio_congelado: venta.precio_congelado.toNumber(),
      anticipo_congelado: venta.anticipo_congelado.toNumber(),
      tipo_plan_congelado: venta.tipo_plan_congelado,
      cantidad_cuotas_congelada: venta.cantidad_cuotas_congelada,
      periodicidad_congelada: venta.periodicidad_congelada,
      estado: venta.estado,
      motivo_cancelacion: venta.motivo_cancelacion,
      fecha_cancelacion: venta.fecha_cancelacion?.toISOString() ?? null,
      cliente: venta.cliente,
      FK_publicacion: venta.FK_publicacion,
      FK_plan_pago: venta.FK_plan_pago,
      unidad,
      proyecto,
    };
  }
}
