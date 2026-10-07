import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, Pencil, ShieldAlert, Trash2, TriangleAlert } from 'lucide-react'
import { PATHS, rutaEditarProyecto } from '@/app/router/paths'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { Spinner } from '@/shared/components/ui/Spinner'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { AuditoriaProyecto } from '../components/AuditoriaProyecto'
import { CabeceraProyecto } from '../components/CabeceraProyecto'
import { ProyectoForm } from '../components/ProyectoForm'
import { ResumenComercialProyecto } from '../components/ResumenComercialProyecto'
import { SituacionComercialProyecto } from '../components/SituacionComercialProyecto'
import { UnidadesFichaProyecto } from '../components/UnidadesFichaProyecto'
import { ESTADO_PROYECTO_LABEL } from '../config/proyecto.config'
import { useProyectoForm } from '../hooks/useProyectoForm'
import {
  useCambiarEstadoObraProyecto,
  useDarDeBajaProyecto,
  useProyectoDetalle,
  useProyectoFicha,
} from '../hooks/useProyectos'
import {
  esProyectoModificable,
  motivoNoSePuedeAvanzar,
  motivoNoSePuedeDarDeBaja,
  siguienteEstadoObra,
} from '../utils/reglasProyecto'

type Confirmacion = 'avanzar' | 'baja'

/**
 * Detalle de un proyecto (HU-31): el formulario en modo LECTURA, el estado de
 * obra y la baja lógica bien visibles, la auditoría y las acciones Editar,
 * Avanzar estado de obra y Dar de baja. El avance de estado se hace solo desde
 * acá, con confirmación, y nunca ofrece volver atrás.
 *
 * Sobre esa base (T123) van las secciones de la ficha (T125): el resumen y la
 * situación comercial arriba, y la lista de unidades debajo del formulario.
 * Salen de una query aparte, así que la página no las espera ni se cae con ellas.
 */
