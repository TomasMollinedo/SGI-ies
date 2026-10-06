import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  EstadoCobro,
  EstadoCuota,
  EstadoDeclaracionPago,
  EstadoVenta,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { condicionBusquedaPorPalabras } from '../../../common/validaciones/busqueda-por-palabras';
import { calcularDiasVencido } from '../../../common/validaciones/dias-vencido';
import { validarTelefonoSoloNumeros } from '../../../common/validaciones/telefono-solo-numeros';
import { OFFSET_ARGENTINA_MS } from '../../../common/validaciones/offset-argentina';
import { USUARIO_RESUMEN_SELECT } from '../../../common/selects/usuario-resumen.select';
import { QueryClienteAdminDto } from './dto/query-cliente-admin.dto';
import { UpdateClienteAdminDto } from './dto/update-cliente-admin.dto';

/**
 * Campos contra los que corre la búsqueda de texto libre del listado. Cada
 * palabra puede matchear parcialmente cualquiera de los cuatro, así "Juan
 * Perez" encuentra a alguien con nombre="Juan" y apellido="Perez" aunque
 * ninguno de los dos campos contenga las dos palabras por sí solo (mismo
 * criterio que `VentaService.buscarClientes`).
 */
const CAMPOS_BUSCABLES = ['nombre', 'apellido', 'dni_cuil', 'email'] as const;

/** Datos de contacto del cliente, comunes al listado y a la ficha. */
const CLIENTE_DATOS_SELECT = {
  id_cliente: true,
  nombre: true,
  apellido: true,
  dni_cuil: true,
  email: true,
  telefono: true,
  // Solo para derivar `tiene_cuenta_google`: el id de Google no se expone.
  google_sub: true,
} as const satisfies Prisma.CLIENTESelect;

/** Indicadores calculados al consultar, nunca almacenados (HU-33). */
interface IndicadoresCliente {
  cantidad_ventas_vigentes: number;
  saldo_total_pendiente: Prisma.Decimal;
  en_mora: boolean;
}

/**
 * Listado y ficha de clientes para Comercialización (HU-33).
 *
 * Service separado de `ClienteAuthService` a propósito: este atiende al panel
 * interno (usuario de Comercialización autenticado con los guards globales de
 * USUARIO) y el otro al cliente del ecommerce, que entra con Google y su
 * propio guard. Mismo dominio, dos mecanismos de auth incompatibles — igual
 * que `ConsultaService` con `ConsultaController` y `ConsultaAdminController`.
 *
 * Las secciones de la ficha se leen con Prisma directo en vez de llamar a
 * `VentaService` / `CobroService` / `DeclaracionPagoService` /
 * `ConsultaService`: los `listar` de esos services son listados paginados con
 * su propio contrato HTTP (el de venta, además, con los nombres `*_congelado`
 * del Sprint 3), y la ficha necesita secciones sin paginar con otra forma.
 * Reusarlos obligaría a agregarles métodos nuevos, y esos módulos no se tocan
 * en esta tarea. Lo que la ficha NO hace es duplicar sus pantallas: devuelve
 * los identificadores para enlazar al detalle de cada venta y de cada cobro,
 * que ya existen.
 */
