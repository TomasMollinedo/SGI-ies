import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Info, Receipt, X } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { useClienteAuthUser } from '@/features/ecommerce/hooks/useClienteAuthUser'
import { Modal } from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import type { SelectOption } from '@/shared/components/ui/Select'
import { useToast } from '@/shared/hooks/useToast'
import type { ApiErrorResponse } from '@/shared/types/api.types'
import { formatearMensajeError } from '@/shared/utils/apiError'
import { formatearImporte } from '@/shared/utils/importe'
import { DECLARAR_PAGO } from '../config/misCompras.config'
import { useDeclararPago } from '../hooks/useDeclaracionesPago'
import { crearDeclaracionPagoSchema } from '../types/declaracionPago.schema'
import type {
  DeclaracionPagoFormOutput,
  DeclaracionPagoFormValues,
} from '../types/declaracionPago.schema'
import type { FormaPagoAutogestion } from '../types/declaracionPago.types'
import type { CuotaMiVenta } from '../types/miVenta.types'
import { etiquetaCuota } from '../utils/cuotaDeclarable'
import { tieneDatosIncompletos } from '../utils/datosCliente'
import { interpretarImporteAr } from '../utils/importeTexto'

const VALORES_INICIALES: DeclaracionPagoFormValues = {
  FK_forma_pago: '',
  importe: '',
  numero_referencia: '',
}

interface DeclararPagoModalProps {
  idVenta: number
  /** La cuota sobre la que se declara. En `null` el modal está cerrado. */
  cuota: CuotaMiVenta | null
  formasPago: FormaPagoAutogestion[]
  onClose: () => void
}

/**
 * Formulario para declarar un pago sobre una cuota propia (T117, HU-29). La
 * declaración nace pendiente: el saldo de la cuota no cambia hasta que
 * Tesorería la valide contra el extracto bancario, así que no hay nada que
 * adjuntar — solo el número de referencia, y exacto.
 *
 * Errores: el 400 por datos incompletos manda a completar DNI/CUIT y teléfono
 * (y vuelve acá después); el resto de los 400 y los 409 se muestran adentro
 * del modal. Ante un 409, `useDeclararPago` ya refresca el detalle.
 */
