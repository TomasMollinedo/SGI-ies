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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UnidadMedidaService } from './unidad-medida.service';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { QueryUnidadMedidaDto } from './dto/query-unidad-medida.dto';
import {
  UnidadMedidaDetalleResponseDto,
  UnidadMedidaListResponseDto,
  UnidadMedidaResponseDto,
} from './dto/unidad-medida-response.dto';

@ApiTags('Unidades de Medida')
@Controller('unidades-medida')
export class UnidadMedidaController {
  constructor(private readonly unidadMedidaService: UnidadMedidaService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una unidad de medida' })
  @ApiCreatedResponse({
    description: 'Unidad de medida creada',
    type: UnidadMedidaResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({
    description: 'Ya existe una unidad de medida activa con ese nombre o esa abreviatura',
  })
  create(@Body() dto: CreateUnidadMedidaDto) {
    return this.unidadMedidaService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar unidades de medida, con filtros por nombre y/o estado' })
  @ApiQuery({
    name: 'nombre',
    required: false,
    type: String,
    description: 'Filtra por coincidencia parcial de nombre (sin distinguir mayúsculas/minúsculas)',
    example: 'kilo',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false'],
    description: 'Filtra por unidades activas (true) o dadas de baja (false). Sin este parámetro, trae ambas.',
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
    description: 'Listado paginado de unidades de medida',
    type: UnidadMedidaListResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Parámetros de filtro/paginación inválidos' })
  findAll(@Query() query: QueryUnidadMedidaDto) {
    return this.unidadMedidaService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una unidad de medida por id' })
  @ApiParam({ name: 'id', type: Number, description: 'id_unidad_medida de la unidad a buscar' })
  @ApiOkResponse({
    description: 'Unidad de medida encontrada, con nombre y apellido de quién la creó y de quién la modificó por última vez',
    type: UnidadMedidaDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe una unidad de medida con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.unidadMedidaService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar una unidad de medida' })
  @ApiParam({ name: 'id', type: Number, description: 'id_unidad_medida de la unidad a editar' })
  @ApiOkResponse({ description: 'Unidad de medida actualizada', type: UnidadMedidaResponseDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'No existe una unidad de medida con ese id' })
  @ApiConflictResponse({
    description: 'Ya existe una unidad de medida activa con ese nombre o esa abreviatura',
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUnidadMedidaDto) {
    return this.unidadMedidaService.update(id, dto);
  }

  @Patch(':id/baja')
  @ApiOperation({ summary: 'Dar de baja una unidad de medida (baja lógica)' })
  @ApiParam({ name: 'id', type: Number, description: 'id_unidad_medida de la unidad a dar de baja' })
  @ApiOkResponse({ description: 'Unidad de medida dada de baja', type: UnidadMedidaResponseDto })
  @ApiNotFoundResponse({ description: 'No existe una unidad de medida con ese id' })
  @ApiConflictResponse({
    description: 'La unidad de medida ya está dada de baja, o tiene artículos activos asociados',
  })
  baja(@Param('id', ParseIntPipe) id: number) {
    return this.unidadMedidaService.baja(id);
  }

  @Patch(':id/alta')
  @ApiOperation({ summary: 'Reactivar una unidad de medida dada de baja (alta lógica)' })
  @ApiParam({ name: 'id', type: Number, description: 'id_unidad_medida de la unidad a reactivar' })
  @ApiOkResponse({ description: 'Unidad de medida reactivada', type: UnidadMedidaResponseDto })
  @ApiNotFoundResponse({ description: 'No existe una unidad de medida con ese id' })
  @ApiConflictResponse({
    description: 'La unidad de medida ya está activa, o ya existe otra unidad activa con el mismo nombre o abreviatura',
  })
  alta(@Param('id', ParseIntPipe) id: number) {
    return this.unidadMedidaService.activar(id);
  }
}