import { Prisma } from '../../../generated/prisma/client';
import {
  estadoComercialUnidadSchema,
  type EstadoComercialUnidad,
} from '../comercializacion/unidades-funcionales/dto/estado-comercial-unidad';
import { unidadesPorEstadoSchema } from './dto/proyecto-ficha-response.dto';
import {
  calcularSituacionComercial,
  type UnidadComercial,
} from './situacion-comercial';

const unidad = (
  estado_comercial: EstadoComercialUnidad,
  precio?: string,
): UnidadComercial => ({
  estado_comercial,
  precio_lista: precio === undefined ? null : new Prisma.Decimal(precio),
});

describe('calcularSituacionComercial', () => {
  it('sin unidades activas: 0 %, no "todas vendidas" y precio 0 sobre 0', () => {
    expect(calcularSituacionComercial([])).toEqual({
      por_estado: {
        SIN_PUBLICAR: 0,
        EN_PREPARACION: 0,
        DISPONIBLE: 0,
        EN_PLAN_DE_PAGO: 0,
        VENDIDA: 0,
      },
      unidades_activas: 0,
      porcentaje_vendido: 0,
      todas_vendidas: false,
      precio_estimado: { total: 0, unidades_calculadas: 0 },
    });
  });

  it('cuenta las unidades por estado comercial', () => {
    const { por_estado, unidades_activas } = calcularSituacionComercial([
      unidad('SIN_PUBLICAR'),
      unidad('SIN_PUBLICAR'),
      unidad('EN_PREPARACION'),
      unidad('DISPONIBLE', '100'),
      unidad('EN_PLAN_DE_PAGO', '100'),
      unidad('VENDIDA', '100'),
    ]);

    expect(por_estado).toEqual({
      SIN_PUBLICAR: 2,
      EN_PREPARACION: 1,
      DISPONIBLE: 1,
      EN_PLAN_DE_PAGO: 1,
      VENDIDA: 1,
    });
    expect(unidades_activas).toBe(6);
  });

  it('todas vendidas, mezclando En Plan de Pago y Vendida', () => {
    const situacion = calcularSituacionComercial([
      unidad('EN_PLAN_DE_PAGO', '100'),
      unidad('VENDIDA', '200'),
      unidad('VENDIDA', '300'),
    ]);

    expect(situacion.porcentaje_vendido).toBe(100);
    expect(situacion.todas_vendidas).toBe(true);
    // Las vendidas siguen con su publicación vigente: entran en el precio.
    expect(situacion.precio_estimado).toEqual({
      total: 600,
      unidades_calculadas: 3,
    });
  });

  // OBS-21: la base son las activas. La función ni siquiera recibe las
  // planificadas, así que un proyecto con 10 planificadas da lo mismo.
  it('una sola unidad activa y vendida da 100 % y "todas vendidas"', () => {
    const situacion = calcularSituacionComercial([unidad('VENDIDA', '100')]);

    expect(situacion.porcentaje_vendido).toBe(100);
    expect(situacion.todas_vendidas).toBe(true);
  });

  it('con una sola unidad sin vender ya no son "todas vendidas"', () => {
    const situacion = calcularSituacionComercial([
      unidad('VENDIDA', '100'),
      unidad('DISPONIBLE', '100'),
    ]);

    expect(situacion.porcentaje_vendido).toBe(50);
    expect(situacion.todas_vendidas).toBe(false);
  });

  it('una unidad En preparación sin precio no suma ni cuenta en el precio estimado', () => {
    const situacion = calcularSituacionComercial([
      unidad('EN_PREPARACION'),
      unidad('DISPONIBLE', '19000000'),
    ]);

    expect(situacion.por_estado.EN_PREPARACION).toBe(1);
    expect(situacion.precio_estimado).toEqual({
      total: 19000000,
      unidades_calculadas: 1,
    });
  });

  it('una unidad sin publicar cuenta en el total pero no en el precio', () => {
    const situacion = calcularSituacionComercial([
      unidad('SIN_PUBLICAR'),
      unidad('VENDIDA', '52000000'),
    ]);

    expect(situacion.unidades_activas).toBe(2);
    expect(situacion.porcentaje_vendido).toBe(50);
    expect(situacion.precio_estimado).toEqual({
      total: 52000000,
      unidades_calculadas: 1,
    });
  });

  it('redondea el porcentaje a 2 decimales', () => {
    const unDeTres = calcularSituacionComercial([
      unidad('VENDIDA', '100'),
      unidad('DISPONIBLE', '100'),
      unidad('SIN_PUBLICAR'),
    ]);
    const dosDeTres = calcularSituacionComercial([
      unidad('VENDIDA', '100'),
      unidad('EN_PLAN_DE_PAGO', '100'),
      unidad('SIN_PUBLICAR'),
    ]);

    expect(unDeTres.porcentaje_vendido).toBe(33.33);
    expect(dosDeTres.porcentaje_vendido).toBe(66.67);
  });

  // Con floats, 0.1 + 0.2 da 0.30000000000000004.
  it('suma los precios con centavos sin error de float', () => {
    const situacion = calcularSituacionComercial([
      unidad('DISPONIBLE', '0.10'),
      unidad('DISPONIBLE', '0.20'),
      unidad('VENDIDA', '10000000.35'),
    ]);

    expect(situacion.precio_estimado.total).toBe(10000000.65);
  });

  // `por_estado` del DTO tiene las cinco claves escritas a mano (para que
  // Swagger las muestre): si cambia el enum, este test avisa.
  it('devuelve exactamente las claves del enum de estado comercial, las mismas que documenta el DTO', () => {
    const claves = Object.keys(calcularSituacionComercial([]).por_estado);

    expect(claves.sort()).toEqual(
      [
        'DISPONIBLE',
        'EN_PLAN_DE_PAGO',
        'EN_PREPARACION',
        'SIN_PUBLICAR',
        'VENDIDA',
      ].sort(),
    );
    expect(claves.sort()).toEqual(
      [...estadoComercialUnidadSchema.options].sort(),
    );
    expect(claves.sort()).toEqual(
      Object.keys(unidadesPorEstadoSchema.shape).sort(),
    );
  });
});
