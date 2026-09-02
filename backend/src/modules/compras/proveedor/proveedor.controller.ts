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
import { ProveedorService } from './proveedor.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { QueryProveedorDto } from './dto/query-proveedor.dto';
import {
  ProveedorDetalleResponseDto,
  ProveedorListResponseDto,
  ProveedorResponseDto,
} from './dto/proveedor-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

@ApiTags('Proveedores')
@ApiBearerAuth()
@Roles(RolNombre.RESPONSABLE_COMPRAS, RolNombre.ADMINISTRADOR, RolNombre.GERENTE_GENERAL)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Responsable de Compras (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('proveedores')
export class ProveedorController {
  constructor(private readonly proveedorService: ProveedorService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un proveedor' })
  @ApiCreatedResponse({
    description: 'Proveedor creado',
    type: ProveedorResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({
    description:
      'Ya existe un proveedor con ese CUIT (activo o dado de baja), o ya existe un proveedor activo con esa razón social',
  })
  create(
    @Body() dto: CreateProveedorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.proveedorService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar proveedores, con filtros por condición frente al IVA, estado y búsqueda por razón social o CUIT',
  })
  @ApiQuery({
    name: 'busqueda',
    required: false,
    type: String,
    description: 'Filtra por coincidencia parcial de razón social o de CUIT',
    example: 'acme',
  })
  @ApiQuery({
    name: 'condicion_iva',
    required: false,
    enum: [
      'RESPONSABLE_INSCRIPTO',
      'MONOTRIBUTISTA',
      'EXENTO',
      'CONSUMIDOR_FINAL',
    ],
    description: 'Filtra por condición frente al IVA',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false'],
    description:
      'Filtra por proveedores activos (true) o dados de baja (false). Sin este parámetro, trae solo los activos.',
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
    description: 'Listado paginado de proveedores',
    type: ProveedorListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryProveedorDto) {
    return this.proveedorService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un proveedor por id' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_proveedor del proveedor a buscar',
  })
  @ApiOkResponse({
    description:
      'Proveedor encontrado, con nombre y apellido de quién lo creó y de quién lo modificó por última vez',
    type: ProveedorDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe un proveedor con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.proveedorService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar un proveedor' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_proveedor del proveedor a editar',
  })
  @ApiOkResponse({
    description: 'Proveedor actualizado',
    type: ProveedorResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'No existe un proveedor con ese id' })
  @ApiConflictResponse({
    description:
      'Ya existe un proveedor con ese CUIT (activo o dado de baja), o ya existe un proveedor activo con esa razón social',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProveedorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.proveedorService.update(id, dto, user.id);
  }

  @Patch(':id/baja')
  @ApiOperation({ summary: 'Dar de baja un proveedor (baja lógica)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_proveedor del proveedor a dar de baja',
  })
  @ApiOkResponse({
    description: 'Proveedor dado de baja',
    type: ProveedorResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe un proveedor con ese id' })
  @ApiConflictResponse({
    description:
      'El proveedor ya está dado de baja, o no puede darse de baja en este momento',
  })
  baja(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.proveedorService.baja(id, user.id);
  }
}
