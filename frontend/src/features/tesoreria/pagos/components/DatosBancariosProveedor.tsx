import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Pencil, X } from 'lucide-react'
import type { z } from 'zod'
import {
  useEditarProveedor,
  useProveedorDetalle,
} from '@/features/compras/proveedores/hooks/useProveedores'
import { proveedorFormSchema } from '@/features/compras/proveedores/types/proveedor.schema'
import type {
  EditarProveedorPayload,
  ProveedorDetalle,
} from '@/features/compras/proveedores/types/proveedor.types'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'

const CAMPOS_BANCARIOS = ['banco', 'titular', 'cbu', 'alias'] as const

const datosBancariosSchema = proveedorFormSchema.pick({
  banco: true,
  titular: true,
  cbu: true,
  alias: true,
})
type DatosBancariosFormValues = z.input<typeof datosBancariosSchema>
type DatosBancariosFormOutput = z.output<typeof datosBancariosSchema>

interface DatosBancariosProveedorProps {
  proveedorId: number
  /** Deshabilita el botón de editar, ej. mientras se está confirmando el pago. */
  disabled?: boolean
}

function valoresIniciales(proveedor: ProveedorDetalle | undefined): DatosBancariosFormValues {
  return {
    banco: proveedor?.banco ?? '',
    titular: proveedor?.titular ?? '',
    cbu: proveedor?.cbu ?? '',
    alias: proveedor?.alias ?? '',
  }
}

/**
 * Solo manda lo que cambió respecto al proveedor original, mismo criterio que
 * `ProveedoresPage`: evita que el backend rechace la edición por un campo con
 * formato viejo (dato cargado antes de esta validación) que ni se tocó.
 */
function soloCamposModificados(
  payload: DatosBancariosFormOutput,
  original: ProveedorDetalle
): EditarProveedorPayload {
  const cambios: EditarProveedorPayload = {}
  for (const campo of CAMPOS_BANCARIOS) {
    const valorNuevo = payload[campo] ?? ''
    if (valorNuevo !== (original[campo] ?? '')) cambios[campo] = valorNuevo
  }
  return cambios
}

/**
 * Datos bancarios del proveedor elegido en el pago, con edición inline
 * (HU-18): el pago copia estos datos al confirmarse, así que si están
 * desactualizados conviene poder corregirlos en el momento en vez de ir a
 * Proveedores. Trae su propio `useProveedorDetalle`: al guardar, la
 * invalidación de `useEditarProveedor` refresca esta misma query.
 */
export function DatosBancariosProveedor({ proveedorId, disabled }: DatosBancariosProveedorProps) {
  const toast = useToast()
  const { data: proveedor } = useProveedorDetalle(proveedorId)
  const editar = useEditarProveedor()
  const [editando, setEditando] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DatosBancariosFormValues, unknown, DatosBancariosFormOutput>({
    resolver: zodResolver(datosBancariosSchema),
    defaultValues: valoresIniciales(proveedor),
  })

  // Mientras no se está editando, el formulario se mantiene sincronizado con
  // el proveedor (ej. al cambiar de proveedor seleccionado en el pago).
  useEffect(() => {
    if (!editando) reset(valoresIniciales(proveedor))
  }, [proveedor, editando, reset])

  function cancelar() {
    reset(valoresIniciales(proveedor))
    setEditando(false)
  }

  function guardar(payload: DatosBancariosFormOutput) {
    if (!proveedor) return

    editar.mutate(
      { id: proveedor.id_proveedor, payload: soloCamposModificados(payload, proveedor) },
      {
        onSuccess: () => {
          toast.success('Datos bancarios del proveedor actualizados')
          setEditando(false)
        },
        onError: (error) => toast.error(formatearMensajeError(error.message)),
      }
    )
  }

  return (
    <div className="border-subtle bg-white rounded-md border p-3">
      <div className="flex items-center justify-between">
        <span className="text-content-muted text-xs font-medium uppercase">
          Datos bancarios del proveedor
        </span>
        {!editando && (
          <Button
            size="sm"
            icon={<Pencil />}
            onClick={() => setEditando(true)}
            disabled={disabled || !proveedor}
          >
            Editar
          </Button>
        )}
      </div>

      {editando ? (
        <form className="mt-3 flex flex-col gap-3" onSubmit={(evento) => evento.preventDefault()}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Banco"
              placeholder="Ej. Banco Macro"
              disabled={editar.isPending}
              error={errors.banco?.message}
              {...register('banco')}
            />
            <Input
              label="Titular"
              placeholder="Ej. Farmacia Bermejo S.A."
              disabled={editar.isPending}
              error={errors.titular?.message}
              {...register('titular')}
            />
            <Input
              label="CBU"
              inputMode="numeric"
              placeholder="Ej. 0170099220000067797151"
              disabled={editar.isPending}
              error={errors.cbu?.message}
              {...register('cbu')}
            />
            <Input
              label="Alias"
              placeholder="Ej. mi.alias.banco"
              disabled={editar.isPending}
              error={errors.alias?.message}
              {...register('alias')}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="error"
              icon={<X />}
              onClick={cancelar}
              disabled={editar.isPending}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="success"
              icon={<Check />}
              onClick={() => void handleSubmit(guardar)()}
              loading={editar.isPending}
            >
              Guardar
            </Button>
          </div>
        </form>
      ) : (
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-content-muted text-xs">Banco</dt>
            <dd className="text-content">{proveedor?.banco ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-content-muted text-xs">Titular</dt>
            <dd className="text-content">{proveedor?.titular ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-content-muted text-xs">CBU</dt>
            <dd className="text-content">{proveedor?.cbu ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-content-muted text-xs">Alias</dt>
            <dd className="text-content">{proveedor?.alias ?? '—'}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}
