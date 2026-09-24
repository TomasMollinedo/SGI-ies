import { Building2, Pencil, User } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { FilaDato } from '../components/FilaDato'
import { LinkButton } from '../components/LinkButton'
import { PaginaCentrada } from '../components/PaginaCentrada'
import { TarjetaPublica } from '../components/TarjetaPublica'
import { useClienteAuthUser } from '../hooks/useClienteAuthUser'

const SIN_DATO = '—'

export function PerfilPage() {
  const { data: cliente } = useClienteAuthUser()

  // ClienteProtectedRoute ya garantiza que hay sesión al llegar acá.
  if (!cliente) return null

  return (
    <PaginaCentrada>
      <TarjetaPublica
        className="max-w-md"
        icon={<User />}
        title="Mi perfil"
        footer={
          <>
            <LinkButton
              to={PATHS.ECOMMERCE.MIS_COMPRAS}
              variant="primary"
              icon={<Building2 />}
              className="font-mono tracking-widest uppercase"
            >
              Mis compras
            </LinkButton>
            <LinkButton
              to={PATHS.ECOMMERCE.COMPLETAR_DATOS}
              variant="secondary"
              icon={<Pencil />}
              className="font-mono tracking-widest uppercase"
            >
              Editar mis datos
            </LinkButton>
          </>
        }
      >
        <FilaDato etiqueta="Nombre" valor={cliente.nombre} />
        <FilaDato etiqueta="Apellido" valor={cliente.apellido ?? SIN_DATO} />
        <FilaDato etiqueta="Email" valor={cliente.email} />
        <FilaDato etiqueta="DNI / CUIT" valor={cliente.dni_cuil ?? SIN_DATO} />
        <FilaDato etiqueta="Teléfono" valor={cliente.telefono ?? SIN_DATO} />
      </TarjetaPublica>
    </PaginaCentrada>
  )
}
