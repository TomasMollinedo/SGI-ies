import { createBrowserRouter } from 'react-router'
import { MainLayout } from '@/layouts/MainLayout'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { PATHS } from './paths'

export const router = createBrowserRouter([
  {
    path: PATHS.HOME,
    element: <MainLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },

      {
        path: PATHS.ALMACEN.ROOT,
        element: <PlaceholderPage titulo="Almacén" />,
      },
      {
        path: PATHS.COMPRAS.ROOT,
        element: <PlaceholderPage titulo="Compras y Proveedores" />,
      },
      {
        path: PATHS.TESORERIA.ROOT,
        element: <PlaceholderPage titulo="Tesorería" />,
      },
      {
        path: PATHS.PROYECTOS.ROOT,
        element: <PlaceholderPage titulo="Proyectos" />,
      },
      {
        path: PATHS.COMERCIAL.ROOT,
        element: <PlaceholderPage titulo="Comercial" />,
      },
      {
        path: PATHS.SISTEMA.ROOT,
        element: <PlaceholderPage titulo="Administración del Sistema" />,
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
