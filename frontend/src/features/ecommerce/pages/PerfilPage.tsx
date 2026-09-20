import { Pencil, User } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { LinkButton } from '../components/LinkButton'
import { TarjetaPublica } from '../components/TarjetaPublica'
import { useClienteAuthUser } from '../hooks/useClienteAuthUser'

const SIN_DATO = '—'

export function PerfilPage() {
  const { data: cliente } = useClienteAuthUser()

  // ClienteProtectedRoute ya garantiza que hay sesión al llegar acá.
  if (!cliente) return null

  return (
    <TarjetaPublica
      className="max-w-lg"
      icon={<User />}
      title="Mi perfil"
      footer={
        <LinkButton to={PATHS.ECOMMERCE.COMPLETAR_DATOS} icon={<Pencil />}>
          Editar mis datos
        </LinkButton>
      }
    >
      <DetailRow label="Nombre" value={cliente.nombre} />
      <DetailRow label="Apellido" value={cliente.apellido ?? SIN_DATO} />
      <DetailRow label="Email" value={cliente.email} />
      <DetailRow label="DNI / CUIT" value={cliente.dni_cuil ?? SIN_DATO} />
      <DetailRow label="Teléfono" value={cliente.telefono ?? SIN_DATO} />
    </TarjetaPublica>
  )
}
