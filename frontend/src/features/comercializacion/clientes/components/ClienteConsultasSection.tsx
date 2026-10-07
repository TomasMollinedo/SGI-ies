import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { formatearFecha } from '@/shared/utils/fecha'
import { badgeEstadoConsulta } from '@/features/comercializacion/consultas/config/consulta.config'
import type { ConsultaFicha } from '../types/cliente.types'
import { SeccionFicha, SeccionVacia } from './SeccionFicha'

/**
 * Sección (e) de la ficha: las consultas del cliente sobre unidades
 * publicadas (HU-26), con su estado y su respuesta.
 *
 * Desde acá no se responde una consulta: eso vive en la cola de consultas de
 * Comercialización, que es su propia pantalla.
 */
export function ClienteConsultasSection({ consultas }: { consultas: ConsultaFicha[] }) {
  const columnas: DataTableColumn<ConsultaFicha>[] = [
    { key: 'fecha', label: 'Fecha', render: (consulta) => formatearFecha(consulta.fecha) },
    {
      key: 'unidad',
      label: 'Unidad',
      render: (consulta) => (
        <div className="min-w-0">
          <p className="text-content font-medium wrap-anywhere">{consulta.unidad.identificador}</p>
          <p className="text-content-muted text-xs wrap-anywhere">{consulta.proyecto.nombre}</p>
        </div>
      ),
    },
    {
      key: 'texto',
      label: 'Consulta',
      render: (consulta) => <p className="text-content text-xs wrap-anywhere">{consulta.texto}</p>,
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (consulta) => badgeEstadoConsulta(consulta.estado),
    },
    {
      key: 'respuesta',
      label: 'Respuesta',
      render: (consulta) => <Respuesta consulta={consulta} />,
    },
  ]

  return (
    <SeccionFicha titulo="Consultas sobre unidades">
      {consultas.length === 0 ? (
        <SeccionVacia texto="Este cliente no hizo consultas sobre ninguna unidad." />
      ) : (
        <DataTable
          data={consultas}
          columns={columnas}
          obtenerId={(consulta) => String(consulta.id_consulta)}
          ariaLabel="Consultas del cliente"
        />
      )}
    </SeccionFicha>
  )
}

/** Una consulta pendiente no tiene respuesta todavía, y se dice en texto. */
function Respuesta({ consulta }: { consulta: ConsultaFicha }) {
  if (!consulta.respuesta) {
    return <p className="text-content-muted text-xs">Sin responder</p>
  }

  return (
    <div className="min-w-0">
      <p className="text-content text-xs wrap-anywhere">{consulta.respuesta}</p>
      {consulta.fecha_respuesta && (
        <p className="text-content-muted text-xs">{formatearFecha(consulta.fecha_respuesta)}</p>
      )}
    </div>
  )
}
