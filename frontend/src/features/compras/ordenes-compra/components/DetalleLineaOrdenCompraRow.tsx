import { useState } from 'react'
import type { Control, UseFormRegister } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Search, Trash2, X } from 'lucide-react'
import { SelectorArticuloModal } from '@/features/almacen/artículos/components/SelectorArticuloModal'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import type { OrdenCompraFormOutput, OrdenCompraFormValues } from '../types/ordenCompra.schema'
import { formatearMoneda } from '../utils/formatearMoneda'

interface DetalleLineaOrdenCompraRowProps {
  index: number
  control: Control<OrdenCompraFormValues, unknown, OrdenCompraFormOutput>
  register: UseFormRegister<OrdenCompraFormValues>
  onRemove: () => void
  canRemove: boolean
  subtotal: number
  errors?: {
    FK_articulo?: { message?: string }
    cantidad?: { message?: string }
    precio_unitario?: { message?: string }
  }
}

/**
 * Una línea de la grilla de detalle: artículo (activo, elegido con el mismo
 * buscador en modal que Comprobantes), cantidad, precio unitario y subtotal
 * calculado. No repetir artículo entre líneas ya lo valida el formulario
 * completo (`ordenCompraFormSchema`), así que acá no hace falta excluir nada.
 */
export function DetalleLineaOrdenCompraRow({
  index,
  control,
  register,
  onRemove,
  canRemove,
  subtotal,
  errors,
}: DetalleLineaOrdenCompraRowProps) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [nombreArticulo, setNombreArticulo] = useState('')

  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_7rem_9rem_9rem_auto]">
      <Controller
        name={`detalle.${index}.FK_articulo`}
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <Input
                readOnly
                placeholder="Buscar artículo activo"
                value={nombreArticulo || (field.value ? `Artículo #${field.value}` : '')}
                error={errors?.FK_articulo?.message}
                className="flex-1"
              />
              <IconButton
                icon={<Search />}
                ariaLabel="Buscar artículo"
                variant="soft"
                size="sm"
                bgColor="fondo-ver"
                iconColor="info"
                onClick={() => setModalAbierto(true)}
              />
              {field.value ? (
                <IconButton
                  icon={<X />}
                  ariaLabel="Quitar artículo"
                  variant="soft"
                  size="sm"
                  bgColor="fondo-eliminar"
                  iconColor="error"
                  onClick={() => {
                    field.onChange('')
                    setNombreArticulo('')
                  }}
                />
              ) : null}
            </div>

            <SelectorArticuloModal
              open={modalAbierto}
              onClose={() => setModalAbierto(false)}
              onSeleccionar={(articulo) => {
                field.onChange(String(articulo.id_articulo))
                setNombreArticulo(articulo.nombre)
                setModalAbierto(false)
              }}
            />
          </div>
        )}
      />

      <Input
        type="number"
        min={0}
        step="any"
        placeholder="Cantidad"
        error={errors?.cantidad?.message}
        {...register(`detalle.${index}.cantidad`, { valueAsNumber: true })}
      />

      <Input
        type="number"
        min={0}
        step="0.01"
        placeholder="Precio unitario"
        error={errors?.precio_unitario?.message}
        {...register(`detalle.${index}.precio_unitario`, { valueAsNumber: true })}
      />

      <p className="text-content pt-2.5 text-right text-sm font-medium">
        {formatearMoneda(subtotal)}
      </p>

      <IconButton
        icon={<Trash2 />}
        ariaLabel="Quitar línea"
        variant="soft"
        bgColor="fondo-eliminar"
        iconColor="error"
        disabled={!canRemove}
        onClick={onRemove}
      />
    </div>
  )
}
