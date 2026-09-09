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
import { FormaPagoService } from './forma-pago.service';
import { CreateFormaPagoDto } from './dto/create-forma-pago.dto';
import { UpdateFormaPagoDto } from './dto/update-forma-pago.dto';
import { QueryFormaPagoDto } from './dto/query-forma-pago.dto';
import {
  FormaPagoDetalleResponseDto,
  FormaPagoListResponseDto,
  FormaPagoResponseDto,
} from './dto/forma-pago-response.dto';
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
@Controller('formas-pago')
export class FormaPagoController {
  constructor(private readonly formaPagoService: FormaPagoService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una forma de pago' })
  @ApiCreatedResponse({
    description: 'Forma de pago creada',
    type: FormaPagoResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiConflictResponse({
    description: 'Ya existe una forma de pago activa con ese nombre',
  })
  create(
    @Body() dto: CreateFormaPagoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formaPagoService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar formas de pago, con filtro por estado y búsqueda por nombre',
  })
  @ApiQuery({
    name: 'nombre',
    required: false,
    type: String,
    description:
      'Filtra por coincidencia parcial del nombre (cada palabra por separado, sin importar el orden)',
    example: 'transferencia',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false', 'todos'],
    description:
      'Filtra por formas de pago activas (true), dadas de baja (false), o ambas (todos). Sin este parámetro, trae solo las activas.',
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
    description: 'Listado paginado de formas de pago',
    type: FormaPagoListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryFormaPagoDto) {
    return this.formaPagoService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una forma de pago por id' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_forma_pago de la forma de pago a buscar',
  })
  @ApiOkResponse({
    description:
      'Forma de pago encontrada, con nombre y apellido de quién la creó y de quién la modificó por última vez',
    type: FormaPagoDetalleResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe una forma de pago con ese id',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.formaPagoService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Editar una forma de pago (solo nombre y descripción: el indicador de referencia queda bloqueado desde el alta)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_forma_pago de la forma de pago a editar',
  })
  @ApiOkResponse({
    description: 'Forma de pago actualizada',
    type: FormaPagoResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({
    description: 'No existe una forma de pago con ese id',
  })
  @ApiConflictResponse({
    description: 'Ya existe otra forma de pago activa con ese nombre',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFormaPagoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formaPagoService.update(id, dto, user.id);
  }

  @Patch(':id/baja')
  @ApiOperation({ summary: 'Dar de baja una forma de pago (baja lógica)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_forma_pago de la forma de pago a dar de baja',
  })
  @ApiOkResponse({
    description: 'Forma de pago dada de baja',
    type: FormaPagoResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe una forma de pago con ese id',
  })
  @ApiConflictResponse({ description: 'La forma de pago ya está dada de baja' })
  baja(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formaPagoService.baja(id, user.id);
  }

  @Patch(':id/alta')
  @ApiOperation({
    summary: 'Reactivar una forma de pago dada de baja (alta lógica)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_forma_pago de la forma de pago a reactivar',
  })
  @ApiOkResponse({
    description: 'Forma de pago reactivada',
    type: FormaPagoResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe una forma de pago con ese id',
  })
  @ApiConflictResponse({
    description:
      'La forma de pago ya está activa, o ya existe otra forma de pago activa con el mismo nombre',
  })
  alta(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formaPagoService.activar(id, user.id);
  }
}
