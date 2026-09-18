import { EstadoProyecto } from '../../../../generated/prisma/enums';

/**
 * Únicos textos de "condición de entrega" que puede mostrar el sistema (ficha
 * pública, catálogo, listado interno). T107, T108 y T112 los reusan desde
 * acá en vez de repetirlos a mano, para que un cambio de redacción futuro no
 * quede desincronizado entre pantallas.
 */
export const CONDICION_ENTREGA_TEXTOS = {
  TERMINADA: 'Terminada, disponible para entrega inmediata',
  A_ENTREGAR_CON_FECHA: 'A entregar, fecha estimada',
  A_ENTREGAR_SIN_FECHA: 'A entregar, fecha a confirmar',
} as const;

export type CondicionEntregaCodigo = keyof typeof CONDICION_ENTREGA_TEXTOS;

export interface CondicionEntrega {
  codigo: CondicionEntregaCodigo;
  texto: string;
  fecha_referencia: Date | null;
}

/**
 * Única fuente de verdad de la "condición de entrega" de una unidad
 * funcional, derivada del estado y la fecha estimada de su proyecto (nunca se
 * persiste). El backend no formatea `fecha_referencia`: el frontend concatena
 * la fecha con su propio helper de formato sobre el texto base.
 */
export function calcularCondicionEntrega(proyecto: {
  estado: EstadoProyecto;
  fecha_fin_estimada: Date | null;
}): CondicionEntrega {
  if (proyecto.estado === EstadoProyecto.FINALIZADO) {
    return {
      codigo: 'TERMINADA',
      texto: CONDICION_ENTREGA_TEXTOS.TERMINADA,
      fecha_referencia: proyecto.fecha_fin_estimada,
    };
  }

  if (proyecto.fecha_fin_estimada) {
    return {
      codigo: 'A_ENTREGAR_CON_FECHA',
      texto: CONDICION_ENTREGA_TEXTOS.A_ENTREGAR_CON_FECHA,
      fecha_referencia: proyecto.fecha_fin_estimada,
    };
  }

  return {
    codigo: 'A_ENTREGAR_SIN_FECHA',
    texto: CONDICION_ENTREGA_TEXTOS.A_ENTREGAR_SIN_FECHA,
    fecha_referencia: null,
  };
}
