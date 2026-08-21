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
import { CategoriaService } from './categoria.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { QueryCategoriaDto } from './dto/query-categoria.dto';
import {
  CategoriaDetalleResponseDto,
  CategoriaListResponseDto,
  CategoriaResponseDto,
} from './dto/categoria-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

@ApiTags('Categorías')
@ApiBearerAuth()
@Roles(RolNombre.RESPONSABLE_ALMACEN)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description: 'El usuario autenticado no tiene el rol Responsable de Almacén',
})
@Controller('categorias')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una categoría' })
  @ApiCreatedResponse({
    description: 'Categoría creada',
    type: CategoriaResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({
    description: 'Ya existe una categoría activa con ese nombre',
  })
  create(
    @Body() dto: CreateCategoriaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriaService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar categorías, con filtros por nombre y/o estado',
  })
  @ApiQuery({
    name: 'nombre',
    required: false,
    type: String,
    description:
      'Filtra por coincidencia parcial de nombre (sin distinguir mayúsculas/minúsculas)',
    example: 'herr',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false'],
    description:
      'Filtra por categorías activas (true) o dadas de baja (false). Sin este parámetro, trae ambas.',
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
    description: 'Listado paginado de categorías',
    type: CategoriaListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryCategoriaDto) {
    return this.categoriaService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una categoría por id' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_categoria de la categoría a buscar',
  })
  @ApiOkResponse({
    description:
      'Categoría encontrada, con nombre y apellido de quién la creó y de quién la modificó por última vez',
    type: CategoriaDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe una categoría con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriaService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar una categoría' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_categoria de la categoría a editar',
  })
  @ApiOkResponse({
    description: 'Categoría actualizada',
    type: CategoriaResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'No existe una categoría con ese id' })
  @ApiConflictResponse({
    description: 'Ya existe una categoría activa con ese nombre',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoriaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriaService.update(id, dto, user.id);
  }

  @Patch(':id/baja')
  @ApiOperation({ summary: 'Dar de baja una categoría (baja lógica)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_categoria de la categoría a dar de baja',
  })
  @ApiOkResponse({
    description: 'Categoría dada de baja',
    type: CategoriaResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe una categoría con ese id' })
  @ApiConflictResponse({
    description:
      'La categoría ya está dada de baja, o tiene artículos activos asociados',
  })
  baja(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriaService.baja(id, user.id);
  }

  @Patch(':id/alta')
  @ApiOperation({
    summary: 'Reactivar una categoría dada de baja (alta lógica)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_categoria de la categoría a reactivar',
  })
  @ApiOkResponse({
    description: 'Categoría reactivada',
    type: CategoriaResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe una categoría con ese id' })
  @ApiConflictResponse({
    description:
      'La categoría ya está activa, o ya existe otra categoría activa con el mismo nombre',
  })
  alta(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.categoriaService.activar(id, user.id);
  }
}
