import { useEffect, useState } from 'react'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { FiltrosDepositosBar } from '../components/FiltrosDepositosBar'
import { COLUMNAS_DEPOSITOS, LIMITE_PAGINA } from '../config/deposito.config'
import { useDepositos } from '../hooks/useDepositos'

export function DepositosPage() {
  const [nombre, setNombre] = useState('')
  const [estado, setEstado] = useState('')
  const [esObrador, setEsObrador] = useState('')
  const [page, setPage] = useState(1)

  const nombreDebounced = useDebounce(nombre, 300)

  useEffect(() => {
    setPage(1)
  }, [nombreDebounced, estado, esObrador])

  const { data, isLoading, isError, refetch } = useDepositos({
    nombre: nombreDebounced || undefined,
    estado: estado === '' ? undefined : estado === 'true',
    esObrador: esObrador === '' ? undefined : esObrador === 'true',
    page,
    limit: LIMITE_PAGINA,
  })

  return (
    <div className="space-y-4">
      <FiltrosDepositosBar
        nombre={nombre}
        onNombreChange={setNombre}
        estado={estado}
        onEstadoChange={setEstado}
        esObrador={esObrador}
        onEsObradorChange={setEsObrador}
      />

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary size-8" />
        </div>
      )}

      {isError && <ErrorState onReintentar={() => refetch()} />}

      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState
          titulo="No se encontraron depósitos ni obradores"
          descripcion="Probá ajustar los filtros de búsqueda."
        />
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <DataTable
            data={data.data}
            columns={COLUMNAS_DEPOSITOS}
            obtenerId={(item) => String(item.id_deposito)}
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
    </div>
  )
}
