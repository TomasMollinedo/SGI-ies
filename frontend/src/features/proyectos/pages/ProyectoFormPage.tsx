import { useEffect, useState } from 'react'
import type { UseFormSetError } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, Check, Eye, Info, ShieldAlert, TriangleAlert, X } from 'lucide-react'
import { PATHS, rutaDetalleProyecto, rutaEditarProyecto } from '@/app/router/paths'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { AuditoriaProyecto } from '../components/AuditoriaProyecto'
import { CabeceraProyecto } from '../components/CabeceraProyecto'
import { ProyectoForm } from '../components/ProyectoForm'
import { useProyectoForm } from '../hooks/useProyectoForm'
import { useCrearProyecto, useEditarProyecto, useProyectoDetalle } from '../hooks/useProyectos'
import type { ProyectoFormOutput, ProyectoFormValues } from '../types/proyecto.schema'
import { armarPayloadAlta, armarPayloadEdicion } from '../utils/payloadProyecto'
import {
  esProyectoModificable,
  motivoNoSePuedeDarDeBaja,
  siguienteEstadoObra,
} from '../utils/reglasProyecto'

const ID_FORM = 'form-proyecto'

type Modo = 'crear' | 'editar'
/** A dónde vuelve el formulario si hay cambios sin guardar y hay que confirmar antes de salir. */
type Destino = 'listado' | 'detalle'

interface ProyectoFormPageProps {
  modo: Modo
}

/**
 * Alta y edición de un proyecto (HU-31). El modo lo define el router, no un
 * parámetro de la URL; la LECTURA es `ProyectoDetallePage`, con el mismo
 * `ProyectoForm`.
 *
 * El alta es en dos pasos: al guardar, la página redirige a `editar` del
 * proyecto recién creado, donde la galería de diseño ya está habilitada.
 *
 * Un proyecto dado de baja o Cancelado no se puede editar: en vez del
 * formulario se muestra un aviso con acceso al detalle.
 */
