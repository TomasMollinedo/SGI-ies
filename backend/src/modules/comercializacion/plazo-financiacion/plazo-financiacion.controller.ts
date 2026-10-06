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
import { PlazoFinanciacionService } from './plazo-financiacion.service';
import { CreatePlazoFinanciacionDto } from './dto/create-plazo-financiacion.dto';
import { UpdatePlazoFinanciacionDto } from './dto/update-plazo-financiacion.dto';
import { QueryPlazoFinanciacionDto } from './dto/query-plazo-financiacion.dto';
import {
  PlazoFinanciacionDetalleResponseDto,
  PlazoFinanciacionListResponseDto,
  PlazoFinanciacionResponseDto,
} from './dto/plazo-financiacion-response.dto';
import { CatalogoItemDto } from '../../../common/dto/catalogo-item.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

@ApiTags('Comercialización')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('plazos-financiacion')
export class PlazoFinanciacionController {
  constructor(
    private readonly plazoFinanciacionService: PlazoFinanciacionService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Crear un plazo de financiación (el código lo genera el sistema; la cantidad de cuotas queda bloqueada desde el alta)',
  })
  @ApiCreatedResponse({
    description: 'Plazo de financiación creado',
    type: PlazoFinanciacionResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos (cuotas enteras entre 1 y 60, TNA mayor o igual a cero)',
  })
  @ApiConflictResponse({
    description:
      'Ya existe un plazo de financiación activo con esa cantidad de cuotas',
  })
  create(
    @Body() dto: CreatePlazoFinanciacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plazoFinanciacionService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar plazos de financiación por cantidad de cuotas ascendente, con la tasa mensual (TNA ÷ 12) y filtro por estado',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false', 'todos'],
    description:
      'Filtra por plazos activos (true), dados de baja (false), o ambos (todos). Sin este parámetro, trae solo los activos.',
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
    description: 'Listado paginado de plazos de financiación',
    type: PlazoFinanciacionListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryPlazoFinanciacionDto) {
    return this.plazoFinanciacionService.findAll(query);
  }

  // Antes que `:id`, para que Nest no lo tome como un id.
  @Get('catalogo')
  @ApiOperation({
    summary:
      'Catálogo de plazos activos, para las tablas emergentes de la venta y de los planes de ejemplo',
  })
  @ApiOkResponse({
    description:
      'Plazos activos ordenados por cantidad de cuotas. `id` es el id_plazo_financiacion; `code`, la etiqueta ("12 cuotas"); `metadata` trae codigo, cantidad_cuotas, tasa_nominal_anual y tasa_mensual',
    type: [CatalogoItemDto],
  })
  listarCatalogo() {
    return this.plazoFinanciacionService.listarCatalogo();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un plazo de financiación por id' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_plazo_financiacion del plazo a buscar',
  })
  @ApiOkResponse({
    description:
      'Plazo encontrado, con su tasa mensual y nombre y apellido de quién lo creó y de quién lo modificó por última vez',
    type: PlazoFinanciacionDetalleResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe un plazo de financiación con ese id',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.plazoFinanciacionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Editar un plazo de financiación (solo TNA y descripción: la cantidad de cuotas queda bloqueada desde el alta)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_plazo_financiacion del plazo a editar',
  })
  @ApiOkResponse({
    description: 'Plazo de financiación actualizado',
    type: PlazoFinanciacionResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({
    description: 'No existe un plazo de financiación con ese id',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlazoFinanciacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plazoFinanciacionService.update(id, dto, user.id);
  }

  @Patch(':id/baja')
  @ApiOperation({
    summary: 'Dar de baja un plazo de financiación (baja lógica)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_plazo_financiacion del plazo a dar de baja',
  })
  @ApiOkResponse({
    description: 'Plazo de financiación dado de baja',
    type: PlazoFinanciacionResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe un plazo de financiación con ese id',
  })
  @ApiConflictResponse({
    description: 'El plazo de financiación ya está dado de baja',
  })
  baja(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plazoFinanciacionService.baja(id, user.id);
  }

  @Patch(':id/alta')
  @ApiOperation({
    summary: 'Reactivar un plazo de financiación dado de baja (alta lógica)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_plazo_financiacion del plazo a reactivar',
  })
  @ApiOkResponse({
    description: 'Plazo de financiación reactivado',
    type: PlazoFinanciacionResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe un plazo de financiación con ese id',
  })
  @ApiConflictResponse({
    description:
      'El plazo ya está activo, o ya existe otro plazo activo con la misma cantidad de cuotas',
  })
  alta(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plazoFinanciacionService.activar(id, user.id);
  }
}
