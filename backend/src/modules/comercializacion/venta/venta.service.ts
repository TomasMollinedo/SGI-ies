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
  EstadoVenta,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { validarTelefonoSoloNumeros } from '../../../common/validaciones/telefono-solo-numeros';
import { validarDniCuilValido } from '../../../common/validaciones/dni-cuil-valido';
import { PublicacionService } from '../publicacion/publicacion.service';
import { generarCuotas } from '../plan-pago/motor-cuotas';
import { CreateVentaDto } from './dto/create-venta.dto';
import { CancelarVentaDto } from './dto/cancelar-venta.dto';
import { QueryVentaDto } from './dto/query-venta.dto';

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
   */
  private async buscarOCrearCliente(
    tx: Prisma.TransactionClient,
    datos: CreateVentaDto['cliente'],
  ) {
    validarTelefonoSoloNumeros(datos.telefono);
    validarDniCuilValido(datos.dni_cuil);

    const existente = await tx.cLIENTE.findFirst({
      where: this.clienteWhere({ dni_cuil: datos.dni_cuil, email: datos.email }),
      select: CLIENTE_SELECT,
    });
    if (existente) return existente;

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
   * Buscador del formulario de venta (HU-27): a diferencia de
   * `buscarOCrearCliente`, esto corre fuera de cualquier transacción y nunca
   * crea nada — el vendedor lo usa para saber, antes de completar el resto
   * del formulario, si el cliente ya existe (y así no volver a pedirle
   * nombre/teléfono) o si hay que darlo de alta. `dni_cuil`/`email` son
   * ambos opcionales en el query, pero `BuscarClienteQueryDto` exige que
   * venga al menos uno.
   */
  async buscarCliente(datos: { dni_cuil?: string; email?: string }) {
    const cliente = await this.prisma.cLIENTE.findFirst({
      where: this.clienteWhere(datos),
      select: CLIENTE_SELECT,
    });

    return { encontrado: cliente !== null, cliente };
  }

  /** Condición `OR` compartida por `buscarOCrearCliente` y `buscarCliente`, solo con los campos presentes. */
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
   * CONFIRMADO sobre alguna de sus cuotas. Las cuotas quedan ANULADA sin
   * borrarse, y la publicación vuelve a DISPONIBLE — misma transacción, mismo
   * mecanismo de `transicionarEstadoComercial` que en `crear`.
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

      // TODO(HU-29): antes de cancelar, verificar que no haya
      // DECLARACIONPAGO en estado PENDIENTE sobre las cuotas de esta venta.
      // HU-29 todavía no está integrada — hueco documentado a propósito.

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
