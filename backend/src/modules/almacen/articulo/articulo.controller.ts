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
import { ArticuloService } from './articulo.service';
import { CreateArticuloDto } from './dto/create-articulo.dto';
import { UpdateArticuloDto } from './dto/update-articulo.dto';
import { QueryArticuloDto } from './dto/query-articulo.dto';
import {
  ArticuloDetalleResponseDto,
  ArticuloListResponseDto,
  ArticuloResponseDto,
} from './dto/articulo-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

@ApiTags('Artículos')
@ApiBearerAuth()
@Roles(RolNombre.RESPONSABLE_ALMACEN)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description: 'El usuario autenticado no tiene el rol Responsable de Almacén',
})
@Controller('articulos')
export class ArticuloController {
  constructor(private readonly articuloService: ArticuloService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un artículo de catálogo' })
  @ApiCreatedResponse({ description: 'Artículo creado', type: ArticuloResponseDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({
    description: 'No existe la categoría, unidad de medida o marca indicada',
  })
  @ApiConflictResponse({
    description:
      'Ya existe un artículo con ese código, ya existe un artículo activo con ese nombre, o la categoría/unidad de medida/marca indicada está dada de baja',
  })
  create(@Body() dto: CreateArticuloDto, @CurrentUser() user: AuthenticatedUser) {
    return this.articuloService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar artículos (por defecto solo los activos), con filtros por categoría, marca, estado y búsqueda por código o nombre',
  })
  @ApiQuery({
    name: 'busqueda',
    required: false,
    type: String,
    description: 'Coincidencia parcial contra el código o el nombre del artículo',
    example: 'cemento',
  })
  @ApiQuery({
    name: 'FK_Categoria',
    required: false,
    type: Number,
    description: 'Filtra por id de categoría',
    example: 1,
  })
  @ApiQuery({
    name: 'FK_Marca',
    required: false,
    type: Number,
    description: 'Filtra por id de marca',
    example: 1,
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false'],
    description:
      'Filtra por activos (true) o dados de baja (false). Sin este parámetro, trae solo los activos.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({ description: 'Listado paginado de artículos', type: ArticuloListResponseDto })
  @ApiBadRequestResponse({ description: 'Parámetros de filtro/paginación inválidos' })
  findAll(@Query() query: QueryArticuloDto) {
    return this.articuloService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un artículo por id' })
  @ApiParam({ name: 'id', type: Number, description: 'id_articulo del artículo a buscar' })
  @ApiOkResponse({ description: 'Artículo encontrado', type: ArticuloDetalleResponseDto })
  @ApiNotFoundResponse({ description: 'No existe un artículo con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.articuloService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar un artículo' })
  @ApiParam({ name: 'id', type: Number, description: 'id_articulo del artículo a editar' })
  @ApiOkResponse({ description: 'Artículo actualizado', type: ArticuloResponseDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({
    description:
      'No existe un artículo con ese id, o no existe la categoría/unidad de medida/marca indicada',
  })
  @ApiConflictResponse({
    description:
      'Ya existe un artículo con ese código, ya existe un artículo activo con ese nombre, o la categoría/unidad de medida/marca indicada está dada de baja',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArticuloDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articuloService.update(id, dto, user.id);
  }

  @Patch(':id/baja')
  @ApiOperation({ summary: 'Dar de baja un artículo (baja lógica)' })
  @ApiParam({ name: 'id', type: Number, description: 'id_articulo del artículo a dar de baja' })
  @ApiOkResponse({ description: 'Artículo dado de baja', type: ArticuloResponseDto })
  @ApiNotFoundResponse({ description: 'No existe un artículo con ese id' })
  @ApiConflictResponse({ description: 'El artículo ya está dado de baja' })
  baja(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.articuloService.baja(id, user.id);
  }

  @Patch(':id/alta')
  @ApiOperation({ summary: 'Reactivar un artículo dado de baja (alta lógica)' })
  @ApiParam({ name: 'id', type: Number, description: 'id_articulo del artículo a reactivar' })
  @ApiOkResponse({ description: 'Artículo reactivado', type: ArticuloResponseDto })
  @ApiNotFoundResponse({ description: 'No existe un artículo con ese id' })
  @ApiConflictResponse({
    description: 'El artículo ya está activo, o ya existe otro artículo activo con el mismo nombre',
  })
  alta(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.articuloService.activar(id, user.id);
  }
}