import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, ShieldAlert } from 'lucide-react'
import { formatearMoneda } from '@/features/compras/ordenes-compra/utils/formatearMoneda'
import { useProyectoDetalle } from '@/features/proyectos/hooks/useProyectos'
import { PATHS, rutaDetalleUnidadFuncional, rutaEditarUnidadFuncional } from '@/app/router/paths'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import type { RowAction } from '@/shared/components/common/RowActions'
import { RowActions } from '@/shared/components/common/RowActions'
import { StatTile } from '@/shared/components/common/StatTile'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { FiltrosUnidadesFuncionalesBar } from '../components/FiltrosUnidadesFuncionalesBar'
import { LIMITE_PAGINA, crearColumnasUnidadesFuncionales } from '../config/unidadFuncional.config'
import {
  useDarDeBajaUnidadFuncional,
  useReactivarUnidadFuncional,
  useTipologias,
  useUnidadesFuncionales,
} from '../hooks/useUnidadesFuncionales'
import type { FiltroEstado, Tipologia, UnidadFuncionalListItem } from '../types/unidadFuncional.types'

type TipoConfirmacion = 'baja' | 'reactivar'
type EstadoConfirmacion = { tipo: TipoConfirmacion; unidad: UnidadFuncionalListItem } | null

export function UnidadesFuncionalesPage() {
  const toast = useToast()
  const navigate = useNavigate()

  const [proyectoId, setProyectoId] = useState('')
  const [tipologia, setTipologia] = useState('')
  const [superficieMin, setSuperficieMin] = useState('')
  const [superficieMax, setSuperficieMax] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('true')
  const [page, setPage] = useState(1)
  const [confirmacion, setConfirmacion] = useState<EstadoConfirmacion>(null)
  const [errorConfirmacion, setErrorConfirmacion] = useState<ApiErrorResponse | null>(null)

  // Con otro filtro, la página en la que estaba parado el usuario puede no existir más.
  useEffect(() => {
    setPage(1)
  }, [proyectoId, tipologia, superficieMin, superficieMax, estado])

  const { data, isLoading, isFetching, error, refetch } = useUnidadesFuncionales({
    FK_proyecto: proyectoId ? Number(proyectoId) : undefined,
    tipologia: (tipologia || undefined) as Tipologia | undefined,
    superficie_min: superficieMin ? Number(superficieMin) : undefined,
    superficie_max: superficieMax ? Number(superficieMax) : undefined,
    estado,
    page,
    limit: LIMITE_PAGINA,
  })

  const statusCode = error?.statusCode

  // El interceptor del httpClient ya intenta renovar la sesión; si igual llega un 401 no hay sesión recuperable.
  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  // Un 400 es de los filtros o de la paginación: se vuelve a la primera página para salir de la combinación inválida.
  useEffect(() => {
    if (statusCode === 400) setPage(1)
  }, [statusCode])

  // Una baja puede sacar de la página actual a la última fila que quedaba (ej. filtro en "Activas"): se retrocede una página.
  useEffect(() => {
    if (isFetching || !data) return
    if (data.data.length === 0 && data.meta.page > 1) setPage(data.meta.page - 1)
  }, [isFetching, data])

  // Presupuesto y unidades cargadas/planificadas del proyecto elegido en el
  // filtro: lo calcula el backend (GET /proyectos/:id), acá solo se muestra.
  const { data: proyecto } = useProyectoDetalle(proyectoId ? Number(proyectoId) : null)

  const { data: tipologias } = useTipologias()
  const etiquetasTipologia = new Map(tipologias?.map((item) => [item.id, item.code]))

  const baja = useDarDeBajaUnidadFuncional()
  const reactivar = useReactivarUnidadFuncional()
  const operacionEnCurso = baja.isPending || reactivar.isPending

  /** Mientras la operación corre, el botón que la disparó queda bloqueado con su spinner. */
  function accionEnCurso(unidad: UnidadFuncionalListItem): RowAction | undefined {
    if (!confirmacion || !operacionEnCurso) return undefined
    if (confirmacion.unidad.id_unidad_funcional !== unidad.id_unidad_funcional) return undefined
    return confirmacion.tipo === 'baja' ? 'delete' : 'reactivate'
  }

  const columnas: DataTableColumn<UnidadFuncionalListItem>[] = [
    ...crearColumnasUnidadesFuncionales((id) => etiquetasTipologia.get(id as Tipologia) ?? id),
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          isActive={item.estado}
          loadingAction={accionEnCurso(item)}
          onView={() => navigate(rutaDetalleUnidadFuncional(item.id_unidad_funcional))}
          onEdit={() => navigate(rutaEditarUnidadFuncional(item.id_unidad_funcional))}
          onDelete={() => abrirConfirmacion({ tipo: 'baja', unidad: item })}
          onReactivate={() => abrirConfirmacion({ tipo: 'reactivar', unidad: item })}
        />
      ),
    },
  ]

  function abrirConfirmacion(estadoInicial: EstadoConfirmacion) {
    setErrorConfirmacion(null)
    setConfirmacion(estadoInicial)
  }

  function cerrarConfirmacion() {
    setConfirmacion(null)
    setErrorConfirmacion(null)
  }

  function ejecutarConfirmacion() {
    if (!confirmacion) return

    const { tipo, unidad } = confirmacion
    const mutacion = tipo === 'baja' ? baja : reactivar

    setErrorConfirmacion(null)
    mutacion.mutate(unidad.id_unidad_funcional, {
      onSuccess: () => {
        toast.success(
          tipo === 'baja' ? 'Unidad dada de baja correctamente' : 'Unidad reactivada correctamente'
        )
        cerrarConfirmacion()
      },
      onError: (error) => {
        if (error.statusCode === 401) {
          navigate(PATHS.LOGIN, { replace: true })
          return
        }
        if (error.statusCode === 403) {
          toast.error('No tenés permisos para realizar esta acción')
          cerrarConfirmacion()
          return
        }
        if (error.statusCode === 404) {
          toast.error('La unidad ya no existe')
          cerrarConfirmacion()
          refetch()
          return
        }
        // 409: acá vienen los dos motivos de rechazo de la baja (publicación
        // vigente / proyecto en ejecución o finalizado). Se muestran DENTRO
        // del diálogo, que queda abierto para que el usuario los lea.
        setErrorConfirmacion(error)
      },
    })
  }

  if (statusCode === 403) {
    return (
      <EmptyState
        icono={ShieldAlert}
        titulo="No tenés permisos para acceder a esta sección"
        descripcion="Se requiere el rol Administrador."
      />
    )
  }

  const unidades = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <FiltrosUnidadesFuncionalesBar
        proyectoId={proyectoId}
        onProyectoIdChange={setProyectoId}
        tipologia={tipologia}
        onTipologiaChange={setTipologia}
        superficieMin={superficieMin}
        onSuperficieMinChange={setSuperficieMin}
        superficieMax={superficieMax}
        onSuperficieMaxChange={setSuperficieMax}
        estado={estado}
        onEstadoChange={setEstado}
        acciones={
          <Button icon={<Plus />} onClick={() => navigate(PATHS.PROYECTOS.UNIDADES_FUNCIONALES_NUEVA)}>
            Nueva Unidad Funcional
          </Button>
        }
      />

      {proyecto && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatTile label="Presupuesto del proyecto" value={formatearMoneda(proyecto.presupuesto)} />
          <StatTile
            label="Unidades cargadas / planificadas"
            value={`${proyecto.unidades_cargadas} / ${proyecto.cantidad_unidades_planificadas ?? '—'}`}
          />
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary size-8" />
        </div>
      )}

      {error && statusCode !== 401 && (
        <ErrorState
          mensaje={
            statusCode === 400
              ? 'Los filtros aplicados no son válidos. Se reinició la paginación.'
              : formatearMensajeError(error.message)
          }
          onReintentar={() => refetch()}
        />
      )}

      {!isLoading && !error && unidades.length === 0 && (
        <EmptyState
          titulo="No se encontraron unidades funcionales"
          descripcion="Probá ajustar los filtros de búsqueda."
        />
      )}

      {!isLoading && !error && unidades.length > 0 && (
        <>
          <DataTable
            data={unidades}
            columns={columnas}
            obtenerId={(item) => String(item.id_unidad_funcional)}
            ariaLabel="Unidades funcionales"
          />

          {meta && (
            <Pagination
              currentPage={meta.page}
              totalPages={totalPaginas}
              totalItems={meta.total}
              pageSize={meta.limit}
              onPageChange={setPage}
              disabled={isFetching}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmacion !== null}
        onCancel={cerrarConfirmacion}
        onConfirm={ejecutarConfirmacion}
        variant={confirmacion?.tipo === 'baja' ? 'baja' : 'reactivar'}
        eyebrow={confirmacion?.tipo === 'baja' ? 'Dar de baja unidad funcional' : 'Reactivar unidad funcional'}
        title={
          confirmacion
            ? `¿Confirmás que querés ${confirmacion.tipo === 'baja' ? 'dar de baja la' : 'reactivar la'} unidad «${confirmacion.unidad.identificador}»?`
            : ''
        }
        details={
          confirmacion
            ? [
                { label: 'Proyecto', value: confirmacion.unidad.proyecto.nombre },
                { label: 'Identificador', value: confirmacion.unidad.identificador },
              ]
            : undefined
        }
        note={
          confirmacion?.tipo === 'baja' && !errorConfirmacion
            ? 'La baja es lógica: la unidad se desactiva sin eliminar su historial. No se permite si tiene una publicación vigente en el ecommerce, o si el proyecto no está En planificación.'
            : undefined
        }
        error={errorConfirmacion ? formatearMensajeError(errorConfirmacion.message) : null}
        hideConfirm={Boolean(errorConfirmacion)}
        cancelLabel={errorConfirmacion ? 'Cerrar' : 'Cancelar'}
        confirmLabel={confirmacion?.tipo === 'baja' ? 'Dar de baja' : 'Reactivar'}
        loading={operacionEnCurso}
      />
    </div>
  )
}
