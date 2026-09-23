import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DeclaracionPagoService } from './declaracion-pago.service';
import { RechazarDeclaracionPagoDto } from './dto/rechazar-declaracion-pago.dto';
import { DeclaracionPagoResponseDto } from './dto/declaracion-pago-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

/**
 * Contraparte interna de DeclaracionPagoController (que es 100% de cliente):
 * acá Tesorería resuelve las declaraciones PENDIENTES. Controller separado
 * a propósito — mismo dominio, pero mecanismo de auth completamente
 * distinto (JwtAuthGuard/RolesGuard globales de USUARIO, no
 * ClienteAuthGuard), así que no puede mezclarse en un solo controller.
 */
@ApiTags('Declaración de pago')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('declaraciones-pago')
export class DeclaracionPagoAdminController {
  constructor(
    private readonly declaracionPagoService: DeclaracionPagoService,
  ) {}

  @Patch(':id/rechazar')
  @ApiOperation({
    summary: 'Rechaza una declaración de pago PENDIENTE (HU-29)',
    description:
      'No toca CUOTA ni COBRO: una declaración rechazada nunca tuvo efecto en el saldo. No se puede rechazar dos veces ni revertir una ya validada.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_declaracion_pago de la declaración a rechazar',
  })
  @ApiOkResponse({
    description: 'Declaración rechazada',
    type: DeclaracionPagoResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe una declaración de pago con ese id',
  })
  @ApiConflictResponse({
    description:
      'La declaración no está PENDIENTE (ya fue validada o rechazada)',
  })
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarDeclaracionPagoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.declaracionPagoService.rechazar(id, dto, user.id);
  }

  @Patch(':id/validar')
  @ApiOperation({
    summary:
      'Valida una declaración de pago PENDIENTE: la convierte en un cobro real de origen ECOMMERCE (HU-29)',
    description:
      'Revalida el saldo pendiente de la cuota en el momento de validar (puede haber cambiado desde que se declaró). Si ya no alcanza, devuelve 409 y la declaración queda PENDIENTE — no se auto-rechaza, hay que usar el endpoint de rechazo.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_declaracion_pago de la declaración a validar',
  })
  @ApiOkResponse({
    description: 'Declaración validada, con el cobro ya generado',
    type: DeclaracionPagoResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe una declaración de pago con ese id',
  })
  @ApiConflictResponse({
    description:
      'La declaración no está PENDIENTE (ya fue validada o rechazada), o el saldo pendiente de la cuota ya no alcanza para cubrir el importe declarado',
  })
  validar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.declaracionPagoService.validar(id, user.id);
  }
}
