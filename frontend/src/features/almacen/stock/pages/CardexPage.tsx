import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { finDelDiaIso, inicioDelDiaIso } from '@/features/almacen/movimiento/utils/fechaIso'
import { DataTable } from '@/shared/components/common/DataTable'
import { Pagination } from '@/shared/components/common/Pagination'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { CardexFichaResumen } from '../components/CardexFichaResumen'
import { FiltrosCardexBar } from '../components/FiltrosCardexBar'
import { COLUMNAS_CARDEX, LIMITE_PAGINA_CARDEX } from '../config/cardex.config'
import { useCardex } from '../hooks/useStock'

const FILTROS_VACIOS = { fechaDesde: '', fechaHasta: '' }

/**
 * Cardex de una ficha de stock: el historial de todos los movimientos que
 * afectaron esa combinación artículo-depósito, en orden de registro.
 *
 * Es una pantalla de solo lectura por definición de la HU: no tiene alta,
 * edición ni baja, porque el historial es inmutable. Los saldos que muestra son
 * los que el backend registró al confirmar cada movimiento; acá no se recalcula
 * ni se acumula nada.
 *
 * Se entra desde una fila del listado de Stock por Depósito, así que el id de
 * la ficha viaja por la URL y la pantalla queda enlazable y compartible.
 */
export function CardexPage() {
  const navigate = useNavigate()
  const { idStock } = useParams()

  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [page, setPage] = useState(1)

  const { fechaDesde, fechaHasta } = filtros

  // Un id que no sea un entero positivo no se le pide al backend: la URL la
  // puede editar cualquiera a mano.
  const idNumerico = Number(idStock)
  const idValido = Number.isInteger(idNumerico) && idNumerico > 0 ? idNumerico : null

  // Las dos fechas son ISO `YYYY-MM-DD`, así que alcanza con compararlas como
  // texto: no hace falta parsearlas para saber cuál es anterior.
  const rangoInvalido = fechaDesde !== '' && fechaHasta !== '' && fechaDesde > fechaHasta
  const hayFiltros = fechaDesde !== '' || fechaHasta !== ''
  // Solo cuenta el período que efectivamente se está aplicando: con un rango al
  // revés no se filtró nada, así que el stock actual sigue coincidiendo con la
  // última línea.
  const hayPeriodoAplicado = hayFiltros && !rangoInvalido

  function cambiarFiltro(campo: keyof typeof FILTROS_VACIOS, valor: string) {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }))
  }

  // Con otro período, la página en la que estaba parado el usuario puede no
  // existir más: siempre se vuelve a la primera.
  useEffect(() => {
    setPage(1)
  }, [filtros])

  const { data, isLoading, isFetching, error, refetch } = useCardex(idValido, {
    // El date picker da `YYYY-MM-DD`, pero `fecha_movimiento` lleva hora: si se
    // mandara la fecha pelada, el backend la leería como las 00:00 de ese día y
    // el "hasta" dejaría afuera todo lo que pasó durante la jornada.
    //
    // Un rango al revés no se manda: la ficha y el historial siguen en pantalla
    // mientras el usuario corrige las fechas, en vez de quedar vacíos.
    fechaDesde: rangoInvalido || fechaDesde === '' ? undefined : inicioDelDiaIso(fechaDesde),
    fechaHasta: rangoInvalido || fechaHasta === '' ? undefined : finDelDiaIso(fechaHasta),
    page,
    limit: LIMITE_PAGINA_CARDEX,
  })

  const statusCode = error?.statusCode

  // El interceptor del httpClient ya intenta renovar la sesión; si igual llega
  // un 401 es que no hay sesión recuperable.
  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  // Un 400 es del período o de la paginación: se vuelve a la primera página
  // para salir de la combinación inválida.
  useEffect(() => {
    if (statusCode === 400) setPage(1)
  }, [statusCode])

  const volverAlStock = (
    <Button
      size="sm"
      icon={<ArrowLeft />}
      onClick={() => navigate(PATHS.ALMACEN.DEPOSITO.STOCK)}
      title="Volver al listado de stock por depósito"
    >
      Volver a Stock
    </Button>
  )

  if (statusCode === 403) {
    return (
      <EmptyState
        icono={ShieldAlert}
        titulo="No tenés permisos para acceder a esta sección"
        descripcion="Se requiere el rol Responsable de Almacén."
      />
    )
  }

  if (idValido === null || statusCode === 404) {
    return (
      <div className="space-y-4">
        {volverAlStock}
        <EmptyState
          titulo="No se encontró la ficha de stock"
          descripcion="Puede haber sido eliminada, o el enlace estar mal formado."
        />
      </div>
    )
  }

  const lineas = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="space-y-4">
      {volverAlStock}

      {error && statusCode !== 401 ? (
        <ErrorState
          mensaje={
            statusCode === 400
              ? 'El período aplicado no es válido. Se reinició la paginación.'
              : formatearMensajeError(error.message)
          }
          onReintentar={() => refetch()}
        />
      ) : (
        <>
          {data && (
            <CardexFichaResumen ficha={data.ficha} hayPeriodoAplicado={hayPeriodoAplicado} />
          )}

          <FiltrosCardexBar
            fechaDesde={fechaDesde}
            onFechaDesdeChange={(valor) => cambiarFiltro('fechaDesde', valor)}
            fechaHasta={fechaHasta}
            onFechaHastaChange={(valor) => cambiarFiltro('fechaHasta', valor)}
            errorRango={
              rangoInvalido ? 'La fecha desde no puede ser posterior a la fecha hasta' : undefined
            }
            onLimpiar={() => setFiltros(FILTROS_VACIOS)}
            hayFiltros={hayFiltros}
          />

          {/* Sin resultados no se dibuja la tabla —ni sus encabezados—: queda
              solo el mensaje, igual que en el resto de los listados. */}
          {!isLoading && lineas.length === 0 && (
            <EmptyState
              titulo={
                hayPeriodoAplicado
                  ? 'No hay movimientos en el período seleccionado'
                  : 'Todavía no hay movimientos para esta ficha'
              }
              descripcion={
                hayPeriodoAplicado
                  ? 'Probá ampliar el rango de fechas o quitar el filtro.'
                  : 'Las entradas y salidas van a aparecer acá a medida que se registren.'
              }
            />
          )}

          {(isLoading || lineas.length > 0) && (
            <>
              {/* La tabla scrollea sola en pantallas angostas: son nueve
                  columnas y ninguna se puede sacar sin perder trazabilidad. */}
              <div className="overflow-x-auto">
                <DataTable
                  data={lineas}
                  columns={COLUMNAS_CARDEX}
                  obtenerId={(linea) => String(linea.id_stock_movimiento)}
                  loading={isLoading}
                  ariaLabel="Movimientos de la ficha de stock"
                />
              </div>

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
    </div>
  )
}
