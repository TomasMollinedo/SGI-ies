import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RolNombre } from '../enums/rol.enum';
import type { AuthenticatedUser } from '../../modules/auth/strategies/jwt.strategy';
import { AlertaController } from '../../modules/alerta/alerta.controller';
import { AlmacenamientoController } from '../../modules/almacenamiento/almacenamiento.controller';
import { ArticuloController } from '../../modules/almacen/articulo/articulo.controller';
import { CategoriaController } from '../../modules/almacen/categoria/categoria.controller';
import { DepositoController } from '../../modules/almacen/deposito/deposito.controller';
import { MarcaController } from '../../modules/almacen/marca/marca.controller';
import { MovimientoController } from '../../modules/almacen/movimiento/movimiento.controller';
import { StockController } from '../../modules/almacen/stock/stock.controller';
import { TipoMovimientoController } from '../../modules/almacen/tipo-movimiento/tipo-movimiento.controller';
import { UnidadMedidaController } from '../../modules/almacen/unidad-medida/unidad-medida.controller';
import { OrdenCompraController } from '../../modules/compras/orden-compra/orden-compra.controller';
import { ProveedorController } from '../../modules/compras/proveedor/proveedor.controller';
import { FormaPagoController } from '../../modules/tesoreria/forma-pago/forma-pago.controller';
import { TipoComprobanteController } from '../../modules/tesoreria/tipo-comprobante/tipo-comprobante.controller';
import { PagoController } from '../../modules/tesoreria/pago/pago.controller';
import { CuentaCorrienteController } from '../../modules/tesoreria/cuenta-corriente/cuenta-corriente.controller';
import { PublicacionController } from '../../modules/comercializacion/publicacion/publicacion.controller';
import { PlanPagoController } from '../../modules/comercializacion/plan-pago/plan-pago.controller';
import { CobroController } from '../../modules/comercializacion/cobro/cobro.controller';
import { DeclaracionPagoAdminController } from '../../modules/comercializacion/declaracion-pago/declaracion-pago-admin.controller';

import { ProyectoController } from '../../modules/proyectos/proyecto.controller';
import { UnidadFuncionalController } from '../../modules/comercializacion/unidades-funcionales/unidad-funcional.controller';
import { VentaController } from '../../modules/comercializacion/venta/venta.controller';
import { ComprobanteController } from '../../modules/tesoreria/comprobante/comprobante.controller';
import { ConsultaAdminController } from '../../modules/comercializacion/consulta/consulta-admin.controller';

/**
 * Controller de mentira, dueño de un rol que no es ni Administrador ni
 * Gerente General: hoy todos los controllers reales son de Administrador
 * (ver Almacén y Compras), así que hace falta uno sintético para probar el
 * caso genérico "recurso de otro rol" sin acoplar el test a cuál sea ese
 * rol en cada módulo real.
 */
