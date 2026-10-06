import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Pagination } from '@/shared/components/common/Pagination'
import { Spinner } from '@/shared/components/ui/Spinner'
import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { cn } from '@/shared/utils/cn'
import { DECLARACIONES_PAGO, DECLARAR_PAGO } from '../config/misCompras.config'
import { LIMITE_PAGINA_DECLARACIONES, useDeclaracionesPago } from '../hooks/useDeclaracionesPago'
import type { DeclaracionPagoCliente } from '../types/declaracionPago.types'
import { etiquetaCuota } from '../utils/cuotaDeclarable'
import { EstadoDeclaracionPill } from './EstadoDeclaracionPill'

interface DeclaracionesPagoProps {
  idVenta: number
  page: number
  onPageChange: (page: number) => void
  /**
   * Si desde una declaración rechazada se puede volver a declarar sobre su
   * cuota: la decide la página, que conoce el estado actual de la cuota y si
   * hay formas de pago habilitadas.
   */
  puedeVolverADeclarar: (idCuota: number) => boolean
  onVolverADeclarar: (idCuota: number) => void
}

/**
 * Pagos que el cliente declaró sobre esta unidad (T117, HU-29), de la más
 * reciente a la más antigua, paginados. Una validada ya figura como pago en
 * `HistorialPagos`: acá solo se marca como validada, sin presentarla como un
 * segundo pago (importe atenuado, sin énfasis).
 */
export function DeclaracionesPago({
  idVenta,
  page,
  onPageChange,
  puedeVolverADeclarar,
  onVolverADeclarar,
}: DeclaracionesPagoProps) {
  const { data, isLoading, isFetching, isError } = useDeclaracionesPago(idVenta, page)
  const declaraciones = data?.data ?? []
  const total = data?.meta.total ?? 0
  const totalPaginas = Math.ceil(total / LIMITE_PAGINA_DECLARACIONES)

  return (
    <section aria-labelledby="titulo-declaraciones-pago" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="titulo-declaraciones-pago" className="text-light text-titulo-modal font-bold">
          {DECLARACIONES_PAGO.titulo}
        </h2>
        <p className="text-light/60 text-sm">{DECLARACIONES_PAGO.descripcion}</p>
      </div>

      {isError ? (
        <p className="text-light/60 text-sm">{DECLARACIONES_PAGO.error}</p>
      ) : isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-secondary size-6" />
        </div>
      ) : declaraciones.length === 0 ? (
        <p className="text-light/60 text-sm">{DECLARACIONES_PAGO.vacio}</p>
      ) : (
        <>
          <ul className={cn('flex flex-col gap-3', isFetching && 'opacity-60')}>
            {declaraciones.map((declaracion) => (
              <li key={declaracion.id_declaracion_pago}>
                <FilaDeclaracion
                  declaracion={declaracion}
                  onVolverADeclarar={
                    declaracion.estado === 'RECHAZADA' &&
                    puedeVolverADeclarar(declaracion.cuota.id_cuota)
                      ? () => onVolverADeclarar(declaracion.cuota.id_cuota)
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>

          {/* Mismo ajuste de colores que `HistorialPagos`: `Pagination` es del panel interno. */}
          <Pagination
            currentPage={page}
            totalPages={totalPaginas}
            totalItems={total}
            pageSize={LIMITE_PAGINA_DECLARACIONES}
            onPageChange={onPageChange}
            disabled={isFetching}
            className="[&>p]:text-light/70 [&>p_span]:text-light [&_nav>span]:text-light/70"
          />
        </>
      )}
    </section>
  )
}

interface FilaDeclaracionProps {
  declaracion: DeclaracionPagoCliente
  /** Sin handler, la declaración no ofrece volver a declarar. */
  onVolverADeclarar?: () => void
}

function FilaDeclaracion({ declaracion, onVolverADeclarar }: FilaDeclaracionProps) {
  const { estado, cobro } = declaracion
  const validada = estado === 'VALIDADA'
  const cobroAnulado = cobro?.estado === 'ANULADO'

  return (
    <div className="border-light/15 flex flex-col gap-3 border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-light/60 font-mono text-xs tracking-widest uppercase">
            {etiquetaCuota(declaracion.cuota.numero)} · {declaracion.forma_pago.nombre}
          </span>
          {declaracion.numero_referencia !== null && (
            <span className="text-light text-sm break-all">
              {DECLARACIONES_PAGO.referencia} {declaracion.numero_referencia}
            </span>
          )}
          <span className="text-light/60 text-xs">
            {DECLARACIONES_PAGO.declaradoEl} {formatearFecha(declaracion.hora_creacion)}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
          <EstadoDeclaracionPill estado={estado} />
          <span
            className={cn(
              'text-sm',
              validada || estado === 'RECHAZADA'
                ? 'text-light/50 font-normal'
                : 'text-light font-semibold'
            )}
          >
            {formatearImporte(declaracion.importe)}
          </span>
        </div>
      </div>

      {estado === 'PENDIENTE' && (
        <p className="text-light/60 text-xs">{DECLARACIONES_PAGO.pendiente}</p>
      )}

      {validada && !cobroAnulado && (
        <p className="text-light/60 text-xs">{DECLARACIONES_PAGO.validada}</p>
      )}

      {validada && cobroAnulado && (
        <p className="text-error-soft flex items-start gap-1.5 text-xs font-semibold">
          <AlertTriangle size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
          {DECLARACIONES_PAGO.cobroAnulado}
        </p>
      )}

      {estado === 'RECHAZADA' && (
        <div className="border-error/40 flex flex-col gap-1 border-l-2 pl-3">
          <span className="text-light/60 font-mono text-xs tracking-widest uppercase">
            {DECLARACIONES_PAGO.motivoRechazo}
          </span>
          <p className="text-light text-sm break-words">{declaracion.motivo_rechazo}</p>
        </div>
      )}

      {onVolverADeclarar && (
        <button
          type="button"
          onClick={onVolverADeclarar}
          className="text-secondary hover:text-light focus-visible:outline-light inline-flex w-fit items-center gap-2 rounded py-1 font-mono text-xs tracking-widest uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <RotateCcw size={14} aria-hidden="true" className="shrink-0" />
          {DECLARAR_PAGO.volverADeclarar}
          <span className="sr-only"> — {etiquetaCuota(declaracion.cuota.numero)}</span>
        </button>
      )}
    </div>
  )
}
