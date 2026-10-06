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
import { ProyectoService } from './proyecto.service';
import { QueryProyectoDto } from './dto/query-proyecto.dto';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { CambiarEstadoObraDto } from './dto/cambiar-estado-obra.dto';
import { CreateImagenProyectoDto } from './dto/create-imagen-proyecto.dto';
import { OrdenarImagenesProyectoDto } from './dto/ordenar-imagenes-proyecto.dto';
import {
  ProyectoDetalleResponseDto,
  ProyectoListResponseDto,
} from './dto/proyecto-response.dto';
import { CatalogoItemDto } from '../../common/dto/catalogo-item.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolNombre } from '../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { EstadoProyecto } from '../../../generated/prisma/enums';

/** ABM de Proyecto (HU-31). Las reglas de negocio están en `ProyectoService`. */
@ApiTags('Proyectos')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('proyectos')
export class ProyectoController {
  constructor(private readonly proyectoService: ProyectoService) {}

  @Post()
  @ApiOperation({
    summary: 'Dar de alta un proyecto',
    description:
      'Nace En planificación y activo. El código (`PROY-0001`) lo genera el sistema; no se manda en el body.',
  })
  @ApiCreatedResponse({
    description: 'Proyecto creado',
    type: ProyectoDetalleResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos (por ejemplo, fecha de fin estimada anterior a la de inicio)',
  })
  @ApiConflictResponse({
    description: 'Ya existe un proyecto activo con ese nombre',
  })
  create(
    @Body() dto: CreateProyectoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.proyectoService.create(dto, user.id);
  }

  // Va antes que @Get(':id') a propósito: si no, Nest matchea GET
  // /proyectos/estados contra la ruta dinámica e intenta parsear "estados"
  // como el id numérico.
  @Get('estados')
  @ApiOperation({
    summary:
      'Listar los estados de obra posibles de un proyecto, para poblar el <select> del frontend',
  })
  @ApiOkResponse({
    description: 'Catálogo de estados de obra del proyecto',
    type: [CatalogoItemDto],
  })
  findEstados() {
    return this.proyectoService.findEstados();
  }

