import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Check, Pencil, TriangleAlert, X } from 'lucide-react'
import { PATHS, rutaDetalleUnidadFuncional, rutaEditarUnidadFuncional } from '@/app/router/paths'
import { formatearMoneda } from '@/features/compras/ordenes-compra/utils/formatearMoneda'
import { useProyectoDetalle } from '@/features/proyectos/hooks/useProyectos'
import type { ProyectoResumen } from '@/features/proyectos/types/proyecto.types'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { StatTile } from '@/shared/components/common/StatTile'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { GaleriaImagenesForm } from '../components/GaleriaImagenesForm'
import { SelectorProyectoModal } from '../components/SelectorProyectoModal'
import {
  useCrearUnidadFuncional,
  useEditarUnidadFuncional,
  useTipologias,
  useUnidadFuncionalDetalle,
} from '../hooks/useUnidadesFuncionales'
import { unidadFuncionalFormSchema } from '../types/unidadFuncional.schema'
import type {
  UnidadFuncionalFormOutput,
  UnidadFuncionalFormValues,
} from '../types/unidadFuncional.schema'
import type {
  CrearUnidadFuncionalPayload,
  EditarUnidadFuncionalPayload,
  Tipologia,
  UnidadFuncionalDetalle as UnidadFuncionalDetalleType,
} from '../types/unidadFuncional.types'

const ID_FORM = 'form-unidad-funcional'

type Modo = 'crear' | 'editar' | 'lectura'

interface UnidadFuncionalFormPageProps {
  modo: Modo
}

function valoresIniciales(): UnidadFuncionalFormValues {
  return {
    FK_proyecto: undefined as unknown as number,
    identificador: '',
    tipologia: '',
    superficie_cubierta: undefined as unknown as number,
    costo: undefined as unknown as number,
    piso: '',
    superficie_descubierta: undefined,
    comodidades: '',
    observaciones: '',
  }
}

function valoresDesdeUnidad(unidad: UnidadFuncionalDetalleType): UnidadFuncionalFormValues {
  return {
    FK_proyecto: unidad.FK_proyecto,
    identificador: unidad.identificador,
    tipologia: unidad.tipologia,
    superficie_cubierta: unidad.superficie_cubierta,
    costo: unidad.costo,
    piso: unidad.piso ?? '',
    superficie_descubierta: unidad.superficie_descubierta ?? undefined,
    comodidades: unidad.comodidades ?? '',
    observaciones: unidad.observaciones ?? '',
  }
}

/**
 * Formulario de Unidad Funcional en sus tres modos (HU-20): `crear`, `editar`
 * y `lectura`, controlados por el `modo` que le pasa el router — no por un
 * parámetro de la URL. Página propia, no modal: con galería de imágenes,
 * rinde mejor (ver README-integracion.md, decisión #1).
 *
 * El proyecto no se elige con un `<select>` sino con una tabla emergente
 * (`SelectorProyectoModal`) y, una vez creada, la unidad no puede cambiar de
 * proyecto: por eso el campo queda de solo lectura fuera del modo alta.
 *
 * El alta es en dos pasos (ver decisión #2 del README): al guardar la
 * cabecera, la página redirige a `editar` de la unidad recién creada, donde
 * la galería ya está habilitada.
 */
