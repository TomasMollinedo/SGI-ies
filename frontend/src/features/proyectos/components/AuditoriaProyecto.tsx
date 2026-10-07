import { SeccionPublicacion } from '@/features/comercializacion/publicaciones/components/SeccionPublicacion'
import { AuditInfo } from '@/shared/components/common/AuditInfo'
import type { ProyectoDetalle } from '../types/proyecto.types'

/** Tarjeta de auditoría del proyecto: quién lo creó y quién lo modificó por última vez. */
export function AuditoriaProyecto({ proyecto }: { proyecto: ProyectoDetalle }) {
  return (
    <SeccionPublicacion titulo="Auditoría">
      <AuditInfo
        className="border-t-0 pt-0"
        createdAt={proyecto.hora_creacion}
        createdBy={{
          nombre: `${proyecto.usuarioCreador.nombre} ${proyecto.usuarioCreador.apellido}`,
        }}
        updatedAt={proyecto.hora_actualizacion ?? undefined}
        updatedBy={{
          nombre: `${proyecto.usuarioActualizador.nombre} ${proyecto.usuarioActualizador.apellido}`,
        }}
      />
    </SeccionPublicacion>
  )
}
