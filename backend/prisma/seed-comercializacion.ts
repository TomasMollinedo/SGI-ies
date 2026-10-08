import { PrismaClient } from '../generated/prisma/client';
import {
  EstadoComercial,
  EstadoDeclaracionPago,
  EstadoProyecto,
  ModalidadPago,
  OrigenCobro,
  TipoImagenProyecto,
  TipologiaUnidad,
} from '../generated/prisma/enums';
import { RolNombre } from '../src/common/enums/rol.enum';
import { PagoCuotaSeed, VentaSeed, sembrarVenta } from './seed-ventas';
import { sembrarDeclaracion } from './seed-declaraciones';
import { ProyectoSeed, sembrarProyecto } from './seed-proyectos';
import { sembrarPlazos } from './seed-plazos';
import { diasDesdeHoy, mesesDesdeHoy } from './seed-fechas';
import { ejecutarSeed } from './seed-ejecutar';

/**
 * Seed de prueba para Comercialización/Ecommerce (Sprint 3, T96): siembra la
 * cadena completa PROYECTO -> UNIDADFUNCIONAL -> PUBLICACIONUNIDAD (con
 * precio de lista y planes de ejemplo sobre PLAZOFINANCIACION) -> VENTA ->
 * PLANPAGO -> CUOTA, con volumen (10 proyectos, ~29 unidades) para
 * que las 19 tareas que dependen de esta rama tengan margen de datos para
 * construir y probar listados, filtros y catálogo — no solo el mínimo de
 * un caso por estado.
 *
 * Aparte de `prisma/seed.ts` a propósito, igual criterio que
 * `seed-cuenta-corriente-prueba.ts`: ese seed base debe quedar idempotente y
 * mínimo, sin datos transaccionales de prueba. Este script asume que ya
 * corrió (necesita el usuario Administrador y las FORMAPAGO que crea
 * `seed.ts`) y agrega encima los datos de Comercialización.
 *
 * Inserta filas directo con Prisma ya en el estado que dejarían los services
 * de cada HU si un usuario real hubiera operado el sistema — no hace falta
 * levantar el backend para tener datos de prueba. Las ventas las siembra
 * `sembrarVenta` (`seed-ventas.ts`) con el sistema francés de T132 y un cobro
 * por cada pago, y las fechas son relativas a hoy (`seed-fechas.ts`) para que
 * las cuotas vencidas sigan vencidas el día que se corra.
 *
 * Casos borde que pide explícitamente T96 (ver plan `dejar-en-testing-la-
 * snazzy-prism.md`):
 * - Un proyecto En ejecución sin `fecha_fin_estimada` (Barrio Los Álamos):
 *   su condición de entrega es "A entregar, fecha a confirmar".
 * - Una publicación no vigente (LOCAL-03).
 * - Un cliente sin `dni_cuil` (Camila Ferreyra).
 * - Al menos una unidad en cada uno de los 4 `EstadoComercial`.
 * - Al menos 3 cuotas vencidas con saldo pendiente (venta de Valentina Roldán
 *   sobre 2-B, que además es el caso de prueba del sistema francés de T132).
 * - Una venta financiada al día (3-C), ventas de contado, ventas financiadas
 *   ya pagadas (con y sin interés), un cobro anulado y una venta cancelada.
 * - Un cliente con 2+ unidades en proyectos distintos (Valentina Roldán),
 *   para el criterio de HU-28 ("historial agrupado por unidad, no por
 *   cobro", decisión 14 del DER).
 *
 * Es 100% idempotente (buscar-y-crear, nunca borra nada): correr
 *   npm run seed:comercializacion
 * las veces que haga falta no duplica datos. Para arrancar de datos
 * completamente limpios:
 *   npx prisma migrate reset          (borra la base y aplica las migraciones)
 *   npx prisma db seed                (corre seed.ts: desde Prisma 7 el reset no lo corre solo)
 *   npm run seed:cuenta-corriente-prueba
 *   npm run seed:comercializacion     (agrega los datos de este script)
 */

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

