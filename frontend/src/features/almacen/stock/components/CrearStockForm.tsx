import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, PackagePlus, X } from 'lucide-react'
import { useDepositos } from '@/features/almacen/deposito/hooks/useDepositos'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { useArticulosLookup } from '../hooks/useArticulosLookup'
import { crearStockFormSchema } from '../types/stock.schema'
import type { CrearStockFormOutput, CrearStockFormValues } from '../types/stock.schema'

const ID_FORM = 'form-crear-stock'
const VALORES_INICIALES: CrearStockFormValues = {
  FK_articulo: '',
  FK_deposito: '',
  umbral_minimo: 0,
  observaciones: '',
}

interface CrearStockFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: CrearStockFormOutput) => void
  loading?: boolean
}

/**
 * Modal de alta de una ficha de stock: vincula un artículo a un depósito. El
 * stock actual arranca en 0 siempre (lo carga el backend); acá solo se elige
 * a quién vincular y, opcionalmente, su umbral mínimo y observaciones.
 */
export function CrearStockForm({ open, onClose, onSubmit, loading = false }: CrearStockFormProps) {
  const [busquedaArticulo, setBusquedaArticulo] = useState('')

  const { data: articulos, isFetching: buscandoArticulos } = useArticulosLookup(busquedaArticulo)
  // A diferencia de artículos, los depósitos son un catálogo chico (depósito
  // central + obradores) que no justifica búsqueda server-side: se traen
  // todos los activos de una y se eligen en un <Select> común.
  const { data: depositos, isFetching: cargandoDepositos } = useDepositos({
    estado: true,
    limit: 100,
  })

  const opcionesArticulo: ComboboxOption[] = (articulos?.data ?? []).map((articulo) => ({
    value: String(articulo.id_articulo),
    label: articulo.nombre,
    description: articulo.codigo,
  }))

  const opcionesDeposito: SelectOption[] = (depositos?.data ?? []).map((deposito) => ({
    value: String(deposito.id_deposito),
    label: `${deposito.nombre} (${deposito.es_obrador ? 'Obrador' : 'Depósito central'})`,
  }))

  const hayMasArticulos = (articulos?.meta.total ?? 0) > opcionesArticulo.length

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CrearStockFormValues, unknown, CrearStockFormOutput>({
    resolver: zodResolver(crearStockFormSchema),
    defaultValues: VALORES_INICIALES,
  })

  // Cada vez que se abre, el form arranca limpio y la búsqueda de artículo se resetea.
  useEffect(() => {
    if (!open) return
    reset(VALORES_INICIALES)
    setBusquedaArticulo('')
  }, [open, reset])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva ficha de stock"
      icon={<PackagePlus />}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="success" icon={<Check />} type="submit" form={ID_FORM} loading={loading}>
            Guardar
          </Button>
        </>
      }
    >
      <form id={ID_FORM} onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="FK_articulo"
            control={control}
            render={({ field }) => (
              <Combobox
                label="Artículo"
                required
                placeholder="Buscar por nombre o código"
                minChars={3}
                value={field.value}
                onChange={field.onChange}
                options={opcionesArticulo}
                onSearch={setBusquedaArticulo}
                loading={buscandoArticulos}
                hasMoreResults={hayMasArticulos}
                error={errors.FK_articulo?.message}
              />
            )}
          />

          <Select
            label="Depósito"
            required
            placeholder={cargandoDepositos ? 'Cargando depósitos…' : 'Seleccionar depósito'}
            disabled={cargandoDepositos}
            options={opcionesDeposito}
            error={errors.FK_deposito?.message}
            {...register('FK_deposito')}
          />

          <Input
            label="Umbral mínimo"
            type="number"
            min={0}
            required
            error={errors.umbral_minimo?.message}
            {...register('umbral_minimo', { valueAsNumber: true })}
          />

          <div className="sm:col-span-2">
            <Input
              label="Observaciones"
              multiline
              placeholder="Texto breve para identificar el registro"
              error={errors.observaciones?.message}
              {...register('observaciones')}
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
