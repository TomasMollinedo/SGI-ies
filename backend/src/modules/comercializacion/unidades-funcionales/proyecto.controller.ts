import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import {
  ProyectoListResponseDto,
  ProyectoResponseDto,
} from './dto/proyecto-response.dto';
import { CatalogoItemDto } from '../../../common/dto/catalogo-item.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import { EstadoProyecto } from '../../../../generated/prisma/enums';

/**
 * Solo lectura y provisorio (ver `ProyectoService`): no hay ABM de Proyecto,
 * los proyectos se cargan por seed.
 */
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

  // Va antes que @Get(':id') a propósito: si no, Nest matchea GET
  // /proyectos/estados contra la ruta dinámica e intenta parsear "estados"
  // como el id numérico.
  @Get('estados')
  @ApiOperation({
    summary:
      'Listar los estados posibles de un proyecto, para poblar el <select> del frontend',
  })
  @ApiOkResponse({
    description: 'Catálogo de estados del proyecto',
    type: [CatalogoItemDto],
  })
  findEstados() {
    return this.proyectoService.findEstados();
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar proyectos (solo lectura), con su presupuesto y las unidades cargadas contra las planificadas',
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
    enum: EstadoProyecto,
    description: 'Filtra por estado del proyecto',
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
      'Obtener un proyecto por id, con su presupuesto (sirve para refrescarlo tras un alta o una baja de unidad)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_proyecto del proyecto a buscar',
  })
  @ApiOkResponse({
    description: 'Proyecto encontrado',
    type: ProyectoResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe un proyecto con ese id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.proyectoService.findOne(id);
  }
}