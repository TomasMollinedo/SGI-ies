import {
  Body,
  Controller,
  Get,
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
import { CobroService } from './cobro.service';
import { CreateCobroDto } from './dto/create-cobro.dto';
import { AnularCobroDto } from './dto/anular-cobro.dto';
import { QueryCobroDto } from './dto/query-cobro.dto';
import { QueryCuotasImputablesDto } from './dto/query-cuotas-imputables.dto';
import { QueryCuotasVencidasDto } from './dto/query-cuotas-vencidas.dto';
import {
  CobroDetalleResponseDto,
  CobroListResponseDto,
  CuotasImputablesResponseDto,
  CuotasVencidasResponseDto,
} from './dto/cobro-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

@ApiTags('Cobros')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('cobros')
export class CobroController {
  constructor(private readonly cobroService: CobroService) {}

  // Declarados antes de ":id": si no, Nest los matchea como el parámetro
  // dinámico y el ParseIntPipe del otro endpoint devuelve un 400 confuso.
  @Get('cuotas-imputables')
  @ApiOperation({
    summary:
      'Listar las cuotas imputables de un cliente (con saldo pendiente, sin anular, de ventas no canceladas), para el formulario de registro de un cobro',
  })
  @ApiQuery({
    name: 'FK_cliente',
    required: true,
    type: Number,
    description: 'Cliente cuyas cuotas imputables se listan',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Cuotas con saldo pendiente > 0, sin paginar',
    type: CuotasImputablesResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe un cliente con ese id' })
  listarCuotasImputables(@Query() query: QueryCuotasImputablesDto) {
    return this.cobroService.listarCuotasImputables(query);
  }

  @Get('cuotas-vencidas')
  @ApiOperation({
    summary:
      'Consulta de seguimiento: cuotas vencidas con saldo pendiente, filtrables por cliente y por proyecto, ordenadas por días de atraso descendente',
  })
  @ApiQuery({ name: 'FK_cliente', required: false, type: Number })
  @ApiQuery({ name: 'FK_proyecto', required: false, type: Number })
  @ApiOkResponse({
    description: 'Cuotas vencidas, sin paginar',
    type: CuotasVencidasResponseDto,
  })
  listarCuotasVencidas(@Query() query: QueryCuotasVencidasDto) {
    return this.cobroService.listarCuotasVencidas(query);
  }

  @Post()
  @ApiOperation({
    summary:
      'Confirmar un cobro presencial imputado a una o más cuotas del cliente. El importe total lo declara quien registra el cobro y tiene que coincidir con la suma del detalle. Es todo o nada: si una línea falla, no se registra nada',
  })
  @ApiCreatedResponse({
    description:
      'Cobro confirmado, con el detalle completo de sus imputaciones',
    type: CobroDetalleResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos, cuotas repetidas o de otro cliente, número de referencia faltante cuando la forma de pago lo requiere, fecha de cobro futura, importe imputado mayor al saldo pendiente, o la suma del detalle no coincide con el importe total declarado',
  })
  @ApiNotFoundResponse({
    description:
      'No existe el cliente, la forma de pago, o alguna de las cuotas imputadas',
  })
  @ApiConflictResponse({
    description:
      'La forma de pago está dada de baja, alguna cuota no está disponible para imputar (anulada, de una venta cancelada, o sin saldo pendiente), o su saldo cambió mientras se procesaba el cobro',
  })
  crear(@Body() dto: CreateCobroDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cobroService.crear(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar cobros, con filtros combinables por cliente, forma de pago, estado y período. Si se filtra por período completo (fechaDesde y fechaHasta juntos), suma un resumen de control de ingresos',
  })
  @ApiQuery({ name: 'FK_cliente', required: false, type: Number })
  @ApiQuery({ name: 'FK_forma_pago', required: false, type: Number })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['CONFIRMADO', 'ANULADO'],
  })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    type: String,
    description:
      'Filtra cobros con fecha_cobro mayor o igual a esta fecha (ISO 8601)',
    example: '2026-08-01',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    type: String,
    description:
      'Filtra cobros con fecha_cobro menor o igual a esta fecha (ISO 8601)',
    example: '2026-08-31',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description:
      'Listado paginado de cobros, más recientes primero. resumenPeriodo viaja null salvo que la query traiga fechaDesde y fechaHasta juntas; cuando viene, ignora el filtro de estado (siempre excluye los cobros anulados)',
    type: CobroListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  listar(@Query() query: QueryCobroDto) {
    return this.cobroService.listar(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Obtener un cobro por id, con el detalle completo de sus imputaciones (alimenta el recibo imprimible)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_cobro del cobro a buscar',
  })
  @ApiOkResponse({
    description:
      'Cobro encontrado: cabecera + detalle, con el saldo anterior y posterior de cada cuota imputada',
    type: CobroDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe un cobro con ese id' })
  obtenerDetalle(@Param('id', ParseIntPipe) id: number) {
    return this.cobroService.obtenerDetalle(id);
  }

  @Patch(':id/anular')
  @ApiOperation({
    summary:
      'Anular un cobro confirmado: restituye a cada cuota imputada exactamente el saldo que este cobro había descontado. No se puede anular un cobro ya anulado',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_cobro del cobro a anular',
  })
  @ApiOkResponse({
    description: 'Cobro anulado',
    type: CobroDetalleResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El motivo de anulación es obligatorio',
  })
  @ApiNotFoundResponse({ description: 'No existe un cobro con ese id' })
  @ApiConflictResponse({
    description: 'El cobro no está CONFIRMADO (ya fue anulado)',
  })
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularCobroDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cobroService.anular(id, dto, user.id);
  }
}
