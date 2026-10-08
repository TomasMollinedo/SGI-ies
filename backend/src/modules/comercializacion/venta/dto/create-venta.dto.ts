import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ModalidadPago } from '../../../../../generated/prisma/enums';
import {
  camposCondicionesVenta,
  validarCondicionesVenta,
} from './simular-venta.dto';

/**
 * Datos del cliente al vender presencial. Acá los cuatro campos son
 * obligatorios (a diferencia del modelo CLIENTE, donde son opcionales para
 * el alta por Google) — sin poder contactarlo en persona no tiene sentido
 * la venta. Si el cliente ya existe (por dni_cuil o email), estos datos no
 * pisan los que ya tenía cargados: solo sirven para crearlo si es nuevo.
 */
const clienteVentaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  apellido: z.string().trim().min(1).optional(),
  dni_cuil: z.string().trim().min(1, 'El DNI/CUIL es obligatorio'),
  email: z.email('El correo debe ser una dirección válida'),
  telefono: z.string().trim().min(1, 'El teléfono es obligatorio'),
});

/**
 * Lo que se le mostró al cliente en la simulación (`POST /ventas/simular`):
 * el precio de lista y la TNA del plazo tal como vinieron en esa respuesta.
 * La confirmación los compara contra los vigentes y, si alguno cambió, la
 * rechaza (HU-27). `tasa_nominal_anual` es `null` en CONTADO.
 */
const simulacionMostradaSchema = z.object({
  precio_lista: z
    .number()
    .positive()
    .multipleOf(0.01, 'El precio de lista admite hasta dos decimales'),
  tasa_nominal_anual: z
    .number()
    .min(0)
    .multipleOf(0.01, 'La TNA admite hasta dos decimales')
    .nullable(),
});

/**
 * Confirmación de una venta presencial (HU-27): el cliente, las mismas
 * condiciones que la simulación (modalidad, anticipo y plazo, con las mismas
 * reglas) y lo que se le mostró al simular.
 *
 * No lleva plan de ejemplo: en la pantalla solo sirve para precargar el
 * anticipo y el plazo; lo que se guarda es lo que se confirma acá.
 */
export const createVentaSchema = z
  .object({
    cliente: clienteVentaSchema,
    ...camposCondicionesVenta,
    simulacion: simulacionMostradaSchema,
  })
  .superRefine((datos, ctx) => {
    validarCondicionesVenta(datos, ctx);

    const esContado = datos.modalidad === ModalidadPago.CONTADO;
    const hayTasa = datos.simulacion.tasa_nominal_anual !== null;
    if (esContado === hayTasa) {
      ctx.addIssue({
        code: 'custom',
        path: ['simulacion', 'tasa_nominal_anual'],
        message: esContado
          ? 'Una venta de contado no tiene TNA: la de la simulación tiene que ser null'
          : 'Falta la TNA que se mostró en la simulación',
      });
    }
  });

export class CreateVentaDto extends createZodDto(createVentaSchema) {}
