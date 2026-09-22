import { NOSOTROS } from '@/features/ecommerce/config/sitioPublico.config'
import { SeccionLanding } from './SeccionLanding'

/** Quiénes somos: texto institucional corto y la fila de números de trayectoria. */
export function SeccionNosotros() {
  return (
    <SeccionLanding
      id="nosotros"
      etiqueta={NOSOTROS.etiqueta}
      titulo={NOSOTROS.titulo}
      descripcion={NOSOTROS.texto}
    >
      <dl className="grid grid-cols-2 gap-8 lg:grid-cols-4">
        {NOSOTROS.numeros.map((numero) => (
          // `flex-col-reverse`: el número va arriba y la etiqueta abajo, pero en
          // el DOM el <dt> tiene que preceder a su <dd>.
          <div key={numero.etiqueta} className="border-primary flex flex-col-reverse border-t pt-4">
            <dt className="text-light/60 mt-2 font-mono text-xs tracking-widest uppercase">
              {numero.etiqueta}
            </dt>
            <dd className="text-secondary text-4xl font-extrabold tracking-tight lg:text-5xl">
              {numero.valor}
            </dd>
          </div>
        ))}
      </dl>
    </SeccionLanding>
  )
}
