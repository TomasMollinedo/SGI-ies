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
import { TipoMovimientoService } from './tipo-movimiento.service';
import { CreateTipoMovimientoDto } from './dto/create-tipo-movimiento.dto';
import { UpdateTipoMovimientoDto } from './dto/update-tipo-movimiento.dto';
import { QueryTipoMovimientoDto } from './dto/query-tipo-movimiento.dto';
import {
  TipoMovimientoDetalleResponseDto,
  TipoMovimientoListResponseDto,
  TipoMovimientoResponseDto,
} from './dto/tipo-movimiento-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

@ApiTags('Tipos de Movimiento')
@ApiBearerAuth()
@Roles(RolNombre.RESPONSABLE_ALMACEN)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description: 'El usuario autenticado no tiene el rol Responsable de Almacén',
})
@Controller('tipos-movimiento')
export class TipoMovimientoController {
  constructor(private readonly tipoMovimientoService: TipoMovimientoService) {}

  @Post()
  @ApiOperation({
    summary:
      'Crear un tipo de movimiento. Es el único momento en que se define el indicador de entrada/salida: después queda bloqueado de forma permanente',
  })
  @ApiCreatedResponse({
    description: 'Tipo de movimiento creado',
    type: TipoMovimientoResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({
    description: 'Ya existe un tipo de movimiento activo con ese nombre',
  })
  create(
    @Body() dto: CreateTipoMovimientoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tipoMovimientoService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar tipos de movimiento, con filtros por nombre, estado y/o indicador de entrada/salida',
  })
  @ApiQuery({
    name: 'nombre',
    required: false,
    type: String,
    description:
      'Filtra por coincidencia parcial de nombre (sin distinguir mayúsculas/minúsculas)',
    example: 'compr',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false'],
    description:
      'Filtra por tipos activos (true) o dados de baja (false). Sin este parámetro, trae ambos.',
  })
  @ApiQuery({
    name: 'indicador_entrada',
    required: false,
    enum: ['true', 'false'],
    description:
      'Filtra por tipos de entrada, que suman stock (true), o de salida, que restan stock (false). Sin este parámetro, trae ambos.',
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
    description: 'Listado paginado de tipos de movimiento',
    type: TipoMovimientoListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryTipoMovimientoDto) {
    return this.tipoMovimientoService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tipo de movimiento por id' })
  @ApiParam({
    name: 'id',
    type: Number,
    description:
      'id_tipo_movimiento del tipo de movimiento a buscar (es el "código" que muestra la UI)',
  })
  @ApiOkResponse({
    description:
      'Tipo de movimiento encontrado, con nombre y apellido de quién lo creó y de quién lo modificó por última vez',
    type: TipoMovimientoDetalleResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe un tipo de movimiento con ese id',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tipoMovimientoService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Editar un tipo de movimiento: solo nombre y descripción. El indicador de entrada/salida no es editable',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_tipo_movimiento del tipo de movimiento a editar',
  })
  @ApiOkResponse({
    description: 'Tipo de movimiento actualizado',
    type: TipoMovimientoResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({
    description: 'No existe un tipo de movimiento con ese id',
  })
  @ApiConflictResponse({
    description: 'Ya existe un tipo de movimiento activo con ese nombre',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoMovimientoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tipoMovimientoService.update(id, dto, user.id);
  }

  @Patch(':id/baja')
  @ApiOperation({
    summary: 'Dar de baja un tipo de movimiento (baja lógica)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_tipo_movimiento del tipo de movimiento a dar de baja',
  })
  @ApiOkResponse({
    description: 'Tipo de movimiento dado de baja',
    type: TipoMovimientoResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe un tipo de movimiento con ese id',
  })
  @ApiConflictResponse({
    description: 'El tipo de movimiento ya está dado de baja',
  })
  baja(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tipoMovimientoService.baja(id, user.id);
  }

  @Patch(':id/alta')
  @ApiOperation({
    summary: 'Reactivar un tipo de movimiento dado de baja (alta lógica)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_tipo_movimiento del tipo de movimiento a reactivar',
  })
  @ApiOkResponse({
    description: 'Tipo de movimiento reactivado',
    type: TipoMovimientoResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe un tipo de movimiento con ese id',
  })
  @ApiConflictResponse({
    description:
      'El tipo de movimiento ya está activo, o ya existe otro tipo de movimiento activo con el mismo nombre',
  })
  alta(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tipoMovimientoService.activar(id, user.id);
  }
}
