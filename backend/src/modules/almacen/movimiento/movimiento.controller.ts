import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { MovimientoService } from './movimiento.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { QueryMovimientoDto } from './dto/query-movimiento.dto';
import {
  MovimientoCreadoResponseDto,
  MovimientoListResponseDto,
  MovimientoResponseDto,
} from './dto/movimiento-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

@ApiTags('Movimientos')
@ApiBearerAuth()
@Roles(RolNombre.RESPONSABLE_ALMACEN)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description: 'El usuario autenticado no tiene el rol Responsable de Almacén',
})
@Controller('movimientos')
export class MovimientoController {
  constructor(private readonly movimientoService: MovimientoService) {}

  @Post()
  @ApiOperation({
    summary:
      'Registrar un movimiento de stock con su detalle. Actualiza el stock de cada ficha afectada (suma si el tipo es de entrada, resta si es de salida). Es todo o nada: si una línea falla, no se registra nada',
  })
  @ApiCreatedResponse({
    description:
      'Movimiento registrado, con su detalle completo y las alertas de reposición que haya disparado (alertasGeneradas viene vacío si ninguna ficha cruzó su umbral)',
    type: MovimientoCreadoResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos, fichas de stock repetidas en el detalle, fecha futura, o alguna ficha no pertenece al depósito de la cabecera',
  })
  @ApiNotFoundResponse({
    description:
      'No existe el tipo de movimiento, el depósito, o alguna de las fichas de stock del detalle',
  })
  @ApiConflictResponse({
    description:
      'El tipo de movimiento está dado de baja, alguna ficha del detalle está dada de baja, o el stock no alcanza para una salida',
  })
  create(
    @Body() dto: CreateMovimientoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.movimientoService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar movimientos, con filtros combinables por depósito, tipo de movimiento, artículo y rango de fechas',
  })
  @ApiQuery({
    name: 'FK_Deposito',
    required: false,
    type: Number,
    description: 'Filtra por el depósito/obrador afectado',
    example: 1,
  })
  @ApiQuery({
    name: 'FK_TipoMovimiento',
    required: false,
    type: Number,
    description: 'Filtra por tipo de movimiento',
    example: 1,
  })
  @ApiQuery({
    name: 'FK_articulo',
    required: false,
    type: Number,
    description:
      'Filtra los movimientos que incluyan en su detalle al menos una línea de este artículo',
    example: 1,
  })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    type: String,
    description:
      'Filtra movimientos con fecha_movimiento mayor o igual a esta fecha (ISO 8601)',
    example: '2026-08-01',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    type: String,
    description:
      'Filtra movimientos con fecha_movimiento menor o igual a esta fecha (ISO 8601)',
    example: '2026-08-31',
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
      'Listado paginado de movimientos, más recientes primero. Sin las líneas del detalle: solo cuántas tiene cada uno (_count.stockMovimientos)',
    type: MovimientoListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryMovimientoDto) {
    return this.movimientoService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un movimiento por id, con todas sus líneas de detalle',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description:
      'id_movimiento del movimiento a buscar (es el "número" que muestra la UI)',
  })
  @ApiOkResponse({
    description:
      'Movimiento encontrado: cabecera + detalle, con el stock anterior y nuevo de cada línea',
    type: MovimientoResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe un movimiento con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.movimientoService.findOne(id);
  }
}
