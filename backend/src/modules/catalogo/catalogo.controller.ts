import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CatalogoService } from './catalogo.service';
import { QueryCatalogoDto } from './dto/query-catalogo.dto';
import {
  CatalogoDetalleResponseDto,
  CatalogoListResponseDto,
  ProyectosDestacadosResponseDto,
} from './dto/catalogo-response.dto';
import { Public } from '../../common/decorators/public.decorator';

/**
 * API pública del ecommerce (T107): sin autenticación, consumida por la
 * landing y el catálogo público. Ningún endpoint acá lleva `@Roles(...)`
 * ni `@ApiBearerAuth()` — no aplica, no hace falta estar logueado para nada
 * de este controller.
 */
@ApiTags('Catálogo Público')
@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Lista las unidades disponibles para la venta',
    description:
      'Solo unidades con publicación vigente y estado comercial DISPONIBLE. El "precio desde" es el menor precio entre los planes de pago activos de la unidad.',
  })
  @ApiQuery({
    name: 'FK_proyecto',
    required: false,
    type: Number,
    description: 'Filtra las unidades de un proyecto puntual',
  })
  @ApiQuery({
    name: 'localidad',
    required: false,
    type: String,
    description:
      'Filtra por coincidencia parcial contra la localidad del proyecto',
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
  })
  @ApiQuery({
    name: 'entregada',
    required: false,
    enum: ['true', 'false'],
    description:
      'Condición de entrega: true = proyecto finalizado ("Entregada"), false = todavía no ("A entregar")',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 12 })
  @ApiOkResponse({
    description: 'Listado paginado del catálogo',
    type: CatalogoListResponseDto,
  })
  listar(@Query() query: QueryCatalogoDto) {
    return this.catalogoService.listarCatalogo(query);
  }

  @Public()
  @Get('destacados')
  @ApiOperation({
    summary: 'Hasta 4 proyectos con más unidades disponibles, para la landing',
  })
  @ApiOkResponse({
    description:
      'Proyectos destacados (lista vacía si no hay ninguna unidad disponible)',
    type: ProyectosDestacadosResponseDto,
  })
  destacados() {
    return this.catalogoService.obtenerDestacados();
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Detalle público de una unidad, con sus planes de pago activos',
  })
  @ApiParam({ name: 'id', type: Number, description: 'id_unidad_funcional' })
  @ApiOkResponse({
    description: 'Detalle de la unidad',
    type: CatalogoDetalleResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe, o existe pero no está publicada/disponible',
  })
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.catalogoService.obtenerDetalle(id);
  }
}
