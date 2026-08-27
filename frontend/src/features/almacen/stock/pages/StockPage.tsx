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
import { CrearStockForm } from '../components/CrearStockForm'
import { EditarStockForm } from '../components/EditarStockForm'
import { FiltrosStockBar } from '../components/FiltrosStockBar'
import { StockDetalleModal } from '../components/StockDetalleModal'
import { COLUMNAS_STOCK, LIMITE_PAGINA } from '../config/stock.config'
import {
  useCrearStock,
  useDarDeBajaStock,
  useEditarStock,
  useReactivarStock,
  useStock,
} from '../hooks/useStock'
import type { CrearStockFormOutput, EditarStockFormOutput } from '../types/stock.schema'
import type { Stock } from '../types/stock.types'

type EstadoFormulario = { modo: 'crear' } | { modo: 'editar'; stock: Stock } | null
type EstadoConfirmacion = { tipo: 'baja' | 'reactivar'; stock: Stock } | null

export function StockPage() {
  const [nombreArticulo, setNombreArticulo] = useState('')
  const [FK_deposito, setFKDeposito] = useState('')
  const [esObrador, setEsObrador] = useState('')
  const [FK_Categoria, setFKCategoria] = useState('')
  const [estado, setEstado] = useState('true')
  const [page, setPage] = useState(1)

  const [formulario, setFormulario] = useState<EstadoFormulario>(null)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [confirmacion, setConfirmacion] = useState<EstadoConfirmacion>(null)

  const nombreArticuloDebounced = useDebounce(nombreArticulo, 300)
  const toast = useToast()

  useEffect(() => {
    setPage(1)
  }, [nombreArticuloDebounced, FK_deposito, esObrador, FK_Categoria, estado])

  const { data, isLoading, isError, refetch } = useStock({
    nombreArticulo: nombreArticuloDebounced || undefined,
    FK_deposito: FK_deposito === '' ? undefined : Number(FK_deposito),
    esObrador: esObrador === '' ? undefined : esObrador === 'true',
    FK_Categoria: FK_Categoria === '' ? undefined : Number(FK_Categoria),
    estado: estado === '' ? undefined : estado === 'true',
    page,
    limit: LIMITE_PAGINA,
  })

  const crear = useCrearStock()
  const editar = useEditarStock()
  const baja = useDarDeBajaStock()
  const reactivar = useReactivarStock()

  function manejarSubmitCrear(payload: CrearStockFormOutput) {
    crear.mutate(
      {
        FK_articulo: payload.FK_articulo,
        FK_deposito: payload.FK_deposito,
        umbral_minimo: payload.umbral_minimo,
        observaciones: payload.observaciones || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Ficha de stock creada correctamente.')
          setFormulario(null)
        },
        onError: (error) => toast.error(formatearMensajeError(error.message)),
      }
    )
  }

  function manejarSubmitEditar(payload: EditarStockFormOutput) {
    if (formulario?.modo !== 'editar') return

    editar.mutate(
      {
        id: formulario.stock.id_stock,
        payload: {
          umbral_minimo: payload.umbral_minimo,
          observaciones: payload.observaciones,
        },
      },
      {
        onSuccess: () => {
          toast.success('Ficha de stock editada correctamente.')
          setFormulario(null)
        },
        onError: (error) => toast.error(formatearMensajeError(error.message)),
      }
    )
  }

  function manejarConfirmar() {
    if (!confirmacion) return
    const { tipo, stock } = confirmacion
    const mutacion = tipo === 'baja' ? baja : reactivar
    const mensajeExito =
      tipo === 'baja'
        ? 'Ficha de stock dada de baja correctamente.'
        : 'Ficha de stock reactivada correctamente.'

    mutacion.mutate(stock.id_stock, {
      onSuccess: () => {
        toast.success(mensajeExito)
        setConfirmacion(null)
      },
      onError: (error) => toast.error(formatearMensajeError(error.message)),
    })
  }

  const columnas: DataTableColumn<Stock>[] = [
    ...COLUMNAS_STOCK,
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          isActive={item.estado}
          onView={() => setDetalleId(item.id_stock)}
          onEdit={() => setFormulario({ modo: 'editar', stock: item })}
          onDelete={() => setConfirmacion({ tipo: 'baja', stock: item })}
          onReactivate={() => setConfirmacion({ tipo: 'reactivar', stock: item })}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltrosStockBar
          nombreArticulo={nombreArticulo}
          onNombreArticuloChange={setNombreArticulo}
          FK_deposito={FK_deposito}
          onFKDepositoChange={setFKDeposito}
          esObrador={esObrador}
          onEsObradorChange={setEsObrador}
          FK_Categoria={FK_Categoria}
          onFKCategoriaChange={setFKCategoria}
          estado={estado}
          onEstadoChange={setEstado}
        />
        <Button icon={<Plus />} onClick={() => setFormulario({ modo: 'crear' })}>
          Nueva ficha
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
          titulo="No se encontraron fichas de stock"
          descripcion="Probá ajustar los filtros de búsqueda."
        />
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <DataTable
            data={data.data}
            columns={columnas}
            obtenerId={(item) => String(item.id_stock)}
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

      <CrearStockForm
        open={formulario?.modo === 'crear'}
        onClose={() => setFormulario(null)}
        onSubmit={manejarSubmitCrear}
        loading={crear.isPending}
      />

      <EditarStockForm
        open={formulario?.modo === 'editar'}
        onClose={() => setFormulario(null)}
        stock={formulario?.modo === 'editar' ? formulario.stock : undefined}
        onSubmit={manejarSubmitEditar}
        loading={editar.isPending}
      />

      <StockDetalleModal
        id={detalleId}
        onClose={() => setDetalleId(null)}
        onEditar={(stock) => {
          setDetalleId(null)
          setFormulario({ modo: 'editar', stock })
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
            ? `¿${confirmacion.tipo === 'reactivar' ? 'Reactivar' : 'Dar de baja'} la ficha de "${confirmacion.stock.articulo.nombre}"?`
            : ''
        }
        details={confirmacion ? detallesConfirmacion(confirmacion.stock) : undefined}
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

function detallesConfirmacion(stock: Stock) {
  return [
    { label: 'Depósito', value: stock.deposito.nombre },
    { label: 'Cantidad actual', value: String(stock.cantidad) },
  ]
}
