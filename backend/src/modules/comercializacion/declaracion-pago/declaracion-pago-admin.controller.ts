import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DeclaracionPagoService } from './declaracion-pago.service';
import { RechazarDeclaracionPagoDto } from './dto/rechazar-declaracion-pago.dto';
import {
  DeclaracionPagoListResponseDto,
  DeclaracionPagoResponseDto,
  ESTADO_DECLARACION_PAGO,
} from './dto/declaracion-pago-response.dto';
import { QueryDeclaracionPagoDto } from './dto/query-declaracion-pago.dto';
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

  @Get()
  @ApiOperation({
    summary:
      'Bandeja de validación de Tesorería: declaraciones de pago con filtros combinables por cliente, forma de pago, estado y período (HU-29)',
    description:
      'Orden fijo de la más antigua a la más reciente (es una cola de trabajo). Sin resumen ni totales. Cada ítem trae el cliente, la cuota con su saldo pendiente ACTUAL, la venta (unidad y proyecto), la forma de pago y, si está VALIDADA, el cobro que generó con su estado (puede estar ANULADO).',
  })
  @ApiQuery({
    name: 'FK_cliente',
    required: false,
    type: Number,
    description: 'id_cliente del cliente que declaró',
  })
  @ApiQuery({
    name: 'FK_forma_pago',
    required: false,
    type: Number,
    description: 'id_forma_pago declarada',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ESTADO_DECLARACION_PAGO,
    description: 'Estado de la declaración',
  })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    type: String,
    description:
      'Filtra declaraciones con hora_creacion mayor o igual a este instante (ISO 8601). Una fecha sola se toma como las 00:00 de Argentina',
    example: '2026-09-01',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    type: String,
    description:
      'Filtra declaraciones con hora_creacion menor o igual a este instante (ISO 8601). Una fecha sola se toma como las 00:00 de Argentina: para incluir el día completo, mandar el fin del día con offset',
    example: '2026-09-30T23:59:59.999-03:00',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description:
      'Listado paginado de declaraciones, de la más antigua a la más reciente',
    type: DeclaracionPagoListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  listar(@Query() query: QueryDeclaracionPagoDto) {
    return this.declaracionPagoService.listar(query);
  }

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
