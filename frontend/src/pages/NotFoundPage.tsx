import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { Button } from '@/shared/components/ui/Button'

export function NotFoundPage() {
  const navigate = useNavigate()

  function volver() {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(PATHS.HOME)
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-content text-2xl font-semibold">404</h1>
      <p className="text-content-muted text-sm">La página que buscás no existe.</p>
      <Button icon={<ArrowLeft />} onClick={volver}>
        Volver
      </Button>
    </section>
  )
}
