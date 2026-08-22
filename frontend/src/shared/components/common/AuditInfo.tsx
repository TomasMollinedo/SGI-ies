import { cn } from '@/shared/utils/cn'
import { formatearFechaHora } from '@/shared/utils/fecha'

export interface AuditUser {
  nombre: string
  avatarUrl?: string
}

interface AuditInfoProps {
  createdAt: string | Date
  createdBy: AuditUser
  updatedAt?: string | Date
  updatedBy?: AuditUser
  className?: string
}

/**
 * Bloque de trazabilidad del pie de las pantallas de detalle: cuándo se creó el
 * registro y cuándo se modificó, y quién hizo cada cosa.
 *
 * Props:
 * - `createdAt` / `createdBy`: fecha y autor de la creación. Obligatorios.
 * - `updatedAt` / `updatedBy`: fecha y autor de la última modificación. Si
 *   falta alguno de los dos, la columna no se renderiza.
 * - `className`: clases extra para el contenedor.
 *
 * Las fechas se formatean con `formatearFechaHora`, o sea `DD/MM/AAAA HH:MM` en
 * horario de Argentina. Si una persona no tiene `avatarUrl` se muestra un
 * círculo con sus iniciales.
 *
 * Desde `sm` son dos columnas; en pantallas angostas pasan a una.
 */
export function AuditInfo({
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
  className,
}: AuditInfoProps) {
  const tieneModificacion = updatedAt !== undefined && updatedBy !== undefined

  return (
    <div className={cn('border-subtle grid gap-6 border-t pt-4 sm:grid-cols-2', className)}>
      <Columna etiqueta="Creado" fecha={createdAt} usuario={createdBy} />

      {tieneModificacion && (
        <Columna etiqueta="Última modificación" fecha={updatedAt} usuario={updatedBy} />
      )}
    </div>
  )
}

interface ColumnaProps {
  etiqueta: string
  fecha: string | Date
  usuario: AuditUser
}

function Columna({ etiqueta, fecha, usuario }: ColumnaProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-content-muted text-xs font-medium uppercase">{etiqueta}</span>
      <span className="text-content text-sm">{formatearFechaHora(fecha)}</span>

      <div className="flex items-center gap-2">
        <Avatar usuario={usuario} />
        <span className="text-content text-xs">{usuario.nombre}</span>
      </div>
    </div>
  )
}

function Avatar({ usuario }: { usuario: AuditUser }) {
  if (usuario.avatarUrl) {
    return (
      // El alt va vacío a propósito: el nombre está al lado, y repetirlo haría
      // que un lector de pantalla lo anuncie dos veces.
      <img src={usuario.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
    )
  }

  return (
    <span
      aria-hidden="true"
      className="bg-primary text-primary-content flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
    >
      {obtenerIniciales(usuario.nombre)}
    </span>
  )
}

/** Primera letra de las dos primeras palabras del nombre. */
function obtenerIniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('')
}
