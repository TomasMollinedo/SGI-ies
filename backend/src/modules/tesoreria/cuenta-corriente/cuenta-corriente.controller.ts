import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CuentaCorrienteService } from './cuenta-corriente.service';
import { QueryCuentaCorrienteDto } from './dto/query-cuenta-corriente.dto';
import { CuentaCorrienteListResponseDto } from './dto/cuenta-corriente-response.dto';
import { QueryMovimientosCuentaCorrienteDto } from './dto/query-movimientos-cuenta-corriente.dto';
import { MovimientosCuentaCorrienteResponseDto } from './dto/movimientos-cuenta-corriente-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';

@ApiTags('Cuenta corriente')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('cuentas-corrientes')
export class CuentaCorrienteController {
  constructor(
    private readonly cuentaCorrienteService: CuentaCorrienteService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Listar la cuenta corriente de proveedores: saldo actual (DEBE − HABER de comprobantes REGISTRADOS), cantidad de comprobantes con saldo pendiente y vencimiento más antiguo impago, ordenado por saldo descendente. Sin filtro estado, trae activos e inactivos',
  })
  @ApiQuery({
    name: 'FK_proveedor',
    required: false,
    type: Number,
    description: 'Filtra por un proveedor puntual',
    example: 1,
  })
  @ApiQuery({
    name: 'condicion_saldo',
    required: false,
    enum: ['DEUDOR', 'A_FAVOR', 'SIN_SALDO'],
    description:
      'Filtra por condición de saldo: DEUDOR (saldo > 0), A_FAVOR (saldo < 0) o SIN_SALDO (saldo = 0)',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false'],
    description:
      'Filtra por proveedores activos (true) o dados de baja (false). Sin este parámetro, trae ambos: un proveedor dado de baja puede seguir teniendo saldo pendiente.',
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
      'Cuenta corriente de proveedores, paginada. `resumen` cuenta deudores/a favor/sin saldo y el balance neto (saldo_total: Σ saldo de todos) sobre el total de proveedores que matchean FK_proveedor y estado, sin aplicar el filtro condicion_saldo — para poblar una card de resumen que no cambie según la pestaña activa de la tabla',
    type: CuentaCorrienteListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryCuentaCorrienteDto) {
    return this.cuentaCorrienteService.findAll(query);
  }

  @Get(':id/movimientos')
  @ApiOperation({
    summary:
      'Extracto cronológico de la cuenta de un proveedor: comprobantes REGISTRADOS y pagos CONFIRMADOS, con DEBE, HABER y saldo acumulado, ordenado por fecha ascendente',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_proveedor cuyo extracto se consulta',
  })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    type: String,
    description:
      'Filtra movimientos con fecha mayor o igual a esta (ISO 8601). Si se manda, la primera fila es una fila sintética de APERTURA con el saldo acumulado real hasta ese momento',
    example: '2026-08-01',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    type: String,
    description: 'Filtra movimientos con fecha menor o igual a esta (ISO 8601)',
    example: '2026-08-31',
  })
  @ApiQuery({
    name: 'clase',
    required: false,
    enum: ['COMPROBANTE', 'PAGO'],
    description:
      'Filtra qué filas se muestran. No cambia el cálculo de saldo_acumulado: siempre refleja el saldo real (comprobantes + pagos)',
  })
  @ApiOkResponse({
    description:
      'Extracto de cuenta corriente del proveedor. Sin filtros, el saldo_acumulado de la última fila coincide con el saldo actual del proveedor en GET /cuentas-corrientes',
    type: MovimientosCuentaCorrienteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Parámetros de filtro inválidos' })
  @ApiNotFoundResponse({ description: 'No existe un proveedor con ese id' })
  obtenerMovimientos(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryMovimientosCuentaCorrienteDto,
  ) {
    return this.cuentaCorrienteService.obtenerMovimientos(id, query);
  }
}
