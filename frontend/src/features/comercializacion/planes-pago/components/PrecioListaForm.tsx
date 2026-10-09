import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Save, Undo2 } from 'lucide-react'
import { AlertaInline } from '@/features/comercializacion/publicaciones/components/AlertaInline'
import { useDefinirPrecioLista } from '@/features/comercializacion/publicaciones/hooks/usePublicaciones'
import type { PublicacionDetalle } from '@/features/comercializacion/publicaciones/types/publicacion.types'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useToast } from '@/shared/hooks/useToast'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearImporte } from '@/shared/utils/importe'
import { MOTIVO_BLOQUEO_POR_VENTA, tieneVenta } from '../config/planPago.config'
import { VALORES_INICIALES_PRECIO_LISTA, precioListaFormSchema } from '../types/precioLista.schema'
import type { PrecioListaFormOutput, PrecioListaFormValues } from '../types/precioLista.schema'
import { calcularPrecioSugerido, calcularResultadoSobreCosto } from '../utils/calculoPrecio'
import {
  aMilesANumero,
  aNumero,
  aNumeroDeTexto,
  formatearMilesEnVivo,
  limitarADosDecimalesEnVivo,
  normalizarSeparadorDecimal,
  numeroAMilesTexto,
} from '../utils/decimal'
import { AyudaDePrecio } from './AyudaDePrecio'

const MOTIVO_BLOQUEO_POR_DESPUBLICACION =
  'No se puede editar: la publicación fue despublicada. Para definir un precio hay que volver a publicar la unidad'

interface PrecioListaFormProps {
  publicacion: PublicacionDetalle
}

/**
 * Formulario del precio de lista de una publicación (HU-22): un único precio
 * por publicación, que es el que hace Disponible a la unidad y del que salen
 * los planes de ejemplo.
 *
 * Tres maneras de llegar al precio, todas terminan en un número en el campo
 * Precio, que es lo único que se guarda como fuente de verdad:
 * - Con porcentaje de ganancia y/o margen: se muestra el precio sugerido en
 *   vivo (`costo + costo × % + margen`) y un botón para copiarlo. Nunca se
 *   escribe solo: el precio es decisión de Comercialización.
 * - Directo: al tipear el precio se completa el porcentaje que representa
 *   sobre el costo y se limpia el margen — el mismo ajuste contado dos veces
 *   inflaría la próxima sugerencia. Si el precio queda por debajo del costo,
 *   el porcentaje sería negativo y las columnas lo rechazan, así que se
 *   limpian los dos.
 * - Tocar porcentaje o margen después invalida el precio cargado, porque pasó
 *   a corresponder a otras condiciones.
 *
 * Un precio menor al costo se puede guardar, pero antes se advierte y hay que
 * confirmarlo. Con la unidad En Plan de Pago o Vendida, o con la publicación
 * despublicada, todo queda bloqueado (el backend responde 409).
 *
 * Las cuentas se hacen en el cliente con el costo que ya está en pantalla y
 * son informativas: lo definitivo lo calcula el backend al guardar.
 */
