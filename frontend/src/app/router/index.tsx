import { createBrowserRouter, Navigate } from 'react-router'
import { AlertasPage } from '@/features/alertas/pages/AlertasPage'
import { ArticulosPage } from '@/features/almacen/artículos/pages/ArticulosPage'
import { DepositosPage } from '@/features/almacen/deposito/pages/DepositosPage'
import { MarcasPage } from '@/features/almacen/marca/pages/MarcasPage'
import { RegistroMovimientoPage } from '@/features/almacen/movimiento/pages/RegistroMovimientoPage'
import { TiposMovimientoPage } from '@/features/almacen/tipo-movimiento/pages/TiposMovimientoPage'
import { StockPage } from '@/features/almacen/stock/pages/StockPage'
import { UnidadesMedidaPage } from '@/features/almacen/unidades-medida/pages/UnidadesMedidaPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { MainLayout } from '@/layouts/MainLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PATHS } from './paths'
import { ProtectedRoute } from './ProtectedRoute'
import { CategoriasPage } from '@/features/almacen/categorias/pages/CategoriasPage'
import { ProveedoresPage } from '@/features/compras/proveedores/pages/ProveedoresPage'
import { OrdenesCompraPage } from '@/features/compras/ordenes-compra/pages/OrdenesCompraPage'
import { ComprobantesPage } from '@/features/tesoreria/comprobantes/pages/ComprobantesPage'
import { TiposComprobantePage } from '@/features/tesoreria/tipos-comprobante/pages/TiposComprobantePage'
import { OrdenesPagoPage } from '@/features/tesoreria/pagos/pages/OrdenesPagoPage'
import { FormasPagoPage } from '@/features/tesoreria/formas-pago/pages/FormasPagoPage'
import { CuentasCorrientesPage } from '@/features/tesoreria/cuentas-corrientes/pages/CuentasCorrientesPage'

export const router = createBrowserRouter([
  { path: PATHS.LOGIN, element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: PATHS.HOME,
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
                element: <OrdenesPagoPage />,
                handle: { title: 'Órdenes de Pago' },
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
            ],
          },
          {
            path: PATHS.ALERTAS.ROOT,
            element: <AlertasPage />,
            handle: { title: 'Alertas' },
          },
          /*
          {
            path: PATHS.PROYECTOS.ROOT,
            element: <PlaceholderPage titulo="Proyectos" />,
            handle: { title: 'Proyectos' },
          },
          {
            path: PATHS.COMERCIAL.ROOT,
            element: <PlaceholderPage titulo="Comercial" />,
            handle: { title: 'Comercial' },
          },
          */

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
