import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import {
  EstadoCuota,
  EstadoDeclaracionPago,
  EstadoVenta,
  OrigenCobro,
  ModalidadPago,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlmacenamientoService } from '../../almacenamiento/almacenamiento.service';
import {
  errorDelComprobante,
  esTipoComprobantePermitido,
  MENSAJE_COMPROBANTE_REQUERIDO,
} from '../../almacenamiento/comprobante.constants';
import { normalizarNombreComprobante } from './comprobante-archivo';
import { validarNumeroReferencia } from '../../../common/validaciones/validar-numero-referencia';
import { clienteTieneDatosCompletos } from '../cliente-auth/cliente-tiene-datos-completos';
import { FormaPagoService } from '../../tesoreria/forma-pago/forma-pago.service';
import { CobroService, type LineaCuotaParaCobro } from '../cobro/cobro.service';
import { CreateCobroDto } from '../cobro/dto/create-cobro.dto';
import {
  CONDICIONES_VENTA_SELECT,
  resolverCondicionesVenta,
} from '../venta/condiciones-venta';
import { CreateDeclaracionPagoDto } from './dto/create-declaracion-pago.dto';
import { RechazarDeclaracionPagoDto } from './dto/rechazar-declaracion-pago.dto';
import { QueryDeclaracionPagoDto } from './dto/query-declaracion-pago.dto';

const CUOTA_DECLARABLE_SELECT = {
  id_cuota: true,
  estado: true,
  saldo_pendiente: true,
  venta: { select: { estado: true, ...CONDICIONES_VENTA_SELECT } },
} as const;

type CuotaDeclarable = Prisma.CUOTAGetPayload<{
  select: typeof CUOTA_DECLARABLE_SELECT;
}>;

/**
 * `comprobante_ruta` es la clave del objeto en el bucket privado: no sale en
 * ninguna respuesta HTTP. Las escrituras que devuelven la fila la omiten con
 * esto.
 */
const SIN_RUTA_DEL_COMPROBANTE = { comprobante_ruta: true } as const;

type DeclaracionSinRuta = Prisma.DECLARACIONPAGOGetPayload<{
  omit: typeof SIN_RUTA_DEL_COMPROBANTE;
}>;

const COMPROBANTE_PARA_LEER_SELECT = {
  comprobante_ruta: true,
  comprobante_nombre_archivo: true,
  comprobante_tipo: true,
} as const;

/**
 * Lo que la bandeja de Tesorería necesita para cotejar una declaración sin
 * otra consulta. El cliente, con los mismos campos que
 * `CLIENTE_RESUMEN_SELECT` del listado de cobros.
 */
const DECLARACION_LIST_ITEM_SELECT = {
  id_declaracion_pago: true,
  FK_cliente: true,
  FK_cuota: true,
  FK_forma_pago: true,
  importe: true,
  numero_referencia: true,
  estado: true,
  motivo_rechazo: true,
  fecha_resolucion: true,
  FK_usuario_validador: true,
  FK_cobro: true,
  hora_creacion: true,
  // Sin `comprobante_ruta`: la clave del objeto no sale de la API.
  comprobante_nombre_archivo: true,
  comprobante_tipo: true,
  cliente: {
    select: {
      id_cliente: true,
      nombre: true,
      apellido: true,
      dni_cuil: true,
      email: true,
    },
  },
  cuota: {
    select: {
      id_cuota: true,
      numero: true,
      saldo_pendiente: true,
      venta: {
        select: {
          id_venta: true,
          publicacion: {
            select: {
              unidadFuncional: {
                select: {
                  identificador: true,
                  proyecto: { select: { nombre: true } },
                },
              },
            },
          },
        },
      },
    },
  },
  formaPago: { select: { nombre: true } },
  cobro: { select: { id_cobro: true, estado: true } },
} as const;

@Injectable()
export class DeclaracionPagoService {
  private readonly logger = new Logger(DeclaracionPagoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly formaPagoService: FormaPagoService,
    private readonly cobroService: CobroService,
    private readonly almacenamientoService: AlmacenamientoService,
  ) {}