@Injectable()
export class ClienteAdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listado paginado, ordenado por apellido y después nombre.
   *
   * Los tres indicadores (cantidad de ventas vigentes, saldo total pendiente
   * y mora) se calculan al consultar, en DOS consultas en total y no una por
   * cliente: primero la página de clientes, y después UNA sola consulta que
   * trae las ventas vigentes de esos clientes con sus cuotas, que se agrupan
   * en memoria (ver `calcularIndicadores`).
   *
   * Todos los filtros —incluidos los que dependen de un valor calculado, mora
   * y con/sin compras— se resuelven en el `where` de Prisma, no filtrando en
   * memoria después de paginar: así `meta.total` cuenta exactamente las filas
   * que el filtro deja pasar. Filtrar después de paginar daría un total
   * incorrecto y páginas de distinto tamaño.
   */
  async listar(query: QueryClienteAdminDto) {
    const { busqueda, con_compras, en_mora, FK_proyecto, page, limit } = query;
    const hoy = new Date();
    const where = this.armarWhere({
      busqueda,
      con_compras,
      en_mora,
      FK_proyecto,
      hoy,
    });

    const [clientes, total] = await Promise.all([
      this.prisma.cLIENTE.findMany({
        where,
        select: CLIENTE_DATOS_SELECT,
        // `apellido` admite vacío (Google no siempre lo manda separado del
        // nombre): esos clientes van al final del listado, no al principio.
        orderBy: [
          { apellido: { sort: 'asc', nulls: 'last' } },
          { nombre: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cLIENTE.count({ where }),
    ]);

    const indicadores = await this.calcularIndicadores(
      clientes.map((cliente) => cliente.id_cliente),
      hoy,
    );

    return {
      data: clientes.map((cliente) => {
        const propios = indicadores.get(cliente.id_cliente);
        return {
          ...this.mapearDatosCliente(cliente),
          cantidad_ventas_vigentes: propios?.cantidad_ventas_vigentes ?? 0,
          saldo_total_pendiente: propios?.saldo_total_pendiente.toNumber() ?? 0,
          en_mora: propios?.en_mora ?? false,
        };
      }),
      meta: { total, page, limit },
    };
  }

  /**
   * Ficha del cliente en las cinco secciones de HU-33: datos personales,
   * ventas, cobros, declaraciones pendientes o rechazadas y consultas.
   *
   * Primero el cliente (para cortar con 404 sin pedir las secciones de un id
   * que no existe) y después las cuatro secciones en paralelo, que son
   * independientes entre sí.
   */
  async obtenerFicha(id: number) {
    const cliente = await this.prisma.cLIENTE.findUnique({
      where: { id_cliente: id },
      select: {
        ...CLIENTE_DATOS_SELECT,
        hora_creacion: true,
        hora_actualizacion: true,
        FK_usuario_actualizador: true,
        usuarioActualizador: { select: USUARIO_RESUMEN_SELECT },
      },
    });

    if (!cliente) {
      throw new NotFoundException(`No existe un cliente con id ${id}`);
    }

    const [ventas, cobros, declaraciones, consultas] = await Promise.all([
      this.obtenerVentas(id),
      this.obtenerCobros(id),
      this.obtenerDeclaraciones(id),
      this.obtenerConsultas(id),
    ]);

    return {
      ...this.mapearDatosCliente(cliente),
      fecha_alta: cliente.hora_creacion.toISOString(),
      hora_actualizacion: cliente.hora_actualizacion?.toISOString() ?? null,
      // Auditoría estándar del proyecto: usuario y fecha de la ÚLTIMA
      // modificación, sin historial de valores anteriores — propuesta del
      // equipo para OBS-01, todavía sin respuesta de las POs. Si piden el
      // historial completo, es una tabla nueva, no un cambio acá.
      FK_usuario_actualizador: cliente.FK_usuario_actualizador,
      usuarioActualizador: cliente.usuarioActualizador,
      ventas,
      cobros,
      declaraciones,
      consultas,
    };
  }

  /**
   * Modo EDICIÓN de la ficha. Solo nombre, apellido, DNI/CUIL, teléfono y
   * correo: no hay alta ni baja de clientes en este módulo (nacen del login
   * con Google o del alta al registrar una venta presencial, y conservan su
   * historial para siempre).
   *
   * El `usuarioId` llega como parámetro desde `@CurrentUser()`, nunca del
   * body: es lo que queda registrado en `FK_usuario_actualizador`. Cuando la
   * modificación la hace el propio cliente desde el ecommerce ese campo queda
   * vacío y solo se registra la fecha — ese es el otro camino
   * (`ClienteAuthService.actualizarDatos`), que esta tarea no toca (propuesta
   * del equipo para OBS-25, pendiente de respuesta).
   *
   * Devuelve la ficha completa para que el frontend re-renderice la pantalla
   * con los datos ya guardados sin pedirla de nuevo.
   */
  async actualizar(id: number, dto: UpdateClienteAdminDto, usuarioId: number) {
    const cliente = await this.prisma.cLIENTE.findUnique({
      where: { id_cliente: id },
      select: { id_cliente: true, google_sub: true },
    });

    if (!cliente) {
      throw new NotFoundException(`No existe un cliente con id ${id}`);
    }

    if (dto.telefono !== undefined) {
      validarTelefonoSoloNumeros(dto.telefono);
    }

    // OBS-26 (pendiente de respuesta): se PERMITE corregir el DNI/CUIL aunque
    // el cliente ya tenga ventas registradas, porque el caso real es arreglar
    // un error de carga. Si las POs deciden restringirlo a clientes sin
    // ventas, el cambio es un solo `if` acá.
    if (dto.dni_cuil !== undefined) {
      await this.validarDniCuilUnico(dto.dni_cuil, id);
    }

    if (dto.email !== undefined) {
      this.validarCorreoEditable(cliente.google_sub);
      await this.validarEmailUnico(dto.email, id);
    }

    await this.prisma.cLIENTE.update({
      where: { id_cliente: id },
      data: {
        ...dto,
        FK_usuario_actualizador: usuarioId,
        // CLIENTE.hora_actualizacion no es `@updatedAt`: se setea a mano,
        // igual que en el resto de los módulos del proyecto.
        hora_actualizacion: new Date(),
      },
    });

    return this.obtenerFicha(id);
  }

  /**
   * Un `AND` de condiciones independientes en vez de un objeto literal con
   * una clave por filtro: tres de los cuatro filtros navegan por la relación
   * `ventas`, y en un solo objeto la última clave `ventas` pisaría a las
   * anteriores.
   */
  private armarWhere(filtros: {
    busqueda?: string;
    con_compras?: boolean;
    en_mora?: boolean;
    FK_proyecto?: number;
    hoy: Date;
  }): Prisma.CLIENTEWhereInput {
    const condiciones: Prisma.CLIENTEWhereInput[] = [];
    const { busqueda } = filtros;

    if (busqueda !== undefined) {
      condiciones.push({
        OR: CAMPOS_BUSCABLES.map((campo) =>
          condicionBusquedaPorPalabras<Prisma.CLIENTEWhereInput>(
            campo,
            busqueda,
          ),
        ),
      });
    }

    // "Sin compras" son los interesados que se registraron o consultaron sin
    // comprar nunca: ninguna venta, de ningún estado. Una venta cancelada
    // igual fue una compra, así que no vuelve al cliente "sin compras".
    if (filtros.con_compras === true) {
      condiciones.push({ ventas: { some: {} } });
    }
    if (filtros.con_compras === false) {
      condiciones.push({ ventas: { none: {} } });
    }

    if (filtros.FK_proyecto !== undefined) {
      condiciones.push({
        ventas: {
          some: {
            publicacion: {
              unidadFuncional: { FK_proyecto: filtros.FK_proyecto },
            },
          },
        },
      });
    }

    if (filtros.en_mora !== undefined) {
      const condicionMora = this.condicionMora(filtros.hoy);
      condiciones.push(
        filtros.en_mora ? condicionMora : { NOT: condicionMora },
      );
    }

    return condiciones.length > 0 ? { AND: condiciones } : {};
  }

  /**
   * "En mora" = al menos una cuota vencida con saldo pendiente en una venta
   * VIGENTE. Las cuotas ANULADA (de una venta cancelada) no generan mora, y
   * una cuota saldada tampoco, aunque su fecha ya haya pasado.
   *
   * `fecha_vencimiento < inicioDelDiaArgentina` es la traducción a SQL del
   * criterio de `calcularDiasVencido`, que es el que usa el resto del
   * proyecto: ahí "vencido" es `dias > 0`, o sea que el día calendario del
   * vencimiento quedó estrictamente antes del día calendario de Argentina. Se
   * escribe como condición de Prisma, y no filtrando en memoria, porque si no
   * `meta.total` del listado no coincidiría con las filas devueltas.
   */
  private condicionMora(hoy: Date): Prisma.CLIENTEWhereInput {
    return {
      ventas: {
        some: {
          estado: EstadoVenta.VIGENTE,
          planPago: {
            cuotas: {
              some: {
                estado: { not: EstadoCuota.ANULADA },
                saldo_pendiente: { gt: 0 },
                fecha_vencimiento: { lt: this.inicioDelDiaArgentina(hoy) },
              },
            },
          },
        },
      },
    };
  }

  /**
   * Medianoche del día calendario de Argentina, expresada en UTC. Es el corte
   * que hace equivalente la condición SQL de mora al cálculo en memoria de
   * `calcularDiasVencido` (ver `condicionMora`). No se lee la zona horaria del
   * proceso de Node: sale de `OFFSET_ARGENTINA_MS`, igual que el resto del
   * proyecto.
   */
  private inicioDelDiaArgentina(hoy: Date): Date {
    const hoyArgentina = new Date(hoy.getTime() + OFFSET_ARGENTINA_MS);
    return new Date(
      Date.UTC(
        hoyArgentina.getUTCFullYear(),
        hoyArgentina.getUTCMonth(),
        hoyArgentina.getUTCDate(),
      ),
    );
  }

  /**
   * Los tres indicadores de toda la página en UNA consulta: trae las ventas
   * VIGENTE de los clientes de la página con las cuotas de su plan de pago, y
   * las agrupa por cliente en memoria. La alternativa —una consulta de cuotas
   * por cliente dentro de un `map`— serían N+1 consultas por página.
   *
   * El saldo llega por `PLANPAGO` (`CUOTA.FK_plan_pago`), nunca por
   * `CUOTA.FK_venta`, que es legado y lo elimina T159. Se suma
   * `saldo_pendiente` (lo que falta pagar de cada cuota, que mueven los
   * cobros) y no `saldo_capital` (la deuda del plan después de esa cuota, que
   * es fija).
   */
  private async calcularIndicadores(idsCliente: number[], hoy: Date) {
    const indicadores = new Map<number, IndicadoresCliente>(
      idsCliente.map((id) => [
        id,
        {
          cantidad_ventas_vigentes: 0,
          saldo_total_pendiente: new Prisma.Decimal(0),
          en_mora: false,
        },
      ]),
    );

    if (idsCliente.length === 0) {
      return indicadores;
    }

    const ventas = await this.prisma.vENTA.findMany({
      where: { FK_cliente: { in: idsCliente }, estado: EstadoVenta.VIGENTE },
      select: {
        FK_cliente: true,
        planPago: {
          select: {
            cuotas: {
              where: { estado: { not: EstadoCuota.ANULADA } },
              select: { saldo_pendiente: true, fecha_vencimiento: true },
            },
          },
        },
      },
    });

    for (const venta of ventas) {
      // El Map nace con una entrada por cliente de la página y el `where` solo
      // trae ventas de esos clientes, así que la entrada siempre existe.
      const propios = indicadores.get(venta.FK_cliente);
      if (propios === undefined) continue;

      propios.cantidad_ventas_vigentes += 1;

      for (const cuota of venta.planPago?.cuotas ?? []) {
        propios.saldo_total_pendiente = propios.saldo_total_pendiente.plus(
          cuota.saldo_pendiente,
        );
        // Una cuota saldada nunca cuenta como vencida aunque su fecha ya haya
        // pasado — mismo criterio que `VentaService`.
        if (
          cuota.saldo_pendiente.greaterThan(0) &&
          calcularDiasVencido(cuota.fecha_vencimiento, hoy).vencido
        ) {
          propios.en_mora = true;
        }
      }
    }

    return indicadores;
  }

  /** `tiene_cuenta_google` se deriva de `google_sub`: no es una columna. */
  private mapearDatosCliente(cliente: {
    id_cliente: number;
    nombre: string;
    apellido: string | null;
    dni_cuil: string | null;
    email: string;
    telefono: string | null;
    google_sub: string | null;
  }) {
    const { google_sub, ...datos } = cliente;
    return { ...datos, tiene_cuenta_google: google_sub !== null };
  }

  /**
   * Sección (b): ventas vigentes y canceladas. Las condiciones (modalidad,
   * cantidad de cuotas, TNA) salen del PLANPAGO, nunca de las columnas
   * `*_congelado` de VENTA, que son legado y las elimina T159.
   */
  private async obtenerVentas(idCliente: number) {
    const ventas = await this.prisma.vENTA.findMany({
      where: { FK_cliente: idCliente },
      select: {
        id_venta: true,
        fecha_venta: true,
        estado: true,
        planPago: {
          select: {
            id_plan_pago: true,
            modalidad: true,
            cantidad_cuotas: true,
            tasa_nominal_anual: true,
            cuotas: {
              where: { estado: { not: EstadoCuota.ANULADA } },
              select: { saldo_pendiente: true },
            },
          },
        },
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
      },
      orderBy: [{ fecha_venta: 'desc' }, { id_venta: 'desc' }],
    });

    return ventas.map((venta) => {
      const planPago = this.exigirPlanPago(venta.id_venta, venta.planPago);
      const { proyecto, ...unidad } = venta.publicacion.unidadFuncional;
      const saldoPendiente = planPago.cuotas.reduce(
        (acumulado, cuota) => acumulado.plus(cuota.saldo_pendiente),
        new Prisma.Decimal(0),
      );

      return {
        id_venta: venta.id_venta,
        id_plan_pago: planPago.id_plan_pago,
        fecha_venta: venta.fecha_venta.toISOString(),
        estado: venta.estado,
        modalidad: planPago.modalidad,
        cantidad_cuotas: planPago.cantidad_cuotas,
        tasa_nominal_anual: planPago.tasa_nominal_anual?.toNumber() ?? null,
        saldo_pendiente: saldoPendiente.toNumber(),
        unidad,
        proyecto,
      };
    });
  }

  /**
   * Misma invariante que `resolverCondicionesVenta`: toda venta nace con su
   * plan de pago en la misma transacción, así que una venta sin plan es un
   * dato inconsistente y no un error del usuario — por eso 500 y no 404.
   */
  private exigirPlanPago<T>(idVenta: number, planPago: T | null): T {
    if (planPago === null) {
      throw new InternalServerErrorException(
        `La venta ${idVenta} no tiene plan de pago`,
      );
    }
    return planPago;
  }

  /**
   * Sección (c): cobros recibidos, presenciales (HU-30) y del ecommerce
   * (HU-29). Deja afuera los BORRADOR: todavía los está armando Tesorería, no
   * movieron ningún saldo y no son un cobro recibido. Los ANULADO sí van, con
   * su estado a la vista, porque son parte del historial del cliente.
   */
  private async obtenerCobros(idCliente: number) {
    const cobros = await this.prisma.cOBRO.findMany({
      where: { FK_cliente: idCliente, estado: { not: EstadoCobro.BORRADOR } },
      select: {
        id_cobro: true,
        fecha_cobro: true,
        importe_total: true,
        origen: true,
        estado: true,
        numero_referencia: true,
        formaPago: { select: { id_forma_pago: true, nombre: true } },
      },
      orderBy: [{ fecha_cobro: 'desc' }, { id_cobro: 'desc' }],
    });

    return cobros.map(({ formaPago, ...cobro }) => ({
      ...cobro,
      fecha_cobro: cobro.fecha_cobro.toISOString(),
      importe_total: cobro.importe_total.toNumber(),
      forma_pago: formaPago,
    }));
  }

  /**
   * Sección (d): solo declaraciones PENDIENTE o RECHAZADA, como pide la HU
   * (una VALIDADA ya figura como cobro en la sección anterior).
   *
   * Del comprobante viajan los metadatos (nombre y tipo del archivo), nunca
   * `comprobante_ruta`: esa es la clave del objeto en el bucket privado. El
   * endpoint que entrega el archivo, y el control de quién puede verlo, son
   * T146 — acá va el `id_declaracion_pago` con el que esa tarea lo va a
   * pedir. Que Comercialización pueda verlo (además del cliente y de
   * Tesorería) es la propuesta del equipo para OBS-18, todavía sin respuesta.
   *
   * La venta de la declaración se resuelve por `planPago.FK_venta`, no por
   * `CUOTA.FK_venta`, que es legado y lo elimina T159.
   */
  private async obtenerDeclaraciones(idCliente: number) {
    const declaraciones = await this.prisma.dECLARACIONPAGO.findMany({
      where: {
        FK_cliente: idCliente,
        estado: {
          in: [
            EstadoDeclaracionPago.PENDIENTE,
            EstadoDeclaracionPago.RECHAZADA,
          ],
        },
      },
      select: {
        id_declaracion_pago: true,
        hora_creacion: true,
        importe: true,
        estado: true,
        numero_referencia: true,
        motivo_rechazo: true,
        comprobante_ruta: true,
        comprobante_nombre_archivo: true,
        comprobante_tipo: true,
        formaPago: { select: { id_forma_pago: true, nombre: true } },
        cuota: {
          select: {
            id_cuota: true,
            numero: true,
            planPago: { select: { FK_venta: true } },
          },
        },
      },
      orderBy: [{ hora_creacion: 'desc' }, { id_declaracion_pago: 'desc' }],
    });

    return declaraciones.map((declaracion) => ({
      id_declaracion_pago: declaracion.id_declaracion_pago,
      fecha: declaracion.hora_creacion.toISOString(),
      importe: declaracion.importe.toNumber(),
      estado: declaracion.estado,
      numero_referencia: declaracion.numero_referencia,
      motivo_rechazo: declaracion.motivo_rechazo,
      forma_pago: declaracion.formaPago,
      cuota: {
        id_cuota: declaracion.cuota.id_cuota,
        numero: declaracion.cuota.numero,
      },
      id_venta: declaracion.cuota.planPago.FK_venta,
      comprobante:
        declaracion.comprobante_ruta === null
          ? null
          : {
              nombre_archivo: declaracion.comprobante_nombre_archivo,
              tipo: declaracion.comprobante_tipo,
            },
    }));
  }

  /**
   * Sección (e): consultas sobre unidades (HU-26), con su estado y su
   * respuesta. Van todas, respondidas y pendientes, incluidas las de unidades
   * ya despublicadas: no se borran nunca.
   */
  private async obtenerConsultas(idCliente: number) {
    const consultas = await this.prisma.cONSULTAUNIDAD.findMany({
      where: { FK_cliente: idCliente },
      select: {
        id_consulta: true,
        hora_creacion: true,
        texto: true,
        estado: true,
        respuesta: true,
        fecha_respuesta: true,
        FK_publicacion: true,
        publicacion: {
          select: {
            unidadFuncional: {
              select: {
                id_unidad_funcional: true,
                identificador: true,
                proyecto: { select: { id_proyecto: true, nombre: true } },
              },
            },
          },
        },
      },
      orderBy: [{ hora_creacion: 'desc' }, { id_consulta: 'desc' }],
    });

    return consultas.map((consulta) => {
      const { proyecto, ...unidad } = consulta.publicacion.unidadFuncional;
      return {
        id_consulta: consulta.id_consulta,
        fecha: consulta.hora_creacion.toISOString(),
        texto: consulta.texto,
        estado: consulta.estado,
        respuesta: consulta.respuesta,
        fecha_respuesta: consulta.fecha_respuesta?.toISOString() ?? null,
        FK_publicacion: consulta.FK_publicacion,
        unidad,
        proyecto,
      };
    });
  }

  /**
   * Con cuenta de Google vinculada el correo es la identidad de acceso del
   * cliente: cambiarlo desde el panel interno lo dejaría sin poder entrar al
   * ecommerce, porque el login busca por email para vincular la cuenta. Es un
   * conflicto con el estado del cliente, no un body mal armado: por eso 409 y
   * no 400.
   */
  private validarCorreoEditable(googleSub: string | null): void {
    if (googleSub !== null) {
      throw new ConflictException(
        'El correo no se puede modificar: el cliente tiene una cuenta de Google vinculada y ese correo es su identidad de acceso. Solo el propio cliente puede cambiarlo desde su cuenta de Google',
      );
    }
  }

  /** El DNI/CUIL no puede repetirse entre clientes (HU-33). */
  private async validarDniCuilUnico(dniCuil: string, idExcluido: number) {
    const existente = await this.prisma.cLIENTE.findFirst({
      where: { dni_cuil: dniCuil, id_cliente: { not: idExcluido } },
      select: { id_cliente: true },
    });

    if (existente !== null) {
      throw new ConflictException(
        `Ya existe otro cliente registrado con el DNI/CUIL ${dniCuil}`,
      );
    }
  }

  /** El correo identifica al cliente de forma unívoca: no se puede repetir. */
  private async validarEmailUnico(email: string, idExcluido: number) {
    const existente = await this.prisma.cLIENTE.findFirst({
      where: { email, id_cliente: { not: idExcluido } },
      select: { id_cliente: true },
    });

    if (existente !== null) {
      throw new ConflictException(
        `Ya existe otro cliente registrado con el correo ${email}`,
      );
    }
  }
}
