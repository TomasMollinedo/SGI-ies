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
import { TipoComprobanteService } from './tipo-comprobante.service';
import { CreateTipoComprobanteDto } from './dto/create-tipo-comprobante.dto';
import { UpdateTipoComprobanteDto } from './dto/update-tipo-comprobante.dto';
import { QueryTipoComprobanteDto } from './dto/query-tipo-comprobante.dto';
import {
  TipoComprobanteDetalleResponseDto,
  TipoComprobanteListResponseDto,
  TipoComprobanteResponseDto,
} from './dto/tipo-comprobante-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

@ApiTags('Tesorería')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('tipos-comprobante')
export class TipoComprobanteController {
  constructor(
    private readonly tipoComprobanteService: TipoComprobanteService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Crear un tipo de comprobante. Es el único momento en que se definen el efecto sobre el saldo y si requiere comprobante de origen: después quedan bloqueados de forma permanente',
  })
  @ApiCreatedResponse({
    description: 'Tipo de comprobante creado',
    type: TipoComprobanteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({
    description: 'Ya existe un tipo de comprobante activo con ese nombre',
  })
  create(
    @Body() dto: CreateTipoComprobanteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tipoComprobanteService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar tipos de comprobante, con filtros por nombre, estado y/o efecto sobre el saldo',
  })
  @ApiQuery({
    name: 'nombre',
    required: false,
    type: String,
    description:
      'Filtra por coincidencia parcial de nombre (sin distinguir mayúsculas/minúsculas)',
    example: 'factura',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false'],
    description:
      'Filtra por tipos activos (true) o dados de baja (false). Sin este parámetro, trae ambos.',
  })
  @ApiQuery({
    name: 'aumenta_saldo',
    required: false,
    enum: ['true', 'false'],
    description:
      'Filtra por tipos que aumentan (true) o disminuyen (false) el saldo de la cuenta corriente del proveedor. Sin este parámetro, trae ambos.',
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
    description: 'Listado paginado de tipos de comprobante',
    type: TipoComprobanteListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryTipoComprobanteDto) {
    return this.tipoComprobanteService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tipo de comprobante por id' })
  @ApiParam({
    name: 'id',
    type: Number,
    description:
      'id_tipo_comprobante del tipo de comprobante a buscar (es el "código" que muestra la UI)',
  })
  @ApiOkResponse({
    description:
      'Tipo de comprobante encontrado, con nombre y apellido de quién lo creó y de quién lo modificó por última vez',
    type: TipoComprobanteDetalleResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe un tipo de comprobante con ese id',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tipoComprobanteService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Editar un tipo de comprobante: solo nombre y descripción. El efecto sobre el saldo y si requiere comprobante de origen no son editables',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_tipo_comprobante del tipo de comprobante a editar',
  })
  @ApiOkResponse({
    description: 'Tipo de comprobante actualizado',
    type: TipoComprobanteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({
    description: 'No existe un tipo de comprobante con ese id',
  })
  @ApiConflictResponse({
    description: 'Ya existe un tipo de comprobante activo con ese nombre',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoComprobanteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tipoComprobanteService.update(id, dto, user.id);
  }

  @Patch(':id/baja')
  @ApiOperation({
    summary: 'Dar de baja un tipo de comprobante (baja lógica)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_tipo_comprobante del tipo de comprobante a dar de baja',
  })
  @ApiOkResponse({
    description: 'Tipo de comprobante dado de baja',
    type: TipoComprobanteResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe un tipo de comprobante con ese id',
  })
  @ApiConflictResponse({
    description: 'El tipo de comprobante ya está dado de baja',
  })
  baja(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tipoComprobanteService.baja(id, user.id);
  }

  @Patch(':id/alta')
  @ApiOperation({
    summary: 'Reactivar un tipo de comprobante dado de baja (alta lógica)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_tipo_comprobante del tipo de comprobante a reactivar',
  })
  @ApiOkResponse({
    description: 'Tipo de comprobante reactivado',
    type: TipoComprobanteResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe un tipo de comprobante con ese id',
  })
  @ApiConflictResponse({
    description:
      'El tipo de comprobante ya está activo, o ya existe otro tipo de comprobante activo con el mismo nombre',
  })
  alta(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tipoComprobanteService.activar(id, user.id);
  }
}
