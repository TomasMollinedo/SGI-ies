import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { VentaService } from './venta.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { CancelarVentaDto } from './dto/cancelar-venta.dto';
import { QueryVentaDto } from './dto/query-venta.dto';
import { BuscarClienteQueryDto } from './dto/buscar-cliente-query.dto';
import { ClienteBuscadoResponseDto } from './dto/cliente-buscado-response.dto';
import { VentaDetalleResponseDto, VentaListResponseDto } from './dto/venta-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

/**
 * Registro de venta presencial (HU-27). Interno, sin endpoint público de
 * adhesión: lo opera Comercialización a través de este controller.
 */
@ApiTags('Ventas')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('ventas')
export class VentaController {
  constructor(private readonly ventaService: VentaService) {}

  @Post()
  @ApiOperation({
    summary: 'Registra una venta presencial',
    description:
      'Busca o crea al cliente, valida la publicación y el plan, genera el cronograma de cuotas (motor de T105) y pasa la publicación a En Plan de Pago. Todo en una transacción: si algo falla, no queda nada creado.',
  })
  @ApiCreatedResponse({ description: 'Venta registrada', type: VentaDetalleResponseDto })
  @ApiConflictResponse({
    description:
      'Publicación no vigente, no disponible, plan inactivado, plan de otra publicación, o ya existe una venta vigente sobre la publicación',
  })
  crear(@Body() dto: CreateVentaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ventaService.crear(dto, user.id);
  }

  @Patch(':id/cancelar')
  @ApiOperation({ summary: 'Cancela una venta vigente' })
  @ApiParam({ name: 'id', type: Number, description: 'id_venta' })
  @ApiOkResponse({ description: 'Venta cancelada', type: VentaDetalleResponseDto })
  @ApiNotFoundResponse({ description: 'No existe una venta con ese id' })
  @ApiConflictResponse({
    description: 'La venta ya está cancelada, o ya hay un cobro confirmado sobre ella',
  })
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelarVentaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ventaService.cancelar(id, dto, user.id);
  }

  @Get('buscar-cliente')
  @ApiOperation({
    summary: 'Busca un cliente existente por DNI/CUIL o email',
    description:
      'Lo usa el buscador del formulario de venta: si el cliente ya existe, el vendedor no tiene que volver a pedirle nombre/teléfono; si no existe, el formulario despliega el alta completa. Declarado antes de GET /ventas/:id para que "buscar-cliente" no se matchee como su parámetro numérico.',
  })
  @ApiQuery({ name: 'dni_cuil', required: false, type: String })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiOkResponse({
    description: 'encontrado: false y cliente: null si no existe ninguno con ese dni_cuil/email',
    type: ClienteBuscadoResponseDto,
  })
  buscarCliente(@Query() query: BuscarClienteQueryDto) {
    return this.ventaService.buscarCliente(query);
  }

  @Get()
  @ApiOperation({ summary: 'Listado interno de ventas, con filtros y paginación' })
  @ApiQuery({ name: 'FK_cliente', required: false, type: Number })
  @ApiQuery({ name: 'FK_publicacion', required: false, type: Number })
  @ApiQuery({ name: 'FK_unidad_funcional', required: false, type: Number })
  @ApiQuery({ name: 'FK_proyecto', required: false, type: Number })
  @ApiQuery({ name: 'estado', required: false, enum: ['VIGENTE', 'CANCELADA'] })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    type: String,
    description: 'Filtra por fecha_adhesion >= (ISO 8601)',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    type: String,
    description: 'Filtra por fecha_adhesion <= (ISO 8601)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({ description: 'Listado paginado de ventas', type: VentaListResponseDto })
  listar(@Query() query: QueryVentaDto) {
    return this.ventaService.listar(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una venta, con su cronograma de cuotas completo' })
  @ApiParam({ name: 'id', type: Number, description: 'id_venta' })
  @ApiOkResponse({ description: 'Detalle de la venta', type: VentaDetalleResponseDto })
  @ApiNotFoundResponse({ description: 'No existe una venta con ese id' })
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.ventaService.obtenerDetalle(id);
  }
}
