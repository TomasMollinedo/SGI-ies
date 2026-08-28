import type { ReactNode } from 'react'
import { FilterX } from 'lucide-react'
import { useArticulos } from '@/features/almacen/artículos/hooks/useArticulos'
import { useDepositos } from '@/features/almacen/deposito/hooks/useDepositos'
import { useTiposMovimiento } from '@/features/almacen/tipo-movimiento/hooks/useTiposMovimiento'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'

interface FiltrosMovimientosBarProps {
  FK_Deposito: string
  onFKDepositoChange: (valor: string) => void
  FK_TipoMovimiento: string
  onFKTipoMovimientoChange: (valor: string) => void
  FK_articulo: string
  onFKArticuloChange: (valor: string) => void
  fechaDesde: string
  onFechaDesdeChange: (valor: string) => void
  fechaHasta: string
  onFechaHastaChange: (valor: string) => void
  /** Mensaje del rango de fechas inválido. Se pinta sobre "Fecha hasta". */
  errorRango?: string
  onLimpiar: () => void
  hayFiltros: boolean
  /** Acciones de la pantalla (el botón de alta), alineadas a la derecha de la primera fila. */
  acciones?: ReactNode
}

/**
 * Barra de filtros del historial de movimientos: depósito, tipo, artículo y
 * rango de fechas. Todos son opcionales y se combinan entre sí.
 *
 * Se arma en dos filas: arriba los selects —con las acciones de la pantalla
 * pegadas al extremo derecho— y abajo el rango de fechas con el botón de
 * limpiar. En pantallas angostas cada fila envuelve por su cuenta.
 */
export function FiltrosMovimientosBar({
  FK_Deposito,
  onFKDepositoChange,
  FK_TipoMovimiento,
  onFKTipoMovimientoChange,
  FK_articulo,
  onFKArticuloChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  errorRango,
  onLimpiar,
  hayFiltros,
  acciones,
}: FiltrosMovimientosBarProps) {
  // Solo los activos: no tiene sentido filtrar el historial por algo dado de
  // baja. El límite de 100 es el máximo que acepta el backend por página.
  const { data: depositos } = useDepositos({ estado: true, limit: 100 })
  const { data: tipos } = useTiposMovimiento({ estado: true, limit: 100 })
  const { data: articulos } = useArticulos({ estado: true, limit: 100 })

  const opcionesDeposito: SelectOption[] = [
    { value: '', label: 'Todos los depósitos' },
    ...(depositos?.data.map((deposito) => ({
      value: String(deposito.id_deposito),
      label: deposito.nombre,
    })) ?? []),
  ]

  const opcionesTipo: SelectOption[] = [
    { value: '', label: 'Todos los tipos de movimiento' },
    ...(tipos?.data.map((tipo) => ({
      value: String(tipo.id_tipo_movimiento),
      label: tipo.nombre,
    })) ?? []),
  ]

  const opcionesArticulo: SelectOption[] = [
    { value: '', label: 'Todos los artículos' },
    ...(articulos?.data.map((articulo) => ({
      value: String(articulo.id_articulo),
      label: articulo.nombre,
    })) ?? []),
  ]

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            size="sm"
            options={opcionesDeposito}
            aria-label="Filtrar por depósito"
            value={FK_Deposito}
            onChange={(evento) => onFKDepositoChange(evento.target.value)}
            className="w-60"
          />
          <Select
            size="sm"
            options={opcionesTipo}
            aria-label="Filtrar por tipo de movimiento"
            value={FK_TipoMovimiento}
            onChange={(evento) => onFKTipoMovimientoChange(evento.target.value)}
            // Más ancho que los otros dos: "Todos los tipos de movimiento" no
            // entra en w-60 y se corta contra la flecha del select.
            className="w-72"
          />
          <Select
            size="sm"
            options={opcionesArticulo}
            aria-label="Filtrar por artículo"
            value={FK_articulo}
            onChange={(evento) => onFKArticuloChange(evento.target.value)}
            className="w-60"
          />
        </div>

        {acciones}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {/* El `<input type="date">` nativo ya trae el calendario del navegador y
            devuelve el valor en ISO (YYYY-MM-DD), que es lo que espera la query. */}
        <Input
          size="sm"
          type="date"
          label="Fecha desde"
          value={fechaDesde}
          onChange={(evento) => onFechaDesdeChange(evento.target.value)}
          className="w-44"
        />
        <Input
          size="sm"
          type="date"
          label="Fecha hasta"
          value={fechaHasta}
          onChange={(evento) => onFechaHastaChange(evento.target.value)}
          error={errorRango}
          className="w-44"
        />
        <Button
          size="sm"
          icon={<FilterX />}
          onClick={onLimpiar}
          disabled={!hayFiltros}
          title="Quitar todos los filtros aplicados"
        >
          Limpiar filtros
        </Button>
      </div>
    </div>
  )
}
