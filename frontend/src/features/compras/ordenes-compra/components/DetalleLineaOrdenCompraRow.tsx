import { useState } from 'react'
import type { Control, UseFormRegister } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { useArticulos } from '@/features/almacen/artículos/hooks/useArticulos'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
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
  /** FK_articulo ya elegidos en otras líneas, para no ofrecerlos de nuevo (la misma regla que valida el backend). */
  idsExcluidos: number[]
  subtotal: number
  errors?: {
    FK_articulo?: { message?: string }
    cantidad?: { message?: string }
    precio_unitario?: { message?: string }
  }
}

/** Una línea de la grilla de detalle: artículo (activo, buscado por nombre), cantidad, precio unitario y subtotal calculado. */
export function DetalleLineaOrdenCompraRow({
  index,
  control,
  register,
  onRemove,
  canRemove,
  idsExcluidos,
  subtotal,
  errors,
}: DetalleLineaOrdenCompraRowProps) {
  const [busqueda, setBusqueda] = useState('')

  const { data: articulos, isFetching } = useArticulos({
    busqueda: busqueda || undefined,
    estado: true,
    limit: 20,
  })

  const opciones: ComboboxOption[] = (articulos?.data ?? [])
    .filter((articulo) => !idsExcluidos.includes(articulo.id_articulo))
    .map((articulo) => ({
      value: String(articulo.id_articulo),
      label: articulo.nombre,
    }))

  const hayMasArticulos = (articulos?.meta.total ?? 0) > (articulos?.data.length ?? 0)

  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_7rem_9rem_9rem_auto]">
      <Controller
        name={`detalle.${index}.FK_articulo`}
        control={control}
        render={({ field }) => (
          <Combobox
            placeholder="Buscar artículo activo"
            minChars={0}
            value={field.value}
            onChange={field.onChange}
            options={opciones}
            onSearch={setBusqueda}
            loading={isFetching}
            hasMoreResults={hayMasArticulos}
            error={errors?.FK_articulo?.message}
          />
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
