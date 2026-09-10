import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Modal } from '@/shared/components/common/Modal'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Button } from '@/shared/components/ui/Button'
import type { ApiErrorResponse, PaginatedResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'

interface SelectorEntidadModalProps<T> {
  open: boolean
  onClose: () => void
  titulo: string
  icono?: ReactNode
  /** Filtros propios de la entidad. El contenedor que usa el selector maneja su estado. */
  filtros?: ReactNode
  /** Página actual de resultados + su meta, del hook de listado del contenedor. */
  data: PaginatedResponse<T> | undefined
  cargando: boolean
  error?: ApiErrorResponse | null
  onReintentar?: () => void
  columnas: DataTableColumn<T>[]
  obtenerId: (item: T) => string
  page: number
  onPageChange: (page: number) => void
  onSeleccionar: (item: T) => void
  seleccionLabel?: string
  vacioTitulo?: string
  vacioDescripcion?: string
}

/**
 * Modal genérico para elegir una entidad de un listado paginado con filtros.
 * Es solo la carcasa: el contenedor que lo usa arma su hook de listado, sus
 * columnas y sus `filtros`, y decide qué hacer con la fila elegida en
 * `onSeleccionar`. Pensado para reutilizarse en cualquier feature.
 */
export function SelectorEntidadModal<T>({
  open,
  onClose,
  titulo,
  icono,
  filtros,
  data,
  cargando,
  error = null,
  onReintentar,
  columnas,
  obtenerId,
  page,
  onPageChange,
  onSeleccionar,
  seleccionLabel = 'Elegir',
  vacioTitulo = 'No se encontraron resultados',
  vacioDescripcion = 'Probá ajustar los filtros de búsqueda.',
}: SelectorEntidadModalProps<T>) {
  void page

  const columnasConAccion: DataTableColumn<T>[] = [
    ...columnas,
    {
      key: '__seleccion',
      label: '',
      render: (item) => (
        <Button size="sm" variant="primary" onClick={() => onSeleccionar(item)}>
          {seleccionLabel}
        </Button>
      ),
    },
  ]

  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0
  const filas = data?.data ?? []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      icon={icono}
      size="lg"
      footer={
        <Button variant="error" icon={<X />} onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {filtros}

        {error ? (
          <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={onReintentar} />
        ) : cargando && filas.length === 0 ? (
          <div className="flex justify-center py-10">
            <Spinner size={32} />
          </div>
        ) : filas.length === 0 ? (
          <EmptyState titulo={vacioTitulo} descripcion={vacioDescripcion} />
        ) : (
          <>
            <DataTable
              data={filas}
              columns={columnasConAccion}
              obtenerId={obtenerId}
              ariaLabel={titulo}
            />
            {meta && (
              <Pagination
                currentPage={meta.page}
                totalPages={totalPaginas}
                totalItems={meta.total}
                pageSize={meta.limit}
                onPageChange={onPageChange}
                disabled={cargando}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  )
}