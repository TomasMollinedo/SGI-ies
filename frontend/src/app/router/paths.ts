export const PATHS = {
  // Raíz del dominio público del ecommerce (HU-24 Landing).
  HOME: '/',
  // Login del personal interno. El login de clientes (Google OAuth, HU-23)
  // es una pantalla propia del dominio público, separada de esta.
  LOGIN: '/login',

  // Panel interno (staff), protegido por sesión.
  SISTEMA: {
    ROOT: '/sistema',
  },

  ALMACEN: {
    ROOT: '/sistema/almacen',
    CATALOGO: {
      ROOT: '/sistema/almacen/catalogo',
      ARTICULOS: '/sistema/almacen/catalogo/articulos',
      MARCAS: '/sistema/almacen/catalogo/marcas',
      CATEGORIAS: '/sistema/almacen/catalogo/categorias',
      UNIDADES_MEDIDA: '/sistema/almacen/catalogo/unidades-medida',
    },
    DEPOSITO: {
      ROOT: '/sistema/almacen/deposito',
      OBRADORES: '/sistema/almacen/deposito/obradores',
      STOCK: '/sistema/almacen/deposito/stock',
      // Patrón de ruta, no una URL navegable: para armar la de una ficha
      // concreta está `rutaCardexStock`.
      STOCK_CARDEX: '/sistema/almacen/deposito/stock/:idStock/cardex',
    },
    MOVIMIENTOS: {
      ROOT: '/sistema/almacen/movimientos',
      TIPOS: '/sistema/almacen/movimientos/tipos',
    },
  },
  COMPRAS: {
    ROOT: '/sistema/compras',
    PROVEEDORES: '/sistema/compras/proveedores',
    ORDENES_COMPRA: '/sistema/compras/ordenes-compra',
  },
  TESORERIA: {
    ROOT: '/sistema/tesoreria',
    COMPROBANTES: {
      ROOT: '/sistema/tesoreria/comprobantes',
      TIPOS: '/sistema/tesoreria/comprobantes/tipos',
    },
    PAGOS: {
      ROOT: '/sistema/tesoreria/pagos',
      NUEVO: '/sistema/tesoreria/pagos/nuevo',
      FORMAS: '/sistema/tesoreria/pagos/formas',
    },
    CUENTAS_CORRIENTES: '/sistema/tesoreria/cuentas-corrientes',
    // Patrón de ruta, no una URL navegable: para armar la de un proveedor
    // concreto está `rutaCardexCuentaCorriente`.
    CUENTAS_CORRIENTES_CARDEX: '/sistema/tesoreria/cuentas-corrientes/:idProveedor/cardex',
    REPORTE_EGRESOS: '/sistema/tesoreria/reporte-egresos',
    COBRANZAS: '/sistema/tesoreria/cobranzas',
  },
  ALERTAS: { ROOT: '/sistema/alertas' },

  PROYECTOS: { ROOT: '/sistema/proyectos' },
  COMERCIALIZACION: {
    ROOT: '/sistema/comercializacion',
    PUBLICACIONES: '/sistema/comercializacion/publicaciones',
  },

  // Sitio público del ecommerce (HU-23/24/25). Convive con el resto de las
  // rutas: HOME y estas son las públicas, /login y /sistema siguen siendo
  // del panel interno.
  ECOMMERCE: {
    CATALOGO: {
      ROOT: '/catalogo',
      // Patrón de ruta, no una URL navegable: para armar la de una unidad
      // concreta está `rutaDetalleUnidad`.
      DETALLE: '/catalogo/:id',
    },
    LOGIN: '/ingresar',
    COMPLETAR_DATOS: '/completar-datos',
    PERFIL: '/mi-perfil',
  },
} as const

/** La ruta del cardex de una ficha puntual (ej. 42 → /almacen/deposito/stock/42/cardex). */
export function rutaCardexStock(idStock: number): string {
  return PATHS.ALMACEN.DEPOSITO.STOCK_CARDEX.replace(':idStock', String(idStock))
}

/** La ruta del extracto de un proveedor puntual (ej. 42 → /tesoreria/cuentas-corrientes/42/cardex). */
export function rutaCardexCuentaCorriente(idProveedor: number): string {
  return PATHS.TESORERIA.CUENTAS_CORRIENTES_CARDEX.replace(':idProveedor', String(idProveedor))
}

/** La ruta pública del detalle de una unidad puntual (ej. 42 → /catalogo/42). */
export function rutaDetalleUnidad(idPublicacion: number): string {
  return PATHS.ECOMMERCE.CATALOGO.DETALLE.replace(':id', String(idPublicacion))
}
