import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'
import { cn } from '@/shared/utils/cn'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  disabled?: boolean
  className?: string
}

/**
 * Paginación de los listados. Es un compuesto: los controles de flecha son
 * `IconButton`, y los números son botones propios con el color secundario.
 *
 * Props:
 * - `currentPage`: página actual, empezando en 1.
 * - `totalPages`: cantidad total de páginas.
 * - `totalItems`: cantidad total de resultados. Si es 0, el componente no
 *   renderiza nada.
 * - `pageSize`: resultados por página. Se usa para calcular el "Mostrando X a Y".
 * - `onPageChange`: se llama con el número de página elegido.
 * - `disabled`: bloquea todos los controles. Se usa mientras hay un fetch en
 *   curso, para que no se encolen cambios de página contra datos viejos.
 * - `className`: clases extra para el contenedor.
 *
 * Cuando hay muchas páginas no se listan todas: se muestra la primera, la
 * última y una ventana alrededor de la actual, con elipsis en los huecos
 * (ej. `1 … 4 5 6 … 20`).
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  disabled = false,
  className,
}: PaginationProps) {
  if (totalItems === 0) return null

  const primerResultado = (currentPage - 1) * pageSize + 1
  const ultimoResultado = Math.min(currentPage * pageSize, totalItems)
  const paginas = calcularPaginas(currentPage, totalPages)

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-4', className)}>
      <p className="text-content-muted text-xs">
        Mostrando <span className="text-content font-semibold">{primerResultado}</span> a{' '}
        <span className="text-content font-semibold">{ultimoResultado}</span> de{' '}
        <span className="text-content font-semibold">{totalItems}</span> resultados
      </p>

      <nav aria-label="Paginación" className="flex items-center gap-1">
        <IconButton
          icon={<ChevronLeft />}
          ariaLabel="Página anterior"
          variant="soft"
          size="sm"
          bgColor="secondary-soft"
          iconColor="content"
          disabled={disabled || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        />

        {paginas.map((pagina) =>
          typeof pagina === 'number' ? (
            <button
              key={pagina}
              type="button"
              aria-label={`Página ${pagina}`}
              aria-current={pagina === currentPage ? 'page' : undefined}
              disabled={disabled}
              onClick={() => onPageChange(pagina)}
              className={cn(
                CLASES_NUMERO_BASE,
                pagina === currentPage ? CLASES_NUMERO_ACTUAL : CLASES_NUMERO_RESTO
              )}
            >
              {pagina}
            </button>
          ) : (
            <span
              key={pagina}
              aria-hidden="true"
              className="text-content-muted inline-flex h-10 min-w-10 items-center justify-center text-xs"
            >
              …
            </span>
          )
        )}

        <IconButton
          icon={<ChevronRight />}
          ariaLabel="Página siguiente"
          variant="soft"
          size="sm"
          bgColor="secondary-soft"
          iconColor="content"
          disabled={disabled || currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        />
      </nav>
    </div>
  )
}

/** Hasta esta cantidad de páginas se listan todas, sin elipsis. */
const MAXIMO_SIN_ELIPSIS = 7

type PaginaOElipsis = number | 'elipsis-inicio' | 'elipsis-fin'

/**
 * Arma la lista de botones a mostrar. Siempre incluye la primera y la última
 * página, más una ventana de tres alrededor de la actual. Cerca de los bordes
 * la ventana se corre, para que la cantidad de botones no cambie al navegar.
 */
function calcularPaginas(paginaActual: number, totalPaginas: number): PaginaOElipsis[] {
  if (totalPaginas <= MAXIMO_SIN_ELIPSIS) {
    return Array.from({ length: totalPaginas }, (_, indice) => indice + 1)
  }

  let desde = Math.max(2, paginaActual - 1)
  let hasta = Math.min(totalPaginas - 1, paginaActual + 1)

  if (paginaActual <= 3) {
    desde = 2
    hasta = 4
  }

  if (paginaActual >= totalPaginas - 2) {
    desde = totalPaginas - 3
    hasta = totalPaginas - 1
  }

  const paginas: PaginaOElipsis[] = [1]

  if (desde > 2) paginas.push('elipsis-inicio')
  for (let pagina = desde; pagina <= hasta; pagina += 1) paginas.push(pagina)
  if (hasta < totalPaginas - 1) paginas.push('elipsis-fin')

  paginas.push(totalPaginas)

  return paginas
}

// La altura (h-10 / 40px) es la misma del IconButton sm, para que los números
// queden alineados con las flechas.
const CLASES_NUMERO_BASE = [
  'inline-flex h-10 min-w-10 items-center justify-center rounded-md px-2',
  'text-content cursor-pointer text-xs font-medium transition-colors',
  'focus-visible:outline-content focus-visible:outline-2 focus-visible:outline-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

const CLASES_NUMERO_ACTUAL = 'bg-secondary font-semibold'

const CLASES_NUMERO_RESTO =
  'bg-secondary-soft enabled:hover:bg-[color-mix(in_srgb,var(--color-secondary-soft)_85%,var(--color-dark))]'
