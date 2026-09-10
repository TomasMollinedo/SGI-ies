import { useEffect } from 'react'
import { Ban, Pencil, Receipt, X } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DataTable } from '@/shared/components/common/DataTable'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import {
  COLUMNAS_LINEAS,
  SIN_DATO,
  badgeEstadoComprobante,
  badgeEstadoSaldo,
  nombreCompleto,
  textoOSinDato,
} from '../config/comprobante.config'
import { useComprobanteDetalle } from '../hooks/useComprobantes'
import type { ComprobanteDetalle } from '../types/comprobante.types'
import { formatearFechaSinHora } from '../utils/fechaComprobante'
import { formatearMoneda } from '../utils/formatearMoneda'
import { formatearNumeroComprobante } from '../utils/numeroComprobante'

interface ComprobanteDetalleModalProps {
  /** Comprobante a mostrar. Con `null` el modal está cerrado y no se pide nada. */
  idComprobante: number | null
  onClose: () => void
  /** Abre el formulario de edición con este comprobante (solo disponible en BORRADOR). */
  onEditar?: (comprobante: ComprobanteDetalle) => void
  /** Abre el modal de anulación con este comprobante (solo disponible en REGISTRADO). */
  onAnular?: (comprobante: ComprobanteDetalle) => void
  /** Oculta Editar/Anular aunque el comprobante los admita — para contextos de solo lectura (ej. cuenta corriente). */
  readOnly?: boolean
}

/**
 * Modal de solo lectura con la cabecera de un comprobante, sus líneas, su
 * comprobante de origen, las notas que lo referencian, los pagos que lo
 * imputaron y su trazabilidad.
 *
 * Editar y anular se delegan: los botones del pie llaman a `onEditar` / `onAnular`
 * con el comprobante ya cargado. Con `readOnly`, esos botones no se muestran
 * (se usa desde pantallas que no pueden modificar comprobantes, como cuenta
 * corriente).
 */
