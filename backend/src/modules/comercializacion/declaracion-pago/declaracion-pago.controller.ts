import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DeclaracionPagoService } from './declaracion-pago.service';
import { CreateDeclaracionPagoDto } from './dto/create-declaracion-pago.dto';
import { DeclaracionPagoResponseDto } from './dto/declaracion-pago-response.dto';
import { ClienteAuthGuard } from '../cliente-auth/guards/cliente-auth.guard';
import { CurrentCliente } from '../cliente-auth/decorators/current-cliente.decorator';
import type { AuthenticatedCliente } from '../cliente-auth/strategies/cliente-jwt.strategy';
import { Public } from '../../../common/decorators/public.decorator';

/**
 * Mismo motivo que ClienteController: `@Public()` a nivel de clase porque
 * JwtAuthGuard/RolesGuard globales (APP_GUARD, strategy 'jwt' de USUARIO)
 * rechazarían un token de CLIENTE antes de llegar acá. La protección real es
 * `ClienteAuthGuard` (`@UseGuards` abajo), sobre la strategy 'jwt-cliente' —
 * ver el comentario completo en ClienteController.
 */
@ApiTags('Declaración de pago')
@Public()
@UseGuards(ClienteAuthGuard)
@Controller('cliente/declaraciones-pago')
export class DeclaracionPagoController {
  constructor(
    private readonly declaracionPagoService: DeclaracionPagoService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Declara un pago sobre una cuota propia, pendiente de validación por Tesorería (HU-29)',
    description:
      'Nace en estado PENDIENTE y no afecta el saldo de la cuota — eso ocurre recién si Tesorería la valida y la convierte en un cobro. No se admite sobre cuotas de una venta de contado.',
  })
  @ApiCreatedResponse({
    description: 'Declaración registrada, pendiente de validación',
    type: DeclaracionPagoResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos, faltan dni_cuil/teléfono del cliente, falta el número de referencia cuando la forma de pago lo requiere, o el importe supera el saldo pendiente de la cuota',
  })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @ApiNotFoundResponse({
    description:
      'No existe una cuota con ese id para este cliente, o no existe la forma de pago',
  })
  @ApiConflictResponse({
    description:
      'La venta de la cuota está cancelada, la venta es de contado (plan CONTADO: se paga de forma presencial, nunca por autogestión), la cuota no está pendiente ni parcial, o la forma de pago no está activa/habilitada para autogestión',
  })
  declarar(
    @Body() dto: CreateDeclaracionPagoDto,
    @CurrentCliente() cliente: AuthenticatedCliente,
  ) {
    return this.declaracionPagoService.declarar(dto, cliente.id);
  }
}
