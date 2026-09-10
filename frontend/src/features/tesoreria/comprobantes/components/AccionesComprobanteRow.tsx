import { Ban, Eye, FileCheck2, Pencil } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'
import type { ComprobanteListItem } from '../types/comprobante.types'

interface AccionesComprobanteRowProps {
  comprobante: ComprobanteListItem
  onVer: () => void
  onEditar: () => void
  onConfirmar: () => void
  onAnular: () => void
  /** Bloquea editar / confirmar / anular mientras hay una operación en curso. */
  bloqueado?: boolean
}

/**
 * Acciones de la fila del listado, según el estado del comprobante:
 * - BORRADOR: ver, editar, confirmar y registrar.
 * - REGISTRADO: ver, anular.
 * - ANULADO: ver.
 */
export function AccionesComprobanteRow({
  comprobante,
  onVer,
  onEditar,
  onConfirmar,
  onAnular,
  bloqueado = false,
}: AccionesComprobanteRowProps) {
  const esBorrador = comprobante.estado === 'BORRADOR'
  const esRegistrado = comprobante.estado === 'REGISTRADO'

  return (
    <div className="inline-flex items-center gap-1">
      <IconButton
        icon={<Eye />}
        ariaLabel="Ver detalle"
        variant="soft"
        size="sm"
        bgColor="fondo-ver"
        iconColor="info"
        onClick={onVer}
      />

      {esBorrador && (
        <>
          <IconButton
            icon={<Pencil />}
            ariaLabel="Editar comprobante"
            variant="soft"
            size="sm"
            bgColor="fondo-editar"
            iconColor="warning"
            disabled={bloqueado}
            onClick={onEditar}
          />
          <IconButton
            icon={<FileCheck2 />}
            ariaLabel="Confirmar y registrar"
            variant="soft"
            size="sm"
            bgColor="fondo-reactivar"
            iconColor="reactivar"
            disabled={bloqueado}
            onClick={onConfirmar}
          />
        </>
      )}

      {esRegistrado && (
        <IconButton
          icon={<Ban />}
          ariaLabel="Anular comprobante"
          variant="soft"
          size="sm"
          bgColor="fondo-eliminar"
          iconColor="error"
          disabled={bloqueado}
          onClick={onAnular}
        />
      )}
    </div>
  )
}