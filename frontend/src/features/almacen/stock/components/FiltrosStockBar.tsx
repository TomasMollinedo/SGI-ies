import { Search } from 'lucide-react'
import { useCategorias } from '@/features/almacen/categorias/hooks/useCategorias'
import { useDepositos } from '@/features/almacen/deposito/hooks/useDepositos'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'

interface FiltrosStockBarProps {
  nombreArticulo: string
  onNombreArticuloChange: (valor: string) => void
  FK_deposito: string
  onFKDepositoChange: (valor: string) => void
  esObrador: string
  onEsObradorChange: (valor: string) => void
  FK_Categoria: string
  onFKCategoriaChange: (valor: string) => void
  estado: string
  onEstadoChange: (valor: string) => void
}

const OPCIONES_ESTADO: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Dados de baja' },
]

const OPCIONES_ES_OBRADOR: SelectOption[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'false', label: 'Depósito central' },
  { value: 'true', label: 'Obrador' },
]

/** Barra de filtros del listado de stock: artículo, depósito, tipo, categoría y estado. */
export function FiltrosStockBar({
  nombreArticulo,
  onNombreArticuloChange,
  FK_deposito,
  onFKDepositoChange,
  esObrador,
  onEsObradorChange,
  FK_Categoria,
  onFKCategoriaChange,
  estado,
  onEstadoChange,
}: FiltrosStockBarProps) {
  // Solo depósitos/categorías activos: no tiene sentido filtrar el stock por algo dado de baja.
  const { data: depositos } = useDepositos({ estado: true, limit: 100 })
  const { data: categorias } = useCategorias({ estado: true, limit: 100 })

  const opcionesDeposito: SelectOption[] = [
    { value: '', label: 'Todos los depósitos' },
    ...(depositos?.data.map((deposito) => ({
      value: String(deposito.id_deposito),
      label: deposito.nombre,
    })) ?? []),
  ]

  const opcionesCategoria: SelectOption[] = [
    { value: '', label: 'Todas las categorías' },
    ...(categorias?.data.map((categoria) => ({
      value: String(categoria.id_categoria),
      label: categoria.nombre,
    })) ?? []),
  ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        size="sm"
        placeholder="Buscar por artículo"
        iconLeft={<Search />}
        value={nombreArticulo}
        onChange={(evento) => onNombreArticuloChange(evento.target.value)}
        className="w-64"
      />
      <Select
        size="sm"
        options={opcionesDeposito}
        value={FK_deposito}
        onChange={(evento) => onFKDepositoChange(evento.target.value)}
        className="w-60"
      />
      <Select
        size="sm"
        options={OPCIONES_ES_OBRADOR}
        value={esObrador}
        onChange={(evento) => onEsObradorChange(evento.target.value)}
        className="w-50"
      />
      <Select
        size="sm"
        options={opcionesCategoria}
        value={FK_Categoria}
        onChange={(evento) => onFKCategoriaChange(evento.target.value)}
        className="w-60"
      />
      <Select
        size="sm"
        options={OPCIONES_ESTADO}
        value={estado}
        onChange={(evento) => onEstadoChange(evento.target.value)}
        className="w-50"
      />
    </div>
  )
}
