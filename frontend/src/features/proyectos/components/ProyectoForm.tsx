import { Controller } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { SeccionPublicacion } from '@/features/comercializacion/publicaciones/components/SeccionPublicacion'
import { Input } from '@/shared/components/ui/Input'
import { FECHA_A_CONFIRMAR } from '../config/proyecto.config'
import type { ProyectoFormOutput, ProyectoFormValues } from '../types/proyecto.schema'
import type { ProyectoDetalle } from '../types/proyecto.types'
import { GaleriaDisenoProyecto } from './GaleriaDisenoProyecto'
import { PortadaProyecto } from './PortadaProyecto'

export type ModoProyectoForm = 'crear' | 'editar' | 'lectura'

interface ProyectoFormProps {
  modo: ModoProyectoForm
  /** El formulario, creado por la página con `useProyectoForm`. */
  form: UseFormReturn<ProyectoFormValues, unknown, ProyectoFormOutput>
  /** El proyecto guardado. Obligatorio en `editar` y `lectura`; no existe en `crear`. */
  proyecto?: ProyectoDetalle
  /** `id` del `<form>`, para que el botón Guardar de la cabecera lo envíe. */
  idForm?: string
  onSubmit?: (valores: ProyectoFormOutput) => void
  onSubiendoPortadaChange?: (subiendo: boolean) => void
}

/**
 * Formulario paramétrico de Proyecto en sus tres modos (HU-31): INSERCIÓN
 * (`crear`), EDICIÓN (`editar`) y LECTURA (`lectura`). Lo usan
 * `ProyectoFormPage` (crear y editar) y `ProyectoDetallePage` (lectura).
 *
 * Solo dibuja las secciones de datos: la cabecera, las acciones y qué hacer al
 * guardar son de cada página.
 *
 * El alta es en dos pasos, igual que en unidades funcionales: la portada sí
 * se carga en el alta (es una URL más del formulario), pero las imágenes de
 * diseño necesitan que el proyecto exista, así que se habilitan en `editar`.
 */
export function ProyectoForm({
  modo,
  form,
  proyecto,
  idForm,
  onSubmit,
  onSubiendoPortadaChange,
}: ProyectoFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form

  const soloLectura = modo === 'lectura'
  const esAlta = modo === 'crear'
  const esFinalizado = proyecto?.estado_obra === 'FINALIZADO'
  const unidadesCargadas = proyecto?.unidades_cargadas ?? 0

  return (
    <form
      id={idForm}
      onSubmit={handleSubmit((valores) => onSubmit?.(valores))}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <SeccionPublicacion titulo="Datos del proyecto">
          <div className="flex flex-col gap-4">
            {!esAlta && proyecto && (
              <Input
                label="Código"
                readOnly
                disabled={soloLectura}
                value={proyecto.codigo}
                helperText="Lo genera el sistema."
              />
            )}

            <Input
              label="Nombre"
              required
              placeholder="Ej. Torre Nogal"
              disabled={soloLectura}
              error={errors.nombre?.message}
              {...register('nombre')}
            />

            <Input
              label="Dirección"
              required
              placeholder="Ej. Av. Sarmiento 1250"
              disabled={soloLectura}
              error={errors.direccion?.message}
              {...register('direccion')}
            />

            <Input
              label="Localidad"
              required
              placeholder="Ej. Resistencia, Chaco"
              disabled={soloLectura}
              error={errors.localidad?.message}
              {...register('localidad')}
            />

            <Input
              label="Descripción"
              multiline
              helperText={soloLectura ? undefined : 'Opcional'}
              disabled={soloLectura}
              error={errors.descripcion?.message}
              {...register('descripcion')}
            />
          </div>
        </SeccionPublicacion>

        <div className="flex min-w-0 flex-col gap-4">
          <SeccionPublicacion titulo="Obra y unidades">
            <div className="flex flex-col gap-4">
              <Input
                label="Unidades planificadas"
                required
                type="number"
                min={Math.max(1, unidadesCargadas)}
                step={1}
                disabled={soloLectura}
                helperText={
                  esAlta
                    ? 'Entero mayor a cero.'
                    : `El proyecto tiene ${unidadesCargadas} ${unidadesCargadas === 1 ? 'unidad activa cargada' : 'unidades activas cargadas'}${
                        unidadesCargadas > 0 && !soloLectura
                          ? `: no puede ser menor a ${unidadesCargadas}.`
                          : '.'
                      }`
                }
                error={errors.cantidad_unidades_planificadas?.message}
                {...register('cantidad_unidades_planificadas', { valueAsNumber: true })}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Fecha de inicio de obra"
                  type="date"
                  helperText={soloLectura ? undefined : 'Opcional'}
                  disabled={soloLectura}
                  error={errors.fecha_inicio?.message}
                  // La regla "fin no anterior a inicio" se informa en la fecha
                  // de fin: al cambiar el inicio hay que revalidarla.
                  {...register('fecha_inicio', { deps: ['fecha_fin_estimada'] })}
                />

                <Input
                  label="Fecha de finalización estimada"
                  type="date"
                  // Con el proyecto Finalizado la fecha ya es un hecho: el
                  // backend rechaza cualquier cambio.
                  disabled={soloLectura || esFinalizado}
                  helperText={textoAyudaFechaFin(soloLectura, esFinalizado, proyecto)}
                  error={errors.fecha_fin_estimada?.message}
                  {...register('fecha_fin_estimada')}
                />
              </div>
            </div>
          </SeccionPublicacion>

          <SeccionPublicacion titulo="Imagen de portada">
            <Controller
              name="imagen_portada_url"
              control={control}
              render={({ field }) => (
                <PortadaProyecto
                  url={field.value}
                  onChange={field.onChange}
                  soloLectura={soloLectura}
                  onSubiendoChange={onSubiendoPortadaChange}
                />
              )}
            />
          </SeccionPublicacion>
        </div>
      </div>

      <SeccionPublicacion titulo="Imágenes de diseño">
        {!esAlta && proyecto ? (
          <GaleriaDisenoProyecto proyecto={proyecto} soloLectura={soloLectura} />
        ) : (
          <p className="text-content-muted text-xs">
            Guardá el proyecto para poder cargar sus renders y planos: la galería se habilita apenas
            se crea.
          </p>
        )}
      </SeccionPublicacion>
    </form>
  )
}

function textoAyudaFechaFin(
  soloLectura: boolean,
  esFinalizado: boolean,
  proyecto: ProyectoDetalle | undefined
): string | undefined {
  if (soloLectura) return proyecto?.fecha_fin_estimada ? undefined : FECHA_A_CONFIRMAR
  if (esFinalizado) return 'El proyecto está Finalizado: esta fecha ya no se puede modificar.'
  return 'Opcional. Mientras no tenga, se muestra "A confirmar".'
}
