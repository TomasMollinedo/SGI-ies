import { useNavigate } from 'react-router'
import { Eye } from 'lucide-react'
import { rutaDetalleCobro } from '@/app/router/paths'
import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { IconButton } from '@/shared/components/ui/IconButton'
import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import {
  badgeEstadoCobro,
  ORIGEN_COBRO_LABEL,
} from '@/features/tesoreria/cobranzas/config/cobro.config'
import { SIN_DATO } from '../config/cliente.config'
import type { CobroFicha } from '../types/cliente.types'
import { SeccionFicha, SeccionVacia } from './SeccionFicha'

/**
 * Sección (c) de la ficha: los cobros recibidos, presenciales (HU-30) y del
 * ecommerce (HU-29).
 *
 * Cada fila enlaza al detalle del cobro, donde se ven las cuotas que imputó:
 * la ficha no lo repite. Desde acá no se registran cobros.
 */
export function ClienteCobrosSection({ cobros }: { cobros: CobroFicha[] }) {
  const navigate = useNavigate()

  const columnas: DataTableColumn<CobroFicha>[] = [
    { key: 'fecha', label: 'Fecha', render: (cobro) => formatearFecha(cobro.fecha_cobro) },
    {
      key: 'recibo',
      label: 'Recibo',
      headerTooltip: 'Número de recibo del cobro',
      render: (cobro) => `#${cobro.id_cobro}`,
    },
    {
      key: 'importe',
      label: 'Importe',
      render: (cobro) => (
        <p className="text-content text-xs font-medium">{formatearImporte(cobro.importe_total)}</p>
      ),
    },
    { key: 'origen', label: 'Origen', render: (cobro) => ORIGEN_COBRO_LABEL[cobro.origen] },
    { key: 'formaPago', label: 'Forma de pago', render: (cobro) => cobro.forma_pago.nombre },
    {
      key: 'referencia',
      label: 'Nº de referencia',
      render: (cobro) => cobro.numero_referencia ?? SIN_DATO,
    },
    { key: 'estado', label: 'Estado', render: (cobro) => badgeEstadoCobro(cobro.estado) },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (cobro) => (
        <IconButton
          icon={<Eye />}
          ariaLabel={`Ver el detalle del cobro #${cobro.id_cobro}`}
          title="Ver detalle del cobro"
          variant="soft"
          size="sm"
          bgColor="fondo-ver"
          iconColor="info"
          onClick={() => navigate(rutaDetalleCobro(cobro.id_cobro))}
        />
      ),
    },
  ]

  return (
    <SeccionFicha titulo="Cobros recibidos">
      {cobros.length === 0 ? (
        <SeccionVacia texto="Todavía no se le registró ningún cobro a este cliente." />
      ) : (
        <DataTable
          data={cobros}
          columns={columnas}
          obtenerId={(cobro) => String(cobro.id_cobro)}
          ariaLabel="Cobros del cliente"
        />
      )}
    </SeccionFicha>
  )
}
