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
  ApiBadRequestResponse,
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
import { ClienteAdminService } from './cliente-admin.service';
import { QueryClienteAdminDto } from './dto/query-cliente-admin.dto';
import { UpdateClienteAdminDto } from './dto/update-cliente-admin.dto';
import {
  ClienteAdminDetalleResponseDto,
  ClienteAdminListResponseDto,
} from './dto/cliente-admin-response.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RolNombre } from '../../../common/enums/rol.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

/**
 * Panel interno de clientes de Comercialización (HU-33). Controller separado
 * de `ClienteController`, que es 100% del cliente del ecommerce: mismo
 * dominio, pero mecanismo de auth completamente distinto —acá los
 * `JwtAuthGuard`/`RolesGuard` globales de USUARIO, allá `@Public()` +
 * `ClienteAuthGuard`—, así que no pueden mezclarse en un solo controller.
 * Mismo patrón que `ConsultaAdminController` y
 * `DeclaracionPagoAdminController`.
 *
 * No hay `POST` ni `DELETE` a propósito: los clientes nacen del login con
 * Google (HU-23) o del alta al registrar una venta presencial (HU-27), y no
 * se dan de baja nunca, para conservar su historial comercial y de pagos.
 */
@ApiTags('Clientes')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('clientes')
export class ClienteAdminController {
  constructor(private readonly clienteAdminService: ClienteAdminService) {}

  @Get()
  @ApiOperation({
    summary:
      'Listado de todos los clientes, con sus indicadores y filtros combinables (HU-33)',
    description:
      'Incluye a todos los clientes, cualquiera sea su origen: registrados desde el ecommerce con Google (HU-23) o dados de alta por Comercialización al registrar una venta (HU-27). La cantidad de ventas vigentes, el saldo total pendiente y el indicador de mora los calcula el sistema al consultar, no están almacenados. Ordenado por apellido y después nombre (los clientes sin apellido van al final).',
  })
  @ApiQuery({
    name: 'busqueda',
    required: false,
    type: String,
    description:
      'Texto libre contra nombre, apellido, DNI/CUIL o correo. Cada palabra puede matchear parcialmente cualquiera de los cuatro campos, sin importar el orden',
    example: 'juan perez',
  })
  @ApiQuery({
    name: 'con_compras',
    required: false,
    type: Boolean,
    description:
      'true = solo clientes con al menos una venta registrada; false = solo los interesados que se registraron o consultaron sin comprar nunca. Ausente = todos',
  })
  @ApiQuery({
    name: 'en_mora',
    required: false,
    type: Boolean,
    description:
      'true = solo clientes con al menos una cuota vencida con saldo pendiente en una venta vigente; false = solo los que no están en mora. Ausente = todos',
  })
  @ApiQuery({
    name: 'FK_proyecto',
    required: false,
    type: Number,
    description: 'Solo clientes con alguna venta en ese proyecto',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Listado paginado, ordenado por apellido y nombre',
    type: ClienteAdminListResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Parámetros de filtro inválidos (por ejemplo, un `page` menor a 1 o un `limit` mayor a 100)',
  })
  listar(@Query() query: QueryClienteAdminDto) {
    return this.clienteAdminService.listar(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ficha del cliente en modo LECTURA (HU-33)',
    description:
      'Las cinco secciones de la historia: (a) datos personales y de contacto con la fecha de alta; (b) ventas vigentes y canceladas, con unidad, proyecto, modalidad, cantidad de cuotas, TNA, estado y saldo pendiente; (c) cobros recibidos, presenciales y del ecommerce; (d) declaraciones de pago pendientes o rechazadas, con los metadatos de su comprobante; (e) consultas sobre unidades, con su estado y respuesta. La ficha da acceso, no duplica: trae los identificadores para enlazar al detalle de cada venta (GET /ventas/:id) y de cada cobro (GET /cobros/:id). La descarga del comprobante de una declaración es un endpoint aparte, de T146.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_cliente del que se quiere la ficha',
  })
  @ApiOkResponse({
    description: 'Ficha completa del cliente',
    type: ClienteAdminDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe un cliente con ese id' })
  obtenerFicha(@Param('id', ParseIntPipe) id: number) {
    return this.clienteAdminService.obtenerFicha(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Modo EDICIÓN de la ficha: modifica los datos de contacto del cliente (HU-33)',
    description:
      'Editables: nombre, apellido, DNI/CUIL, teléfono y correo. El DNI/CUIL no puede repetirse entre clientes. El correo solo se puede modificar mientras el cliente no tenga una cuenta de Google vinculada (con cuenta vinculada es su identidad de acceso), y tampoco puede repetirse. Queda registrado el usuario autenticado y la fecha de la modificación. Devuelve la ficha completa ya actualizada, para re-renderizar la pantalla sin pedirla de nuevo.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'id_cliente a modificar',
  })
  @ApiOkResponse({
    description: 'Cliente modificado: la ficha completa, ya actualizada',
    type: ClienteAdminDetalleResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos: body vacío, DNI/CUIL con formato incorrecto, correo mal formado o teléfono con caracteres que no son dígitos',
  })
  @ApiNotFoundResponse({ description: 'No existe un cliente con ese id' })
  @ApiConflictResponse({
    description:
      'Ya existe otro cliente con ese DNI/CUIL o con ese correo, o se intentó modificar el correo de un cliente con cuenta de Google vinculada',
  })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClienteAdminDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // El id del usuario autenticado sale de @CurrentUser(), nunca del body:
    // es lo que se graba en FK_usuario_actualizador.
    return this.clienteAdminService.actualizar(id, dto, user.id);
  }
}
