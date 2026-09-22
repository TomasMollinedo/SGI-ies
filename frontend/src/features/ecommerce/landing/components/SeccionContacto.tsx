import type { ReactNode } from 'react'
import { CONTACTO } from '@/features/ecommerce/config/sitioPublico.config'
import type { DatoContacto } from '@/features/ecommerce/types/sitioPublico.types'
import { SeccionLanding } from './SeccionLanding'

/** Datos de contacto. Sin formulario: la HU no lo pide. */
export function SeccionContacto() {
  return (
    <SeccionLanding
      id="consultanos"
      etiqueta={CONTACTO.etiqueta}
      titulo={CONTACTO.titulo}
      descripcion={CONTACTO.texto}
    >
      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {CONTACTO.datos.map((dato) => (
          <li key={dato.etiqueta}>
            <DatoDeContacto dato={dato} />
          </li>
        ))}
      </ul>
    </SeccionLanding>
  )
}

/**
 * Un dato de contacto. Con `href` es un enlace (teléfono, WhatsApp, email); sin
 * él, texto plano (dirección, horario).
 */
function DatoDeContacto({ dato }: { dato: DatoContacto }) {
  const Icono = dato.icono

  const contenido: ReactNode = (
    <>
      <Icono size={20} aria-hidden="true" className="text-primary mt-0.5 shrink-0" />
      <span>
        <span className="text-light/60 block font-mono text-xs tracking-widest uppercase">
          {dato.etiqueta}
        </span>
        <span className="text-light mt-1 block text-base">{dato.valor}</span>
      </span>
    </>
  )

  if (dato.href === undefined) {
    return <p className="flex items-start gap-3">{contenido}</p>
  }

  // `rel` solo aplica al enlace externo de WhatsApp; en tel: y mailto: es inocuo.
  return (
    <a
      href={dato.href}
      target={dato.href.startsWith('http') ? '_blank' : undefined}
      rel="noopener noreferrer"
      className="hover:text-secondary focus-visible:outline-light group flex items-start gap-3 rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      {contenido}
    </a>
  )
}