export function ProyectoFormPage({ modo }: ProyectoFormPageProps) {
  const { idProyecto } = useParams<{ idProyecto: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const esAlta = modo === 'crear'
  const id = !esAlta && idProyecto ? Number(idProyecto) : null

  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [confirmarSalida, setConfirmarSalida] = useState<Destino | null>(null)
  const [subiendoPortada, setSubiendoPortada] = useState(false)

  const {
    data: proyecto,
    isPending: cargandoProyecto,
    error: errorProyecto,
    refetch: refetchProyecto,
  } = useProyectoDetalle(id)

  const form = useProyectoForm(esAlta ? undefined : proyecto)
  const { isDirty, isValid } = form.formState

  const crear = useCrearProyecto()
  const editar = useEditarProyecto()
  const guardando = crear.isPending || editar.isPending

  const statusCodeCarga = errorProyecto?.statusCode

  // El interceptor del httpClient ya intenta renovar la sesión; si igual llega
  // un 401 es que no hay sesión recuperable.
  useEffect(() => {
    if (statusCodeCarga === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCodeCarga, navigate])

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
      toast.error('El proyecto ya no existe')
      navigate(PATHS.PROYECTOS.ROOT, { replace: true })
      return
    }
    // Un 409 que no es del nombre dice que lo que se ve está viejo (cargaron
    // unidades, lo dieron de baja, lo finalizaron): se vuelve a pedir el
    // proyecto. Lo que el usuario tenía cargado en el formulario no se pisa.
    if (error.statusCode === 409 && !esAlta) refetchProyecto()

    setErrorGeneral(repartirErrorDelBackend(error, form.setError, form.setFocus))
  }

  function manejarSubmit(valores: ProyectoFormOutput) {
    if (guardando || subiendoPortada) return
    setErrorGeneral(null)

    if (esAlta) {
      crear.mutate(armarPayloadAlta(valores), {
        onSuccess: (nuevoProyecto) => {
          toast.success('Proyecto creado correctamente. Ahora podés cargar sus imágenes de diseño.')
          navigate(rutaEditarProyecto(nuevoProyecto.id_proyecto), { replace: true })
        },
        onError: manejarErrorFormulario,
      })
      return
    }

    if (!proyecto) return

    const payload = armarPayloadEdicion(valores, proyecto)

    if (Object.keys(payload).length === 0) {
      toast.success('No había cambios para guardar')
      navigate(rutaDetalleProyecto(proyecto.id_proyecto))
      return
    }

    editar.mutate(
      { id: proyecto.id_proyecto, payload },
      {
        onSuccess: () => {
          toast.success('Proyecto actualizado correctamente')
          navigate(rutaDetalleProyecto(proyecto.id_proyecto))
        },
        onError: manejarErrorFormulario,
      }
    )
  }

  /** Ejecuta la salida sin preguntar nada: la usa tanto el botón directo como la confirmación de descarte. */
  function ejecutarSalida(destino: Destino) {
    if (destino === 'listado' || !proyecto) {
      navigate(PATHS.PROYECTOS.ROOT)
      return
    }
    navigate(rutaDetalleProyecto(proyecto.id_proyecto))
  }

  /** Punto único de salida: con cambios sin guardar pide confirmación antes de irse. */
  function salirHacia(destino: Destino) {
    if (guardando) return
    if (isDirty) {
      setConfirmarSalida(destino)
      return
    }
    ejecutarSalida(destino)
  }

  const botonVolver = (
    <Button
      size="sm"
      icon={<ArrowLeft />}
      onClick={() => salirHacia('listado')}
      disabled={guardando}
      title="Volver al listado de proyectos"
    >
      Volver a Proyectos
    </Button>
  )

  if (!esAlta && statusCodeCarga === 403) {
    return (
      <EmptyState
        icono={ShieldAlert}
        titulo="No tenés permisos para acceder a esta sección"
        descripcion="Se requiere el rol Administrador."
      />
    )
  }

  if (!esAlta && errorProyecto) {
    return (
      <div className="space-y-4">
        {botonVolver}
        {statusCodeCarga !== 401 && (
          <ErrorState
            mensaje={formatearMensajeError(errorProyecto.message)}
            onReintentar={() => refetchProyecto()}
          />
        )}
      </div>
    )
  }

  if (!esAlta && (cargandoProyecto || !proyecto)) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="text-primary size-8" />
      </div>
    )
  }

  // Dado de baja o Cancelado: el backend rechaza cualquier edición, así que no
  // se ofrece el formulario editable.
  if (proyecto && !esProyectoModificable(proyecto)) {
    return (
      <div className="space-y-4">
        {botonVolver}
        <CabeceraProyecto
          titulo={proyecto.nombre}
          proyecto={proyecto}
          acciones={
            <Button
              icon={<Eye />}
              onClick={() => navigate(rutaDetalleProyecto(proyecto.id_proyecto))}
            >
              Ver detalle
            </Button>
          }
        />
        <div
          role="alert"
          className="border-warning/30 bg-warning-soft text-warning flex items-start gap-2 rounded-md border px-4 py-3 text-xs"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            {proyecto.estado
              ? 'Este proyecto está Cancelado: no se puede editar.'
              : 'Este proyecto está dado de baja: no se puede editar.'}{' '}
            Sus datos se pueden consultar desde el detalle.
          </p>
        </div>
      </div>
    )
  }

  // El avance del estado de obra y la baja no están en esta pantalla (HU-31:
  // se hacen desde el detalle). El aviso solo aparece si el proyecto tiene
  // alguna de las dos disponible: en un Finalizado no hay nada que gestionar.
  const tieneAccionesEnElDetalle =
    !esAlta &&
    proyecto !== undefined &&
    (siguienteEstadoObra(proyecto) !== null || motivoNoSePuedeDarDeBaja(proyecto) === null)

  return (
    <div className="space-y-4">
      {botonVolver}

      <CabeceraProyecto
        titulo={esAlta ? 'Nuevo proyecto' : (proyecto?.nombre ?? '')}
        proyecto={esAlta ? undefined : proyecto}
        acciones={
          <>
            {/* Misma salida que Cancelar: con cambios sin guardar pide confirmación. */}
            {!esAlta && (
              <Button icon={<Eye />} onClick={() => salirHacia('detalle')} disabled={guardando}>
                Ver detalle
              </Button>
            )}
            {!esAlta && (
              <Button
                variant="error"
                icon={<X />}
                onClick={() => salirHacia('detalle')}
                disabled={guardando}
              >
                Cancelar
              </Button>
            )}
            <Button
              variant="success"
              icon={<Check />}
              type="submit"
              form={ID_FORM}
              loading={guardando}
              disabled={!isValid || subiendoPortada || (!esAlta && !isDirty)}
            >
              Guardar
            </Button>
          </>
        }
      />

      {tieneAccionesEnElDetalle && (
        <div
          role="note"
          className="border-warning/30 bg-warning-soft text-warning flex items-start gap-2 rounded-md border px-4 py-3 text-xs"
        >
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>El estado de obra y la baja se gestionan desde el detalle del proyecto.</p>
        </div>
      )}

      {errorGeneral && (
        <div role="alert" className="border-error/30 bg-error/10 rounded-md border px-4 py-3">
          <p className="text-error text-xs">{errorGeneral}</p>
        </div>
      )}

      <ProyectoForm
        modo={modo}
        form={form}
        proyecto={esAlta ? undefined : proyecto}
        idForm={ID_FORM}
        onSubmit={manejarSubmit}
        onSubiendoPortadaChange={setSubiendoPortada}
      />

      {!esAlta && proyecto && <AuditoriaProyecto proyecto={proyecto} />}

      <ConfirmDialog
        open={confirmarSalida !== null}
        onCancel={() => setConfirmarSalida(null)}
        onConfirm={() => {
          if (confirmarSalida) ejecutarSalida(confirmarSalida)
          setConfirmarSalida(null)
        }}
        eyebrow="Cambios sin guardar"
        eyebrowIcon={<TriangleAlert />}
        title="¿Descartar los cambios?"
        note="Lo que cargaste en el formulario se va a perder. Las imágenes de diseño ya agregadas o quitadas no cambian: se guardan al momento."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
      />
    </div>
  )
}