export function UnidadFuncionalFormPage({ modo }: UnidadFuncionalFormPageProps) {
  const { id } = useParams<{ id: string }>()
  const idUnidad = id ? Number(id) : null
  const navigate = useNavigate()
  const toast = useToast()

  const soloLectura = modo === 'lectura'
  const esAlta = modo === 'crear'

  const [modalProyectoAbierto, setModalProyectoAbierto] = useState(false)
  const [proyectoElegido, setProyectoElegido] = useState<ProyectoResumen | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)

  const {
    data: unidad,
    isPending: cargandoUnidad,
    error: errorUnidad,
    refetch: refetchUnidad,
  } = useUnidadFuncionalDetalle(esAlta ? null : idUnidad)

  const { data: tipologias } = useTipologias()
  const opcionesTipologia: SelectOption[] =
    tipologias?.map((item) => ({ value: item.id, label: item.code })) ?? []

  // Presupuesto y unidades cargadas/planificadas: se muestran apenas hay un
  // proyecto en contexto (elegido en el alta, o el de la unidad existente).
  const idProyectoActivo = esAlta ? (proyectoElegido?.id_proyecto ?? null) : (unidad?.FK_proyecto ?? null)
  const { data: proyectoDetalle } = useProyectoDetalle(idProyectoActivo)

  const crear = useCrearUnidadFuncional()
  const editar = useEditarUnidadFuncional()
  const guardando = crear.isPending || editar.isPending

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isDirty, isValid },
  } = useForm<UnidadFuncionalFormValues, unknown, UnidadFuncionalFormOutput>({
    resolver: zodResolver(unidadFuncionalFormSchema),
    defaultValues: valoresIniciales(),
    mode: 'onChange',
  })

  // Al cargar el detalle (editar/lectura), precarga el formulario y el proyecto elegido.
  useEffect(() => {
    if (esAlta || !unidad) return
    reset(valoresDesdeUnidad(unidad))
    setProyectoElegido({
      id_proyecto: unidad.proyecto.id_proyecto,
      codigo: unidad.proyecto.codigo,
      nombre: unidad.proyecto.nombre,
      estado: unidad.proyecto.estado,
    })
  }, [esAlta, unidad, reset])

  const costoDeshabilitado = soloLectura || unidad?.costo_editable === false

  function elegirProyecto(proyecto: ProyectoResumen, onChangeCampo: (valor: number) => void) {
    setProyectoElegido(proyecto)
    onChangeCampo(proyecto.id_proyecto)
    setModalProyectoAbierto(false)
  }

  function manejarErrorFormulario(error: ApiErrorResponse) {
    if (error.statusCode === 401) {
      navigate(PATHS.LOGIN, { replace: true })
      return
    }
    if (error.statusCode === 403) {
      toast.error('No tenés permisos para realizar esta acción')
      return
    }
    if (error.statusCode === 404) {
      toast.error('El proyecto o la unidad ya no existen')
      navigate(PATHS.COMERCIALIZACION.UNIDADES_FUNCIONALES, { replace: true })
      return
    }
    setErrorGeneral(repartirErrorDelBackend(error, setError, setFocus))
  }

  function manejarSubmit(payload: UnidadFuncionalFormOutput) {
    if (guardando) return
    setErrorGeneral(null)

    if (modo === 'crear') {
      const body: CrearUnidadFuncionalPayload = {
        FK_proyecto: payload.FK_proyecto,
        identificador: payload.identificador,
        tipologia: payload.tipologia as Tipologia,
        superficie_cubierta: payload.superficie_cubierta,
        costo: payload.costo,
        ...(payload.piso ? { piso: payload.piso } : {}),
        superficie_descubierta: payload.superficie_descubierta ?? undefined,
        ...(payload.comodidades ? { comodidades: payload.comodidades } : {}),
        ...(payload.observaciones ? { observaciones: payload.observaciones } : {}),
      }

      crear.mutate(body, {
        onSuccess: (nuevaUnidad) => {
          toast.success('Unidad funcional creada correctamente. Ahora podés cargar sus imágenes.')
          navigate(rutaEditarUnidadFuncional(nuevaUnidad.id_unidad_funcional), { replace: true })
        },
        onError: manejarErrorFormulario,
      })
      return
    }

    if (modo === 'editar' && unidad) {
      const body = soloCamposModificados(payload, unidad)

      if (Object.keys(body).length === 0) {
        toast.success('No había cambios para guardar')
        navigate(rutaDetalleUnidadFuncional(unidad.id_unidad_funcional))
        return
      }

      editar.mutate(
        { id: unidad.id_unidad_funcional, payload: body },
        {
          onSuccess: () => {
            toast.success('Unidad funcional actualizada correctamente')
            navigate(rutaDetalleUnidadFuncional(unidad.id_unidad_funcional))
          },
          onError: manejarErrorFormulario,
        }
      )
    }
  }

  function volver() {
    navigate(
      esAlta || !unidad
        ? PATHS.COMERCIALIZACION.UNIDADES_FUNCIONALES
        : rutaDetalleUnidadFuncional(unidad.id_unidad_funcional)
    )
  }

  function intentarVolver() {
    if (guardando) return
    if (isDirty && !soloLectura) {
      setConfirmarDescarte(true)
      return
    }
    volver()
  }

  if (!esAlta && cargandoUnidad) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="text-primary size-8" />
      </div>
    )
  }

  if (!esAlta && errorUnidad) {
    return (
      <ErrorState
        mensaje={formatearMensajeError(errorUnidad.message)}
        onReintentar={() => refetchUnidad()}
      />
    )
  }

  const titulo = esAlta
    ? 'Nueva Unidad Funcional'
    : soloLectura
      ? 'Detalle de la Unidad Funcional'
      : 'Editar Unidad Funcional'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-content text-subtitulo font-semibold">{titulo}</h1>
        <div className="flex gap-2">
          {soloLectura && unidad && (
            <Button
              variant="success"
              icon={<Pencil />}
              onClick={() => navigate(rutaEditarUnidadFuncional(unidad.id_unidad_funcional))}
            >
              Editar
            </Button>
          )}
          <Button variant="error" icon={<X />} onClick={intentarVolver} disabled={guardando}>
            {soloLectura ? 'Volver' : 'Cancelar'}
          </Button>
          {!soloLectura && (
            <Button
              variant="success"
              icon={<Check />}
              type="submit"
              form={ID_FORM}
              loading={guardando}
              disabled={!isValid || (modo === 'editar' && !isDirty)}
            >
              Guardar
            </Button>
          )}
        </div>
      </div>

      {errorGeneral && (
        <div role="alert" className="border-error/30 bg-error/10 rounded-md border px-4 py-3">
          <p className="text-error text-xs">{errorGeneral}</p>
        </div>
      )}

      <form id={ID_FORM} onSubmit={handleSubmit(manejarSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-content-muted text-xs font-medium uppercase">
            Proyecto <span className="text-error">*</span>
          </span>

          <Controller
            name="FK_proyecto"
            control={control}
            render={({ field }) => (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={proyectoElegido ? `${proyectoElegido.codigo} — ${proyectoElegido.nombre}` : ''}
                    placeholder="Elegí un proyecto"
                    error={errors.FK_proyecto?.message}
                    className="flex-1"
                  />
                  {esAlta && (
                    <Button
                      type="button"
                      variant="primary"
                      icon={<Building2 />}
                      onClick={() => setModalProyectoAbierto(true)}
                    >
                      {proyectoElegido ? 'Cambiar' : 'Elegir proyecto'}
                    </Button>
                  )}
                </div>

                <SelectorProyectoModal
                  open={modalProyectoAbierto}
                  onClose={() => setModalProyectoAbierto(false)}
                  onSeleccionar={(proyecto) => elegirProyecto(proyecto, field.onChange)}
                />
              </>
            )}
          />
        </div>

        {proyectoDetalle && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatTile
              label="Presupuesto del proyecto"
              value={formatearMoneda(proyectoDetalle.presupuesto)}
            />
            <StatTile
              label="Unidades cargadas / planificadas"
              value={`${proyectoDetalle.unidades_cargadas} / ${proyectoDetalle.cantidad_unidades_planificadas ?? '—'}`}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Identificador"
            required
            placeholder="Ej. 3A"
            disabled={soloLectura}
            error={errors.identificador?.message}
            {...register('identificador')}
          />

          <Select
            label="Tipología"
            required
            placeholder="Seleccioná una tipología"
            options={opcionesTipologia}
            disabled={soloLectura}
            error={errors.tipologia?.message}
            {...register('tipologia')}
          />

          <Input
            label="Superficie cubierta (m²)"
            required
            type="number"
            min={0}
            step="0.01"
            disabled={soloLectura}
            error={errors.superficie_cubierta?.message}
            {...register('superficie_cubierta', { valueAsNumber: true })}
          />

          <Input
            label="Superficie descubierta (m²)"
            type="number"
            min={0}
            step="0.01"
            helperText="Opcional"
            disabled={soloLectura}
            error={errors.superficie_descubierta?.message}
            {...register('superficie_descubierta', { valueAsNumber: true })}
          />

          <Input
            label="Piso"
            placeholder="Ej. PB"
            helperText="Opcional"
            disabled={soloLectura}
            error={errors.piso?.message}
            {...register('piso')}
          />

          <Input
            label="Costo"
            required
            type="number"
            min={0}
            step="0.01"
            disabled={costoDeshabilitado}
            helperText={
              costoDeshabilitado && unidad?.motivo_costo_no_editable
                ? unidad.motivo_costo_no_editable
                : 'En pesos. El sistema no registra monedas alternativas.'
            }
            error={errors.costo?.message}
            {...register('costo', { valueAsNumber: true })}
          />
        </div>

        <Input
          label="Comodidades"
          multiline
          helperText="Opcional"
          disabled={soloLectura}
          error={errors.comodidades?.message}
          {...register('comodidades')}
        />

        <Input
          label="Observaciones"
          multiline
          helperText="Opcional"
          disabled={soloLectura}
          error={errors.observaciones?.message}
          {...register('observaciones')}
        />

        {!esAlta && unidad && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-content-muted text-xs font-medium uppercase">
                Condición de entrega
              </span>
              <span className="text-content text-sm">{unidad.condicion_entrega.texto}</span>
            </div>

            <GaleriaImagenesForm
              idUnidadFuncional={unidad.id_unidad_funcional}
              identificador={unidad.identificador}
              imagenes={unidad.imagenes}
              soloLectura={soloLectura}
            />

            <AuditInfo
              className="mt-2"
              createdAt={unidad.hora_creacion}
              createdBy={{ nombre: `${unidad.usuarioCreador.nombre} ${unidad.usuarioCreador.apellido}` }}
              updatedAt={unidad.hora_actualizacion ?? undefined}
              updatedBy={
                unidad.usuarioActualizador
                  ? {
                      nombre: `${unidad.usuarioActualizador.nombre} ${unidad.usuarioActualizador.apellido}`,
                    }
                  : undefined
              }
            />
          </>
        )}

        {esAlta && (
          <p className="text-content-muted text-xs">
            Guardá la unidad para poder cargar sus imágenes: la galería se habilita apenas se crea.
          </p>
        )}
      </form>

      <ConfirmDialog
        open={confirmarDescarte}
        onCancel={() => setConfirmarDescarte(false)}
        onConfirm={() => {
          setConfirmarDescarte(false)
          volver()
        }}
        eyebrow="Cambios sin guardar"
        eyebrowIcon={<TriangleAlert />}
        title="¿Descartar los cambios?"
        note="Lo que cargaste en el formulario se va a perder."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
      />
    </div>
  )
}

