import { Package, Pencil, X } from 'lucide-react'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Modal } from '@/shared/components/common/Modal'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useStockDetalle } from '../hooks/useStock'
import type { Stock } from '../types/stock.types'

interface StockDetalleModalProps {
  id: number | null
  onClose: () => void
  onEditar: (stock: Stock) => void
}

/** Modal de solo lectura con el detalle completo de una ficha de stock. */
export function StockDetalleModal({ id, onClose, onEditar }: StockDetalleModalProps) {
  const { data: stock, isLoading, isError, refetch } = useStockDetalle(id)

  return (
    <Modal
      open={id !== null}
      onClose={onClose}
      title="Detalle de la ficha de stock"
      icon={<Package />}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="success"
            icon={<Pencil />}
            onClick={() => stock && onEditar(stock)}
            disabled={!stock}
          >
            Editar registro
          </Button>
        </>
      }
    >
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner className="text-primary size-8" />
        </div>
      )}

      {isError && <ErrorState onReintentar={() => refetch()} />}

      {!isLoading && !isError && stock && (
        <div className="flex flex-col">
          <DetailRow label="Código" value={stock.id_stock} />
          <DetailRow label="Artículo" value={stock.articulo.nombre} />
          <DetailRow label="Depósito" value={stock.deposito.nombre} />
          <DetailRow label="Tipo" value={stock.deposito.es_obrador ? 'Obrador' : 'Depósito'} />
          <DetailRow label="Cantidad" value={stock.cantidad} />
          <DetailRow label="Umbral mínimo" value={stock.umbral_minimo} />
          <DetailRow label="Observaciones" value={stock.observaciones ?? '—'} />
          <DetailRow
            label="Estado"
            value={
              <Badge variant={stock.estado ? 'active' : 'inactive'}>
                {stock.estado ? 'Activo' : 'Dado de baja'}
              </Badge>
            }
          />

          <AuditInfo
            className="mt-4"
            createdAt={stock.hora_creacion}
            createdBy={{ nombre: nombreCompleto(stock.usuarioCreador) }}
            updatedAt={stock.hora_actualizacion ?? undefined}
            updatedBy={
              stock.hora_actualizacion
                ? { nombre: nombreCompleto(stock.usuarioActualizador) }
                : undefined
            }
          />
        </div>
      )}
    </Modal>
  )
}

function nombreCompleto(usuario: { nombre: string; apellido: string }): string {
  return `${usuario.nombre} ${usuario.apellido}`
}
