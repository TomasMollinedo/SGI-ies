import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, Ban, Printer, ShieldAlert } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import { DataTable } from '@/shared/components/common/DataTable'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { ErrorState } from '@/shared/components/estados-pantalla/ErrorState'
import { Spinner } from '@/shared/components/estados-pantalla/Spinner'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { AnularCobroModal } from '../components/AnularCobroModal'
import { ReciboCobroImpresion } from '../components/ReciboCobroImpresion'
import {
  COLUMNAS_DETALLE_COBRO,
  ORIGEN_COBRO_LABEL,
  badgeEstadoCobro,
  nombreUsuario,
  textoOSinDato,
} from '../config/cobro.config'
import { useAnularCobro, useCobroDetalle } from '../hooks/useCobros'
import { nombreCliente } from '../utils/cliente'
import { formatearCodigoCobro } from '../utils/codigoCobro'

/**
 * Detalle de un cobro (HU-30, T114): cabecera, imputaciones con el saldo
 * anterior y posterior de cada cuota (tal como los guardó el backend),
 * trazabilidad, y las acciones Imprimir (recibo, en cualquier estado) y
 * Anular (solo CONFIRMADO). Molde visual: `VentaDetallePage` + el contenido
 * de `PagoDetalleModal`.
 *
 * Un `:idCobro` que no es un entero positivo se trata como 404 sin pedirle
 * nada al backend.
 */
export function CobroDetallePage() {
  const params = useParams<{ idCobro: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const idCobro = parsearIdCobro(params.idCobro)
  const { data: cobro, isLoading, error, refetch } = useCobroDetalle(idCobro)
  const anular = useAnularCobro()

  const [anulando, setAnulando] = useState(false)
  const [errorAnular, setErrorAnular] = useState<ApiErrorResponse | null>(null)

  const esInexistente = idCobro === null || error?.statusCode === 404

  // Ref para no duplicar el toast si el efecto corre dos veces (StrictMode).
  const avisoInexistenteRef = useRef(false)
  useEffect(() => {
    if (!esInexistente || avisoInexistenteRef.current) return
    avisoInexistenteRef.current = true
    toast.error('El cobro no existe')
    navigate(PATHS.TESORERIA.COBRANZAS.ROOT, { replace: true })
  }, [esInexistente, toast, navigate])

  function ejecutarAnular(motivo: string) {
    if (!cobro) return
    setErrorAnular(null)
    anular.mutate(
      { id: cobro.id_cobro, payload: { motivo_anulacion: motivo } },
      {
        onSuccess: (anulado) => {
          toast.success(`Cobro ${formatearCodigoCobro(anulado.id_cobro)} anulado.`)
          setAnulando(false)
        },
        onError: (errorAnulacion) => {
          if (errorAnulacion.statusCode === 401) {
            navigate(PATHS.LOGIN, { replace: true })
            return
          }
          if (errorAnulacion.statusCode === 403) {
            toast.error('No tenés permisos para realizar esta acción')
            setAnulando(false)
            return
          }
          // 404/409 (ya anulado por otra vía) y validaciones: quedan visibles en el modal.
          setErrorAnular(errorAnulacion)
          if (errorAnulacion.statusCode === 409) refetch()
        },
      }
    )
  }

  if (esInexistente) return null

  if (error?.statusCode === 403) {
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
      <ErrorState mensaje={formatearMensajeError(error.message)} onReintentar={() => refetch()} />
    )
  }

  if (isLoading || !cobro) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size={32} />
      </div>
    )
  }

  const codigo = formatearCodigoCobro(cobro.id_cobro)

  return (
    <div className="space-y-4">
      <ReciboCobroImpresion cobro={cobro} />

      <Button
        size="sm"
        icon={<ArrowLeft />}
        onClick={() => navigate(PATHS.TESORERIA.COBRANZAS.ROOT)}
      >
        Volver a Cobranzas
      </Button>

      <div className="border-subtle bg-fondotabla flex flex-col gap-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-content text-lg font-semibold">{codigo}</p>
            {badgeEstadoCobro(cobro.estado)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="success" icon={<Printer />} onClick={() => window.print()}>
              Imprimir
            </Button>
            {cobro.estado === 'CONFIRMADO' && (
              <Button
                size="sm"
                variant="error"
                icon={<Ban />}
                onClick={() => {
                  setErrorAnular(null)
                  setAnulando(true)
                }}
              >
                Anular
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          {/* Con hora real (ECOMMERCE): `formatearFechaSinHora` podría correr el día. */}
          <DetailRow label="Fecha de cobro" value={formatearFecha(cobro.fecha_cobro)} />
          <DetailRow
            label="Cliente"
            value={
              <span className="break-all">
                {nombreCliente(cobro.cliente)} · {cobro.cliente.dni_cuil ?? 'Sin DNI/CUIL'}
              </span>
            }
          />
          <DetailRow label="Forma de pago" value={cobro.formaPago.nombre} />
          <DetailRow label="N.º de referencia" value={textoOSinDato(cobro.numero_referencia)} />
          <DetailRow label="Observaciones" value={textoOSinDato(cobro.observaciones)} />
          <DetailRow label="Origen" value={ORIGEN_COBRO_LABEL[cobro.origen]} />
          <DetailRow label="Estado" value={badgeEstadoCobro(cobro.estado)} />
          {cobro.estado === 'ANULADO' && (
            <DetailRow label="Motivo de anulación" value={textoOSinDato(cobro.motivo_anulacion)} />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-content text-sm font-semibold">Cuotas imputadas</h3>
        <div className="overflow-x-auto">
          <DataTable
            data={cobro.detalle}
            columns={COLUMNAS_DETALLE_COBRO}
            obtenerId={(linea) => String(linea.id_detalle_cobro)}
            ariaLabel="Cuotas imputadas"
            emptyState={
              <EmptyState
                titulo="Este cobro no tiene cuotas imputadas"
                descripcion="No debería pasar: todo cobro exige al menos una imputación al confirmarse."
              />
            }
          />
        </div>
      </div>

      <dl className="border-subtle flex justify-between gap-8 border-t pt-3 text-sm">
        <dt className="text-content font-medium">Importe total recibido</dt>
        <dd className="text-content text-lg font-semibold">
          {formatearImporte(cobro.importe_total)}
        </dd>
      </dl>

      <AuditInfo
        createdAt={cobro.hora_creacion}
        createdBy={{ nombre: nombreUsuario(cobro.usuarioCreador) }}
        updatedAt={cobro.hora_actualizacion ?? undefined}
        updatedBy={{ nombre: nombreUsuario(cobro.usuarioActualizador) }}
      />

      <AnularCobroModal
        open={anulando}
        codigo={codigo}
        onCancel={() => {
          setAnulando(false)
          setErrorAnular(null)
        }}
        onConfirm={ejecutarAnular}
        loading={anular.isPending}
        error={errorAnular}
      />
    </div>
  )
}

/** `null` si el parámetro no es un entero positivo (ej. "abc", "0", "-3", "1.5"). */
function parsearIdCobro(valor: string | undefined): number | null {
  if (!valor || !/^\d+$/.test(valor)) return null
  const id = Number(valor)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
