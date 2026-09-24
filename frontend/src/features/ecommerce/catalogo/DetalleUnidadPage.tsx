import { ArrowLeft } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { Spinner } from '@/shared/components/ui/Spinner'
import { FichaUnidad } from '@/features/ecommerce/components/FichaUnidad'
import { LinkButton } from '@/features/ecommerce/components/LinkButton'
import { TIPOLOGIA_LABEL } from '@/shared/config/tipologiaUnidad.config'
import { formatearImporte } from '@/shared/utils/importe'
import { EnviarConsulta } from './components/EnviarConsulta'
import { GaleriaUnidad } from './components/GaleriaUnidad'
import { PlanesPagoUnidad } from './components/PlanesPagoUnidad'
import { CATALOGO, DETALLE, TARJETA } from './config/catalogo.config'
import { useDetalleUnidad } from './hooks/useDetalleUnidad'

/**
 * Detalle público de una unidad (HU-25). Es público: se ve sin sesión.
 *
 * El enlace de vuelta conserva los filtros con los que se llegó. La tarjeta del
 * catálogo los manda en el `state` de la navegación; entrando directo por URL
 * ese dato no existe y el enlace vuelve al catálogo sin filtros.
 */
export function DetalleUnidadPage() {
  const { id } = useParams()
  const location = useLocation()
  const idUnidad = Number(id)
  const { data: unidad, isLoading, isError } = useDetalleUnidad(idUnidad)

  const busquedaPrevia = (location.state as { busqueda?: string } | null)?.busqueda ?? ''
  const rutaCatalogo = busquedaPrevia
    ? `${PATHS.ECOMMERCE.CATALOGO.ROOT}?${busquedaPrevia}`
    : PATHS.ECOMMERCE.CATALOGO.ROOT

  if (isLoading) {
    return (
      <Contenedor>
        <div className="flex justify-center py-24">
          <Spinner className="text-secondary size-8" />
        </div>
      </Contenedor>
    )
  }

  // El 404 del backend cubre los dos casos: no existe, o existe pero ya no está
  // publicada o disponible. Para el visitante es lo mismo.
  if (isError || !unidad) {
    return (
      <Contenedor>
        <div className="border-light/10 flex flex-col items-center gap-3 border py-20 text-center">
          <h1 className="text-light text-titulo-modal font-bold">{DETALLE.noEncontradaTitulo}</h1>
          <p className="text-light/60 max-w-md text-sm">{DETALLE.noEncontradaDescripcion}</p>
          <LinkButton
            to={rutaCatalogo}
            variant="secondary"
            className="mt-4 font-mono tracking-widest uppercase"
          >
            {CATALOGO.etiqueta}
          </LinkButton>
        </div>
      </Contenedor>
    )
  }

  return (
    <Contenedor>
      {/* `py-2 -my-2`: área táctil de ~45px sin mover el diseño. */}
      <Link
        to={rutaCatalogo}
        className="text-light/70 hover:text-secondary focus-visible:outline-light -my-2 inline-flex items-center gap-2 rounded py-2 font-mono text-xs tracking-widest uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {DETALLE.volver}
      </Link>

      <header className="mt-8">
        <p className="text-secondary font-mono text-xs tracking-widest uppercase">
          {unidad.proyecto.nombre} · {unidad.proyecto.localidad}
        </p>
        <h1 className="text-seccion text-light mt-3">
          {TIPOLOGIA_LABEL[unidad.tipologia]}
          {unidad.piso !== null && ` · ${TARJETA.piso} ${unidad.piso}`}
        </h1>
        <p className="text-secondary mt-4 text-2xl font-bold">
          <span className="text-light/60 font-mono text-xs tracking-widest uppercase">
            {TARJETA.precioDesde}{' '}
          </span>
          {formatearImporte(unidad.precio_desde)}
        </p>
      </header>

      {/* Una columna en móvil: galería, datos, planes y consulta, en ese orden. */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <GaleriaUnidad imagenes={unidad.imagenes} identificador={unidad.identificador} />
        <FichaUnidad unidad={unidad} condicionEntrega={unidad.condicion_entrega} />
      </div>

      <div className="mt-14 flex flex-col gap-14">
        <PlanesPagoUnidad planes={unidad.planes} />
        <EnviarConsulta idUnidadFuncional={unidad.id_unidad_funcional} />
      </div>
    </Contenedor>
  )
}

function Contenedor({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">{children}</div>
  )
}
