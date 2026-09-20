import { formatearFechaSinHora } from '@/shared/utils/fecha'
import type { CondicionEntrega } from '../types/publicacion.types'

/**
 * El texto final de la condición de entrega. Se decide por `codigo`, nunca
 * comparando `texto`: en `A_ENTREGAR_CON_FECHA` el backend manda el texto sin
 * la fecha y acá se le agrega; en los otros dos el texto ya viene completo
 * (en `TERMINADA` la fecha de referencia no se muestra).
 */
export function textoCondicionEntrega(condicion: CondicionEntrega): string {
  switch (condicion.codigo) {
    case 'A_ENTREGAR_CON_FECHA':
      return condicion.fecha_referencia
        ? `${condicion.texto}: ${formatearFechaSinHora(condicion.fecha_referencia)}`
        : condicion.texto
    case 'TERMINADA':
    case 'A_ENTREGAR_SIN_FECHA':
      return condicion.texto
  }
}
