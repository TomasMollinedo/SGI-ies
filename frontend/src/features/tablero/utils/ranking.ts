import { nombreCliente } from '@/features/tesoreria/cobranzas/utils/cliente'
import type { ResumenPeriodoCobro } from '@/features/tesoreria/cobranzas/types/cobro.types'
import { TOP_RANKING } from '../config/tablero.config'
import type { IngresoPorProyecto, ItemRanking } from '../types/tablero.types'

/** Los que más aportaron, de mayor a menor; los que no aportaron nada no entran. */
function masAportaron(items: ItemRanking[]): ItemRanking[] {
  return items
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_RANKING)
}

export function rankingProyectos(ingresosPorProyecto: IngresoPorProyecto[]): ItemRanking[] {
  return masAportaron(
    ingresosPorProyecto.map(({ proyecto, total }) => ({
      id: proyecto.id_proyecto,
      nombre: proyecto.nombre,
      total,
    }))
  )
}

export function rankingClientes(resumen: ResumenPeriodoCobro): ItemRanking[] {
  return masAportaron(
    resumen.subtotalesPorCliente.map(({ cliente, total }) => ({
      id: cliente.id_cliente,
      nombre: nombreCliente(cliente),
      total,
    }))
  )
}
