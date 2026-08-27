import { Search } from 'lucide-react'
import { useCategorias } from '@/features/almacen/categorias/hooks/useCategorias'
import { useMarcas } from '@/features/almacen/marca/hooks/useMarcas'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import type { FiltroEstado } from '../types/articulo.types'

interface FiltrosArticulosBarProps {
  busqueda: string
  onBusquedaChange: (valor: string) => void
  categoria: string
  onCategoriaChange: (valor: string) => void
  marca: string
  onMarcaChange: (valor: string) => void
  estado: FiltroEstado
  onEstadoChange: (valor: FiltroEstado) => void
}

const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'true', label: 'Activo' },
  { value: 'false', label: 'Inactivo' },
]

/** Barra de filtros del listado de artículos: búsqueda, categoría, marca y estado. */
export function FiltrosArticulosBar({
  busqueda,
  onBusquedaChange,
  categoria,
  onCategoriaChange,
  marca,
  onMarcaChange,
  estado,
  onEstadoChange,
}: FiltrosArticulosBarProps) {
  // Solo se listan las activas: no tiene sentido filtrar por una categoría o
  // marca que ya está dada de baja. El límite alto trae "todas" sin paginar.
  const { data: categorias } = useCategorias({ estado: true, limit: 100 })
  const { data: marcas } = useMarcas({ estado: true, limit: 100 })

  const opcionesCategoria: SelectOption[] = [
    { value: '', label: 'Todas las categorias' },
    ...(categorias?.data.map((item) => ({
      value: String(item.id_categoria),
      label: item.nombre,
    })) ?? []),
  ]

  const opcionesMarca: SelectOption[] = [
    { value: '', label: 'Todas las marcas' },
    ...(marcas?.data.map((item) => ({ value: String(item.id_marca), label: item.nombre })) ?? []),
  ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        size="sm"
        type="search"
        placeholder="Buscar por código o nombre"
        aria-label="Buscar artículos"
        iconLeft={<Search />}
        value={busqueda}
        onChange={(evento) => onBusquedaChange(evento.target.value)}
        className="w-64"
      />
      <Select
        size="sm"
        options={opcionesMarca}
        aria-label="Filtrar por marca"
        value={marca}
        onChange={(evento) => onMarcaChange(evento.target.value)}
        className="w-52"
      />
      <Select
        size="sm"
        options={opcionesCategoria}
        aria-label="Filtrar por categoría"
        value={categoria}
        onChange={(evento) => onCategoriaChange(evento.target.value)}
        className="w-52"
      />
      <Select
        size="sm"
        options={OPCIONES_ESTADO}
        aria-label="Filtrar por estado"
        value={estado}
        onChange={(evento) => onEstadoChange(evento.target.value as FiltroEstado)}
        className="w-52"
      />
    </div>
  )
}
