import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { VentaService } from './venta.service';
import {
  HistorialPagosClienteResponseDto,
  MisVentasResponseDto,
  VentaClienteDetalleResponseDto,
} from './dto/venta-cliente-response.dto';
import { QueryHistorialPagosClienteDto } from './dto/query-historial-pagos-cliente.dto';
import { ClienteAuthGuard } from '../cliente-auth/guards/cliente-auth.guard';
import { CurrentCliente } from '../cliente-auth/decorators/current-cliente.decorator';
import type { AuthenticatedCliente } from '../cliente-auth/strategies/cliente-jwt.strategy';
import { Public } from '../../../common/decorators/public.decorator';

const MENSAJE_NO_AUTENTICADO = 'No autenticado';

/**
 * Seguimiento de compra del cliente autenticado (T112, HU-28). Mismo motivo
 * que ConsultaController/DeclaracionPagoController para el `@Public()` de
 * clase: JwtAuthGuard/RolesGuard globales (APP_GUARD) son de la strategy
 * 'jwt' de USUARIO y rechazarían un token de CLIENTE antes de llegar acá. La
 * protección real es `ClienteAuthGuard` (`@UseGuards` abajo), sobre la
 * strategy 'jwt-cliente'.
 *
 * Separado de `VentaController` (interno, `@Roles(ADMINISTRADOR)`) a
 * propósito: este controller nunca acepta un id de cliente por parámetro,
 * siempre el del propio token — el agujero clásico de una pantalla de perfil.
 */
@ApiTags('Ventas')
@Public()
@UseGuards(ClienteAuthGuard)
@Controller('cliente/ventas')
export class VentaClienteController {
  constructor(private readonly ventaService: VentaService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Unidades compradas por el cliente autenticado, con su saldo pendiente (HU-28)',
    description:
      'Solo ventas VIGENTE. Sin paginar: un cliente no acumula un volumen de unidades que lo justifique. "tiene_cuotas_vencidas" alcanza para la alerta de la tarjeta sin pedir el detalle completo de cada una.',
  })
  @ApiOkResponse({
    description: 'Listado de las unidades del cliente autenticado',
    type: MisVentasResponseDto,
  })
  @ApiUnauthorizedResponse({ description: MENSAJE_NO_AUTENTICADO })
  misVentas(@CurrentCliente() cliente: AuthenticatedCliente) {
    return this.ventaService.misVentas(cliente.id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Detalle de una unidad del cliente autenticado: plan de pago y cronograma completo de cuotas (HU-28)',
    description:
      'El historial de pagos vive aparte, paginado (GET /cliente/ventas/:id/historial-pagos). "id" es id_venta.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'id_venta' })
  @ApiOkResponse({
    description: 'Detalle de la venta',
    type: VentaClienteDetalleResponseDto,
  })
  @ApiUnauthorizedResponse({ description: MENSAJE_NO_AUTENTICADO })
  @ApiNotFoundResponse({
    description:
      'No existe una venta con ese id para este cliente (o no está vigente)',
  })
  detalle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentCliente() cliente: AuthenticatedCliente,
  ) {
    return this.ventaService.detalleVentaCliente(id, cliente.id);
  }

  @Get(':id/historial-pagos')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Historial de pagos de una unidad del cliente autenticado, del más reciente al más antiguo (HU-28)',
    description:
      'Un cobro que imputó a cuotas de dos unidades del mismo cliente aparece partido: acá solo con el subtotal imputado a ESTA unidad. Incluye cobros ANULADOS (con su estado, sin afectar el saldo).',
  })
  @ApiParam({ name: 'id', type: Number, description: 'id_venta' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Historial paginado de pagos de la unidad',
    type: HistorialPagosClienteResponseDto,
  })
  @ApiUnauthorizedResponse({ description: MENSAJE_NO_AUTENTICADO })
  @ApiNotFoundResponse({
    description:
      'No existe una venta con ese id para este cliente (o no está vigente)',
  })
  historialPagos(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryHistorialPagosClienteDto,
    @CurrentCliente() cliente: AuthenticatedCliente,
  ) {
    return this.ventaService.historialPagosVenta(id, cliente.id, query);
  }
}
