import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ConsultaService } from './consulta.service';
import { QueryConsultaDto } from './dto/query-consulta.dto';
import { ResponderConsultaDto } from './dto/responder-consulta.dto';
import {
  ConsultaInternaListResponseDto,
  ConsultaInternaResponseDto,
} from './dto/consulta-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import { EstadoConsulta } from '../../../../generated/prisma/enums';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

/**
 * Contraparte interna de ConsultaController (que es 100% de cliente): acá
 * Comercialización resuelve la cola de consultas. Controller separado a
 * propósito — mismo dominio, pero mecanismo de auth completamente distinto
 * (JwtAuthGuard/RolesGuard globales de USUARIO, no ClienteAuthGuard), así
 * que no puede mezclarse en un solo controller. Mismo patrón que
 * `DeclaracionPagoAdminController`.
 */
@ApiTags('Consultas')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('consultas')
export class ConsultaAdminController {
  constructor(private readonly consultaService: ConsultaService) {}

  @Get()
  @ApiOperation({
    summary:
      'Cola de consultas, filtrable por unidad, cliente, estado y período (HU-26)',
    description:
      'Es una cola de trabajo, no un dashboard: sin indicadores ni resúmenes, solo el listado paginado, más reciente primero. Incluye las consultas de unidades ya despublicadas: no se borran nunca.',
  })
   @ApiQuery({ name: 'FK_proyecto', required: false, type: Number })
  @ApiQuery({
    name: 'identificador',
    required: false,
    type: String,
    description:
      'Coincidencia parcial contra el identificador de la unidad (ej. "3A"), sin importar mayúsculas ni el proyecto — combinar con FK_proyecto para acotar a una unidad puntual, porque el identificador solo es único dentro de su proyecto',
  })
  @ApiQuery({ name: 'FK_cliente', required: false, type: Number })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoConsulta })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    type: String,
    description:
      'Filtra consultas con hora_creacion mayor o igual a esta fecha (ISO 8601)',
    example: '2026-08-01',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    type: String,
    description:
      'Filtra consultas con hora_creacion menor o igual a esta fecha (ISO 8601)',
    example: '2026-08-31',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Listado paginado, más reciente primero',
    type: ConsultaInternaListResponseDto,
  })
  listar(@Query() query: QueryConsultaDto) {
    return this.consultaService.listar(query);
  }

  @Patch(':id/responder')
  @ApiOperation({
    summary: 'Responde una consulta pendiente (HU-26)',
    description:
      'Pasa la consulta de Pendiente a Respondida. No se puede volver a responder una consulta ya respondida, y no existe ningún endpoint para editar la respuesta enviada.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_consulta a responder',
  })
  @ApiOkResponse({
    description: 'Consulta respondida',
    type: ConsultaInternaResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe una consulta con ese id' })
  @ApiConflictResponse({ description: 'La consulta ya fue respondida' })
  responder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResponderConsultaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consultaService.responder(id, dto, user.id);
  }
}
