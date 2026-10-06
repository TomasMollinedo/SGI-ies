import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CatalogoService } from './catalogo.service';
import { QueryCatalogoDto } from './dto/query-catalogo.dto';
import { SimularPlanCatalogoDto } from './dto/simular-plan-catalogo.dto';
import {
  CatalogoDetalleResponseDto,
  CatalogoListResponseDto,
  ProyectosDestacadosResponseDto,
  SimulacionCatalogoResponseDto,
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
      'Solo unidades con publicación vigente y estado comercial DISPONIBLE. El "precio desde" es el precio de lista de la publicación (precio de contado).',
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
    description:
      'A igual cantidad de unidades disponibles, desempata el orden alfabético del nombre del proyecto. `precio_desde` es el menor precio de lista entre sus unidades disponibles.',
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
    summary:
      'Detalle público de una unidad, con sus planes de ejemplo y los plazos del simulador',
    description:
      'Los planes de ejemplo activos se calculan al responder, con el precio de lista y la TNA vigente de su plazo. `simulador` es null si no hay plazos de financiación activos: en ese caso solo corresponde mostrar el precio de contado (`precio_desde`).',
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

  @Public()
  @Post(':id/simulacion')
  // Es un POST porque lleva body, pero no crea nada: responde 200, no 201.
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simulación libre de un plan de pago para una unidad',
    description:
      'Simulación informativa, de solo consulta: no guarda nada ni genera ventas, reservas ni consultas. El precio es el precio de lista de la unidad. El anticipo se indica por monto o por porcentaje (uno u otro), mayor a 0 y menor al precio; el plazo es uno de los activos que devuelve el detalle. Devuelve el cronograma (la cuota 0 es el anticipo).',
  })
  @ApiParam({ name: 'id', type: Number, description: 'id_unidad_funcional' })
  @ApiOkResponse({
    description: 'Cronograma y totales de la simulación',
    type: SimulacionCatalogoResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Anticipo inválido: ambos o ninguno de monto/porcentaje, o monto fuera del rango (mayor a 0 y menor al precio)',
  })
  @ApiNotFoundResponse({
    description:
      'La unidad no está publicada/disponible, o el plazo no existe o está inactivo',
  })
  simular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SimularPlanCatalogoDto,
  ) {
    return this.catalogoService.simularPlan(id, dto);
  }
}
