import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { PrismaService } from '../../prisma/prisma.service';
import { RolNombre } from '../../common/enums/rol.enum';
import { LoginDto } from './dto/login.schema';
import type { USUARIO, ROL } from '../../../generated/prisma/client';

const MENSAJE_SESION_INVALIDA = 'Sesión inválida o expirada';

type UsuarioConRol = USUARIO & { rol: ROL };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Valida credenciales y emite un JWT. Usa el mismo mensaje de error
   * genérico tanto si el email no existe como si la contraseña es incorrecta,
   * para no revelar cuál de los dos casos ocurrió.
   */
  async login(dto: LoginDto) {
    const usuario = await this.prisma.uSUARIO.findUnique({
      where: { email: dto.email },
      include: { rol: true },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(dto.password, usuario.password);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.emitirTokens(usuario);
  }

  /**
   * Verifica el refresh token contra el hash guardado en el usuario y, si es
   * válido, rota el par de tokens: emite uno nuevo e invalida el anterior al
   * pisar el hash guardado.
   */
  async refresh(refreshToken: string) {
    let payload: { sub: number };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: number }>(
        refreshToken,
        { secret: this.configService.get<string>('JWT_REFRESH_SECRET') },
      );
    } catch {
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }

    const usuario = await this.prisma.uSUARIO.findUnique({
      where: { id_usuario: payload.sub },
      include: { rol: true },
    });

    if (!usuario?.refreshTokenHash) {
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }

    const hashCoincide = await bcrypt.compare(
      refreshToken,
      usuario.refreshTokenHash,
    );
    if (!hashCoincide) {
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }

    return this.emitirTokens(usuario);
  }

  /**
   * Revoca la sesión activa del usuario: pone refreshTokenHash en null, de
   * forma que ningún refresh token emitido previamente vuelva a servir.
   */
  async logout(userId: number): Promise<void> {
    await this.prisma.uSUARIO.update({
      where: { id_usuario: userId },
      data: { refreshTokenHash: null },
    });
  }

  /**
   * Devuelve los datos públicos del usuario autenticado, a partir del id
   * incluido en el JWT (usado por GET /auth/me).
   */
  async perfil(userId: number) {
    const usuario = await this.prisma.uSUARIO.findUniqueOrThrow({
      where: { id_usuario: userId },
      include: { rol: true },
    });

    return {
      id: usuario.id_usuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol.nombre,
    };
  }

  /**
   * Firma un access token y un refresh token nuevos para el usuario, guarda
   * el hash del refresh token (rotación: pisa el hash anterior, invalidándolo)
   * y devuelve ambos tokens junto con los datos públicos del usuario.
   */
  private async emitirTokens(usuario: UsuarioConRol) {
    const accessToken = this.jwtService.sign({
      sub: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.rol.nombre as RolNombre,
    });

    const refreshToken = this.jwtService.sign(
      { sub: usuario.id_usuario },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as StringValue,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.uSUARIO.update({
      where: { id_usuario: usuario.id_usuario },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol.nombre,
      },
    };
  }
}
