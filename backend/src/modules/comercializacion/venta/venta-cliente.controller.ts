import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { VentaService } from './venta.service';
import { MisVentasResponseDto } from './dto/venta-cliente-response.dto';
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
}
