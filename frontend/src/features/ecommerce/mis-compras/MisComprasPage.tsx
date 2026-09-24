import { PATHS } from '@/app/router/paths'
import { LinkButton } from '@/features/ecommerce/components/LinkButton'
import { Button } from '@/shared/components/ui/Button'
import { TarjetaMiCompra } from './components/TarjetaMiCompra'
import { TarjetaMiCompraSkeleton } from './components/TarjetaMiCompraSkeleton'
import { ESTADOS_MIS_COMPRAS, MIS_COMPRAS } from './config/misCompras.config'
import { useMisVentas } from './hooks/useMisVentas'

/**
 * "Mis compras" (T112, HU-28): las unidades del cliente autenticado, con
 * acceso individual al detalle de cada una. Toma el header, el pie y el fondo
 * de `SitioPublicoLayout`, mismo patrón que `CatalogoPage`.
 */
export function MisComprasPage() {
  const { data, isLoading, isError, refetch } = useMisVentas()
  const ventas = data?.data ?? []

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <p className="text-secondary font-mono text-xs tracking-widest uppercase">
        {MIS_COMPRAS.etiqueta}
      </p>
      <h1 className="text-seccion text-light mt-4">{MIS_COMPRAS.titulo}</h1>
      <p className="text-light/70 mt-4 max-w-2xl text-base">{MIS_COMPRAS.subtitulo}</p>

      {isError ? (
        <EstadoError onReintentar={() => refetch()} />
      ) : isLoading ? (
        <GrillaSkeletons />
      ) : ventas.length === 0 ? (
        <EstadoVacio />
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ventas.map((venta) => (
            <li key={venta.id_venta} className="flex">
              <TarjetaMiCompra venta={venta} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function GrillaSkeletons() {
  return (
    <ul aria-hidden="true" className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {CLAVES_SKELETON.map((clave) => (
        <li key={clave}>
          <TarjetaMiCompraSkeleton />
        </li>
      ))}
    </ul>
  )
}

function EstadoVacio() {
  return (
    <div className="border-light/10 mt-10 flex flex-col items-center gap-3 border py-16 text-center">
      <p className="text-light text-subtitulo font-bold">{ESTADOS_MIS_COMPRAS.vacioTitulo}</p>
      <p className="text-light/60 text-sm">{ESTADOS_MIS_COMPRAS.vacioDescripcion}</p>
      <LinkButton
        to={PATHS.ECOMMERCE.CATALOGO.ROOT}
        variant="secondary"
        className="mt-2 font-mono tracking-widest uppercase"
      >
        {ESTADOS_MIS_COMPRAS.irAlCatalogo}
      </LinkButton>
    </div>
  )
}

function EstadoError({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div
      role="alert"
      className="border-light/10 mt-10 flex flex-col items-center gap-3 border py-16 text-center"
    >
      <p className="text-light text-subtitulo font-bold">{ESTADOS_MIS_COMPRAS.errorTitulo}</p>
      <p className="text-light/60 text-sm">{ESTADOS_MIS_COMPRAS.errorDescripcion}</p>
      <Button variant="primary" onClick={onReintentar} className="mt-2">
        {ESTADOS_MIS_COMPRAS.reintentar}
      </Button>
    </div>
  )
}

/** Grilla completa de siluetas mientras carga. */
const CLAVES_SKELETON = ['uno', 'dos', 'tres']
