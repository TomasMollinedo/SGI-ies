import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { VentaSimulacionService } from './venta-simulacion.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { SimularVentaDto } from './dto/simular-venta.dto';
import { SimulacionVentaResponseDto } from './dto/simulacion-venta-response.dto';
import { CancelarVentaDto } from './dto/cancelar-venta.dto';
import { QueryVentaDto } from './dto/query-venta.dto';
import { QueryBuscarClientesDto } from './dto/query-buscar-clientes.dto';
import { ClienteBusquedaResponseDto } from './dto/cliente-busqueda-response.dto';
import {
  VentaDetalleResponseDto,
  VentaListResponseDto,
} from './dto/venta-response.dto';
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
  constructor(
    private readonly ventaService: VentaService,
    private readonly ventaSimulacionService: VentaSimulacionService,
  ) {}

  @Post('simular')
  // 200 y no 201: es un cálculo, no crea ningún recurso.
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Simula el plan de pago que se está acordando con el cliente, sin guardar nada',
    description:
      'Calcula con sistema francés, el precio de lista y la TNA vigentes del plazo elegido (nunca vienen en el body). CONTADO: solo la publicación; una única cuota 0 por el 100 % del precio. FINANCIADO: plazo activo y anticipo en monto o en porcentaje (uno solo; se calcula el otro), mayor a 0 y menor al precio de lista. Los vencimientos se cuentan desde hoy, que es la fecha de la venta si se confirma. No crea venta, plan de pago ni cuotas.',
  })
  @ApiOkResponse({
    description:
      'Simulación: anticipo (monto y %), saldo a financiar, plazo, TNA, tasa mensual, valor de cuota, total de intereses, total a pagar y cronograma completo',
    type: SimulacionVentaResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Body inválido (CONTADO con anticipo o plazo, FINANCIADO sin plazo o sin anticipo, ambos anticipos a la vez, porcentaje fuera de 0 % < anticipo < 100 %), o anticipo en monto mayor o igual al precio de lista',
  })
  @ApiNotFoundResponse({
    description:
      'No existe una publicación vigente o un plazo de financiación con ese id',
  })
  @ApiConflictResponse({
    description:
      'La unidad no está Disponible, el plazo está dado de baja, o no hay ningún plazo activo (solo se puede vender de contado)',
  })
  simular(@Body() dto: SimularVentaDto) {
    return this.ventaSimulacionService.simular(dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Registra una venta presencial',
    description:
      'Busca o crea al cliente, valida la publicación y el plan, genera el cronograma de cuotas (motor de T105) y pasa la publicación a En Plan de Pago. Todo en una transacción: si algo falla, no queda nada creado.',
  })
  @ApiCreatedResponse({
    description: 'Venta registrada',
    type: VentaDetalleResponseDto,
  })
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
  @ApiOkResponse({
    description: 'Venta cancelada',
    type: VentaDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe una venta con ese id' })
  @ApiConflictResponse({
    description:
      'La venta ya está cancelada, o ya hay un cobro confirmado sobre ella',
  })
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelarVentaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ventaService.cancelar(id, dto, user.id);
  }

  @Get('buscar-clientes')
  @ApiOperation({
    summary:
      'Busca clientes por texto libre (nombre, apellido, DNI/CUIL o email)',
    description:
      'Lo usa el buscador del alta de venta y el filtro de cliente del listado: cada palabra de "busqueda" puede coincidir parcialmente con cualquiera de nombre/apellido/dni_cuil/email, y devuelve un listado paginado. Declarado antes de GET /ventas/:id para que "buscar-clientes" no se matchee como su parámetro numérico.',
  })
  @ApiQuery({ name: 'busqueda', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Listado paginado de clientes que coinciden con la búsqueda',
    type: ClienteBusquedaResponseDto,
  })
  buscarClientes(@Query() query: QueryBuscarClientesDto) {
    return this.ventaService.buscarClientes(query);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listado interno de ventas, con su plan acordado y saldo pendiente, filtros y paginación',
  })
  @ApiQuery({ name: 'FK_cliente', required: false, type: Number })
  @ApiQuery({ name: 'FK_publicacion', required: false, type: Number })
  @ApiQuery({ name: 'FK_unidad_funcional', required: false, type: Number })
  @ApiQuery({ name: 'FK_proyecto', required: false, type: Number })
  @ApiQuery({
    name: 'modalidad',
    required: false,
    enum: ['CONTADO', 'FINANCIADO'],
    description: 'Filtra por la modalidad del plan de pago acordado',
  })
  @ApiQuery({ name: 'estado', required: false, enum: ['VIGENTE', 'CANCELADA'] })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    type: String,
    description: 'Filtra por fecha_venta >= (ISO 8601)',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    type: String,
    description: 'Filtra por fecha_venta <= (ISO 8601)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Listado paginado de ventas',
    type: VentaListResponseDto,
  })
  listar(@Query() query: QueryVentaDto) {
    return this.ventaService.listar(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Detalle de una venta: plan acordado y cronograma completo de cuotas con capital, interés y saldos',
  })
  @ApiParam({ name: 'id', type: Number, description: 'id_venta' })
  @ApiOkResponse({
    description: 'Detalle de la venta',
    type: VentaDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe una venta con ese id' })
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.ventaService.obtenerDetalle(id);
  }
}
