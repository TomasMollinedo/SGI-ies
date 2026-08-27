import { useState } from 'react'
import type { Control, UseFormRegister } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { useStock } from '@/features/almacen/stock/hooks/useStock'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import type { MovimientoFormOutput, MovimientoFormValues } from '../types/movimiento.schema'

interface DetalleLineaRowProps {
  index: number
  control: Control<MovimientoFormValues, unknown, MovimientoFormOutput>
  register: UseFormRegister<MovimientoFormValues>
  onRemove: () => void
  canRemove: boolean
  FK_deposito: number
  /** FK_Stock ya elegidos en otras líneas, para no ofrecerlos de nuevo (la misma regla que valida el backend). */
  idsExcluidos: number[]
  errors?: {
    FK_Stock?: { message?: string }
    cantidad?: { message?: string }
    observacion?: { message?: string }
  }
}

/**
 * Una línea de la grilla de detalle: artículo (ficha de stock del depósito
 * elegido, buscada por nombre), cantidad y observación.
 */
export function DetalleLineaRow({
  index,
  control,
  register,
  onRemove,
  canRemove,
  FK_deposito,
  idsExcluidos,
  errors,
}: DetalleLineaRowProps) {
  const [busqueda, setBusqueda] = useState('')

  const { data: fichas, isFetching } = useStock({
    FK_deposito,
    estado: true,
    nombreArticulo: busqueda || undefined,
    limit: 20,
  })

  const opciones: ComboboxOption[] = (fichas?.data ?? [])
    .filter((ficha) => !idsExcluidos.includes(ficha.id_stock))
    .map((ficha) => ({
      value: String(ficha.id_stock),
      label: ficha.articulo.nombre,
      description: `Stock actual: ${ficha.cantidad}`,
    }))

  const hayMasFichas = (fichas?.meta.total ?? 0) > (fichas?.data.length ?? 0)

  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_7rem_1fr_auto]">
      <Controller
        name={`detalle.${index}.FK_Stock`}
        control={control}
        render={({ field }) => (
          <Combobox
            placeholder="Buscar artículo"
            minChars={0}
            value={field.value}
            onChange={field.onChange}
            options={opciones}
            onSearch={setBusqueda}
            loading={isFetching}
            hasMoreResults={hayMasFichas}
            error={errors?.FK_Stock?.message}
          />
        )}
      />

      <Input
        type="number"
        min={1}
        placeholder="Cantidad"
        error={errors?.cantidad?.message}
        {...register(`detalle.${index}.cantidad`, { valueAsNumber: true })}
      />

      <Input
        placeholder="Observación (opcional)"
        error={errors?.observacion?.message}
        {...register(`detalle.${index}.observacion`)}
      />

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
