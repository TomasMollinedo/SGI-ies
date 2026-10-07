import { Pencil } from 'lucide-react'
import { DetailRow } from '@/shared/components/common/DetailRow'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { formatearFecha, formatearFechaHora } from '@/shared/utils/fecha'
import { SIN_DATO } from '../config/cliente.config'
import type { ClienteFicha } from '../types/cliente.types'
import { SeccionFicha } from './SeccionFicha'

interface ClienteDatosSectionProps {
  cliente: ClienteFicha
  onEditar: () => void
}

/**
 * Sección (a) de la ficha: datos personales y de contacto, fecha de alta y
 * trazabilidad de la última modificación, con el botón que abre el modo
 * EDICIÓN.
 *
 * La trazabilidad va con `DetailRow` y no con el componente compartido
 * `AuditInfo` porque este exige un `createdBy`, y un cliente no tiene creador:
 * se autocrea con el login de Google o nace junto con una venta.
 */
export function ClienteDatosSection({ cliente, onEditar }: ClienteDatosSectionProps) {
  return (
    <SeccionFicha
      titulo="Datos personales y de contacto"
      acciones={
        <Button size="sm" icon={<Pencil />} onClick={onEditar}>
          Editar datos
        </Button>
      }
    >
      <div className="flex flex-col">
        <DetailRow label="Nombre y apellido" value={nombreCompleto(cliente)} />
        <DetailRow label="DNI/CUIL" value={cliente.dni_cuil ?? SIN_DATO} />
        <DetailRow label="Correo" value={cliente.email} />
        <DetailRow label="Teléfono" value={cliente.telefono ?? SIN_DATO} />
        <DetailRow
          label="Cuenta de Google"
          value={
            cliente.tiene_cuenta_google ? (
              <Badge variant="info">Vinculada</Badge>
            ) : (
              <Badge variant="inactive">Sin vincular</Badge>
            )
          }
        />
        <DetailRow label="Fecha de alta" value={formatearFecha(cliente.fecha_alta)} />
        <DetailRow label="Última modificación" value={textoUltimaModificacion(cliente)} />
      </div>
    </SeccionFicha>
  )
}

function nombreCompleto(cliente: ClienteFicha): string {
  return cliente.apellido ? `${cliente.nombre} ${cliente.apellido}` : cliente.nombre
}

/**
 * La auditoría del cliente es la estándar del proyecto: usuario y fecha de la
 * última modificación, sin historial de valores anteriores.
 *
 * Sin `usuarioActualizador` no se muestra un "—" pelado: que no haya usuario
 * interno significa que el cambio lo hizo el propio cliente desde su perfil
 * del ecommerce, donde solo se registra la fecha.
 */
function textoUltimaModificacion(cliente: ClienteFicha): string {
  if (!cliente.hora_actualizacion) {
    return 'Sin modificaciones desde el alta'
  }

  const cuando = formatearFechaHora(cliente.hora_actualizacion)

  if (!cliente.usuarioActualizador) {
    return `${cuando} · la hizo el propio cliente desde el ecommerce`
  }

  const { nombre, apellido } = cliente.usuarioActualizador
  return `${cuando} · ${nombre} ${apellido}`
}