  /**
   * Declara un pago sobre una cuota propia (HU-29). Valida en orden, de más
   * barato a más caro: que venga el comprobante, datos del cliente completos, que la cuota exista y
   * sea de este cliente, que su venta no esté cancelada ni sea de contado
   * (una venta de contado se paga presencialmente), que la cuota admita
   * una nueva declaración, que la forma de pago siga habilitada para
   * autogestión, que traiga referencia si la forma de pago la exige, y que
   * el importe no supere el saldo pendiente.
   *
   * Nace en estado PENDIENTE y no toca `CUOTA.saldo_pendiente` ni
   * `CUOTA.estado`: eso ocurre recién si Tesorería la valida y la convierte
   * en un `COBRO` (fuera de alcance acá).
   */
  async declarar(
    dto: CreateDeclaracionPagoDto,
    clienteId: number,
    comprobante: Express.Multer.File | undefined,
  ) {
    // Con la forma de un error de validación, para que el front lo muestre
    // debajo del campo. El tipo y el tamaño ya los validó el controller.
    if (!comprobante) {
      throw new BadRequestException(
        errorDelComprobante(MENSAJE_COMPROBANTE_REQUERIDO),
      );
    }

    const cliente = await this.buscarCliente(clienteId);
    this.validarDatosCompletos(cliente);

    const cuota = await this.buscarCuotaPropia(dto.FK_cuota, clienteId);
    this.validarVentaNoCancelada(cuota);
    this.validarVentaNoContado(cuota);
    this.validarCuotaDeclarable(cuota);

    const formaPago =
      await this.formaPagoService.buscarActivaHabilitadaAutogestion(
        dto.FK_forma_pago,
      );
    validarNumeroReferencia(dto.numero_referencia, formaPago);
    this.validarImporteNoSuperaSaldo(dto.importe, cuota);

    // Se sube recién cuando la declaración ya pasó todas las validaciones,
    // así un rechazo de negocio no sube nada. Igual puede quedar un archivo
    // huérfano si falla el alta en la base: por eso el try/catch de abajo.
    const { ruta } =
      await this.almacenamientoService.subirComprobante(comprobante);

    let declaracion: DeclaracionSinRuta;
    try {
      declaracion = await this.prisma.dECLARACIONPAGO.create({
        data: {
          FK_cliente: clienteId,
          FK_cuota: dto.FK_cuota,
          FK_forma_pago: dto.FK_forma_pago,
          importe: new Prisma.Decimal(dto.importe),
          numero_referencia: dto.numero_referencia,
          comprobante_ruta: ruta,
          comprobante_nombre_archivo: normalizarNombreComprobante(
            comprobante.originalname,
          ),
          // El tipo real: el controller ya lo pisó con el detectado por
          // contenido (`overrideMimeType`).
          comprobante_tipo: comprobante.mimetype,
        },
        omit: SIN_RUTA_DEL_COMPROBANTE,
      });
    } catch (error) {
      await this.eliminarComprobanteHuerfano(ruta);
      throw error;
    }

    return this.mapearRespuesta(declaracion);
  }