export function ComprobanteDetalleModal({
  idComprobante,
  onClose,
  onEditar,
  onAnular,
  readOnly = false,
}: ComprobanteDetalleModalProps) {
  const toast = useToast()
  const { data: comprobante, isPending, error, refetch } = useComprobanteDetalle(idComprobante)

  const esInexistente = error?.statusCode === 404

  useEffect(() => {
    if (!esInexistente) return
    toast.error('El comprobante no existe')
    onClose()
  }, [esInexistente, toast, onClose])

  const estaCargando = idComprobante !== null && isPending

  return (
    <Modal
      open={idComprobante !== null}
      onClose={onClose}
      title="Detalle del comprobante"
      icon={<Receipt />}
      size="lg"
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose}>
            Cerrar
          </Button>
          {!readOnly && onEditar && comprobante?.estado === 'BORRADOR' && (
            <Button variant="warning" icon={<Pencil />} onClick={() => onEditar(comprobante)}>
              Editar
            </Button>
          )}
          {!readOnly && onAnular && comprobante?.estado === 'REGISTRADO' && (
            <Button variant="error" icon={<Ban />} onClick={() => onAnular(comprobante)}>
              Anular
            </Button>
          )}
        </>
      }
    >
      {estaCargando ? (
        <div className="flex justify-center py-10">
          <Spinner size={32} />
        </div>
      ) : error && !esInexistente ? (
        <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={() => refetch()} />
      ) : comprobante ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <DetailRow label="Tipo" value={comprobante.tipoComprobante.nombre} />
            <DetailRow label="Comprobante" value={formatearNumeroComprobante(comprobante)} />
            <DetailRow label="Proveedor" value={comprobante.proveedor.razon_social} />
            <DetailRow
              label="Fecha de emisión"
              value={formatearFechaSinHora(comprobante.fecha_emision)}
            />
            <DetailRow
              label="Fecha de vencimiento"
              value={formatearFechaSinHora(comprobante.fecha_vencimiento)}
            />
            <DetailRow
              label="Orden de compra vinculada"
              value={comprobante.FK_orden_compra ? `OC #${comprobante.FK_orden_compra}` : SIN_DATO}
            />
            <DetailRow
              label="Comprobante de origen"
              value={
                comprobante.comprobanteOrigen
                  ? `${comprobante.comprobanteOrigen.tipoComprobante.nombre} ${formatearNumeroComprobante(comprobante.comprobanteOrigen)}`
                  : SIN_DATO
              }
            />
            <DetailRow label="Observaciones" value={textoOSinDato(comprobante.observaciones)} />
            <DetailRow label="Estado" value={badgeEstadoComprobante(comprobante.estado)} />
            <DetailRow label="Estado de saldo" value={badgeEstadoSaldo(comprobante.estado_saldo)} />
            {comprobante.estado === 'ANULADO' && (
              <DetailRow
                label="Motivo de anulación"
                value={textoOSinDato(comprobante.motivo_anulacion)}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-content text-sm font-medium">Detalle</span>
            <DataTable
              data={comprobante.detalle}
              columns={COLUMNAS_LINEAS}
              obtenerId={(linea) => String(linea.id_detalle_comprobante)}
              ariaLabel="Líneas del comprobante"
              emptyState={
                <EmptyState
                  titulo="Este comprobante no tiene líneas"
                  descripcion="Se cargan editando el comprobante mientras esté en borrador."
                />
              }
            />
          </div>

          <dl className="border-subtle flex flex-col gap-1 border-t pt-3 text-sm">
            <FilaImporte label="Importe neto" valor={formatearMoneda(comprobante.importe_neto)} />
            <FilaImporte
              label={`IVA (${comprobante.alicuota_iva}%)`}
              valor={formatearMoneda(comprobante.importe_iva)}
            />
            <FilaImporte
              label="Importe total"
              valor={formatearMoneda(comprobante.importe_total)}
              destacado
            />
            <FilaImporte
              label="Saldo pendiente"
              valor={
                comprobante.saldo_pendiente === null
                  ? SIN_DATO
                  : formatearMoneda(comprobante.saldo_pendiente)
              }
            />
          </dl>

          {comprobante.comprobanteOrigen && (
            <div className="flex flex-col gap-2">
              <span className="text-content text-sm font-medium">Comprobante de origen</span>
              <p className="text-content-muted text-xs">
                {comprobante.comprobanteOrigen.tipoComprobante.nombre}{' '}
                {formatearNumeroComprobante(comprobante.comprobanteOrigen)} ·{' '}
                {comprobante.comprobanteOrigen.proveedor.razon_social} ·{' '}
                {formatearMoneda(comprobante.comprobanteOrigen.importe_total)}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-content text-sm font-medium">
              Comprobantes que lo referencian como origen
            </span>
            {comprobante.notasAplicadas.length === 0 ? (
              <p className="text-content-muted text-xs">Ninguno.</p>
            ) : (
              <ul className="text-content-muted flex list-disc flex-col gap-1 pl-5 text-xs">
                {comprobante.notasAplicadas.map((nota) => (
                  <li key={nota.id_comprobante_proveedor}>
                    {nota.tipoComprobante.nombre} {formatearNumeroComprobante(nota)} ·{' '}
                    {formatearMoneda(nota.importe_total)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-content text-sm font-medium">Pagos que lo imputaron</span>
            {comprobante.pagos.length === 0 ? (
              <p className="text-content-muted text-xs">
                Todavía no se registró ningún pago para este comprobante.
              </p>
            ) : (
              <ul className="text-content-muted flex list-disc flex-col gap-1 pl-5 text-xs">
                {comprobante.pagos.map((pago) => (
                  <li key={pago.id_pago}>
                    Pago #{pago.id_pago} · {formatearFechaSinHora(pago.fecha_pago)} ·{' '}
                    {formatearMoneda(pago.importe_imputado)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <AuditInfo
            createdAt={comprobante.hora_creacion}
            createdBy={{ nombre: nombreCompleto(comprobante.usuarioCreador) }}
            updatedAt={comprobante.hora_actualizacion ?? undefined}
            updatedBy={{ nombre: nombreCompleto(comprobante.usuarioActualizador) }}
          />
        </div>
      ) : null}
    </Modal>
  )
}

function FilaImporte({
  label,
  valor,
  destacado = false,
}: {
  label: string
  valor: string
  destacado?: boolean
}) {
  return (
    <div className="flex justify-between gap-8">
      <dt className={destacado ? 'text-content font-medium' : 'text-content-muted'}>{label}</dt>
      <dd className={destacado ? 'text-content text-lg font-semibold' : 'text-content font-medium'}>
        {valor}
      </dd>
    </div>
  )
}
