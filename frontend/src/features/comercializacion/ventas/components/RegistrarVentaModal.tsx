import { useEffect, useState } from 'react'
import { Building2, ShoppingCart } from 'lucide-react'
import { Modal } from '@/shared/components/common/Modal'
import { EmptyState } from '@/shared/components/estados-pantalla/EmptyState'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { CeldaUnidad } from '@/features/comercializacion/publicaciones/components/CeldaUnidad'
import type { PublicacionListItem } from '@/features/comercializacion/publicaciones/types/publicacion.types'
import { BuscadorCliente } from './BuscadorCliente'
import { ConfirmarVentaModal } from './ConfirmarVentaModal'
import { SelectorUnidadDisponibleModal } from './SelectorUnidadDisponibleModal'
import { SimulacionVentaImpresion } from './SimulacionVentaImpresion'
import { SimulacionVentaPanel } from './SimulacionVentaPanel'
import type {
  ClienteVenta,
  CondicionesVenta,
  SimulacionVenta,
  VentaDetalle,
} from '../types/venta.types'
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
 * El plan de pago ya no es una tabla emergente de planes predefinidos (eso
 * era del Sprint 3): es el simulador en vivo de `SimulacionVentaPanel`,
 * siempre visible una vez elegida la unidad, igual que en el catálogo
 * público. "Elegir unidad" y "Confirmar venta" siguen siendo sub-modales
 * que se abren arriba de este (modal dentro de modal, aceptado a propósito
 * en vez de duplicar todo el armado dentro de un solo diálogo gigante).
 */
export function RegistrarVentaModal({
  open,
  onClose,
  onVentaRegistrada,
}: RegistrarVentaModalProps) {
  const toast = useToast()

  const [unidad, setUnidad] = useState<PublicacionListItem | null>(null)
  const [cliente, setCliente] = useState<ClienteVenta | null>(null)
  // La última simulación válida del panel, con las condiciones que la pidieron.
  const [resultado, setResultado] = useState<{
    condiciones: CondicionesVenta
    simulacion: SimulacionVenta
  } | null>(null)

  const [selectorUnidadAbierto, setSelectorUnidadAbierto] = useState(false)
  const [confirmarAbierto, setConfirmarAbierto] = useState(false)

  // Cada apertura arranca de cero: sin esto, cerrar a mitad de una venta y
  // volver a abrir "Registrar venta" dejaría la unidad/cliente/simulación de
  // la vez anterior todavía cargados.
  useEffect(() => {
    if (!open) return
    setUnidad(null)
    setCliente(null)
    setResultado(null)
    setSelectorUnidadAbierto(true)
    setConfirmarAbierto(false)
  }, [open])

  function elegirUnidad(elegida: PublicacionListItem) {
    setUnidad(elegida)
    setCliente(null)
    setResultado(null)
    setSelectorUnidadAbierto(false)
  }

  function volverAElegirUnidad() {
    setCliente(null)
    setResultado(null)
    setConfirmarAbierto(false)
    setSelectorUnidadAbierto(true)
  }

  function alRegistrarVenta(venta: VentaDetalle) {
    if (!unidad) return
    toast.success(`Venta de la unidad ${unidad.unidad.identificador} registrada.`)
    setConfirmarAbierto(false)
    onVentaRegistrada(venta)
  }

  const puedeConfirmar = unidad !== null && resultado !== null && clienteVentaValido(cliente)

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Registrar venta"
        icon={<ShoppingCart />}
        size="xl"
      >
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
              <h3 className="text-content text-sm font-semibold">Plan de pago</h3>
              <SimulacionVentaPanel
                // Reinicia el formulario del simulador si se cambia de unidad.
                key={unidad.id_publicacion}
                FK_publicacion={unidad.id_publicacion}
                // Una publicación Disponible siempre tiene precio de lista cargado.
                precioLista={Number(unidad.precio_lista ?? 0)}
                onCambio={setResultado}
              />
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

      {/* El botón "Imprimir simulación" vive dentro del panel y no depende de
          tener cliente elegido: el bloque imprimible tampoco, o la hoja sale
          en blanco mientras no se cargó ningún cliente todavía. */}
      {unidad && resultado && (
        <SimulacionVentaImpresion
          unidadIdentificador={unidad.unidad.identificador}
          proyectoNombre={unidad.proyecto.nombre}
          cliente={cliente}
          simulacion={resultado.simulacion}
        />
      )}

      {unidad && cliente && resultado && clienteVentaValido(cliente) && (
        <ConfirmarVentaModal
          open={confirmarAbierto}
          unidad={unidad}
          cliente={cliente}
          condiciones={resultado.condiciones}
          simulacion={resultado.simulacion}
          onClose={() => setConfirmarAbierto(false)}
          onVolverAUnidad={volverAElegirUnidad}
          onVentaRegistrada={alRegistrarVenta}
        />
      )}
    </>
  )
}
