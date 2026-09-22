import { createBrowserRouter, Navigate } from 'react-router'
import { AlertasPage } from '@/features/alertas/pages/AlertasPage'
import { ArticulosPage } from '@/features/almacen/artículos/pages/ArticulosPage'
import { DepositosPage } from '@/features/almacen/deposito/pages/DepositosPage'
import { MarcasPage } from '@/features/almacen/marca/pages/MarcasPage'
import { RegistroMovimientoPage } from '@/features/almacen/movimiento/pages/RegistroMovimientoPage'
import { TiposMovimientoPage } from '@/features/almacen/tipo-movimiento/pages/TiposMovimientoPage'
import { CardexPage } from '@/features/almacen/stock/pages/CardexPage'
import { StockPage } from '@/features/almacen/stock/pages/StockPage'
import { UnidadesMedidaPage } from '@/features/almacen/unidades-medida/pages/UnidadesMedidaPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { CompletarDatosPage } from '@/features/ecommerce/pages/CompletarDatosPage'
import { LoginClientePage } from '@/features/ecommerce/pages/LoginClientePage'
import { LandingPage } from '@/features/ecommerce/landing/LandingPage'
import { PerfilPage } from '@/features/ecommerce/pages/PerfilPage'
import { PublicLayout } from '@/features/ecommerce/layout/PublicLayout'
import { SitioPublicoLayout } from '@/features/ecommerce/layout/SitioPublicoLayout'
import { MainLayout } from '@/layouts/MainLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { ClienteProtectedRoute } from './ClienteProtectedRoute'
import { PATHS } from './paths'
import { ProtectedRoute } from './ProtectedRoute'
import { CategoriasPage } from '@/features/almacen/categorias/pages/CategoriasPage'
import { ProveedoresPage } from '@/features/compras/proveedores/pages/ProveedoresPage'
import { OrdenesCompraPage } from '@/features/compras/ordenes-compra/pages/OrdenesCompraPage'
import { PublicacionDetallePage } from '@/features/comercializacion/publicaciones/pages/PublicacionDetallePage'
import { PublicacionesPage } from '@/features/comercializacion/publicaciones/pages/PublicacionesPage'
import { ComprobantesPage } from '@/features/tesoreria/comprobantes/pages/ComprobantesPage'
import { TiposComprobantePage } from '@/features/tesoreria/tipos-comprobante/pages/TiposComprobantePage'
import { NuevoPagoPage } from '@/features/tesoreria/pagos/pages/NuevoPagoPage'
import { PagosPage } from '@/features/tesoreria/pagos/pages/PagosPage'
import { ReporteEgresosPage } from '@/features/tesoreria/pagos/pages/ReporteEgresosPage'
import { FormasPagoPage } from '@/features/tesoreria/formas-pago/pages/FormasPagoPage'
import { CardexCuentaCorrientePage } from '@/features/tesoreria/cuentas-corrientes/pages/CardexCuentaCorrientePage'
import { CuentasCorrientesPage } from '@/features/tesoreria/cuentas-corrientes/pages/CuentasCorrientesPage'

