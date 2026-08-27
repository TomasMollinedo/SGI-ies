import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Package, Pencil, TriangleAlert, X } from 'lucide-react'
import { useCategorias } from '@/features/almacen/categorias/hooks/useCategorias'
import { useMarcas } from '@/features/almacen/marca/hooks/useMarcas'
import { useUnidadesMedida } from '@/features/almacen/unidades-medida/hooks/useUnidadesMedida'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { articuloFormSchema } from '../types/articulo.schema'
import type { ArticuloFormOutput, ArticuloFormValues } from '../types/articulo.schema'
import type { Articulo } from '../types/articulo.types'

const ID_FORM = 'form-articulo'
const OPCION_SIN_MARCA: SelectOption = { value: '', label: 'Sin marca' }

interface ArticuloFormProps {
  open: boolean
  onClose: () => void
  /** Sin este prop es alta; con un artículo cargado, es edición. */
  articulo?: Articulo
  onSubmit: (payload: ArticuloFormOutput) => void
  loading?: boolean
  /**
   * Error del backend que la página decidió no resolver sola. Un 409 se pinta
   * sobre el campo (Código o Nombre) que lo causó, un 400 sobre los campos
   * que indique, y el resto en el banner de arriba del formulario.
   */
  error?: ApiErrorResponse | null
}

