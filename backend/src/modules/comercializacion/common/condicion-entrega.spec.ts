import { EstadoProyecto } from '../../../../generated/prisma/enums';
import { calcularCondicionEntrega } from './condicion-entrega';

describe('calcularCondicionEntrega', () => {
  const FECHA = new Date('2027-12-01');

  it('proyecto FINALIZADO con fecha: TERMINADA con la fecha de referencia', () => {
    expect(
      calcularCondicionEntrega({
        estado: EstadoProyecto.FINALIZADO,
        fecha_fin_estimada: FECHA,
      }),
    ).toEqual({
      codigo: 'TERMINADA',
      texto: 'Terminada, disponible para entrega inmediata',
      fecha_referencia: FECHA,
    });
  });

  it('proyecto FINALIZADO sin fecha: TERMINADA con fecha_referencia null', () => {
    expect(
      calcularCondicionEntrega({
        estado: EstadoProyecto.FINALIZADO,
        fecha_fin_estimada: null,
      }),
    ).toEqual({
      codigo: 'TERMINADA',
      texto: 'Terminada, disponible para entrega inmediata',
      fecha_referencia: null,
    });
  });

  it('proyecto EN_EJECUCION con fecha: A_ENTREGAR_CON_FECHA con la fecha', () => {
    expect(
      calcularCondicionEntrega({
        estado: EstadoProyecto.EN_EJECUCION,
        fecha_fin_estimada: FECHA,
      }),
    ).toEqual({
      codigo: 'A_ENTREGAR_CON_FECHA',
      texto: 'A entregar, fecha estimada',
      fecha_referencia: FECHA,
    });
  });

  it('proyecto EN_EJECUCION sin fecha: A_ENTREGAR_SIN_FECHA con null', () => {
    expect(
      calcularCondicionEntrega({
        estado: EstadoProyecto.EN_EJECUCION,
        fecha_fin_estimada: null,
      }),
    ).toEqual({
      codigo: 'A_ENTREGAR_SIN_FECHA',
      texto: 'A entregar, fecha a confirmar',
      fecha_referencia: null,
    });
  });

  it('proyecto EN_PLANIFICACION sin fecha (caso PROY-BLA del seed): A_ENTREGAR_SIN_FECHA', () => {
    const condicion = calcularCondicionEntrega({
      estado: EstadoProyecto.EN_PLANIFICACION,
      fecha_fin_estimada: null,
    });

    expect(condicion.codigo).toBe('A_ENTREGAR_SIN_FECHA');
    expect(condicion.fecha_referencia).toBeNull();
  });
});
