import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  EstadoCobro,
  EstadoConsulta,
  EstadoDeclaracionPago,
  EstadoVenta,
  ModalidadPago,
  OrigenCobro,
  TipologiaUnidad,
} from '../../../../../generated/prisma/enums';

/** Datos de contacto, comunes al ítem del listado y a la ficha. */
const clienteDatosSchema = z.object({
  id_cliente: z.number(),
  nombre: z.string(),
  apellido: z.string().nullable().meta({
    description: 'Null si Google no lo mandó separado del nombre',
  }),
  dni_cuil: z.string().nullable().meta({
    description: 'Null hasta que el cliente o Comercialización lo completan',
  }),
  email: z.email(),
  telefono: z.string().nullable(),
  tiene_cuenta_google: z.boolean().meta({
    description:
      'Derivado de google_sub: true si el cliente ya inició sesión con Google. Con cuenta vinculada el correo es su identidad de acceso y no se puede editar',
  }),
});

/** Indicadores que el sistema calcula al consultar, nunca almacenados. */
const indicadoresSchema = z.object({
  cantidad_ventas_vigentes: z.number().meta({
    description: 'Solo ventas en estado VIGENTE; las canceladas no cuentan',
  }),
  saldo_total_pendiente: z.number().meta({
    description:
      'Suma del saldo pendiente de las cuotas no anuladas de sus ventas vigentes',
    example: 1250000.5,
  }),
  en_mora: z.boolean().meta({
    description:
      'True si tiene al menos una cuota vencida con saldo pendiente en una venta vigente',
  }),
});

export const clienteAdminListItemSchema = clienteDatosSchema.extend(
  indicadoresSchema.shape,
);

export class ClienteAdminListItemDto extends createZodDto(
  clienteAdminListItemSchema,
) {}

export const clienteAdminListResponseSchema = z.object({
  data: z.array(clienteAdminListItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export class ClienteAdminListResponseDto extends createZodDto(
  clienteAdminListResponseSchema,
) {}

/**
 * Sección (b) de la ficha. Las condiciones salen del PLANPAGO de la venta,
 * nunca de las columnas `*_congelado` de VENTA (legado, se eliminan en T159).
 * `id_venta` e `id_plan_pago` son el acceso al detalle de la venta y a su
 * cronograma, que ya existen: la ficha enlaza, no los repite.
 */
const ventaFichaSchema = z.object({
  id_venta: z.number(),
  id_plan_pago: z.number(),
  fecha_venta: z.iso.datetime(),
  estado: z.enum(EstadoVenta),
  modalidad: z.enum(ModalidadPago),
  cantidad_cuotas: z
    .number()
    .nullable()
    .meta({ description: 'Null en modalidad CONTADO: no hay cronograma' }),
  tasa_nominal_anual: z.number().nullable().meta({
    description:
      'TNA congelada al confirmar la venta, en porcentaje. Null en modalidad CONTADO',
    example: 72.5,
  }),
  saldo_pendiente: z.number().meta({
    description:
      'Suma del saldo pendiente de las cuotas no anuladas de esta venta',
  }),
  unidad: z.object({
    id_unidad_funcional: z.number(),
    identificador: z.string(),
    tipologia: z.enum(TipologiaUnidad),
  }),
  proyecto: z.object({
    id_proyecto: z.number(),
    codigo: z.string(),
    nombre: z.string(),
  }),
});

/**
 * Sección (c) de la ficha: cobros presenciales (HU-30) y del ecommerce
 * (HU-29). `id_cobro` es el acceso al detalle del cobro, que ya existe.
 */
const cobroFichaSchema = z.object({
  id_cobro: z.number(),
  fecha_cobro: z.iso.datetime(),
  importe_total: z.number(),
  origen: z.enum(OrigenCobro),
  estado: z.enum(EstadoCobro),
  numero_referencia: z.string().nullable(),
  forma_pago: z.object({
    id_forma_pago: z.number(),
    nombre: z.string(),
  }),
});

/**
 * Sección (d) de la ficha: solo declaraciones PENDIENTE o RECHAZADA, como
 * pide la HU (las validadas ya figuran como cobro en la sección anterior).
 */
const declaracionFichaSchema = z.object({
  id_declaracion_pago: z.number(),
  fecha: z.iso
    .datetime()
    .meta({ description: 'hora_creacion de la declaración' }),
  importe: z.number(),
  estado: z.enum([
    EstadoDeclaracionPago.PENDIENTE,
    EstadoDeclaracionPago.RECHAZADA,
  ]),
  numero_referencia: z.string().nullable(),
  motivo_rechazo: z.string().nullable(),
  forma_pago: z.object({
    id_forma_pago: z.number(),
    nombre: z.string(),
  }),
  cuota: z.object({ id_cuota: z.number(), numero: z.number() }),
  id_venta: z
    .number()
    .meta({ description: 'Venta de la cuota declarada, para enlazar' }),
  comprobante: z
    .object({
      nombre_archivo: z.string().nullable(),
      tipo: z.string().nullable().meta({
        description:
          'MIME del adjunto: application/pdf, image/jpeg o image/png',
      }),
    })
    .nullable()
    .meta({
      description:
        'Metadatos del comprobante adjunto, o null si la declaración no tiene (las del Sprint 3 no lo tienen). La descarga del archivo es un endpoint aparte, de T146: acá no viaja la ruta del bucket privado',
    }),
});

/** Sección (e) de la ficha: consultas sobre unidades (HU-26). */
const consultaFichaSchema = z.object({
  id_consulta: z.number(),
  fecha: z.iso.datetime().meta({ description: 'hora_creacion de la consulta' }),
  texto: z.string(),
  estado: z.enum(EstadoConsulta),
  respuesta: z.string().nullable(),
  fecha_respuesta: z.iso.datetime().nullable(),
  FK_publicacion: z.number(),
  unidad: z.object({
    id_unidad_funcional: z.number(),
    identificador: z.string(),
  }),
  proyecto: z.object({ id_proyecto: z.number(), nombre: z.string() }),
});

/**
 * Ficha completa (modo LECTURA de HU-33), en las cinco secciones que pide la
 * historia. Es también lo que devuelve el PATCH, para que el frontend
 * re-renderice la ficha con los datos ya guardados sin pedirla de nuevo.
 *
 * La auditoría es la estándar del proyecto: usuario y fecha de la última
 * modificación, sin historial de valores anteriores (propuesta de OBS-01,
 * todavía sin respuesta de las POs).
 */
export const clienteAdminDetalleResponseSchema = clienteDatosSchema.extend({
  fecha_alta: z.iso
    .datetime()
    .meta({ description: 'hora_creacion del cliente' }),
  hora_actualizacion: z.iso.datetime().nullable(),
  FK_usuario_actualizador: z.number().nullable().meta({
    description:
      'Usuario interno de la última modificación. Null si el cambio lo hizo el propio cliente desde el ecommerce (propuesta de OBS-25)',
  }),
  usuarioActualizador: z
    .object({ nombre: z.string(), apellido: z.string() })
    .nullable(),
  ventas: z.array(ventaFichaSchema),
  cobros: z.array(cobroFichaSchema),
  declaraciones: z.array(declaracionFichaSchema),
  consultas: z.array(consultaFichaSchema),
});

export class ClienteAdminDetalleResponseDto extends createZodDto(
  clienteAdminDetalleResponseSchema,
) {}
