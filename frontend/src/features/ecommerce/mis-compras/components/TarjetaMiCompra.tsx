import { AlertTriangle, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { rutaMiCompraDetalle } from '@/app/router/paths'
import { TIPOLOGIA_LABEL } from '@/shared/config/tipologiaUnidad.config'
import { textoCondicionEntrega } from '@/shared/utils/condicionEntrega'
import { formatearImporte } from '@/shared/utils/importe'
import type { MiVentaResumen } from '../types/miVenta.types'
import { TARJETA_MI_COMPRA } from '../config/misCompras.config'

interface TarjetaMiCompraProps {
  venta: MiVentaResumen
}

/**
 * Una unidad comprada por el cliente. Mismo lenguaje visual que `TarjetaUnidad`
 * del catálogo (bordes rectos, línea terracota arriba, realce dorado al pasar
 * por encima), sin imagen: el endpoint de seguimiento no la trae.
 */
export function TarjetaMiCompra({ venta }: TarjetaMiCompraProps) {
  return (
    <Link
      to={rutaMiCompraDetalle(venta.id_venta)}
      className="group border-light/15 hover:border-secondary focus-visible:outline-light flex w-full flex-col border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span aria-hidden="true" className="bg-primary h-1 w-full" />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-light group-hover:text-secondary text-subtitulo font-bold transition-colors">
            {venta.proyecto.nombre}
          </h3>
          <p className="text-light/60 mt-1 flex items-center gap-2 text-sm">
            <MapPin size={14} aria-hidden="true" className="text-primary shrink-0" />
            {venta.proyecto.localidad}
          </p>
        </div>

        <p className="text-light/60 font-mono text-xs tracking-widest uppercase">
          Unidad {venta.unidad.identificador} · {TIPOLOGIA_LABEL[venta.unidad.tipologia]}
        </p>

        <p className="text-light/70 text-sm">{textoCondicionEntrega(venta.condicion_entrega)}</p>

        {venta.tiene_cuotas_vencidas && (
          <p className="border-error bg-error/25 text-error-soft flex items-center gap-2 border px-3 py-2 text-xs">
            <AlertTriangle size={14} aria-hidden="true" className="shrink-0" />
            {TARJETA_MI_COMPRA.cuotasVencidas}
          </p>
        )}

        <p className="text-secondary mt-auto pt-2 text-lg font-bold">
          <span className="text-light/60 font-mono text-xs tracking-widest uppercase">
            {TARJETA_MI_COMPRA.saldoPendiente}{' '}
          </span>
          {formatearImporte(venta.saldo_total_pendiente)}
        </p>
      </div>
    </Link>
  )
}
