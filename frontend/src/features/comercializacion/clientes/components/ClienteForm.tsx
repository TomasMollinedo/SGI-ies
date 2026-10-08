import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Pencil, TriangleAlert, X } from 'lucide-react'
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { esArrayDeValidationIssues, formatearMensajeError } from '@/shared/utils/apiError'
import { useEditarCliente } from '../hooks/useClientes'
import { clienteFormSchema } from '../types/cliente.schema'
import type { ClienteFormOutput, ClienteFormValues } from '../types/cliente.schema'
import type { ClienteDatosContacto, EditarClientePayload } from '../types/cliente.types'

const ID_FORM = 'form-cliente'

interface ClienteFormProps {
  /** El cliente a editar, o `null` con el modal cerrado. */
  cliente: ClienteDatosContacto | null
  onClose: () => void
}

/**
 * Modo EDICIÓN de la ficha (HU-33): modifica nombre, apellido, DNI/CUIL,
 * teléfono y correo. No hay alta ni baja de clientes, así que este modal es
 * siempre de edición.
 *
 * Se abre desde dos pantallas —una fila del listado y la ficha—, y por eso
 * resuelve la mutación, el toast y el reparto de los errores del backend acá
 * adentro en vez de recibirlos por props: así las dos pantallas lo usan con
 * una línea y no duplican el mismo handler. Mismo criterio que
 * `CancelarVentaModal`. Le alcanza con `ClienteDatosContacto`, que es lo que
 * traen tanto la fila del listado como la ficha: no necesita pedir nada extra.
 */
