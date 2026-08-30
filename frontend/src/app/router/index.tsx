import { createBrowserRouter, Navigate } from 'react-router'
import { AlertasPage } from '@/features/alertas/pages/AlertasPage'
import { ArticulosPage } from '@/features/almacen/artículos/pages/ArticulosPage'
import { DepositosPage } from '@/features/almacen/deposito/pages/DepositosPage'
import { CatalogoArticulosPage } from '@/features/almacen/pages/CatalogoArticulosPage'
import { DepositoObradoresPage } from '@/features/almacen/pages/DepositoObradoresPage'
import { MarcasPage } from '@/features/almacen/marca/pages/MarcasPage'
import { MovimientosPage } from '@/features/almacen/pages/MovimientosPage'
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
                element: <CatalogoArticulosPage />,
                handle: { title: 'Catálogo de Artículos' },
                children: [
                  {
                    index: true,
                    element: <Navigate to={PATHS.ALMACEN.CATALOGO.ARTICULOS} replace />,
                  },
                  {
                    path: PATHS.ALMACEN.CATALOGO.ARTICULOS,
                    element: <ArticulosPage />,
                  },
                  {
                    path: PATHS.ALMACEN.CATALOGO.MARCAS,
                    element: <MarcasPage />,
                  },
                  {
                    path: PATHS.ALMACEN.CATALOGO.CATEGORIAS,
                    element: <CategoriasPage />,
                  },
                  {
                    path: PATHS.ALMACEN.CATALOGO.UNIDADES_MEDIDA,
                    element: <UnidadesMedidaPage />,
                  },
                ],
              },
              {
                path: PATHS.ALMACEN.DEPOSITO.ROOT,
                element: <DepositoObradoresPage />,
                handle: { title: 'Depósito/Obradores' },
                children: [
                  {
                    index: true,
                    element: <Navigate to={PATHS.ALMACEN.DEPOSITO.OBRADORES} replace />,
                  },
                  {
                    path: PATHS.ALMACEN.DEPOSITO.OBRADORES,
                    element: <DepositosPage />,
                  },
                  {
                    path: PATHS.ALMACEN.DEPOSITO.STOCK,
                    element: <StockPage />,
                  },
                ],
              },
              {
                path: PATHS.ALMACEN.MOVIMIENTOS.ROOT,
                element: <MovimientosPage />,
                handle: { title: 'Movimientos' },
                children: [
                  { index: true, element: <RegistroMovimientoPage /> },
                  {
                    path: PATHS.ALMACEN.MOVIMIENTOS.TIPOS,
                    element: <TiposMovimientoPage />,
                  },
                ],
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
            path: PATHS.COMPRAS.ROOT,
            element: <PlaceholderPage titulo="Compras y Proveedores" />,
            handle: { title: 'Compras y Proveedores' },
          },
          {
            path: PATHS.TESORERIA.ROOT,
            element: <PlaceholderPage titulo="Tesorería" />,
            handle: { title: 'Tesorería' },
          },
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
          {
            path: PATHS.SISTEMA.ROOT,
            element: <PlaceholderPage titulo="Administración del Sistema" />,
            handle: { title: 'Administración del Sistema' },
          },
          */

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
