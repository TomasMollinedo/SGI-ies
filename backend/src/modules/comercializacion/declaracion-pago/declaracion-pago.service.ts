import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { EstadoCuota, EstadoVenta } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { clienteTieneDatosCompletos } from '../cliente-auth/cliente-tiene-datos-completos';
import { FormaPagoService } from '../../tesoreria/forma-pago/forma-pago.service';
import { CreateDeclaracionPagoDto } from './dto/create-declaracion-pago.dto';

const CUOTA_DECLARABLE_SELECT = {
  id_cuota: true,
  estado: true,
  saldo_pendiente: true,
  venta: { select: { estado: true } },
} as const;

type CuotaDeclarable = Prisma.CUOTAGetPayload<{
  select: typeof CUOTA_DECLARABLE_SELECT;
}>;

@Injectable()
export class DeclaracionPagoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly formaPagoService: FormaPagoService,
  ) {}

  /**
   * Declara un pago sobre una cuota propia (HU-29). Valida en orden, de más
   * barato a más caro: datos del cliente completos, que la cuota exista y
   * sea de este cliente, que su venta no esté cancelada, que la cuota admita
   * una nueva declaración, que la forma de pago siga habilitada para
   * autogestión, que traiga referencia si la forma de pago la exige, y que
   * el importe no supere el saldo pendiente.
   *
   * Nace en estado PENDIENTE y no toca `CUOTA.saldo_pendiente` ni
   * `CUOTA.estado`: eso ocurre recién si Tesorería la valida y la convierte
   * en un `COBRO` (fuera de alcance acá).
   */
  async declarar(dto: CreateDeclaracionPagoDto, clienteId: number) {
    const cliente = await this.buscarCliente(clienteId);
    this.validarDatosCompletos(cliente);

    const cuota = await this.buscarCuotaPropia(dto.FK_cuota, clienteId);
    this.validarVentaNoCancelada(cuota);
    this.validarCuotaDeclarable(cuota);

    const formaPago =
      await this.formaPagoService.buscarActivaHabilitadaAutogestion(
        dto.FK_forma_pago,
      );
    this.validarNumeroReferencia(dto.numero_referencia, formaPago);
    this.validarImporteNoSuperaSaldo(dto.importe, cuota);

    const declaracion = await this.prisma.dECLARACIONPAGO.create({
      data: {
        FK_cliente: clienteId,
        FK_cuota: dto.FK_cuota,
        FK_forma_pago: dto.FK_forma_pago,
        importe: new Prisma.Decimal(dto.importe),
        numero_referencia: dto.numero_referencia,
      },
    });

    return { ...declaracion, importe: declaracion.importe.toNumber() };
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

  private validarNumeroReferencia(
    numeroReferencia: string | undefined,
    formaPago: { requiere_referencia: boolean; nombre: string },
  ) {
    if (formaPago.requiere_referencia && !numeroReferencia) {
      throw new BadRequestException(
        `La forma de pago "${formaPago.nombre}" requiere un número de referencia`,
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
}