@Roles(RolNombre.RESPONSABLE_COMPRAS)
class ControllerDeOtroRol {}

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
      ['OrdenCompraController', OrdenCompraController],
    ];

    it.each(controllersDeCompras)(
      '%s deja entrar al Administrador, que es el rol dueño del recurso',
      (_nombre, controller) => {
        expect(
          guard.canActivate(
            contexto(controller, usuario(RolNombre.ADMINISTRADOR)),
          ),
        ).toBe(true);
      },
    );

    // El Responsable de Compras no es el dueño del recurso: Proveedores y
    // Órdenes de Compra, como el resto de los datos maestros del proyecto
    // (ver Almacén), quedan a cargo del Administrador.
    it.each(controllersDeCompras)(
      '%s rechaza al Responsable de Compras',
      (_nombre, controller) => {
        expect(
          guard.canActivate(
            contexto(controller, usuario(RolNombre.RESPONSABLE_COMPRAS)),
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

  describe('controllers de Tesorería', () => {
    const controllersDeTesoreria: [string, object][] = [
      ['ComprobanteController', ComprobanteController],
      ['FormaPagoController', FormaPagoController],
      ['TipoComprobanteController', TipoComprobanteController],
      ['PagoController', PagoController],
      ['CuentaCorrienteController', CuentaCorrienteController],
    ];

    it.each(controllersDeTesoreria)(
      '%s deja entrar al Administrador, que es el rol dueño del recurso',
      (_nombre, controller) => {
        expect(
          guard.canActivate(
            contexto(controller, usuario(RolNombre.ADMINISTRADOR)),
          ),
        ).toBe(true);
      },
    );

    // Las formas de pago son datos maestros, así que siguen el mismo criterio
    // que Almacén y Compras: el dueño es el Administrador, no el Responsable
    // de Tesorería, aunque sea quien las usa para registrar pagos.
    // El Responsable de Tesorería no es el dueño del recurso: Tipos de
    // Comprobante, como el resto de los datos maestros del proyecto (ver
    // Almacén y Compras), queda a cargo del Administrador.
    it.each(controllersDeTesoreria)(
      '%s rechaza al Responsable de Tesorería',
      (_nombre, controller) => {
        expect(
          guard.canActivate(
            contexto(controller, usuario(RolNombre.RESPONSABLE_TESORERIA)),
          ),
        ).toBe(false);
      },
    );

    it.each(controllersDeTesoreria)(
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

  describe('controllers de Comercialización', () => {
    const controllersDeComercializacion: [string, object][] = [
      ['PublicacionController', PublicacionController],
      ['PlanPagoController', PlanPagoController],
      ['CobroController', CobroController],
      ['VentaController', VentaController],
      ['DeclaracionPagoAdminController', DeclaracionPagoAdminController],
      ['ConsultaAdminController', ConsultaAdminController],
    ];

    it.each(controllersDeComercializacion)(
      '%s deja entrar al Administrador, que es el rol dueño del recurso',
      (_nombre, controller) => {
        expect(
          guard.canActivate(
            contexto(controller, usuario(RolNombre.ADMINISTRADOR)),
          ),
        ).toBe(true);
      },
    );

    // Publicar/despublicar unidades y administrar planes de pago son tareas
    // del Administrador, como el resto de los datos maestros del proyecto:
    // el Responsable de Comercialización y Ventas no es el dueño de estos
    // recursos.
    it.each(controllersDeComercializacion)(
      '%s rechaza al Responsable de Comercialización y Ventas',
      (_nombre, controller) => {
        expect(
          guard.canActivate(
            contexto(
              controller,
              usuario(RolNombre.RESPONSABLE_COMERCIALIZACION),
            ),
          ),
        ).toBe(false);
      },
    );

    it.each(controllersDeComercializacion)(
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

  describe('controllers de Unidades Funcionales y Proyectos', () => {
    const controllersDeUnidadesFuncionales: [string, object][] = [
      ['UnidadFuncionalController', UnidadFuncionalController],
      ['ProyectoController', ProyectoController],
    ];

    it.each(controllersDeUnidadesFuncionales)(
      '%s deja entrar al Administrador, que es el rol dueño del recurso',
      (_nombre, controller) => {
        expect(
          guard.canActivate(
            contexto(controller, usuario(RolNombre.ADMINISTRADOR)),
          ),
        ).toBe(true);
      },
    );

    // Cargar y mantener las unidades es tarea del Administrador, como el
    // resto de los datos maestros del proyecto: el Responsable de Proyectos
    // no es el dueño de estos recursos.
    it.each(controllersDeUnidadesFuncionales)(
      '%s rechaza al Responsable de Proyectos',
      (_nombre, controller) => {
        expect(
          guard.canActivate(
            contexto(controller, usuario(RolNombre.RESPONSABLE_PROYECTOS)),
          ),
        ).toBe(false);
      },
    );

    it.each(controllersDeUnidadesFuncionales)(
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

  describe('AlmacenamientoController', () => {
    it('deja entrar al Administrador, que es el rol dueño del recurso', () => {
      expect(
        guard.canActivate(
          contexto(AlmacenamientoController, usuario(RolNombre.ADMINISTRADOR)),
        ),
      ).toBe(true);
    });

    // Es un endpoint técnico de almacenamiento (sube a MinIO/S3), no de
    // negocio: el Responsable de Comercialización y Ventas no es su dueño,
    // igual que Publicación y Plan de Pago quedan a cargo del Administrador.
    it('rechaza al Responsable de Comercialización y Ventas', () => {
      expect(
        guard.canActivate(
          contexto(
            AlmacenamientoController,
            usuario(RolNombre.RESPONSABLE_COMERCIALIZACION),
          ),
        ),
      ).toBe(false);
    });

    it('deja entrar al Gerente General por su acceso transversal', () => {
      expect(
        guard.canActivate(
          contexto(
            AlmacenamientoController,
            usuario(RolNombre.GERENTE_GENERAL),
          ),
        ),
      ).toBe(true);
    });
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
          contexto(ControllerDeOtroRol, usuario(RolNombre.GERENTE_GENERAL)),
        ),
      ).toBe(true);
    });

    // El bypass del Administrador vive SOLO en AlertaService: acá es un rol
    // más, y no entra a un recurso del que no es dueño.
    it('el Administrador NO bypassea un recurso de otro rol', () => {
      expect(
        guard.canActivate(
          contexto(ControllerDeOtroRol, usuario(RolNombre.ADMINISTRADOR)),
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
