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
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { OrdenCompraService } from './orden-compra.service';
import { CambiarEstadoOrdenCompraDto } from './dto/cambiar-estado-orden-compra.dto';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { UpdateOrdenCompraDto } from './dto/update-orden-compra.dto';
import { QueryOrdenCompraDto } from './dto/query-orden-compra.dto';
import {
  OrdenCompraListResponseDto,
  OrdenCompraResponseDto,
} from './dto/orden-compra-response.dto';

@ApiTags('Órdenes de Compra')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('ordenes-compra')
export class OrdenCompraController {
  constructor(private readonly ordenCompraService: OrdenCompraService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una orden de compra (queda en BORRADOR)' })
  @ApiCreatedResponse({
    description: 'Orden de compra creada',
    type: OrdenCompraResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({
    description:
      'No existe el proveedor, el depósito o alguno de los artículos indicados',
  })
  @ApiConflictResponse({
    description: 'El depósito o alguno de los artículos está dado de baja',
  })
  create(
    @Body() dto: CreateOrdenCompraDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordenCompraService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar órdenes de compra, con filtros combinables por proveedor, estado, depósito y período',
  })
  @ApiQuery({
    name: 'FK_proveedor',
    required: false,
    type: Number,
    description: 'Filtra por id_proveedor',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['BORRADOR', 'EMITIDA', 'RECIBIDA_PARCIAL', 'RECIBIDA', 'CANCELADA'],
    description: 'Filtra por estado de la orden',
  })
  @ApiQuery({
    name: 'FK_deposito',
    required: false,
    type: Number,
    description: 'Filtra por id_deposito',
  })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    type: String,
    description:
      'Filtra órdenes con fecha_emision desde esta fecha (ISO 8601), inclusive',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    type: String,
    description:
      'Filtra órdenes con fecha_emision hasta esta fecha (ISO 8601), inclusive',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página, empezando en 1 (default 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Resultados por página, máximo 100 (default 10)',
    example: 10,
  })
  @ApiOkResponse({
    description:
      'Listado paginado de órdenes de compra, de la más reciente a la más antigua',
    type: OrdenCompraListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryOrdenCompraDto) {
    return this.ordenCompraService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener el detalle completo de una orden de compra',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_orden_compra de la orden a buscar',
  })
  @ApiOkResponse({
    description: 'Orden de compra encontrada, con su detalle línea por línea',
    type: OrdenCompraResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe una orden de compra con ese id',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordenCompraService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar cabecera y/o detalle de una orden de compra en BORRADOR',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_orden_compra de la orden a editar',
  })
  @ApiOkResponse({
    description: 'Orden de compra actualizada',
    type: OrdenCompraResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({
    description:
      'No existe la orden de compra, el proveedor, el depósito o alguno de los artículos indicados',
  })
  @ApiConflictResponse({
    description:
      'La orden no está en BORRADOR, o el depósito o alguno de los artículos está dado de baja',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrdenCompraDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordenCompraService.update(id, dto, user.id);
  }

  @Patch(':id/estado')
  @ApiOperation({
    summary:
      'Avanzar el estado de una orden de compra (emitir, marcar recepción o cancelar)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_orden_compra de la orden a la que se le cambia el estado',
  })
  @ApiOkResponse({
    description: 'Orden de compra con el nuevo estado',
    type: OrdenCompraResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Falta el motivo de cancelación al pasar a CANCELADA',
  })
  @ApiNotFoundResponse({
    description: 'No existe una orden de compra con ese id',
  })
  @ApiConflictResponse({
    description:
      'La transición pedida no es válida desde el estado actual de la orden, o la orden no tiene ninguna línea de detalle al intentar pasar a EMITIDA',
  })
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoOrdenCompraDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordenCompraService.cambiarEstado(id, dto, user.id);
  }
}
