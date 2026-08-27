import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Pencil, X } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { editarStockFormSchema } from '../types/stock.schema'
import type { EditarStockFormOutput, EditarStockFormValues } from '../types/stock.schema'
import type { Stock } from '../types/stock.types'

const ID_FORM = 'form-stock'

interface EditarStockFormProps {
  open: boolean
  onClose: () => void
  stock?: Stock
  onSubmit: (payload: EditarStockFormOutput) => void
  loading?: boolean
}

/**
 * Modal de edición de una ficha de stock. A diferencia de los demás formularios
 * del módulo, no tiene modo de alta: la cantidad y las FK (artículo/depósito) no
 * se pueden tocar acá, solo umbral mínimo y observaciones.
 */
export function EditarStockForm({
  open,
  onClose,
  stock,
  onSubmit,
  loading = false,
}: EditarStockFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditarStockFormValues, unknown, EditarStockFormOutput>({
    resolver: zodResolver(editarStockFormSchema),
    defaultValues: valoresIniciales(stock),
  })

  // Cada vez que se abre para editar otro registro el form arranca con sus valores.
  useEffect(() => {
    if (open) reset(valoresIniciales(stock))
  }, [open, stock, reset])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar ficha de stock"
      icon={<Pencil />}
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
          <Input label="Artículo" value={stock?.articulo.nombre ?? ''} readOnly />
          <Input label="Depósito" value={stock?.deposito.nombre ?? ''} readOnly />
          <Input
            label="Cantidad actual"
            value={stock?.cantidad ?? 0}
            readOnly
            helperText="Se actualiza con los movimientos de stock"
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

function valoresIniciales(stock?: Stock): EditarStockFormValues {
  return {
    umbral_minimo: stock?.umbral_minimo ?? 0,
    observaciones: stock?.observaciones ?? '',
  }
}
