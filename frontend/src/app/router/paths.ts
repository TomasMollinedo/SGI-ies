export const PATHS = {
  HOME: '/',
  LOGIN: '/login',

  ALMACEN: {
    ROOT: '/almacen',
    CATALOGO: {
      ROOT: '/almacen/catalogo',
      ARTICULOS: '/almacen/catalogo/articulos',
      MARCAS: '/almacen/catalogo/marcas',
      CATEGORIAS: '/almacen/catalogo/categorias',
      UNIDADES_MEDIDA: '/almacen/catalogo/unidades-medida',
    },
    DEPOSITO: {
      ROOT: '/almacen/deposito',
      OBRADORES: '/almacen/deposito/obradores',
      STOCK: '/almacen/deposito/stock',
    },
    MOVIMIENTOS: {
      ROOT: '/almacen/movimientos',
      TIPOS: '/almacen/movimientos/tipos',
    },
  },
  COMPRAS: {
    ROOT: '/compras',
    PROVEEDORES: '/compras/proveedores',
    ORDENES_COMPRA: '/compras/ordenes-compra',
  },
  TESORERIA: {
    ROOT: '/tesoreria',
    COMPROBANTES: {
      ROOT: '/tesoreria/comprobantes',
      TIPOS: '/tesoreria/comprobantes/tipos',
    },
    PAGOS: {
      ROOT: '/tesoreria/pagos',
      FORMAS: '/tesoreria/pagos/formas',
    },
    CUENTAS_CORRIENTES: '/tesoreria/cuentas-corrientes',
  },
  ALERTAS: { ROOT: '/alertas' },

  //PROYECTOS: { ROOT: '/proyectos' },
  //COMERCIAL: { ROOT: '/comercial' },
} as const
