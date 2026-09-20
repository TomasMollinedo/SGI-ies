import type { ReactNode } from 'react'
import { FilterX } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Select } from '@/shared/components/ui/Select'
import {
  OPCIONES_ESTADO_COMERCIAL,
  OPCIONES_TIPOLOGIA,
  OPCIONES_VIGENCIA,
} from '../config/publicacion.config'
import { ProyectoCombobox } from './ProyectoCombobox'

interface FiltrosPublicacionesBarProps {
  vigencia: string
  onVigenciaChange: (valor: string) => void
  estado: string
  onEstadoChange: (valor: string) => void
  proyecto: string
  onProyectoChange: (valor: string) => void
  tipologia: string
  onTipologiaChange: (valor: string) => void
  onLimpiar: () => void
  hayFiltros: boolean
  /** Acciones de la pantalla (el botón de alta), alineadas a la derecha. */
  acciones?: ReactNode
}

/** Barra de filtros del listado de publicaciones: vigencia, estado comercial, proyecto y tipología. */
export function FiltrosPublicacionesBar({
  vigencia,
  onVigenciaChange,
  estado,
  onEstadoChange,
  proyecto,
  onProyectoChange,
  tipologia,
  onTipologiaChange,
  onLimpiar,
  hayFiltros,
  acciones,
}: FiltrosPublicacionesBarProps) {
  return (
    <div className="flex w-full flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-end gap-3">
        <Select
          size="sm"
          label="Vigencia"
          options={OPCIONES_VIGENCIA}
          value={vigencia}
          onChange={(evento) => onVigenciaChange(evento.target.value)}
          className="w-full sm:w-44"
        />
        <Select
          size="sm"
          label="Estado comercial"
          options={OPCIONES_ESTADO_COMERCIAL}
          value={estado}
          onChange={(evento) => onEstadoChange(evento.target.value)}
          className="w-full sm:w-56"
        />
        <ProyectoCombobox value={proyecto} onChange={onProyectoChange} className="w-full sm:w-60" />
        <Select
          size="sm"
          label="Tipología"
          options={OPCIONES_TIPOLOGIA}
          value={tipologia}
          onChange={(evento) => onTipologiaChange(evento.target.value)}
          className="w-full sm:w-48"
        />

        <Button
          size="sm"
          icon={<FilterX />}
          onClick={onLimpiar}
          disabled={!hayFiltros}
          title="Volver a los filtros por defecto"
        >
          Limpiar filtros
        </Button>
      </div>

      {acciones}
    </div>
  )
}
