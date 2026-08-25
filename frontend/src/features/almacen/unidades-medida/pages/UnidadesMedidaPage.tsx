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
import { ToastProvider } from '@/shared/components/common/ToastProvider'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { UnidadMedidaDetalleModal } from '../components/UnidadMedidaDetalleModal'
import { UnidadMedidaForm } from '../components/UnidadMedidaForm'
import { FiltrosUnidadesMedidaBar } from '../components/FiltrosUnidadesMedidaBar'
import { COLUMNAS_UNIDADES_MEDIDA, LIMITE_PAGINA } from '../config/unidadMedida.config'
import {
  useCrearUnidadMedida,
  useDarDeBajaUnidadMedida,
  useEditarUnidadMedida,
  useReactivarUnidadMedida,
  useUnidadesMedida,
} from '../hooks/useUnidadesMedida'
import type { UnidadMedidaFormOutput } from '../types/unidadMedida.schema'
import type { UnidadMedida } from '../types/unidadMedida.types'

type EstadoFormulario = { modo: 'crear' } | { modo: 'editar'; unidadMedida: UnidadMedida } | null
type EstadoConfirmacion = { tipo: 'baja' | 'reactivar'; unidadMedida: UnidadMedida } | null

// `ToastProvider` todavía no está cableado en `main.tsx` (nadie lo usaba hasta
// esta pantalla); mientras tanto se monta acá para no bloquear el ABM. Sacar
// este wrapper cuando se agregue a nivel de app.
export function UnidadesMedidaPage() {
  return (
    <ToastProvider>
      <UnidadesMedidaPageContenido />
    </ToastProvider>
  )
}

function UnidadesMedidaPageContenido() {
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

  const { data, isLoading, isError, refetch } = useUnidadesMedida({
    nombre: nombreDebounced || undefined,
    estado: estado === '' ? undefined : estado === 'true',
    page,
    limit: LIMITE_PAGINA,
  })

  const crear = useCrearUnidadMedida()
  const editar = useEditarUnidadMedida()
  const baja = useDarDeBajaUnidadMedida()
  const reactivar = useReactivarUnidadMedida()

  function manejarSubmitFormulario(payload: UnidadMedidaFormOutput) {
    const datos = {
      nombre: payload.nombre,
      abreviatura: payload.abreviatura,
    }

    if (formulario?.modo === 'crear') {
      crear.mutate(datos, {
        onSuccess: () => {
          toast.success('Unidad de medida creada correctamente.')
          setFormulario(null)
        },
        onError: (error) => toast.error(formatearMensajeError(error.message)),
      })
      return
    }

    if (formulario?.modo === 'editar') {
      editar.mutate(
        { id: formulario.unidadMedida.id_unidad_medida, payload: datos },
        {
          onSuccess: () => {
            toast.success('Unidad de medida editada correctamente.')
            setFormulario(null)
          },
          onError: (error) => toast.error(formatearMensajeError(error.message)),
        }
      )
    }
  }

  function manejarConfirmar() {
    if (!confirmacion) return
    const { tipo, unidadMedida } = confirmacion
    const mutacion = tipo === 'baja' ? baja : reactivar
    const mensajeExito =
      tipo === 'baja'
        ? 'Unidad de medida dada de baja correctamente.'
        : 'Unidad de medida reactivada correctamente.'

    mutacion.mutate(unidadMedida.id_unidad_medida, {
      onSuccess: () => {
        toast.success(mensajeExito)
        setConfirmacion(null)
      },
      onError: (error) => toast.error(formatearMensajeError(error.message)),
    })
  }

  const columnas: DataTableColumn<UnidadMedida>[] = [
    ...COLUMNAS_UNIDADES_MEDIDA,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          isActive={item.estado}
          onView={() => setDetalleId(item.id_unidad_medida)}
          onEdit={() => setFormulario({ modo: 'editar', unidadMedida: item })}
          onDelete={() => setConfirmacion({ tipo: 'baja', unidadMedida: item })}
          onReactivate={() => setConfirmacion({ tipo: 'reactivar', unidadMedida: item })}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltrosUnidadesMedidaBar
          nombre={nombre}
          onNombreChange={setNombre}
          estado={estado}
          onEstadoChange={setEstado}
        />
        <Button icon={<Plus />} onClick={() => setFormulario({ modo: 'crear' })}>
          Nueva unidad de medida
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
          titulo="No se encontraron unidades de medida"
          descripcion="Probá ajustar los filtros de búsqueda."
        />
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <DataTable
            data={data.data}
            columns={columnas}
            obtenerId={(item) => String(item.id_unidad_medida)}
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

      <UnidadMedidaForm
        open={formulario !== null}
        onClose={() => setFormulario(null)}
        unidadMedida={formulario?.modo === 'editar' ? formulario.unidadMedida : undefined}
        onSubmit={manejarSubmitFormulario}
        loading={crear.isPending || editar.isPending}
      />

      <UnidadMedidaDetalleModal
        id={detalleId}
        onClose={() => setDetalleId(null)}
        onEditar={(unidadMedida) => {
          setDetalleId(null)
          setFormulario({ modo: 'editar', unidadMedida })
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
            ? `¿${confirmacion.tipo === 'reactivar' ? 'Reactivar' : 'Dar de baja'} "${confirmacion.unidadMedida.nombre}"?`
            : ''
        }
        details={confirmacion ? detallesConfirmacion(confirmacion.unidadMedida) : undefined}
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

function detallesConfirmacion(unidadMedida: UnidadMedida) {
  return [{ label: 'Abreviatura', value: unidadMedida.abreviatura }]
}
