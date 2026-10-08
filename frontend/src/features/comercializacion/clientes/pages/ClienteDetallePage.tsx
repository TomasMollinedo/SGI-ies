import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, ShieldAlert, UserX } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Button } from '@/shared/components/ui/Button'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { ClienteCobrosSection } from '../components/ClienteCobrosSection'
import { ClienteConsultasSection } from '../components/ClienteConsultasSection'
import { ClienteDatosSection } from '../components/ClienteDatosSection'
import { ClienteDeclaracionesSection } from '../components/ClienteDeclaracionesSection'
import { ClienteForm } from '../components/ClienteForm'
import { ClienteVentasSection } from '../components/ClienteVentasSection'
import { useClienteFicha } from '../hooks/useClientes'

/**
 * Ficha del cliente (HU-33), en las cinco secciones de la historia: datos
 * personales, ventas, cobros, declaraciones pendientes o rechazadas y
 * consultas.
 *
 * La ficha da acceso, no duplica: el plan de pago y el cronograma se ven en el
 * detalle de la venta y las imputaciones en el del cobro, y cada fila enlaza
 * ahí. Desde acá no se registran ventas, cobros ni respuestas —cada acción
 * vive en su propia pantalla—, y tampoco hay baja: los clientes conservan su
 * historial comercial y de pagos para siempre. Lo único que se modifica es el
 * modo EDICIÓN de los datos de contacto.
 */
export function ClienteDetallePage() {
  const params = useParams<{ idCliente: string }>()
  const navigate = useNavigate()
  const [editando, setEditando] = useState(false)

  // Un id de ruta que no es un entero deja la query deshabilitada en vez de
  // pedir `/clientes/NaN`.
  const idParseado = Number(params.idCliente)
  const idCliente = Number.isInteger(idParseado) && idParseado > 0 ? idParseado : null

  const { data: cliente, isLoading, error, refetch } = useClienteFicha(idCliente)

  const statusCode = error?.statusCode

  // El interceptor del httpClient ya intentó renovar la sesión; si igual llega
  // un 401 es que no hay sesión recuperable.
  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  const volverAlListado = (
    <Button
      size="sm"
      icon={<ArrowLeft />}
      onClick={() => navigate(PATHS.COMERCIALIZACION.CLIENTES)}
    >
      Volver al listado
    </Button>
  )

  if (statusCode === 403) {
    return (
      <EmptyState
        icono={ShieldAlert}
        titulo="No tenés permisos para acceder a esta sección"
        descripcion="Se requiere el rol Administrador."
      />
    )
  }

  if (statusCode === 404 || idCliente === null) {
    return (
      <div className="space-y-4">
        {volverAlListado}
        <EmptyState
          icono={UserX}
          titulo="El cliente no existe"
          descripcion="Puede que el enlace esté mal o que ese cliente nunca haya existido."
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        {volverAlListado}
        <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={() => refetch()} />
      </div>
    )
  }

  if (isLoading || !cliente) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {volverAlListado}

      <ClienteDatosSection cliente={cliente} onEditar={() => setEditando(true)} />
      <ClienteVentasSection ventas={cliente.ventas} />
      <ClienteCobrosSection cobros={cliente.cobros} />
      <ClienteDeclaracionesSection declaraciones={cliente.declaraciones} />
      <ClienteConsultasSection consultas={cliente.consultas} />

      <ClienteForm cliente={editando ? cliente : null} onClose={() => setEditando(false)} />
    </div>
  )
}