/** Los campos del formulario, para saber qué issues del backend son de campo. */
const CAMPOS = [
  'FK_proyecto',
  'identificador',
  'tipologia',
  'superficie_cubierta',
  'superficie_descubierta',
  'costo',
  'piso',
  'comodidades',
  'observaciones',
] as const
type CampoDelFormulario = (typeof CAMPOS)[number]

function esCampoDelFormulario(campo: string): campo is CampoDelFormulario {
  return CAMPOS.includes(campo as CampoDelFormulario)
}

/** Manda cada error del backend a donde corresponda y devuelve lo que quedó sin dueño, para el banner. */
function repartirErrorDelBackend(
  error: ApiErrorResponse,
  setError: UseFormSetError<UnidadFuncionalFormValues>,
  setFocus: (campo: CampoDelFormulario) => void
): string | null {
  if (error.statusCode === 400 && esArrayDeValidationIssues(error.message)) {
    const issuesDeCampo = error.message.filter((issue) => esCampoDelFormulario(issue.campo))
    const resto = error.message.filter((issue) => !esCampoDelFormulario(issue.campo))

    for (const issue of issuesDeCampo) {
      setError(issue.campo as CampoDelFormulario, { message: issue.error })
    }
    if (issuesDeCampo.length > 0) setFocus(issuesDeCampo[0].campo as CampoDelFormulario)

    return resto.length > 0 ? formatearMensajeError(resto) : null
  }

  // 409 (costo congelado, identificador duplicado, proyecto que no admite
  // altas, proyecto cancelado, etc.): el backend ya redacta el mensaje final.
  return formatearMensajeError(error.message)
}

