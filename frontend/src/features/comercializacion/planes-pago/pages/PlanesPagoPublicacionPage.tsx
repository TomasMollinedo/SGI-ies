import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, Plus, ShieldAlert } from 'lucide-react'
import { PATHS, rutaDetallePublicacion } from '@/app/router/paths'
import { usePublicacionDetalle } from '@/features/comercializacion/publicaciones/hooks/usePublicaciones'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Button } from '@/shared/components/ui/Button'
import { Select } from '@/shared/components/ui/Select'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { CambiarEstadoPlanModal } from '../components/CambiarEstadoPlanModal'
import { ContextoPublicacion } from '../components/ContextoPublicacion'
import { PlanPagoCard } from '../components/PlanPagoCard'
import { PlanPagoForm } from '../components/PlanPagoForm'
import {
  ESTADO_PLAN_POR_DEFECTO,
  OPCIONES_ESTADO_PLAN,
  esFiltroEstadoPlan,
  tieneVenta,
} from '../config/planPago.config'
import { usePlanesPago } from '../hooks/usePlanesPago'
import type { PlanPago } from '../types/planPago.types'
import { aNumero } from '../utils/decimal'

/** Qué formulario está abierto: un alta, la edición de un plan, o ninguno. */
type FormularioAbierto = { tipo: 'alta' } | { tipo: 'edicion'; idPlan: number } | null

/**
 * Planes de pago de una publicación (HU-22).
 *
 * Se llega desde el detalle de la publicación (T104), que es de donde salen
 * los dos datos de contexto que se muestran arriba y de solo lectura: el costo
 * de la unidad —la referencia contra la que se cargan los precios— y el estado
 * comercial, que además define si las condiciones económicas se pueden editar.
 *
 * El estado comercial no se toca desde acá: lo mueve el backend solo, según
 * cuántos planes activos le queden a la publicación. Como el PATCH de un plan
 * devuelve el plan y no la publicación, ese dato se relee del detalle, que las
 * mutaciones invalidan (ver `usePlanesPago`).
 */
export function PlanesPagoPublicacionPage() {
  const navigate = useNavigate()
  const { idPublicacion } = useParams()

  const [estado, setEstado] = useState<string>(ESTADO_PLAN_POR_DEFECTO)
  const [formulario, setFormulario] = useState<FormularioAbierto>(null)
  const [planACambiarEstado, setPlanACambiarEstado] = useState<PlanPago | null>(null)

  // Un id que no sea un entero positivo no se le pide al backend: la URL la
  // puede editar cualquiera a mano.
  const idNumerico = Number(idPublicacion)
  const idValido = Number.isInteger(idNumerico) && idNumerico > 0 ? idNumerico : null

  const {
    data: publicacion,
    isLoading: cargandoPublicacion,
    error: errorPublicacion,
    refetch: recargarPublicacion,
  } = usePublicacionDetalle(idValido)

  const {
    data: planes,
    isLoading: cargandoPlanes,
    error: errorPlanes,
    refetch: recargarPlanes,
  } = usePlanesPago(
    idValido === null
      ? null
      : {
          FK_publicacion: idValido,
          estado: esFiltroEstadoPlan(estado) ? estado : ESTADO_PLAN_POR_DEFECTO,
        }
  )

  const statusCode = errorPublicacion?.statusCode ?? errorPlanes?.statusCode

  useEffect(() => {
    if (statusCode === 401) navigate(PATHS.LOGIN, { replace: true })
  }, [statusCode, navigate])

  const volver = (
    <Button
      size="sm"
      icon={<ArrowLeft />}
      onClick={() =>
        navigate(
          idValido === null
            ? PATHS.COMERCIALIZACION.PUBLICACIONES
            : rutaDetallePublicacion(idValido)
        )
      }
      title="Volver al detalle de la publicación"
    >
      Volver a la publicación
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

  if (idValido === null || errorPublicacion?.statusCode === 404) {
    return (
      <div className="space-y-4">
        {volver}
        <EmptyState
          titulo="No se encontró la publicación"
          descripcion="Puede no existir, o el enlace estar mal formado."
        />
      </div>
    )
  }

  if (errorPublicacion && statusCode !== 401) {
    return (
      <div className="space-y-4">
        {volver}
        <ErrorState
          mensaje={formatearMensajeError(errorPublicacion.message)}
          onReintentar={() => recargarPublicacion()}
        />
      </div>
    )
  }

  if (cargandoPublicacion || !publicacion) {
    return (
      <div className="space-y-4">
        {volver}
        <div className="flex justify-center py-10">
          <Spinner size={32} />
        </div>
      </div>
    )
  }

  const costo = aNumero(publicacion.unidad.costo)
  const edicionBloqueada = tieneVenta(publicacion.estado_comercial)
  const listaPlanes = planes ?? []

  return (
    <div className="space-y-4">
      {volver}

      <ContextoPublicacion publicacion={publicacion} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <Select
          options={OPCIONES_ESTADO_PLAN}
          size="sm"
          value={estado}
          onChange={(evento) => setEstado(evento.target.value)}
          aria-label="Filtrar planes por estado"
          className="w-auto min-w-40"
        />

        <Button icon={<Plus />} onClick={() => setFormulario({ tipo: 'alta' })}>
          Nuevo plan
        </Button>
      </div>

      {errorPlanes && statusCode !== 401 ? (
        <ErrorState
          mensaje={formatearMensajeError(errorPlanes.message)}
          onReintentar={() => recargarPlanes()}
        />
      ) : cargandoPlanes ? (
        <div className="flex justify-center py-10">
          <Spinner size={32} />
        </div>
      ) : listaPlanes.length === 0 ? (
        <EmptyState
          titulo={
            estado === 'true'
              ? 'Esta publicación no tiene planes activos'
              : 'No hay planes con ese filtro'
          }
          descripcion={
            estado === 'true'
              ? 'Cargá el primero con «Nuevo plan». Hasta que no tenga uno activo, la unidad no se ve en el catálogo.'
              : 'Probá cambiar el filtro de estado.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {listaPlanes.map((plan) => (
            <PlanPagoCard
              key={plan.id_plan_pago}
              plan={plan}
              edicionBloqueada={edicionBloqueada}
              onEditar={() => setFormulario({ tipo: 'edicion', idPlan: plan.id_plan_pago })}
              onCambiarEstado={() => setPlanACambiarEstado(plan)}
            />
          ))}
        </div>
      )}

      {formulario && (
        <PlanPagoForm
          idPublicacion={idValido}
          costo={costo}
          estadoComercial={publicacion.estado_comercial}
          idPlan={formulario.tipo === 'edicion' ? formulario.idPlan : null}
          onClose={() => setFormulario(null)}
          onGuardado={() => setFormulario(null)}
        />
      )}

      {planACambiarEstado && (
        <CambiarEstadoPlanModal
          plan={planACambiarEstado}
          onClose={() => setPlanACambiarEstado(null)}
          onCambiado={() => setPlanACambiarEstado(null)}
        />
      )}
    </div>
  )
}