export async function sembrarComercializacion(prisma: PrismaClient) {
  // Todos los ABM y operaciones que imita este seed (proyectos, unidades,
  // publicaciones, plazos, planes, ventas, cobros y la validación de
  // declaraciones) son del rol Administrador: la auditoría queda a su nombre,
  // como si los hubiera cargado desde la API.
  const { id_usuario: idAdministrador } = await prisma.uSUARIO.findFirstOrThrow(
    {
      where: { rol: { nombre: RolNombre.ADMINISTRADOR } },
      select: { id_usuario: true },
    },
  );
  const auditoria = {
    FK_usuario_creador: idAdministrador,
    FK_usuario_actualizador: idAdministrador,
  };

  // Plazos de financiación (HU-32): los planes de ejemplo eligen uno.
  const plazoPorCuotas = await sembrarPlazos(prisma, idAdministrador);
  const plazoVenta = (cantidadCuotas: number) => {
    const encontrado = plazoPorCuotas.get(cantidadCuotas);
    if (encontrado === undefined) {
      throw new Error(`No hay un plazo sembrado de ${cantidadCuotas} cuotas`);
    }
    return encontrado;
  };
  const plazo = (cantidadCuotas: number) =>
    plazoVenta(cantidadCuotas).id_plazo_financiacion;

  // --------------------------------------------------------------------
  // PROYECTO — 10 filas, como las deja el ABM de Proyecto (T122), ver
  // `sembrarProyecto`. `clave` es solo para referenciarlos dentro de este
  // script: el código lo genera el sistema.
  // - Cubre los tres estados de obra de HU-31 y uno Cancelado, que sigue en
  //   el enum hasta que se responda OBS-22 (T159).
  // --------------------------------------------------------------------
  const proyectosDatos: (ProyectoSeed & { clave: string })[] = [
    // Los 2 "hero": cargan los casos borde de PROYECTO.
    {
      clave: 'PROY-TN',
      nombre: 'Torre Nogal',
      descripcion:
        'Torre de 12 pisos con departamentos de 1 y 2 dormitorios, cocheras y amenities.',
      localidad: 'Resistencia, Chaco',
      direccion: 'Av. 25 de Mayo 1200',
      estado_obra: EstadoProyecto.EN_EJECUCION,
      fecha_inicio: '2025-03-01',
      fecha_fin_estimada: '2027-12-01',
      cantidad_unidades_planificadas: 24,
      portada: 'torre-nogal.jpg',
      imagenes: [
        { tipo: TipoImagenProyecto.RENDER, archivo: 'torre-nogal-fachada.jpg' },
        { tipo: TipoImagenProyecto.RENDER, archivo: 'torre-nogal-hall.jpg' },
        {
          tipo: TipoImagenProyecto.PLANO,
          archivo: 'torre-nogal-planta-tipo.png',
        },
      ],
    },
    {
      // Caso borde: En ejecución sin fecha de finalización estimada. Su
      // condición de entrega es "A entregar, fecha a confirmar" (HU-20).
      clave: 'PROY-BLA',
      nombre: 'Barrio Los Álamos',
      descripcion: null,
      localidad: 'Corrientes, Corrientes',
      direccion: 'Ruta Nacional 12 Km 1028',
      estado_obra: EstadoProyecto.EN_EJECUCION,
      fecha_inicio: '2025-08-01',
      fecha_fin_estimada: null,
      cantidad_unidades_planificadas: 40,
      portada: 'barrio-los-alamos.jpg',
      imagenes: [
        {
          tipo: TipoImagenProyecto.PLANO,
          archivo: 'barrio-los-alamos-loteo.png',
        },
      ],
    },
    // 8 más, para dar volumen real y cubrir los estados de obra con varios
    // ejemplos cada uno.
    {
      clave: 'PROY-EBA',
      nombre: 'Edificio Belgrano Alto',
      descripcion: 'Edificio de 9 pisos frente al Bv. Oroño.',
      localidad: 'Rosario, Santa Fe',
      direccion: 'Bv. Oroño 1450',
      estado_obra: EstadoProyecto.EN_EJECUCION,
      fecha_inicio: '2025-01-15',
      fecha_fin_estimada: '2027-03-01',
      cantidad_unidades_planificadas: 18,
      portada: 'edificio-belgrano-alto.jpg',
      imagenes: [
        {
          tipo: TipoImagenProyecto.RENDER,
          archivo: 'belgrano-alto-fachada.jpg',
        },
        { tipo: TipoImagenProyecto.PLANO, archivo: 'belgrano-alto-planta.png' },
      ],
    },
    {
      clave: 'PROY-TDR',
      nombre: 'Torres del Río',
      descripcion: null,
      localidad: 'Santa Fe, Santa Fe',
      direccion: 'Av. Aristóbulo del Valle 3200',
      estado_obra: EstadoProyecto.EN_EJECUCION,
      fecha_inicio: '2025-06-01',
      fecha_fin_estimada: '2027-09-01',
      cantidad_unidades_planificadas: 24,
      portada: 'torres-del-rio.jpg',
      imagenes: [],
    },
    {
      clave: 'PROY-ALM',
      nombre: 'Altos del Molino',
      descripcion: null,
      localidad: 'Reconquista, Santa Fe',
      direccion: 'Av. Alvear 850',
      estado_obra: EstadoProyecto.EN_EJECUCION,
      fecha_inicio: '2025-05-01',
      fecha_fin_estimada: '2027-07-01',
      cantidad_unidades_planificadas: 20,
      portada: 'altos-del-molino.jpg',
      imagenes: [],
    },
    {
      clave: 'PROY-BLM',
      nombre: 'Barrio La Merced',
      descripcion: 'Barrio de casas de 1 a 3 dormitorios, ya entregado.',
      localidad: 'Formosa, Formosa',
      direccion: 'Barrio La Merced',
      estado_obra: EstadoProyecto.FINALIZADO,
      fecha_inicio: '2023-09-01',
      fecha_fin_estimada: '2025-11-01',
      cantidad_unidades_planificadas: 12,
      portada: 'barrio-la-merced.jpg',
      imagenes: [
        { tipo: TipoImagenProyecto.RENDER, archivo: 'la-merced-casas.jpg' },
      ],
    },
    {
      clave: 'PROY-RCT',
      nombre: 'Residencial Costanera',
      descripcion: null,
      localidad: 'Corrientes, Corrientes',
      direccion: 'Av. Costanera 500',
      estado_obra: EstadoProyecto.FINALIZADO,
      fecha_inicio: '2024-02-01',
      fecha_fin_estimada: '2026-02-01',
      cantidad_unidades_planificadas: 16,
      portada: 'residencial-costanera.jpg',
      imagenes: [],
    },
    {
      clave: 'PROY-PSJ',
      nombre: 'Paseo San Jorge',
      descripcion: 'Proyecto suspendido por falta de financiamiento.',
      localidad: 'Resistencia, Chaco',
      direccion: 'Av. Sarmiento 2100',
      estado_obra: EstadoProyecto.CANCELADO,
      fecha_inicio: '2024-10-01',
      fecha_fin_estimada: '2026-05-01',
      cantidad_unidades_planificadas: 20,
      portada: 'paseo-san-jorge.jpg',
      imagenes: [],
    },
    {
      clave: 'PROY-VNT',
      nombre: 'Vientos del Norte',
      descripcion: null,
      localidad: 'Sáenz Peña, Chaco',
      direccion: 'Ruta 95 Km 3',
      estado_obra: EstadoProyecto.EN_PLANIFICACION,
      fecha_inicio: null,
      fecha_fin_estimada: '2028-01-01',
      cantidad_unidades_planificadas: 26,
      portada: 'vientos-del-norte.jpg',
      imagenes: [],
    },
    {
      clave: 'PROY-MRP',
      nombre: 'Mirador del Paraná',
      descripcion:
        'Torre frente al río con departamentos de 2 y 3 dormitorios.',
      localidad: 'Corrientes, Corrientes',
      direccion: 'Av. Poincaré 1200',
      estado_obra: EstadoProyecto.EN_PLANIFICACION,
      fecha_inicio: '2027-03-01',
      fecha_fin_estimada: '2028-06-01',
      cantidad_unidades_planificadas: 14,
      portada: 'mirador-del-parana.jpg',
      imagenes: [
        { tipo: TipoImagenProyecto.RENDER, archivo: 'mirador-vista-rio.jpg' },
        { tipo: TipoImagenProyecto.PLANO, archivo: 'mirador-planta-tipo.png' },
      ],
    },
  ];

  const idProyectoPorCodigo = new Map<string, number>();
  for (const datos of proyectosDatos) {
    const proyecto = await sembrarProyecto(prisma, datos, idAdministrador);
    idProyectoPorCodigo.set(datos.clave, proyecto.id_proyecto);
  }
  console.log(
    `Seed comercialización - PROYECTO: ${proyectosDatos.length} registros procesados, con sus imágenes de diseño.`,
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
      data: { ...datos, ...auditoria },
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
    precio_lista?: number;
    porcentaje_ganancia?: number;
    vigente?: boolean;
    fecha_despublicacion?: Date;
    motivo_despublicacion?: string;
  }) {
    const existente = await prisma.pUBLICACIONUNIDAD.findFirst({
      where: { FK_unidad_funcional: datos.FK_unidad_funcional },
    });
    if (existente) return existente;

    return prisma.pUBLICACIONUNIDAD.create({
      data: { ...datos, ...auditoria },
    });
  }

  /**
   * Plan de ejemplo con el modelo del Sprint 4 (HU-22): nombre, anticipo en
   * porcentaje, plazo y estado. Los importes no se guardan: los calcula la
   * API con el precio de lista y la TNA del plazo. Idempotente por
   * (FK_publicacion, nombre).
   */
  async function upsertPlan(datos: {
    FK_publicacion: number;
    nombre: string;
    anticipo_porcentaje: number;
    FK_plazo_financiacion: number;
    estado?: boolean;
  }) {
    const existente = await prisma.pLANEJEMPLO.findFirst({
      where: { FK_publicacion: datos.FK_publicacion, nombre: datos.nombre },
    });
    if (existente) return existente;

    return prisma.pLANEJEMPLO.create({
      data: { ...datos, ...auditoria },
    });
  }

  // Formas de pago que crea `seed.ts`. La transferencia exige número de
  // referencia; el efectivo, no.
  const { id_forma_pago: idEfectivo } = await prisma.fORMAPAGO.findFirstOrThrow(
    { where: { nombre: 'Efectivo' }, select: { id_forma_pago: true } },
  );
  const { id_forma_pago: idTransferencia } =
    await prisma.fORMAPAGO.findFirstOrThrow({
      where: { nombre: 'Transferencia bancaria' },
      select: { id_forma_pago: true },
    });

  /** Cobro presencial en efectivo; ver `PagoCuotaSeed` para los opcionales. */
  const efectivo = (numero_cuota: number, importe?: number): PagoCuotaSeed => ({
    numero_cuota,
    importe,
    origen: OrigenCobro.PRESENCIAL,
    FK_forma_pago: idEfectivo,
    numero_referencia: null,
  });
  /** Cobro presencial por transferencia, con su número de referencia. */
  const transferencia = (
    numero_cuota: number,
    numero_referencia: string,
    importe?: number,
  ): PagoCuotaSeed => ({
    numero_cuota,
    importe,
    origen: OrigenCobro.PRESENCIAL,
    FK_forma_pago: idTransferencia,
    numero_referencia,
  });
  /** Paga completas, por transferencia, las cuotas 0 (anticipo) a `ultima`. */
  const pagosHasta = (ultima: number, referencia: string) =>
    Array.from({ length: ultima + 1 }, (_, numero) =>
      transferencia(numero, `${referencia}-${numero}`),
    );

  /** Ver `sembrarVenta`: idempotente por publicación. */
  const venderUnidad = (datos: VentaSeed) =>
    sembrarVenta(prisma, datos, idAdministrador);

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
      telefono: '3624512345',
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
      telefono: '3624778899',
    },
    {
      google_sub: '108234459812340004',
      email: 'braian.sosa.demo@gmail.com',
      nombre: 'Braian',
      apellido: 'Sosa',
      dni_cuil: '23412345678',
      telefono: '3624223344',
    },
    {
      google_sub: '108234459812340005',
      email: 'micaela.benitez.demo@gmail.com',
      nombre: 'Micaela',
      apellido: 'Benítez',
      dni_cuil: '24567891230',
      telefono: '3624556611',
    },
    {
      google_sub: '108234459812340006',
      email: 'rodrigo.acosta.demo@gmail.com',
      nombre: 'Rodrigo',
      apellido: 'Acosta',
      dni_cuil: '25678912340',
      telefono: '3624998877',
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

  // PB-A: EN_PREPARACION, sin precio de lista — es justamente lo que la
  // mantiene en preparación (T133). Sin planes: solo se cargan en Disponible.
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
    fecha_publicacion: diasDesdeHoy(-20),
  });

  // 1-A: DISPONIBLE, todavía no vendida. Sus planes de ejemplo cubren los
  // casos de HU-22: dos activos (uno sin interés), uno inactivo y uno cuyo
  // plazo está dado de baja (la API no lo devuelve).
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
    fecha_publicacion: mesesDesdeHoy(-4),
    precio_lista: 19_000_000,
    porcentaje_ganancia: 26.67,
  });
  await upsertPlan({
    FK_publicacion: publicacion1A.id_publicacion,
    nombre: 'Anticipo 30 % + 12 cuotas',
    anticipo_porcentaje: 30,
    FK_plazo_financiacion: plazo(12),
  });
  await upsertPlan({
    FK_publicacion: publicacion1A.id_publicacion,
    nombre: 'Anticipo 50 % + 3 cuotas sin interés',
    anticipo_porcentaje: 50,
    FK_plazo_financiacion: plazo(3),
  });
  await upsertPlan({
    FK_publicacion: publicacion1A.id_publicacion,
    nombre: 'Anticipo 20 % + 24 cuotas',
    anticipo_porcentaje: 20,
    FK_plazo_financiacion: plazo(24),
    estado: false,
  });
  await upsertPlan({
    FK_publicacion: publicacion1A.id_publicacion,
    nombre: 'Anticipo 20 % + 36 cuotas',
    anticipo_porcentaje: 20,
    FK_plazo_financiacion: plazo(36),
  });
  // Una venta cancelada antes de pagar el anticipo: sus cuotas quedan
  // anuladas y la unidad vuelve a Disponible, como la deja la cancelación.
  await venderUnidad({
    FK_cliente: idEmiliano,
    FK_publicacion: publicacion1A.id_publicacion,
    fecha_venta: mesesDesdeHoy(-3),
    precio: 19_000_000,
    modalidad: ModalidadPago.FINANCIADO,
    anticipo_porcentaje: 30,
    plazo: plazoVenta(12),
    cancelacion: {
      fecha: mesesDesdeHoy(-2),
      motivo: 'El cliente desistió de la compra antes de pagar el anticipo',
    },
  });

  // 2-B: EN_PLAN_DE_PAGO, vendida a Valentina Roldán. Es el caso de prueba
  // del sistema francés (T132): precio 20.000.000, anticipo 50 %, 12 cuotas
  // con TNA 24 % -> cuota 945.595,97, la última 945.595,92 e intereses por
  // 1.347.151,59. Vendida hace 170 días, así que vencieron el anticipo y las
  // cuotas 1 a 5; la 6 vence en unos días. Pagó el anticipo (en dos cobros),
  // las cuotas 1 y 2, y parte de la 3: quedan 3 cuotas vencidas con saldo
  // (3, 4 y 5), el caso borde principal de mora.
  const unidad2B = await upsertUnidad({
    FK_proyecto: idTorreNogal,
    identificador: '2-B',
    tipologia: TipologiaUnidad.DOS_DORMITORIOS,
    superficie_cubierta: 62.3,
    superficie_descubierta: 8.5,
    piso: '2',
    costo: 16_000_000,
  });
  await upsertImagen(
    unidad2B.id_unidad_funcional,
    'https://cdn.axontech.test/unidades/2-b.jpg',
  );
  const publicacion2B = await upsertPublicacion({
    FK_unidad_funcional: unidad2B.id_unidad_funcional,
    estado_comercial: EstadoComercial.EN_PLAN_DE_PAGO,
    fecha_publicacion: mesesDesdeHoy(-7),
    precio_lista: 20_000_000,
    porcentaje_ganancia: 25,
  });
  await upsertPlan({
    FK_publicacion: publicacion2B.id_publicacion,
    nombre: 'Anticipo 50 % + 12 cuotas',
    anticipo_porcentaje: 50,
    FK_plazo_financiacion: plazo(12),
  });
  await venderUnidad({
    FK_cliente: idValentina,
    FK_publicacion: publicacion2B.id_publicacion,
    fecha_venta: diasDesdeHoy(-170),
    precio: 20_000_000,
    modalidad: ModalidadPago.FINANCIADO,
    anticipo_porcentaje: 50,
    plazo: plazoVenta(12),
    pagos: [
      // Anticipo de 10.000.000 en dos cobros: transferencia y el resto en efectivo.
      transferencia(0, 'TRF-2B-0', 6_000_000),
      efectivo(0),
      // Una transferencia que el banco rechazó: el cobro quedó anulado.
      {
        ...transferencia(1, 'TRF-2B-1-RECHAZADA'),
        anulado: { motivo: 'El banco rechazó la transferencia' },
      },
      transferencia(1, 'TRF-2B-1'),
      transferencia(2, 'TRF-2B-2'),
      efectivo(3, 500_000),
    ],
  });

  // 3-C: EN_PLAN_DE_PAGO y al día, vendida a Rodrigo Acosta con el plazo de
  // 24 cuotas (TNA 36 %). Pagó todo lo que venció; la cuota 3 vence a futuro.
  const unidad3C = await upsertUnidad({
    FK_proyecto: idTorreNogal,
    identificador: '3-C',
    tipologia: TipologiaUnidad.TRES_DORMITORIOS,
    superficie_cubierta: 84.5,
    superficie_descubierta: 10,
    piso: '3',
    costo: 30_000_000,
  });
  await upsertImagen(
    unidad3C.id_unidad_funcional,
    'https://cdn.axontech.test/unidades/3-c.jpg',
  );
  const publicacion3C = await upsertPublicacion({
    FK_unidad_funcional: unidad3C.id_unidad_funcional,
    estado_comercial: EstadoComercial.EN_PLAN_DE_PAGO,
    fecha_publicacion: mesesDesdeHoy(-4),
    precio_lista: 40_000_000,
    porcentaje_ganancia: 33.33,
  });
  await upsertPlan({
    FK_publicacion: publicacion3C.id_publicacion,
    nombre: 'Anticipo 30 % + 24 cuotas',
    anticipo_porcentaje: 30,
    FK_plazo_financiacion: plazo(24),
  });
  await venderUnidad({
    FK_cliente: idRodrigo,
    FK_publicacion: publicacion3C.id_publicacion,
    fecha_venta: diasDesdeHoy(-65),
    precio: 40_000_000,
    modalidad: ModalidadPago.FINANCIADO,
    anticipo_porcentaje: 30,
    plazo: plazoVenta(24),
    pagos: pagosHasta(2, 'TRF-3C'),
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
    fecha_publicacion: mesesDesdeHoy(-4),
    precio_lista: 52_000_000,
    porcentaje_ganancia: 23.81,
  });
  // El plan de ejemplo que se ofrecía antes de venderla; se vendió de
  // contado, al precio de lista.
  await upsertPlan({
    FK_publicacion: publicacionLoteOcho.id_publicacion,
    nombre: 'Anticipo 30 % + 12 cuotas',
    anticipo_porcentaje: 30,
    FK_plazo_financiacion: plazo(12),
  });
  await venderUnidad({
    FK_cliente: idEmiliano,
    FK_publicacion: publicacionLoteOcho.id_publicacion,
    fecha_venta: diasDesdeHoy(-60),
    precio: 52_000_000,
    modalidad: ModalidadPago.CONTADO,
    pagos: [transferencia(0, 'TRF-LOTE08')],
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
    fecha_publicacion: mesesDesdeHoy(-5),
    precio_lista: 10_000_000,
    porcentaje_ganancia: 25,
    vigente: false,
    fecha_despublicacion: mesesDesdeHoy(-3),
    motivo_despublicacion:
      'Local retirado temporalmente del catálogo por refacción de la fachada',
  });

  // --------------------------------------------------------------------
  // 8 proyectos restantes — 3 UNIDADFUNCIONAL cada uno (24 en total), con
  // publicación y venta según el estado del proyecto (regla simple para no
  // tener que escribir 24 bloques a mano).
  // --------------------------------------------------------------------

  /** EN_EJECUCION: U1 y U2 publicadas DISPONIBLE (35% de margen) con un plan de ejemplo, U3 sin publicar. */
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

      const precio = Math.round(costo * 1.35);
      const publicacion = await upsertPublicacion({
        FK_unidad_funcional: unidad.id_unidad_funcional,
        estado_comercial: EstadoComercial.DISPONIBLE,
        fecha_publicacion: mesesDesdeHoy(-4),
        precio_lista: precio,
        porcentaje_ganancia: 35,
      });
      await upsertPlan({
        FK_publicacion: publicacion.id_publicacion,
        nombre: 'Anticipo 30 % + 12 cuotas',
        anticipo_porcentaje: 30,
        FK_plazo_financiacion: plazo(12),
      });
    }
  }

  /** Cómo se vendió cada unidad de un proyecto finalizado. */
  interface VentaFinalizadaSeed {
    FK_cliente: number;
    fecha_venta: Date;
    /** Sin financiación, es de contado. */
    financiacion?: { anticipo_porcentaje: number; cantidad_cuotas: number };
  }

  /**
   * FINALIZADO: las 3 unidades publicadas VENDIDA (30% de margen), con la
   * venta totalmente pagada: cada cuota tiene su cobro, así los ingresos de
   * esos meses aparecen en el tablero. Los clientes se asignan explícitamente
   * para poder sembrar a propósito el caso de "cliente con 2+ unidades"
   * (Valentina Roldán).
   */
  async function sembrarProyectoFinalizado(
    codigo: string,
    fechaPublicacion: Date,
    ventas: [VentaFinalizadaSeed, VentaFinalizadaSeed, VentaFinalizadaSeed],
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
      const precio = Math.round(costo * 1.3);
      const publicacion = await upsertPublicacion({
        FK_unidad_funcional: unidad.id_unidad_funcional,
        estado_comercial: EstadoComercial.VENDIDA,
        fecha_publicacion: fechaPublicacion,
        precio_lista: precio,
        porcentaje_ganancia: 30,
      });

      // El plan de ejemplo que se ofrecía: el de la financiación con la que
      // se vendió o, si fue de contado, uno de 30 % + 12 cuotas.
      const venta = ventas[indice];
      const { anticipo_porcentaje, cantidad_cuotas } = venta.financiacion ?? {
        anticipo_porcentaje: 30,
        cantidad_cuotas: 12,
      };
      const plazoPlan = plazoVenta(cantidad_cuotas);
      await upsertPlan({
        FK_publicacion: publicacion.id_publicacion,
        nombre: `Anticipo ${anticipo_porcentaje} % + ${cantidad_cuotas} cuotas${plazoPlan.tasa_nominal_anual === 0 ? ' sin interés' : ''}`,
        anticipo_porcentaje,
        FK_plazo_financiacion: plazoPlan.id_plazo_financiacion,
      });

      const referencia = `TRF-${codigo.slice(5)}-${identificador}`;
      await venderUnidad({
        FK_cliente: venta.FK_cliente,
        FK_publicacion: publicacion.id_publicacion,
        fecha_venta: venta.fecha_venta,
        precio,
        ...(venta.financiacion
          ? {
              modalidad: ModalidadPago.FINANCIADO,
              anticipo_porcentaje,
              plazo: plazoPlan,
              pagos: pagosHasta(cantidad_cuotas, referencia),
            }
          : {
              modalidad: ModalidadPago.CONTADO,
              pagos: [transferencia(0, referencia)],
            }),
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

  // Barrio La Merced: todo de contado. U1 -> Valentina (su 2da unidad, en
  // otro proyecto: siembra a propósito el caso "cliente con 2+ unidades" de
  // HU-28).
  await sembrarProyectoFinalizado('PROY-BLM', mesesDesdeHoy(-10), [
    { FK_cliente: idValentina, fecha_venta: mesesDesdeHoy(-9) },
    { FK_cliente: idBraian, fecha_venta: mesesDesdeHoy(-8) },
    { FK_cliente: idBraian, fecha_venta: mesesDesdeHoy(-7) },
  ]);
  // Residencial Costanera: dos ventas financiadas ya canceladas (una sin
  // interés y otra con el plazo de 6 cuotas) y una de contado.
  await sembrarProyectoFinalizado('PROY-RCT', mesesDesdeHoy(-9), [
    {
      FK_cliente: idMicaela,
      fecha_venta: mesesDesdeHoy(-5),
      financiacion: { anticipo_porcentaje: 40, cantidad_cuotas: 3 },
    },
    { FK_cliente: idMicaela, fecha_venta: mesesDesdeHoy(-4) },
    {
      FK_cliente: idRodrigo,
      fecha_venta: mesesDesdeHoy(-8),
      financiacion: { anticipo_porcentaje: 30, cantidad_cuotas: 6 },
    },
  ]);

  await sembrarProyectoSinPublicar('PROY-PSJ');
  await sembrarProyectoSinPublicar('PROY-VNT');
  await sembrarProyectoSinPublicar('PROY-MRP');

  // --------------------------------------------------------------------
  // DECLARACIONPAGO — lo que declaran los clientes desde el portal (HU-29),
  // en los tres estados, cada una con su comprobante PDF en el bucket.
  // --------------------------------------------------------------------
  const declarar = (
    datos: Omit<Parameters<typeof sembrarDeclaracion>[1], 'FK_forma_pago'>,
  ) =>
    sembrarDeclaracion(
      prisma,
      { ...datos, FK_forma_pago: idTransferencia },
      idAdministrador,
    );

  // Valentina, sobre 2-B: Tesorería le validó un pago a cuenta de la cuota 4
  // (sigue Parcial y vencida: 2-B mantiene sus 3 cuotas vencidas con saldo),
  // le rechazó una transferencia de la cuota 5 y la volvió a declarar.
  await declarar({
    FK_cliente: idValentina,
    FK_publicacion: publicacion2B.id_publicacion,
    numero_cuota: 4,
    importe: 300_000,
    numero_referencia: 'TRF-2B-4-WEB',
    fecha_declaracion: diasDesdeHoy(-12),
    resolucion: {
      estado: EstadoDeclaracionPago.VALIDADA,
      fecha: diasDesdeHoy(-10),
    },
  });
  await declarar({
    FK_cliente: idValentina,
    FK_publicacion: publicacion2B.id_publicacion,
    numero_cuota: 5,
    numero_referencia: 'TRF-2B-5-WEB-A',
    fecha_declaracion: diasDesdeHoy(-9),
    resolucion: {
      estado: EstadoDeclaracionPago.RECHAZADA,
      fecha: diasDesdeHoy(-7),
      motivo: 'La transferencia no figura en el extracto bancario',
    },
  });
  await declarar({
    FK_cliente: idValentina,
    FK_publicacion: publicacion2B.id_publicacion,
    numero_cuota: 5,
    numero_referencia: 'TRF-2B-5-WEB-B',
    fecha_declaracion: diasDesdeHoy(-2),
  });
  // Rodrigo, sobre 3-C: adelantó la cuota 3, que todavía no venció.
  await declarar({
    FK_cliente: idRodrigo,
    FK_publicacion: publicacion3C.id_publicacion,
    numero_cuota: 3,
    numero_referencia: 'TRF-3C-3-WEB',
    fecha_declaracion: diasDesdeHoy(-1),
  });

  console.log(
    'Seed comercialización - UNIDADFUNCIONAL/PUBLICACIONUNIDAD/VENTA/PLANPAGO/CUOTA/COBRO/DECLARACIONPAGO: listo (6 hero + 24 extra unidades).',
  );
}

// Corrido suelto (`npm run seed:...`); desde `seed-prueba.ts` solo se importa.
if (require.main === module) ejecutarSeed(sembrarComercializacion);