export const router = createBrowserRouter([
  { path: PATHS.LOGIN, element: <LoginPage /> },
  // Sitio público rediseñado (T109): landing y pantallas de datos del cliente,
  // con el mismo header, el mismo pie y el mismo fondo oscuro.
  {
    element: <SitioPublicoLayout />,
    children: [
      { path: PATHS.HOME, element: <LandingPage /> },
      {
        element: <ClienteProtectedRoute requiereDatosCompletos />,
        children: [
          {
            path: PATHS.ECOMMERCE.PERFIL,
            element: <PerfilPage />,
          },
        ],
      },
      {
        element: <ClienteProtectedRoute />,
        children: [
          {
            path: PATHS.ECOMMERCE.COMPLETAR_DATOS,
            element: <CompletarDatosPage />,
          },
        ],
      },
      {
        path: PATHS.ECOMMERCE.LOGIN,
        element: <LoginClientePage />,
      },
    ],
  },
  // Placeholders del catálogo (HU-25): siguen con el layout anterior hasta que
  // esa historia arme sus pantallas.
  {
    element: <PublicLayout />,
    children: [
      {
        path: PATHS.ECOMMERCE.CATALOGO.ROOT,
        element: <PlaceholderPage titulo="Catálogo" historia="HU-25" />,
      },
      {
        path: PATHS.ECOMMERCE.CATALOGO.DETALLE,
        element: <PlaceholderPage titulo="Detalle de unidad" historia="HU-25" />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: PATHS.SISTEMA.ROOT,
        element: <MainLayout />,
        errorElement: <NotFoundPage />,
        children: [
          {
            index: true,
            element: <Navigate to={PATHS.ALMACEN.CATALOGO.ARTICULOS} replace />,
          },

          {
            path: PATHS.ALMACEN.ROOT,
            children: [
              { index: true, element: <Navigate to={PATHS.ALMACEN.CATALOGO.ARTICULOS} replace /> },

              {
                path: PATHS.ALMACEN.CATALOGO.ROOT,
                element: <Navigate to={PATHS.ALMACEN.CATALOGO.ARTICULOS} replace />,
              },
              {
                path: PATHS.ALMACEN.CATALOGO.ARTICULOS,
                element: <ArticulosPage />,
                handle: { title: 'Artículos' },
              },
              {
                path: PATHS.ALMACEN.CATALOGO.MARCAS,
                element: <MarcasPage />,
                handle: { title: 'Marcas' },
              },
              {
                path: PATHS.ALMACEN.CATALOGO.CATEGORIAS,
                element: <CategoriasPage />,
                handle: { title: 'Categorías' },
              },
              {
                path: PATHS.ALMACEN.CATALOGO.UNIDADES_MEDIDA,
                element: <UnidadesMedidaPage />,
                handle: { title: 'Unidades de Medida' },
              },

              {
                path: PATHS.ALMACEN.DEPOSITO.ROOT,
                element: <Navigate to={PATHS.ALMACEN.DEPOSITO.OBRADORES} replace />,
              },
              {
                path: PATHS.ALMACEN.DEPOSITO.OBRADORES,
                element: <DepositosPage />,
                handle: { title: 'Depósito y Obradores' },
              },
              {
                path: PATHS.ALMACEN.DEPOSITO.STOCK,
                element: <StockPage />,
                handle: { title: 'Stock por Depósito' },
              },
              {
                path: PATHS.ALMACEN.DEPOSITO.STOCK_CARDEX,
                element: <CardexPage />,
                handle: { title: 'Historial de Movimientos por Artículo' },
              },

              {
                path: PATHS.ALMACEN.MOVIMIENTOS.ROOT,
                element: <RegistroMovimientoPage />,
                handle: { title: 'Registro de Movimientos' },
              },
              {
                path: PATHS.ALMACEN.MOVIMIENTOS.TIPOS,
                element: <TiposMovimientoPage />,
                handle: { title: 'Tipos de Movimiento' },
              },
            ],
          },

          {
            path: PATHS.COMPRAS.ROOT,
            children: [
              { index: true, element: <Navigate to={PATHS.COMPRAS.PROVEEDORES} replace /> },
              {
                path: PATHS.COMPRAS.PROVEEDORES,
                element: <ProveedoresPage />,
                handle: { title: 'Proveedores' },
              },
              {
                path: PATHS.COMPRAS.ORDENES_COMPRA,
                element: <OrdenesCompraPage />,
                handle: { title: 'Órdenes de Compra' },
              },
            ],
          },

          {
            path: PATHS.TESORERIA.ROOT,
            children: [
              {
                index: true,
                element: <Navigate to={PATHS.TESORERIA.COMPROBANTES.ROOT} replace />,
              },

              {
                path: PATHS.TESORERIA.COMPROBANTES.ROOT,
                element: <ComprobantesPage />,
                handle: { title: 'Comprobantes' },
              },
              {
                path: PATHS.TESORERIA.COMPROBANTES.TIPOS,
                element: <TiposComprobantePage />,
                handle: { title: 'Tipos de Comprobante' },
              },

              {
                path: PATHS.TESORERIA.PAGOS.ROOT,
                element: <PagosPage />,
                handle: { title: 'Pagos' },
              },
              {
                path: PATHS.TESORERIA.PAGOS.NUEVO,
                element: <NuevoPagoPage />,
                handle: { title: 'Nuevo pago' },
              },
              {
                path: PATHS.TESORERIA.PAGOS.FORMAS,
                element: <FormasPagoPage />,
                handle: { title: 'Formas de Pago' },
              },

              {
                path: PATHS.TESORERIA.CUENTAS_CORRIENTES,
                element: <CuentasCorrientesPage />,
                handle: { title: 'Cuentas Corrientes' },
              },
              {
                path: PATHS.TESORERIA.CUENTAS_CORRIENTES_CARDEX,
                element: <CardexCuentaCorrientePage />,
                handle: { title: 'Cuenta Corriente del Proveedor' },
              },
              {
                path: PATHS.TESORERIA.REPORTE_EGRESOS,
                element: <ReporteEgresosPage />,
                handle: { title: 'Reporte de Egresos' },
              },
              {
                path: PATHS.TESORERIA.COBRANZAS,
                element: <PlaceholderPage titulo="Cobranzas" historia="HU-30" />,
                handle: { title: 'Cobranzas' },
              },
            ],
          },
          {
            path: PATHS.ALERTAS.ROOT,
            element: <AlertasPage />,
            handle: { title: 'Alertas' },
          },
          {
            path: PATHS.PROYECTOS.ROOT,
            element: <PlaceholderPage titulo="Proyectos" historia="HU-20" />,
            handle: { title: 'Proyectos' },
          },
          {
            path: PATHS.COMERCIALIZACION.ROOT,
            children: [
              {
                index: true,
                element: <Navigate to={PATHS.COMERCIALIZACION.PUBLICACIONES} replace />,
              },
              {
                path: PATHS.COMERCIALIZACION.PUBLICACIONES,
                element: <PublicacionesPage />,
                handle: { title: 'Publicaciones' },
              },
              {
                path: PATHS.COMERCIALIZACION.PUBLICACION_DETALLE,
                element: <PublicacionDetallePage />,
                handle: { title: 'Detalle de publicación' },
              },
            ],
          },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
