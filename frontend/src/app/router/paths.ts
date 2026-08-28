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
  ALERTAS: { ROOT: '/alertas' },
  //COMPRAS: { ROOT: '/compras' },
  //TESORERIA: { ROOT: '/tesoreria' },
  //PROYECTOS: { ROOT: '/proyectos' },
  //COMERCIAL: { ROOT: '/comercial' },
  //SISTEMA: { ROOT: '/sistema' },
} as const
