import {
  Controller,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AlmacenamientoService } from './almacenamiento.service';
import { ImagenResponseDto } from './dto/imagen-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolNombre } from '../../common/enums/rol.enum';

const MAX_TAMANO_IMAGEN_BYTES = 5 * 1024 * 1024; // 5 MB
const TIPOS_IMAGEN_PERMITIDOS = /^image\/(jpeg|png|webp|gif)$/;

@ApiTags('Almacenamiento')
@ApiBearerAuth()
@Roles(RolNombre.ADMINISTRADOR, RolNombre.RESPONSABLE_COMERCIALIZACION)
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({
  description:
    'El usuario autenticado no tiene el rol Administrador ni Responsable de Comercialización y Ventas (el Gerente General también tiene acceso, por ser transversal)',
})
@Controller('almacenamiento')
export class AlmacenamientoController {
  constructor(
    private readonly almacenamientoService: AlmacenamientoService,
  ) {}

  @Post('imagenes')
  @ApiOperation({
    summary: 'Sube una imagen y devuelve su URL pública',
    description:
      'Guarda el archivo en el almacenamiento de objetos (MinIO/S3) y devuelve la URL desde la que se puede ver, sin necesidad de token.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Imagen subida',
    type: ImagenResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El archivo no es una imagen (jpeg/png/webp/gif) o supera los 5 MB',
  })
  @UseInterceptors(FileInterceptor('file'))
  subirImagen(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: TIPOS_IMAGEN_PERMITIDOS })
        .addMaxSizeValidator({ maxSize: MAX_TAMANO_IMAGEN_BYTES })
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    file: Express.Multer.File,
  ) {
    return this.almacenamientoService.subirImagen(file);
  }
}
