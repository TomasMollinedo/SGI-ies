import { useState } from 'react'
import type { ReactNode } from 'react'
import { FilterX } from 'lucide-react'
import { useArticulos } from '@/features/almacen/artículos/hooks/useArticulos'
import { formatearCodigoArticulo } from '@/features/almacen/artículos/utils/codigoArticulo'
import { useDepositos } from '@/features/almacen/deposito/hooks/useDepositos'
import { formatearCodigoDeposito } from '@/features/almacen/deposito/utils/codigoDeposito'
import { useTiposMovimiento } from '@/features/almacen/tipo-movimiento/hooks/useTiposMovimiento'
import { Button } from '@/shared/components/ui/Button'
import { Combobox } from '@/shared/components/ui/Combobox'
import type { ComboboxOption } from '@/shared/components/ui/Combobox'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'

/** Resultados que se muestran en cada desplegable de búsqueda. */
const LIMITE_BUSQUEDA = 10

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
 * Depósito y artículo son `<Combobox>` con búsqueda server-side —igual que el
 * artículo en el alta de una ficha de stock—, porque son catálogos que crecen y
 * no entran cómodos en un desplegable. Borrar el texto del campo deshace la
 * selección, que es la forma de volver a "todos".
 *
 * Se arma en dos filas: arriba los filtros de catálogo —con las acciones de la
 * pantalla pegadas al extremo derecho— y abajo el rango de fechas con el botón
 * de limpiar. En pantallas angostas cada fila envuelve por su cuenta.
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
  const [busquedaDeposito, setBusquedaDeposito] = useState('')
  const [busquedaArticulo, setBusquedaArticulo] = useState('')

  const { data: tipos } = useTiposMovimiento({ estado: true, limit: 100 })

  // Sin `estado` el backend devuelve activos y dados de baja: el historial
  // incluye movimientos contra depósitos que después se dieron de baja, y hay
  // que poder filtrarlos igual.
  const { data: depositos, isFetching: buscandoDepositos } = useDepositos({
    nombre: busquedaDeposito.trim() || undefined,
    limit: LIMITE_BUSQUEDA,
  })

  // El listado de artículos es el más grande de los tres: recién se pide con 3+
  // caracteres, igual que en el alta de stock (el propio `Combobox` tampoco
  // llama a `onSearch` antes de eso).
  const buscarArticulos = busquedaArticulo.trim().length >= 3

  // GET /articulos es el único listado de Almacén que, sin el parámetro
  // `estado`, devuelve solo los activos —y no acepta un valor para "todos"—,
  // así que los dados de baja hay que pedirlos aparte y unirlos acá. El día que
  // el backend permita omitirlo, esto vuelve a ser una sola llamada.
  const { data: articulosActivos, isFetching: buscandoActivos } = useArticulos(
    { busqueda: busquedaArticulo, estado: true, limit: LIMITE_BUSQUEDA },
    { enabled: buscarArticulos }
  )
  const { data: articulosDeBaja, isFetching: buscandoDeBaja } = useArticulos(
    { busqueda: busquedaArticulo, estado: false, limit: LIMITE_BUSQUEDA },
    { enabled: buscarArticulos }
  )

  const buscandoArticulos = buscandoActivos || buscandoDeBaja
  const articulosEncontrados = [
    ...(articulosActivos?.data ?? []),
    ...(articulosDeBaja?.data ?? []),
  ]

  const opcionesDeposito: ComboboxOption[] = (depositos?.data ?? []).map((deposito) => ({
    value: String(deposito.id_deposito),
    label: deposito.nombre,
    description: [
      formatearCodigoDeposito(deposito.id_deposito),
      deposito.es_obrador ? 'Obrador' : 'Depósito central',
      // Se avisa cuál está dado de baja: se puede elegir igual, pero que no
      // parezca que sigue operativo.
      ...(deposito.estado ? [] : ['Dado de baja']),
    ].join(' · '),
  }))

  const opcionesArticulo: ComboboxOption[] = articulosEncontrados.map((articulo) => ({
    value: String(articulo.id_articulo),
    label: articulo.nombre,
    description: [
      formatearCodigoArticulo(articulo.id_articulo),
      ...(articulo.estado ? [] : ['Dado de baja']),
    ].join(' · '),
  }))

  const opcionesTipo: SelectOption[] = [
    { value: '', label: 'Todos los tipos de movimiento' },
    ...(tipos?.data.map((tipo) => ({
      value: String(tipo.id_tipo_movimiento),
      label: tipo.nombre,
    })) ?? []),
  ]

  const hayMasDepositos = (depositos?.meta.total ?? 0) > opcionesDeposito.length
  const totalArticulos =
    (articulosActivos?.meta.total ?? 0) + (articulosDeBaja?.meta.total ?? 0)
  const hayMasArticulos = totalArticulos > opcionesArticulo.length

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Combobox
            size="sm"
            label="Depósito"
            placeholder="Todos los depósitos"
            // Catálogo chico: con una letra ya vale la pena mostrar resultados.
            minChars={1}
            value={FK_Deposito}
            onChange={onFKDepositoChange}
            options={opcionesDeposito}
            onSearch={setBusquedaDeposito}
            loading={buscandoDepositos}
            hasMoreResults={hayMasDepositos}
            emptyText="No se encontraron depósitos"
            className="w-60"
          />

          <Select
            size="sm"
            label="Tipo de movimiento"
            options={opcionesTipo}
            value={FK_TipoMovimiento}
            onChange={(evento) => onFKTipoMovimientoChange(evento.target.value)}
            // Más ancho que los otros dos: "Todos los tipos de movimiento" no
            // entra en w-60 y se corta contra la flecha del select.
            className="w-72"
          />

          <Combobox
            size="sm"
            label="Artículo"
            placeholder="Todos los artículos"
            minChars={3}
            value={FK_articulo}
            onChange={onFKArticuloChange}
            options={opcionesArticulo}
            onSearch={setBusquedaArticulo}
            loading={buscandoArticulos}
            hasMoreResults={hayMasArticulos}
            emptyText="No se encontraron artículos"
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
