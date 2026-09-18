import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
import type { CLIENTE } from '../../../../generated/prisma/client';

const MENSAJE_SESION_INVALIDA = 'Sesión inválida o expirada';
const MENSAJE_TOKEN_GOOGLE_INVALIDO = 'Token de Google inválido o expirado';

@Injectable()
export class ClienteAuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  /**
   * Verifica el id_token de Google (firma, expiración y que la audiencia sea
   * esta app) y busca o crea el CLIENTE correspondiente: primero por
   * google_sub, y si no aparece, por email (caso de un cliente "provisional"
   * dado de alta por una venta presencial — HU-27/T110 — que todavía no tenía
   * cuenta de Google). Devuelve el doble token emitido sobre ese CLIENTE.
   */
  async loginConGoogle(idToken: string) {
    const payload = await this.verificarIdToken(idToken);
    const cliente = await this.buscarOCrearCliente(payload);
    return this.emitirTokens(cliente);
  }

  /**
   * Verifica el refresh token contra el hash guardado en CLIENTE.refreshTokenHash
   * y, si es válido, rota el par de tokens: emite uno nuevo e invalida el
   * anterior al pisar el hash guardado. Mismo patrón que AuthService.refresh,
   * pero independiente: secretos JWT_CLIENT_* y entidad CLIENTE.
   */
  async refresh(refreshToken: string) {
    let payload: { sub: number };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: number }>(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_CLIENT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }

    const cliente = await this.prisma.cLIENTE.findUnique({
      where: { id_cliente: payload.sub },
    });

    if (!cliente?.refreshTokenHash) {
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }

    const hashCoincide = await bcrypt.compare(
      refreshToken,
      cliente.refreshTokenHash,
    );
    if (!hashCoincide) {
      throw new UnauthorizedException(MENSAJE_SESION_INVALIDA);
    }

    return this.emitirTokens(cliente);
  }

  /**
   * Revoca la sesión activa del cliente: pone refreshTokenHash en null, de
   * forma que ningún refresh token emitido previamente vuelva a servir.
   */
  async logout(clienteId: number): Promise<void> {
    await this.prisma.cLIENTE.update({
      where: { id_cliente: clienteId },
      data: { refreshTokenHash: null },
    });
  }

  /**
   * Devuelve los datos públicos del cliente autenticado, a partir del id
   * incluido en el JWT (usado por GET /cliente/me).
   */
  async perfil(clienteId: number) {
    const cliente = await this.prisma.cLIENTE.findUniqueOrThrow({
      where: { id_cliente: clienteId },
    });

    return this.mapClientePublico(cliente);
  }

  /**
   * Actualiza dni_cuil y/o teléfono del cliente autenticado (HU-29 los exige
   * completos antes de declarar un pago — ver clienteTieneDatosCompletos).
   * Traduce el conflicto de unicidad de dni_cuil (P2002) a un mensaje en
   * español en vez de dejar pasar el error crudo de Prisma.
   */
  async actualizarDatos(
    clienteId: number,
    datos: { dni_cuil?: string; telefono?: string },
  ) {
    try {
      const cliente = await this.prisma.cLIENTE.update({
        where: { id_cliente: clienteId },
        data: datos,
      });
      return this.mapClientePublico(cliente);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe un cliente registrado con ese DNI/CUIT',
        );
      }
      throw error;
    }
  }

  private async verificarIdToken(idToken: string): Promise<TokenPayload> {
    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException(MENSAJE_TOKEN_GOOGLE_INVALIDO);
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException(MENSAJE_TOKEN_GOOGLE_INVALIDO);
    }

    return payload;
  }

  private async buscarOCrearCliente(payload: TokenPayload): Promise<CLIENTE> {
    const googleSub = payload.sub;
    const email = payload.email!;

    const clientePorSub = await this.prisma.cLIENTE.findUnique({
      where: { google_sub: googleSub },
    });
    if (clientePorSub) return clientePorSub;

    const clientePorEmail = await this.prisma.cLIENTE.findUnique({
      where: { email },
    });

    if (clientePorEmail) {
      if (clientePorEmail.google_sub) {
        // Mismo email, pero ya vinculado a otra cuenta de Google distinta a
        // la que acaba de loguearse: no se resuelve solo, para no arriesgarse
        // a mezclar cuentas de dos personas distintas.
        throw new ConflictException(
          'Ya existe un cliente con este email vinculado a otra cuenta de Google',
        );
      }

      // Cliente "provisional" (alta por venta presencial, HU-27/T110): no
      // tenía cuenta de Google todavía. Se vincula completando solo
      // google_sub — el update no toca dni_cuil/telefono/ventas existentes.
      return this.prisma.cLIENTE.update({
        where: { id_cliente: clientePorEmail.id_cliente },
        data: { google_sub: googleSub },
      });
    }

    return this.prisma.cLIENTE.create({
      data: {
        google_sub: googleSub,
        email,
        nombre: payload.given_name ?? payload.name ?? email,
        apellido: payload.family_name ?? null,
      },
    });
  }

  /**
   * Firma un access token y un refresh token nuevos para el cliente, guarda
   * el hash del refresh token (rotación: pisa el hash anterior, invalidándolo)
   * y devuelve ambos tokens junto con los datos públicos del cliente.
   */
  private async emitirTokens(cliente: CLIENTE) {
    const accessToken = this.jwtService.sign(
      { sub: cliente.id_cliente, email: cliente.email },
      {
        secret: this.configService.get<string>('JWT_CLIENT_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_CLIENT_EXPIRES_IN',
        ) as StringValue,
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: cliente.id_cliente },
      {
        secret: this.configService.get<string>('JWT_CLIENT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_CLIENT_REFRESH_EXPIRES_IN',
        ) as StringValue,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.cLIENTE.update({
      where: { id_cliente: cliente.id_cliente },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      cliente: this.mapClientePublico(cliente),
    };
  }

  /**
   * Proyecta un CLIENTE de Prisma a su shape pública: sin google_sub ni
   * refreshTokenHash, que son detalles internos de la sesión.
   */
  private mapClientePublico(cliente: CLIENTE) {
    return {
      id: cliente.id_cliente,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      email: cliente.email,
      dni_cuil: cliente.dni_cuil,
      telefono: cliente.telefono,
    };
  }
}
