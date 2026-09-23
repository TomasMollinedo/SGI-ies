import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Building2, CreditCard, ShoppingCart } from 'lucide-react'
import { PATHS, rutaDetalleVenta } from '@/app/router/paths'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearImporte } from '@/shared/utils/importe'
import { TIPO_PLAN_LABEL } from '@/features/comercializacion/planes-pago/config/planPago.config'
import type { PlanPago } from '@/features/comercializacion/planes-pago/types/planPago.types'
import { aNumeroOCero } from '@/features/comercializacion/planes-pago/utils/decimal'
import { CeldaUnidad } from '@/features/comercializacion/publicaciones/components/CeldaUnidad'
import type { PublicacionListItem } from '@/features/comercializacion/publicaciones/types/publicacion.types'
import { BuscadorCliente } from '../components/BuscadorCliente'
import { ConfirmarVentaModal } from '../components/ConfirmarVentaModal'
import { SelectorPlanPagoModal } from '../components/SelectorPlanPagoModal'
import { SelectorUnidadDisponibleModal } from '../components/SelectorUnidadDisponibleModal'
import type { ClienteVenta, VentaDetalle } from '../types/venta.types'
import { clienteVentaValido } from '../utils/clienteVentaValido'

/**
 * Registro de venta presencial (HU-27): elegir unidad → buscador de cliente +
 * elegir plan → confirmar. Mismo molde que T104/T114 (tabla emergente para la
 * entidad principal, formulario debajo, modal de confirmación al final).
 */
export function RegistrarVentaPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [unidad, setUnidad] = useState<PublicacionListItem | null>(null)
  const [plan, setPlan] = useState<PlanPago | null>(null)
  const [cliente, setCliente] = useState<ClienteVenta | null>(null)

  const [selectorUnidadAbierto, setSelectorUnidadAbierto] = useState(true)
  const [selectorPlanAbierto, setSelectorPlanAbierto] = useState(false)
  const [confirmarAbierto, setConfirmarAbierto] = useState(false)

  function elegirUnidad(elegida: PublicacionListItem) {
    setUnidad(elegida)
    setPlan(null)
    setCliente(null)
    setSelectorUnidadAbierto(false)
  }

  function volverAElegirUnidad() {
    setPlan(null)
    setCliente(null)
    setConfirmarAbierto(false)
    setSelectorUnidadAbierto(true)
  }

  function volverAElegirPlan() {
    setPlan(null)
    setConfirmarAbierto(false)
    setSelectorPlanAbierto(true)
  }

  function alRegistrarVenta(venta: VentaDetalle) {
    if (!unidad) return
    toast.success(`Venta de la unidad ${unidad.unidad.identificador} registrada.`)
    setConfirmarAbierto(false)
    navigate(rutaDetalleVenta(venta.id_venta))
  }

  const puedeConfirmar = unidad !== null && plan !== null && clienteVentaValido(cliente)

  return (
    <div className="space-y-4">
      {!unidad && (
        <div className="flex flex-col items-center gap-4">
          <EmptyState
            icono={Building2}
            titulo="Elegí la unidad a vender"
            descripcion="Solo se listan publicaciones en estado «Disponible»."
          />
          <Button icon={<Building2 />} onClick={() => setSelectorUnidadAbierto(true)}>
            Elegir unidad
          </Button>
        </div>
      )}

      {unidad && (
        <div className="flex flex-col gap-4">
          <div className="border-subtle bg-fondotabla flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
            <CeldaUnidad
              identificador={unidad.unidad.identificador}
              proyecto={unidad.proyecto.nombre}
              tipologia={unidad.unidad.tipologia}
            />
            <Button size="sm" icon={<Building2 />} onClick={() => setSelectorUnidadAbierto(true)}>
              Cambiar unidad
            </Button>
          </div>

          <section className="border-subtle bg-fondotabla flex flex-col gap-3 rounded-lg border p-4">
            <h3 className="text-content text-sm font-semibold">Cliente</h3>
            <BuscadorCliente value={cliente} onChange={setCliente} />
          </section>

          <section className="border-subtle bg-fondotabla flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-content text-sm font-semibold">Plan de pago</h3>
              <Button size="sm" icon={<CreditCard />} onClick={() => setSelectorPlanAbierto(true)}>
                {plan ? 'Cambiar plan' : 'Elegir plan'}
              </Button>
            </div>

            {plan && (
              <p className="text-content-muted text-xs">
                {plan.nombre} ({TIPO_PLAN_LABEL[plan.tipo]}) —{' '}
                {formatearImporte(aNumeroOCero(plan.precio))}
              </p>
            )}
          </section>

          <div className="flex justify-end">
            <Button
              icon={<ShoppingCart />}
              disabled={!puedeConfirmar}
              onClick={() => setConfirmarAbierto(true)}
            >
              Confirmar venta
            </Button>
          </div>
        </div>
      )}

      <SelectorUnidadDisponibleModal
        open={selectorUnidadAbierto}
        // Sin unidad elegida todavía, este modal es el único contenido de la
        // pantalla (ver el `!unidad` de arriba): cerrarlo sin elegir dejaría
        // una pantalla vacía. Con unidad ya elegida, es "Cambiar unidad" y
        // cerrar solo tiene que ocultar el modal, no perder lo demás cargado.
        onClose={() => (unidad ? setSelectorUnidadAbierto(false) : navigate(PATHS.COMERCIALIZACION.VENTAS))}
        onSeleccionar={elegirUnidad}
      />

      <SelectorPlanPagoModal
        open={selectorPlanAbierto}
        onClose={() => setSelectorPlanAbierto(false)}
        FK_publicacion={unidad?.id_publicacion ?? null}
        onSeleccionar={(elegido) => {
          setPlan(elegido)
          setSelectorPlanAbierto(false)
        }}
      />

      {unidad && plan && cliente && clienteVentaValido(cliente) && (
        <ConfirmarVentaModal
          open={confirmarAbierto}
          unidad={unidad}
          plan={plan}
          cliente={cliente}
          onClose={() => setConfirmarAbierto(false)}
          onVolverAUnidad={volverAElegirUnidad}
          onVolverAPlan={volverAElegirPlan}
          onVentaRegistrada={alRegistrarVenta}
        />
      )}
    </div>
  )
}
