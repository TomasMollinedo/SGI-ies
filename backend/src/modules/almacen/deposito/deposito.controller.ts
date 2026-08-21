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
import { DepositoService } from './deposito.service';
import { CreateDepositoDto } from './dto/create-deposito.dto';
import { UpdateDepositoDto } from './dto/update-deposito.dto';
import { QueryDepositoDto } from './dto/query-deposito.dto';
import {
  DepositoDetalleResponseDto,
  DepositoListResponseDto,
  DepositoResponseDto,
} from './dto/deposito-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

@ApiTags('Depósitos y Obradores')
@ApiBearerAuth()
@Roles(RolNombre.RESPONSABLE_ALMACEN)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description: 'El usuario autenticado no tiene el rol Responsable de Almacén',
})
@Controller('depositos')
export class DepositoController {
  constructor(private readonly depositoService: DepositoService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un depósito u obrador' })
  @ApiCreatedResponse({
    description: 'Depósito/obrador creado',
    type: DepositoResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({
    description: 'No existe un proyecto con el id indicado en FK_Proyecto',
  })
  @ApiConflictResponse({
    description: 'Ya existe un depósito/obrador activo con ese nombre',
  })
  create(
    @Body() dto: CreateDepositoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.depositoService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar depósitos/obradores, con filtros por nombre y/o estado',
  })
  @ApiQuery({
    name: 'nombre',
    required: false,
    type: String,
    description:
      'Filtra por coincidencia parcial de nombre (sin distinguir mayúsculas/minúsculas)',
    example: 'central',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false'],
    description:
      'Filtra por depósitos/obradores activos (true) o dados de baja (false). Sin este parámetro, trae ambos.',
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
    description: 'Listado paginado de depósitos/obradores',
    type: DepositoListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryDepositoDto) {
    return this.depositoService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un depósito/obrador por id' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_deposito del depósito/obrador a buscar',
  })
  @ApiOkResponse({
    description:
      'Depósito/obrador encontrado, con nombre y apellido de quién lo creó y de quién lo modificó por última vez',
    type: DepositoDetalleResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe un depósito/obrador con ese id',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.depositoService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar un depósito/obrador' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_deposito del depósito/obrador a editar',
  })
  @ApiOkResponse({
    description: 'Depósito/obrador actualizado',
    type: DepositoResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({
    description:
      'No existe un depósito/obrador con ese id, o no existe un proyecto con el id indicado en FK_Proyecto',
  })
  @ApiConflictResponse({
    description: 'Ya existe un depósito/obrador activo con ese nombre',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepositoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.depositoService.update(id, dto, user.id);
  }

  @Patch(':id/baja')
  @ApiOperation({ summary: 'Dar de baja un depósito/obrador (baja lógica)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_deposito del depósito/obrador a dar de baja',
  })
  @ApiOkResponse({
    description: 'Depósito/obrador dado de baja',
    type: DepositoResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe un depósito/obrador con ese id',
  })
  @ApiConflictResponse({
    description:
      'El depósito/obrador ya está dado de baja, o tiene fichas de stock con cantidad mayor a 0',
  })
  baja(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.depositoService.baja(id, user.id);
  }

  @Patch(':id/alta')
  @ApiOperation({
    summary: 'Reactivar un depósito/obrador dado de baja (alta lógica)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_deposito del depósito/obrador a reactivar',
  })
  @ApiOkResponse({
    description: 'Depósito/obrador reactivado',
    type: DepositoResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe un depósito/obrador con ese id',
  })
  @ApiConflictResponse({
    description:
      'El depósito/obrador ya está activo, o ya existe otro activo con el mismo nombre',
  })
  alta(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.depositoService.activar(id, user.id);
  }
}
