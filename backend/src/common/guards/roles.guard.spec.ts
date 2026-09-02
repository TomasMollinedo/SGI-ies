import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { RolNombre } from '../enums/rol.enum';
import type { AuthenticatedUser } from '../../modules/auth/strategies/jwt.strategy';
import { AlertaController } from '../../modules/alerta/alerta.controller';
import { ArticuloController } from '../../modules/almacen/articulo/articulo.controller';
import { CategoriaController } from '../../modules/almacen/categoria/categoria.controller';
import { DepositoController } from '../../modules/almacen/deposito/deposito.controller';
import { MarcaController } from '../../modules/almacen/marca/marca.controller';
import { MovimientoController } from '../../modules/almacen/movimiento/movimiento.controller';
import { StockController } from '../../modules/almacen/stock/stock.controller';
import { TipoMovimientoController } from '../../modules/almacen/tipo-movimiento/tipo-movimiento.controller';
import { UnidadMedidaController } from '../../modules/almacen/unidad-medida/unidad-medida.controller';
import { ProveedorController } from '../../modules/compras/proveedor/proveedor.controller';

/** Controller sin `@Roles`: cualquier usuario autenticado entra. */
class ControllerSinRoles {}

describe('RolesGuard', () => {
  let guard: RolesGuard;

  /**
   * Los controllers de Almacén, con su nombre para que el test que falle
   * diga cuál es. Se importan los de verdad a propósito: así el test protege
   * el `@Roles(...)` real de cada uno, y no una copia de la metadata que
   * podría quedar desincronizada del código.
   */
  const controllersDeAlmacen: [string, object][] = [
    ['ArticuloController', ArticuloController],
    ['CategoriaController', CategoriaController],
    ['DepositoController', DepositoController],
    ['MarcaController', MarcaController],
    ['MovimientoController', MovimientoController],
    ['StockController', StockController],
    ['TipoMovimientoController', TipoMovimientoController],
    ['UnidadMedidaController', UnidadMedidaController],
  ];

  const usuario = (rol: RolNombre): AuthenticatedUser => ({
    id: 1,
    email: `${rol}@axontech.test`,
    rol,
  });

  /**
   * `ExecutionContext` mínimo: al guard solo le interesa de qué clase y
   * handler leer la metadata, y qué usuario dejó el JwtAuthGuard en el
   * request. El handler va vacío porque en este proyecto `@Roles` se declara
   * siempre a nivel controller.
   */
  const contexto = (clase: object, user?: AuthenticatedUser) =>
    ({
      getHandler: () => function handlerSinRoles() {},
      getClass: () => clase,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
  });

  describe('controllers de Almacén', () => {
    it.each(controllersDeAlmacen)(
      '%s deja entrar al Administrador, que es el rol dueño del recurso',
      (_nombre, controller) => {
        expect(
          guard.canActivate(
            contexto(controller, usuario(RolNombre.ADMINISTRADOR)),
          ),
        ).toBe(true);
      },
    );

    // Contracara del test de arriba, y el punto del refactor que cambió el
    // dueño de Almacén: el Responsable de Almacén ya NO entra, aunque siga
    // siendo el destinatario de las alertas de reposición.
    it.each(controllersDeAlmacen)(
      '%s rechaza al Responsable de Almacén',
      (_nombre, controller) => {
        expect(
          guard.canActivate(
            contexto(controller, usuario(RolNombre.RESPONSABLE_ALMACEN)),
          ),
        ).toBe(false);
      },
    );

    it.each(controllersDeAlmacen)(
      '%s deja entrar al Gerente General por su acceso transversal',
      (_nombre, controller) => {
        expect(
          guard.canActivate(
            contexto(controller, usuario(RolNombre.GERENTE_GENERAL)),
          ),
        ).toBe(true);
      },
    );
  });

  describe('controllers de Compras', () => {
    const controllersDeCompras: [string, object][] = [
      ['ProveedorController', ProveedorController],
    ];

    it.each(controllersDeCompras)(
      '%s deja entrar al Responsable de Compras, que es el rol dueño del recurso',
      (_nombre, controller) => {
        expect(
          guard.canActivate(
            contexto(controller, usuario(RolNombre.RESPONSABLE_COMPRAS)),
          ),
        ).toBe(true);
      },
    );

    it.each(controllersDeCompras)(
      '%s rechaza al Administrador, que no es dueño de este recurso',
      (_nombre, controller) => {
        expect(
          guard.canActivate(
            contexto(controller, usuario(RolNombre.ADMINISTRADOR)),
          ),
        ).toBe(false);
      },
    );

    it.each(controllersDeCompras)(
      '%s deja entrar al Gerente General por su acceso transversal',
      (_nombre, controller) => {
        expect(
          guard.canActivate(
            contexto(controller, usuario(RolNombre.GERENTE_GENERAL)),
          ),
        ).toBe(true);
      },
    );
  });

  describe('sin @Roles en el controller', () => {
    it('deja pasar a cualquier usuario autenticado', () => {
      expect(
        guard.canActivate(
          contexto(
            ControllerSinRoles,
            usuario(RolNombre.RESPONSABLE_COMERCIALIZACION),
          ),
        ),
      ).toBe(true);
    });

    it('AlertaController no declara @Roles: las alertas las consulta cualquier rol', () => {
      // Lo que cambia según quién pregunta no es si entra, sino qué alertas
      // ve — y eso lo filtra AlertaService, no este guard.
      expect(
        guard.canActivate(
          contexto(AlertaController, usuario(RolNombre.RESPONSABLE_COMPRAS)),
        ),
      ).toBe(true);
    });
  });

  describe('alcance del acceso transversal', () => {
    it('el Gerente General entra a un recurso de un rol que no es el suyo', () => {
      expect(
        guard.canActivate(
          contexto(ProveedorController, usuario(RolNombre.GERENTE_GENERAL)),
        ),
      ).toBe(true);
    });

    // El bypass del Administrador vive SOLO en AlertaService: acá es un rol
    // más, y no entra a un recurso del que no es dueño.
    it('el Administrador NO bypassea un recurso de otro rol', () => {
      expect(
        guard.canActivate(
          contexto(ProveedorController, usuario(RolNombre.ADMINISTRADOR)),
        ),
      ).toBe(false);
    });
  });

  it('rechaza si no hay usuario en el request', () => {
    // Defensivo: con JwtAuthGuard adelante no debería pasar, pero el guard no
    // puede asumirlo y romper con un TypeError si algún día se registra solo.
    expect(guard.canActivate(contexto(MarcaController))).toBe(false);
  });
});
