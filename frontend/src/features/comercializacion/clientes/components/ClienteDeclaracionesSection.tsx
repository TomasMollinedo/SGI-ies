import { FileText, Paperclip } from 'lucide-react'
import { DataTable } from '@/shared/components/common/DataTable'
import type { DataTableColumn } from '@/shared/components/common/DataTable'
import { IconButton } from '@/shared/components/ui/IconButton'
import { formatearFecha } from '@/shared/utils/fecha'
import { formatearImporte } from '@/shared/utils/importe'
import { etiquetaNumeroCuota } from '@/features/tesoreria/cobranzas/config/cobro.config'
import { badgeEstadoDeclaracion } from '@/features/tesoreria/declaraciones-pago/config/declaracionPago.config'
import { SIN_DATO } from '../config/cliente.config'
import type { DeclaracionFicha } from '../types/cliente.types'
import { SeccionFicha, SeccionVacia } from './SeccionFicha'

/**
 * Sección (d) de la ficha: las declaraciones de pago pendientes o rechazadas
 * (HU-29). Las validadas no aparecen acá — ya figuran como cobro en la
 * sección anterior.
 *
 * Comercialización puede ver el comprobante además del cliente y de Tesorería
 * (propuesta del equipo para OBS-18). Hoy la ficha muestra solo sus
 * metadatos: la descarga del archivo es T146 (ver `AccionVerComprobante`).
 *
 * Desde acá no se valida ni se rechaza una declaración: eso vive en la
 * pantalla de Tesorería.
 */
export function ClienteDeclaracionesSection({
  declaraciones,
}: {
  declaraciones: DeclaracionFicha[]
}) {
  const columnas: DataTableColumn<DeclaracionFicha>[] = [
    {
      key: 'fecha',
      label: 'Fecha',
      render: (declaracion) => formatearFecha(declaracion.fecha),
    },
    {
      key: 'importe',
      label: 'Importe',
      render: (declaracion) => (
        <p className="text-content text-xs font-medium">{formatearImporte(declaracion.importe)}</p>
      ),
    },
    {
      key: 'cuota',
      label: 'Cuota',
      render: (declaracion) => etiquetaNumeroCuota(declaracion.cuota.numero),
    },
    {
      key: 'formaPago',
      label: 'Forma de pago',
      render: (declaracion) => declaracion.forma_pago.nombre,
    },
    {
      key: 'referencia',
      label: 'Nº de referencia',
      render: (declaracion) => declaracion.numero_referencia ?? SIN_DATO,
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (declaracion) => badgeEstadoDeclaracion(declaracion.estado),
    },
    {
      key: 'motivoRechazo',
      label: 'Motivo del rechazo',
      render: (declaracion) =>
        declaracion.motivo_rechazo ? (
          <p className="text-content-muted text-xs wrap-anywhere">{declaracion.motivo_rechazo}</p>
        ) : (
          SIN_DATO
        ),
    },
    {
      key: 'comprobante',
      label: 'Comprobante',
      render: (declaracion) => <DatosComprobante declaracion={declaracion} />,
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (declaracion) => <AccionVerComprobante declaracion={declaracion} />,
    },
  ]

  return (
    <SeccionFicha titulo="Declaraciones de pago pendientes o rechazadas">
      {declaraciones.length === 0 ? (
        <SeccionVacia texto="Este cliente no tiene declaraciones de pago pendientes ni rechazadas." />
      ) : (
        <DataTable
          data={declaraciones}
          columns={columnas}
          obtenerId={(declaracion) => String(declaracion.id_declaracion_pago)}
          ariaLabel="Declaraciones de pago del cliente"
        />
      )}
    </SeccionFicha>
  )
}

/**
 * Nombre y tipo del archivo adjunto. Una declaración del Sprint 3 no tiene
 * comprobante, y eso se dice en texto en vez de dejar la celda vacía.
 */
function DatosComprobante({ declaracion }: { declaracion: DeclaracionFicha }) {
  const { comprobante } = declaracion

  if (!comprobante) {
    return <p className="text-content-muted text-xs">Sin comprobante</p>
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Paperclip className="text-content-muted size-3.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-content text-xs wrap-anywhere">
          {comprobante.nombre_archivo ?? 'Archivo adjunto'}
        </p>
        {comprobante.tipo && (
          <p className="text-content-muted text-xs">{etiquetaTipoArchivo(comprobante.tipo)}</p>
        )}
      </div>
    </div>
  )
}

/**
 * Único punto desde el que se abre el comprobante.
 *
 * Queda deshabilitado porque el endpoint que entrega el archivo todavía no
 * existe: la ruta vive en un repositorio privado y nunca viaja al frontend, así
 * que no hay `href` que armar hasta que haya endpoint.
 */
function AccionVerComprobante({ declaracion }: { declaracion: DeclaracionFicha }) {
  const tieneComprobante = declaracion.comprobante !== null

  // TODO (T146): cuando mergee el endpoint interno de comprobantes, enchufar
  // acá su service y sacar el `disabled` y el `title`.
  return (
    <IconButton
      icon={<FileText />}
      ariaLabel={`Ver el comprobante de la declaración #${declaracion.id_declaracion_pago}`}
      title={
        tieneComprobante
          ? 'Ver el comprobante: se habilita con T146'
          : 'La declaración no tiene comprobante adjunto'
      }
      variant="soft"
      size="sm"
      bgColor="fondo-ver"
      iconColor="info"
      disabled
    />
  )
}

/** MIME del adjunto a algo legible. El backend solo acepta estos tres. */
function etiquetaTipoArchivo(tipo: string): string {
  switch (tipo) {
    case 'application/pdf':
      return 'PDF'
    case 'image/jpeg':
      return 'JPG'
    case 'image/png':
      return 'PNG'
    default:
      return tipo
  }
}
