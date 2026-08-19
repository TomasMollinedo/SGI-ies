import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RolNombre } from '../../common/enums/rol.enum';

jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt') as {
  compare: jest.Mock;
  hash: jest.Mock;
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    uSUARIO: { findUnique: jest.Mock; update: jest.Mock };
  };
  let jwtService: { sign: jest.Mock; verifyAsync: jest.Mock };

  const usuarioMock = {
    id_usuario: 1,
    nombre: 'Ana',
    apellido: 'Pérez',
    email: 'ana@axontech.test',
    password: 'hash-guardado',
    FK_rol: 1,
    refreshTokenHash: 'hash-refresh-guardado',
    rol: { id_rol: 1, nombre: RolNombre.RESPONSABLE_ALMACEN },
  };

  beforeEach(async () => {
    prisma = {
      uSUARIO: { findUnique: jest.fn(), update: jest.fn() },
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('token-firmado'),
      verifyAsync: jest.fn(),
    };
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('login', () => {
    it('devuelve accessToken y refreshToken cuando las credenciales son válidas', async () => {
      prisma.uSUARIO.findUnique.mockResolvedValue(usuarioMock);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('nuevo-hash-refresh');

      const resultado = await service.login({
        email: usuarioMock.email,
        password: 'Password123!',
      });

      expect(resultado.accessToken).toBe('token-firmado');
      expect(resultado.refreshToken).toBe('token-firmado');
      expect(resultado.usuario).toEqual({
        id: usuarioMock.id_usuario,
        nombre: usuarioMock.nombre,
        apellido: usuarioMock.apellido,
        email: usuarioMock.email,
        rol: usuarioMock.rol.nombre,
      });
      expect(prisma.uSUARIO.update).toHaveBeenCalledWith({
        where: { id_usuario: usuarioMock.id_usuario },
        data: { refreshTokenHash: 'nuevo-hash-refresh' },
      });
    });

    it('lanza UnauthorizedException si el email no existe', async () => {
      prisma.uSUARIO.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'no-existe@axontech.test',
          password: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si la contraseña es incorrecta', async () => {
      prisma.uSUARIO.findUnique.mockResolvedValue(usuarioMock);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        service.login({ email: usuarioMock.email, password: 'incorrecta' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('emite tokens nuevos cuando el refresh token es válido y el hash coincide', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: usuarioMock.id_usuario });
      prisma.uSUARIO.findUnique.mockResolvedValue(usuarioMock);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('otro-hash-refresh');

      const resultado = await service.refresh('refresh-token-vigente');

      expect(resultado.accessToken).toBe('token-firmado');
      expect(resultado.refreshToken).toBe('token-firmado');
      expect(prisma.uSUARIO.update).toHaveBeenCalledWith({
        where: { id_usuario: usuarioMock.id_usuario },
        data: { refreshTokenHash: 'otro-hash-refresh' },
      });
    });

    it('lanza UnauthorizedException si el token tiene firma inválida o está vencido', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refresh('token-invalido')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.uSUARIO.findUnique).not.toHaveBeenCalled();
    });

    it('lanza UnauthorizedException si el hash no coincide (token ya rotado)', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: usuarioMock.id_usuario });
      prisma.uSUARIO.findUnique.mockResolvedValue(usuarioMock);
      bcrypt.compare.mockResolvedValue(false);

      await expect(service.refresh('refresh-token-viejo')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException si el usuario no tiene sesión activa (logout previo)', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: usuarioMock.id_usuario });
      prisma.uSUARIO.findUnique.mockResolvedValue({
        ...usuarioMock,
        refreshTokenHash: null,
      });

      await expect(
        service.refresh('refresh-token-post-logout'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('pone refreshTokenHash en null', async () => {
      prisma.uSUARIO.update.mockResolvedValue(usuarioMock);

      await service.logout(usuarioMock.id_usuario);

      expect(prisma.uSUARIO.update).toHaveBeenCalledWith({
        where: { id_usuario: usuarioMock.id_usuario },
        data: { refreshTokenHash: null },
      });
    });
  });
});
