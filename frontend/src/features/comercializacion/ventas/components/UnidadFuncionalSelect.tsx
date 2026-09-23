import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { useUnidadesFuncionales } from '../hooks/useUnidadesFuncionales'

const LIMITE_UNIDADES = 200

interface UnidadFuncionalSelectProps {
  /** `id_proyecto` elegido en el filtro de proyecto. Sin proyecto, el combo queda deshabilitado. */
  proyecto: string
  /** `id_unidad_funcional` elegido, o `''` si no hay filtro. */
  value: string
  onChange: (valor: string) => void
  className?: string
}

/**
 * Filtro de unidad del listado de ventas. Cascadeado por proyecto: a
 * diferencia de `ProyectoCombobox`, `GET /unidades-funcionales` no tiene
 * búsqueda por texto, así que sin acotar por proyecto listar sería
 * impracticable. Por eso es un `<Select>` (no un `<Combobox>`) y arranca
 * deshabilitado hasta elegir un proyecto.
 */
export function UnidadFuncionalSelect({
  proyecto,
  value,
  onChange,
  className,
}: UnidadFuncionalSelectProps) {
  const FK_proyecto = proyecto ? Number(proyecto) : undefined

  const { data, isFetching, error } = useUnidadesFuncionales(
    { FK_proyecto: FK_proyecto!, limit: LIMITE_UNIDADES },
    { enabled: FK_proyecto !== undefined }
  )

  const opciones: SelectOption[] = (data?.data ?? []).map((unidad) => ({
    value: String(unidad.id_unidad_funcional),
    label: unidad.identificador,
  }))

  const placeholder = !proyecto
    ? 'Elegí un proyecto primero'
    : error
      ? 'No se pudo cargar la lista'
      : isFetching
        ? 'Cargando unidades…'
        : 'Todas las unidades'

  return (
    <Select
      size="sm"
      label="Unidad"
      placeholder={placeholder}
      options={opciones}
      value={value}
      onChange={(evento) => onChange(evento.target.value)}
      disabled={!proyecto || opciones.length === 0}
      className={className}
    />
  )
}
