import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ConsultaService } from './consulta.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { QueryMisConsultasDto } from './dto/query-mis-consultas.dto';
import {
  ConsultaClienteListResponseDto,
  ConsultaClienteResponseDto,
} from './dto/consulta-response.dto';
import { ClienteAuthGuard } from '../cliente-auth/guards/cliente-auth.guard';
import { CurrentCliente } from '../cliente-auth/decorators/current-cliente.decorator';
import type { AuthenticatedCliente } from '../cliente-auth/strategies/cliente-jwt.strategy';
import { Public } from '../../../common/decorators/public.decorator';

const MENSAJE_NO_AUTENTICADO = 'No autenticado';

/**
 * Mismo motivo que ClienteController: `@Public()` a nivel de clase porque
 * JwtAuthGuard/RolesGuard globales (APP_GUARD, strategy 'jwt' de USUARIO)
 * rechazarían un token de CLIENTE antes de llegar acá. La protección real es
 * `ClienteAuthGuard` (`@UseGuards` abajo), sobre la strategy 'jwt-cliente' —
 * ver el comentario completo en ClienteController. Mismo patrón que
 * `DeclaracionPagoController`/`DeclaracionPagoAdminController`.
 */
@ApiTags('Consultas')
@Public()
@UseGuards(ClienteAuthGuard)
@Controller('cliente/consultas')
export class ConsultaController {
  constructor(private readonly consultaService: ConsultaService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Envía una consulta sobre una unidad publicada disponible (HU-26)',
    description:
      'Requiere sesión de cliente iniciada (a diferencia de navegar el catálogo, que es libre). Solo se puede consultar sobre una unidad con publicación vigente y estado comercial Disponible. Sin restricción de unicidad: el mismo cliente puede enviar más de una consulta sobre la misma unidad.',
  })
  @ApiCreatedResponse({
    description: 'Consulta creada, nace en estado Pendiente',
    type: ConsultaClienteResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El texto es obligatorio o supera el largo máximo',
  })
  @ApiUnauthorizedResponse({ description: MENSAJE_NO_AUTENTICADO })
  @ApiNotFoundResponse({
    description:
      'No existe una unidad con ese id, o existe pero no tiene una publicación vigente y disponible',
  })
  crear(
    @Body() dto: CreateConsultaDto,
    @CurrentCliente() cliente: AuthenticatedCliente,
  ) {
    return this.consultaService.crear(dto, cliente.id);
  }

  @Get('mis-consultas')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Historial de consultas del cliente autenticado (HU-26)',
    description:
      'Solo las consultas del propio cliente, de la más reciente a la más antigua, con la respuesta cuando existe. Sigue mostrando las consultas de unidades que después se despublicaron: no se borran nunca.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Historial paginado del cliente autenticado',
    type: ConsultaClienteListResponseDto,
  })
  @ApiUnauthorizedResponse({ description: MENSAJE_NO_AUTENTICADO })
  misConsultas(
    @Query() query: QueryMisConsultasDto,
    @CurrentCliente() cliente: AuthenticatedCliente,
  ) {
    return this.consultaService.listarDeCliente(
      cliente.id,
      query.page,
      query.limit,
    );
  }
}
