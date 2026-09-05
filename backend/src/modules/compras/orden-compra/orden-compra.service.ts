import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoOrdenCompra } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { UpdateOrdenCompraDto } from './dto/update-orden-compra.dto';

const PROVEEDOR_RESUMEN_SELECT = {
  id_proveedor: true,
  razon_social: true,
} as const;

const DEPOSITO_RESUMEN_SELECT = {
  id_deposito: true,
  nombre: true,
} as const;

const ARTICULO_RESUMEN_SELECT = {
  id_articulo: true,
  nombre: true,
} as const;

interface LineaEntrada {
  FK_articulo: number;
  cantidad: number;
  precio_unitario: number;
}

@Injectable()
export class OrdenCompraService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Alta en BORRADOR: cabecera + detalle en una sola escritura (Prisma la
   * envuelve en una transacción implícita, no hace falta `$transaction`
   * manual porque no hay ningún efecto secundario además de estas filas).
   *
   * `total` y `subtotal` los calcula siempre este método — el DTO de entrada
   * ni siquiera tiene esos campos, así que no hay forma de que el cliente los
   * manipule.
   */
  async create(dto: CreateOrdenCompraDto, usuarioId: number) {
    await this.validarProveedorActivo(dto.FK_proveedor);
    await this.validarDepositoActivo(dto.FK_deposito);
    await this.validarArticulosActivos(
      dto.detalle.map((linea) => linea.FK_articulo),
    );

    const { detalleConSubtotal, total } = this.calcularDetalle(dto.detalle);

    const orden = await this.prisma.oRDENCOMPRA.create({
      data: {
        fecha_emision: this.resolverFechaEmision(dto.fecha_emision),
        fecha_entrega_solicitada: dto.fecha_entrega_solicitada,
        observaciones: dto.observaciones,
        FK_proveedor: dto.FK_proveedor,
        FK_deposito: dto.FK_deposito,
        total,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
        detalles: { create: detalleConSubtotal },
      },
    });

    return this.findOne(orden.id_orden_compra);
  }

  /**
   * Edita cabecera y/o detalle — solo mientras la orden esté en BORRADOR: al
   * confirmarse (pasar a EMITIDA) deja de ser editable, eso lo exige la HU.
   *
   * Si viene `detalle`, reemplaza TODAS las líneas existentes por las nuevas
   * (no es un merge línea por línea) y recalcula el total; si no viene, el
   * detalle actual queda intacto.
   */
  async update(id: number, dto: UpdateOrdenCompraDto, usuarioId: number) {
    const orden = await this.findOne(id);

    if (orden.estado !== EstadoOrdenCompra.BORRADOR) {
      throw new ConflictException(
        'Solo se puede editar una orden de compra en estado BORRADOR',
      );
    }

    if (dto.fecha_emision !== undefined) {
      this.validarFechaEmisionNoFutura(dto.fecha_emision);
    }
    if (dto.FK_proveedor !== undefined) {
      await this.validarProveedorActivo(dto.FK_proveedor);
    }
    if (dto.FK_deposito !== undefined) {
      await this.validarDepositoActivo(dto.FK_deposito);
    }

    const nuevoDetalle =
      dto.detalle !== undefined
        ? await this.prepararDetalle(dto.detalle)
        : undefined;

    await this.prisma.oRDENCOMPRA.update({
      where: { id_orden_compra: id },
      data: {
        fecha_emision: dto.fecha_emision,
        fecha_entrega_solicitada: dto.fecha_entrega_solicitada,
        observaciones: dto.observaciones,
        FK_proveedor: dto.FK_proveedor,
        FK_deposito: dto.FK_deposito,
        ...(nuevoDetalle && {
          total: nuevoDetalle.total,
          detalles: {
            // Reemplaza el detalle completo: borra las líneas viejas de esta
            // orden y crea las nuevas ya calculadas.
            deleteMany: {},
            create: nuevoDetalle.detalleConSubtotal,
          },
        }),
        FK_usuario_actualizador: usuarioId,
        hora_actualizacion: new Date(),
      },
    });

    return this.findOne(id);
  }

  /** Detalle completo: cabecera + todas sus líneas con el artículo resuelto. */
  async findOne(id: number) {
    const orden = await this.prisma.oRDENCOMPRA.findUnique({
      where: { id_orden_compra: id },
      include: {
        proveedor: { select: PROVEEDOR_RESUMEN_SELECT },
        deposito: { select: DEPOSITO_RESUMEN_SELECT },
        detalles: {
          include: { articulo: { select: ARTICULO_RESUMEN_SELECT } },
          orderBy: { id_detalle_orden_compra: 'asc' },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException(`No existe una orden de compra con id ${id}`);
    }

    return orden;
  }

  /**
   * Confirma una orden en BORRADOR, pasándola a EMITIDA. A partir de acá
   * `update()` rechaza cualquier edición (su chequeo de estado ya cubre
   * esto: solo admite editar mientras está en BORRADOR).
   *
   * El "número correlativo" que pedía originalmente la HU es directamente
   * `id_orden_compra`: no hace falta asignar nada nuevo acá, la orden ya lo
   * tiene desde que se creó (ver el comentario en `schema.prisma` sobre por
   * qué el PK de Postgres ya alcanza, sin necesitar un servicio aparte).
   *
   * Todo el cambio va dentro de una transacción explícita, aunque hoy sea
   * una sola escritura: es el punto donde en el futuro se agregaría
   * cualquier otro efecto que tenga que ocurrir atómicamente junto con la
   * confirmación.
   */
  async confirmar(id: number, usuarioId: number) {
    const orden = await this.findOne(id);

    if (orden.estado !== EstadoOrdenCompra.BORRADOR) {
      throw new ConflictException(
        'Solo se puede confirmar una orden de compra en estado BORRADOR',
      );
    }

    this.validarPuedeConfirmarse(orden);

    await this.prisma.$transaction(async (tx) => {
      await tx.oRDENCOMPRA.update({
        where: { id_orden_compra: id },
        data: {
          estado: EstadoOrdenCompra.EMITIDA,
          FK_usuario_actualizador: usuarioId,
          hora_actualizacion: new Date(),
        },
      });
    });

    return this.findOne(id);
  }

  /**
   * Regla de HU-13: una orden necesita al menos una línea de detalle para
   * poder confirmarse — no para poder *crearse*, porque mientras está en
   * BORRADOR se admite ir agregando y sacando líneas (ver
   * `documentoOrdenCompraSchema`, sin `.min(1)` a propósito). La llama
   * `confirmar()` antes de hacer la transición de estado.
   */
  validarPuedeConfirmarse(orden: { detalles: unknown[] }) {
    if (orden.detalles.length === 0) {
      throw new ConflictException(
        'La orden de compra necesita al menos una línea de detalle para poder confirmarse',
      );
    }
  }

  private async prepararDetalle(detalle: LineaEntrada[]) {
    await this.validarArticulosActivos(
      detalle.map((linea) => linea.FK_articulo),
    );

    return this.calcularDetalle(detalle);
  }

  /**
   * Subtotal por línea (cantidad × precio_unitario) y total de la orden
   * (suma de subtotales), redondeados a 2 decimales para evitar el arrastre
   * de coma flotante (ej. `3 * 33.33` no da exactamente `99.99` en binario).
   */
  private calcularDetalle(detalle: LineaEntrada[]) {
    const detalleConSubtotal = detalle.map((linea) => ({
      FK_articulo: linea.FK_articulo,
      cantidad: linea.cantidad,
      precio_unitario: linea.precio_unitario,
      subtotal: this.redondear(linea.cantidad * linea.precio_unitario),
    }));

    const total = this.redondear(
      detalleConSubtotal.reduce(
        (acumulado, linea) => acumulado + linea.subtotal,
        0,
      ),
    );

    return { detalleConSubtotal, total };
  }

  private redondear(valor: number) {
    return Math.round(valor * 100) / 100;
  }

  /**
   * Si el cliente no manda fecha, se usa la de hoy. Nunca se acepta una
   * fecha futura: una orden de compra registra algo que se emite ahora, no
   * a futuro (mismo criterio que `resolverFechaMovimiento` en Movimiento).
   */
  private resolverFechaEmision(fecha: Date | undefined) {
    if (fecha === undefined) {
      return new Date();
    }

    this.validarFechaEmisionNoFutura(fecha);
    return fecha;
  }

  private validarFechaEmisionNoFutura(fecha: Date) {
    if (fecha > new Date()) {
      throw new BadRequestException('La fecha de emisión no puede ser futura');
    }
  }

  private async validarProveedorActivo(id: number) {
    const proveedor = await this.prisma.pROVEEDOR.findUnique({
      where: { id_proveedor: id },
    });

    if (!proveedor) {
      throw new NotFoundException(`No existe un proveedor con id ${id}`);
    }
    // Mismo criterio que el depósito y los artículos: el frontend ya filtra
    // proveedores activos en su selector, pero el backend es la última línea
    // de defensa (carrera con una baja concurrente, o un request que llega
    // directo sin pasar por ese formulario).
    if (!proveedor.estado) {
      throw new ConflictException(
        `El proveedor con id ${id} está dado de baja y no puede usarse en una orden de compra`,
      );
    }
  }

  private async validarDepositoActivo(id: number) {
    const deposito = await this.prisma.dEPOSITO.findUnique({
      where: { id_deposito: id },
    });

    if (!deposito) {
      throw new NotFoundException(`No existe un depósito con id ${id}`);
    }
    // El <select> del frontend ya filtra solo depósitos activos, pero eso no alcanza: alguien puede tener el formulario abierto con la lista vieja y el depósito se da de baja mientras tanto, o el request puede llegar directo (Swagger, Postman) sin pasar por ese formulario. El backend es la última línea de defensa, nunca hay que confiar en que el cliente ya
    // filtró esto.
    if (!deposito.estado) {
      throw new ConflictException(
        `El depósito con id ${id} está dado de baja y no puede usarse en una orden de compra`,
      );
    }
  }

  private async validarArticulosActivos(idsArticulo: number[]) {
    const ids = [...new Set(idsArticulo)];

    const articulos = await this.prisma.aRTICULO.findMany({
      where: { id_articulo: { in: ids } },
      select: { id_articulo: true, estado: true },
    });
    const encontrados = new Map(articulos.map((a) => [a.id_articulo, a]));
    const noEncontrados = ids.filter((id) => !encontrados.has(id));

    if (noEncontrados.length > 0) {
      throw new NotFoundException(
        `No existe un artículo con id: ${noEncontrados.join(', ')}`,
      );
    }

    // Mismo criterio que el depósito: el frontend ya filtra artículos
    // activos en su selector, pero el backend es la última línea de
    // defensa (carrera con una baja concurrente, o un request que llega
    // directo sin pasar por ese formulario).
    const inactivos = ids.filter((id) => !encontrados.get(id)!.estado);
    if (inactivos.length > 0) {
      throw new ConflictException(
        `El artículo con id ${inactivos.join(', ')} está dado de baja y no puede usarse en una orden de compra`,
      );
    }
  }
}
