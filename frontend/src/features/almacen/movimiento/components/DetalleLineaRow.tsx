import { useState } from 'react'
import type { Control, UseFormRegister } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Trash2, X } from 'lucide-react'
import { useStock } from '@/features/almacen/stock/hooks/useStock'
import type { Stock } from '@/features/almacen/stock/types/stock.types'
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
 *
 * La línea tiene dos estados. Sin ficha elegida muestra el buscador; con ficha
 * elegida lo reemplaza por los datos de la ficha en modo lectura (artículo y
 * stock actual), porque son datos que se toman de la ficha y no se editan
 * desde acá. Para cambiar de artículo hay que soltar la ficha explícitamente.
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

  /**
   * La ficha elegida, guardada entera en el momento de la selección.
   *
   * No alcanza con quedarse solo con el `FK_Stock` del form y volver a
   * buscarla en `fichas.data`: esa lista es el resultado de la búsqueda
   * vigente y la ficha elegida puede no estar más ahí. Como el usuario la
   * eligió de esa misma lista, en ese instante sí está garantizada, así que se
   * copia y la línea deja de depender de la query.
   *
   * De paso, el stock que se muestra queda congelado en el saldo que tenía la
   * ficha al momento de elegirla. Es un dato informativo para cargar la
   * cantidad: quien decide si el stock alcanza es el backend, que revalida el
   * saldo dentro de la transacción del alta.
   */
  const [fichaElegida, setFichaElegida] = useState<Stock | null>(null)

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
    <div className="border-subtle flex flex-col gap-3 rounded-md border p-3">
      <Controller
        name={`detalle.${index}.FK_Stock`}
        control={control}
        render={({ field }) => {
          function elegirFicha(valor: string) {
            field.onChange(valor)
            setFichaElegida(fichas?.data.find((ficha) => String(ficha.id_stock) === valor) ?? null)
          }

          function soltarFicha() {
            field.onChange('')
            setFichaElegida(null)
            setBusqueda('')
          }

          if (!fichaElegida) {
            return (
              <Combobox
                placeholder="Buscar artículo"
                minChars={0}
                value={field.value}
                onChange={elegirFicha}
                options={opciones}
                onSearch={setBusqueda}
                loading={isFetching}
                hasMoreResults={hayMasFichas}
                error={errors?.FK_Stock?.message}
              />
            )
          }

          return (
            <div className="bg-surface-muted flex items-center justify-between gap-3 rounded-md px-3 py-2">
              <div className="min-w-0">
                <p className="text-content truncate text-sm font-medium">
                  {fichaElegida.articulo.nombre}
                </p>
                <p className="text-content-muted text-xs">Stock actual: {fichaElegida.cantidad}</p>
              </div>

              <IconButton
                icon={<X />}
                ariaLabel="Cambiar artículo"
                size="sm"
                onClick={soltarFicha}
              />
            </div>
          )
        }}
      />

      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[7rem_1fr_auto]">
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
    </div>
  )
}
