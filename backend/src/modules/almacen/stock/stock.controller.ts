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
import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { QueryStockDto } from './dto/query-stock.dto';
import {
  StockConsolidadoResponseDto,
  StockDetalleResponseDto,
  StockListResponseDto,
  StockResponseDto,
} from './dto/stock-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

@ApiTags('Stock')
@ApiBearerAuth()
@Roles(RolNombre.RESPONSABLE_ALMACEN)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description: 'El usuario autenticado no tiene el rol Responsable de Almacén',
})
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @ApiOperation({
    summary:
      'Crear una ficha de stock (vincula un artículo a un depósito/obrador; stock actual arranca en 0)',
  })
  @ApiCreatedResponse({
    description: 'Ficha de stock creada',
    type: StockResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({
    description: 'No existe el artículo o el depósito/obrador indicado',
  })
  @ApiConflictResponse({
    description:
      'El depósito/obrador está dado de baja, o ya existe una ficha activa para esa combinación artículo–depósito',
  })
  create(@Body() dto: CreateStockDto, @CurrentUser() user: AuthenticatedUser) {
    return this.stockService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar fichas de stock, con filtros por depósito, tipo (obrador), categoría y nombre del artículo, y estado',
  })
  @ApiQuery({
    name: 'FK_deposito',
    required: false,
    type: Number,
    description: 'Filtra por id del depósito/obrador',
    example: 1,
  })
  @ApiQuery({
    name: 'es_obrador',
    required: false,
    enum: ['true', 'false'],
    description:
      'Filtra fichas en obradores (true) o depósitos centrales (false)',
  })
  @ApiQuery({
    name: 'FK_Categoria',
    required: false,
    type: Number,
    description: 'Filtra por id de la categoría del artículo',
    example: 1,
  })
  @ApiQuery({
    name: 'nombreArticulo',
    required: false,
    type: String,
    description:
      'Coincidencia parcial contra el nombre del artículo (sin distinguir mayúsculas/minúsculas)',
    example: 'cemento',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false'],
    description: 'Filtra fichas activas (true) o dadas de baja (false)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Listado paginado de fichas de stock',
    type: StockListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryStockDto) {
    return this.stockService.findAll(query);
  }

  @Get('consolidado/:idArticulo')
  @ApiOperation({
    summary:
      'Stock consolidado de un artículo: suma su stock en todos los depósitos/obradores activos',
  })
  @ApiParam({
    name: 'idArticulo',
    type: Number,
    description: 'id_articulo a consolidar',
  })
  @ApiOkResponse({
    description: 'Stock total consolidado',
    type: StockConsolidadoResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe un artículo con ese id' })
  consolidado(@Param('idArticulo', ParseIntPipe) idArticulo: number) {
    return this.stockService.consolidadoPorArticulo(idArticulo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una ficha de stock por id' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_stock de la ficha a buscar',
  })
  @ApiOkResponse({
    description: 'Ficha de stock encontrada',
    type: StockDetalleResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe una ficha de stock con ese id',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Editar el umbral mínimo y/o las observaciones de una ficha de stock',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_stock de la ficha a editar',
  })
  @ApiOkResponse({
    description: 'Ficha de stock actualizada',
    type: StockResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({
    description: 'No existe una ficha de stock con ese id',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockService.update(id, dto, user.id);
  }

  @Patch(':id/baja')
  @ApiOperation({ summary: 'Dar de baja una ficha de stock (baja lógica)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_stock de la ficha a dar de baja',
  })
  @ApiOkResponse({
    description: 'Ficha de stock dada de baja',
    type: StockResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe una ficha de stock con ese id',
  })
  @ApiConflictResponse({
    description:
      'La ficha ya está dada de baja, o tiene stock actual mayor a 0',
  })
  baja(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockService.baja(id, user.id);
  }

  @Patch(':id/alta')
  @ApiOperation({
    summary: 'Reactivar una ficha de stock dada de baja (alta lógica)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_stock de la ficha a reactivar',
  })
  @ApiOkResponse({
    description: 'Ficha de stock reactivada',
    type: StockResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe una ficha de stock con ese id',
  })
  @ApiConflictResponse({
    description:
      'La ficha ya está activa, o ya existe otra ficha activa para esa combinación artículo–depósito',
  })
  alta(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockService.activar(id, user.id);
  }
}
