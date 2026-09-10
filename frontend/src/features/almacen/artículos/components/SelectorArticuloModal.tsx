import { useEffect, useState } from 'react'
import { Package, Search } from 'lucide-react'
import { useCategorias } from '@/features/almacen/categorias/hooks/useCategorias'
import { useMarcas } from '@/features/almacen/marca/hooks/useMarcas'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { SelectorEntidadModal } from '@/shared/components/common/SelectorEntidadModal'
import { Badge } from '@/shared/components/ui/Badge'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useArticulos } from '../hooks/useArticulos'
import type { Articulo } from '../types/articulo.types'
import { formatearCodigoArticulo } from '../utils/codigoArticulo'

const LIMITE_PAGINA = 8
const DEBOUNCE_BUSQUEDA = 400

const OPCIONES_ESTADO: SelectOption[] = [
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
  { value: '', label: 'Todos' },
]

const COLUMNAS: DataTableColumn<Articulo>[] = [
  { key: 'codigo', label: 'Código', render: (a) => formatearCodigoArticulo(a.id_articulo) },
  { key: 'nombre', label: 'Nombre', render: (a) => a.nombre },
  { key: 'categoria', label: 'Categoría', render: (a) => a.categoria.nombre },
  { key: 'marca', label: 'Marca', render: (a) => a.marca?.nombre ?? '—' },
  {
    key: 'estado',
    label: 'Estado',
    render: (a) => (
      <Badge variant={a.estado ? 'active' : 'inactive'}>{a.estado ? 'Activo' : 'Inactivo'}</Badge>
    ),
  },
]

interface SelectorArticuloModalProps {
  open: boolean
  onClose: () => void
  onSeleccionar: (articulo: Articulo) => void
  /** Por defecto solo muestra activos (los que se pueden usar en una línea nueva). */
  estadoInicial?: 'true' | 'false' | ''
}

/**
 * Buscador de artículos en modal: nombre, categoría, marca y estado, con
 * resultados paginados. Envuelve al `SelectorEntidadModal` genérico con el hook
 * y las columnas de artículos.
 */
export function SelectorArticuloModal({
  open,
  onClose,
  onSeleccionar,
  estadoInicial = 'true',
}: SelectorArticuloModalProps) {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [marca, setMarca] = useState('')
  const [estado, setEstado] = useState<string>(estadoInicial)
  const [page, setPage] = useState(1)

  const busquedaDebounced = useDebounce(busqueda.trim(), DEBOUNCE_BUSQUEDA)

  useEffect(() => {
    setPage(1)
  }, [busquedaDebounced, categoria, marca, estado])

  useEffect(() => {
    if (!open) return
    setBusqueda('')
    setCategoria('')
    setMarca('')
    setEstado(estadoInicial)
    setPage(1)
  }, [open, estadoInicial])

  const { data: categorias } = useCategorias({ estado: true, limit: 100 })
  const { data: marcas } = useMarcas({ estado: true, limit: 100 })

  const { data, isFetching, error, refetch } = useArticulos(
    {
      busqueda: busquedaDebounced || undefined,
      FK_Categoria: categoria ? Number(categoria) : undefined,
      FK_Marca: marca ? Number(marca) : undefined,
      estado: estado === '' ? undefined : estado === 'true',
      page,
      limit: LIMITE_PAGINA,
    },
    { enabled: open }
  )

  const opcionesCategoria: SelectOption[] = [
    { value: '', label: 'Todas las categorías' },
    ...(categorias?.data.map((c) => ({ value: String(c.id_categoria), label: c.nombre })) ?? []),
  ]
  const opcionesMarca: SelectOption[] = [
    { value: '', label: 'Todas las marcas' },
    ...(marcas?.data.map((m) => ({ value: String(m.id_marca), label: m.nombre })) ?? []),
  ]

  return (
    <SelectorEntidadModal<Articulo>
      open={open}
      onClose={onClose}
      titulo="Buscar artículo"
      icono={<Package />}
      data={data}
      cargando={isFetching}
      error={error}
      onReintentar={() => refetch()}
      columnas={COLUMNAS}
      obtenerId={(a) => String(a.id_articulo)}
      page={page}
      onPageChange={setPage}
      onSeleccionar={onSeleccionar}
      vacioTitulo="No se encontraron artículos"
      filtros={
        <div className="flex flex-wrap items-end gap-3">
          <Input
            size="sm"
            type="search"
            placeholder="Buscar por nombre"
            aria-label="Buscar artículos"
            iconLeft={<Search />}
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            className="w-56"
          />
          <Select
            size="sm"
            aria-label="Categoría"
            options={opcionesCategoria}
            value={categoria}
            onChange={(evento) => setCategoria(evento.target.value)}
            className="w-44"
          />
          <Select
            size="sm"
            aria-label="Marca"
            options={opcionesMarca}
            value={marca}
            onChange={(evento) => setMarca(evento.target.value)}
            className="w-44"
          />
          <Select
            size="sm"
            aria-label="Estado"
            options={OPCIONES_ESTADO}
            value={estado}
            onChange={(evento) => setEstado(evento.target.value)}
            className="w-36"
          />
        </div>
      }
    />
  )
}