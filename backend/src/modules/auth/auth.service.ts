import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RolNombre } from '../../common/enums/rol.enum';
import { LoginDto } from './dto/login.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Valida credenciales y emite un JWT. Usa el mismo mensaje de error
   * genérico tanto si el email no existe como si la contraseña es incorrecta,
   * para no revelar cuál de los dos casos ocurrió.
   */
  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
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

    const accessToken = this.jwtService.sign({
      sub: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.rol.nombre as RolNombre,
    });

    return {
      accessToken,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol.nombre,
      },
    };
  }

  /**
   * Devuelve los datos públicos del usuario autenticado, a partir del id
   * incluido en el JWT (usado por GET /auth/me).
   */
  async perfil(userId: number) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
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
}
