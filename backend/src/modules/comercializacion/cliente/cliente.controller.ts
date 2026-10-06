import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import ms, { type StringValue } from 'ms';
import { ClienteAuthService } from '../cliente-auth/cliente-auth.service';
import { ClienteAuthGuard } from '../cliente-auth/guards/cliente-auth.guard';
import { PublicCliente } from '../cliente-auth/decorators/public-cliente.decorator';
import { CurrentCliente } from '../cliente-auth/decorators/current-cliente.decorator';
import type { AuthenticatedCliente } from '../cliente-auth/strategies/cliente-jwt.strategy';
import { Public } from '../../../common/decorators/public.decorator';
import { CatalogoItemDto } from '../../../common/dto/catalogo-item.dto';
import { FormaPagoService } from '../../tesoreria/forma-pago/forma-pago.service';
import { LoginClienteDto } from './dto/login-cliente.dto';
import { CompletarDatosClienteDto } from './dto/completar-datos-cliente.dto';
import {
  ClienteResponseDto,
  LoginClienteResponseDto,
  RefreshClienteResponseDto,
} from './dto/cliente-response.dto';
import type { EnvConfig } from '../../../config/env.schema';

const REFRESH_TOKEN_COOKIE = 'refreshTokenCliente';
const MENSAJE_NO_AUTENTICADO = 'No autenticado';

/**
 * Todos los endpoints llevan @Public(): JwtAuthGuard/RolesGuard son globales
 * (APP_GUARD en AuthModule) y validan contra la strategy 'jwt' de USUARIO —
 * sin @Public() rechazarían cualquier token de CLIENTE antes de que este
 * controller lo vea, porque está firmado con otro secreto. La protección real
 * de este controller es ClienteAuthGuard (@UseGuards abajo), que valida contra
 * la strategy 'jwt-cliente'. Dentro de ese guard, @PublicCliente() marca los
 * dos endpoints que tampoco necesitan un accessToken de CLIENTE ya emitido
 * (login, refresh) — ver ClienteAuthGuard y PublicCliente().
 */
@ApiTags('Cliente')
@Public()
@UseGuards(ClienteAuthGuard)
@Controller('cliente')
export class ClienteController {
  constructor(
    private readonly clienteAuthService: ClienteAuthService,
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly formaPagoService: FormaPagoService,
  ) {}

