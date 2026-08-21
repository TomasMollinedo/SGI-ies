import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import ms, { type StringValue } from 'ms';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.schema';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from './strategies/jwt.strategy';
import type { EnvConfig } from '../../config/env.schema';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Inicia sesión y devuelve un JWT',
    description: `
Punto de entrada del esquema de doble token. Devuelve dos cosas distintas y las trata distinto:

- **\`accessToken\`** (en el body de la respuesta): el frontend lo guarda **en memoria** (variable de JS, store de estado, etc.), nunca en \`localStorage\`/\`sessionStorage\`. Se manda en cada request protegido como header \`Authorization: Bearer <accessToken>\`. Vive poco tiempo (ver \`JWT_EXPIRES_IN\`, por defecto 15 minutos).
- **\`refreshToken\`**: no viaja en el body. El backend lo setea como cookie \`httpOnly\` (\`refreshToken\`) en la respuesta — el frontend **no la lee ni la escribe manualmente**, ni tiene acceso a ella desde JS (por diseño, para que un XSS no pueda robarla). El browser la administra sola.

Para que el browser guarde y reenvíe esta cookie, el fetch/axios del login (y de cualquier llamada a \`/auth/*\`) tiene que ir con **\`credentials: 'include'\`**.`,
  })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, usuario } =
      await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, usuario };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Renueva el access token usando el refresh token',
    description: `
Se usa cuando el \`accessToken\` en memoria expiró (o el frontend arrancó sin uno, ej. al recargar la página). No hace falta mandar nada en el body: el refresh token se lee automáticamente de la cookie \`httpOnly\` que dejó \`/auth/login\` (o un \`/auth/refresh\` anterior) — de nuevo, la llamada tiene que ir con **\`credentials: 'include'\`** para que el browser adjunte esa cookie.

**Patrón esperado del lado del frontend**: un interceptor de HTTP (axios interceptor, wrapper de fetch, etc.) que, ante cualquier 401 de un endpoint protegido, llama a este endpoint **una sola vez** y, si responde 200, reintenta el request original con el \`accessToken\` nuevo. Si \`/auth/refresh\` también devuelve 401, no reintentar de nuevo — la sesión terminó, hay que mandar al usuario a login.

**Rotación**: cada llamada exitosa devuelve un \`accessToken\` nuevo y también rota el refresh token (nueva cookie \`httpOnly\` en la respuesta, la anterior queda invalidada del lado del servidor). El frontend no tiene que hacer nada especial para esto — el browser reemplaza la cookie vieja por la nueva solo.`,
  })
  @ApiResponse({ status: 200, description: 'Access token renovado' })
  @ApiResponse({ status: 401, description: 'Sesión inválida o expirada' })
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
        await this.authService.refresh(refreshToken);
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
    summary: 'Cierra la sesión y revoca el refresh token',
    description: `
Requiere el \`accessToken\` vigente en el header \`Authorization\` (igual que cualquier endpoint protegido) — el logout no funciona solo con la cookie. El backend invalida el refresh token del lado del servidor (deja de servir aunque alguien tenga la cookie vieja) y limpia la cookie \`refreshToken\` en la respuesta.

El frontend, además de llamar a este endpoint, tiene que **descartar el \`accessToken\` que tenía en memoria** — el logout del backend no lo invalida a él (los JWT de access no se revocan individualmente, solo expiran solos), así que si el frontend no lo borra de su lado, ese \`accessToken\` sigue sirviendo hasta que expire por su cuenta.`,
  })
  @ApiResponse({ status: 200, description: 'Sesión cerrada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.id);
    res.clearCookie(REFRESH_TOKEN_COOKIE);
    return { message: 'Sesión cerrada' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Devuelve los datos del usuario autenticado',
    description:
      'Requiere el `accessToken` vigente en el header `Authorization: Bearer <accessToken>`. Si devuelve 401 porque el access token expiró, el flujo esperado es llamar a `POST /auth/refresh` y reintentar — no pedirle credenciales de nuevo al usuario.',
  })
  @ApiResponse({ status: 200, description: 'Datos del usuario autenticado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.perfil(user.id);
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', {
      infer: true,
    });

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure:
        this.configService.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      maxAge: ms(refreshExpiresIn as StringValue),
    });
  }
}