export function ProyectoDetallePage() {
  const { idProyecto } = useParams<{ idProyecto: string }>()
  const id = idProyecto ? Number(idProyecto) : null
  const navigate = useNavigate()
  const toast = useToast()

  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null)
  const [errorConfirmacion, setErrorConfirmacion] = useState<ApiErrorResponse | null>(null)

  const { data: proyecto, isPending, error, refetch } = useProyectoDetalle(id)
  const form = useProyectoForm(proyecto)

  const fichaQuery = useProyectoFicha(id)
  // Con error no se muestra lo que haya quedado de una carga anterior: esos
  // números pueden estar viejos.
  const ficha = fichaQuery.isError ? undefined : fichaQuery.data
  // Al reintentar tras un error la query sigue en error hasta que responde
  // (`isPending` queda en false): sin esto no habría ninguna señal de carga.
  const cargandoFicha = fichaQuery.isPending || (fichaQuery.isError && fichaQuery.isFetching)

  const cambiarEstadoObra = useCambiarEstadoObraProyecto()
  const baja = useDarDeBajaProyecto()
  const operacionEnCurso = cambiarEstadoObra.isPending || baja.isPending

  const statusCode = error?.statusCode

  // El interceptor del httpClient ya intenta renovar la sesión; si igual llega
  // un 401 es que no hay sesión recuperable.
  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  function abrirConfirmacion(tipo: Confirmacion) {
    setErrorConfirmacion(null)
    setConfirmacion(tipo)
  }

  function cerrarConfirmacion() {
    setConfirmacion(null)
    setErrorConfirmacion(null)
  }

  function manejarErrorConfirmacion(errorDeOperacion: ApiErrorResponse) {
    switch (errorDeOperacion.statusCode) {
      case 401:
        navigate(PATHS.LOGIN, { replace: true })
        return
      case 403:
        toast.error('No tenés permisos para realizar esta acción')
        cerrarConfirmacion()
        return
      case 404:
        toast.error('El proyecto ya no existe')
        navigate(PATHS.PROYECTOS.ROOT, { replace: true })
        return
      default:
        // 409: lo que se ve está viejo (otro usuario lo avanzó, lo dio de baja
        // o cambiaron sus unidades). Se vuelve a pedir el proyecto y el motivo
        // del backend se muestra dentro del diálogo.
        if (errorDeOperacion.statusCode === 409) refetch()
        setErrorConfirmacion(errorDeOperacion)
    }
  }

  const botonVolver = (
    <Button
      size="sm"
      icon={<ArrowLeft />}
      onClick={() => navigate(PATHS.PROYECTOS.ROOT)}
      title="Volver al listado de proyectos"
    >
      Volver a Proyectos
    </Button>
  )

  if (statusCode === 403) {
    return (
      <EmptyState
        icono={ShieldAlert}
        titulo="No tenés permisos para acceder a esta sección"
        descripcion="Se requiere el rol Administrador."
      />
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        {botonVolver}
        {statusCode !== 401 && (
          <ErrorState
            mensaje={formatearMensajeError(error.message)}
            onReintentar={() => refetch()}
          />
        )}
      </div>
    )
  }

  if (isPending || !proyecto) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="text-primary size-8" />
      </div>
    )
  }

  const estadoSiguiente = siguienteEstadoObra(proyecto)
  const motivoSinAvance = motivoNoSePuedeAvanzar(proyecto)
  // La baja solo se ofrece en proyectos activos: no hay reactivación.
  const motivoSinBaja = proyecto.estado ? motivoNoSePuedeDarDeBaja(proyecto) : null
  const etiquetaSiguiente = estadoSiguiente ? ESTADO_PROYECTO_LABEL[estadoSiguiente] : ''

  function ejecutarConfirmacion() {
    if (!proyecto || !confirmacion) return
    setErrorConfirmacion(null)

    if (confirmacion === 'baja') {
      baja.mutate(proyecto.id_proyecto, {
        onSuccess: () => {
          toast.success('Proyecto dado de baja correctamente')
          cerrarConfirmacion()
        },
        onError: manejarErrorConfirmacion,
      })
      return
    }

    if (!estadoSiguiente) return
    cambiarEstadoObra.mutate(
      { id: proyecto.id_proyecto, estadoObra: estadoSiguiente },
      {
        onSuccess: () => {
          toast.success(`El proyecto pasó a ${etiquetaSiguiente}`)
          cerrarConfirmacion()
        },
        onError: manejarErrorConfirmacion,
      }
    )
  }

  const esBaja = confirmacion === 'baja'
  const esConflicto = errorConfirmacion?.statusCode === 409

  return (
    <div className="space-y-4">
      {botonVolver}

      <CabeceraProyecto
        titulo={proyecto.nombre}
        proyecto={proyecto}
        acciones={
          <>
            {esProyectoModificable(proyecto) && (
              <Button
                variant="success"
                icon={<Pencil />}
                onClick={() => navigate(rutaEditarProyecto(proyecto.id_proyecto))}
              >
                Editar
              </Button>
            )}
            {/* Solo el estado siguiente: sin siguiente (Finalizado, Cancelado o
                dado de baja) el botón directamente no existe. */}
            {estadoSiguiente && (
              <Button
                icon={<ArrowRight />}
                disabled={motivoSinAvance !== null}
                onClick={() => abrirConfirmacion('avanzar')}
              >
                Pasar a {etiquetaSiguiente}
              </Button>
            )}
            {proyecto.estado && (
              <Button
                variant="error"
                icon={<Trash2 />}
                disabled={motivoSinBaja !== null}
                onClick={() => abrirConfirmacion('baja')}
              >
                Dar de baja
              </Button>
            )}
          </>
        }
      >
        {(motivoSinAvance || motivoSinBaja) && (
          <ul className="text-content-muted flex flex-col gap-1 text-xs">
            {motivoSinAvance && (
              <li>
                <span className="font-medium">No se puede pasar a {etiquetaSiguiente}:</span>{' '}
                {motivoSinAvance}
              </li>
            )}
            {motivoSinBaja && (
              <li>
                <span className="font-medium">No se puede dar de baja:</span> {motivoSinBaja}
              </li>
            )}
          </ul>
        )}
      </CabeceraProyecto>

      {!proyecto.estado && (
        <div
          role="status"
          className="border-warning/30 bg-warning-soft text-warning flex items-start gap-2 rounded-md border px-4 py-3 text-xs"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            Este proyecto está dado de baja: se conserva para consulta, pero no se puede editar ni
            cambiar su estado de obra.
          </p>
        </div>
      )}

      <ResumenComercialProyecto proyecto={proyecto} ficha={ficha} cargandoFicha={cargandoFicha} />

      <SituacionComercialProyecto
        ficha={ficha}
        cargando={cargandoFicha}
        error={fichaQuery.error ? formatearMensajeError(fichaQuery.error.message) : null}
        onReintentar={() => fichaQuery.refetch()}
      />

      <ProyectoForm modo="lectura" form={form} proyecto={proyecto} />

      {/* Si la ficha falló, el error ya está en la situación comercial: no se repite. */}
      {(!fichaQuery.isError || cargandoFicha) && (
        <UnidadesFichaProyecto
          idProyecto={proyecto.id_proyecto}
          unidades={ficha?.unidades}
          cargando={cargandoFicha}
        />
      )}

      <AuditoriaProyecto proyecto={proyecto} />

      <ConfirmDialog
        open={confirmacion !== null}
        onCancel={cerrarConfirmacion}
        onConfirm={ejecutarConfirmacion}
        variant={esBaja ? 'baja' : 'reactivar'}
        eyebrow={esBaja ? 'Dar de baja proyecto' : 'Avanzar estado de obra'}
        title={
          esBaja
            ? `¿Confirmás que querés dar de baja el proyecto «${proyecto.nombre}»?`
            : `¿Confirmás que el proyecto «${proyecto.nombre}» pasa a ${etiquetaSiguiente}?`
        }
        details={[
          { label: 'Código', value: proyecto.codigo },
          { label: 'Estado de obra actual', value: ESTADO_PROYECTO_LABEL[proyecto.estado_obra] },
          ...(esBaja ? [] : [{ label: 'Estado de obra nuevo', value: etiquetaSiguiente }]),
        ]}
        note={errorConfirmacion ? undefined : notaConfirmacion(esBaja, estadoSiguiente)}
        error={errorConfirmacion ? formatearMensajeError(errorConfirmacion.message) : null}
        // Ningún conflicto se arregla reintentando lo mismo: solo queda cerrar.
        hideConfirm={esConflicto}
        confirmLabel={esBaja ? 'Dar de baja' : `Pasar a ${etiquetaSiguiente}`}
        cancelLabel={esConflicto ? 'Cerrar' : 'Cancelar'}
        loading={operacionEnCurso}
      />
    </div>
  )
}

function notaConfirmacion(esBaja: boolean, estadoSiguiente: string | null): string {
  if (esBaja) {
    return 'La baja es lógica: el proyecto deja de listarse entre los activos, pero no se elimina ningún dato y se puede seguir consultando con el filtro "Dados de baja". No se puede reactivar.'
  }
  const sinRetroceso = 'El avance del estado de obra no se puede deshacer: no hay vuelta atrás.'
  return estadoSiguiente === 'FINALIZADO'
    ? `${sinRetroceso} Además, con el proyecto Finalizado la fecha de finalización estimada ya no se va a poder editar.`
    : sinRetroceso
}