  @PublicCliente()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Login de cliente con Google (id_token) — crea el CLIENTE si no existe',
    description: `
Recibe el \`id_token\` que Google Identity Services le da al frontend tras el login. Lo verifica contra \`GOOGLE_CLIENT_ID\` y busca el CLIENTE correspondiente por \`google_sub\`; si no existe, busca por email (caso de un cliente "provisional" dado de alta por una venta presencial — HU-27 — que todavía no tenía cuenta de Google) y lo vincula, o crea uno nuevo si tampoco existe por email.

Mismo esquema de doble token que \`POST /auth/login\`: \`accessToken\` en el body (el frontend lo guarda en memoria), \`refreshToken\` como cookie \`httpOnly\` \`${REFRESH_TOKEN_COOKIE}\` (nombre distinto al \`refreshToken\` de USUARIO, para no pisarla si conviven en el mismo navegador). Requiere \`credentials: 'include'\` en el fetch/axios.`,
  })
  @ApiOkResponse({
    description: 'Login exitoso (o alta del cliente, si es la primera vez)',
    type: LoginClienteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'idToken faltante o vacío' })
  @ApiUnauthorizedResponse({
    description:
      'El id_token de Google es inválido, expiró, o no es de esta app',
  })
  @ApiConflictResponse({
    description:
      'Ya existe un cliente con este email vinculado a otra cuenta de Google',
  })
  async login(
    @Body() dto: LoginClienteDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, cliente } =
      await this.clienteAuthService.loginConGoogle(dto.idToken);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, cliente };
  }

  @PublicCliente()
  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth('cookie-cliente')
  @ApiOperation({
    summary: 'Renueva el access token de cliente usando el refresh token',
    description: `
Lee el refresh token de la cookie \`httpOnly\` \`${REFRESH_TOKEN_COOKIE}\` (no hace falta mandar nada en el body) y, si es válido, devuelve un \`accessToken\` nuevo y rota la cookie. Requiere \`credentials: 'include'\`. Mismo patrón que \`POST /auth/refresh\`.`,
  })
  @ApiOkResponse({
    description: 'Access token renovado',
    type: RefreshClienteResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Sesión inválida o expirada' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: unknown = (req.cookies as Record<string, unknown>)?.[
      REFRESH_TOKEN_COOKIE
    ];
    if (typeof refreshToken !== 'string' || !refreshToken) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    try {
      const { accessToken, refreshToken: nuevoRefreshToken } =
        await this.clienteAuthService.refresh(refreshToken);
      this.setRefreshCookie(res, nuevoRefreshToken);
      return { accessToken };
    } catch (error) {
      res.clearCookie(REFRESH_TOKEN_COOKIE);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cierra la sesión del cliente y revoca el refresh token',
    description:
      'Requiere el accessToken de CLIENTE vigente en el header Authorization. Revoca el refresh token server-side y limpia la cookie. El frontend además tiene que descartar el accessToken que tenía en memoria.',
  })
  @ApiOkResponse({ description: 'Sesión cerrada' })
  @ApiUnauthorizedResponse({ description: MENSAJE_NO_AUTENTICADO })
  async logout(
    @CurrentCliente() cliente: AuthenticatedCliente,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.clienteAuthService.logout(cliente.id);
    res.clearCookie(REFRESH_TOKEN_COOKIE);
    return { message: 'Sesión cerrada' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Devuelve los datos del cliente autenticado' })
  @ApiOkResponse({
    description: 'Datos del cliente autenticado',
    type: ClienteResponseDto,
  })
  @ApiUnauthorizedResponse({ description: MENSAJE_NO_AUTENTICADO })
  me(@CurrentCliente() cliente: AuthenticatedCliente) {
    return this.clienteAuthService.perfil(cliente.id);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Completa o actualiza nombre, apellido, dni_cuil y/o teléfono del cliente autenticado',
    description:
      'Nombre y apellido los completa Google en el primer login, pero el cliente los puede corregir después. HU-29 exige dni_cuil y teléfono completos antes de dejar declarar un pago (ver clienteTieneDatosCompletos). Se puede mandar cualquier subconjunto de los cuatro campos.',
  })
  @ApiOkResponse({
    description: 'Datos actualizados',
    type: ClienteResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Formato de dni_cuil inválido, o no se envió ningún campo para actualizar',
  })
  @ApiUnauthorizedResponse({ description: MENSAJE_NO_AUTENTICADO })
  @ApiConflictResponse({
    description: 'Ya existe un cliente registrado con ese DNI/CUIT',
  })
  completarDatos(
    @Body() dto: CompletarDatosClienteDto,
    @CurrentCliente() cliente: AuthenticatedCliente,
  ) {
    return this.clienteAuthService.actualizarDatos(cliente.id, dto);
  }

  @Get('formas-pago-autogestion')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Catálogo de formas de pago habilitadas para autogestión, para el <select> del formulario de declaración de pago (HU-29)',
    description:
      'Solo formas de pago activas Y habilitadas para autogestión a la vez. `metadata.requiere_referencia` indica si el formulario tiene que pedir número de referencia.',
  })
  @ApiOkResponse({
    description: 'Formas de pago disponibles para autogestión, sin paginar',
    type: [CatalogoItemDto],
  })
  @ApiUnauthorizedResponse({ description: MENSAJE_NO_AUTENTICADO })
  formasPagoAutogestion() {
    return this.formaPagoService.listarAutogestion();
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    const refreshExpiresIn = this.configService.get(
      'JWT_CLIENT_REFRESH_EXPIRES_IN',
      { infer: true },
    );

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure:
        this.configService.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      maxAge: ms(refreshExpiresIn as StringValue),
    });
  }
}
