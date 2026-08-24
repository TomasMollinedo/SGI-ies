import { RouterProvider } from 'react-router'
import { ToastProvider } from '@/shared/components/common/ToastProvider'
import { router } from './router'

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}
