import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  errorDelComprobante,
  MENSAJE_COMPROBANTE_TIPO_INVALIDO,
  REGEX_TIPOS_COMPROBANTE,
  TIPOS_COMPROBANTE_PERMITIDOS,
} from '../../almacenamiento/comprobante.constants';
import { ComprobanteInterceptor } from './comprobante.interceptor';
import { contentDispositionInline } from './comprobante-archivo';
import { DeclaracionPagoService } from './declaracion-pago.service';
import { CreateDeclaracionPagoDto } from './dto/create-declaracion-pago.dto';
import { DeclaracionPagoResponseDto } from './dto/declaracion-pago-response.dto';
import { ClienteAuthGuard } from '../cliente-auth/guards/cliente-auth.guard';
import { CurrentCliente } from '../cliente-auth/decorators/current-cliente.decorator';
import type { AuthenticatedCliente } from '../cliente-auth/strategies/cliente-jwt.strategy';
import { Public } from '../../../common/decorators/public.decorator';

/**
 * Mismo motivo que ClienteController: `@Public()` a nivel de clase porque
 * JwtAuthGuard/RolesGuard globales (APP_GUARD, strategy 'jwt' de USUARIO)
 * rechazarían un token de CLIENTE antes de llegar acá. La protección real es
 * `ClienteAuthGuard` (`@UseGuards` abajo), sobre la strategy 'jwt-cliente' —
 * ver el comentario completo en ClienteController.
 */
@ApiTags('Declaración de pago')
@Public()
@UseGuards(ClienteAuthGuard)
@Controller('cliente/declaraciones-pago')
export class DeclaracionPagoController {
  constructor(
    private readonly declaracionPagoService: DeclaracionPagoService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ComprobanteInterceptor)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['FK_cuota', 'FK_forma_pago', 'importe', 'comprobante'],
      properties: {
        FK_cuota: { type: 'integer', example: 12 },
        FK_forma_pago: { type: 'integer', example: 2 },
        importe: {
          type: 'number',
          example: 150000.5,
          description: 'Mayor a 0, con hasta dos decimales',
        },
        numero_referencia: {
          type: 'string',
          maxLength: 100,
          description: 'Obligatorio si la forma de pago lo requiere',
        },
        comprobante: {
          type: 'string',
          format: 'binary',
          description:
            'Un único archivo PDF, JPG o PNG de hasta 5 MB. Se valida por el contenido real del archivo, no por su extensión',
        },
      },
    },
  })
  @ApiOperation({
    summary:
      'Declara un pago sobre una cuota propia, con su comprobante adjunto, pendiente de validación por Tesorería (HU-29)',
    description:
      'Nace en estado PENDIENTE y no afecta el saldo de la cuota — eso ocurre recién si Tesorería la valida y la convierte en un cobro. No se admite sobre cuotas de una venta de contado.',
  })
  @ApiCreatedResponse({
    description: 'Declaración registrada, pendiente de validación',
    type: DeclaracionPagoResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos, faltan dni_cuil/teléfono del cliente, falta el número de referencia cuando la forma de pago lo requiere, o el importe supera el saldo pendiente de la cuota. Los errores del archivo llegan en `message` como `[{ campo: "comprobante", error }]`, igual que los de validación del body: "Adjuntá el comprobante del pago" (falta el archivo), "El comprobante tiene que ser un PDF, JPG o PNG" (según su contenido real) o "Adjuntá un único archivo en el campo comprobante" (más de un archivo, o el archivo en otro campo)',
  })
  @ApiPayloadTooLargeResponse({
    description:
      'El comprobante supera los 5 MB. `message` es `[{ campo: "comprobante", error: "El comprobante no puede superar los 5 MB" }]`',
  })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @ApiNotFoundResponse({
    description:
      'No existe una cuota con ese id para este cliente, o no existe la forma de pago',
  })
  @ApiConflictResponse({
    description:
      'La venta de la cuota está cancelada, la venta es de contado (plan CONTADO: se paga de forma presencial, nunca por autogestión), la cuota no está pendiente ni parcial, o la forma de pago no está activa/habilitada para autogestión',
  })
  declarar(
    @Body() dto: CreateDeclaracionPagoDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        // `overrideMimeType`: pisa el mimetype que declaró el cliente con el
        // detectado por el contenido. De ahí en más `comprobante.mimetype`
        // es el tipo real.
        .addFileTypeValidator({
          fileType: REGEX_TIPOS_COMPROBANTE,
          overrideMimeType: true,
          errorMessage: MENSAJE_COMPROBANTE_TIPO_INVALIDO,
        })
        // Sin validator de tamaño: el único control es el límite de multer
        // (`ComprobanteInterceptor`), que corta antes de cargar el archivo en
        // memoria. `MaxFileSizeValidator` además rechazaba uno de exactamente
        // 5 MB, que la HU admite.
        .build({
          // Que falte el archivo lo valida el service, con su mensaje.
          fileIsRequired: false,
          exceptionFactory: (error) =>
            new BadRequestException(errorDelComprobante(error)),
        }),
    )
    comprobante: Express.Multer.File | undefined,
    @CurrentCliente() cliente: AuthenticatedCliente,
  ) {
    return this.declaracionPagoService.declarar(dto, cliente.id, comprobante);
  }

  @Get(':id/comprobante')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, no-store')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ver el comprobante adjunto de una declaración propia',
    description:
      'Solo el cliente que declaró el pago. Otra declaración, o una inexistente, responde 404.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'id_declaracion_pago' })
  @ApiProduces(...TIPOS_COMPROBANTE_PERMITIDOS)
  // Excepción a la regla de `type: <DTO>` en las 2xx: la respuesta es el archivo, no un JSON.
  @ApiOkResponse({
    description: 'El archivo del comprobante, para verlo en el navegador',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiNotFoundResponse({
    description:
      'No existe la declaración para este cliente, no tiene comprobante, o el archivo no está disponible',
  })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  async verComprobante(
    @Param('id', ParseIntPipe) id: number,
    @CurrentCliente() cliente: AuthenticatedCliente,
  ): Promise<StreamableFile> {
    const { contenido, tipo, nombreArchivo } =
      await this.declaracionPagoService.obtenerComprobanteDelCliente(
        id,
        cliente.id,
      );

    return new StreamableFile(contenido, {
      type: tipo,
      disposition: contentDispositionInline(nombreArchivo),
      length: contenido.length,
    });
  }
}
