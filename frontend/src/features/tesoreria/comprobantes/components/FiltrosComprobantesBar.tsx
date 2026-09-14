import { useState } from 'react'
import type { ReactNode } from 'react'
import { FilterX } from 'lucide-react'
import { useProveedores } from '@/features/compras/proveedores/hooks/useProveedores'
import { useTiposComprobante } from '@/features/tesoreria/tipos-comprobante/hooks/useTiposComprobante'
import { Button } from '@/shared/components/ui/Button'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { OPCIONES_EFECTO_SALDO, OPCIONES_ESTADO, OPCIONES_ESTADO_SALDO } from '../config/comprobante.config'

const LIMITE_BUSQUEDA = 10

interface FiltrosComprobantesBarProps {
  FK_proveedor: string
  onFKProveedorChange: (valor: string) => void
  FK_tipo_comprobante: string
  onFKTipoComprobanteChange: (valor: string) => void
  aumentaSaldo: string
  onAumentaSaldoChange: (valor: string) => void
  estado: string
  onEstadoChange: (valor: string) => void
  estadoSaldo: string
  onEstadoSaldoChange: (valor: string) => void
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
 * Barra de filtros del listado de comprobantes: proveedor, tipo, efecto del
 * tipo sobre el saldo, estado del documento, estado de saldo y rango de fechas
 * de emisión. Todos opcionales y combinables.
 *
 * El proveedor es un `<Combobox>` con búsqueda server-side (catálogo grande);
 * incluye los dados de baja, porque puede haber comprobantes de un proveedor
 * que después se dio de baja. Borrar el texto deshace la selección.
 */
export function FiltrosComprobantesBar({
  FK_proveedor,
  onFKProveedorChange,
  FK_tipo_comprobante,
  onFKTipoComprobanteChange,
  aumentaSaldo,
  onAumentaSaldoChange,
  estado,
  onEstadoChange,
  estadoSaldo,
  onEstadoSaldoChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  errorRango,
  onLimpiar,
  hayFiltros,
  acciones,
}: FiltrosComprobantesBarProps) {
  const [busquedaProveedor, setBusquedaProveedor] = useState('')

  const { data: proveedores, isFetching: buscandoProveedores } = useProveedores({
    busqueda: busquedaProveedor.trim() || undefined,
    estado: 'todos',
    limit: LIMITE_BUSQUEDA,
  })
  // Sin `estado`: se puede filtrar por un tipo que después se dio de baja.
  const { data: tipos } = useTiposComprobante({ limit: 100 })

  const opcionesProveedor: ComboboxOption[] = (proveedores?.data ?? []).map((proveedor) => ({
    value: String(proveedor.id_proveedor),
    label: proveedor.razon_social,
    description: [proveedor.cuit, ...(proveedor.estado ? [] : ['Dado de baja'])].join(' · '),
  }))
  const hayMasProveedores = (proveedores?.meta.total ?? 0) > opcionesProveedor.length

  const opcionesTipo: SelectOption[] = [
    { value: '', label: 'Todos los tipos' },
    ...(tipos?.data.map((tipo) => ({
      value: String(tipo.id_tipo_comprobante),
      label: tipo.nombre,
    })) ?? []),
  ]

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Combobox
            size="sm"
            label="Proveedor"
            placeholder="Todos los proveedores"
            minChars={1}
            value={FK_proveedor}
            onChange={onFKProveedorChange}
            options={opcionesProveedor}
            onSearch={setBusquedaProveedor}
            loading={buscandoProveedores}
            hasMoreResults={hayMasProveedores}
            emptyText="No se encontraron proveedores"
            className="w-64"
          />

          <Select
            size="sm"
            label="Tipo"
            options={opcionesTipo}
            value={FK_tipo_comprobante}
            onChange={(evento) => onFKTipoComprobanteChange(evento.target.value)}
            className="w-52"
          />

          <Select
            size="sm"
            label="Efecto sobre el saldo"
            options={OPCIONES_EFECTO_SALDO}
            value={aumentaSaldo}
            onChange={(evento) => onAumentaSaldoChange(evento.target.value)}
            className="w-52"
          />

          <Select
            size="sm"
            label="Estado"
            options={OPCIONES_ESTADO}
            value={estado}
            onChange={(evento) => onEstadoChange(evento.target.value)}
            className="w-48"
          />

          <Select
            size="sm"
            label="Estado de saldo"
            options={OPCIONES_ESTADO_SALDO}
            value={estadoSaldo}
            onChange={(evento) => onEstadoSaldoChange(evento.target.value)}
            className="w-48"
          />
        </div>

        {acciones}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          size="sm"
          type="date"
          label="Emitido desde"
          value={fechaDesde}
          onChange={(evento) => onFechaDesdeChange(evento.target.value)}
          className="w-44"
        />
        <Input
          size="sm"
          type="date"
          label="Emitido hasta"
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