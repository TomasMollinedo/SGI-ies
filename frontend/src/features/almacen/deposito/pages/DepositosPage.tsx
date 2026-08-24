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
import { DepositoDetalleModal } from '../components/DepositoDetalleModal'
import { DepositoForm } from '../components/DepositoForm'
import { FiltrosDepositosBar } from '../components/FiltrosDepositosBar'
import { COLUMNAS_DEPOSITOS, LIMITE_PAGINA } from '../config/deposito.config'
import {
  useCrearDeposito,
  useDarDeBajaDeposito,
  useDepositos,
  useEditarDeposito,
  useReactivarDeposito,
} from '../hooks/useDepositos'
import type { DepositoFormOutput } from '../types/deposito.schema'
import type { Deposito } from '../types/deposito.types'

type EstadoFormulario = { modo: 'crear' } | { modo: 'editar'; deposito: Deposito } | null
type EstadoConfirmacion = { tipo: 'baja' | 'reactivar'; deposito: Deposito } | null

export function DepositosPage() {
  const [nombre, setNombre] = useState('')
  const [estado, setEstado] = useState('')
  const [esObrador, setEsObrador] = useState('')
  const [page, setPage] = useState(1)

  const [formulario, setFormulario] = useState<EstadoFormulario>(null)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [confirmacion, setConfirmacion] = useState<EstadoConfirmacion>(null)

  const nombreDebounced = useDebounce(nombre, 300)
  const toast = useToast()

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

  const crear = useCrearDeposito()
  const editar = useEditarDeposito()
  const baja = useDarDeBajaDeposito()
  const reactivar = useReactivarDeposito()

  function manejarSubmitFormulario(payload: DepositoFormOutput) {
    const datos = {
      nombre: payload.nombre,
      es_obrador: payload.es_obrador,
      ubicacion: payload.ubicacion || undefined,
      descripcion: payload.descripcion || undefined,
    }

    const tipoTexto = datos.es_obrador ? 'Obrador' : 'Depósito'

    if (formulario?.modo === 'crear') {
      crear.mutate(datos, {
        onSuccess: () => {
          toast.success(`${tipoTexto} creado correctamente.`)
          setFormulario(null)
        },
        onError: (error) => toast.error(formatearMensajeError(error.message)),
      })
      return
    }

    if (formulario?.modo === 'editar') {
      editar.mutate(
        { id: formulario.deposito.id_deposito, payload: datos },
        {
          onSuccess: () => {
            toast.success(`${tipoTexto} editado correctamente.`)
            setFormulario(null)
          },
          onError: (error) => toast.error(formatearMensajeError(error.message)),
        }
      )
    }
  }

  function manejarConfirmar() {
    if (!confirmacion) return
    const { tipo, deposito } = confirmacion
    const mutacion = tipo === 'baja' ? baja : reactivar
    const tipoTexto = deposito.es_obrador ? 'Obrador' : 'Depósito'
    const mensajeExito =
      tipo === 'baja'
        ? `${tipoTexto} dado de baja correctamente.`
        : `${tipoTexto} reactivado correctamente.`

    mutacion.mutate(deposito.id_deposito, {
      onSuccess: () => {
        toast.success(mensajeExito)
        setConfirmacion(null)
      },
      onError: (error) => toast.error(formatearMensajeError(error.message)),
    })
  }

  const columnas: DataTableColumn<Deposito>[] = [
    ...COLUMNAS_DEPOSITOS,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          isActive={item.estado}
          onView={() => setDetalleId(item.id_deposito)}
          onEdit={() => setFormulario({ modo: 'editar', deposito: item })}
          onDelete={() => setConfirmacion({ tipo: 'baja', deposito: item })}
          onReactivate={() => setConfirmacion({ tipo: 'reactivar', deposito: item })}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltrosDepositosBar
          nombre={nombre}
          onNombreChange={setNombre}
          estado={estado}
          onEstadoChange={setEstado}
          esObrador={esObrador}
          onEsObradorChange={setEsObrador}
        />
        <Button icon={<Plus />} onClick={() => setFormulario({ modo: 'crear' })}>
          Nuevo centro
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
          titulo="No se encontraron depósitos ni obradores"
          descripcion="Probá ajustar los filtros de búsqueda."
        />
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <DataTable
            data={data.data}
            columns={columnas}
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

      <DepositoForm
        open={formulario !== null}
        onClose={() => setFormulario(null)}
        deposito={formulario?.modo === 'editar' ? formulario.deposito : undefined}
        onSubmit={manejarSubmitFormulario}
        loading={crear.isPending || editar.isPending}
      />

      <DepositoDetalleModal
        id={detalleId}
        onClose={() => setDetalleId(null)}
        onEditar={(deposito) => {
          setDetalleId(null)
          setFormulario({ modo: 'editar', deposito })
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
            ? `¿${confirmacion.tipo === 'reactivar' ? 'Reactivar' : 'Dar de baja'} "${confirmacion.deposito.nombre}"?`
            : ''
        }
        details={confirmacion ? detallesConfirmacion(confirmacion.deposito) : undefined}
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

function detallesConfirmacion(deposito: Deposito) {
  return [
    { label: 'Tipo', value: deposito.es_obrador ? 'Obrador' : 'Depósito' },
    { label: 'Ubicación', value: deposito.ubicacion ?? '—' },
    ...(deposito.FK_Proyecto ? [{ label: 'Proyecto', value: String(deposito.FK_Proyecto) }] : []),
    { label: 'Descripción', value: deposito.descripcion ?? '—' },
  ]
}
