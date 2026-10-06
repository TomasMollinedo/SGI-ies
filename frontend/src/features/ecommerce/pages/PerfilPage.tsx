import { useState } from 'react'
import { MessageSquare, Building2, Pencil, User } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { Pagination } from '@/shared/components/common/Pagination'
import { Spinner } from '@/shared/components/ui/Spinner'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearFecha } from '@/shared/utils/fecha'
import { cn } from '@/shared/utils/cn'
import { FilaDato } from '../components/FilaDato'
import { LinkButton } from '../components/LinkButton'
import { TarjetaPublica } from '../components/TarjetaPublica'
import { ESTADO_CONSULTA_LABEL } from '../config/consulta.config'
import { useClienteAuthUser } from '../hooks/useClienteAuthUser'
import { useMisConsultas } from '../hooks/useConsultas'
import type { Consulta } from '../types/consulta.types'

const SIN_DATO = '—'
const LIMITE_PAGINA_CONSULTAS = 5

/**
 * Perfil del cliente (HU-28): datos personales + historial de sus propias
 * consultas (HU-26 / T119), de la más reciente a la más antigua.
 *
 * Antes esta página vivía dentro de `PaginaCentrada` (pensada para una sola
 * tarjeta corta, centrada vertical y horizontalmente). Con una segunda
 * sección que puede crecer (el historial), se pasa a un contenedor simple
 * que arranca arriba — `PaginaCentrada` sigue siendo la indicada para login
 * y completar datos, que son de una sola tarjeta.
 */
export function PerfilPage() {
  const { data: cliente } = useClienteAuthUser()
  const [page, setPage] = useState(1)
  const {
    data,
    isLoading: cargandoConsultas,
    error: errorConsultas,
  } = useMisConsultas({ page, limit: LIMITE_PAGINA_CONSULTAS })

  // ClienteProtectedRoute ya garantiza que hay sesión al llegar acá.
  if (!cliente) return null

  const consultas = data?.data ?? []
  const meta = data?.meta
  const totalPaginas = meta ? Math.ceil(meta.total / meta.limit) : 0

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-12 sm:px-6">
      <TarjetaPublica
        icon={<User />}
        title="Mi perfil"
        footer={
          <>
            <LinkButton
              to={PATHS.ECOMMERCE.MIS_COMPRAS}
              variant="primary"
              icon={<Building2 />}
              className="font-mono tracking-widest uppercase"
            >
              Mis compras
            </LinkButton>
            <LinkButton
              to={PATHS.ECOMMERCE.COMPLETAR_DATOS}
              variant="secondary"
              icon={<Pencil />}
              className="font-mono tracking-widest uppercase"
            >
              Editar mis datos
            </LinkButton>
          </>
        }
      >
        <FilaDato etiqueta="Nombre" valor={cliente.nombre} />
        <FilaDato etiqueta="Apellido" valor={cliente.apellido ?? SIN_DATO} />
        <FilaDato etiqueta="Email" valor={cliente.email} />
        <FilaDato etiqueta="DNI / CUIT" valor={cliente.dni_cuil ?? SIN_DATO} />
        <FilaDato etiqueta="Teléfono" valor={cliente.telefono ?? SIN_DATO} />
      </TarjetaPublica>

      <TarjetaPublica icon={<MessageSquare />} title="Mis consultas">
        {cargandoConsultas ? (
          <div className="flex justify-center py-6">
            <Spinner className="text-secondary size-6" />
          </div>
        ) : errorConsultas ? (
          <p role="alert" className="text-error-soft text-sm">
            {formatearMensajeError(errorConsultas.message)}
          </p>
        ) : consultas.length === 0 ? (
          <p className="text-light/60 text-sm">Todavía no hiciste ninguna consulta.</p>
        ) : (
          <>
            <ul className="flex flex-col">
              {consultas.map((consulta) => (
                <FilaConsulta key={consulta.id_consulta} consulta={consulta} />
              ))}
            </ul>

            {meta && (
              <Pagination
                currentPage={meta.page}
                totalPages={totalPaginas}
                totalItems={meta.total}
                pageSize={meta.limit}
                onPageChange={setPage}
                className="mt-4 [&>p]:text-light/70 [&>p_span]:text-light [&_nav>span]:text-light/70"
              />
            )}
          </>
        )}
      </TarjetaPublica>
    </div>
  )
}

/** Una consulta del historial: pregunta, estado y la respuesta cuando ya existe. */
function FilaConsulta({ consulta }: { consulta: Consulta }) {
  return (
    <li className="border-light/10 flex flex-col gap-2 border-b py-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-secondary font-mono text-xs tracking-widest uppercase">
          {consulta.unidad.identificador} · {consulta.unidad.proyecto.nombre}
        </p>
        <span
          className={cn(
            'font-mono text-xs tracking-widest uppercase',
            consulta.estado === 'RESPONDIDA' ? 'text-success' : 'text-warning'
          )}
        >
          {ESTADO_CONSULTA_LABEL[consulta.estado]}
        </span>
      </div>

      <p className="text-light text-sm">{consulta.texto}</p>
      <p className="text-light/40 text-xs">{formatearFecha(consulta.hora_creacion)}</p>

      {consulta.respuesta && (
        <div className="border-light/20 mt-1 border-l-2 pl-3">
          <p className="text-light/80 text-sm">{consulta.respuesta}</p>
          {consulta.fecha_respuesta && (
            <p className="text-light/40 mt-1 text-xs">
              Respondida el {formatearFecha(consulta.fecha_respuesta)}
            </p>
          )}
        </div>
      )}
    </li>
  )
}
