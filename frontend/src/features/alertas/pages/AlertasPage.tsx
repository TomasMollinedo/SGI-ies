import { useEffect, useState } from 'react'
import { Check, Eye } from 'lucide-react'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { AlertaDetalleModal } from '../components/AlertaDetalleModal'
import { FiltrosAlertasBar } from '../components/FiltrosAlertasBar'
import { COLUMNAS_ALERTAS, LIMITE_PAGINA } from '../config/alertas.config'
import { useAlertas, useAtenderAlerta } from '../hooks/useAlertas'
import type { Alerta } from '../types/alertas.types'

export function AlertasPage() {
  const [tipoAlertaId, setTipoAlertaId] = useState('')
  const [atendida, setAtendida] = useState('false')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [page, setPage] = useState(1)
  const [detalleId, setDetalleId] = useState<number | null>(null)

  const toast = useToast()

  useEffect(() => {
    setPage(1)
  }, [tipoAlertaId, atendida, fechaDesde, fechaHasta])

  const { data, isLoading, isError, refetch } = useAlertas({
    tipoAlertaId: tipoAlertaId === '' ? undefined : Number(tipoAlertaId),
    atendida: atendida === '' ? undefined : atendida === 'true',
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
    page,
    limit: LIMITE_PAGINA,
  })

  const atender = useAtenderAlerta()

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

  const columnas: DataTableColumn<Alerta>[] = [
    ...COLUMNAS_ALERTAS,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <div className="inline-flex items-center gap-1">
          <IconButton
            icon={<Eye />}
            ariaLabel="Ver detalle"
            variant="soft"
            size="sm"
            bgColor="fondo-ver"
            iconColor="info"
            onClick={() => setDetalleId(item.id_alerta)}
          />
          {!item.atendida && (
            <IconButton
              icon={<Check />}
              ariaLabel="Marcar como atendida"
              variant="soft"
              size="sm"
              bgColor="success-soft"
              iconColor="success"
              loading={atender.isPending && atender.variables === item.id_alerta}
              onClick={() => manejarAtender(item.id_alerta)}
            />
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <FiltrosAlertasBar
        tipoAlertaId={tipoAlertaId}
        onTipoAlertaIdChange={setTipoAlertaId}
        atendida={atendida}
        onAtendidaChange={setAtendida}
        fechaDesde={fechaDesde}
        onFechaDesdeChange={setFechaDesde}
        fechaHasta={fechaHasta}
        onFechaHastaChange={setFechaHasta}
      />

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary size-8" />
        </div>
      )}

      {isError && <ErrorState onReintentar={() => refetch()} />}

      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState
          titulo="No se encontraron alertas"
          descripcion="Probá ajustar los filtros de búsqueda."
        />
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <DataTable
            data={data.data}
            columns={columnas}
            obtenerId={(item) => String(item.id_alerta)}
          />
          <Pagination
            currentPage={data.meta.page}
            totalPages={Math.max(1, Math.ceil(data.meta.total / data.meta.limit))}
            totalItems={data.meta.total}
            pageSize={data.meta.limit}
            onPageChange={setPage}
          />
        </>
      )}

      <AlertaDetalleModal id={detalleId} onClose={() => setDetalleId(null)} />
    </div>
  )
}
