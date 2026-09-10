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
import { PagoService } from './pago.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { AnularPagoDto } from './dto/anular-pago.dto';
import { QueryPagoDto } from './dto/query-pago.dto';
import { QueryComprobantesImputablesDto } from './dto/query-comprobantes-imputables.dto';
import {
  ComprobantesImputablesResponseDto,
  PagoDetalleResponseDto,
  PagoListResponseDto,
} from './dto/pago-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

@ApiTags('Pagos')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('pagos')
export class PagoController {
  constructor(private readonly pagoService: PagoService) {}

  // Declarado antes de ":id": si no, Nest lo matchea como el parámetro
  // dinámico y el ParseIntPipe del otro endpoint devuelve un 400 confuso.
  @Get('comprobantes-imputables')
  @ApiOperation({
    summary:
      'Listar los comprobantes imputables de un proveedor (facturas y notas de crédito con saldo pendiente), para el formulario de emisión de un pago',
  })
  @ApiQuery({
    name: 'FK_proveedor',
    required: true,
    type: Number,
    description: 'Proveedor cuyos comprobantes imputables se listan',
    example: 1,
  })
  @ApiOkResponse({
    description:
      'Comprobantes REGISTRADOS con saldo pendiente > 0, sean DEBE (facturas) o HABER (notas de crédito), sin paginar',
    type: ComprobantesImputablesResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe un proveedor con ese id' })
  listarComprobantesImputables(@Query() query: QueryComprobantesImputablesDto) {
    return this.pagoService.listarComprobantesImputables(query.FK_proveedor);
  }

  @Post()
  @ApiOperation({
    summary:
      'Confirmar un pago imputado a uno o más comprobantes del proveedor. El importe total es el neto (Σ imputado a facturas − Σ imputado a notas de crédito) y descuenta el saldo pendiente de cada comprobante imputado. Es todo o nada: si una línea falla, no se registra nada',
  })
  @ApiCreatedResponse({
    description: 'Pago confirmado, con el detalle completo de sus imputaciones',
    type: PagoDetalleResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos, comprobantes repetidos o de otro proveedor, número de referencia faltante cuando la forma de pago lo requiere, fecha de pago futura o anterior a la emisión de algún comprobante, importe imputado mayor al saldo pendiente, o importe neto negativo (las notas de crédito superan la deuda seleccionada) o sin ningún comprobante que aumente el saldo',
  })
  @ApiNotFoundResponse({
    description:
      'No existe el proveedor, la forma de pago, o alguno de los comprobantes imputados',
  })
  @ApiConflictResponse({
    description:
      'El proveedor o la forma de pago están dados de baja, algún comprobante no está disponible para imputar (no REGISTRADO o sin saldo pendiente), o su saldo cambió mientras se procesaba el pago',
  })
  create(@Body() dto: CreatePagoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.pagoService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar pagos, con filtros combinables por proveedor, forma de pago, estado y período. Si se filtra por período completo (fechaDesde y fechaHasta juntos), suma un resumen de control de egresos',
  })
  @ApiQuery({
    name: 'busquedaProveedor',
    required: false,
    type: String,
    description:
      'Filtra por la razón social del proveedor de la cabecera (coincidencia parcial, palabra por palabra)',
    example: 'corralon',
  })
  @ApiQuery({
    name: 'FK_forma_pago',
    required: false,
    type: Number,
    description: 'Filtra por la forma de pago utilizada',
    example: 1,
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['CONFIRMADA', 'ANULADA'],
    description: 'Filtra por estado del pago',
    example: 'CONFIRMADA',
  })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    type: String,
    description:
      'Filtra pagos con fecha_pago mayor o igual a esta fecha (ISO 8601)',
    example: '2026-08-01',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    type: String,
    description:
      'Filtra pagos con fecha_pago menor o igual a esta fecha (ISO 8601)',
    example: '2026-08-31',
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
    description:
      'Listado paginado de pagos, más recientes primero. resumenPeriodo viaja null salvo que la query traiga fechaDesde y fechaHasta juntas; cuando viene, ignora el filtro de estado (siempre excluye los pagos anulados)',
    type: PagoListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryPagoDto) {
    return this.pagoService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Obtener un pago por id, con el detalle completo de sus imputaciones (alimenta el documento imprimible)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_pago del pago a buscar',
  })
  @ApiOkResponse({
    description:
      'Pago encontrado: cabecera + detalle, con el saldo anterior y posterior de cada comprobante imputado',
    type: PagoDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe un pago con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pagoService.findOne(id);
  }

  @Patch(':id/anular')
  @ApiOperation({
    summary:
      'Anular un pago confirmado: restituye a cada comprobante imputado exactamente el saldo que este pago había descontado. No se puede anular un pago ya anulado',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_pago del pago a anular',
  })
  @ApiOkResponse({ description: 'Pago anulado', type: PagoDetalleResponseDto })
  @ApiBadRequestResponse({
    description: 'El motivo de anulación es obligatorio',
  })
  @ApiNotFoundResponse({ description: 'No existe un pago con ese id' })
  @ApiConflictResponse({
    description: 'El pago no está CONFIRMADA (ya fue anulado)',
  })
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularPagoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pagoService.anular(id, dto, user.id);
  }
}
