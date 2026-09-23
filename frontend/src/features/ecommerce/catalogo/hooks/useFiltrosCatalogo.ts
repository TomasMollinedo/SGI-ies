import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { esTipologia } from '@/shared/config/tipologiaUnidad.config'
import type { FiltrosCatalogo } from '@/features/ecommerce/types/catalogoPublico.types'
import { LIMITE_PAGINA } from '../config/catalogo.config'

/** Nombres de los parámetros en la URL. Son los mismos que acepta el endpoint. */
const PARAMS = {
  PROYECTO: 'FK_proyecto',
  TIPOLOGIA: 'tipologia',
  ENTREGADA: 'entregada',
  PAGINA: 'page',
} as const

/**
 * Los filtros y la página viven en la URL, no en un estado interno: así el
 * link se puede compartir, recargar y volver atrás, y el deep-link de la
 * landing (`/catalogo?FK_proyecto=3`) funciona sin ningún caso especial.
 *
 * Todo lo que llega por la URL se valida antes de mandarlo al backend: un
 * `?tipologia=cualquier-cosa` escrito a mano se ignora en vez de viajar.
 */
export function useFiltrosCatalogo() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filtros = useMemo<FiltrosCatalogo>(() => {
    const proyecto = Number(searchParams.get(PARAMS.PROYECTO))
    const tipologia = searchParams.get(PARAMS.TIPOLOGIA) ?? ''
    const entregada = searchParams.get(PARAMS.ENTREGADA)
    const pagina = Number(searchParams.get(PARAMS.PAGINA))

    return {
      FK_proyecto: Number.isInteger(proyecto) && proyecto > 0 ? proyecto : undefined,
      tipologia: esTipologia(tipologia) ? tipologia : undefined,
      entregada: entregada === 'true' ? true : entregada === 'false' ? false : undefined,
      page: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
      limit: LIMITE_PAGINA,
    }
  }, [searchParams])

  /**
   * Cambiar cualquier filtro vuelve a la página 1: si estabas en la página 3 y
   * el nuevo filtro deja una sola página, la 3 no existiría.
   */
  const cambiarFiltro = useCallback(
    (parametro: string, valor: string) => {
      setSearchParams(
        (previos) => {
          const siguientes = new URLSearchParams(previos)
          if (valor) siguientes.set(parametro, valor)
          else siguientes.delete(parametro)
          siguientes.delete(PARAMS.PAGINA)
          return siguientes
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const cambiarPagina = useCallback(
    (pagina: number) => {
      setSearchParams(
        (previos) => {
          const siguientes = new URLSearchParams(previos)
          if (pagina > 1) siguientes.set(PARAMS.PAGINA, String(pagina))
          else siguientes.delete(PARAMS.PAGINA)
          return siguientes
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const limpiar = useCallback(() => setSearchParams({}, { replace: true }), [setSearchParams])

  const hayFiltros =
    filtros.FK_proyecto !== undefined ||
    filtros.tipologia !== undefined ||
    filtros.entregada !== undefined

  return {
    filtros,
    hayFiltros,
    /** Query string actual, para volver al catálogo desde el detalle con los mismos filtros. */
    busqueda: searchParams.toString(),
    cambiarProyecto: (valor: string) => cambiarFiltro(PARAMS.PROYECTO, valor),
    cambiarTipologia: (valor: string) => cambiarFiltro(PARAMS.TIPOLOGIA, valor),
    cambiarEntrega: (valor: string) => cambiarFiltro(PARAMS.ENTREGADA, valor),
    cambiarPagina,
    limpiar,
  }
}
