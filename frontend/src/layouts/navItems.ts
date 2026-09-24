import {
  ArrowLeftRight,
  BadgeCheck,
  Banknote,
  BookOpen,
  Boxes,
  Building2,
  ClipboardList,
  Coins,
  CreditCard,
  FileText,
  HandCoins,
  HardHat,
  Home,
  Landmark,
  Layers,
  ListTree,
  Megaphone,
  Package,
  Receipt,
  Ruler,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  TrendingDown,
  Truck,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { PATHS } from '@/app/router/paths'

export interface NavNode {
  label: string
  to: string
  icon: LucideIcon
  children?: NavNode[]
}

export const NAV_ITEMS: NavNode[] = [
  // { label: 'Inicio', to: PATHS.HOME },
  {
    label: 'Almacén',
    to: PATHS.ALMACEN.ROOT,
    icon: Warehouse,
    children: [
      {
        label: 'Gestión de Artículos',
        to: PATHS.ALMACEN.CATALOGO.ROOT,
        icon: BookOpen,
        children: [
          { label: 'Artículos', to: PATHS.ALMACEN.CATALOGO.ARTICULOS, icon: Package },
          { label: 'Marcas', to: PATHS.ALMACEN.CATALOGO.MARCAS, icon: Tag },
          { label: 'Categorías', to: PATHS.ALMACEN.CATALOGO.CATEGORIAS, icon: Layers },
          {
            label: 'Unidades de Medida',
            to: PATHS.ALMACEN.CATALOGO.UNIDADES_MEDIDA,
            icon: Ruler,
          },
        ],
      },
      {
        label: 'Gestión de Depósitos y Obradores',
        to: PATHS.ALMACEN.DEPOSITO.ROOT,
        icon: Boxes,
        children: [
          { label: 'Depósito y Obradores', to: PATHS.ALMACEN.DEPOSITO.OBRADORES, icon: Building2 },
          { label: 'Stock por Depósito', to: PATHS.ALMACEN.DEPOSITO.STOCK, icon: ClipboardList },
        ],
      },
      {
        label: 'Movimientos',
        to: PATHS.ALMACEN.MOVIMIENTOS.ROOT,
        icon: ArrowLeftRight,
        children: [
          { label: 'Registro de Movimientos', to: PATHS.ALMACEN.MOVIMIENTOS.ROOT, icon: FileText },
          { label: 'Tipos de Movimiento', to: PATHS.ALMACEN.MOVIMIENTOS.TIPOS, icon: ListTree },
        ],
      },
    ],
  },
  {
    label: 'Compras',
    to: PATHS.COMPRAS.ROOT,
    icon: ShoppingCart,
    children: [
      { label: 'Proveedores', to: PATHS.COMPRAS.PROVEEDORES, icon: Truck },
      { label: 'Órdenes de Compra', to: PATHS.COMPRAS.ORDENES_COMPRA, icon: ShoppingBag },
    ],
  },
  {
    label: 'Tesorería',
    to: PATHS.TESORERIA.ROOT,
    icon: Wallet,
    children: [
      {
        label: 'Comprobantes',
        to: PATHS.TESORERIA.COMPROBANTES.ROOT,
        icon: Receipt,
        children: [
          { label: 'Comprobantes', to: PATHS.TESORERIA.COMPROBANTES.ROOT, icon: FileText },
          { label: 'Tipos de Comprobante', to: PATHS.TESORERIA.COMPROBANTES.TIPOS, icon: ListTree },
        ],
      },
      {
        label: 'Pagos',
        to: PATHS.TESORERIA.PAGOS.ROOT,
        icon: CreditCard,
        children: [
          { label: 'Pagos', to: PATHS.TESORERIA.PAGOS.ROOT, icon: Banknote },
          { label: 'Formas de Pago', to: PATHS.TESORERIA.PAGOS.FORMAS, icon: Coins },
        ],
      },
      { label: 'Cuentas Corrientes', to: PATHS.TESORERIA.CUENTAS_CORRIENTES, icon: Landmark },
      { label: 'Reporte de Egresos', to: PATHS.TESORERIA.REPORTE_EGRESOS, icon: TrendingDown },
      { label: 'Cobranzas', to: PATHS.TESORERIA.COBRANZAS.ROOT, icon: HandCoins },
      {
        label: 'Declaraciones de Pago',
        to: PATHS.TESORERIA.DECLARACIONES_PAGO,
        icon: BadgeCheck,
      },
    ],
  },
  {
    label: 'Proyectos',
    to: PATHS.PROYECTOS.ROOT,
    icon: HardHat,
    children: [
      { label: 'Unidades Funcionales', to: PATHS.PROYECTOS.UNIDADES_FUNCIONALES, icon: Home },
    ],
  },
  {
    label: 'Comercialización',
    to: PATHS.COMERCIALIZACION.ROOT,
    icon: Store,
    children: [
      { label: 'Publicaciones', to: PATHS.COMERCIALIZACION.PUBLICACIONES, icon: Megaphone },
      { label: 'Ventas', to: PATHS.COMERCIALIZACION.VENTAS, icon: ShoppingCart },
    ],
  },
]

export function iconoDeRuta(pathname: string): LucideIcon | undefined {
  return buscarIconoHoja(NAV_ITEMS, pathname)
}

function buscarIconoHoja(nodos: NavNode[], pathname: string): LucideIcon | undefined {
  for (const nodo of nodos) {
    if (nodo.children) {
      const encontrado = buscarIconoHoja(nodo.children, pathname)
      if (encontrado) return encontrado
    } else if (nodo.to === pathname) {
      return nodo.icon
    }
  }
  return undefined
}

export function recolectarRamaActiva(
  nodos: NavNode[],
  pathname: string,
  acumulado: string[] = []
): string[] {
  for (const nodo of nodos) {
    if (!nodo.children) continue
    if (pathname.startsWith(nodo.to)) {
      const rama = [...acumulado, nodo.to]
      return recolectarRamaActiva(nodo.children, pathname, rama)
    }
  }
  return acumulado
}
