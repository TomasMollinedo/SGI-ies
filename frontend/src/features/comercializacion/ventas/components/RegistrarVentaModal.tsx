import { useEffect, useState } from 'react'
import { Building2, CreditCard, ShoppingCart } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { formatearImporte } from '@/shared/utils/importe'
import { TIPO_PLAN_LABEL } from '@/features/comercializacion/planes-pago/config/planPago.config'
import type { PlanPago } from '@/features/comercializacion/planes-pago/types/planPago.types'
import { aNumeroOCero } from '@/features/comercializacion/planes-pago/utils/decimal'
import { CeldaUnidad } from '@/features/comercializacion/publicaciones/components/CeldaUnidad'
import type { PublicacionListItem } from '@/features/comercializacion/publicaciones/types/publicacion.types'
import { BuscadorCliente } from './BuscadorCliente'
import { ConfirmarVentaModal } from './ConfirmarVentaModal'
import { SelectorPlanPagoModal } from './SelectorPlanPagoModal'
import { SelectorUnidadDisponibleModal } from './SelectorUnidadDisponibleModal'
import type { ClienteVenta, VentaDetalle } from '../types/venta.types'
import { clienteVentaValido } from '../utils/clienteVentaValido'

interface RegistrarVentaModalProps {
  open: boolean
  onClose: () => void
  onVentaRegistrada: (venta: VentaDetalle) => void
}

/**
 * Registro de venta presencial (HU-27), como modal sobre
 * `/comercializacion/ventas` — no tiene ruta propia, a propósito: cerrar en
 * cualquier punto del flujo te deja en el listado, nunca en una URL /nueva
 * con pantalla vacía.
 *
 * "Elegir unidad", "Elegir plan" y "Confirmar venta" son sub-modales que se
 * abren arriba de este: en esos pasos hay dos fondos oscuros superpuestos
 * (modal dentro de modal), aceptado a propósito en vez de duplicar todo el
 * armado dentro de un solo diálogo gigante.
 */
export function RegistrarVentaModal({ open, onClose, onVentaRegistrada }: RegistrarVentaModalProps) {
  const toast = useToast()

  const [unidad, setUnidad] = useState<PublicacionListItem | null>(null)
  const [plan, setPlan] = useState<PlanPago | null>(null)
  const [cliente, setCliente] = useState<ClienteVenta | null>(null)

  const [selectorUnidadAbierto, setSelectorUnidadAbierto] = useState(false)
  const [selectorPlanAbierto, setSelectorPlanAbierto] = useState(false)
  const [confirmarAbierto, setConfirmarAbierto] = useState(false)

  // Cada apertura arranca de cero: sin esto, cerrar a mitad de una venta y
  // volver a abrir "Registrar venta" dejaría la unidad/cliente/plan de la
  // vez anterior todavía cargados.
  useEffect(() => {
    if (!open) return
    setUnidad(null)
    setPlan(null)
    setCliente(null)
    setSelectorUnidadAbierto(true)
    setSelectorPlanAbierto(false)
    setConfirmarAbierto(false)
  }, [open])

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
    onVentaRegistrada(venta)
  }

  const puedeConfirmar = unidad !== null && plan !== null && clienteVentaValido(cliente)

  return (
    <>
      <Modal open={open} onClose={onClose} title="Registrar venta" icon={<ShoppingCart />} size="lg">
        {!unidad && (
          <div className="flex flex-col items-center gap-4 py-4">
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
            <div className="border-subtle flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <CeldaUnidad
                identificador={unidad.unidad.identificador}
                proyecto={unidad.proyecto.nombre}
                tipologia={unidad.unidad.tipologia}
              />
              <Button size="sm" icon={<Building2 />} onClick={() => setSelectorUnidadAbierto(true)}>
                Cambiar unidad
              </Button>
            </div>

            <section className="border-subtle flex flex-col gap-3 rounded-lg border p-4">
              <h3 className="text-content text-sm font-semibold">Cliente</h3>
              <BuscadorCliente value={cliente} onChange={setCliente} />
            </section>

            <section className="border-subtle flex flex-col gap-3 rounded-lg border p-4">
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
      </Modal>

      <SelectorUnidadDisponibleModal
        open={selectorUnidadAbierto}
        // Siempre hay que cerrar ESTE selector (si no, `RegistrarVentaModal`
        // sigue montado con `selectorUnidadAbierto` en `true` aunque el modal
        // de afuera ya se haya cerrado, y queda huérfano en pantalla). Sin
        // unidad elegida todavía, este selector es el único contenido del
        // modal de arriba, así que además se cierra todo el flujo (vuelve al
        // listado). Con unidad ya elegida, es "Cambiar unidad": solo se oculta
        // el selector, sin perder lo demás cargado.
        onClose={() => {
          setSelectorUnidadAbierto(false)
          if (!unidad) onClose()
        }}
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
    </>
  )
}
