import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { crearProyectoFormSchema } from '../types/proyecto.schema'
import type { ProyectoFormOutput, ProyectoFormValues } from '../types/proyecto.schema'
import type { ProyectoDetalle } from '../types/proyecto.types'
import { valoresDesdeProyecto, valoresInicialesProyecto } from '../utils/payloadProyecto'

/**
 * El formulario de proyecto (react-hook-form + Zod), compartido por los tres
 * modos. Sin `proyecto` arranca vacío (alta); con `proyecto`, precargado.
 *
 * El formulario vive en la página y no en `ProyectoForm` porque la cabecera
 * —que es de la página— necesita su estado (el botón Guardar, la confirmación
 * de salida) y repartir en los campos los errores del backend.
 */
export function useProyectoForm(proyecto: ProyectoDetalle | undefined) {
  // En edición las planificadas no pueden bajar de las unidades ya cargadas.
  const unidadesCargadas = proyecto?.unidades_cargadas ?? 0
  const schema = useMemo(() => crearProyectoFormSchema(unidadesCargadas), [unidadesCargadas])

  const form = useForm<ProyectoFormValues, unknown, ProyectoFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: valoresInicialesProyecto(),
    mode: 'onChange',
  })

  const { reset } = form
  const { isDirty } = form.formState
  const tieneCambiosRef = useRef(isDirty)
  const idCargadoRef = useRef<number | null>(null)

  useEffect(() => {
    tieneCambiosRef.current = isDirty
  }, [isDirty])

  // Precarga al llegar el proyecto (o al cambiar de proyecto). Si después el
  // mismo proyecto se vuelve a pedir —cada operación de la galería invalida el
  // detalle— solo se recarga el formulario si no hay nada sin guardar: pisarlo
  // le haría perder al usuario lo que estaba editando.
  useEffect(() => {
    const idProyecto = proyecto?.id_proyecto ?? null
    const cambioDeProyecto = idProyecto !== idCargadoRef.current
    idCargadoRef.current = idProyecto

    if (!proyecto) {
      if (cambioDeProyecto) reset(valoresInicialesProyecto())
      return
    }
    if (cambioDeProyecto || !tieneCambiosRef.current) reset(valoresDesdeProyecto(proyecto))
  }, [proyecto, reset])

  return form
}