/** Solo manda lo que cambió respecto a la unidad original — incluido el costo, salvo que esté deshabilitado. */
function soloCamposModificados(
  payload: UnidadFuncionalFormOutput,
  original: UnidadFuncionalDetalleType
): EditarUnidadFuncionalPayload {
  const cambios: EditarUnidadFuncionalPayload = {}

  if (payload.identificador !== original.identificador) cambios.identificador = payload.identificador
  if (payload.tipologia !== original.tipologia) cambios.tipologia = payload.tipologia as Tipologia
  if (payload.superficie_cubierta !== original.superficie_cubierta) {
    cambios.superficie_cubierta = payload.superficie_cubierta
  }
  if (payload.costo !== original.costo) cambios.costo = payload.costo

  const superficieDescubiertaNueva = payload.superficie_descubierta ?? null
  if (superficieDescubiertaNueva !== original.superficie_descubierta) {
    cambios.superficie_descubierta = superficieDescubiertaNueva
  }

  agregarSiCambioTexto(cambios, 'piso', payload.piso, original.piso)
  agregarSiCambioTexto(cambios, 'comodidades', payload.comodidades, original.comodidades)
  agregarSiCambioTexto(cambios, 'observaciones', payload.observaciones, original.observaciones)

  return cambios
}

function agregarSiCambioTexto(
  cambios: EditarUnidadFuncionalPayload,
  campo: 'piso' | 'comodidades' | 'observaciones',
  nuevo: string | undefined,
  original: string | null
) {
  const valorNuevo = nuevo ?? ''
  if (valorNuevo !== (original ?? '')) cambios[campo] = valorNuevo
}
