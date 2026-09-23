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

  PROYECTOS: {
    ROOT: '/sistema/proyectos',
    UNIDADES_FUNCIONALES: '/sistema/proyectos/unidades-funcionales',
    UNIDADES_FUNCIONALES_NUEVA: '/sistema/proyectos/unidades-funcionales/nueva',
    // Patrones de ruta, no URLs navegables: para armar las de una unidad
    // concreta están `rutaDetalleUnidadFuncional` y `rutaEditarUnidadFuncional`.
    UNIDADES_FUNCIONALES_DETALLE: '/sistema/proyectos/unidades-funcionales/:id',
    UNIDADES_FUNCIONALES_EDITAR: '/sistema/proyectos/unidades-funcionales/:id/editar',
  },

  COMERCIALIZACION: {
    ROOT: '/sistema/comercializacion',
    PUBLICACIONES: '/sistema/comercializacion/publicaciones',
    // Patrón de ruta, no una URL navegable: para armar la de una publicación
    // concreta está `rutaDetallePublicacion`.
    PUBLICACION_DETALLE: '/sistema/comercializacion/publicaciones/:idPublicacion',
    // Patrón de ruta, no una URL navegable: para armar la de una publicación
    // concreta está `rutaPlanesPagoPublicacion`.
    PLANES_PAGO_PUBLICACION: '/sistema/comercializacion/publicaciones/:idPublicacion/planes-pago',
    VENTAS: '/sistema/comercializacion/ventas',
    // "Registrar venta" es un modal sobre VENTAS (RegistrarVentaModal), sin
    // ruta propia — a propósito, para no dejar una URL /nueva.
    // Patrón de ruta, no una URL navegable: para armar la de una venta
    // concreta está `rutaDetalleVenta`.
    VENTA_DETALLE: '/sistema/comercializacion/ventas/:idVenta',
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

/** La ruta del detalle de una unidad funcional puntual (ej. 42 → /proyectos/unidades-funcionales/42). */
export function rutaDetalleUnidadFuncional(idUnidadFuncional: number): string {
  return PATHS.PROYECTOS.UNIDADES_FUNCIONALES_DETALLE.replace(':id', String(idUnidadFuncional))
}

/** La ruta de edición de una unidad funcional puntual (ej. 42 → /proyectos/unidades-funcionales/42/editar). */
export function rutaEditarUnidadFuncional(idUnidadFuncional: number): string {
  return PATHS.PROYECTOS.UNIDADES_FUNCIONALES_EDITAR.replace(':id', String(idUnidadFuncional))
}

/**
 * La ruta del catálogo filtrado por un proyecto (ej. 42 → /catalogo?FK_proyecto=42).
 * El nombre del parámetro es el que acepta GET /catalogo, no uno propio del front.
 */
export function rutaCatalogoPorProyecto(idProyecto: number): string {
  return `${PATHS.ECOMMERCE.CATALOGO.ROOT}?FK_proyecto=${idProyecto}`
}

/** La ruta pública del detalle de una unidad puntual (ej. 42 → /catalogo/42). */
export function rutaDetalleUnidad(idPublicacion: number): string {
  return PATHS.ECOMMERCE.CATALOGO.DETALLE.replace(':id', String(idPublicacion))
}

/** La ruta del detalle de una publicación puntual (ej. 42 → /comercializacion/publicaciones/42). */
export function rutaDetallePublicacion(idPublicacion: number): string {
  return PATHS.COMERCIALIZACION.PUBLICACION_DETALLE.replace(':idPublicacion', String(idPublicacion))
}

/** La ruta del detalle de una venta puntual (ej. 7 → /comercializacion/ventas/7). */
export function rutaDetalleVenta(idVenta: number): string {
  return PATHS.COMERCIALIZACION.VENTA_DETALLE.replace(':idVenta', String(idVenta))
}

/** La ruta de los planes de pago de una publicación (ej. 42 → /comercializacion/publicaciones/42/planes-pago). */
export function rutaPlanesPagoPublicacion(idPublicacion: number): string {
  return PATHS.COMERCIALIZACION.PLANES_PAGO_PUBLICACION.replace(
    ':idPublicacion',
    String(idPublicacion)
  )
}
