import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ClienteAuthService } from './cliente-auth.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';

jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt') as {
  compare: jest.Mock;
  hash: jest.Mock;
};

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

describe('ClienteAuthService', () => {
  let service: ClienteAuthService;
  let prisma: {
    cLIENTE: {
      findUnique: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwtService: { sign: jest.Mock; verifyAsync: jest.Mock };

  const clienteMock = {
    id_cliente: 1,
    google_sub: 'google-sub-1',
    email: 'cliente@test.com',
    nombre: 'Juan',
    apellido: 'Pérez',
    dni_cuil: null,
    telefono: null,
    refreshTokenHash: 'hash-refresh-guardado',
  };

  beforeEach(async () => {
    prisma = {
      cLIENTE: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('token-firmado'),
      verifyAsync: jest.fn(),
    };
    const configService = {
      get: jest.fn((key: string) => {
        const valores: Record<string, string> = {
          GOOGLE_CLIENT_ID: 'google-client-id',
          JWT_CLIENT_SECRET: 'client-secret',
          JWT_CLIENT_EXPIRES_IN: '15m',
          JWT_CLIENT_REFRESH_SECRET: 'client-refresh-secret',
          JWT_CLIENT_REFRESH_EXPIRES_IN: '7d',
        };
        return valores[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClienteAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(ClienteAuthService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('loginConGoogle', () => {
    it('lanza UnauthorizedException si el id_token es inválido o expiró', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('invalid token signature'));

      await expect(service.loginConGoogle('token-invalido')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.cLIENTE.findUnique).not.toHaveBeenCalled();
    });

    it('crea un CLIENTE nuevo si no existe ni por google_sub ni por email', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-sub-nuevo',
          email: 'nuevo@test.com',
          given_name: 'Ana',
          family_name: 'Gómez',
        }),
      });
      prisma.cLIENTE.findUnique.mockResolvedValue(null);
      prisma.cLIENTE.create.mockResolvedValue({
        ...clienteMock,
        id_cliente: 2,
        google_sub: 'google-sub-nuevo',
        email: 'nuevo@test.com',
        nombre: 'Ana',
        apellido: 'Gómez',
      });
      bcrypt.hash.mockResolvedValue('nuevo-hash-refresh');

      const resultado = await service.loginConGoogle('token-valido');

      expect(prisma.cLIENTE.create).toHaveBeenCalledWith({
        data: {
          google_sub: 'google-sub-nuevo',
          email: 'nuevo@test.com',
          nombre: 'Ana',
          apellido: 'Gómez',
        },
      });
      expect(resultado.accessToken).toBe('token-firmado');
      expect(resultado.cliente.email).toBe('nuevo@test.com');
    });

    it('vincula google_sub a un cliente provisional (alta por venta presencial) sin tocar sus otros datos', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-sub-provisional',
          email: 'provisional@test.com',
        }),
      });
      const clienteProvisional = {
        ...clienteMock,
        id_cliente: 3,
        google_sub: null,
        email: 'provisional@test.com',
        dni_cuil: '20-12345678-9',
        telefono: '11-2222-3333',
      };
      prisma.cLIENTE.findUnique
        .mockResolvedValueOnce(null) // búsqueda por google_sub
        .mockResolvedValueOnce(clienteProvisional); // búsqueda por email
      prisma.cLIENTE.update.mockResolvedValueOnce({
        ...clienteProvisional,
        google_sub: 'google-sub-provisional',
      });
      bcrypt.hash.mockResolvedValue('hash-refresh');

      await service.loginConGoogle('token-valido');

      expect(prisma.cLIENTE.update).toHaveBeenNthCalledWith(1, {
        where: { id_cliente: clienteProvisional.id_cliente },
        data: { google_sub: 'google-sub-provisional' },
      });
    });

    it('lanza ConflictException si el email ya está vinculado a otra cuenta de Google', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-sub-distinto',
          email: 'cliente@test.com',
        }),
      });
      prisma.cLIENTE.findUnique
        .mockResolvedValueOnce(null) // no aparece por este google_sub
        .mockResolvedValueOnce(clienteMock); // pero el email ya tiene otro google_sub

      await expect(service.loginConGoogle('token-valido')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.cLIENTE.update).not.toHaveBeenCalled();
      expect(prisma.cLIENTE.create).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('emite tokens nuevos cuando el refresh token es válido y el hash coincide', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: clienteMock.id_cliente });
      prisma.cLIENTE.findUnique.mockResolvedValue(clienteMock);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('otro-hash-refresh');

      const resultado = await service.refresh('refresh-token-vigente');

      expect(resultado.accessToken).toBe('token-firmado');
      expect(prisma.cLIENTE.update).toHaveBeenCalledWith({
        where: { id_cliente: clienteMock.id_cliente },
        data: { refreshTokenHash: 'otro-hash-refresh' },
      });
    });

    it('lanza UnauthorizedException si el token tiene firma inválida o está vencido', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refresh('token-invalido')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.cLIENTE.findUnique).not.toHaveBeenCalled();
    });

    it('lanza UnauthorizedException si el hash no coincide (token ya rotado)', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: clienteMock.id_cliente });
      prisma.cLIENTE.findUnique.mockResolvedValue(clienteMock);
      bcrypt.compare.mockResolvedValue(false);

      await expect(service.refresh('refresh-token-viejo')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException si el cliente no tiene sesión activa (logout previo)', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: clienteMock.id_cliente });
      prisma.cLIENTE.findUnique.mockResolvedValue({
        ...clienteMock,
        refreshTokenHash: null,
      });

      await expect(
        service.refresh('refresh-token-post-logout'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('pone refreshTokenHash en null', async () => {
      prisma.cLIENTE.update.mockResolvedValue(clienteMock);

      await service.logout(clienteMock.id_cliente);

      expect(prisma.cLIENTE.update).toHaveBeenCalledWith({
        where: { id_cliente: clienteMock.id_cliente },
        data: { refreshTokenHash: null },
      });
    });
  });

  describe('actualizarDatos', () => {
    it('actualiza dni_cuil y teléfono', async () => {
      const datos = { dni_cuil: '20-12345678-9', telefono: '11-2222-3333' };
      prisma.cLIENTE.update.mockResolvedValue({ ...clienteMock, ...datos });

      const resultado = await service.actualizarDatos(
        clienteMock.id_cliente,
        datos,
      );

      expect(prisma.cLIENTE.update).toHaveBeenCalledWith({
        where: { id_cliente: clienteMock.id_cliente },
        data: datos,
      });
      expect(resultado.dni_cuil).toBe(datos.dni_cuil);
    });

    it('traduce un conflicto de dni_cuil duplicado (P2002) a ConflictException', async () => {
      prisma.cLIENTE.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.actualizarDatos(clienteMock.id_cliente, {
          dni_cuil: '20-99999999-9',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('deja pasar cualquier otro error de Prisma sin traducirlo', async () => {
      const errorInesperado = new Error('conexión perdida');
      prisma.cLIENTE.update.mockRejectedValue(errorInesperado);

      await expect(
        service.actualizarDatos(clienteMock.id_cliente, {
          telefono: '11-1111-1111',
        }),
      ).rejects.toThrow(errorInesperado);
    });
  });
});
