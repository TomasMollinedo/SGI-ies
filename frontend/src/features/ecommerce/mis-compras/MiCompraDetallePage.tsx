import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { PATHS } from '@/app/router/paths'
import { FichaUnidad } from '@/features/ecommerce/components/FichaUnidad'
import { LinkButton } from '@/features/ecommerce/components/LinkButton'
import { useClienteAuthUser } from '@/features/ecommerce/hooks/useClienteAuthUser'
import { Spinner } from '@/shared/components/ui/Spinner'
import { TIPOLOGIA_LABEL } from '@/shared/config/tipologiaUnidad.config'
import { useToast } from '@/shared/hooks/useToast'
import { formatearImporte } from '@/shared/utils/importe'
import { DeclaracionesPago } from './components/DeclaracionesPago'
import { DeclararPagoModal } from './components/DeclararPagoModal'
import { HistorialPagos } from './components/HistorialPagos'
import { PlanDePagoResumen } from './components/PlanDePagoResumen'
import { TablaCuotas } from './components/TablaCuotas'
import type { DisponibilidadDeclaracion } from './components/TablaCuotas'
import { DECLARAR_PAGO, MI_COMPRA_DETALLE, MIS_COMPRAS } from './config/misCompras.config'
import { useFormasPagoAutogestion } from './hooks/useFormasPagoAutogestion'
import { useMiVentaDetalle } from './hooks/useMiVentaDetalle'
import type { FormaPagoAutogestion } from './types/declaracionPago.types'
import type { CuotaMiVenta } from './types/miVenta.types'
import { esVentaDeContado, puedeDeclararCuota } from './utils/cuotaDeclarable'
import { tieneDatosIncompletos } from './utils/datosCliente'

/** Referencia estable mientras el catálogo carga: el schema del modal se memoiza sobre ella. */
const SIN_FORMAS_PAGO: FormaPagoAutogestion[] = []

/**
 * Detalle de una compra propia (T112, HU-28): unidad, plan de pago,
 * cronograma completo de cuotas, pagos declarados e historial de pagos
 * paginado. Desde el cronograma (o desde una declaración rechazada) el
 * cliente puede declarar un pago sobre una cuota pendiente o parcial (T117,
 * HU-29).
 */
export function MiCompraDetallePage() {
  const { idVenta } = useParams()
  const id = Number(idVenta)
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const { data: venta, isLoading, isError } = useMiVentaDetalle(id)
  const { data: cliente } = useClienteAuthUser()
  const { data: formasPago, isSuccess: formasPagoCargadas } = useFormasPagoAutogestion()
  // Páginas propias de cada listado: no se resetean si el resto de la
  // pantalla se vuelve a pedir (ej. al volver de otra pestaña), solo si se
  // cambia de venta.
  const [paginaHistorial, setPaginaHistorial] = useState(1)
  const [paginaDeclaraciones, setPaginaDeclaraciones] = useState(1)
  // Se guarda el id y no la cuota: si el detalle se refresca con el modal
  // abierto (ej. después de un 409), el modal toma el saldo actualizado.
  const [idCuotaADeclarar, setIdCuotaADeclarar] = useState<number | null>(null)

  // La regla de contado va primero: aunque haya formas habilitadas, una venta
  // de contado se paga presencialmente y no admite declaraciones.
  const declaracion: DisponibilidadDeclaracion =
    venta && esVentaDeContado(venta)
      ? 'contado'
      : !formasPagoCargadas
        ? 'desconocida'
        : formasPago.length > 0
          ? 'disponible'
          : 'presencial'

  /**
   * Sin DNI/CUIT o teléfono el backend rechaza la declaración: se manda a
   * completarlos antes de abrir el formulario (y vuelve acá después).
   */
  function abrirDeclaracion(cuota: CuotaMiVenta) {
    if (tieneDatosIncompletos(cliente)) {
      toast.info(DECLARAR_PAGO.completarDatos)
      navigate(PATHS.ECOMMERCE.COMPLETAR_DATOS, { state: { from: location } })
      return
    }
    setIdCuotaADeclarar(cuota.id_cuota)
  }

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
        <TablaCuotas
          cuotas={venta.cuotas}
          puedeDeclarar={(cuota) => puedeDeclararCuota(cuota, venta)}
          onDeclarar={abrirDeclaracion}
          declaracion={declaracion}
        />
      </div>

      {/* Una venta de contado no admite declaraciones: la sección no tiene
        nada que mostrar (ni se pide), el aviso del cronograma ya explica por qué. */}
      {declaracion !== 'contado' && (
        <div className="mt-14">
          <DeclaracionesPago
            idVenta={id}
            page={paginaDeclaraciones}
            onPageChange={setPaginaDeclaraciones}
            puedeVolverADeclarar={(idCuota) => {
              const cuota = venta.cuotas.find((item) => item.id_cuota === idCuota)
              return declaracion === 'disponible' && !!cuota && puedeDeclararCuota(cuota, venta)
            }}
            onVolverADeclarar={(idCuota) => {
              const cuota = venta.cuotas.find((item) => item.id_cuota === idCuota)
              if (cuota) abrirDeclaracion(cuota)
            }}
          />
        </div>
      )}

      <div className="mt-14">
        <HistorialPagos idVenta={id} page={paginaHistorial} onPageChange={setPaginaHistorial} />
      </div>

      {/*
        T118/T119 (historial de consultas del cliente sobre esta unidad) va
        acá, como una sección más de la página. No hay nada visible todavía,
        a propósito.
      */}

      <DeclararPagoModal
        idVenta={id}
        cuota={venta.cuotas.find((cuota) => cuota.id_cuota === idCuotaADeclarar) ?? null}
        formasPago={formasPago ?? SIN_FORMAS_PAGO}
        onClose={() => setIdCuotaADeclarar(null)}
      />
    </Contenedor>
  )
}

function Contenedor({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">{children}</div>
  )
}
