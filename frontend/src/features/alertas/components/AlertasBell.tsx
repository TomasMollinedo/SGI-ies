import { useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { useNavigate } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFechaRelativa } from '@/shared/utils/fecha'
import { useAlertasPendientes, useAtenderAlerta } from '../hooks/useAlertas'

/**
 * Vista rápida de alertas pendientes en el header: campanita con contador que
 * abre un modal con las últimas pendientes, cada una con su propia acción de
 * atender (misma mutación y manejo de 409 que la pantalla completa).
 */
export function AlertasBell() {
  const [abierto, setAbierto] = useState(false)
  const navigate = useNavigate()
  const { data } = useAlertasPendientes()
  const atender = useAtenderAlerta()
  const toast = useToast()

  function manejarAtender(id: number) {
    atender.mutate(id, {
      onSuccess: () => toast.success('Alerta marcada como atendida.'),
      onError: (error) => {
        if (error.statusCode === 409) {
          toast.warning('Esta alerta ya fue atendida.')
        } else {
          toast.error(formatearMensajeError(error.message))
        }
      },
    })
  }

  const total = data?.meta.total ?? 0

  function irATodas() {
    setAbierto(false)
    navigate(PATHS.ALERTAS.ROOT)
  }

  return (
    <>
      <div className="relative">
        <IconButton
          icon={<Bell />}
          ariaLabel="Alertas pendientes"
          variant="ghost"
          onClick={() => setAbierto(true)}
        />
        {total > 0 && (
          <span
            aria-hidden="true"
            className="bg-error absolute top-0.5 right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
          >
            {total > 9 ? '9+' : total}
          </span>
        )}
      </div>

      <Modal
        open={abierto}
        onClose={() => setAbierto(false)}
        title="Alertas pendientes"
        icon={<Bell />}
        size="md"
        footer={
          <Button variant="primary" onClick={irATodas}>
            Ver todas las alertas
          </Button>
        }
      >
        {data && data.data.length === 0 ? (
          <p className="text-content-muted py-6 text-center text-sm">
            No tenés alertas pendientes.
          </p>
        ) : (
          <ul className="flex flex-col">
            {data?.data.map((alerta) => (
              <li
                key={alerta.id_alerta}
                className="border-subtle flex items-start gap-3 border-b py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-content-muted text-xs font-medium uppercase">
                    {alerta.tipoAlerta.nombre}
                  </p>
                  <p className="text-content text-sm">{alerta.mensaje}</p>
                  <p className="text-content-muted text-xs">
                    {formatearFechaRelativa(alerta.hora_creacion)}
                  </p>
                </div>
                <IconButton
                  icon={<Check />}
                  ariaLabel="Marcar como atendida"
                  variant="soft"
                  size="sm"
                  bgColor="success-soft"
                  iconColor="success"
                  loading={atender.isPending && atender.variables === alerta.id_alerta}
                  onClick={() => manejarAtender(alerta.id_alerta)}
                />
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  )
}
