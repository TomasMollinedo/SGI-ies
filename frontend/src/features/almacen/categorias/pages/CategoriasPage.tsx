import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { Pagination } from '@/shared/components/common/Pagination'
import { RowActions } from '@/shared/components/common/RowActions'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { CategoriaDetalleModal } from '../components/CategoriaDetalleModal'
import { CategoriaForm } from '../components/CategoriaForm'
import { FiltrosCategoriasBar } from '../components/FiltrosCategoriasBar'
import { COLUMNAS_CATEGORIAS, LIMITE_PAGINA } from '../config/categoria.config'
import { useActualizarCategoria } from '../hooks/useActualizarCategoria'
import { useCategorias } from '../hooks/useCategorias'
import { useCrearCategoria } from '../hooks/useCrearCategoria'
import { useDarAltaCategoria } from '../hooks/useDarAltaCategoria'
import { useDarBajaCategoria } from '../hooks/useDarBajaCategoria'
import type { CategoriaFormOutput } from '../types/categoria.schema'
import type { Categoria } from '../types/categoria.types'

type EstadoFormulario = { modo: 'crear' } | { modo: 'editar'; categoria: Categoria } | null
type EstadoConfirmacion = { tipo: 'baja' | 'reactivar'; categoria: Categoria } | null

export function CategoriasPage() {
  const [nombre, setNombre] = useState('')
  const [estado, setEstado] = useState('true')
  const [page, setPage] = useState(1)

  const [formulario, setFormulario] = useState<EstadoFormulario>(null)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [confirmacion, setConfirmacion] = useState<EstadoConfirmacion>(null)

  const nombreDebounced = useDebounce(nombre, 300)
  const toast = useToast()

  useEffect(() => {
    setPage(1)
  }, [nombreDebounced, estado])

  const { data, isLoading, isError, refetch } = useCategorias({
    nombre: nombreDebounced || undefined,
    estado: estado === '' ? undefined : estado === 'true',
    page,
    limit: LIMITE_PAGINA,
  })

  const crear = useCrearCategoria()
  const editar = useActualizarCategoria()
  const baja = useDarBajaCategoria()
  const reactivar = useDarAltaCategoria()

  function manejarSubmitFormulario(payload: CategoriaFormOutput) {
  const descripcion = payload.descripcion?.trim() ?? ''

  if (formulario?.modo === 'crear') {
    crear.mutate(
      { nombre: payload.nombre, ...(descripcion ? { descripcion } : {}) },
      {
        onSuccess: () => {
          toast.success('Categoría creada correctamente.')
          setFormulario(null)
        },
        onError: (error) => toast.error(formatearMensajeError(error.message)),
      }
    )
    return
  }

  if (formulario?.modo === 'editar') {
    editar.mutate(
      { id: formulario.categoria.id_categoria, input: { nombre: payload.nombre, descripcion } },
      {
        onSuccess: () => {
          toast.success('Categoría editada correctamente.')
          setFormulario(null)
        },
        onError: (error) => toast.error(formatearMensajeError(error.message)),
      }
    )
  }
}


  function manejarConfirmar() {
    if (!confirmacion) return
    const { tipo, categoria } = confirmacion
    const mutacion = tipo === 'baja' ? baja : reactivar
    const mensajeExito =
      tipo === 'baja'
        ? 'Categoría dada de baja correctamente.'
        : 'Categoría reactivada correctamente.'

    mutacion.mutate(categoria.id_categoria, {
      onSuccess: () => {
        toast.success(mensajeExito)
        setConfirmacion(null)
      },
      onError: (error) => toast.error(formatearMensajeError(error.message)),
    })
  }

  const columnas: DataTableColumn<Categoria>[] = [
    ...COLUMNAS_CATEGORIAS,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          isActive={item.estado}
          onView={() => setDetalleId(item.id_categoria)}
          onEdit={() => setFormulario({ modo: 'editar', categoria: item })}
          onDelete={() => setConfirmacion({ tipo: 'baja', categoria: item })}
          onReactivate={() => setConfirmacion({ tipo: 'reactivar', categoria: item })}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltrosCategoriasBar
          nombre={nombre}
          onNombreChange={setNombre}
          estado={estado}
          onEstadoChange={setEstado}
        />
        <Button icon={<Plus />} onClick={() => setFormulario({ modo: 'crear' })}>
          Nueva categoría
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary size-8" />
        </div>
      )}

      {isError && <ErrorState onReintentar={() => refetch()} />}

      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState
          titulo="No se encontraron categorías"
          descripcion="Probá ajustar los filtros de búsqueda."
        />
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <DataTable
            data={data.data}
            columns={columnas}
            obtenerId={(item) => String(item.id_categoria)}
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

      <CategoriaForm
        open={formulario !== null}
        onClose={() => setFormulario(null)}
        categoria={formulario?.modo === 'editar' ? formulario.categoria : undefined}
        onSubmit={manejarSubmitFormulario}
        loading={crear.isPending || editar.isPending}
      />

      <CategoriaDetalleModal
        id={detalleId}
        onClose={() => setDetalleId(null)}
        onEditar={(categoria) => {
          setDetalleId(null)
          setFormulario({ modo: 'editar', categoria })
        }}
      />

      <ConfirmDialog
        open={confirmacion !== null}
        onCancel={() => setConfirmacion(null)}
        onConfirm={manejarConfirmar}
        variant={confirmacion?.tipo === 'reactivar' ? 'reactivar' : 'baja'}
        eyebrow={
          confirmacion?.tipo === 'reactivar' ? 'Confirmar reactivación' : 'Confirmar baja lógica'
        }
        title={
          confirmacion
            ? `¿${confirmacion.tipo === 'reactivar' ? 'Reactivar' : 'Dar de baja'} "${confirmacion.categoria.nombre}"?`
            : ''
        }
        details={confirmacion ? detallesConfirmacion(confirmacion.categoria) : undefined}
        note={
          confirmacion?.tipo === 'baja'
            ? 'La baja es lógica: la ficha se desactiva sin eliminar su historial'
            : undefined
        }
        loading={baja.isPending || reactivar.isPending}
      />
    </div>
  )
}

function detallesConfirmacion(categoria: Categoria) {
  return [{ label: 'Descripción', value: categoria.descripcion ?? '—' }]
}
