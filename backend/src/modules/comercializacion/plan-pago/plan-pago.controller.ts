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
import { PlanPagoService } from './plan-pago.service';
import { CreatePlanPagoDto } from './dto/create-plan-pago.dto';
import { UpdatePlanPagoDto } from './dto/update-plan-pago.dto';
import { QueryPlanPagoDto } from './dto/query-plan-pago.dto';
import { SimularCuotasDto } from './dto/simular-cuotas.dto';
import {
  CuotaSimuladaDto,
  PlanPagoActualizadoResponseDto,
  PlanPagoCreadoResponseDto,
  PlanPagoResponseDto,
} from './dto/plan-pago-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

/**
 * Pantalla interna de Comercialización (HU-22): no es el catálogo público.
 * Todos los endpoints exponen el `estado` de los planes y el precio contra el
 * costo, datos que un cliente nunca ve.
 *
 * Las excepciones las tira el service (404 / 409) y las formatea el
 * `HttpExceptionFilter` global — acá no hay try/catch.
 */
@ApiTags('Comercialización - Planes de pago')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('planes-pago')
export class PlanPagoController {
  constructor(private readonly planPagoService: PlanPagoService) {}

  /**
   * Declarado antes que cualquier ruta con `:id`, mismo criterio que
   * `unidades-publicables` en PublicacionesController.
   *
   * Existe específicamente para que el frontend de T106 NO reimplemente el
   * cálculo de cuotas: si el formulario hiciera su propia división, su propio
   * redondeo y su propio manejo del día 31, la previsualización se
   * desincronizaría del backend en cuanto alguna de esas reglas cambie, y el
   * cliente terminaría viendo un cronograma distinto al que después se genera
   * de verdad. El único dueño del cálculo es `motor-cuotas.ts`.
   */
  @Post('simular-cuotas')
  // 200 y no 201: es un cálculo, no crea ningún recurso.
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Previsualizar el cronograma de cuotas de un plan antes de crearlo. No guarda nada: no necesita una publicación real',
  })
  @ApiOkResponse({
    description:
      'Cuotas simuladas: la 0 es el anticipo (o el total en un plan CONTADO) y la última absorbe la diferencia de redondeo',
    type: [CuotaSimuladaDto],
  })
  @ApiBadRequestResponse({
    description:
      'Condiciones inválidas: anticipo por porcentaje y por monto a la vez, anticipo mayor al precio, CONTADO con cuotas o periodicidad, FINANCIADO sin ellas, o precio menor o igual a 0',
  })
  simularCuotas(@Body() dto: SimularCuotasDto) {
    return this.planPagoService.simularCuotas(dto);
  }

  @Post()
  @ApiOperation({
    summary:
      'Crear un plan de pago para una publicación. Si es el primer plan activo, la publicación pasa de En preparación a Disponible',
  })
  @ApiCreatedResponse({
    description:
      'Plan creado. Incluye warning si el precio quedó por debajo del costo, y el porcentaje de ganancia implícito si no se cargaron porcentaje ni margen',
    type: PlanPagoCreadoResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El body no cumple las validaciones del plan',
  })
  @ApiNotFoundResponse({
    description: 'No existe una publicación con ese id',
  })
  @ApiConflictResponse({
    description:
      'La publicación cambió de estado comercial mientras se procesaba el alta; hay que reintentar',
  })
  create(
    @Body() dto: CreatePlanPagoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planPagoService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar los planes de pago de una publicación. Por default solo los activos',
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
    type: [PlanPagoResponseDto],
  })
  @ApiBadRequestResponse({
    description: 'Falta FK_publicacion o alguno de los filtros es inválido',
  })
  findByPublicacion(@Query() query: QueryPlanPagoDto) {
    return this.planPagoService.findByPublicacion(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle de un plan de pago' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_plan_pago del plan a buscar',
  })
  @ApiOkResponse({ description: 'Plan encontrado', type: PlanPagoResponseDto })
  @ApiNotFoundResponse({ description: 'No existe un plan de pago con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.planPagoService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Editar un plan de pago: precio, porcentaje de ganancia, margen y estado. Las condiciones estructurales (tipo, anticipo, cuotas, periodicidad) no se editan',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_plan_pago del plan a editar',
  })
  @ApiOkResponse({
    description:
      'Plan actualizado. Si el request cargó un precio nuevo, incluye warning si quedó por debajo del costo y el porcentaje de ganancia implícito si no se editaron porcentaje ni margen',
    type: PlanPagoActualizadoResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'El body trae un campo no editable (tipo, anticipo, cantidad de cuotas o periodicidad) o un valor inválido',
  })
  @ApiNotFoundResponse({ description: 'No existe un plan de pago con ese id' })
  @ApiConflictResponse({
    description:
      'No se puede editar precio/porcentaje/margen porque la publicación ya tiene una venta (En plan de pago o Vendida)',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanPagoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planPagoService.update(id, dto, user.id);
  }
}