/** Modal de crear/editar un artículo. */
export function ArticuloForm({
  open,
  onClose,
  articulo,
  onSubmit,
  loading = false,
  error = null,
}: ArticuloFormProps) {
  const esEdicion = articulo !== undefined
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  // Solo se listan las activas: no tiene sentido asignar un artículo a una
  // categoría, marca o unidad de medida ya dada de baja. El límite alto trae
  // "todas" sin paginar.
  const { data: categorias } = useCategorias({ estado: true, limit: 100 })
  const { data: marcas } = useMarcas({ estado: true, limit: 100 })
  const { data: unidadesMedida } = useUnidadesMedida({ estado: true, limit: 100 })

  const opcionesCategoria: SelectOption[] =
    categorias?.data.map((item) => ({
      value: String(item.id_categoria),
      label: item.nombre,
    })) ?? []

  const opcionesMarca: SelectOption[] = [
    OPCION_SIN_MARCA,
    ...(marcas?.data.map((item) => ({ value: String(item.id_marca), label: item.nombre })) ?? []),
  ]

  const opcionesUnidadMedida: SelectOption[] =
    unidadesMedida?.data.map((item) => ({
      value: String(item.id_unidad_medida),
      label: `${item.nombre} (${item.abreviatura})`,
    })) ?? []

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isDirty, isValid },
  } = useForm<ArticuloFormValues, unknown, ArticuloFormOutput>({
    resolver: zodResolver(articuloFormSchema),
    defaultValues: valoresIniciales(articulo),
    // Necesario para que "Guardar" sepa en todo momento si el form es válido.
    mode: 'onChange',
  })

  // Cada vez que se abre (alta nueva o edición de otro registro) el form
  // arranca limpio y el foco va al primer campo.
  useEffect(() => {
    if (!open) return

    reset(valoresIniciales(articulo))
    setErrorGeneral(null)
    setConfirmarDescarte(false)
    setFocus('nombre')
  }, [open, articulo, reset, setFocus])

  useEffect(() => {
    if (!error) return

    setErrorGeneral(repartirErrorDelBackend(error, setError, setFocus))
  }, [error, setError, setFocus])

  function enviar(payload: ArticuloFormOutput) {
    if (loading) return

    setErrorGeneral(null)
    onSubmit(payload)
  }

  // Cerrar con datos a medio cargar pide confirmación; con un envío en curso no
  // se cierra directamente.
  function intentarCerrar() {
    if (loading) return

    if (isDirty) {
      setConfirmarDescarte(true)
      return
    }

    onClose()
  }

  const puedeGuardar = isValid && (!esEdicion || isDirty)

  return (
    <>
      <Modal
        open={open}
        onClose={intentarCerrar}
        title={esEdicion ? 'Editar Artículo' : 'Nuevo Artículo'}
        icon={esEdicion ? <Pencil /> : <Package />}
        closeOnEscape={!loading && !confirmarDescarte}
        closeOnOverlayClick={!loading && !confirmarDescarte}
        footer={
          <>
            <Button variant="error" icon={<X />} onClick={intentarCerrar} disabled={loading}>
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
        <form id={ID_FORM} onSubmit={handleSubmit(enviar)} className="flex flex-col gap-4">
          {errorGeneral && (
            <div
              role="alert"
              className="border-error/30 bg-error/10 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3"
            >
              <p className="text-error text-xs">{errorGeneral}</p>
              <Button variant="error" size="sm" type="submit" form={ID_FORM} loading={loading}>
                Reintentar
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              required
              placeholder="Ej. Cemento Portland"
              disabled={loading}
              error={errors.nombre?.message}
              {...register('nombre')}
            />

            <Select
              label="Categoría"
              required
              placeholder="Seleccioná una categoría"
              options={opcionesCategoria}
              disabled={loading}
              error={errors.FK_Categoria?.message}
              {...register('FK_Categoria')}
            />

            <Select
              label="Unidad de Medida"
              required
              placeholder="Seleccioná una unidad de medida"
              options={opcionesUnidadMedida}
              disabled={loading}
              error={errors.FK_UnidadMedida?.message}
              {...register('FK_UnidadMedida')}
            />

            <Select
              label="Marca"
              options={opcionesMarca}
              disabled={loading}
              error={errors.FK_Marca?.message}
              {...register('FK_Marca')}
            />
          </div>

          <Input
            label="Descripción"
            multiline
            placeholder="Texto breve para identificar el artículo"
            disabled={loading}
            error={errors.descripcion?.message}
            {...register('descripcion')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmarDescarte}
        onCancel={() => setConfirmarDescarte(false)}
        onConfirm={() => {
          setConfirmarDescarte(false)
          onClose()
        }}
        eyebrow="Cambios sin guardar"
        eyebrowIcon={<TriangleAlert />}
        title="¿Descartar los cambios?"
        note="Lo que cargaste en el formulario se va a perder."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
      />
    </>
  )
}

/** Los campos del formulario, para saber qué issues del backend son de campo. */
const CAMPOS = ['nombre', 'descripcion', 'FK_Categoria', 'FK_UnidadMedida', 'FK_Marca'] as const
type CampoDelFormulario = (typeof CAMPOS)[number]

function esCampoDelFormulario(campo: string): campo is CampoDelFormulario {
  return CAMPOS.includes(campo as CampoDelFormulario)
}

/**
 * Manda cada error del backend a donde corresponda y devuelve lo que quedó sin
 * dueño, para el banner. El 409 es el caso importante: el modal no se cierra y
 * el mensaje aparece sobre el campo Nombre, con el foco puesto ahí.
 */
function repartirErrorDelBackend(
  error: ApiErrorResponse,
  setError: UseFormSetError<ArticuloFormValues>,
  setFocus: (campo: CampoDelFormulario) => void
): string | null {
  if (error.statusCode === 409) {
    setError('nombre', { message: 'Ya existe un artículo activo con ese nombre.' })
    setFocus('nombre')
    return null
  }

  if (error.statusCode === 400 && esArrayDeValidationIssues(error.message)) {
    const issuesDeCampo = error.message.filter((issue) => esCampoDelFormulario(issue.campo))
    const resto = error.message.filter((issue) => !esCampoDelFormulario(issue.campo))

    for (const issue of issuesDeCampo) {
      setError(issue.campo as CampoDelFormulario, { message: issue.error })
    }

    if (issuesDeCampo.length > 0) {
      setFocus(issuesDeCampo[0].campo as CampoDelFormulario)
    }

    return resto.length > 0 ? formatearMensajeError(resto) : null
  }

  return formatearMensajeError(error.message)
}

function valoresIniciales(articulo?: Articulo): ArticuloFormValues {
  return {
    nombre: articulo?.nombre ?? '',
    descripcion: articulo?.descripcion ?? '',
    FK_Categoria: articulo ? String(articulo.FK_Categoria) : '',
    FK_UnidadMedida: articulo ? String(articulo.FK_UnidadMedida) : '',
    FK_Marca: articulo?.FK_Marca ? String(articulo.FK_Marca) : '',
  }
}
