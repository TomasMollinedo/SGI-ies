import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, ShieldAlert, Undo2 } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { DataTable } from '@/shared/components/common/DataTable'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Button } from '@/shared/components/ui/Button'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { TIPO_PLAN_LABEL } from '@/features/comercializacion/planes-pago/config/planPago.config'
import { CancelarVentaModal } from '../components/CancelarVentaModal'
import type { VentaACancelar } from '../components/CancelarVentaModal'
import { badgeEstadoCuota, badgeEstadoVenta, SIN_DATO } from '../config/venta.config'
import { useVentaDetalle } from '../hooks/useVentas'
import type { CuotaVenta } from '../types/venta.types'

const COLUMNAS_CUOTAS: DataTableColumn<CuotaVenta>[] = [
  { key: 'numero', label: 'Cuota', render: (c) => (c.numero === 0 ? 'Anticipo' : `#${c.numero}`) },
  { key: 'capital', label: 'Capital', render: (c) => formatearImporte(c.importe_capital) },
  { key: 'interes', label: 'Interés', render: (c) => formatearImporte(c.importe_interes) },
  { key: 'importe', label: 'Importe', render: (c) => formatearImporte(c.importe) },
  { key: 'vencimiento', label: 'Vencimiento', render: (c) => formatearFecha(c.fecha_vencimiento) },
  { key: 'saldo', label: 'Saldo pendiente', render: (c) => formatearImporte(c.saldo_pendiente) },
  { key: 'estado', label: 'Estado', render: (c) => badgeEstadoCuota(c.estado) },
]

/** Detalle de una venta (HU-27): cabecera, cronograma completo de cuotas y cancelación. */
export function VentaDetallePage() {
  const params = useParams<{ idVenta: string }>()
  const navigate = useNavigate()
  const idVenta = params.idVenta ? Number(params.idVenta) : null

  const { data: venta, isLoading, error, refetch } = useVentaDetalle(idVenta)
  const [cancelando, setCancelando] = useState<VentaACancelar | null>(null)

  const statusCode = error?.statusCode

  if (statusCode === 403) {
    return (
      <EmptyState
        icono={ShieldAlert}
        titulo="No tenés permisos para acceder a esta sección"
        descripcion="Se requiere el rol Administrador."
      />
    )
  }

  if (error) {
    return (
      <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={() => refetch()} />
    )
  }

  if (isLoading || !venta) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Button
        size="sm"
        icon={<ArrowLeft />}
        onClick={() => navigate(PATHS.COMERCIALIZACION.VENTAS)}
      >
        Volver al listado
      </Button>

      <div className="border-subtle bg-fondotabla flex flex-col gap-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-content text-lg font-semibold">{venta.unidad.identificador}</p>
            <p className="text-content-muted text-sm">{venta.proyecto.nombre}</p>
          </div>
          {badgeEstadoVenta(venta.estado)}
        </div>

        <div>
          <p className="text-content font-medium">
            {venta.cliente.nombre} {venta.cliente.apellido ?? ''}
          </p>
          <p className="text-content-muted text-sm">{venta.cliente.email}</p>
          <p className="text-content-muted text-sm">
            {venta.cliente.dni_cuil ?? 'Sin DNI/CUIL'} · {venta.cliente.telefono ?? 'Sin teléfono'}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Fila etiqueta="Precio" valor={formatearImporte(venta.plan.precio)} />
          <Fila etiqueta="Anticipo" valor={formatearImporte(venta.plan.anticipo)} />
          <Fila etiqueta="Modalidad" valor={TIPO_PLAN_LABEL[venta.plan.modalidad]} />
          <Fila etiqueta="Cuotas" valor={`${venta.plan.cantidad_cuotas ?? SIN_DATO}`} />
          <Fila
            etiqueta="TNA"
            valor={venta.plan.tasa_nominal_anual === null ? SIN_DATO : `${venta.plan.tasa_nominal_anual} %`}
          />
          <Fila
            etiqueta="Valor de cuota"
            valor={venta.plan.valor_cuota === null ? SIN_DATO : formatearImporte(venta.plan.valor_cuota)}
          />
          <Fila etiqueta="Saldo financiado" valor={formatearImporte(venta.plan.saldo_financiado)} />
          <Fila etiqueta="Total de intereses" valor={formatearImporte(venta.plan.total_intereses)} />
          <Fila etiqueta="Total a pagar" valor={formatearImporte(venta.plan.total_a_pagar)} />
          <Fila etiqueta="Fecha de venta" valor={formatearFecha(venta.fecha_venta)} />
          <Fila
            etiqueta="Registrada por"
            valor={`${venta.usuarioCreador.nombre} ${venta.usuarioCreador.apellido}`}
          />
          {venta.estado === 'CANCELADA' && (
            <>
              <Fila
                etiqueta="Fecha de cancelación"
                valor={venta.fecha_cancelacion ? formatearFecha(venta.fecha_cancelacion) : '—'}
              />
              <Fila etiqueta="Motivo de cancelación" valor={venta.motivo_cancelacion ?? '—'} />
            </>
          )}
        </dl>

        {venta.estado === 'VIGENTE' && (
          <div>
            <Button
              variant="error"
              size="sm"
              icon={<Undo2 />}
              onClick={() =>
                setCancelando({
                  id_venta: venta.id_venta,
                  identificadorUnidad: venta.unidad.identificador,
                })
              }
            >
              Cancelar venta
            </Button>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-content mb-2 text-sm font-semibold">Cronograma de cuotas</h3>
        <DataTable
          data={venta.cuotas}
          columns={COLUMNAS_CUOTAS}
          obtenerId={(c) => String(c.numero)}
          ariaLabel="Cronograma de cuotas"
        />
      </div>

      <CancelarVentaModal
        venta={cancelando}
        onClose={() => setCancelando(null)}
        onCancelada={() => setCancelando(null)}
      />
    </div>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-content-muted text-xs">{etiqueta}</dt>
      <dd className="text-content font-medium wrap-anywhere">{valor}</dd>
    </div>
  )
}
