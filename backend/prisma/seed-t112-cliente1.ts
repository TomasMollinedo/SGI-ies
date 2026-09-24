import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import {
  EstadoCobro,
  EstadoComercial,
  EstadoCuota,
  EstadoProyecto,
  EstadoVenta,
  OrigenCobro,
  Periodicidad,
  TipologiaUnidad,
  TipoPlanPago,
} from '../generated/prisma/enums';
import { RolNombre } from '../src/common/enums/rol.enum';

/**
 * Seed de prueba PUNTUAL para T112 (HU-28, "Perfil del cliente: plan
 * asignado e historial de pagos"), sobre el `CLIENTE` real de id 1 que ya
 * está registrado (login de Google hecho a mano) — no se toca
 * `seed-comercializacion.ts` a propósito, este script es aparte y solo
 * agrega lo que hace falta para poder abrir /mi-perfil/compras con datos
 * reales de ese cliente puntual.
 *
 * Necesita que ya haya corrido `prisma/seed.ts` (usuarios de rol Responsable
 * de Proyectos/Comercialización y las FORMAPAGO "Efectivo"/"Transferencia
 * bancaria"). Es idempotente (upsert por `codigo`/`identificador`, y
 * `findFirst` antes de crear VENTA/COBRO): correr
 *   npx tsx prisma/seed-t112-cliente1.ts
 * las veces que haga falta no duplica nada. Si el cliente 1 no existe
 * todavía, iniciá sesión una vez en el sitio público con esa cuenta de
 * Google antes de correr este script.
 *
 * Arma 2 unidades para el cliente 1, pensadas para ejercitar los 3
 * endpoints de T112 y los estados de la pantalla:
 *
 * - A-101 (FINANCIADO, 6 cuotas): anticipo y cuota 1 PAGADAS (cada una en
 *   varios pagos parciales, a propósito, para juntar más de 10 registros de
 *   historial y poder probar la página 2 — el endpoint pagina de a 10 por
 *   default); cuota 2 PARCIAL y vencida (incluye un cobro ANULADO sobre esa
 *   misma cuota, para probar que se lista con su estado pero no descuenta
 *   saldo); cuota 3 PARCIAL y vencida (pagada en parte por el "cobro mixto",
 *   ver abajo); cuota 4 PENDIENTE y vencida, sin ningún pago (para el
 *   resaltado + días de atraso); cuota 5 PENDIENTE a futuro, de contraste.
 * - B-201 (FINANCIADO, 3 cuotas): anticipo PAGADO por el mismo "cobro
 *   mixto"; el resto PENDIENTE, con vencimiento a futuro — no tiene ninguna
 *   cuota vencida, para contrastar con A-101.
 * - El "cobro mixto" es un único COBRO cuyas líneas (DETALLECOBRO) imputan a
 *   una cuota de A-101 Y a una de B-201 en la misma operación: es el caso
 *   explícito de la HU ("un cobro que imputó a cuotas de dos unidades
 *   aparece partido en cada sección") — al pedir el historial de A-101 debe
 *   aparecer con el subtotal de A-101 únicamente, y al pedir el de B-201,
 *   con el subtotal de B-201 únicamente, nunca con el importe_total completo.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ID_CLIENTE_PRUEBA = 1;

/**
 * Suma/resta días a "hoy" en UTC — no hace falta precisión de calendario para
 * datos de prueba. Da la medianoche UTC: sirve para las fechas que la API
 * también guarda así (`fecha_vencimiento` de las cuotas, que arma
 * `motor-cuotas.ts` con `Date.UTC`). Para las que el panel muestra en horario
 * de Argentina, ver `fechaArgentinaDesdeHoy`.
 */
function diasDesdeHoy(dias: number): Date {
  const hoy = new Date();
  return new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + dias),
  );
}

/**
 * Offset fijo de Argentina (UTC-3, sin horario de verano), el mismo que usa
 * `fechaIsoSchema` (src/common/validaciones/fecha-iso.schema.ts).
 */
