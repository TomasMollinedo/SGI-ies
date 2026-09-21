import { useState } from 'react'
import { useProyectos } from '@/features/proyectos/hooks/useProyectos'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import type { FieldSize } from '@/shared/components/ui/fieldStyles'

const LIMITE_BUSQUEDA = 10

interface ProyectoComboboxProps {
  /** `id_proyecto` elegido, o `''` si no hay filtro. */
  value: string
  onChange: (valor: string) => void
  size?: FieldSize
  className?: string
}

/**
 * Filtro de proyecto con búsqueda server-side. Lo usan el listado de
 * publicaciones y la tabla emergente de unidades.
 *
 * Si el endpoint de proyectos falla (hoy puede no existir), el combo queda sin
 * opciones y lo avisa debajo: los demás filtros y la página siguen andando.
 */
export function ProyectoCombobox({
  value,
  onChange,
  size = 'sm',
  className,
}: ProyectoComboboxProps) {
  const [busqueda, setBusqueda] = useState('')

  const {
    data: proyectos,
    isFetching,
    error,
  } = useProyectos({ busqueda: busqueda.trim() || undefined, limit: LIMITE_BUSQUEDA })

  const opciones: ComboboxOption[] = (proyectos?.data ?? []).map((proyecto) => ({
    value: String(proyecto.id_proyecto),
    label: proyecto.nombre,
    description: proyecto.codigo,
  }))
  const hayMasProyectos = (proyectos?.meta.total ?? 0) > opciones.length

  return (
    <Combobox
      size={size}
      label="Proyecto"
      placeholder="Todos los proyectos"
      minChars={0}
      value={value}
      onChange={onChange}
      options={opciones}
      onSearch={setBusqueda}
      loading={isFetching}
      hasMoreResults={hayMasProyectos}
      emptyText="No se encontraron proyectos"
      helperText={error ? 'No se pudo cargar la lista de proyectos.' : undefined}
      className={className}
    />
  )
}
