import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Pencil, Ruler, X } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { unidadMedidaFormSchema } from '../types/unidadMedida.schema'
import type { UnidadMedidaFormOutput, UnidadMedidaFormValues } from '../types/unidadMedida.schema'
import type { UnidadMedida } from '../types/unidadMedida.types'
import { formatearCodigoUnidadMedida } from '../utils/codigoUnidadMedida'

const ID_FORM = 'form-unidad-medida'

interface UnidadMedidaFormProps {
  open: boolean
  onClose: () => void
  /** Sin este prop es alta; con una unidad cargada, es edición. */
  unidadMedida?: UnidadMedida
  onSubmit: (payload: UnidadMedidaFormOutput) => void
  loading?: boolean
}

/** Modal de crear/editar una unidad de medida. */
export function UnidadMedidaForm({
  open,
  onClose,
  unidadMedida,
  onSubmit,
  loading = false,
}: UnidadMedidaFormProps) {
  const esEdicion = unidadMedida !== undefined

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<UnidadMedidaFormValues, unknown, UnidadMedidaFormOutput>({
    resolver: zodResolver(unidadMedidaFormSchema),
    defaultValues: valoresIniciales(unidadMedida),
    // Necesario para que "Guardar" sepa en todo momento si el form es válido.
    mode: 'onChange',
  })

  // Cada vez que se abre (alta nueva o edición de otro registro) el form arranca limpio.
  useEffect(() => {
    if (open) reset(valoresIniciales(unidadMedida))
  }, [open, unidadMedida, reset])

  const puedeGuardar = isValid && (!esEdicion || isDirty)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esEdicion ? 'Editar unidad de medida' : 'Nueva unidad de medida'}
      icon={esEdicion ? <Pencil /> : <Ruler />}
      footer={
        <>
          <Button variant="error" icon={<X />} onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="success"
            icon={<Check />}
            type="submit"
            form={ID_FORM}
            loading={loading}
            disabled={!puedeGuardar}
          >
            Guardar
          </Button>
        </>
      }
    >
      <form id={ID_FORM} onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4">
          {esEdicion && (
            <Input
              label="Código"
              value={formatearCodigoUnidadMedida(unidadMedida.id_unidad_medida)}
              readOnly
              helperText="Generado por el sistema"
            />
          )}
          <Input
            label="Nombre"
            required
            placeholder="Ej. Kilogramo"
            error={errors.nombre?.message}
            {...register('nombre')}
          />
          <Input
            label="Abreviatura"
            required
            placeholder="Ej. kg"
            error={errors.abreviatura?.message}
            {...register('abreviatura')}
          />
        </div>
      </form>
    </Modal>
  )
}

function valoresIniciales(unidadMedida?: UnidadMedida): UnidadMedidaFormValues {
  return {
    nombre: unidadMedida?.nombre ?? '',
    abreviatura: unidadMedida?.abreviatura ?? '',
  }
}