const OFFSET_ARGENTINA_HORAS = 3;

/**
 * Fecha a `dias` de hoy, anclada a la medianoche de Argentina (03:00Z) — lo
 * mismo que guarda la API para una fecha sola (`fechaIsoSchema`, ej. la
 * `fecha_cobro` de un cobro registrado desde la pantalla). Se usa para las
 * fechas que el frontend muestra en horario de Argentina (`formatearFecha`):
 * `fecha_cobro`, `fecha_adhesion` y `fecha_publicacion`. Con `diasDesdeHoy`
 * (medianoche UTC) esas se verían un día antes, porque la medianoche UTC es
 * las 21:00 del día anterior en Argentina. "Hoy" también se toma en horario
 * de Argentina, no en UTC.
 */
function fechaArgentinaDesdeHoy(dias: number): Date {
  const ahoraEnArgentina = new Date(
    Date.now() - OFFSET_ARGENTINA_HORAS * 60 * 60 * 1000,
  );
  return new Date(
    Date.UTC(
      ahoraEnArgentina.getUTCFullYear(),
      ahoraEnArgentina.getUTCMonth(),
      ahoraEnArgentina.getUTCDate() + dias,
      OFFSET_ARGENTINA_HORAS,
    ),
  );
}

async function main() {
  const cliente = await prisma.cLIENTE.findUnique({
    where: { id_cliente: ID_CLIENTE_PRUEBA },
  });
  if (!cliente) {
    throw new Error(
      `No existe CLIENTE con id ${ID_CLIENTE_PRUEBA}. Iniciá sesión una vez con Google en el sitio público antes de correr este seed.`,
    );
  }

  // HU-29 exige dni_cuil/teléfono completos antes de declarar un pago, y
  // ClienteProtectedRoute (requiereDatosCompletos) los exige para entrar a
  // /mi-perfil: se completan acá solo si todavía están en null, sin pisar lo
  // que el cliente ya haya cargado por su cuenta.
  if (cliente.dni_cuil === null || cliente.telefono === null) {
    await prisma.cLIENTE.update({
      where: { id_cliente: ID_CLIENTE_PRUEBA },
      data: {
        dni_cuil: cliente.dni_cuil ?? '20111222339',
        telefono: cliente.telefono ?? '3874001122',
      },
    });
    console.log(
      `Seed T112 - CLIENTE ${ID_CLIENTE_PRUEBA}: completé dni_cuil/teléfono faltantes.`,
    );
  }

  const responsableProyectos = await prisma.uSUARIO.findFirstOrThrow({
    where: { rol: { nombre: RolNombre.RESPONSABLE_PROYECTOS } },
    select: { id_usuario: true },
  });
  const responsableComercializacion = await prisma.uSUARIO.findFirstOrThrow({
    where: { rol: { nombre: RolNombre.RESPONSABLE_COMERCIALIZACION } },
    select: { id_usuario: true },
  });
  const efectivo = await prisma.fORMAPAGO.findFirstOrThrow({
    where: { nombre: 'Efectivo' },
    select: { id_forma_pago: true },
  });
  const transferencia = await prisma.fORMAPAGO.findFirstOrThrow({
    where: { nombre: 'Transferencia bancaria' },
    select: { id_forma_pago: true },
  });

  // ------------------------------------------------------------------
  // PROYECTO propio de este seed (codigo único, no pisa nada de
  // seed-comercializacion.ts).
  // ------------------------------------------------------------------
  const proyecto = await prisma.pROYECTO.upsert({
    where: { codigo: 'PROY-T112-DEMO' },
    update: {},
    create: {
      codigo: 'PROY-T112-DEMO',
      nombre: 'Residencial Prueba T112',
      localidad: 'Salta capital, Salta',
      direccion: 'Av. Belgrano 2400',
      estado: EstadoProyecto.EN_EJECUCION,
      fecha_fin_estimada: diasDesdeHoy(240),
      cantidad_unidades_planificadas: 2,
      FK_usuario_creador: responsableProyectos.id_usuario,
      FK_usuario_actualizador: responsableProyectos.id_usuario,
    },
  });

  /** Idempotente por (FK_proyecto, identificador), mismo criterio que seed-comercializacion.ts. */
  async function upsertUnidad(datos: {
    identificador: string;
    tipologia: TipologiaUnidad;
    superficie_cubierta: number;
    piso: string;
    costo: number;
  }) {
    const existente = await prisma.uNIDADFUNCIONAL.findFirst({
      where: {
        FK_proyecto: proyecto.id_proyecto,
        identificador: datos.identificador,
      },
    });
    if (existente) return existente;

    return prisma.uNIDADFUNCIONAL.create({
      data: {
        ...datos,
        FK_proyecto: proyecto.id_proyecto,
        FK_usuario_creador: responsableProyectos.id_usuario,
        FK_usuario_actualizador: responsableProyectos.id_usuario,
      },
    });
  }

  /** Idempotente por FK_unidad_funcional (una sola publicación por unidad en este seed). */
  async function upsertPublicacion(
    idUnidad: number,
    estadoComercial: EstadoComercial,
  ) {
    const existente = await prisma.pUBLICACIONUNIDAD.findFirst({
      where: { FK_unidad_funcional: idUnidad },
    });
    if (existente) return existente;

    return prisma.pUBLICACIONUNIDAD.create({
      data: {
        FK_unidad_funcional: idUnidad,
        estado_comercial: estadoComercial,
        fecha_publicacion: fechaArgentinaDesdeHoy(-160),
        FK_usuario_creador: responsableComercializacion.id_usuario,
        FK_usuario_actualizador: responsableComercializacion.id_usuario,
      },
    });
  }

  /** Idempotente por (FK_publicacion, nombre). */
  async function upsertPlan(datos: {
    FK_publicacion: number;
    nombre: string;
    precio: number;
    anticipo_porcentaje: number;
    cantidad_cuotas: number;
  }) {
    const existente = await prisma.pLANPAGO.findFirst({
      where: { FK_publicacion: datos.FK_publicacion, nombre: datos.nombre },
    });
    if (existente) return existente;

    return prisma.pLANPAGO.create({
      data: {
        FK_publicacion: datos.FK_publicacion,
        nombre: datos.nombre,
        tipo: TipoPlanPago.FINANCIADO,
        precio: datos.precio,
        porcentaje_ganancia: 0,
        margen: 0,
        anticipo_porcentaje: datos.anticipo_porcentaje,
        cantidad_cuotas: datos.cantidad_cuotas,
        periodicidad: Periodicidad.MENSUAL,
        FK_usuario_creador: responsableComercializacion.id_usuario,
        FK_usuario_actualizador: responsableComercializacion.id_usuario,
      },
    });
  }

  /** Idempotente por FK_publicacion (una sola venta vigente por publicación en este seed). */
  async function upsertVenta(datos: {
    FK_publicacion: number;
    FK_plan_pago: number;
    fecha_adhesion: Date;
    precio_congelado: number;
    anticipo_congelado: number;
    cantidad_cuotas_congelada: number;
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
      include: { cuotas: { orderBy: { numero: 'asc' } } },
    });
    if (existente) return existente;

    const venta = await prisma.vENTA.create({
      data: {
        FK_cliente: ID_CLIENTE_PRUEBA,
        FK_publicacion: datos.FK_publicacion,
        FK_plan_pago: datos.FK_plan_pago,
        fecha_adhesion: datos.fecha_adhesion,
        precio_congelado: datos.precio_congelado,
        anticipo_congelado: datos.anticipo_congelado,
        tipo_plan_congelado: TipoPlanPago.FINANCIADO,
        cantidad_cuotas_congelada: datos.cantidad_cuotas_congelada,
        periodicidad_congelada: Periodicidad.MENSUAL,
        estado: EstadoVenta.VIGENTE,
        FK_usuario_creador: responsableComercializacion.id_usuario,
        cuotas: { create: datos.cuotas },
      },
      include: { cuotas: { orderBy: { numero: 'asc' } } },
    });
    return venta;
  }

  /** Cobro con una sola línea de imputación (el caso normal, no partido). */
  async function crearCobroSimple(datos: {
    fecha_cobro: Date;
    origen: OrigenCobro;
    estado: EstadoCobro;
    FK_forma_pago: number;
    numero_referencia: string | null;
    FK_cuota: number;
    importe_imputado: number;
    saldo_anterior: number;
    saldo_posterior: number;
  }) {
    return prisma.cOBRO.create({
      data: {
        fecha_cobro: datos.fecha_cobro,
        FK_cliente: ID_CLIENTE_PRUEBA,
        FK_forma_pago: datos.FK_forma_pago,
        numero_referencia: datos.numero_referencia,
        importe_total: datos.importe_imputado,
        origen: datos.origen,
        estado: datos.estado,
        FK_usuario_creador: responsableComercializacion.id_usuario,
        FK_usuario_actualizador: responsableComercializacion.id_usuario,
        detalles: {
          create: {
            FK_cuota: datos.FK_cuota,
            importe_imputado: datos.importe_imputado,
            saldo_anterior: datos.saldo_anterior,
            saldo_posterior: datos.saldo_posterior,
          },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // A-101 — FINANCIADO 6 cuotas (anticipo + 5). Precio 24.000.000, anticipo
  // 20% = 4.800.000, resto 19.200.000 / 5 = 3.840.000 por cuota.
  // ------------------------------------------------------------------
  const unidadA = await upsertUnidad({
    identificador: 'A-101',
    tipologia: TipologiaUnidad.DOS_DORMITORIOS,
    superficie_cubierta: 58,
    piso: '1',
    costo: 18_000_000,
  });
  const publicacionA = await upsertPublicacion(
    unidadA.id_unidad_funcional,
    EstadoComercial.EN_PLAN_DE_PAGO,
  );
  const planA = await upsertPlan({
    FK_publicacion: publicacionA.id_publicacion,
    nombre: 'Financiado 5 cuotas A-101',
    precio: 24_000_000,
    anticipo_porcentaje: 20,
    cantidad_cuotas: 5,
  });

  const fechaAdhesionA = fechaArgentinaDesdeHoy(-140);
  const ventaA = await upsertVenta({
    FK_publicacion: publicacionA.id_publicacion,
    FK_plan_pago: planA.id_plan_pago,
    fecha_adhesion: fechaAdhesionA,
    precio_congelado: 24_000_000,
    anticipo_congelado: 4_800_000,
    cantidad_cuotas_congelada: 5,
    cuotas: [
      {
        numero: 0,
        importe: 4_800_000,
        fecha_vencimiento: diasDesdeHoy(-140),
        saldo_pendiente: 0,
        estado: EstadoCuota.PAGADA,
      },
      {
        numero: 1,
        importe: 3_840_000,
        fecha_vencimiento: diasDesdeHoy(-110),
        saldo_pendiente: 0,
        estado: EstadoCuota.PAGADA,
      },
      {
        numero: 2,
        importe: 3_840_000,
        fecha_vencimiento: diasDesdeHoy(-80),
        saldo_pendiente: 1_840_000, // vencida, con un cobro ANULADO de por medio (ver más abajo)
        estado: EstadoCuota.PARCIAL,
      },
      {
        numero: 3,
        importe: 3_840_000,
        fecha_vencimiento: diasDesdeHoy(-50),
        saldo_pendiente: 2_840_000, // vencida, pagada en parte por el "cobro mixto"
        estado: EstadoCuota.PARCIAL,
      },
      {
        numero: 4,
        importe: 3_840_000,
        fecha_vencimiento: diasDesdeHoy(-20),
        saldo_pendiente: 3_840_000, // vencida, sin ningún pago
        estado: EstadoCuota.PENDIENTE,
      },
      {
        numero: 5,
        importe: 3_840_000,
        fecha_vencimiento: diasDesdeHoy(10), // a futuro: contraste, no vencida
        saldo_pendiente: 3_840_000,
        estado: EstadoCuota.PENDIENTE,
      },
    ],
  });
  const cuotaAPorNumero = new Map(ventaA.cuotas.map((c) => [c.numero, c]));

  // ------------------------------------------------------------------
  // B-201 — FINANCIADO 3 cuotas. Precio 12.000.000, anticipo 25% =
  // 3.000.000, resto 9.000.000 / 3 = 3.000.000 por cuota. Ninguna cuota
  // vencida: contraste con A-101.
  // ------------------------------------------------------------------
  const unidadB = await upsertUnidad({
    identificador: 'B-201',
    tipologia: TipologiaUnidad.UN_DORMITORIO,
    superficie_cubierta: 42,
    piso: '2',
    costo: 12_000_000,
  });
  const publicacionB = await upsertPublicacion(
    unidadB.id_unidad_funcional,
    EstadoComercial.EN_PLAN_DE_PAGO,
  );
  const planB = await upsertPlan({
    FK_publicacion: publicacionB.id_publicacion,
    nombre: 'Financiado 3 cuotas B-201',
    precio: 12_000_000,
    anticipo_porcentaje: 25,
    cantidad_cuotas: 3,
  });

  const fechaAdhesionB = fechaArgentinaDesdeHoy(-25);
  const ventaB = await upsertVenta({
    FK_publicacion: publicacionB.id_publicacion,
    FK_plan_pago: planB.id_plan_pago,
    fecha_adhesion: fechaAdhesionB,
    precio_congelado: 12_000_000,
    anticipo_congelado: 3_000_000,
    cantidad_cuotas_congelada: 3,
    cuotas: [
      {
        numero: 0,
        importe: 3_000_000,
        fecha_vencimiento: diasDesdeHoy(-25),
        saldo_pendiente: 0, // pagado íntegro por el "cobro mixto"
        estado: EstadoCuota.PAGADA,
      },
      {
        numero: 1,
        importe: 3_000_000,
        fecha_vencimiento: diasDesdeHoy(5), // a futuro: no vencida
        saldo_pendiente: 3_000_000,
        estado: EstadoCuota.PENDIENTE,
      },
      {
        numero: 2,
        importe: 3_000_000,
        fecha_vencimiento: diasDesdeHoy(35), // a futuro: no vencida
        saldo_pendiente: 3_000_000,
        estado: EstadoCuota.PENDIENTE,
      },
    ],
  });
  const cuotaBPorNumero = new Map(ventaB.cuotas.map((c) => [c.numero, c]));

  // ------------------------------------------------------------------
  // Historial de pagos. Si ya existe al menos un cobro sobre la cuota 0 de
  // A-101, se asume que este bloque ya corrió antes (idempotencia simple,
  // igual criterio que upsertVenta: sin borrar nada, no se vuelve a crear).
  // ------------------------------------------------------------------
  const yaTieneCobros = await prisma.dETALLECOBRO.findFirst({
    where: { FK_cuota: cuotaAPorNumero.get(0)!.id_cuota },
  });

  if (!yaTieneCobros) {
    // Cuota 0 de A-101 (4.800.000), pagada en 3 partes.
    await crearCobroSimple({
      fecha_cobro: fechaArgentinaDesdeHoy(-140),
      origen: OrigenCobro.ECOMMERCE,
      estado: EstadoCobro.CONFIRMADO,
      FK_forma_pago: transferencia.id_forma_pago,
      numero_referencia: 'TR-A101-001',
      FK_cuota: cuotaAPorNumero.get(0)!.id_cuota,
      importe_imputado: 2_000_000,
      saldo_anterior: 4_800_000,
      saldo_posterior: 2_800_000,
    });
    await crearCobroSimple({
      fecha_cobro: fechaArgentinaDesdeHoy(-135),
      origen: OrigenCobro.PRESENCIAL,
      estado: EstadoCobro.CONFIRMADO,
      FK_forma_pago: efectivo.id_forma_pago,
      numero_referencia: null,
      FK_cuota: cuotaAPorNumero.get(0)!.id_cuota,
      importe_imputado: 1_800_000,
      saldo_anterior: 2_800_000,
      saldo_posterior: 1_000_000,
    });
    await crearCobroSimple({
      fecha_cobro: fechaArgentinaDesdeHoy(-130),
      origen: OrigenCobro.ECOMMERCE,
      estado: EstadoCobro.CONFIRMADO,
      FK_forma_pago: transferencia.id_forma_pago,
      numero_referencia: 'TR-A101-002',
      FK_cuota: cuotaAPorNumero.get(0)!.id_cuota,
      importe_imputado: 1_000_000,
      saldo_anterior: 1_000_000,
      saldo_posterior: 0,
    });

    // Cuota 1 de A-101 (3.840.000), pagada en 3 partes.
    await crearCobroSimple({
      fecha_cobro: fechaArgentinaDesdeHoy(-112),
      origen: OrigenCobro.ECOMMERCE,
      estado: EstadoCobro.CONFIRMADO,
      FK_forma_pago: transferencia.id_forma_pago,
      numero_referencia: 'TR-A101-003',
      FK_cuota: cuotaAPorNumero.get(1)!.id_cuota,
      importe_imputado: 2_000_000,
      saldo_anterior: 3_840_000,
      saldo_posterior: 1_840_000,
    });
    await crearCobroSimple({
      fecha_cobro: fechaArgentinaDesdeHoy(-108),
      origen: OrigenCobro.ECOMMERCE,
      estado: EstadoCobro.CONFIRMADO,
      FK_forma_pago: transferencia.id_forma_pago,
      numero_referencia: 'TR-A101-004',
      FK_cuota: cuotaAPorNumero.get(1)!.id_cuota,
      importe_imputado: 1_000_000,
      saldo_anterior: 1_840_000,
      saldo_posterior: 840_000,
    });
    await crearCobroSimple({
      fecha_cobro: fechaArgentinaDesdeHoy(-100),
      origen: OrigenCobro.PRESENCIAL,
      estado: EstadoCobro.CONFIRMADO,
      FK_forma_pago: efectivo.id_forma_pago,
      numero_referencia: null,
      FK_cuota: cuotaAPorNumero.get(1)!.id_cuota,
      importe_imputado: 840_000,
      saldo_anterior: 840_000,
      saldo_posterior: 0,
    });

    // Cuota 2 de A-101: 4 pagos parciales confirmados (2.000.000 de
    // 3.840.000) + 1 cobro ANULADO que nunca llegó a descontar saldo.
    await crearCobroSimple({
      fecha_cobro: fechaArgentinaDesdeHoy(-82),
      origen: OrigenCobro.ECOMMERCE,
      estado: EstadoCobro.CONFIRMADO,
      FK_forma_pago: transferencia.id_forma_pago,
      numero_referencia: 'TR-A101-005',
      FK_cuota: cuotaAPorNumero.get(2)!.id_cuota,
      importe_imputado: 500_000,
      saldo_anterior: 3_840_000,
      saldo_posterior: 3_340_000,
    });
    await crearCobroSimple({
      fecha_cobro: fechaArgentinaDesdeHoy(-70),
      origen: OrigenCobro.ECOMMERCE,
      estado: EstadoCobro.CONFIRMADO,
      FK_forma_pago: transferencia.id_forma_pago,
      numero_referencia: 'TR-A101-006',
      FK_cuota: cuotaAPorNumero.get(2)!.id_cuota,
      importe_imputado: 500_000,
      saldo_anterior: 3_340_000,
      saldo_posterior: 2_840_000,
    });
    await crearCobroSimple({
      fecha_cobro: fechaArgentinaDesdeHoy(-55),
      origen: OrigenCobro.PRESENCIAL,
      estado: EstadoCobro.CONFIRMADO,
      FK_forma_pago: efectivo.id_forma_pago,
      numero_referencia: null,
      FK_cuota: cuotaAPorNumero.get(2)!.id_cuota,
      importe_imputado: 500_000,
      saldo_anterior: 2_840_000,
      saldo_posterior: 2_340_000,
    });
    await crearCobroSimple({
      fecha_cobro: fechaArgentinaDesdeHoy(-40),
      origen: OrigenCobro.ECOMMERCE,
      estado: EstadoCobro.CONFIRMADO,
      FK_forma_pago: transferencia.id_forma_pago,
      numero_referencia: 'TR-A101-007',
      FK_cuota: cuotaAPorNumero.get(2)!.id_cuota,
      importe_imputado: 500_000,
      saldo_anterior: 2_340_000,
      saldo_posterior: 1_840_000,
    });
    // ANULADO: la foto de saldo_anterior/saldo_posterior queda congelada tal
    // como quedó al confirmarse (1.840.000 -> 1.540.000), pero la cuota
    // sigue con saldo_pendiente 1.840.000 — la anulación restituyó lo que
    // este cobro había descontado, exactamente como haría CobroService.anular.
    await crearCobroSimple({
      fecha_cobro: fechaArgentinaDesdeHoy(-38),
      origen: OrigenCobro.ECOMMERCE,
      estado: EstadoCobro.ANULADO,
      FK_forma_pago: transferencia.id_forma_pago,
      numero_referencia: 'TR-A101-008',
      FK_cuota: cuotaAPorNumero.get(2)!.id_cuota,
      importe_imputado: 300_000,
      saldo_anterior: 1_840_000,
      saldo_posterior: 1_540_000,
    });

    // "Cobro mixto": una sola operación que imputa a la cuota 3 de A-101 y a
    // la cuota 0 (anticipo) de B-201 al mismo tiempo — el caso explícito de
    // la HU ("un cobro que imputó a cuotas de dos unidades aparece partido
    // en cada sección"). Se arma con dos DETALLECOBRO sobre un mismo COBRO.
    await prisma.cOBRO.create({
      data: {
        fecha_cobro: fechaArgentinaDesdeHoy(-15),
        FK_cliente: ID_CLIENTE_PRUEBA,
        FK_forma_pago: transferencia.id_forma_pago,
        numero_referencia: 'TR-MIXTO-001',
        importe_total: 4_000_000, // 1.000.000 (A-101) + 3.000.000 (B-201)
        observaciones:
          'Transferencia única que Tesorería imputó a A-101 y B-201 (T112: caso de cobro partido entre unidades)',
        origen: OrigenCobro.PRESENCIAL,
        estado: EstadoCobro.CONFIRMADO,
        FK_usuario_creador: responsableComercializacion.id_usuario,
        FK_usuario_actualizador: responsableComercializacion.id_usuario,
        detalles: {
          create: [
            {
              FK_cuota: cuotaAPorNumero.get(3)!.id_cuota,
              importe_imputado: 1_000_000,
              saldo_anterior: 3_840_000,
              saldo_posterior: 2_840_000,
            },
            {
              FK_cuota: cuotaBPorNumero.get(0)!.id_cuota,
              importe_imputado: 3_000_000,
              saldo_anterior: 3_000_000,
              saldo_posterior: 0,
            },
          ],
        },
      },
    });

    console.log(
      'Seed T112 - COBRO/DETALLECOBRO: 12 cobros sobre A-101 (10 confirmados + 1 anulado + el mixto) y 1 sobre B-201 (el mixto).',
    );
  } else {
    console.log(
      'Seed T112 - COBRO/DETALLECOBRO: ya existían, no se volvieron a crear.',
    );
  }

  console.log(
    `Seed T112 listo. Unidades del CLIENTE ${ID_CLIENTE_PRUEBA}: A-101 (con cuotas vencidas) y B-201 (sin cuotas vencidas).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
