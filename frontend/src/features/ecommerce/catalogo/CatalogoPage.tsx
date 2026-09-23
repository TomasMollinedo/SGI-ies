import { useMemo } from 'react'
import { Pagination } from '@/shared/components/common/Pagination'
import { Button } from '@/shared/components/ui/Button'
import type { SelectOption } from '@/shared/components/ui/Select'
import { useProyectosDestacados } from '@/features/ecommerce/hooks/useProyectosDestacados'
import { BarraFiltros } from './components/BarraFiltros'
import { TarjetaUnidad } from './components/TarjetaUnidad'
import { TarjetaUnidadSkeleton } from './components/TarjetaUnidadSkeleton'
import {
  CATALOGO,
  ESTADOS,
  FILTROS,
  LIMITE_PAGINA,
  OPCION_TODAS_LAS_OBRAS,
} from './config/catalogo.config'
import { useCatalogo } from './hooks/useCatalogo'
import { useFiltrosCatalogo } from './hooks/useFiltrosCatalogo'

/**
 * Catálogo público (HU-25): las unidades disponibles para la venta, filtrables
 * y paginadas. Es público, se ve sin sesión, y toma el header, el pie y el
 * fondo de `SitioPublicoLayout`.
 *
 * DEUDA: falta el filtro por rango de superficie que pide la HU. `GET /catalogo`
 * todavía no acepta mínimo ni máximo, y resolverlo en el front solo filtraría
 * la página que está a la vista (diría "3 resultados" habiendo 20). Se agrega
 * cuando el endpoint lo soporte.
 */
export function CatalogoPage() {
  const { filtros, hayFiltros, ...acciones } = useFiltrosCatalogo()
  const { data, isLoading, isError, isFetching, refetch } = useCatalogo(filtros)
  const opcionesProyecto = useOpcionesProyecto(filtros.FK_proyecto, data?.data)

  const unidades = data?.data ?? []
  const total = data?.meta.total ?? 0
  const totalPaginas = Math.ceil(total / LIMITE_PAGINA)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <p className="text-secondary font-mono text-xs tracking-widest uppercase">
        {CATALOGO.etiqueta}
      </p>
      <h1 className="text-seccion text-light mt-4">{CATALOGO.titulo}</h1>
      <p className="text-light/70 mt-4 max-w-2xl text-base">{CATALOGO.subtitulo}</p>

      <div className="border-light/10 mt-10 border-t pt-8">
        <BarraFiltros
          filtros={filtros}
          opcionesProyecto={opcionesProyecto}
          hayFiltros={hayFiltros}
          onProyecto={acciones.cambiarProyecto}
          onTipologia={acciones.cambiarTipologia}
          onEntrega={acciones.cambiarEntrega}
          onLimpiar={acciones.limpiar}
        />
      </div>

      {/*
        El contador es además el encabezado de la lista: sin él, un lector de
        pantalla saltaría del <h1> de la página a los <h3> de cada tarjeta.
      */}
      {!isLoading && !isError && (
        <h2
          aria-live="polite"
          className="text-light/60 mt-8 font-mono text-xs tracking-widest uppercase"
        >
          {CATALOGO.resultados(total)}
        </h2>
      )}

      {isError ? (
        <EstadoError onReintentar={() => refetch()} />
      ) : isLoading ? (
        <GrillaSkeletons />
      ) : unidades.length === 0 ? (
        <EstadoVacio hayFiltros={hayFiltros} onLimpiar={acciones.limpiar} />
      ) : (
        <>
          <ul
            className={`mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? 'opacity-60' : ''}`}
          >
            {unidades.map((unidad) => (
              <li key={unidad.id_unidad_funcional} className="flex">
                <TarjetaUnidad unidad={unidad} />
              </li>
            ))}
          </ul>

          {/*
            `Pagination` es del panel interno: el "Mostrando X a Y" y los puntos
            suspensivos vienen con los colores del fondo claro y sobre el fondo
            oscuro no se leen. Se los aclara acá, en vez de tocar el componente
            compartido. Los botones de página no hacen falta: ya son pastillas
            claras con texto oscuro.
          */}
          <Pagination
            currentPage={filtros.page}
            totalPages={totalPaginas}
            totalItems={total}
            pageSize={LIMITE_PAGINA}
            onPageChange={acciones.cambiarPagina}
            disabled={isFetching}
            className="mt-12 [&>p]:text-light/70 [&>p_span]:text-light [&_nav>span]:text-light/70"
          />
        </>
      )}
    </div>
  )
}

/**
 * Opciones del filtro de obra. No hay endpoint público que liste proyectos, así
 * que salen de los destacados (hasta 4, misma query que usa la landing). Si se
 * entra con el filtro de una obra que no está entre ellos —un link viejo, o una
 * obra que dejó de ser destacada— se agrega con el nombre que traen los
 * resultados, para que el desplegable no quede en blanco mostrando la grilla
 * filtrada.
 */
function useOpcionesProyecto(
  seleccionado: number | undefined,
  unidades: { proyecto: { nombre: string } }[] | undefined
) {
  const { data } = useProyectosDestacados()

  return useMemo<SelectOption[]>(() => {
    const destacados = data?.data ?? []
    const opciones: SelectOption[] = destacados.map((proyecto) => ({
      value: String(proyecto.id_proyecto),
      label: proyecto.nombre,
    }))

    const falta =
      seleccionado !== undefined && !opciones.some((o) => o.value === String(seleccionado))

    if (falta && unidades && unidades.length > 0) {
      opciones.push({ value: String(seleccionado), label: unidades[0].proyecto.nombre })
    }

    return [OPCION_TODAS_LAS_OBRAS, ...opciones]
  }, [data, seleccionado, unidades])
}

function GrillaSkeletons() {
  return (
    <ul aria-hidden="true" className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {CLAVES_SKELETON.map((clave) => (
        <li key={clave}>
          <TarjetaUnidadSkeleton />
        </li>
      ))}
    </ul>
  )
}

function EstadoVacio({ hayFiltros, onLimpiar }: { hayFiltros: boolean; onLimpiar: () => void }) {
  return (
    <div className="border-light/10 mt-6 flex flex-col items-center gap-3 border py-16 text-center">
      <p className="text-light text-subtitulo font-bold">{ESTADOS.vacioTitulo}</p>
      <p className="text-light/60 text-sm">{ESTADOS.vacioDescripcion}</p>
      {hayFiltros && (
        <Button variant="primary" onClick={onLimpiar} className="mt-2">
          {FILTROS.limpiar}
        </Button>
      )}
    </div>
  )
}

function EstadoError({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div
      role="alert"
      className="border-light/10 mt-6 flex flex-col items-center gap-3 border py-16 text-center"
    >
      <p className="text-light text-subtitulo font-bold">{ESTADOS.errorTitulo}</p>
      <p className="text-light/60 text-sm">{ESTADOS.errorDescripcion}</p>
      <Button variant="primary" onClick={onReintentar} className="mt-2">
        {ESTADOS.reintentar}
      </Button>
    </div>
  )
}

/** El endpoint trae 12 por página: se dibuja una grilla completa de siluetas. */
const CLAVES_SKELETON = Array.from({ length: LIMITE_PAGINA }, (_, indice) => `skeleton-${indice}`)
