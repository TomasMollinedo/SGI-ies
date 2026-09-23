import { useState } from 'react'
import { UserCheck, UserPlus, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import { ClienteCombobox } from './ClienteCombobox'
import type { ClienteResumen, ClienteVenta } from '../types/venta.types'
import { DNI_CUIL_REGEX, EMAIL_REGEX, TELEFONO_REGEX } from '../utils/clienteVentaValido'

interface BuscadorClienteProps {
  /** `null` mientras no se buscó/eligió nada, o al reiniciar la búsqueda. */
  value: ClienteVenta | null
  onChange: (cliente: ClienteVenta | null) => void
  disabled?: boolean
}

const CLIENTE_NUEVO_VACIO: ClienteVenta = {
  nombre: '',
  apellido: undefined,
  dni_cuil: '',
  email: '',
  telefono: '',
}

function clienteVentaDesdeResumen(cliente: ClienteResumen): ClienteVenta {
  return {
    nombre: cliente.nombre,
    apellido: cliente.apellido ?? undefined,
    dni_cuil: cliente.dni_cuil ?? '',
    email: cliente.email,
    telefono: cliente.telefono ?? '',
  }
}

/**
 * Buscador de cliente del formulario de venta (HU-27): buscá por nombre,
 * apellido, DNI/CUIL o correo (`ClienteCombobox`, con resultados server-side)
 * y elegí de la lista si existe; si no, "Cliente nuevo" despliega el alta
 * completa. Nunca pide login al cliente — pega a `GET /ventas/buscar-clientes`,
 * no al `cliente.controller.ts` del ecommerce público.
 */
export function BuscadorCliente({ value, onChange, disabled }: BuscadorClienteProps) {
  const [clienteExistente, setClienteExistente] = useState<ClienteResumen | null>(null)
  const [modoAlta, setModoAlta] = useState(false)

  function seleccionarCliente(cliente: ClienteResumen) {
    setClienteExistente(cliente)
    setModoAlta(false)
    onChange(clienteVentaDesdeResumen(cliente))
  }

  function iniciarAlta() {
    setClienteExistente(null)
    setModoAlta(true)
    onChange(CLIENTE_NUEVO_VACIO)
  }

  function cambiarCliente() {
    setClienteExistente(null)
    setModoAlta(false)
    onChange(null)
  }

  function actualizarCampoAlta(
    campo: 'nombre' | 'apellido' | 'dni_cuil' | 'email' | 'telefono',
    valor: string
  ) {
    if (!value) return
    onChange({ ...value, [campo]: valor })
  }

  // Solo avisa una vez que hay algo escrito: un campo obligatorio vacío ya lo
  // marca el asterisco de `required`, no hace falta duplicar el aviso.
  const dniInvalido =
    value !== null && value.dni_cuil !== '' && !DNI_CUIL_REGEX.test(value.dni_cuil)
  const emailInvalido = value !== null && value.email !== '' && !EMAIL_REGEX.test(value.email)
  const telefonoInvalido =
    value !== null && value.telefono !== '' && !TELEFONO_REGEX.test(value.telefono)

  if (clienteExistente) {
    // Un cliente que se registró solo (Google OAuth, HU-23) puede no tener
    // todavía DNI/CUIL ni teléfono: HU-23 exige completarlos recién antes de
    // declarar un pago, pero `clienteVentaValido` los exige siempre para
    // vender. Comercialización los completa acá mismo en vez de quedar
    // trabada sin poder confirmar la venta.
    const faltaDni = clienteExistente.dni_cuil === null
    const faltaTelefono = clienteExistente.telefono === null

    return (
      <div className="flex flex-col gap-3">
        <div className="border-subtle bg-fondotabla flex items-start gap-3 rounded-lg border p-4">
          <UserCheck className="text-success mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="text-content font-medium wrap-anywhere">
              {clienteExistente.nombre} {clienteExistente.apellido ?? ''}
            </p>
            <p className="text-content-muted text-xs wrap-anywhere">
              {clienteExistente.dni_cuil ?? 'Sin DNI/CUIL cargado'} · {clienteExistente.email}
            </p>
            <p className="text-content-muted text-xs wrap-anywhere">
              {clienteExistente.telefono ?? 'Sin teléfono cargado'}
            </p>
          </div>
          <IconButton
            icon={<X />}
            ariaLabel="Buscar otro cliente"
            size="sm"
            variant="ghost"
            onClick={cambiarCliente}
            disabled={disabled}
          />
        </div>

        {(faltaDni || faltaTelefono) && value && (
          <div className="border-warning/30 bg-warning/10 flex flex-col gap-3 rounded-md border p-3">
            <p className="text-warning text-xs">
              A este cliente le falta{' '}
              {faltaDni && faltaTelefono
                ? 'el DNI/CUIL y el teléfono'
                : faltaDni
                  ? 'el DNI/CUIL'
                  : 'el teléfono'}
              : completalo para poder confirmar la venta.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {faltaDni && (
                <Input
                  label="DNI/CUIL"
                  required
                  value={value.dni_cuil}
                  onChange={(evento) => actualizarCampoAlta('dni_cuil', evento.target.value)}
                  disabled={disabled}
                  error={
                    dniInvalido
                      ? 'Ingresá un DNI (7 u 8 dígitos) o un CUIT/CUIL (11 dígitos), sin puntos ni guiones'
                      : undefined
                  }
                />
              )}
              {faltaTelefono && (
                <Input
                  label="Teléfono"
                  required
                  value={value.telefono}
                  onChange={(evento) => actualizarCampoAlta('telefono', evento.target.value)}
                  disabled={disabled}
                  error={
                    telefonoInvalido
                      ? 'El teléfono solo puede contener números, sin espacios ni guiones'
                      : undefined
                  }
                />
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <ClienteCombobox onSeleccionar={seleccionarCliente} disabled={disabled} />
        <Button icon={<UserPlus />} onClick={iniciarAlta} disabled={disabled}>
          Cliente nuevo
        </Button>
      </div>

      {modoAlta && value && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-content-muted text-xs">
              Cliente nuevo: completá sus datos para darlo de alta.
            </p>
            <button
              type="button"
              onClick={cambiarCliente}
              disabled={disabled}
              className="text-content-muted hover:text-content text-xs underline underline-offset-2"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Nombre"
              required
              value={value.nombre}
              onChange={(evento) => actualizarCampoAlta('nombre', evento.target.value)}
              disabled={disabled}
            />
            <Input
              label="Apellido"
              value={value.apellido ?? ''}
              onChange={(evento) => actualizarCampoAlta('apellido', evento.target.value)}
              disabled={disabled}
            />
            <Input
              label="DNI/CUIL"
              required
              value={value.dni_cuil}
              onChange={(evento) => actualizarCampoAlta('dni_cuil', evento.target.value)}
              disabled={disabled}
              error={
                dniInvalido
                  ? 'Ingresá un DNI (7 u 8 dígitos) o un CUIT/CUIL (11 dígitos), sin puntos ni guiones'
                  : undefined
              }
            />
            <Input
              label="Correo"
              type="email"
              required
              value={value.email}
              onChange={(evento) => actualizarCampoAlta('email', evento.target.value)}
              disabled={disabled}
              error={emailInvalido ? 'El correo debe ser una dirección válida' : undefined}
            />
            <Input
              label="Teléfono"
              required
              value={value.telefono}
              onChange={(evento) => actualizarCampoAlta('telefono', evento.target.value)}
              disabled={disabled}
              error={
                telefonoInvalido
                  ? 'El teléfono solo puede contener números, sin espacios ni guiones'
                  : undefined
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
