import { useEffect, useState } from 'react'
import { Search, UserRound } from 'lucide-react'
import type { ClienteResumen } from '@/features/comercializacion/ventas/types/venta.types'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { SelectorEntidadModal } from '@/shared/components/common/SelectorEntidadModal'
import { Input } from '@/shared/components/ui/Input'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useBuscarClientesCobro } from '../hooks/useCobros'
import { nombreCliente } from '../utils/cliente'

const DEBOUNCE_BUSQUEDA = 400

const COLUMNAS: DataTableColumn<ClienteResumen>[] = [
  { key: 'nombre', label: 'Nombre y apellido', render: (c) => nombreCliente(c) },
  { key: 'dni', label: 'DNI/CUIL', render: (c) => c.dni_cuil ?? '—' },
  { key: 'email', label: 'Correo', render: (c) => <span className="break-all">{c.email}</span> },
]

interface SelectorClienteModalProps {
  open: boolean
  onClose: () => void
  onSeleccionar: (cliente: ClienteResumen) => void
}

/**
 * Tabla emergente para elegir el cliente de un cobro (HU-30), sobre el
 * `SelectorEntidadModal` genérico. Pega a GET /ventas/buscar-clientes, que
 * exige texto de búsqueda: sin texto no se consulta nada y la tabla muestra
 * cómo buscar.
 */
export function SelectorClienteModal({ open, onClose, onSeleccionar }: SelectorClienteModalProps) {
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)

  const busquedaDebounced = useDebounce(busqueda.trim(), DEBOUNCE_BUSQUEDA)
  const hayBusqueda = busquedaDebounced.length > 0

  useEffect(() => {
    setPage(1)
  }, [busquedaDebounced])

  useEffect(() => {
    if (!open) return
    setBusqueda('')
    setPage(1)
  }, [open])

  const { data, isFetching, error, refetch } = useBuscarClientesCobro(busquedaDebounced, page, open)

  return (
    <SelectorEntidadModal<ClienteResumen>
      open={open}
      onClose={onClose}
      titulo="Elegir cliente"
      icono={<UserRound />}
      // Sin texto la query está deshabilitada, pero `keepPreviousData` seguiría
      // mostrando los resultados de la búsqueda anterior: se descartan acá.
      data={hayBusqueda ? data : undefined}
      cargando={hayBusqueda && isFetching}
      error={hayBusqueda ? error : null}
      onReintentar={() => refetch()}
      columnas={COLUMNAS}
      obtenerId={(c) => String(c.id_cliente)}
      page={page}
      onPageChange={setPage}
      onSeleccionar={onSeleccionar}
      vacioTitulo={hayBusqueda ? 'No se encontraron clientes' : 'Buscá un cliente'}
      vacioDescripcion={
        hayBusqueda
          ? 'Probá con otro nombre, DNI/CUIL o correo.'
          : 'Escribí nombre, DNI/CUIL o correo.'
      }
      filtros={
        <Input
          size="sm"
          type="search"
          placeholder="Nombre, DNI/CUIL o correo"
          aria-label="Buscar clientes"
          iconLeft={<Search />}
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          className="w-full sm:w-72"
          autoFocus
        />
      }
    />
  )
}
