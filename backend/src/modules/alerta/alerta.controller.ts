import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AlertaService } from './alerta.service';
import { QueryAlertaDto } from './dto/query-alerta.dto';
import {
  AlertaListResponseDto,
  AlertaResponseDto,
} from './dto/alerta-response.dto';
import { TipoAlertaResponseDto } from './dto/tipo-alerta-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/**
 * A diferencia de los módulos de negocio, este controller NO lleva
 * `@Roles(...)`: las alertas son transversales y las consulta cualquier
 * usuario autenticado. Lo que cambia según quién pregunta no es si puede
 * entrar, sino qué alertas ve — y eso lo resuelve el service filtrando por el
 * rol del usuario, cosa que un guard no puede hacer.
 *
 * Por lo mismo ningún endpoint documenta un 403: una alerta de otro rol se
 * responde con 404, no con "existe pero no podés verla".
 */
@ApiTags('Alertas')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@Controller('alertas')
export class AlertaController {
  constructor(private readonly alertaService: AlertaService) {}

  // Va antes que @Get(':id') a propósito: si se declarara después, Nest
  // resolvería GET /alertas/tipos contra la ruta dinámica e intentaría parsear
  // "tipos" como número.
  @Get('tipos')
  @ApiOperation({
    summary:
      'Listar los tipos de alerta que puede generar el sistema, para poblar el filtro por tipo',
  })
  @ApiOkResponse({
    description: 'Tipos de alerta disponibles, ordenados por nombre',
    type: [TipoAlertaResponseDto],
  })
  findTipos() {
    return this.alertaService.findTipos();
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar las alertas dirigidas al rol del usuario autenticado (todas, si es Gerente General)',
  })
  @ApiQuery({
    name: 'FK_tipo_alerta',
    required: false,
    type: Number,
    description:
      'Filtra por tipo de alerta (los ids salen de GET /alertas/tipos)',
    example: 1,
  })
  @ApiQuery({
    name: 'atendida',
    required: false,
    type: Boolean,
    description:
      'true devuelve solo las atendidas, false solo las pendientes. Si no se manda, vienen las dos',
    example: false,
  })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    type: String,
    description:
      'Filtra alertas creadas a partir de esta fecha, inclusive (ISO 8601)',
    example: '2026-08-01',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    type: String,
    description:
      'Filtra alertas creadas hasta esta fecha, inclusive (ISO 8601)',
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
    description: 'Listado paginado de alertas, más recientes primero',
    type: AlertaListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(
    @Query() query: QueryAlertaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alertaService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una alerta por id' })
  @ApiParam({ name: 'id', type: Number, description: 'id_alerta de la alerta' })
  @ApiOkResponse({ description: 'Alerta encontrada', type: AlertaResponseDto })
  @ApiNotFoundResponse({
    description:
      'No existe una alerta con ese id, o está dirigida a otro rol (se responde igual que si no existiera)',
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alertaService.findOne(id, user);
  }

  @Patch(':id/atender')
  @ApiOperation({
    summary:
      'Marcar una alerta como atendida, dejando registrado qué usuario la atendió y cuándo',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_alerta de la alerta a marcar como atendida',
  })
  @ApiOkResponse({ description: 'Alerta atendida', type: AlertaResponseDto })
  @ApiNotFoundResponse({
    description:
      'No existe una alerta con ese id, o está dirigida a otro rol (se responde igual que si no existiera)',
  })
  @ApiConflictResponse({
    description: 'La alerta ya estaba atendida (no se puede desmarcar)',
  })
  atender(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alertaService.atender(id, user);
  }
}