export function PrecioListaForm({ publicacion }: PrecioListaFormProps) {
  const toast = useToast()
  const definirPrecio = useDefinirPrecioLista()

  const costo = aNumero(publicacion.unidad.costo)
  const bloqueadaPorVenta = tieneVenta(publicacion.estado_comercial)
  const bloqueado = bloqueadaPorVenta || !publicacion.vigente
  const sinPrecioTodavia = publicacion.precio_lista === null

  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  /** El precio por debajo del costo que espera la confirmación del usuario. */
  const [precioPorConfirmar, setPrecioPorConfirmar] = useState<PrecioListaFormOutput | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid, isDirty },
  } = useForm<PrecioListaFormValues, unknown, PrecioListaFormOutput>({
    resolver: zodResolver(precioListaFormSchema),
    defaultValues: VALORES_INICIALES_PRECIO_LISTA,
    mode: 'onChange',
  })

  // Cada vez que el backend devuelve otros valores (primera carga, después de
  // guardar) el formulario se alinea con ellos. Las dependencias son los
  // valores y no el objeto: un refetch que no cambia nada no pisa lo que se
  // está tipeando.
  const { precio_lista, porcentaje_ganancia, margen: margenGuardado } = publicacion
  useEffect(() => {
    reset(valoresDesdePublicacion(precio_lista, porcentaje_ganancia, margenGuardado))
  }, [precio_lista, porcentaje_ganancia, margenGuardado, reset])

  const precio = watch('precio')
  const porcentaje = watch('porcentaje_ganancia')
  const margen = watch('margen')

  const precioNumero = aMilesANumero(precio)
  // Margen tiene puntos de miles en pantalla: un punto ahí no es decimal, por
  // eso usa su propio parser y no `aNumeroDeTexto`.
  const precioSugerido =
    precio.trim() === ''
      ? calcularPrecioSugerido(costo, aNumeroDeTexto(porcentaje), aMilesANumero(margen))
      : null
  // Se calcula siempre que hay costo y precio: es el efecto real del precio
  // actual, se haya llegado a él con las herramientas o a mano.
  const resultadoSobreCosto = calcularResultadoSobreCosto(costo, precioNumero)

  const guardando = definirPrecio.isPending

  function alEscribirPrecio(valor: string) {
    const formateado = formatearMilesEnVivo(valor)
    if (formateado !== valor) setValue('precio', formateado, { shouldValidate: true })

    const resultado = calcularResultadoSobreCosto(costo, aMilesANumero(formateado))
    if (resultado === null || resultado.porcentaje < 0) {
      setValue('porcentaje_ganancia', '', { shouldValidate: true })
    } else {
      setValue('porcentaje_ganancia', normalizarSeparadorDecimal(String(resultado.porcentaje)), {
        shouldValidate: true,
      })
    }
    setValue('margen', '', { shouldValidate: true })
  }

  /** Vuelve el formulario a lo último que devolvió el backend, sin guardar nada. */
  function descartarCambios() {
    setErrorGeneral(null)
    reset(valoresDesdePublicacion(precio_lista, porcentaje_ganancia, margenGuardado))
  }

  function limpiarPrecio() {
    if (getValues('precio') !== '') setValue('precio', '', { shouldValidate: true })
  }

  function alEscribirPorcentaje(valor: string) {
    const limitado = limitarADosDecimalesEnVivo(valor)
    if (limitado !== valor) setValue('porcentaje_ganancia', limitado, { shouldValidate: true })
    limpiarPrecio()
  }

  function alEscribirMargen(valor: string) {
    const formateado = formatearMilesEnVivo(valor)
    if (formateado !== valor) setValue('margen', formateado, { shouldValidate: true })
    limpiarPrecio()
  }

  function pedirGuardado(valores: PrecioListaFormOutput) {
    setErrorGeneral(null)

    if (costo !== null && valores.precio < costo) {
      setPrecioPorConfirmar(valores)
      return
    }
    guardar(valores, false)
  }

  function guardar(valores: PrecioListaFormOutput, yaAdvertido: boolean) {
    const eraPrimerPrecio = sinPrecioTodavia

    definirPrecio.mutate(
      {
        id: publicacion.id_publicacion,
        payload: {
          precio_lista: valores.precio,
          porcentaje_ganancia: valores.porcentaje_ganancia,
          margen: valores.margen,
        },
      },
      {
        onSuccess: (actualizada) => {
          setPrecioPorConfirmar(null)
          toast.success(
            eraPrimerPrecio
              ? 'Precio de lista definido: la publicación pasó a Disponible.'
              : 'Precio de lista actualizado.'
          )
          // Si ya se advirtió antes de guardar no se repite; esto cubre el caso
          // en que el backend ve un costo distinto al que había en pantalla.
          if (actualizada.warning && !yaAdvertido) toast.warning(actualizada.warning)
        },
        onError: (falla) => {
          setPrecioPorConfirmar(null)
          setErrorGeneral(formatearMensajeError(falla.message))
        },
      }
    )
  }

  const motivoBloqueo = bloqueadaPorVenta
    ? MOTIVO_BLOQUEO_POR_VENTA
    : !publicacion.vigente
      ? MOTIVO_BLOQUEO_POR_DESPUBLICACION
      : null

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        void handleSubmit(pedirGuardado)()
      }}
    >
      {errorGeneral && <AlertaInline>{errorGeneral}</AlertaInline>}

      {motivoBloqueo ? (
        <div
          role="status"
          className="border-warning/30 bg-warning/10 text-warning rounded-md border px-4 py-3 text-xs"
        >
          {motivoBloqueo}.
        </div>
      ) : (
        sinPrecioTodavia && (
          <p className="text-content-muted text-xs">
            Definí el precio de la unidad para que la publicación pase a Disponible.
          </p>
        )
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Porcentaje de ganancia"
          type="text"
          inputMode="decimal"
          placeholder="Opcional"
          disabled={guardando || bloqueado}
          helperText="Sobre el costo de la unidad. Se puede combinar con el margen."
          error={errors.porcentaje_ganancia?.message}
          {...register('porcentaje_ganancia', {
            onChange: (evento: React.ChangeEvent<HTMLInputElement>) =>
              alEscribirPorcentaje(evento.target.value),
          })}
        />

        <Input
          label="Margen"
          type="text"
          inputMode="decimal"
          placeholder="Opcional"
          disabled={guardando || bloqueado}
          helperText="Importe fijo que se suma al costo. Se puede combinar con el porcentaje."
          error={errors.margen?.message}
          {...register('margen', {
            onChange: (evento: React.ChangeEvent<HTMLInputElement>) =>
              alEscribirMargen(evento.target.value),
          })}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <Input
            label="Precio de lista"
            required
            type="text"
            inputMode="decimal"
            placeholder="0"
            disabled={guardando || bloqueado}
            helperText="Es el que se guarda: no tiene por qué coincidir con el sugerido. Al cargarlo directo se completa el porcentaje y se limpia el margen."
            error={errors.precio?.message}
            {...register('precio', {
              onChange: (evento: React.ChangeEvent<HTMLInputElement>) =>
                alEscribirPrecio(evento.target.value),
            })}
          />

          {/* Al lado del precio: es el dato con el que se compara de un vistazo. */}
          <fieldset className="border-subtle rounded-md border p-3 sm:w-44">
            <legend className="text-content px-1 text-xs font-medium">Costo de la unidad</legend>
            <p className="text-content text-base font-semibold wrap-anywhere">
              {costo === null ? '—' : formatearImporte(costo)}
            </p>
          </fieldset>
        </div>

        <AyudaDePrecio
          precioSugerido={precioSugerido}
          resultadoSobreCosto={resultadoSobreCosto}
          onUsarPrecioSugerido={() => {
            if (precioSugerido === null) return

            setValue('precio', numeroAMilesTexto(precioSugerido), {
              shouldValidate: true,
              shouldDirty: true,
            })
          }}
          disabled={guardando || bloqueado}
        />
      </div>

      {!bloqueado && (sinPrecioTodavia || isDirty) && (
        <div className="flex justify-end gap-2">
          {isDirty && (
            <Button icon={<Undo2 />} onClick={descartarCambios} disabled={guardando}>
              Descartar cambios
            </Button>
          )}
          <Button
            type="submit"
            variant="success"
            icon={<Save />}
            loading={guardando}
            disabled={guardando || !isValid}
          >
            {sinPrecioTodavia ? 'Definir precio' : 'Guardar precio'}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={precioPorConfirmar !== null}
        onCancel={() => setPrecioPorConfirmar(null)}
        onConfirm={() => precioPorConfirmar && guardar(precioPorConfirmar, true)}
        eyebrow="Advertencia"
        eyebrowIcon={<AlertTriangle />}
        title="El precio de lista es menor al costo de la unidad"
        details={
          precioPorConfirmar === null || costo === null
            ? undefined
            : [
                { label: 'Precio de lista', value: formatearImporte(precioPorConfirmar.precio) },
                { label: 'Costo de la unidad', value: formatearImporte(costo) },
              ]
        }
        note="Podés guardarlo igual, pero la unidad se ofrecería por debajo de lo que costó."
        confirmLabel="Guardar igual"
        confirmIcon={<Save />}
        loading={guardando}
      />
    </form>
  )
}

/**
 * Precarga con lo que devolvió el backend. Los decimales llegan como string
 * con punto decimal, pero en pantalla el porcentaje va con coma y el precio y
 * el margen con puntos de miles, así que pasan por el mismo formateo que corre
 * mientras se tipea.
 */
function valoresDesdePublicacion(
  precio: string | null,
  porcentaje: string | null,
  margen: string | null
): PrecioListaFormValues {
  const precioNumero = aNumero(precio)
  const margenNumero = aNumero(margen)

  return {
    precio: precioNumero === null ? '' : numeroAMilesTexto(precioNumero),
    porcentaje_ganancia: porcentaje === null ? '' : normalizarSeparadorDecimal(porcentaje),
    margen: margenNumero === null ? '' : numeroAMilesTexto(margenNumero),
  }
}
