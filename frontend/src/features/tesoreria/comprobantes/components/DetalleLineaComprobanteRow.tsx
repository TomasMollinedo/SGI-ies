import { useState } from 'react'
import type { Control, UseFormRegister } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { useArticulos } from '@/features/almacen/artículos/hooks/useArticulos'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import type { ComprobanteFormOutput, ComprobanteFormValues } from '../types/comprobante.schema'
import { formatearMoneda } from '../utils/formatearMoneda'

interface DetalleLineaComprobanteRowProps {
  index: number
  control: Control<ComprobanteFormValues, unknown, ComprobanteFormOutput>
  register: UseFormRegister<ComprobanteFormValues>
  onRemove: () => void
  canRemove: boolean
  subtotal: number
  errors?: {
    descripcion?: { message?: string }
    FK_articulo?: { message?: string }
    cantidad?: { message?: string }
    precio_unitario?: { message?: string }
  }
}

/**
 * Una línea de la grilla de detalle: descripción (obligatoria), artículo del
 * catálogo (opcional, buscado por nombre), cantidad, precio unitario y subtotal
 * calculado. A diferencia de la orden de compra, un mismo artículo puede
 * repetirse en varias líneas, así que no se excluyen los ya elegidos.
 */
export function DetalleLineaComprobanteRow({
  index,
  control,
  register,
  onRemove,
  canRemove,
  subtotal,
  errors,
}: DetalleLineaComprobanteRowProps) {
  const [busqueda, setBusqueda] = useState('')

  const { data: articulos, isFetching } = useArticulos({
    busqueda: busqueda || undefined,
    estado: true,
    limit: 20,
  })

  const opciones: ComboboxOption[] = (articulos?.data ?? []).map((articulo) => ({
    value: String(articulo.id_articulo),
    label: articulo.nombre,
  }))

  const hayMasArticulos = (articulos?.meta.total ?? 0) > (articulos?.data.length ?? 0)

  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_1fr_5rem_7rem_7rem_auto]">
      <Input
        placeholder="Descripción"
        error={errors?.descripcion?.message}
        {...register(`detalle.${index}.descripcion`)}
      />

      <Controller
        name={`detalle.${index}.FK_articulo`}
        control={control}
        render={({ field }) => (
          <Combobox
            placeholder="Artículo (opcional)"
            minChars={0}
            value={field.value ?? ''}
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
        {...register(`detalle.${index}.cantidad`)}
      />

      <Input
        type="number"
        min={0}
        step="0.01"
        placeholder="Precio unit."
        error={errors?.precio_unitario?.message}
        {...register(`detalle.${index}.precio_unitario`)}
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