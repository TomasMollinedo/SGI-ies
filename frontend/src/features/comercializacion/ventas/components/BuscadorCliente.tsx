import { useState } from 'react'
import { Search, UserCheck, UserPlus } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { useBuscarCliente } from '../hooks/useVentas'
import type { ClienteResumen, ClienteVenta } from '../types/venta.types'

interface BuscadorClienteProps {
  /** `null` mientras no se buscó nada, o al reiniciar la búsqueda. */
  value: ClienteVenta | null
  onChange: (cliente: ClienteVenta | null) => void
  disabled?: boolean
}

/**
 * Buscador de cliente del formulario de venta (HU-27): tipeá DNI/CUIL o
 * correo y "Buscar". Si existe, se asocia sin re-pedirle nombre/teléfono; si
 * no, se despliega el alta completa con el dato buscado ya precargado.
 *
 * Nunca pide login al cliente — pega a `GET /ventas/buscar-cliente`, no al
 * `cliente.controller.ts` del ecommerce público.
 */
export function BuscadorCliente({ value, onChange, disabled }: BuscadorClienteProps) {
  const toast = useToast()
  const buscar = useBuscarCliente()
  const [termino, setTermino] = useState('')
  const [buscado, setBuscado] = useState(false)
  const [clienteExistente, setClienteExistente] = useState<ClienteResumen | null>(null)

  function cambiarTermino(nuevoTermino: string) {
    setTermino(nuevoTermino)
    setBuscado(false)
    setClienteExistente(null)
    onChange(null)
  }

  function ejecutarBusqueda() {
    const terminoLimpio = termino.trim()
    if (terminoLimpio === '') return
    const esCorreo = terminoLimpio.includes('@')

    buscar.mutate(esCorreo ? { email: terminoLimpio } : { dni_cuil: terminoLimpio }, {
      onSuccess: (resultado) => {
        setBuscado(true)

        if (resultado.encontrado && resultado.cliente) {
          setClienteExistente(resultado.cliente)
          onChange({
            nombre: resultado.cliente.nombre,
            apellido: resultado.cliente.apellido ?? undefined,
            dni_cuil: resultado.cliente.dni_cuil ?? '',
            email: resultado.cliente.email,
            telefono: resultado.cliente.telefono ?? '',
          })
          return
        }

        setClienteExistente(null)
        onChange({
          nombre: '',
          apellido: undefined,
          dni_cuil: esCorreo ? '' : terminoLimpio,
          email: esCorreo ? terminoLimpio : '',
          telefono: '',
        })
      },
      onError: (falla) => toast.error(formatearMensajeError(falla.message)),
    })
  }

  function actualizarCampoAlta(
    campo: 'nombre' | 'apellido' | 'dni_cuil' | 'email' | 'telefono',
    valor: string
  ) {
    if (!value) return
    onChange({ ...value, [campo]: valor })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="DNI/CUIL o correo del cliente"
          required
          value={termino}
          onChange={(evento) => cambiarTermino(evento.target.value)}
          placeholder="Ej. 20345678901 o cliente@correo.com"
          disabled={disabled}
          className="min-w-0 flex-1"
        />
        <Button
          icon={<Search />}
          onClick={ejecutarBusqueda}
          loading={buscar.isPending}
          disabled={disabled || termino.trim() === ''}
        >
          Buscar
        </Button>
      </div>

      {buscado && clienteExistente && (
        <div className="border-subtle bg-fondotabla flex items-start gap-3 rounded-lg border p-4">
          <UserCheck className="text-success mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 text-sm">
            <p className="text-content font-medium wrap-anywhere">
              {clienteExistente.nombre} {clienteExistente.apellido ?? ''}
            </p>
            <p className="text-content-muted text-xs wrap-anywhere">{clienteExistente.email}</p>
            <p className="text-content-muted text-xs wrap-anywhere">
              {clienteExistente.telefono ?? 'Sin teléfono cargado'}
            </p>
          </div>
        </div>
      )}

      {buscado && !clienteExistente && value && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <UserPlus className="text-content-muted size-4 shrink-0" aria-hidden="true" />
            <p className="text-content-muted text-xs">
              Cliente nuevo: completá sus datos para darlo de alta.
            </p>
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
            />
            <Input
              label="Correo"
              type="email"
              required
              value={value.email}
              onChange={(evento) => actualizarCampoAlta('email', evento.target.value)}
              disabled={disabled}
            />
            <Input
              label="Teléfono"
              required
              value={value.telefono}
              onChange={(evento) => actualizarCampoAlta('telefono', evento.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  )
}
