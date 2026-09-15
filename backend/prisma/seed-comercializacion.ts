import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import {
  EstadoComercial,
  EstadoCuota,
  EstadoProyecto,
  EstadoVenta,
  Periodicidad,
  TipologiaUnidad,
  TipoPlanPago,
} from '../generated/prisma/enums';
import { RolNombre } from '../src/common/enums/rol.enum';

/**
 * Seed de prueba para Comercialización/Ecommerce (Sprint 3, T96): siembra la
 * cadena completa PROYECTO -> UNIDADFUNCIONAL -> PUBLICACIONUNIDAD ->
 * PLANPAGO -> VENTA -> CUOTA, con volumen (10 proyectos, ~29 unidades) para
 * que las 19 tareas que dependen de esta rama tengan margen de datos para
 * construir y probar listados, filtros y catálogo — no solo el mínimo de
 * un caso por estado.
 *
 * Aparte de `prisma/seed.ts` a propósito, igual criterio que
 * `seed-cuenta-corriente-prueba.ts`: ese seed base debe quedar idempotente y
 * mínimo, sin datos transaccionales de prueba. Este script asume que ya
 * corrió (necesita los usuarios de rol Responsable de Proyectos y
 * Responsable de Comercialización y Ventas, y las FORMAPAGO que crea
 * `seed.ts`) y agrega encima los datos de Comercialización.
 *
 * Inserta filas directo con Prisma ya en el estado que dejarían los services
 * reales de cada HU (todavía no existen) si un usuario real hubiera operado
 * el sistema — no hace falta levantar el backend para tener datos de prueba.
 *
 * Casos borde que pide explícitamente T96 (ver plan `dejar-en-testing-la-
 * snazzy-prism.md`):
 * - Un proyecto sin `fecha_fin_estimada` ni `direccion` (Barrio Los Álamos).
 * - Una publicación no vigente (LOCAL-03).
 * - Un cliente sin `dni_cuil` (Camila Ferreyra).
 * - Al menos una unidad en cada uno de los 4 `EstadoComercial`.
 * - Al menos 3 cuotas vencidas con saldo pendiente (venta de Valentina Roldán
 *   sobre 2-B).
 * - Un cliente con 2+ unidades en proyectos distintos (Valentina Roldán),
 *   para el criterio de HU-28 ("historial agrupado por unidad, no por
 *   cobro", decisión 14 del DER).
 *
 * Es 100% idempotente (buscar-y-crear, nunca borra nada): correr
 *   npm run seed:comercializacion
 * las veces que haga falta no duplica datos. Para arrancar de datos
 * completamente limpios:
 *   npx prisma migrate reset          (borra la base, aplica migraciones y corre seed.ts solo)
 *   npm run seed:cuenta-corriente-prueba
 *   npm run seed:comercializacion     (agrega los datos de este script)
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Hoy, a los fines de "vencida" en los comentarios de este archivo: 2026-09-14.

const COSTO_POR_TIPOLOGIA: Partial<Record<TipologiaUnidad, number>> = {
  [TipologiaUnidad.UN_DORMITORIO]: 15_000_000,
  [TipologiaUnidad.DOS_DORMITORIOS]: 20_000_000,
  [TipologiaUnidad.TRES_DORMITORIOS]: 30_000_000,
};
const SUPERFICIE_POR_TIPOLOGIA: Partial<Record<TipologiaUnidad, number>> = {
  [TipologiaUnidad.UN_DORMITORIO]: 45,
  [TipologiaUnidad.DOS_DORMITORIOS]: 62,
  [TipologiaUnidad.TRES_DORMITORIOS]: 85,
};
const ROTACION_TIPOLOGIA = [
  TipologiaUnidad.UN_DORMITORIO,
  TipologiaUnidad.DOS_DORMITORIOS,
  TipologiaUnidad.TRES_DORMITORIOS,
];

async function main() {
  const responsableProyectos = await prisma.uSUARIO.findFirstOrThrow({
    where: { rol: { nombre: RolNombre.RESPONSABLE_PROYECTOS } },
    select: { id_usuario: true },
  });
  const responsableComercializacion = await prisma.uSUARIO.findFirstOrThrow({
    where: { rol: { nombre: RolNombre.RESPONSABLE_COMERCIALIZACION } },
    select: { id_usuario: true },
  });
  // UNIDADFUNCIONAL la mantiene Proyectos (ver comentario de
  // `costo` en schema.prisma: "Editable por Proyectos..."); PUBLICACIONUNIDAD
  // y PLANPAGO son acciones comerciales, las mantiene Comercialización.
  const auditoriaProyectos = {
    FK_usuario_creador: responsableProyectos.id_usuario,
    FK_usuario_actualizador: responsableProyectos.id_usuario,
  };
  const auditoriaComercializacion = {
    FK_usuario_creador: responsableComercializacion.id_usuario,
    FK_usuario_actualizador: responsableComercializacion.id_usuario,
  };

  // --------------------------------------------------------------------
  // PROYECTO — 10 filas (upsert real por `codigo`, único en BD)
  // --------------------------------------------------------------------
  const proyectosDatos = [
    // Los 2 "hero": cargan los casos borde de PROYECTO pedidos por T96.
    {
      codigo: 'PROY-TN',
      nombre: 'Torre Nogal',
      localidad: 'Resistencia, Chaco',
      direccion: 'Av. 25 de Mayo 1200',
      estado: EstadoProyecto.EN_EJECUCION,
      fecha_fin_estimada: new Date('2027-12-01'),
      cantidad_unidades_planificadas: 24,
      imagen_portada_url: 'https://cdn.axontech.test/proyectos/torre-nogal.jpg',
    },
    {
      codigo: 'PROY-BLA',
      nombre: 'Barrio Los Álamos',
      localidad: 'Corrientes, Corrientes',
      direccion: null, // caso borde: proyecto en planificación, sin dirección todavía
      estado: EstadoProyecto.EN_PLANIFICACION,
      fecha_fin_estimada: null, // caso borde pedido explícitamente
      cantidad_unidades_planificadas: 40,
      imagen_portada_url:
        'https://cdn.axontech.test/proyectos/barrio-los-alamos.jpg',
    },
    // 8 más, para dar volumen real y cubrir los 4 EstadoProyecto con varios
    // ejemplos cada uno.
    {
      codigo: 'PROY-EBA',
      nombre: 'Edificio Belgrano Alto',
      localidad: 'Rosario, Santa Fe',
      direccion: 'Bv. Oroño 1450',
      estado: EstadoProyecto.EN_EJECUCION,
      fecha_fin_estimada: new Date('2027-03-01'),
      cantidad_unidades_planificadas: 18,
      imagen_portada_url:
        'https://cdn.axontech.test/proyectos/edificio-belgrano-alto.jpg',
    },
    {
      codigo: 'PROY-TDR',
      nombre: 'Torres del Río',
      localidad: 'Santa Fe, Santa Fe',
      direccion: 'Av. Aristóbulo del Valle 3200',
      estado: EstadoProyecto.EN_EJECUCION,
      fecha_fin_estimada: new Date('2027-09-01'),
      cantidad_unidades_planificadas: 24,
      imagen_portada_url:
        'https://cdn.axontech.test/proyectos/torres-del-rio.jpg',
    },
    {
      codigo: 'PROY-ALM',
      nombre: 'Altos del Molino',
      localidad: 'Reconquista, Santa Fe',
      direccion: 'Av. Alvear 850',
      estado: EstadoProyecto.EN_EJECUCION,
      fecha_fin_estimada: new Date('2027-07-01'),
      cantidad_unidades_planificadas: 20,
      imagen_portada_url:
        'https://cdn.axontech.test/proyectos/altos-del-molino.jpg',
    },
    {
      codigo: 'PROY-BLM',
      nombre: 'Barrio La Merced',
      localidad: 'Formosa, Formosa',
      direccion: 'Barrio La Merced',
      estado: EstadoProyecto.FINALIZADO,
      fecha_fin_estimada: new Date('2025-11-01'),
      cantidad_unidades_planificadas: 12,
      imagen_portada_url:
        'https://cdn.axontech.test/proyectos/barrio-la-merced.jpg',
    },
    {
      codigo: 'PROY-RCT',
      nombre: 'Residencial Costanera',
      localidad: 'Corrientes, Corrientes',
      direccion: 'Av. Costanera 500',
      estado: EstadoProyecto.FINALIZADO,
      fecha_fin_estimada: new Date('2026-02-01'),
      cantidad_unidades_planificadas: 16,
      imagen_portada_url:
        'https://cdn.axontech.test/proyectos/residencial-costanera.jpg',
    },
    {
      codigo: 'PROY-PSJ',
      nombre: 'Paseo San Jorge',
      localidad: 'Resistencia, Chaco',
      direccion: 'Av. Sarmiento 2100',
      estado: EstadoProyecto.CANCELADO,
      fecha_fin_estimada: new Date('2026-05-01'),
      cantidad_unidades_planificadas: 20,
      imagen_portada_url:
        'https://cdn.axontech.test/proyectos/paseo-san-jorge.jpg',
    },
    {
      codigo: 'PROY-VNT',
      nombre: 'Vientos del Norte',
      localidad: 'Sáenz Peña, Chaco',
      direccion: 'Ruta 95 Km 3',
      estado: EstadoProyecto.EN_PLANIFICACION,
      fecha_fin_estimada: new Date('2028-01-01'),
      cantidad_unidades_planificadas: 26,
      imagen_portada_url:
        'https://cdn.axontech.test/proyectos/vientos-del-norte.jpg',
    },
    {
      codigo: 'PROY-MRP',
      nombre: 'Mirador del Paraná',
      localidad: 'Corrientes, Corrientes',
      direccion: 'Av. Poincaré 1200',
      estado: EstadoProyecto.EN_PLANIFICACION,
      fecha_fin_estimada: new Date('2028-06-01'),
      cantidad_unidades_planificadas: 14,
      imagen_portada_url:
        'https://cdn.axontech.test/proyectos/mirador-del-parana.jpg',
    },
  ];

  for (const proyecto of proyectosDatos) {
    await prisma.pROYECTO.upsert({
      where: { codigo: proyecto.codigo },
      update: proyecto,
      create: { ...proyecto, ...auditoriaProyectos },
    });
  }
  console.log(
    `Seed comercialización - PROYECTO: ${proyectosDatos.length} registros procesados.`,
  );

  const idProyectoPorCodigo = new Map(
    (
      await prisma.pROYECTO.findMany({
        where: { codigo: { in: proyectosDatos.map((p) => p.codigo) } },
        select: { id_proyecto: true, codigo: true },
      })
    ).map((p) => [p.codigo, p.id_proyecto]),
  );
  const idTorreNogal = idProyectoPorCodigo.get('PROY-TN')!;
  const idBarrioLosAlamos = idProyectoPorCodigo.get('PROY-BLA')!;

  // --------------------------------------------------------------------
  // Helpers idempotentes (findFirst manual: ninguna de estas tablas tiene
  // un unique real en BD, la unicidad la valida el service — mismo criterio
  // que CATEGORIA/MARCA/FORMAPAGO en prisma/seed.ts).
  // --------------------------------------------------------------------

  /** Idempotente por (FK_proyecto, identificador). */
  async function upsertUnidad(datos: {
    FK_proyecto: number;
    identificador: string;
    tipologia: TipologiaUnidad;
    superficie_cubierta: number;
    superficie_descubierta?: number;
    piso?: string;
    costo: number;
  }) {
    const existente = await prisma.uNIDADFUNCIONAL.findFirst({
      where: {
        FK_proyecto: datos.FK_proyecto,
        identificador: datos.identificador,
      },
    });
    if (existente) return existente;

    return prisma.uNIDADFUNCIONAL.create({
      data: { ...datos, ...auditoriaProyectos },
    });
  }

  /** Idempotente por (FK_unidad_funcional, orden). */
  async function upsertImagen(idUnidad: number, url: string, orden = 0) {
    const existente = await prisma.iMAGENUNIDAD.findFirst({
      where: { FK_unidad_funcional: idUnidad, orden },
    });
    if (existente) return existente;

    return prisma.iMAGENUNIDAD.create({
      data: { FK_unidad_funcional: idUnidad, url, orden },
    });
  }

  /** Idempotente por FK_unidad_funcional (una sola publicación por unidad en este seed). */
  async function upsertPublicacion(datos: {
    FK_unidad_funcional: number;
    estado_comercial: EstadoComercial;
    fecha_publicacion: Date;
    vigente?: boolean;
    fecha_despublicacion?: Date;
    motivo_despublicacion?: string;
  }) {
    const existente = await prisma.pUBLICACIONUNIDAD.findFirst({
      where: { FK_unidad_funcional: datos.FK_unidad_funcional },
    });
    if (existente) return existente;

    return prisma.pUBLICACIONUNIDAD.create({
      data: { ...datos, ...auditoriaComercializacion },
    });
  }

  /** Idempotente por (FK_publicacion, nombre). */
  async function upsertPlan(datos: {
    FK_publicacion: number;
    nombre: string;
    tipo: TipoPlanPago;
    precio: number;
    porcentaje_ganancia: number;
    margen: number;
    anticipo_porcentaje?: number;
    anticipo_monto?: number;
    cantidad_cuotas?: number;
    periodicidad?: Periodicidad;
  }) {
    const existente = await prisma.pLANPAGO.findFirst({
      where: { FK_publicacion: datos.FK_publicacion, nombre: datos.nombre },
    });
    if (existente) return existente;

    return prisma.pLANPAGO.create({
      data: { ...datos, ...auditoriaComercializacion },
    });
  }

  /**
   * Idempotente por FK_publicacion (una sola venta vigente por publicación
   * en este seed). Si ya existe, no vuelve a tocar sus CUOTA — se crean
   * anidadas solo la primera vez.
   */
  async function upsertVenta(datos: {
    FK_cliente: number;
    FK_publicacion: number;
    FK_plan_pago: number;
    fecha_adhesion: Date;
    precio_congelado: number;
    anticipo_congelado: number;
    tipo_plan_congelado: TipoPlanPago;
    cantidad_cuotas_congelada: number;
    periodicidad_congelada?: Periodicidad;
    cuotas: {
      numero: number;
      importe: number;
      fecha_vencimiento: Date;
      saldo_pendiente: number;
      estado: EstadoCuota;
    }[];
  }) {
    const existente = await prisma.vENTA.findFirst({
      where: { FK_publicacion: datos.FK_publicacion },
    });
    if (existente) return existente;

    const { cuotas, ...ventaDatos } = datos;
    return prisma.vENTA.create({
      data: {
        ...ventaDatos,
        estado: EstadoVenta.VIGENTE,
        cuotas: { create: cuotas },
      },
    });
  }

  // --------------------------------------------------------------------
  // CLIENTE — 6 filas (upsert real por `google_sub`, único en BD)
  // --------------------------------------------------------------------
  const clientesDatos = [
    {
      google_sub: '108234459812340001',
      email: 'valentina.roldan.demo@gmail.com',
      nombre: 'Valentina',
      apellido: 'Roldán',
      dni_cuil: '27389451260',
      telefono: '3624-512345',
    },
    {
      google_sub: '108234459812340002',
      email: 'emiliano.duarte.demo@gmail.com',
      nombre: 'Emiliano',
      apellido: 'Duarte',
      dni_cuil: '20401234567',
      telefono: null,
    },
    {
      google_sub: '108234459812340003',
      email: 'camila.ferreyra.demo@gmail.com',
      nombre: 'Camila',
      apellido: 'Ferreyra',
      dni_cuil: null, // caso borde pedido: cliente sin DNI/CUIL, no compró todavía
      telefono: '3624-778899',
    },
    {
      google_sub: '108234459812340004',
      email: 'braian.sosa.demo@gmail.com',
      nombre: 'Braian',
      apellido: 'Sosa',
      dni_cuil: '23412345678',
      telefono: '3624-223344',
    },
    {
      google_sub: '108234459812340005',
      email: 'micaela.benitez.demo@gmail.com',
      nombre: 'Micaela',
      apellido: 'Benítez',
      dni_cuil: '24567891230',
      telefono: '3624-556611',
    },
    {
      google_sub: '108234459812340006',
      email: 'rodrigo.acosta.demo@gmail.com',
      nombre: 'Rodrigo',
      apellido: 'Acosta',
      dni_cuil: '25678912340',
      telefono: '3624-998877',
    },
  ];
  for (const cliente of clientesDatos) {
    await prisma.cLIENTE.upsert({
      where: { google_sub: cliente.google_sub },
      update: cliente,
      create: cliente,
    });
  }
  console.log(
    `Seed comercialización - CLIENTE: ${clientesDatos.length} registros procesados.`,
  );

  const idClientePorGoogleSub = new Map(
    (
      await prisma.cLIENTE.findMany({
        where: { google_sub: { in: clientesDatos.map((c) => c.google_sub) } },
        select: { id_cliente: true, google_sub: true },
      })
    ).map((c) => [c.google_sub, c.id_cliente]),
  );
  const idValentina = idClientePorGoogleSub.get('108234459812340001')!;
  const idEmiliano = idClientePorGoogleSub.get('108234459812340002')!;
  const idBraian = idClientePorGoogleSub.get('108234459812340004')!;
  const idMicaela = idClientePorGoogleSub.get('108234459812340005')!;
  const idRodrigo = idClientePorGoogleSub.get('108234459812340006')!;

  // --------------------------------------------------------------------
  // Proyectos "hero" — cargan los 4 EstadoComercial + la publicación no
  // vigente, con el detalle completo.
  // --------------------------------------------------------------------

  // PB-A: EN_PREPARACION, sin ningún plan activo — es justamente lo que la
  // mantiene en preparación.
  const pbA = await upsertUnidad({
    FK_proyecto: idTorreNogal,
    identificador: 'PB-A',
    tipologia: TipologiaUnidad.MONOAMBIENTE,
    superficie_cubierta: 32.5,
    piso: 'PB',
    costo: 9_000_000,
  });
  await upsertImagen(
    pbA.id_unidad_funcional,
    'https://cdn.axontech.test/unidades/pb-a.jpg',
  );
  await upsertPublicacion({
    FK_unidad_funcional: pbA.id_unidad_funcional,
    estado_comercial: EstadoComercial.EN_PREPARACION,
    fecha_publicacion: new Date('2026-08-20'),
  });

  // 1-A: DISPONIBLE, con un plan CONTADO y uno FINANCIADO (todavía no
  // vendida, el comprador elige).
  const unidad1A = await upsertUnidad({
    FK_proyecto: idTorreNogal,
    identificador: '1-A',
    tipologia: TipologiaUnidad.UN_DORMITORIO,
    superficie_cubierta: 45,
    superficie_descubierta: 6,
    piso: '1',
    costo: 15_000_000,
  });
  await upsertImagen(
    unidad1A.id_unidad_funcional,
    'https://cdn.axontech.test/unidades/1-a.jpg',
  );
  const publicacion1A = await upsertPublicacion({
    FK_unidad_funcional: unidad1A.id_unidad_funcional,
    estado_comercial: EstadoComercial.DISPONIBLE,
    fecha_publicacion: new Date('2026-06-01'),
  });
  await upsertPlan({
    FK_publicacion: publicacion1A.id_publicacion,
    nombre: 'Contado 1-A',
    tipo: TipoPlanPago.CONTADO,
    precio: 19_000_000, // costo 15.000.000 + margen 4.000.000 (26,67%)
    porcentaje_ganancia: 26.67,
    margen: 4_000_000,
    anticipo_porcentaje: 100,
  });
  await upsertPlan({
    FK_publicacion: publicacion1A.id_publicacion,
    nombre: 'Financiado 12 cuotas 1-A',
    tipo: TipoPlanPago.FINANCIADO,
    precio: 21_000_000, // costo 15.000.000 + margen 6.000.000 (40%)
    porcentaje_ganancia: 40,
    margen: 6_000_000,
    anticipo_porcentaje: 30,
    cantidad_cuotas: 12,
    periodicidad: Periodicidad.MENSUAL,
  });

  // 2-B: EN_PLAN_DE_PAGO, vendida a Valentina Roldán (financiado, con cuotas
  // vencidas — el caso borde principal de cuotas que pide T96).
  const unidad2B = await upsertUnidad({
    FK_proyecto: idTorreNogal,
    identificador: '2-B',
    tipologia: TipologiaUnidad.DOS_DORMITORIOS,
    superficie_cubierta: 62.3,
    superficie_descubierta: 8.5,
    piso: '2',
    costo: 20_000_000,
  });
  await upsertImagen(
    unidad2B.id_unidad_funcional,
    'https://cdn.axontech.test/unidades/2-b.jpg',
  );
  const publicacion2B = await upsertPublicacion({
    FK_unidad_funcional: unidad2B.id_unidad_funcional,
    estado_comercial: EstadoComercial.EN_PLAN_DE_PAGO,
    fecha_publicacion: new Date('2026-03-01'),
  });
  const plan2B = await upsertPlan({
    FK_publicacion: publicacion2B.id_publicacion,
    nombre: 'Financiado 6 cuotas 2-B',
    tipo: TipoPlanPago.FINANCIADO,
    precio: 27_000_000, // costo 20.000.000 + margen 7.000.000 (35%)
    porcentaje_ganancia: 35,
    margen: 7_000_000,
    anticipo_porcentaje: 20,
    cantidad_cuotas: 6,
    periodicidad: Periodicidad.MENSUAL,
  });
  // Anticipo: 27.000.000 * 20% = 5.400.000. Resto: 21.600.000 / 6 = 3.600.000
  // por cuota. Hoy (a los fines de "vencida" en este seed) es 2026-09-14:
  // las cuotas 3, 4 y 5 ya vencieron y siguen con saldo -> exactamente 3
  // cuotas vencidas con saldo, el criterio explícito del "Listo cuando".
  await upsertVenta({
    FK_cliente: idValentina,
    FK_publicacion: publicacion2B.id_publicacion,
    FK_plan_pago: plan2B.id_plan_pago,
    fecha_adhesion: new Date('2026-04-14'),
    precio_congelado: 27_000_000,
    anticipo_congelado: 5_400_000,
    tipo_plan_congelado: TipoPlanPago.FINANCIADO,
    cantidad_cuotas_congelada: 6,
    periodicidad_congelada: Periodicidad.MENSUAL,
    cuotas: [
      {
        numero: 0,
        importe: 5_400_000,
        fecha_vencimiento: new Date('2026-04-14'),
        saldo_pendiente: 0,
        estado: EstadoCuota.PAGADA,
      },
      {
        numero: 1,
        importe: 3_600_000,
        fecha_vencimiento: new Date('2026-05-14'),
        saldo_pendiente: 0,
        estado: EstadoCuota.PAGADA,
      },
      {
        numero: 2,
        importe: 3_600_000,
        fecha_vencimiento: new Date('2026-06-14'),
        saldo_pendiente: 0,
        estado: EstadoCuota.PAGADA,
      },
      {
        numero: 3,
        importe: 3_600_000,
        fecha_vencimiento: new Date('2026-07-14'),
        saldo_pendiente: 3_600_000,
        estado: EstadoCuota.PENDIENTE,
      }, // vencida (1)
      {
        numero: 4,
        importe: 3_600_000,
        fecha_vencimiento: new Date('2026-08-14'),
        saldo_pendiente: 1_600_000,
        estado: EstadoCuota.PARCIAL,
      }, // vencida (2), pagó 2.000.000
      {
        numero: 5,
        importe: 3_600_000,
        fecha_vencimiento: new Date('2026-09-01'),
        saldo_pendiente: 3_600_000,
        estado: EstadoCuota.PENDIENTE,
      }, // vencida (3)
      {
        numero: 6,
        importe: 3_600_000,
        fecha_vencimiento: new Date('2026-10-14'),
        saldo_pendiente: 3_600_000,
        estado: EstadoCuota.PENDIENTE,
      }, // a futuro, contraste
    ],
  });

  // LOTE-08: VENDIDA, contado, vendida a Emiliano Duarte.
  const loteOcho = await upsertUnidad({
    FK_proyecto: idBarrioLosAlamos,
    identificador: 'LOTE-08',
    tipologia: TipologiaUnidad.TRES_DORMITORIOS,
    superficie_cubierta: 95,
    superficie_descubierta: 120,
    costo: 42_000_000,
  });
  await upsertImagen(
    loteOcho.id_unidad_funcional,
    'https://cdn.axontech.test/unidades/lote-08.jpg',
  );
  const publicacionLoteOcho = await upsertPublicacion({
    FK_unidad_funcional: loteOcho.id_unidad_funcional,
    estado_comercial: EstadoComercial.VENDIDA,
    fecha_publicacion: new Date('2026-06-01'),
  });
  const planLoteOcho = await upsertPlan({
    FK_publicacion: publicacionLoteOcho.id_publicacion,
    nombre: 'Contado LOTE-08',
    tipo: TipoPlanPago.CONTADO,
    precio: 52_000_000, // costo 42.000.000 + margen 10.000.000 (23,81%)
    porcentaje_ganancia: 23.81,
    margen: 10_000_000,
    anticipo_porcentaje: 100,
  });
  // Asunción documentada acá porque el service real todavía no existe: en
  // CONTADO se genera igual una única cuota número 0, aunque
  // PLANPAGO.cantidad_cuotas sea null para ese tipo.
  await upsertVenta({
    FK_cliente: idEmiliano,
    FK_publicacion: publicacionLoteOcho.id_publicacion,
    FK_plan_pago: planLoteOcho.id_plan_pago,
    fecha_adhesion: new Date('2026-08-01'),
    precio_congelado: 52_000_000,
    anticipo_congelado: 52_000_000,
    tipo_plan_congelado: TipoPlanPago.CONTADO,
    cantidad_cuotas_congelada: 1,
    cuotas: [
      {
        numero: 0,
        importe: 52_000_000,
        fecha_vencimiento: new Date('2026-08-01'),
        saldo_pendiente: 0,
        estado: EstadoCuota.PAGADA,
      },
    ],
  });

  // LOCAL-03: caso borde pedido — publicación DISPONIBLE despublicada
  // (vigente: false) sin haber llegado a venderse. Nunca se despublica una
  // VENDIDA (regla real de negocio, ver comentario de schema.prisma).
  const localTres = await upsertUnidad({
    FK_proyecto: idBarrioLosAlamos,
    identificador: 'LOCAL-03',
    tipologia: TipologiaUnidad.LOCAL_COMERCIAL,
    superficie_cubierta: 38,
    costo: 8_000_000,
  });
  await upsertImagen(
    localTres.id_unidad_funcional,
    'https://cdn.axontech.test/unidades/local-03.jpg',
  );
  await upsertPublicacion({
    FK_unidad_funcional: localTres.id_unidad_funcional,
    estado_comercial: EstadoComercial.DISPONIBLE,
    fecha_publicacion: new Date('2026-05-01'),
    vigente: false,
    fecha_despublicacion: new Date('2026-07-15'),
    motivo_despublicacion:
      'Local retirado temporalmente del catálogo por refacción de la fachada',
  });

  // --------------------------------------------------------------------
  // 8 proyectos restantes — 3 UNIDADFUNCIONAL cada uno (24 en total), con
  // publicación y venta según el estado del proyecto (regla simple para no
  // tener que escribir 24 bloques a mano).
  // --------------------------------------------------------------------

  /** EN_EJECUCION: U1 y U2 publicadas DISPONIBLE con un plan CONTADO (35% de margen), U3 sin publicar. */
  async function sembrarProyectoEnEjecucion(codigo: string) {
    const idProyecto = idProyectoPorCodigo.get(codigo)!;
    for (const [indice, tipologia] of ROTACION_TIPOLOGIA.entries()) {
      const identificador = `U${indice + 1}`;
      const costo = COSTO_POR_TIPOLOGIA[tipologia]!;
      const unidad = await upsertUnidad({
        FK_proyecto: idProyecto,
        identificador,
        tipologia,
        superficie_cubierta: SUPERFICIE_POR_TIPOLOGIA[tipologia]!,
        costo,
      });
      if (indice === 2) continue; // U3: sin publicar, obra en curso

      const publicacion = await upsertPublicacion({
        FK_unidad_funcional: unidad.id_unidad_funcional,
        estado_comercial: EstadoComercial.DISPONIBLE,
        fecha_publicacion: new Date('2026-06-01'),
      });
      const precio = Math.round(costo * 1.35);
      await upsertPlan({
        FK_publicacion: publicacion.id_publicacion,
        nombre: `Contado ${identificador}`,
        tipo: TipoPlanPago.CONTADO,
        precio,
        porcentaje_ganancia: 35,
        margen: 0,
        anticipo_porcentaje: 100,
      });
    }
  }

  /**
   * FINALIZADO: las 3 unidades publicadas VENDIDA, cada una con su plan
   * CONTADO (30% de margen) y una VENTA real (cuota única PAGADA). Los
   * clientes se asignan explícitamente para poder sembrar a propósito el
   * caso de "cliente con 2+ unidades" (Valentina Roldán).
   */
  async function sembrarProyectoFinalizado(
    codigo: string,
    fechaAdhesion: Date,
    clientesPorUnidad: [number, number, number],
  ) {
    const idProyecto = idProyectoPorCodigo.get(codigo)!;
    for (const [indice, tipologia] of ROTACION_TIPOLOGIA.entries()) {
      const identificador = `U${indice + 1}`;
      const costo = COSTO_POR_TIPOLOGIA[tipologia]!;
      const unidad = await upsertUnidad({
        FK_proyecto: idProyecto,
        identificador,
        tipologia,
        superficie_cubierta: SUPERFICIE_POR_TIPOLOGIA[tipologia]!,
        costo,
      });
      const publicacion = await upsertPublicacion({
        FK_unidad_funcional: unidad.id_unidad_funcional,
        estado_comercial: EstadoComercial.VENDIDA,
        fecha_publicacion: fechaAdhesion,
      });
      const precio = Math.round(costo * 1.3);
      const plan = await upsertPlan({
        FK_publicacion: publicacion.id_publicacion,
        nombre: `Contado ${identificador}`,
        tipo: TipoPlanPago.CONTADO,
        precio,
        porcentaje_ganancia: 30,
        margen: 0,
        anticipo_porcentaje: 100,
      });
      await upsertVenta({
        FK_cliente: clientesPorUnidad[indice],
        FK_publicacion: publicacion.id_publicacion,
        FK_plan_pago: plan.id_plan_pago,
        fecha_adhesion: fechaAdhesion,
        precio_congelado: precio,
        anticipo_congelado: precio,
        tipo_plan_congelado: TipoPlanPago.CONTADO,
        cantidad_cuotas_congelada: 1,
        cuotas: [
          {
            numero: 0,
            importe: precio,
            fecha_vencimiento: fechaAdhesion,
            saldo_pendiente: 0,
            estado: EstadoCuota.PAGADA,
          },
        ],
      });
    }
  }

  /** CANCELADO / EN_PLANIFICACION: unidades cargadas, ninguna publicada todavía. */
  async function sembrarProyectoSinPublicar(codigo: string) {
    const idProyecto = idProyectoPorCodigo.get(codigo)!;
    for (const [indice, tipologia] of ROTACION_TIPOLOGIA.entries()) {
      await upsertUnidad({
        FK_proyecto: idProyecto,
        identificador: `U${indice + 1}`,
        tipologia,
        superficie_cubierta: SUPERFICIE_POR_TIPOLOGIA[tipologia]!,
        costo: COSTO_POR_TIPOLOGIA[tipologia]!,
      });
    }
  }

  await sembrarProyectoEnEjecucion('PROY-EBA');
  await sembrarProyectoEnEjecucion('PROY-TDR');
  await sembrarProyectoEnEjecucion('PROY-ALM');

  // Barrio La Merced: U1 -> Valentina (su 2da unidad, en otro proyecto:
  // siembra a propósito el caso "cliente con 2+ unidades" de HU-28).
  await sembrarProyectoFinalizado('PROY-BLM', new Date('2025-10-15'), [
    idValentina,
    idBraian,
    idBraian,
  ]);
  await sembrarProyectoFinalizado('PROY-RCT', new Date('2026-01-10'), [
    idMicaela,
    idMicaela,
    idRodrigo,
  ]);

  await sembrarProyectoSinPublicar('PROY-PSJ');
  await sembrarProyectoSinPublicar('PROY-VNT');
  await sembrarProyectoSinPublicar('PROY-MRP');

  console.log(
    'Seed comercialización - UNIDADFUNCIONAL/PUBLICACIONUNIDAD/PLANPAGO/VENTA/CUOTA: listo (5 hero + 24 extra unidades).',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
