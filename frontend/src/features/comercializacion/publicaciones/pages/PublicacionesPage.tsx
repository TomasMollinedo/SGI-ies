import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Megaphone, ShieldAlert } from 'lucide-react'
import { PATHS, rutaDetallePublicacion } from '@/app/router/paths'
import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFecha } from '@/shared/utils/fecha'
import { AccionesPublicacionRow } from '../components/AccionesPublicacionRow'
import { CeldaUnidad } from '../components/CeldaUnidad'
import { DespublicarPublicacionModal } from '../components/DespublicarPublicacionModal'
import type { PublicacionADespublicar } from '../components/DespublicarPublicacionModal'
import { FiltrosPublicacionesBar } from '../components/FiltrosPublicacionesBar'
import { PublicarUnidadModal } from '../components/PublicarUnidadModal'
import {
  LIMITE_PAGINA,
  VIGENCIA_POR_DEFECTO,
  badgeEstadoPublicacion,
  esEstadoComercial,
  esFiltroVigencia,
  esTipologia,
  estadoAnteriorTexto,
  vigenteDeFiltro,
} from '../config/publicacion.config'
import { usePublicaciones } from '../hooks/usePublicaciones'
import type { PublicacionListItem } from '../types/publicacion.types'

/**
 * Listado de publicaciones de Comercialización (HU-21): filtros combinables por
 * vigencia, estado comercial, proyecto y tipología; alta desde la tabla
 * emergente de unidades y despublicación desde la fila.
 *
 * Las tres columnas (Unidad, Estado, Acciones) juntan varios datos por celda
 * para que la tabla entre a 400 px sin scroll horizontal.
 */
export function PublicacionesPage() {
  const navigate = useNavigate()

  const [vigencia, setVigencia] = useState<string>(VIGENCIA_POR_DEFECTO)
  const [estado, setEstado] = useState('')
  const [proyecto, setProyecto] = useState('')
  const [tipologia, setTipologia] = useState('')
  const [page, setPage] = useState(1)
  const [publicando, setPublicando] = useState(false)
  const [despublicando, setDespublicando] = useState<PublicacionADespublicar | null>(null)

  const hayFiltros =
    vigencia !== VIGENCIA_POR_DEFECTO || estado !== '' || proyecto !== '' || tipologia !== ''

  // Con otros filtros, la página en la que estaba el usuario puede no existir más.
  useEffect(() => {
    setPage(1)
  }, [vigencia, estado, proyecto, tipologia])

  const { data, isLoading, isFetching, error, refetch } = usePublicaciones({
    vigente: esFiltroVigencia(vigencia) ? vigenteDeFiltro(vigencia) : true,
    estado_comercial: esEstadoComercial(estado) ? estado : undefined,
    FK_proyecto: proyecto === '' ? undefined : Number(proyecto),
    tipologia: esTipologia(tipologia) ? tipologia : undefined,
    page,
    limit: LIMITE_PAGINA,
  })

  const statusCode = error?.statusCode

  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  function limpiarFiltros() {
    setVigencia(VIGENCIA_POR_DEFECTO)
    setEstado('')
    setProyecto('')
    setTipologia('')
  }

  const columnas: DataTableColumn<PublicacionListItem>[] = [
    {
      key: 'unidad',
      label: 'Unidad',
      render: (item) => (
        <CeldaUnidad
          identificador={item.unidad.identificador}
          proyecto={item.proyecto.nombre}
          tipologia={item.unidad.tipologia}
        />
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (item) => (
        <div className="flex min-w-0 flex-col items-start gap-1 wrap-anywhere">
          {badgeEstadoPublicacion(item)}
          <p className="text-content-muted text-xs">
            Publicada el {formatearFecha(item.fecha_publicacion)}
          </p>
          {!item.vigente && (
            <>
              {item.fecha_despublicacion && (
                <p className="text-content-muted text-xs">
                  Despublicada el {formatearFecha(item.fecha_despublicacion)}
                </p>
              )}
              <p className="text-content-muted text-xs">
                {estadoAnteriorTexto(item.estado_comercial)}
              </p>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (item) => (
        <AccionesPublicacionRow
          publicacion={item}
          onVer={() => navigate(rutaDetallePublicacion(item.id_publicacion))}
          onDespublicar={() =>
            setDespublicando({
              id_publicacion: item.id_publicacion,
              identificador: item.unidad.identificador,
              proyecto: item.proyecto.nombre,
            })
          }
        />
      ),
    },
  ]

  if (statusCode === 403) {
    return (
      <EmptyState
        icono={ShieldAlert}
        titulo="No tenés permisos para acceder a esta sección"
        descripcion="Se requiere el rol Administrador."
      />
    )
  }

  const publicaciones = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      <FiltrosPublicacionesBar
        vigencia={vigencia}
        onVigenciaChange={setVigencia}
        estado={estado}
        onEstadoChange={setEstado}
        proyecto={proyecto}
        onProyectoChange={setProyecto}
        tipologia={tipologia}
        onTipologiaChange={setTipologia}
        onLimpiar={limpiarFiltros}
        hayFiltros={hayFiltros}
        acciones={
          <Button icon={<Megaphone />} onClick={() => setPublicando(true)}>
            Publicar unidad
          </Button>
        }
      />

      {error && statusCode !== 401 ? (
        <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={() => refetch()} />
      ) : (
        <>
          {!isLoading && publicaciones.length === 0 && (
            <EmptyState
              titulo={
                hayFiltros
                  ? 'No se encontraron publicaciones con esos filtros'
                  : 'No hay publicaciones vigentes'
              }
              descripcion={
                hayFiltros
                  ? 'Probá ajustar la vigencia, el estado, el proyecto o la tipología.'
                  : 'Publicá la primera con «Publicar unidad».'
              }
            />
          )}

          {(isLoading || publicaciones.length > 0) && (
            <>
              <DataTable
                data={publicaciones}
                columns={columnas}
                obtenerId={(item) => String(item.id_publicacion)}
                loading={isLoading}
                ariaLabel="Publicaciones"
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
        </>
      )}

      <PublicarUnidadModal
        open={publicando}
        onClose={() => setPublicando(false)}
        onPublicada={() => setPage(1)}
      />

      <DespublicarPublicacionModal
        publicacion={despublicando}
        onClose={() => setDespublicando(null)}
        onDespublicada={() => setDespublicando(null)}
      />
    </div>
  )
}
