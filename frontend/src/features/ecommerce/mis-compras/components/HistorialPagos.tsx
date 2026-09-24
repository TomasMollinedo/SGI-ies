import { useState } from 'react'
import { Pagination } from '@/shared/components/common/Pagination'
import { Spinner } from '@/shared/components/ui/Spinner'
import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { cn } from '@/shared/utils/cn'
import { HISTORIAL_PAGOS, ORIGEN_COBRO_LABEL } from '../config/misCompras.config'
import { useHistorialPagos } from '../hooks/useHistorialPagos'
import type { PagoHistorial } from '../types/miVenta.types'

const LIMITE_PAGINA = 10

interface HistorialPagosProps {
  idVenta: number
}

/**
 * Historial de pagos de UNA unidad, del más reciente al más antiguo,
 * paginado (T112, HU-28). Un cobro que imputó a cuotas de otra unidad del
 * mismo cliente aparece acá partido: `importe_imputado` es solo el subtotal
 * de esta venta, nunca el total del cobro completo.
 *
 * La página es estado propio y arranca en 1: quien lo usa lo monta con
 * `key={idVenta}`, así que al cambiar de venta se remonta en la página 1
 * antes de pedir nada — sin un pedido de más por la página vieja de la venta
 * nueva, y sin que `keepPreviousData` muestre el historial de la anterior.
 * Si solo se vuelve a pedir el detalle de la misma venta, no se remonta y la
 * página se conserva.
 */
export function HistorialPagos({ idVenta }: HistorialPagosProps) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching, isError } = useHistorialPagos(idVenta, page)
  const pagos = data?.data ?? []
  const total = data?.meta.total ?? 0
  const totalPaginas = Math.ceil(total / LIMITE_PAGINA)

  return (
    <section aria-labelledby="titulo-historial-pagos" className="flex flex-col gap-6">
      <h2 id="titulo-historial-pagos" className="text-light text-titulo-modal font-bold">
        {HISTORIAL_PAGOS.titulo}
      </h2>

      {isError ? (
        <p className="text-light/60 text-sm">{HISTORIAL_PAGOS.error}</p>
      ) : isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-secondary size-6" />
        </div>
      ) : pagos.length === 0 ? (
        <p className="text-light/60 text-sm">{HISTORIAL_PAGOS.vacio}</p>
      ) : (
        <>
          <ul className={cn('flex flex-col gap-3', isFetching && 'opacity-60')}>
            {pagos.map((pago) => (
              <li key={pago.id_cobro}>
                <FilaPago pago={pago} />
              </li>
            ))}
          </ul>

          {/*
            `Pagination` es del panel interno (fondo claro): se aclaran acá
            los textos, mismo criterio que en `CatalogoPage`. Los números de
            página no hacen falta: ya son pastillas claras con texto oscuro.
          */}
          <Pagination
            currentPage={page}
            totalPages={totalPaginas}
            totalItems={total}
            pageSize={LIMITE_PAGINA}
            onPageChange={setPage}
            disabled={isFetching}
            className="[&>p]:text-light/70 [&>p_span]:text-light [&_nav>span]:text-light/70"
          />
        </>
      )}
    </section>
  )
}

function FilaPago({ pago }: { pago: PagoHistorial }) {
  const anulado = pago.estado === 'ANULADO'

  return (
    <div
      className={cn(
        'border-light/15 flex flex-col gap-2 border p-4 sm:flex-row sm:items-center sm:justify-between',
        anulado && 'opacity-60'
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="text-light text-sm">{formatearFecha(pago.fecha_cobro)}</span>
        <span className="text-light/60 font-mono text-xs tracking-widest uppercase">
          {ORIGEN_COBRO_LABEL[pago.origen]} · {pago.forma_pago.nombre}
          {pago.numero_referencia !== null && ` · ${pago.numero_referencia}`}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {anulado && (
          <span className="border-error text-error-soft rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap">
            Anulado
          </span>
        )}
        <span
          className={cn(
            'text-sm font-semibold',
            anulado ? 'text-light/50 line-through' : 'text-light'
          )}
        >
          {formatearImporte(pago.importe_imputado)}
        </span>
      </div>
    </div>
  )
}
