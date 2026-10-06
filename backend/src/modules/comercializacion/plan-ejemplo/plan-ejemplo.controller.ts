import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { PlanEjemploService } from './plan-ejemplo.service';
import { CreatePlanEjemploDto } from './dto/create-plan-ejemplo.dto';
import { UpdatePlanEjemploDto } from './dto/update-plan-ejemplo.dto';
import { QueryPlanEjemploDto } from './dto/query-plan-ejemplo.dto';
import { SimularPlanEjemploDto } from './dto/simular-plan-ejemplo.dto';
import {
  PlanEjemploResponseDto,
  SimulacionPlanEjemploResponseDto,
} from './dto/plan-ejemplo-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

/**
 * Pantalla interna de Comercialización (HU-22): planes de pago de ejemplo de
 * cada unidad publicada. No es el catálogo público: expone el `estado` de los
 * planes, que un cliente nunca ve.
 *
 * Los importes de cada plan no se guardan: se calculan en cada respuesta con
 * el precio de lista y la TNA vigentes (sistema francés).
 */
@ApiTags('Comercialización - Planes de ejemplo')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('planes-ejemplo')
export class PlanEjemploController {
  constructor(private readonly planEjemploService: PlanEjemploService) {}

  // Declarado antes que cualquier ruta con `:id`, mismo criterio que
  // `unidades-publicables` en PublicacionController.
  @Post('simular')
  // 200 y no 201: es un cálculo, no crea ningún recurso.
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Calcular en vivo los importes y el cronograma de un plan de ejemplo mientras se arma, sin guardar nada. Usa el precio de lista y la TNA vigentes',
  })
  @ApiOkResponse({
    description:
      'Importes y cronograma por sistema francés. La cuota 0 es el anticipo y los vencimientos se cuentan desde hoy',
    type: SimulacionPlanEjemploResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos (anticipo fuera de 0 % < anticipo < 100 %, más de dos decimales, ids inválidos)',
  })
  @ApiNotFoundResponse({
    description:
      'No existe una publicación vigente o un plazo de financiación con ese id',
  })
  @ApiConflictResponse({
    description:
      'La publicación no está Disponible, o el plazo de financiación está dado de baja',
  })
  simular(@Body() dto: SimularPlanEjemploDto) {
    return this.planEjemploService.simular(dto);
  }

  @Post()
  @ApiOperation({
    summary:
      'Crear un plan de ejemplo para una publicación Disponible: nombre, anticipo en porcentaje y plazo de financiación activo',
  })
  @ApiCreatedResponse({
    description: 'Plan creado, con sus importes calculados',
    type: PlanEjemploResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos (nombre vacío, anticipo fuera de 0 % < anticipo < 100 %, ids inválidos)',
  })
  @ApiNotFoundResponse({
    description:
      'No existe una publicación vigente o un plazo de financiación con ese id',
  })
  @ApiConflictResponse({
    description:
      'La publicación no está Disponible, o el plazo de financiación está dado de baja',
  })
  create(
    @Body() dto: CreatePlanEjemploDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planEjemploService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar los planes de ejemplo de una publicación, con sus importes calculados. Por default solo los activos. Los planes cuyo plazo está dado de baja no se devuelven',
  })
  @ApiQuery({
    name: 'FK_publicacion',
    required: true,
    type: Number,
    description: 'id_publicacion de la publicación cuyos planes se listan',
    example: 1,
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false', 'todos'],
    description:
      'true (default) solo activos, false solo inactivos, todos incluye ambos',
  })
  @ApiOkResponse({
    description: 'Planes de la publicación, del más viejo al más nuevo',
    type: [PlanEjemploResponseDto],
  })
  @ApiBadRequestResponse({
    description: 'Falta FK_publicacion o alguno de los filtros es inválido',
  })
  findByPublicacion(@Query() query: QueryPlanEjemploDto) {
    return this.planEjemploService.findByPublicacion(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener el detalle de un plan de ejemplo, con sus importes',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_plan_ejemplo del plan a buscar',
  })
  @ApiOkResponse({
    description: 'Plan encontrado',
    type: PlanEjemploResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'No existe un plan de ejemplo con ese id, o su plazo está dado de baja',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.planEjemploService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Editar un plan de ejemplo: nombre, anticipo, plazo y estado (activo / inactivo). Solo con la publicación Disponible',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_plan_ejemplo del plan a editar',
  })
  @ApiOkResponse({
    description: 'Plan actualizado, con sus importes recalculados',
    type: PlanEjemploResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({
    description: 'No existe el plan, su publicación vigente o el plazo elegido',
  })
  @ApiConflictResponse({
    description:
      'La publicación no está Disponible, o el plazo con el que quedaría el plan está dado de baja',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanEjemploDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planEjemploService.update(id, dto, user.id);
  }
}
