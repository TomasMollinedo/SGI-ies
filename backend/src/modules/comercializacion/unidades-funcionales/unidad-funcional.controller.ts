import {
  Body,
  Controller,
  Delete,
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
import { UnidadFuncionalService } from './unidad-funcional.service';
import { CreateUnidadFuncionalDto } from './dto/create-unidad-funcional.dto';
import { UpdateUnidadFuncionalDto } from './dto/update-unidad-funcional.dto';
import { QueryUnidadFuncionalDto } from './dto/query-unidad-funcional.dto';
import { CreateImagenUnidadDto } from './dto/create-imagen-unidad.dto';
import { OrdenarImagenesUnidadDto } from './dto/ordenar-imagenes-unidad.dto';
import {
  UnidadFuncionalDetalleResponseDto,
  UnidadFuncionalListResponseDto,
} from './dto/unidad-funcional-response.dto';
import { CatalogoItemDto } from '../../../common/dto/catalogo-item.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { TipologiaUnidad } from '../../../../generated/prisma/enums';

@ApiTags('Unidades Funcionales')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('unidades-funcionales')
export class UnidadFuncionalController {
  constructor(
    private readonly unidadFuncionalService: UnidadFuncionalService,
  ) {}

  // Va antes que @Get(':id') a propósito: si no, Nest matchea GET
  // /unidades-funcionales/tipologias contra la ruta dinámica e intenta
  // parsear "tipologias" como el id numérico.
  @Get('tipologias')
  @ApiOperation({
    summary:
      'Listar las tipologías posibles de una unidad, para poblar el <select> del frontend',
  })
  @ApiOkResponse({
    description: 'Catálogo de tipologías',
    type: [CatalogoItemDto],
  })
  findTipologias() {
    return this.unidadFuncionalService.findTipologias();
  }

  @Post()
  @ApiOperation({
    summary:
      'Crear una unidad funcional (solo con el proyecto En planificación)',
  })
  @ApiCreatedResponse({
    description: 'Unidad creada',
    type: UnidadFuncionalDetalleResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos: falta un campo obligatorio, o la superficie cubierta o el costo son cero o negativos (el error señala el campo)',
  })
  @ApiNotFoundResponse({ description: 'No existe el proyecto indicado' })
  @ApiConflictResponse({
    description:
      'Ya existe una unidad activa con ese identificador en el proyecto, o el proyecto no está En planificación',
  })
  create(
    @Body() dto: CreateUnidadFuncionalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unidadFuncionalService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar unidades funcionales, con filtros por proyecto, tipología y rango de superficie cubierta',
  })
  @ApiQuery({
    name: 'FK_proyecto',
    required: false,
    type: Number,
    description: 'Filtra las unidades de un proyecto',
  })
  @ApiQuery({
    name: 'tipologia',
    required: false,
    enum: TipologiaUnidad,
    description: 'Filtra por tipología',
  })
  @ApiQuery({
    name: 'superficie_min',
    required: false,
    type: Number,
    description: 'Superficie cubierta mínima, inclusive',
    example: 40,
  })
  @ApiQuery({
    name: 'superficie_max',
    required: false,
    type: Number,
    description: 'Superficie cubierta máxima, inclusive',
    example: 80,
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false', 'todos'],
    description:
      'Filtra por unidades activas (true), dadas de baja (false), o ambas (todos). Sin este parámetro, trae solo las activas.',
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
      'Listado paginado, ordenado por proyecto y, dentro de cada uno, en el orden de carga',
    type: UnidadFuncionalListResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Parámetros de filtro/paginación inválidos (por ejemplo, superficie mínima mayor que la máxima)',
  })
  findAll(@Query() query: QueryUnidadFuncionalDto) {
    return this.unidadFuncionalService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una unidad funcional por id (modo lectura)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_unidad_funcional de la unidad a buscar',
  })
  @ApiOkResponse({
    description:
      'Unidad encontrada, con su galería, si el costo es editable y quién la creó y modificó por última vez',
    type: UnidadFuncionalDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe una unidad con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.unidadFuncionalService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Editar una unidad funcional (el costo solo mientras nunca haya sido publicada)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_unidad_funcional de la unidad a editar',
  })
  @ApiOkResponse({
    description: 'Unidad actualizada',
    type: UnidadFuncionalDetalleResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiNotFoundResponse({ description: 'No existe una unidad con ese id' })
  @ApiConflictResponse({
    description:
      'Identificador repetido entre las unidades activas del proyecto; costo de una unidad que tiene o tuvo una publicación (el ajuste se hace desde el margen de Comercialización); unidad dada de baja; o proyecto Cancelado',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUnidadFuncionalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unidadFuncionalService.update(id, dto, user.id);
  }

  @Patch(':id/baja')
  @ApiOperation({ summary: 'Dar de baja una unidad funcional (baja lógica)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_unidad_funcional de la unidad a dar de baja',
  })
  @ApiOkResponse({
    description: 'Unidad dada de baja',
    type: UnidadFuncionalDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe una unidad con ese id' })
  @ApiConflictResponse({
    description:
      'La unidad ya está dada de baja; tiene una publicación vigente en el ecommerce (primero hay que despublicarla); su proyecto está En ejecución o Finalizado; o su proyecto está Cancelado. El mensaje indica el motivo (o los dos, si se dan a la vez).',
  })
  baja(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unidadFuncionalService.baja(id, user.id);
  }

  @Patch(':id/alta')
  @ApiOperation({
    summary: 'Reactivar una unidad funcional dada de baja (alta lógica)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_unidad_funcional de la unidad a reactivar',
  })
  @ApiOkResponse({
    description: 'Unidad reactivada',
    type: UnidadFuncionalDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe una unidad con ese id' })
  @ApiConflictResponse({
    description:
      'La unidad ya está activa; su proyecto no está En planificación; o ya existe otra unidad activa con el mismo identificador en el proyecto',
  })
  alta(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unidadFuncionalService.activar(id, user.id);
  }

  @Post(':id/imagenes')
  @ApiOperation({
    summary: 'Agregar una imagen a la galería de la unidad',
    description:
      'Recibe la URL pública que devolvió POST /almacenamiento/imagenes (el archivo ya está subido). Sin `orden`, la imagen va al final de la galería.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_unidad_funcional de la unidad',
  })
  @ApiCreatedResponse({
    description: 'Unidad con su galería actualizada',
    type: UnidadFuncionalDetalleResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'URL inválida (tiene que ser http o https)',
  })
  @ApiNotFoundResponse({ description: 'No existe una unidad con ese id' })
  @ApiConflictResponse({
    description: 'La unidad está dada de baja, o su proyecto está Cancelado',
  })
  agregarImagen(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateImagenUnidadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unidadFuncionalService.agregarImagen(id, dto, user.id);
  }

  // Va antes que @Delete(':id/imagenes/:idImagen') por prolijidad: "orden" no
  // es un id de imagen. Son métodos HTTP distintos, así que no chocan.
  @Patch(':id/imagenes/orden')
  @ApiOperation({
    summary: 'Reordenar la galería de la unidad',
    description:
      'Recibe los ids de TODAS las imágenes de la unidad en el orden nuevo; la primera queda con orden 0.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_unidad_funcional de la unidad',
  })
  @ApiOkResponse({
    description: 'Unidad con su galería reordenada',
    type: UnidadFuncionalDetalleResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'La lista está vacía, repite imágenes, o no incluye exactamente las imágenes actuales de la unidad',
  })
  @ApiNotFoundResponse({ description: 'No existe una unidad con ese id' })
  @ApiConflictResponse({
    description: 'La unidad está dada de baja, o su proyecto está Cancelado',
  })
  ordenarImagenes(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OrdenarImagenesUnidadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unidadFuncionalService.ordenarImagenes(id, dto, user.id);
  }

  @Delete(':id/imagenes/:idImagen')
  @ApiOperation({
    summary: 'Quitar una imagen de la galería de la unidad (borrado físico)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_unidad_funcional de la unidad',
  })
  @ApiParam({
    name: 'idImagen',
    type: Number,
    description: 'id_imagen_unidad de la imagen a quitar',
  })
  @ApiOkResponse({
    description: 'Unidad con su galería actualizada',
    type: UnidadFuncionalDetalleResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe la unidad, o la imagen no pertenece a esa unidad',
  })
  @ApiConflictResponse({
    description: 'La unidad está dada de baja, o su proyecto está Cancelado',
  })
  quitarImagen(
    @Param('id', ParseIntPipe) id: number,
    @Param('idImagen', ParseIntPipe) idImagen: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.unidadFuncionalService.quitarImagen(id, idImagen, user.id);
  }
}