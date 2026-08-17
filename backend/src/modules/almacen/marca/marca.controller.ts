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
import { MarcaService } from './marca.service';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { UpdateMarcaDto } from './dto/update-marca.dto';
import { QueryMarcaDto } from './dto/query-marca.dto';
import {
  MarcaDetalleResponseDto,
  MarcaListResponseDto,
  MarcaResponseDto,
} from './dto/marca-response.dto';

@ApiTags('Marcas')
@Controller('marcas')
export class MarcaController {
  constructor(private readonly marcaService: MarcaService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una marca' })
  @ApiCreatedResponse({ description: 'Marca creada', type: MarcaResponseDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({
    description: 'Ya existe una marca activa con ese nombre',
  })
  create(@Body() dto: CreateMarcaDto) {
    return this.marcaService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar marcas, con filtros por nombre y/o estado' })
  @ApiQuery({
    name: 'nombre',
    required: false,
    type: String,
    description:
      'Filtra por coincidencia parcial de nombre (sin distinguir mayúsculas/minúsculas)',
    example: 'gené',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false'],
    description:
      'Filtra por marcas activas (true) o dadas de baja (false). Sin este parámetro, trae ambas.',
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
    description: 'Listado paginado de marcas',
    type: MarcaListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryMarcaDto) {
    return this.marcaService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una marca por id' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_marca de la marca a buscar',
  })
  @ApiOkResponse({
    description:
      'Marca encontrada, con nombre y apellido de quién la creó y de quién la modificó por última vez',
    type: MarcaDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe una marca con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.marcaService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar una marca' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_marca de la marca a editar',
  })
  @ApiOkResponse({ description: 'Marca actualizada', type: MarcaResponseDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'No existe una marca con ese id' })
  @ApiConflictResponse({
    description: 'Ya existe una marca activa con ese nombre',
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMarcaDto) {
    return this.marcaService.update(id, dto);
  }

  @Patch(':id/baja')
  @ApiOperation({ summary: 'Dar de baja una marca (baja lógica)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_marca de la marca a dar de baja',
  })
  @ApiOkResponse({ description: 'Marca dada de baja', type: MarcaResponseDto })
  @ApiNotFoundResponse({ description: 'No existe una marca con ese id' })
  @ApiConflictResponse({
    description:
      'La marca ya está dada de baja, o tiene artículos activos asociados',
  })
  baja(@Param('id', ParseIntPipe) id: number) {
    return this.marcaService.baja(id);
  }
}