  /**
   * Borra el comprobante recién subido cuando el alta de la declaración
   * falló. Nunca tira: si el borrado también falla se loguea, para que quien
   * llama relance el error original y no este.
   */
  private async eliminarComprobanteHuerfano(ruta: string) {
    try {
      await this.almacenamientoService.eliminarComprobante(ruta);
    } catch (error) {
      this.logger.error(
        `No se pudo borrar el comprobante huérfano "${ruta}" del bucket`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * El comprobante de una declaración propia del cliente. Si no es suya,
   * responde el mismo 404 que si no existiera: un cliente no puede averiguar
   * qué comprobantes existen de otros.
   */
  async obtenerComprobanteDelCliente(id: number, clienteId: number) {
    const declaracion = await this.prisma.dECLARACIONPAGO.findFirst({
      where: { id_declaracion_pago: id, FK_cliente: clienteId },
      select: COMPROBANTE_PARA_LEER_SELECT,
    });

    return this.leerComprobante(declaracion);
  }

  /** El comprobante para Tesorería y Comercialización, sin filtrar por cliente. */
  async obtenerComprobanteInterno(id: number) {
    const declaracion = await this.prisma.dECLARACIONPAGO.findUnique({
      where: { id_declaracion_pago: id },
      select: COMPROBANTE_PARA_LEER_SELECT,
    });

    return this.leerComprobante(declaracion);
  }

  private async leerComprobante(
    declaracion: Prisma.DECLARACIONPAGOGetPayload<{
      select: typeof COMPROBANTE_PARA_LEER_SELECT;
    }> | null,
  ) {
    if (!declaracion?.comprobante_ruta) {
      throw new NotFoundException(
        'No existe un comprobante para esta declaración',
      );
    }

    const { contenido } = await this.almacenamientoService.leerComprobante(
      declaracion.comprobante_ruta,
    );

    return {
      contenido,
      // El tipo sale de la base y solo si está en la whitelist: cualquier
      // otro valor se sirve como binario genérico, que el navegador descarga
      // en vez de interpretar.
      tipo: esTipoComprobantePermitido(declaracion.comprobante_tipo)
        ? declaracion.comprobante_tipo
        : 'application/octet-stream',
      nombreArchivo: declaracion.comprobante_nombre_archivo ?? 'comprobante',
    };
  }

  /**
   * Bandeja de Tesorería (T117, HU-29): declaraciones con filtros
   * combinables por cliente, forma de pago, estado y período (sobre
   * `hora_creacion`), paginadas. Orden fijo de la más antigua a la más
   * reciente: es una cola de trabajo, lo primero que se declaró es lo
   * primero que hay que resolver. Sin resumen ni totales a propósito.
   */
  async listar(query: QueryDeclaracionPagoDto) {
    const {
      FK_cliente,
      FK_forma_pago,
      estado,
      fechaDesde,
      fechaHasta,
      page,
      limit,
    } = query;

    const where: Prisma.DECLARACIONPAGOWhereInput = {
      ...(FK_cliente !== undefined && { FK_cliente }),
      ...(FK_forma_pago !== undefined && { FK_forma_pago }),
      ...(estado !== undefined && { estado }),
      ...((fechaDesde !== undefined || fechaHasta !== undefined) && {
        hora_creacion: {
          ...(fechaDesde !== undefined && { gte: fechaDesde }),
          ...(fechaHasta !== undefined && { lte: fechaHasta }),
        },
      }),
    };

    const [declaraciones, total] = await Promise.all([
      this.prisma.dECLARACIONPAGO.findMany({
        where,
        select: DECLARACION_LIST_ITEM_SELECT,
        skip: (page - 1) * limit,
        take: limit,
        // Desempate por id: dos declaraciones pueden compartir hora_creacion.
        orderBy: [{ hora_creacion: 'asc' }, { id_declaracion_pago: 'asc' }],
      }),
      this.prisma.dECLARACIONPAGO.count({ where }),
    ]);

    return {
      data: declaraciones.map(({ cuota, formaPago, ...declaracion }) => {
        const { unidadFuncional } = cuota.venta.publicacion;
        return {
          ...declaracion,
          importe: declaracion.importe.toNumber(),
          tiene_comprobante: declaracion.comprobante_tipo !== null,
          cuota: {
            id_cuota: cuota.id_cuota,
            numero: cuota.numero,
            saldo_pendiente: cuota.saldo_pendiente.toNumber(),
          },
          venta: {
            id_venta: cuota.venta.id_venta,
            unidad: { identificador: unidadFuncional.identificador },
            proyecto: { nombre: unidadFuncional.proyecto.nombre },
          },
          forma_pago: formaPago,
        };
      }),
      meta: { total, page, limit },
    };
  }

  private async buscarCliente(clienteId: number) {
    return this.prisma.cLIENTE.findUniqueOrThrow({
      where: { id_cliente: clienteId },
    });
  }

  private validarDatosCompletos(cliente: {
    dni_cuil: string | null;
    telefono: string | null;
  }) {
    if (!clienteTieneDatosCompletos(cliente)) {
      throw new BadRequestException(
        'Completá tu DNI/CUIT y tu teléfono antes de declarar un pago',
      );
    }
  }

  /**
   * El `FK_cliente` va adentro del `where`, no como un chequeo aparte
   * después: si la cuota es de otro cliente, tiene que dar el mismo 404 que
   * si no existiera — nunca confirmarle a un cliente que una cuota ajena
   * existe.
   */
  private async buscarCuotaPropia(
    idCuota: number,
    clienteId: number,
  ): Promise<CuotaDeclarable> {
    const cuota = await this.prisma.cUOTA.findFirst({
      where: { id_cuota: idCuota, venta: { FK_cliente: clienteId } },
      select: CUOTA_DECLARABLE_SELECT,
    });

    if (!cuota) {
      throw new NotFoundException('No existe una cuota con ese id');
    }

    return cuota;
  }

  private validarVentaNoCancelada(cuota: CuotaDeclarable) {
    if (cuota.venta.estado === EstadoVenta.CANCELADA) {
      throw new ConflictException('La venta de esta cuota está cancelada');
    }
  }

  /**
   * Regla de negocio: una venta de contado se paga en una sola cuota, de forma
   * presencial — nunca por autogestión. Se miran las condiciones acordadas
   * en la venta (su plan de pago), vía `resolverCondicionesVenta`.
   */
  private validarVentaNoContado(cuota: CuotaDeclarable) {
    const { tipo_plan_congelado } = resolverCondicionesVenta(cuota.venta);
    if (tipo_plan_congelado === ModalidadPago.CONTADO) {
      throw new ConflictException(
        'La venta de esta cuota es de contado: el pago se hace de forma presencial y no admite declaraciones',
      );
    }
  }

  private validarCuotaDeclarable(cuota: CuotaDeclarable) {
    if (
      cuota.estado !== EstadoCuota.PENDIENTE &&
      cuota.estado !== EstadoCuota.PARCIAL
    ) {
      throw new ConflictException(
        `La cuota no admite una nueva declaración de pago (estado actual: ${cuota.estado})`,
      );
    }
  }

  /**
   * Primer chequeo de saldo, contra el valor leído en este mismo momento: el
   * segundo — repetido, por la carrera que puede vaciar la cuota entre que
   * se declara y que Tesorería valida — va del lado de la validación
   * (fuera de alcance acá).
   */
  private validarImporteNoSuperaSaldo(importe: number, cuota: CuotaDeclarable) {
    if (new Prisma.Decimal(importe).greaterThan(cuota.saldo_pendiente)) {
      throw new BadRequestException(
        `El importe declarado ($${importe.toFixed(2)}) supera el saldo pendiente de la cuota ($${cuota.saldo_pendiente.toFixed(2)})`,
      );
    }
  }

  /**
   * Rechaza una declaración PENDIENTE (Tesorería). No toca CUOTA ni COBRO —
   * una declaración rechazada nunca llegó a tener efecto en el saldo, así
   * que no hay nada que revertir. RECHAZADA no vuelve atrás: el cliente
   * tiene que declarar de nuevo si quiere reintentar (ver comentario de
   * `FK_cobro` en el schema de DECLARACIONPAGO).
   */
  async rechazar(
    id: number,
    dto: RechazarDeclaracionPagoDto,
    usuarioId: number,
  ) {
    await this.buscarDeclaracionPendiente(id);

    const actualizada = await this.prisma.dECLARACIONPAGO.update({
      where: { id_declaracion_pago: id },
      data: {
        estado: EstadoDeclaracionPago.RECHAZADA,
        motivo_rechazo: dto.motivo_rechazo,
        fecha_resolucion: new Date(),
        FK_usuario_validador: usuarioId,
      },
      omit: SIN_RUTA_DEL_COMPROBANTE,
    });

    return this.mapearRespuesta(actualizada);
  }

  /**
   * Valida una declaración PENDIENTE (Tesorería): la convierte en un `COBRO`
   * real de origen ECOMMERCE. Todo en una única transacción propia —
   * relectura con lock de la declaración, segunda verificación de saldo
   * (distinta de la que ya se hizo al declarar: acá se relee
   * `CUOTA.saldo_pendiente` fresca, por si cambió entre que se declaró y que
   * se valida), alta del cobro vía `CobroService.crearInterno` (mismo `tx`,
   * no uno nuevo — así el alta del cobro y el `estado → VALIDADA` de esta
   * declaración son atómicos de verdad, sin compensación manual) y el update
   * final de la declaración. Si cualquier paso falla, el `tx` entero
   * rollbackea — incluido el `COBRO` recién creado.
   *
   * Si el saldo ya no alcanza, es un 409 explícito: la declaración sigue
   * PENDIENTE, nunca se auto-rechaza — Tesorería la rechaza por su cuenta
   * con `rechazar`, con su propio motivo.
   */
  async validar(id: number, usuarioId: number) {
    const declaracionActualizada = await this.prisma.$transaction(
      async (tx) => {
        // Lock + confirmación atómica de que sigue PENDIENTE — mismo patrón
        // que el lock optimista de `CUOTA` en `CobroService.crearInterno`:
        // el WHERE lleva la condición, y `count === 0` distingue "alguien
        // más la resolvió mientras tanto" de "sigue como estaba". El
        // `data` es un no-op a propósito (reescribe el mismo estado): el
        // único fin de este `updateMany` es tomar el lock de fila.
        const { count } = await tx.dECLARACIONPAGO.updateMany({
          where: {
            id_declaracion_pago: id,
            estado: EstadoDeclaracionPago.PENDIENTE,
          },
          data: { estado: EstadoDeclaracionPago.PENDIENTE },
        });
        if (count === 0) {
          // count === 0 es "no existe" o "ya no está PENDIENTE": se
          // distingue con una lectura aparte solo para dar un mensaje
          // preciso, no para la lógica en sí.
          const existente = await tx.dECLARACIONPAGO.findUnique({
            where: { id_declaracion_pago: id },
          });
          if (!existente) {
            throw new NotFoundException(
              `No existe una declaración de pago con id ${id}`,
            );
          }
          throw new ConflictException(
            `La declaración ${id} no está PENDIENTE (estado actual: ${existente.estado}); no se puede validar`,
          );
        }

        const declaracion = await tx.dECLARACIONPAGO.findUniqueOrThrow({
          where: { id_declaracion_pago: id },
        });

        const cuota = await tx.cUOTA.findUniqueOrThrow({
          where: { id_cuota: declaracion.FK_cuota },
          select: {
            id_cuota: true,
            numero: true,
            saldo_pendiente: true,
            FK_venta: true,
          },
        });
        if (declaracion.importe.greaterThan(cuota.saldo_pendiente)) {
          throw new ConflictException(
            `El saldo pendiente de la cuota ${cuota.numero} ($${cuota.saldo_pendiente.toFixed(2)}) ya no alcanza para cubrir el importe declarado ($${declaracion.importe.toFixed(2)}); rechazá la declaración`,
          );
        }

        const dtoCobro: CreateCobroDto = {
          FK_cliente: declaracion.FK_cliente,
          FK_forma_pago: declaracion.FK_forma_pago,
          numero_referencia: declaracion.numero_referencia ?? undefined,
          importe_total: declaracion.importe.toNumber(),
          detalle: [
            {
              FK_cuota: declaracion.FK_cuota,
              importe_imputado: declaracion.importe.toNumber(),
            },
          ],
        };
        const cuotaPorId = new Map<number, LineaCuotaParaCobro>([
          [cuota.id_cuota, cuota],
        ]);

        const idCobro = await this.cobroService.crearInterno(
          dtoCobro,
          usuarioId,
          OrigenCobro.ECOMMERCE,
          tx,
          new Date(),
          cuotaPorId,
        );

        return tx.dECLARACIONPAGO.update({
          where: { id_declaracion_pago: id },
          data: {
            estado: EstadoDeclaracionPago.VALIDADA,
            FK_cobro: idCobro,
            FK_usuario_validador: usuarioId,
            fecha_resolucion: new Date(),
          },
          omit: SIN_RUTA_DEL_COMPROBANTE,
        });
      },
    );

    return this.mapearRespuesta(declaracionActualizada);
  }

  /**
   * Busca una declaración y confirma que esté PENDIENTE — 404 si no existe,
   * 409 si ya fue VALIDADA o RECHAZADA (no se puede resolver dos veces). Solo
   * la usa `rechazar`: `validar` necesita además tomar un lock de fila
   * dentro de su propia transacción, así que arma su propio chequeo
   * (`updateMany` + `count === 0`) en vez de reusar este helper.
   */
  private async buscarDeclaracionPendiente(id: number) {
    const declaracion = await this.prisma.dECLARACIONPAGO.findUnique({
      where: { id_declaracion_pago: id },
    });

    if (!declaracion) {
      throw new NotFoundException(
        `No existe una declaración de pago con id ${id}`,
      );
    }
    if (declaracion.estado !== EstadoDeclaracionPago.PENDIENTE) {
      throw new ConflictException(
        `La declaración ${id} no está PENDIENTE (estado actual: ${declaracion.estado}); no se puede rechazar`,
      );
    }

    return declaracion;
  }

  /**
   * Respuesta de `declarar`, `rechazar` y `validar`. Las consultas ya omiten
   * `comprobante_ruta`; se vuelve a quitar acá por si alguna vez llega igual
   * (una consulta nueva que se olvide del `omit`): la clave del objeto no
   * sale en ninguna respuesta.
   */
  private mapearRespuesta(declaracion: DeclaracionSinRuta) {
    const respuesta = {
      ...declaracion,
      importe: declaracion.importe.toNumber(),
      tiene_comprobante: declaracion.comprobante_tipo !== null,
    };
    delete (respuesta as { comprobante_ruta?: unknown }).comprobante_ruta;

    return respuesta;
  }
}
