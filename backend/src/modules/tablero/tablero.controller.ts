import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { TableroService } from './tablero.service';
import { QueryIngresosEgresosDto } from './dto/query-ingresos-egresos.dto';
import { IngresosEgresosResponseDto } from './dto/ingresos-egresos-response.dto';
import { MargenProyectoResponseDto } from './dto/margen-proyecto-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolNombre } from '../../common/enums/rol.enum';

@ApiTags('Tablero')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('tablero')
export class TableroController {
  constructor(private readonly tableroService: TableroService) {}

  @Get('ingresos-egresos')
  @ApiOperation({
    summary:
      'Ingresos, egresos y resultado de la empresa por mes, trimestre o año, con la variación contra el rango anterior de igual duración. Los ingresos se abren por proyecto; los egresos no (los pagos no se asocian a proyectos)',
  })
  @ApiQuery({
    name: 'agrupacion',
    required: false,
    enum: ['MENSUAL', 'TRIMESTRAL', 'ANUAL'],
    description: 'Tamaño de cada período. Por defecto MENSUAL',
  })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    type: String,
    description:
      'Inicio del rango (ISO 8601; una fecha sola es la medianoche de Argentina). Se envía junto con fechaHasta; sin ambas, el año en curso',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    type: String,
    description:
      'Fin del rango, inclusive (ISO 8601; una fecha sola incluye todo ese día, hasta las 23:59:59.999 de Argentina). Se envía junto con fechaDesde',
    example: '2026-12-31',
  })
  @ApiQuery({
    name: 'FK_proyecto',
    required: false,
    type: Number,
    description:
      'Limita los ingresos a un proyecto. Los egresos no se filtran y el resultado no se devuelve (viaja null)',
    example: 1,
  })
  @ApiOkResponse({
    description:
      'Un período por cada mes, trimestre o año del rango (los de los extremos recortados al rango), con todos los valores en cero si no hay datos. La variación es null cuando el rango anterior estuvo en cero y el actual no. Los cobros anulados y los pagos anulados no cuentan',
    type: IngresosEgresosResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Parámetros inválidos: fechaDesde sin fechaHasta (o al revés), rango invertido, o más de 60 períodos',
  })
  @ApiNotFoundResponse({ description: 'No existe un proyecto con ese id' })
  obtenerIngresosEgresos(@Query() query: QueryIngresosEgresosDto) {
    return this.tableroService.obtenerIngresosEgresos(query);
  }

  @Get('margen-proyecto')
  @ApiOperation({
    summary:
      'Margen comercial de cada proyecto activo: realizado (ventas vigentes) y proyectado (unidades Disponibles), sin intereses de financiación',
  })
  @ApiOkResponse({
    description:
      'Un ítem por proyecto activo, más el margen realizado total de todos los proyectos. Todo se calcula al consultar, sin almacenarse',
    type: MargenProyectoResponseDto,
  })
  obtenerMargenProyecto() {
    return this.tableroService.obtenerMargenProyecto();
  }
}
