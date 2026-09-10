import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CuentaCorrienteService } from './cuenta-corriente.service';
import { QueryCuentaCorrienteDto } from './dto/query-cuenta-corriente.dto';
import { CuentaCorrienteListResponseDto } from './dto/cuenta-corriente-response.dto';
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
      'Listar la cuenta corriente de proveedores activos: saldo actual (DEBE − HABER de comprobantes REGISTRADOS), cantidad de comprobantes con saldo pendiente y vencimiento más antiguo impago, ordenado por saldo descendente',
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
      'Cuenta corriente de proveedores, paginada. `resumen` cuenta deudores/a favor/sin saldo sobre el total de proveedores que matchean FK_proveedor, sin aplicar el filtro condicion_saldo — para poblar una card de resumen que no cambie según la pestaña activa de la tabla',
    type: CuentaCorrienteListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryCuentaCorrienteDto) {
    return this.cuentaCorrienteService.findAll(query);
  }
}
