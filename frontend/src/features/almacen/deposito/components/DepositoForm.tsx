import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Home, Pencil, X } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { cn } from '@/shared/utils/cn'
import { depositoFormSchema } from '../types/deposito.schema'
import type { DepositoFormOutput, DepositoFormValues } from '../types/deposito.schema'
import type { Deposito } from '../types/deposito.types'

const ID_FORM = 'form-deposito'

interface DepositoFormProps {
  open: boolean
  onClose: () => void
  /** Sin este prop es alta; con un depósito cargado, es edición. */
  deposito?: Deposito
  onSubmit: (payload: DepositoFormOutput) => void
  loading?: boolean
}

/** Modal de crear/editar un depósito u obrador (centro de acopio). */
export function DepositoForm({
  open,
  onClose,
  deposito,
  onSubmit,
  loading = false,
}: DepositoFormProps) {
  const esEdicion = deposito !== undefined

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<DepositoFormValues, unknown, DepositoFormOutput>({
    resolver: zodResolver(depositoFormSchema),
    defaultValues: valoresIniciales(deposito),
  })

  // Cada vez que se abre (alta nueva o edición de otro registro) el form arranca limpio.
  useEffect(() => {
    if (open) reset(valoresIniciales(deposito))
  }, [open, deposito, reset])

  const esObrador = watch('es_obrador')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esEdicion ? 'Editar centro de acopio' : 'Nuevo centro de acopio'}
      icon={esEdicion ? <Pencil /> : <Home />}
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
          {esEdicion && (
            <div className="sm:col-span-2">
              <Input
                label="Código"
                value={deposito.id_deposito}
                readOnly
                helperText="Generado por el sistema"
              />
            </div>
          )}

          <div className="sm:col-span-2">
            <Input
              label="Nombre del centro"
              required
              placeholder="Ej. Obrador Torre"
              error={errors.nombre?.message}
              {...register('nombre')}
            />
          </div>

          <div className="sm:col-span-2">
            <span className="text-content text-xs font-medium">
              Tipo de centro
              <span aria-hidden="true" className="text-error">
                {' *'}
              </span>
            </span>
            <div role="radiogroup" aria-label="Tipo de centro" className="grid grid-cols-2 gap-3">
              <TarjetaTipo
                titulo="Depósito central"
                subtitulo="No requiere proyecto"
                value="false"
                seleccionado={esObrador === 'false'}
                registro={register('es_obrador')}
              />
              <TarjetaTipo
                titulo="Obrador"
                subtitulo="Puede asociarse a un proyecto"
                value="true"
                seleccionado={esObrador === 'true'}
                registro={register('es_obrador')}
              />
            </div>
            {errors.es_obrador?.message && (
              <p role="alert" className="text-error mt-1 text-xs">
                {errors.es_obrador.message}
              </p>
            )}
          </div>

          <Input
            label="Ubicación"
            required
            placeholder="Ej: Av. Rocca 240"
            error={errors.ubicacion?.message}
            {...register('ubicacion')}
          />

          {/* Proyecto asignado pertenece al módulo de Proyectos, que todavía no
              existe: el campo queda visible pero deshabilitado hasta que haya
              un catálogo de proyectos activos contra el cual elegir. */}
          <Select
            label="Proyecto asignado"
            disabled
            options={[{ value: '', label: '-' }]}
            helperText="Solo proyectos activos. Los depósitos centrales no requieren vinculación."
          />

          <div className="sm:col-span-2">
            <Input
              label="Descripción"
              multiline
              placeholder="Texto breve para identificar el registro"
              error={errors.descripcion?.message}
              {...register('descripcion')}
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}

interface TarjetaTipoProps {
  titulo: string
  subtitulo: string
  value: 'true' | 'false'
  seleccionado: boolean
  registro: UseFormRegisterReturn<'es_obrador'>
}

/** Una opción del selector visual de "Tipo de centro": tarjeta clickeable que envuelve un radio real (accesible). */
function TarjetaTipo({ titulo, subtitulo, value, seleccionado, registro }: TarjetaTipoProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col gap-0.5 rounded-md border p-3 transition-colors',
        seleccionado ? 'border-primary bg-primary/5' : 'border-subtle hover:border-content-muted'
      )}
    >
      <input type="radio" value={value} className="sr-only" {...registro} />
      <span className="text-content text-sm font-medium">{titulo}</span>
      <span className="text-content-muted text-xs">{subtitulo}</span>
    </label>
  )
}

function valoresIniciales(deposito?: Deposito): DepositoFormValues {
  return {
    nombre: deposito?.nombre ?? '',
    es_obrador: deposito?.es_obrador ? 'true' : 'false',
    ubicacion: deposito?.ubicacion ?? '',
    descripcion: deposito?.descripcion ?? '',
  }
}
