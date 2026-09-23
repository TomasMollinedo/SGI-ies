import { useEffect, useState } from 'react'
import { Search, UserCheck, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { useBuscarCliente } from '../hooks/useVentas'
import type { ClienteResumen } from '../types/venta.types'

interface FiltroClienteVentaProps {
  /** `id_cliente` resuelto, o `''` si no hay filtro. */
  value: string
  onChange: (valor: string) => void
}

/**
 * Filtro de cliente del listado de ventas. A diferencia de `ProyectoCombobox`
 * (con búsqueda server-side), no hay listado de clientes con búsqueda
 * parcial: el único endpoint disponible (`GET /ventas/buscar-cliente`, el
 * mismo del alta) exige DNI/CUIL o correo exacto. Por eso es
 * input + "Buscar" en vez de un combobox.
 */
export function FiltroClienteVenta({ value, onChange }: FiltroClienteVentaProps) {
  const toast = useToast()
  const buscar = useBuscarCliente()
  const [termino, setTermino] = useState('')
  const [clienteResuelto, setClienteResuelto] = useState<ClienteResumen | null>(null)
  const [noEncontrado, setNoEncontrado] = useState(false)

  // Si el filtro se limpia desde afuera (botón "Limpiar filtros"), este combo
  // también tiene que olvidarse del cliente resuelto.
  useEffect(() => {
    if (value === '') {
      setTermino('')
      setClienteResuelto(null)
      setNoEncontrado(false)
    }
  }, [value])

  function ejecutarBusqueda() {
    const terminoLimpio = termino.trim()
    if (terminoLimpio === '') return
    const esCorreo = terminoLimpio.includes('@')

    buscar.mutate(esCorreo ? { email: terminoLimpio } : { dni_cuil: terminoLimpio }, {
      onSuccess: (resultado) => {
        if (resultado.encontrado && resultado.cliente) {
          setClienteResuelto(resultado.cliente)
          setNoEncontrado(false)
          onChange(String(resultado.cliente.id_cliente))
          return
        }
        setClienteResuelto(null)
        setNoEncontrado(true)
        onChange('')
      },
      onError: (falla) => toast.error(formatearMensajeError(falla.message)),
    })
  }

  function limpiar() {
    setTermino('')
    setClienteResuelto(null)
    setNoEncontrado(false)
    onChange('')
  }

  if (clienteResuelto) {
    return (
      <div className="border-subtle bg-fondotabla flex h-9 items-center gap-2 rounded-lg border px-3 text-sm">
        <UserCheck className="text-success size-4 shrink-0" aria-hidden="true" />
        <span className="text-content wrap-anywhere">
          {clienteResuelto.nombre} {clienteResuelto.apellido ?? ''}
        </span>
        <IconButton
          icon={<X />}
          ariaLabel="Quitar filtro de cliente"
          size="sm"
          variant="ghost"
          onClick={limpiar}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-2">
        <Input
          size="sm"
          label="Cliente"
          placeholder="DNI/CUIL o correo"
          value={termino}
          onChange={(evento) => {
            setTermino(evento.target.value)
            setNoEncontrado(false)
          }}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') ejecutarBusqueda()
          }}
          className="w-48"
        />
        <Button
          size="sm"
          icon={<Search />}
          onClick={ejecutarBusqueda}
          loading={buscar.isPending}
          disabled={termino.trim() === ''}
        >
          Buscar
        </Button>
      </div>
      {noEncontrado && (
        <p className="text-content-muted text-xs">No se encontró ningún cliente con ese dato.</p>
      )}
    </div>
  )
}
