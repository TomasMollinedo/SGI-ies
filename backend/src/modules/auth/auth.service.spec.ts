import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RolNombre } from '../../common/enums/rol.enum';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt') as { compare: jest.Mock };

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { uSUARIO: { findUnique: jest.Mock } };
  let jwtService: { sign: jest.Mock };

  const usuarioMock = {
    id_usuario: 1,
    nombre: 'Ana',
    apellido: 'Pérez',
    email: 'ana@axontech.test',
    password: 'hash-guardado',
    FK_rol: 1,
    rol: { id_rol: 1, nombre: RolNombre.RESPONSABLE_ALMACEN },
  };

  beforeEach(async () => {
    prisma = { uSUARIO: { findUnique: jest.fn() } };
    jwtService = { sign: jest.fn().mockReturnValue('token-firmado') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('devuelve un accessToken cuando las credenciales son válidas', async () => {
    prisma.uSUARIO.findUnique.mockResolvedValue(usuarioMock);
    bcrypt.compare.mockResolvedValue(true);

    const resultado = await service.login({
      email: usuarioMock.email,
      password: 'Password123!',
    });

    expect(resultado.accessToken).toBe('token-firmado');
    expect(resultado.usuario).toEqual({
      id: usuarioMock.id_usuario,
      nombre: usuarioMock.nombre,
      apellido: usuarioMock.apellido,
      email: usuarioMock.email,
      rol: usuarioMock.rol.nombre,
    });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: usuarioMock.id_usuario,
      email: usuarioMock.email,
      rol: usuarioMock.rol.nombre,
    });
  });

  it('lanza UnauthorizedException si el email no existe', async () => {
    prisma.uSUARIO.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'no-existe@axontech.test', password: '123456' }),
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