export function ClienteForm({ cliente, onClose }: ClienteFormProps) {
  const toast = useToast()
  const editar = useEditarCliente()
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const tieneCuentaGoogle = cliente?.tiene_cuenta_google ?? false
  const cargando = editar.isPending

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isDirty, isValid },
  } = useForm<ClienteFormValues, unknown, ClienteFormOutput>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: valoresIniciales(cliente),
    // Necesario para que "Guardar" sepa en todo momento si el form es válido.
    mode: 'onChange',
  })

  // Cada vez que se abre con otro cliente el form arranca con sus datos y el
  // foco va al primer campo.
  useEffect(() => {
    if (!cliente) return

    reset(valoresIniciales(cliente))
    setErrorGeneral(null)
    setConfirmarDescarte(false)
    setFocus('nombre')
  }, [cliente, reset, setFocus])

  function enviar(valores: ClienteFormOutput) {
    if (!cliente || cargando) return

    const cambios = soloCamposModificados(valores, cliente)

    // El backend exige al menos un dato. Un campo que se borró no cuenta como
    // cambio (no hay forma de vaciar un dato), así que puede no quedar nada
    // que mandar: se avisa y no se gasta un request que daría 400.
    if (Object.keys(cambios).length === 0) {
      toast.info('No hay cambios para guardar')
      onClose()
      return
    }

    setErrorGeneral(null)
    editar.mutate(
      { id: cliente.id_cliente, payload: cambios },
      {
        onSuccess: () => {
          toast.success('Datos del cliente actualizados correctamente')
          onClose()
        },
        onError: (falla) => setErrorGeneral(repartirErrorDelBackend(falla, setError, setFocus)),
      }
    )
  }

  // Cerrar con datos a medio editar pide confirmación; con un envío en curso
  // no se cierra directamente.
  function intentarCerrar() {
    if (cargando) return

    if (isDirty) {
      setConfirmarDescarte(true)
      return
    }

    onClose()
  }

  return (
    <>
      <Modal
        open={cliente !== null}
        onClose={intentarCerrar}
        title="Editar datos del cliente"
        icon={<Pencil />}
        closeOnEscape={!cargando && !confirmarDescarte}
        closeOnOverlayClick={!cargando && !confirmarDescarte}
        footer={
          <>
            <Button variant="error" icon={<X />} onClick={intentarCerrar} disabled={cargando}>
              Cancelar
            </Button>
            <Button
              variant="success"
              icon={<Check />}
              type="submit"
              form={ID_FORM}
              loading={cargando}
              disabled={!isValid || !isDirty}
            >
              Guardar
            </Button>
          </>
        }
      >
        <form id={ID_FORM} onSubmit={handleSubmit(enviar)} className="flex flex-col gap-4">
          {errorGeneral && (
            <div
              role="alert"
              className="border-error/30 bg-error/10 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3"
            >
              <p className="text-error text-xs">{errorGeneral}</p>
              <Button variant="error" size="sm" type="submit" form={ID_FORM} loading={cargando}>
                Reintentar
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              required
              placeholder="Ej. Juan"
              disabled={cargando}
              error={errors.nombre?.message}
              {...register('nombre')}
            />

            <Input
              label="Apellido"
              placeholder="Ej. Pérez"
              disabled={cargando}
              error={errors.apellido?.message}
              {...register('apellido')}
            />

            <Input
              label="DNI/CUIL"
              inputMode="numeric"
              placeholder="Ej. 30712345678"
              helperText="Sin puntos ni guiones"
              disabled={cargando}
              error={errors.dni_cuil?.message}
              {...register('dni_cuil')}
            />

            <Input
              label="Teléfono"
              inputMode="numeric"
              placeholder="Ej. 3875551234"
              helperText="Solo números"
              disabled={cargando}
              error={errors.telefono?.message}
              {...register('telefono')}
            />
          </div>

          {/* Con una cuenta de Google vinculada el correo es la identidad de
              acceso del cliente al ecommerce: cambiarlo desde acá lo dejaría
              sin poder entrar. El backend también lo rechaza (409), pero el
              campo va deshabilitado para que la pantalla no llegue a ese
              error, y el valor no viaja en el payload. */}
          <Input
            label="Correo"
            type="email"
            placeholder="Ej. cliente@ejemplo.com"
            disabled={cargando || tieneCuentaGoogle}
            helperText={
              tieneCuentaGoogle
                ? 'No se puede editar: el cliente tiene una cuenta de Google vinculada y este correo es su identidad de acceso. Solo él puede cambiarlo desde su cuenta de Google.'
                : undefined
            }
            error={errors.email?.message}
            {...register('email')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmarDescarte}
        onCancel={() => setConfirmarDescarte(false)}
        onConfirm={() => {
          setConfirmarDescarte(false)
          onClose()
        }}
        eyebrow="Cambios sin guardar"
        eyebrowIcon={<TriangleAlert />}
        title="¿Descartar los cambios?"
        note="Lo que editaste en el formulario se va a perder."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
      />
    </>
  )
}

/** Los campos del formulario, para saber qué issues del backend son de campo. */
const CAMPOS = ['nombre', 'apellido', 'dni_cuil', 'telefono', 'email'] as const
type CampoDelFormulario = (typeof CAMPOS)[number]

function esCampoDelFormulario(campo: string): campo is CampoDelFormulario {
  return CAMPOS.includes(campo as CampoDelFormulario)
}

/**
 * Manda cada error del backend a donde corresponda y devuelve lo que quedó sin
 * dueño, para el banner.
 *
 * El 409 de DNI/CUIL o correo repetido llega como mensaje suelto, no como
 * issue de campo: se pinta sobre el campo que menciona para que el usuario no
 * pierda lo que cargó buscando cuál de los dos falló.
 */
function repartirErrorDelBackend(
  error: ApiErrorResponse,
  setError: UseFormSetError<ClienteFormValues>,
  setFocus: (campo: CampoDelFormulario) => void
): string | null {
  if (error.statusCode === 400 && esArrayDeValidationIssues(error.message)) {
    const issuesDeCampo = error.message.filter((issue) => esCampoDelFormulario(issue.campo))
    const resto = error.message.filter((issue) => !esCampoDelFormulario(issue.campo))

    for (const issue of issuesDeCampo) {
      setError(issue.campo as CampoDelFormulario, { message: issue.error })
    }

    if (issuesDeCampo.length > 0) {
      setFocus(issuesDeCampo[0].campo as CampoDelFormulario)
    }

    return resto.length > 0 ? formatearMensajeError(resto) : null
  }

  const mensaje = formatearMensajeError(error.message)

  if (error.statusCode === 409) {
    const campo = campoDelConflicto(mensaje)
    if (campo) {
      setError(campo, { message: mensaje })
      setFocus(campo)
      return null
    }
  }

  return mensaje
}

/** De qué campo habla un 409: el backend nombra el DNI/CUIL o el correo en el mensaje. */
function campoDelConflicto(mensaje: string): CampoDelFormulario | null {
  const enMinusculas = mensaje.toLowerCase()

  if (enMinusculas.includes('dni')) return 'dni_cuil'
  if (enMinusculas.includes('correo')) return 'email'

  return null
}

/**
 * Solo manda lo que cambió. Un campo que quedó vacío NO viaja: el backend no
 * acepta strings vacíos en ninguno de estos campos, así que vaciar un dato ya
 * cargado no es una operación posible y se trata como "sin cambios".
 *
 * El correo de un cliente con Google vinculada nunca se compara ni se manda:
 * el campo está deshabilitado y React Hook Form ya lo omite de los valores.
 */
function soloCamposModificados(
  valores: ClienteFormOutput,
  original: ClienteDatosContacto
): EditarClientePayload {
  const cambios: EditarClientePayload = {}

  if (valores.nombre !== original.nombre) cambios.nombre = valores.nombre

  agregarSiCambio(cambios, 'apellido', valores.apellido, original.apellido)
  agregarSiCambio(cambios, 'dni_cuil', valores.dni_cuil, original.dni_cuil)
  agregarSiCambio(cambios, 'telefono', valores.telefono, original.telefono)

  if (!original.tiene_cuenta_google) {
    agregarSiCambio(cambios, 'email', valores.email, original.email)
  }

  return cambios
}

function agregarSiCambio(
  cambios: EditarClientePayload,
  campo: 'apellido' | 'dni_cuil' | 'telefono' | 'email',
  nuevo: string | undefined,
  original: string | null
) {
  const valor = nuevo?.trim() ?? ''

  if (valor !== '' && valor !== (original ?? '')) {
    cambios[campo] = valor
  }
}

function valoresIniciales(cliente: ClienteDatosContacto | null): ClienteFormValues {
  return {
    nombre: cliente?.nombre ?? '',
    apellido: cliente?.apellido ?? '',
    dni_cuil: cliente?.dni_cuil ?? '',
    telefono: cliente?.telefono ?? '',
    email: cliente?.email ?? '',
  }
}
