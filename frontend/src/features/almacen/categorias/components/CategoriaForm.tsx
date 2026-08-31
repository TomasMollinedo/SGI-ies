import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Pencil, Tag } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { categoriaFormSchema } from '../types/categoria.schema'
import type { CategoriaFormOutput, CategoriaFormValues } from '../types/categoria.schema'
import type { Categoria } from '../types/categoria.types'

const ID_FORM = 'form-categoria'

interface CategoriaFormProps {
  open: boolean
  onClose: () => void
  /** Sin este prop es alta; con una categoría cargada, es edición. */
  categoria?: Categoria
  onSubmit: (payload: CategoriaFormOutput) => void
  loading?: boolean
}

/** Modal de crear/editar una categoría. */
export function CategoriaForm({
  open,
  onClose,
  categoria,
  onSubmit,
  loading = false,
}: CategoriaFormProps) {
  const esEdicion = categoria !== undefined

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<CategoriaFormValues, unknown, CategoriaFormOutput>({
    resolver: zodResolver(categoriaFormSchema),
    defaultValues: valoresIniciales(categoria),
    mode: 'onChange',
  })

  // Cada vez que se abre (alta nueva o edición de otro registro) el form arranca limpio.
  useEffect(() => {
    if (open) reset(valoresIniciales(categoria))
  }, [open, categoria, reset])

  const puedeGuardar = isValid && (!esEdicion || isDirty)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esEdicion ? 'Editar categoría' : 'Nueva categoría'}
      icon={esEdicion ? <Pencil /> : <Tag />}
      footer={
        <>
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
          <Input
            label="Nombre"
            required
            placeholder="Ej. Herramientas"
            error={errors.nombre?.message}
            {...register('nombre')}
          />

          <Input
            label="Descripción"
            multiline
            placeholder="Texto breve para identificar el registro"
            error={errors.descripcion?.message}
            {...register('descripcion')}
          />
        </div>
      </form>
    </Modal>
  )
}

function valoresIniciales(categoria?: Categoria): CategoriaFormValues {
  return {
    nombre: categoria?.nombre ?? '',
    descripcion: categoria?.descripcion ?? '',
  }
}
