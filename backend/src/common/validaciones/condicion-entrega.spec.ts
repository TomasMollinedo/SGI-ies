import { calcularCondicionEntrega } from './condicion-entrega';
import { EstadoProyecto } from '../../../generated/prisma/enums';

describe('calcularCondicionEntrega', () => {
  it('dice "Entregada" si el proyecto está finalizado, sin importar la fecha', () => {
    expect(
      calcularCondicionEntrega(EstadoProyecto.FINALIZADO, new Date('2026-01-01')),
    ).toBe('Entregada');
    expect(calcularCondicionEntrega(EstadoProyecto.FINALIZADO, null)).toBe(
      'Entregada',
    );
  });

  it('dice "A entregar" con la fecha, si el proyecto no está finalizado y tiene fecha estimada', () => {
    expect(
      calcularCondicionEntrega(EstadoProyecto.EN_EJECUCION, new Date('2027-12-01')),
    ).toBe('A entregar — 2027-12-01');
  });

  it('dice "A entregar, fecha a confirmar" si no está finalizado y no tiene fecha estimada', () => {
    expect(calcularCondicionEntrega(EstadoProyecto.EN_PLANIFICACION, null)).toBe(
      'A entregar, fecha a confirmar',
    );
  });
});