  // También antes que @Get(':id'), por el mismo motivo.
  @Get('localidades')
  @ApiOperation({
    summary:
      'Listar las localidades cargadas en los proyectos activos, para poblar el filtro del listado',
    description:
      'No es una lista fija: sale de los proyectos activos, sin repetir (sin distinguir mayúsculas) y en orden alfabético. `id` y `code` son la misma localidad.',
  })
  @ApiOkResponse({
    description: 'Catálogo de localidades',
    type: [CatalogoItemDto],
  })
  findLocalidades() {
    return this.proyectoService.findLocalidades();
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar proyectos, con su presupuesto y las unidades cargadas contra las planificadas',
  })
  @ApiQuery({
    name: 'busqueda',
    required: false,
    type: String,
    description:
      'Coincidencia parcial de nombre (cada palabra por separado, sin importar el orden) o de código',
    example: 'torre nogal',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['true', 'false', 'todos'],
    description:
      'Filtra por proyectos activos (true), dados de baja (false), o ambos (todos). Sin este parámetro, trae solo los activos.',
  })
  @ApiQuery({
    name: 'estado_obra',
    required: false,
    enum: EstadoProyecto,
    description: 'Filtra por estado de obra',
  })
  @ApiQuery({
    name: 'localidad',
    required: false,
    type: String,
    description:
      'Coincidencia exacta de localidad, sin distinguir mayúsculas (ver GET /proyectos/localidades)',
    example: 'Resistencia, Chaco',
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
    description: 'Listado paginado de proyectos, ordenado por nombre',
    type: ProyectoListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Parámetros de filtro/paginación inválidos',
  })
  findAll(@Query() query: QueryProyectoDto) {
    return this.proyectoService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Obtener un proyecto por id (activo o dado de baja), con su presupuesto, sus imágenes de diseño y quién lo creó y modificó',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_proyecto del proyecto a buscar',
  })
  @ApiOkResponse({
    description: 'Proyecto encontrado',
    type: ProyectoDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe un proyecto con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.proyectoService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar un proyecto',
    description:
      'Edición parcial: solo se modifica lo que llega. En `descripcion`, `fecha_inicio`, `fecha_fin_estimada` e `imagen_portada_url`, `null` borra el valor guardado. El código, el estado de obra y la baja no se cambian por acá.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_proyecto del proyecto a editar',
  })
  @ApiOkResponse({
    description: 'Proyecto actualizado',
    type: ProyectoDetalleResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos, o la fecha de fin estimada queda anterior a la de inicio (contando los valores ya guardados)',
  })
  @ApiNotFoundResponse({ description: 'No existe un proyecto con ese id' })
  @ApiConflictResponse({
    description:
      'El proyecto está dado de baja o Cancelado; ya existe otro proyecto activo con ese nombre; las unidades planificadas quedan por debajo de las unidades activas ya cargadas; o se intenta cambiar la fecha de fin estimada de un proyecto Finalizado',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProyectoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.proyectoService.update(id, dto, user.id);
  }

  @Patch(':id/estado-obra')
  @ApiOperation({
    summary: 'Avanzar el estado de obra de un proyecto',
    description:
      'Solo al estado inmediatamente siguiente: En planificación → En ejecución → Finalizado. Sin saltos ni retrocesos. Pasar a En ejecución exige al menos una unidad funcional activa.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_proyecto del proyecto al que se le cambia el estado',
  })
  @ApiOkResponse({
    description: 'Proyecto con el nuevo estado de obra',
    type: ProyectoDetalleResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Estado de destino inválido: solo se acepta EN_EJECUCION o FINALIZADO',
  })
  @ApiNotFoundResponse({ description: 'No existe un proyecto con ese id' })
  @ApiConflictResponse({
    description:
      'La transición no es el avance inmediato desde el estado actual (salto, retroceso o repetición); el proyecto no tiene unidades activas al pasar a En ejecución; o el proyecto está dado de baja o Cancelado',
  })
  cambiarEstadoObra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoObraDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.proyectoService.cambiarEstadoObra(id, dto, user.id);
  }

  @Patch(':id/baja')
  @ApiOperation({ summary: 'Dar de baja un proyecto (baja lógica)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_proyecto del proyecto a dar de baja',
  })
  @ApiOkResponse({
    description: 'Proyecto dado de baja',
    type: ProyectoDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe un proyecto con ese id' })
  @ApiConflictResponse({
    description:
      'El proyecto ya está dado de baja; no está En planificación; o tiene unidades funcionales activas. El mensaje indica el motivo.',
  })
  baja(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.proyectoService.baja(id, user.id);
  }

  @Post(':id/imagenes')
  @ApiOperation({
    summary: 'Agregar una imagen de diseño (render o plano) al proyecto',
    description:
      'Recibe la URL pública que devolvió POST /almacenamiento/imagenes (el archivo ya está subido). Sin `orden`, la imagen va al final de la galería.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_proyecto del proyecto',
  })
  @ApiCreatedResponse({
    description: 'Proyecto con su galería actualizada',
    type: ProyectoDetalleResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'URL inválida (tiene que ser http o https) o tipo de imagen inválido',
  })
  @ApiNotFoundResponse({ description: 'No existe un proyecto con ese id' })
  @ApiConflictResponse({
    description: 'El proyecto está dado de baja o Cancelado',
  })
  agregarImagen(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateImagenProyectoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.proyectoService.agregarImagen(id, dto, user.id);
  }

  // Va antes que @Delete(':id/imagenes/:idImagen') por prolijidad: "orden" no
  // es un id de imagen. Son métodos HTTP distintos, así que no chocan.
  @Patch(':id/imagenes/orden')
  @ApiOperation({
    summary: 'Reordenar la galería del proyecto',
    description:
      'Recibe los ids de TODAS las imágenes del proyecto (renders y planos juntos) en el orden nuevo; la primera queda con orden 0.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_proyecto del proyecto',
  })
  @ApiOkResponse({
    description: 'Proyecto con su galería reordenada',
    type: ProyectoDetalleResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'La lista está vacía, repite imágenes, o no incluye exactamente las imágenes actuales del proyecto',
  })
  @ApiNotFoundResponse({ description: 'No existe un proyecto con ese id' })
  @ApiConflictResponse({
    description: 'El proyecto está dado de baja o Cancelado',
  })
  ordenarImagenes(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OrdenarImagenesProyectoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.proyectoService.ordenarImagenes(id, dto, user.id);
  }

  @Delete(':id/imagenes/:idImagen')
  @ApiOperation({
    summary: 'Quitar una imagen de la galería del proyecto (borrado físico)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_proyecto del proyecto',
  })
  @ApiParam({
    name: 'idImagen',
    type: Number,
    description: 'id_imagen_proyecto de la imagen a quitar',
  })
  @ApiOkResponse({
    description: 'Proyecto con su galería actualizada',
    type: ProyectoDetalleResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'No existe el proyecto, o la imagen no pertenece a ese proyecto',
  })
  @ApiConflictResponse({
    description: 'El proyecto está dado de baja o Cancelado',
  })
  quitarImagen(
    @Param('id', ParseIntPipe) id: number,
    @Param('idImagen', ParseIntPipe) idImagen: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.proyectoService.quitarImagen(id, idImagen, user.id);
  }
}