export function DeclararPagoModal({ idVenta, cuota, formasPago, onClose }: DeclararPagoModalProps) {
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: cliente } = useClienteAuthUser()
  const declararMutation = useDeclararPago(idVenta)
  const [errorEnvio, setErrorEnvio] = useState<ApiErrorResponse | null>(null)

  const saldoPendiente = cuota?.saldo_pendiente ?? 0
  const schema = useMemo(
    () => crearDeclaracionPagoSchema(saldoPendiente, formasPago),
    [saldoPendiente, formasPago]
  )

  const {
    register,
    handleSubmit,
    reset,
    watch,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<DeclaracionPagoFormValues, unknown, DeclaracionPagoFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: VALORES_INICIALES,
  })

  // Cada apertura arranca de cero: el formulario es de una cuota puntual.
  const idCuota = cuota?.id_cuota
  useEffect(() => {
    if (idCuota === undefined) return
    reset(VALORES_INICIALES)
    setErrorEnvio(null)
  }, [idCuota, reset])

  // La referencia es obligatoria o no según la forma elegida: al cambiarla
  // (después del primer intento de envío) se revalida, para que el error de
  // la referencia aparezca o desaparezca al toque.
  const idFormaPago = watch('FK_forma_pago')
  useEffect(() => {
    if (isSubmitted) void trigger('numero_referencia')
  }, [idFormaPago, isSubmitted, trigger])

  // Eco del monto tal como se va a mandar, con formato de moneda: el cliente
  // confirma a simple vista que "1.600.000" se leyó como un millón seiscientos
  // mil y no como otra cosa.
  const importeInterpretado = interpretarImporteAr(watch('importe'))

  const formaElegida = formasPago.find((forma) => forma.id === idFormaPago)
  const requiereReferencia = formaElegida?.metadata.requiere_referencia ?? false

  const opcionesFormaPago: SelectOption[] = formasPago.map((forma) => ({
    value: forma.id,
    label: forma.code,
  }))

  const enviando = declararMutation.isPending

  function cerrar() {
    if (enviando) return
    onClose()
  }

  function enviar(datos: DeclaracionPagoFormOutput) {
    if (!cuota) return
    setErrorEnvio(null)
    declararMutation.mutate(
      {
        FK_cuota: cuota.id_cuota,
        FK_forma_pago: Number(datos.FK_forma_pago),
        importe: datos.importe,
        numero_referencia: datos.numero_referencia || undefined,
      },
      {
        onSuccess: () => {
          toast.success(DECLARAR_PAGO.exito)
          onClose()
        },
        onError: (error) => {
          if (error.statusCode === 400 && tieneDatosIncompletos(cliente)) {
            toast.info(DECLARAR_PAGO.completarDatos)
            navigate(PATHS.ECOMMERCE.COMPLETAR_DATOS, { state: { from: location } })
            return
          }
          setErrorEnvio(error)
        },
      }
    )
  }

  return (
    <Modal
      open={cuota !== null}
      onClose={cerrar}
      title={DECLARAR_PAGO.titulo}
      icon={<Receipt />}
      size="sm"
      closeOnEscape={!enviando}
      closeOnOverlayClick={!enviando}
      footer={
        // En pantallas angostas los botones se apilan a ancho completo, con
        // la acción principal arriba; desde `sm` vuelven a ir en fila.
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            variant="error"
            icon={<X />}
            onClick={cerrar}
            disabled={enviando}
            className="w-full sm:w-auto"
          >
            {DECLARAR_PAGO.cancelar}
          </Button>
          <Button
            type="submit"
            form="form-declarar-pago"
            variant="success"
            icon={<Check />}
            loading={enviando}
            className="w-full sm:w-auto"
          >
            {DECLARAR_PAGO.confirmar}
          </Button>
        </div>
      }
    >
      {cuota && (
        <form
          id="form-declarar-pago"
          noValidate
          onSubmit={handleSubmit(enviar)}
          className="flex flex-col gap-4"
        >
          <div className="border-subtle flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border px-4 py-3">
            <span className="text-content text-sm font-semibold">
              {etiquetaCuota(cuota.numero)}
            </span>
            <span className="text-content-muted text-xs">
              {DECLARAR_PAGO.saldoPendiente}:{' '}
              <span className="text-content text-sm font-semibold">
                {formatearImporte(cuota.saldo_pendiente)}
              </span>
            </span>
          </div>

          <Select
            label={DECLARAR_PAGO.formaPago}
            required
            placeholder={DECLARAR_PAGO.formaPagoPlaceholder}
            options={opcionesFormaPago}
            error={errors.FK_forma_pago?.message}
            disabled={enviando}
            className="w-full"
            {...register('FK_forma_pago')}
          />

          <Input
            label={DECLARAR_PAGO.importe}
            required
            inputMode="decimal"
            autoComplete="off"
            placeholder={DECLARAR_PAGO.importePlaceholder}
            helperText={
              importeInterpretado !== null && importeInterpretado > 0
                ? `${DECLARAR_PAGO.importeInterpretado} ${formatearImporte(importeInterpretado)}`
                : DECLARAR_PAGO.importeAyuda
            }
            error={errors.importe?.message}
            disabled={enviando}
            className="w-full"
            {...register('importe')}
          />

          <div className="flex flex-col gap-2">
            <Input
              label={DECLARAR_PAGO.referencia}
              required={requiereReferencia}
              autoComplete="off"
              maxLength={100}
              placeholder={DECLARAR_PAGO.referenciaPlaceholder}
              error={errors.numero_referencia?.message}
              disabled={enviando}
              className="w-full"
              {...register('numero_referencia')}
            />
            <p className="text-content-muted flex gap-2 text-xs">
              <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
              {DECLARAR_PAGO.avisoValidacion}
            </p>
          </div>

          {errorEnvio && (
            <p
              role="alert"
              className="border-error/30 bg-error/10 text-error rounded-md border px-4 py-3 text-xs"
            >
              {formatearMensajeError(errorEnvio.message)}
            </p>
          )}
        </form>
      )}
    </Modal>
  )
}
