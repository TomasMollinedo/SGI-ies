import { useNavigate } from 'react-router'
import { Eye } from 'lucide-react'
import { rutaDetalleVenta } from '@/app/router/paths'
import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { IconButton } from '@/shared/components/ui/IconButton'
import { TIPOLOGIA_LABEL } from '@/shared/config/tipologiaUnidad.config'
import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { badgeEstadoVenta } from '@/features/comercializacion/ventas/config/venta.config'
import { TIPO_PLAN_LABEL } from '@/features/comercializacion/planes-pago/config/planPago.config'
import { SIN_DATO } from '../config/cliente.config'
import type { VentaFicha } from '../types/cliente.types'
import { SeccionFicha, SeccionVacia } from './SeccionFicha'

/**
 * Sección (b) de la ficha: las ventas del cliente, vigentes y canceladas.
 *
 * Cada fila enlaza al detalle de la venta, donde ya se ven el plan de pago
 * completo y el cronograma de cuotas: la ficha da acceso, no los duplica.
 * Desde acá no se registran ni se cancelan ventas — eso vive en la pantalla de
 * ventas.
 */
export function ClienteVentasSection({ ventas }: { ventas: VentaFicha[] }) {
  const navigate = useNavigate()

  const columnas: DataTableColumn<VentaFicha>[] = [
    { key: 'fecha', label: 'Fecha', render: (venta) => formatearFecha(venta.fecha_venta) },
    {
      key: 'unidad',
      label: 'Unidad',
      render: (venta) => (
        <div className="min-w-0">
          <p className="text-content font-medium wrap-anywhere">{venta.unidad.identificador}</p>
          <p className="text-content-muted text-xs">{TIPOLOGIA_LABEL[venta.unidad.tipologia]}</p>
        </div>
      ),
    },
    {
      key: 'proyecto',
      label: 'Proyecto',
      render: (venta) => (
        <div className="min-w-0">
          <p className="text-content wrap-anywhere">{venta.proyecto.nombre}</p>
          <p className="text-content-muted text-xs">{venta.proyecto.codigo}</p>
        </div>
      ),
    },
    {
      key: 'modalidad',
      label: 'Modalidad',
      render: (venta) => TIPO_PLAN_LABEL[venta.modalidad],
    },
    {
      key: 'cuotas',
      // Las dos van vacías en una venta CONTADO: no hay cronograma ni interés.
      label: 'Cuotas',
      headerTooltip: 'Una venta al contado no tiene cuotas ni tasa',
      render: (venta) => venta.cantidad_cuotas ?? SIN_DATO,
    },
    {
      key: 'tna',
      label: 'TNA',
      headerTooltip: 'Tasa nominal anual congelada al confirmar la venta',
      render: (venta) =>
        venta.tasa_nominal_anual === null ? SIN_DATO : `${venta.tasa_nominal_anual} %`,
    },
    {
      key: 'saldo',
      label: 'Saldo pendiente',
      render: (venta) => (
        <p className="text-content text-xs font-medium">
          {formatearImporte(venta.saldo_pendiente)}
        </p>
      ),
    },
    { key: 'estado', label: 'Estado', render: (venta) => badgeEstadoVenta(venta.estado) },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (venta) => (
        <IconButton
          icon={<Eye />}
          ariaLabel={`Ver el detalle de la venta de la unidad ${venta.unidad.identificador}`}
          title="Ver detalle de la venta"
          variant="soft"
          size="sm"
          bgColor="fondo-ver"
          iconColor="info"
          onClick={() => navigate(rutaDetalleVenta(venta.id_venta))}
        />
      ),
    },
  ]

  return (
    <SeccionFicha titulo="Ventas">
      {ventas.length === 0 ? (
        <SeccionVacia texto="Este cliente todavía no tiene ventas registradas: es un interesado." />
      ) : (
        <DataTable
          data={ventas}
          columns={columnas}
          obtenerId={(venta) => String(venta.id_venta)}
          ariaLabel="Ventas del cliente"
        />
      )}
    </SeccionFicha>
  )
}