/**
 * Arranque del mensaje del 409 de nombre repetido. Lo arma
 * `validarNombreUnicoEntreActivos` con la `entidadActiva` que le pasa
 * `ProyectoService.validarNombreUnico` (backend/src/modules/proyectos/
 * proyecto.service.ts): `Ya existe un proyecto activo con el nombre "X"`. El
 * backend no manda un código de error, así que es lo único que lo distingue
 * de los demás 409. Si cambia allá, se cambia acá.
 */
const PREFIJO_NOMBRE_REPETIDO = 'Ya existe un proyecto activo'

/** Los campos del formulario, para saber qué issues del backend son de campo. */
const CAMPOS = [
  'nombre',
  'direccion',
  'localidad',
  'cantidad_unidades_planificadas',
  'descripcion',
  'fecha_inicio',
  'fecha_fin_estimada',
  'imagen_portada_url',
] as const
type CampoDelFormulario = (typeof CAMPOS)[number]

function esCampoDelFormulario(campo: string): campo is CampoDelFormulario {
  return CAMPOS.includes(campo as CampoDelFormulario)
}

/** Manda cada error del backend a donde corresponda y devuelve lo que quedó sin dueño, para el banner. */
function repartirErrorDelBackend(
  error: ApiErrorResponse,
  setError: UseFormSetError<ProyectoFormValues>,
  setFocus: (campo: CampoDelFormulario) => void
): string | null {
  // 400 de validación del DTO: cada issue va a su campo.
  if (error.statusCode === 400 && esArrayDeValidationIssues(error.message)) {
    const issuesDeCampo = error.message.filter((issue) => esCampoDelFormulario(issue.campo))
    const resto = error.message.filter((issue) => !esCampoDelFormulario(issue.campo))

    for (const issue of issuesDeCampo) {
      setError(issue.campo as CampoDelFormulario, { message: issue.error })
    }
    // La portada no es un control enfocable: el error se ve debajo, sin foco.
    const primerCampo = issuesDeCampo.find((issue) => issue.campo !== 'imagen_portada_url')
    if (primerCampo) setFocus(primerCampo.campo as CampoDelFormulario)

    return resto.length > 0 ? formatearMensajeError(resto) : null
  }

  const mensaje = formatearMensajeError(error.message)

  // 409 de nombre repetido entre proyectos activos: va al campo nombre.
  if (error.statusCode === 409 && mensaje.startsWith(PREFIJO_NOMBRE_REPETIDO)) {
    setError('nombre', { message: mensaje })
    setFocus('nombre')
    return null
  }

  // El resto (los demás 409, el 400 de fechas cruzadas contra lo guardado, que
  // llega como texto suelto, y los 5xx): el backend ya redacta el mensaje.
  return mensaje
}
