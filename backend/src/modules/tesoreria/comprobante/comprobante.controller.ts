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
import { EstadoComprobante } from '../../../../generated/prisma/enums';
import { ComprobanteService } from './comprobante.service';
import { CreateComprobanteDto } from './dto/create-comprobante.dto';
import { UpdateComprobanteDto } from './dto/update-comprobante.dto';
import { AnularComprobanteDto } from './dto/anular-comprobante.dto';
import { QueryComprobanteDto } from './dto/query-comprobante.dto';
import {
  ComprobanteDetalleResponseDto,
  ComprobanteListResponseDto,
  ComprobanteResponseDto,
  ESTADO_SALDO,
} from './dto/comprobante-response.dto';
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
@Controller('comprobantes')
export class ComprobanteController {
  constructor(private readonly comprobanteService: ComprobanteService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un comprobante de proveedor en estado BORRADOR',
  })
  @ApiCreatedResponse({
    description: 'Comprobante creado en BORRADOR',
    type: ComprobanteResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos, fechas incoherentes o comprobante de origen de otro proveedor',
  })
  @ApiNotFoundResponse({
    description:
      'No existe el proveedor, tipo de comprobante, orden de compra, comprobante de origen o algún artículo referenciado',
  })
  @ApiConflictResponse({
    description:
      'Ya existe un comprobante vigente con esa numeración, o alguna referencia está dada de baja',
  })
  create(
    @Body() dto: CreateComprobanteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comprobanteService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar comprobantes, con filtros combinables, del más reciente al más antiguo',
  })
  @ApiQuery({
    name: 'FK_proveedor',
    required: false,
    type: Number,
    description: 'Filtra por proveedor',
  })
  @ApiQuery({
    name: 'FK_tipo_comprobante',
    required: false,
    type: Number,
    description: 'Filtra por tipo de comprobante',
  })
  @ApiQuery({
    name: 'aumenta_saldo',
    required: false,
    enum: ['true', 'false'],
    description:
      'Efecto del tipo sobre el saldo: true = aumenta (deuda con el proveedor), false = disminuye (crédito a favor)',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: EstadoComprobante,
    description: 'Estado del documento (BORRADOR, REGISTRADO, ANULADO)',
  })
  @ApiQuery({
    name: 'estado_saldo',
    required: false,
    enum: [...ESTADO_SALDO],
    description: 'Estado de saldo (solo comprobantes REGISTRADOS)',
  })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    type: String,
    description: 'Fecha de emisión desde (ISO 8601), inclusive',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    type: String,
    description: 'Fecha de emisión hasta (ISO 8601), inclusive',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página, empezando en 1 (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Resultados por página, máximo 100 (default 10)',
  })
  @ApiOkResponse({
    description: 'Listado paginado de comprobantes',
    type: ComprobanteListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryComprobanteDto) {
    return this.comprobanteService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener el detalle de un comprobante en modo lectura',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_comprobante_proveedor del comprobante a buscar',
  })
  @ApiOkResponse({
    description:
      'Comprobante con cabecera, líneas, comprobante de origen, comprobantes que lo referencian como origen y órdenes de pago que lo imputaron',
    type: ComprobanteDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe un comprobante con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.comprobanteService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Editar un comprobante en BORRADOR (cabecera y/o detalle). Recalcula los importes',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_comprobante_proveedor del comprobante a editar',
  })
  @ApiOkResponse({
    description: 'Comprobante actualizado',
    type: ComprobanteResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos, fechas incoherentes o origen de otro proveedor',
  })
  @ApiNotFoundResponse({
    description: 'No existe el comprobante o alguna referencia',
  })
  @ApiConflictResponse({
    description:
      'El comprobante no está en BORRADOR, la numeración ya existe, o alguna referencia está dada de baja',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComprobanteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comprobanteService.update(id, dto, user.id);
  }

  @Patch(':id/confirmar')
  @ApiOperation({
    summary:
      'Confirmar un comprobante: BORRADOR → REGISTRADO. Inicializa el saldo y congela cabecera y detalle',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_comprobante_proveedor del comprobante a confirmar',
  })
  @ApiOkResponse({
    description: 'Comprobante confirmado (REGISTRADO)',
    type: ComprobanteResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe un comprobante con ese id' })
  @ApiConflictResponse({
    description:
      'El comprobante no está en BORRADOR o no tiene líneas de detalle',
  })
  confirmar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comprobanteService.confirmar(id, user.id);
  }

  @Patch(':id/anular')
  @ApiOperation({
    summary: 'Anular un comprobante REGISTRADO, con motivo obligatorio',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_comprobante_proveedor del comprobante a anular',
  })
  @ApiOkResponse({
    description: 'Comprobante anulado',
    type: ComprobanteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Falta el motivo de anulación' })
  @ApiNotFoundResponse({ description: 'No existe un comprobante con ese id' })
  @ApiConflictResponse({
    description:
      'El comprobante no está en REGISTRADO o ya tiene imputaciones de pago',
  })
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularComprobanteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.comprobanteService.anular(id, dto, user.id);
  }
}
