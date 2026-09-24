import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { FichaUnidad } from '@/features/ecommerce/components/FichaUnidad'
import { LinkButton } from '@/features/ecommerce/components/LinkButton'
import { Spinner } from '@/shared/components/ui/Spinner'
import { TIPOLOGIA_LABEL } from '@/shared/config/tipologiaUnidad.config'
import { formatearImporte } from '@/shared/utils/importe'
import { HistorialPagos } from './components/HistorialPagos'
import { PlanDePagoResumen } from './components/PlanDePagoResumen'
import { TablaCuotas } from './components/TablaCuotas'
import { MI_COMPRA_DETALLE, MIS_COMPRAS } from './config/misCompras.config'
import { useMiVentaDetalle } from './hooks/useMiVentaDetalle'

/**
 * Detalle de una compra propia (T112, HU-28): unidad, plan de pago,
 * cronograma completo de cuotas e historial de pagos paginado. Es de solo
 * lectura.
 */
export function MiCompraDetallePage() {
  const { idVenta } = useParams()
  const id = Number(idVenta)
  const { data: venta, isLoading, isError } = useMiVentaDetalle(id)

  if (isLoading) {
    return (
      <Contenedor>
        <div className="flex justify-center py-24">
          <Spinner className="text-secondary size-8" />
        </div>
      </Contenedor>
    )
  }

  // El 404 del backend cubre tres casos (no existe, no es de este cliente, no
  // está vigente): para el cliente es lo mismo, no se distingue el motivo.
  if (isError || !venta) {
    return (
      <Contenedor>
        <div className="border-light/10 flex flex-col items-center gap-3 border py-20 text-center">
          <h1 className="text-light text-titulo-modal font-bold">
            {MI_COMPRA_DETALLE.noEncontradaTitulo}
          </h1>
          <p className="text-light/60 max-w-md text-sm">
            {MI_COMPRA_DETALLE.noEncontradaDescripcion}
          </p>
          <LinkButton
            to={PATHS.ECOMMERCE.MIS_COMPRAS}
            variant="secondary"
            className="mt-4 font-mono tracking-widest uppercase"
          >
            {MIS_COMPRAS.titulo}
          </LinkButton>
        </div>
      </Contenedor>
    )
  }

  return (
    <Contenedor>
      <Link
        to={PATHS.ECOMMERCE.MIS_COMPRAS}
        className="text-light/70 hover:text-secondary focus-visible:outline-light -my-2 inline-flex items-center gap-2 rounded py-2 font-mono text-xs tracking-widest uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {MI_COMPRA_DETALLE.volver}
      </Link>

      <header className="mt-8">
        <p className="text-secondary font-mono text-xs tracking-widest uppercase">
          {venta.proyecto.nombre} · {venta.proyecto.localidad}
        </p>
        <h1 className="text-seccion text-light mt-3">
          {TIPOLOGIA_LABEL[venta.unidad.tipologia]} · {venta.unidad.identificador}
        </h1>
        <p className={venta.saldo_total_pendiente > 0 ? 'text-secondary' : 'text-success'}>
          <span className="text-light/60 mt-4 block font-mono text-xs tracking-widest uppercase">
            {venta.saldo_total_pendiente > 0
              ? MI_COMPRA_DETALLE.saldoTotalPendiente
              : MI_COMPRA_DETALLE.sinSaldoPendiente}
          </span>
          {venta.saldo_total_pendiente > 0 && (
            <span className="mt-1 block text-2xl font-bold">
              {formatearImporte(venta.saldo_total_pendiente)}
            </span>
          )}
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:items-start">
        <FichaUnidad unidad={venta.unidad} condicionEntrega={venta.condicion_entrega} />
        <PlanDePagoResumen plan={venta.plan} />
      </div>

      <div className="mt-14">
        <TablaCuotas cuotas={venta.cuotas} />
        {/*
          T116/T117 (declarar un pago sobre una cuota vencida) se engancha
          adentro de `TablaCuotas`/`FilaCuota`, junto a la cuota vencida — ver
          el comentario ahí. No hay nada visible todavía, a propósito.
        */}
      </div>

      <div className="mt-14">
        {/*
          `key={id}`: al cambiar de venta, el historial se remonta y vuelve a
          la página 1 (la página es estado propio del componente). Si solo se
          vuelve a pedir el detalle de esta misma venta, conserva su página.
        */}
        <HistorialPagos key={id} idVenta={id} />
      </div>

      {/*
        T118/T119 (historial de consultas del cliente sobre esta unidad) va
        acá, como una sección más de la página. No hay nada visible todavía,
        a propósito.
      */}
    </Contenedor>
  )
}

function Contenedor({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">{children}</div>
  )
}
