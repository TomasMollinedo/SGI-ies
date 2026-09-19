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
import { PublicacionesService } from './publicaciones.service';
import { CreatePublicacionDto } from './dto/create-publicacion.dto';
import { DespublicarPublicacionDto } from './dto/despublicar-publicacion.dto';
import { QueryPublicacionDto } from './dto/query-publicacion.dto';
import { QueryUnidadesPublicablesDto } from './dto/query-unidades-publicables.dto';
import {
  PublicacionListResponseDto,
  PublicacionDetalleResponseDto,
} from './dto/publicacion-response.dto';
import { UnidadPublicableListResponseDto } from './dto/unidad-publicable-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

@ApiTags('Publicaciones')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('publicaciones')
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  // Declarado antes de ":id": si no, Nest lo matchea como el parámetro
  // dinámico (mismo criterio que "comprobantes-imputables" en PagoController).
  @Get('unidades-publicables')
  @ApiOperation({
    summary:
      'Listar unidades funcionales publicables (activas, de proyecto no cancelado y sin publicación vigente), para la tabla emergente de selección al publicar',
  })
  @ApiQuery({
    name: 'id_proyecto',
    required: false,
    type: Number,
    description: 'Filtra por proyecto',
    example: 1,
  })
  @ApiQuery({
    name: 'tipologia',
    required: false,
    enum: [
      'MONOAMBIENTE',
      'UN_DORMITORIO',
      'DOS_DORMITORIOS',
      'TRES_DORMITORIOS',
      'LOCAL_COMERCIAL',
      'COCHERA',
      'OTRO',
    ],
    description: 'Filtra por tipología de la unidad',
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
      'Listado paginado. Las unidades de proyecto En planificación vienen con publicable: false y su motivo',
    type: UnidadPublicableListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findUnidadesPublicables(@Query() query: QueryUnidadesPublicablesDto) {
    return this.publicacionesService.findUnidadesPublicables(query);
  }

  @Post()
  @ApiOperation({
    summary:
      'Publicar una unidad funcional en el ecommerce. Nace en Publicación en preparación',
  })
  @ApiCreatedResponse({
    description: 'Publicación creada',
    type: PublicacionDetalleResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({
    description: 'No existe una unidad funcional con ese id',
  })
  @ApiConflictResponse({
    description:
      'La unidad está dada de baja, su proyecto está En planificación o fue cancelado, o ya tiene una publicación vigente (en ese caso, el body incluye datos.id_publicacion_vigente)',
  })
  publicar(
    @Body() dto: CreatePublicacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.publicacionesService.publicar(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listado interno de publicaciones, con filtros combinables por vigencia, estado comercial, proyecto y tipología. Sin filtro de vigencia, incluye el historial',
  })
  @ApiQuery({
    name: 'vigente',
    required: false,
    enum: ['true', 'false'],
    description: 'Filtra por publicaciones vigentes o no vigentes',
  })
  @ApiQuery({
    name: 'estado_comercial',
    required: false,
    enum: ['EN_PREPARACION', 'DISPONIBLE', 'EN_PLAN_DE_PAGO', 'VENDIDA'],
    description: 'Filtra por estado comercial',
  })
  @ApiQuery({
    name: 'id_proyecto',
    required: false,
    type: Number,
    description: 'Filtra por el proyecto de la unidad publicada',
    example: 1,
  })
  @ApiQuery({
    name: 'tipologia',
    required: false,
    enum: [
      'MONOAMBIENTE',
      'UN_DORMITORIO',
      'DOS_DORMITORIOS',
      'TRES_DORMITORIOS',
      'LOCAL_COMERCIAL',
      'COCHERA',
      'OTRO',
    ],
    description: 'Filtra por la tipología de la unidad publicada',
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
    description: 'Listado paginado de publicaciones, más recientes primero',
    type: PublicacionListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryPublicacionDto) {
    return this.publicacionesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Obtener el detalle de una publicación: datos heredados en vivo de la unidad, sus imágenes, el proyecto y la condición de entrega calculada',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_publicacion de la publicación a buscar',
  })
  @ApiOkResponse({
    description: 'Publicación encontrada',
    type: PublicacionDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe una publicación con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.publicacionesService.findOne(id);
  }

  @Patch(':id/despublicar')
  @ApiOperation({
    summary:
      'Despublicar una publicación vigente. Solo permitido en Publicación en preparación o Disponible; no toca planes de pago ni consultas',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_publicacion de la publicación a despublicar',
  })
  @ApiOkResponse({
    description: 'Publicación despublicada',
    type: PublicacionDetalleResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El motivo de despublicación es obligatorio',
  })
  @ApiNotFoundResponse({ description: 'No existe una publicación con ese id' })
  @ApiConflictResponse({
    description:
      'La publicación ya fue despublicada, o su estado comercial es En Plan de Pago o Vendida',
  })
  despublicar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DespublicarPublicacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.publicacionesService.despublicar(id, dto, user.id);
  }
}
