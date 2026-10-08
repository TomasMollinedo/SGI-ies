import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import {
  EstadoComercial,
  EstadoDeclaracionPago,
  EstadoProyecto,
  ModalidadPago,
  OrigenCobro,
  TipologiaUnidad,
} from '../generated/prisma/enums';
import { RolNombre } from '../src/common/enums/rol.enum';
import { sembrarPlazos } from './seed-plazos';
import { sembrarProyecto } from './seed-proyectos';
import { PagoCuotaSeed, registrarCobro, sembrarVenta } from './seed-ventas';
import { sembrarDeclaracion } from './seed-declaraciones';
import { diasDesdeHoy } from './seed-fechas';

/**
 * Seed de prueba PUNTUAL para el perfil del cliente (T112, HU-28 "plan
 * asignado e historial de pagos", y HU-29 "declarar un pago"), sobre un
 * cliente con el que el equipo pueda iniciar sesión con Google: no se toca
 * `seed-comercializacion.ts`, este script es aparte y solo agrega lo que
 * hace falta para abrir /mi-perfil/compras con datos de ese cliente.
 *
 * El cliente se busca por email, `SEED_CLIENTE_EMAIL` (con un valor por
 * defecto). Si no existe, se crea sin `google_sub`, como un cliente
 * provisional: el primer login con Google con ese email lo vincula
 * (`ClienteAuthService` busca por email antes de crear uno nuevo). Para
 * entrar con tu cuenta, poné tu email de Google en `SEED_CLIENTE_EMAIL`.
 *
 * Necesita que ya haya corrido `prisma/seed.ts` (usuarios de rol Responsable
 * de Proyectos/Comercialización/Tesorería y las FORMAPAGO "Efectivo" y
 * "Transferencia bancaria") y MinIO levantado (los comprobantes de las
 * declaraciones se suben al bucket). Es idempotente: correr
 *   npm run seed:t112-cliente1
 * las veces que haga falta no duplica nada.
 *
 * Arma 2 unidades para el cliente, pensadas para ejercitar los endpoints
 * del perfil y los estados de la pantalla. Las ventas las calcula
 * `sembrarVenta` con el sistema francés, y cada pago es un cobro:
 *
 * - A-101 (FINANCIADO, anticipo 20 % + 6 cuotas, TNA 18 %): anticipo y
 *   cuota 1 PAGADAS (cada una en varios pagos, a propósito, para juntar más
 *   de 10 registros de historial y poder probar la página 2 — el endpoint
 *   pagina de a 10 por default); cuota 2 PARCIAL y vencida (con un cobro
 *   ANULADO, que se lista pero no descuenta saldo, y dos pagos que llegaron
 *   por declaraciones validadas); cuota 3 PARCIAL y vencida (pagada en parte
 *   por el "cobro mixto", ver abajo, y con una declaración rechazada); cuota
 *   4 PENDIENTE y vencida, con una declaración pendiente de revisión; cuotas
 *   5 y 6 a futuro, de contraste.
 * - B-201 (FINANCIADO, anticipo 25 % + 3 cuotas sin interés): anticipo
 *   PAGADO por el mismo "cobro mixto"; el resto vence a futuro — no tiene
 *   ninguna cuota vencida, para contrastar con A-101.
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

const EMAIL_CLIENTE_POR_DEFECTO = 'cliente.prueba@axontech.test';

async function main() {
  const email =
    process.env.SEED_CLIENTE_EMAIL?.trim().toLowerCase() ||
    EMAIL_CLIENTE_POR_DEFECTO;

  // HU-29 exige dni_cuil/teléfono completos antes de declarar un pago, y
  // ClienteProtectedRoute (requiereDatosCompletos) los exige para entrar a
  // /mi-perfil: se completan solo si todavía están en null, sin pisar lo que
  // el cliente ya haya cargado por su cuenta.
  const existente = await prisma.cLIENTE.findUnique({ where: { email } });
  const cliente = existente
    ? await prisma.cLIENTE.update({
        where: { id_cliente: existente.id_cliente },
        data: {
          dni_cuil: existente.dni_cuil ?? '20111222339',
          telefono: existente.telefono ?? '3874001122',
        },
      })
    : await prisma.cLIENTE.create({
        data: {
          email,
          nombre: 'Cliente',
          apellido: 'de Prueba',
          dni_cuil: '20111222339',
          telefono: '3874001122',
        },
      });
  const idCliente = cliente.id_cliente;
  console.log(
    `Seed T112 - CLIENTE ${email} (id ${idCliente}): ${existente ? 'ya existía' : 'creado sin cuenta de Google, se vincula en el primer login'}.`,
  );

  const responsableProyectos = await prisma.uSUARIO.findFirstOrThrow({
    where: { rol: { nombre: RolNombre.RESPONSABLE_PROYECTOS } },
    select: { id_usuario: true },
  });
  const responsableComercializacion = await prisma.uSUARIO.findFirstOrThrow({
    where: { rol: { nombre: RolNombre.RESPONSABLE_COMERCIALIZACION } },
    select: { id_usuario: true },
  });
  const responsableTesoreria = await prisma.uSUARIO.findFirstOrThrow({
    where: { rol: { nombre: RolNombre.RESPONSABLE_TESORERIA } },
    select: { id_usuario: true },
  });
  const { id_forma_pago: idEfectivo } = await prisma.fORMAPAGO.findFirstOrThrow(
    { where: { nombre: 'Efectivo' }, select: { id_forma_pago: true } },
  );
  const { id_forma_pago: idTransferencia } =
    await prisma.fORMAPAGO.findFirstOrThrow({
      where: { nombre: 'Transferencia bancaria' },
      select: { id_forma_pago: true },
    });
  // Plazos de financiación (HU-32). Mismo helper que
  // `seed-comercializacion.ts`, así los dos seeds comparten plazos.
  const plazoPorCuotas = await sembrarPlazos(
    prisma,
    responsableComercializacion.id_usuario,
  );
  const plazo = (cantidadCuotas: number) => {
    const encontrado = plazoPorCuotas.get(cantidadCuotas);
    if (encontrado === undefined) {
      throw new Error(`No hay un plazo sembrado de ${cantidadCuotas} cuotas`);
    }
    return encontrado;
  };

  /** Cobro presencial en efectivo. */
  const efectivo = (
    numero_cuota: number,
    importe: number | undefined,
    fecha: Date,
  ): PagoCuotaSeed => ({
    numero_cuota,
    importe,
    fecha,
    origen: OrigenCobro.PRESENCIAL,
    FK_forma_pago: idEfectivo,
    numero_referencia: null,
  });
  /** Cobro presencial por transferencia, con su número de referencia. */
  const transferencia = (
    numero_cuota: number,
    importe: number | undefined,
    fecha: Date,
    numero_referencia: string,
  ): PagoCuotaSeed => ({
    numero_cuota,
    importe,
    fecha,
    origen: OrigenCobro.PRESENCIAL,
    FK_forma_pago: idTransferencia,
    numero_referencia,
  });

  // ------------------------------------------------------------------
  // PROYECTO propio de este seed, con el código que genera el sistema.
  // ------------------------------------------------------------------
  const proyecto = await sembrarProyecto(
    prisma,
    {
      nombre: 'Residencial Prueba T112',
      descripcion: null,
      localidad: 'Salta capital, Salta',
      direccion: 'Av. Belgrano 2400',
      estado_obra: EstadoProyecto.EN_EJECUCION,
      fecha_inicio: '2025-09-01',
      fecha_fin_estimada: '2027-06-01',
      cantidad_unidades_planificadas: 2,
      portada: null,
      imagenes: [],
    },
    responsableProyectos.id_usuario,
  );

  /**
   * Unidad publicada En Plan de Pago con el plan de ejemplo con el que se
   * vendió. Idempotente por (proyecto, identificador), publicación por
   * unidad y plan por (publicación, nombre), mismo criterio que
   * `seed-comercializacion.ts`.
   */
  async function upsertUnidadVendida(datos: {
    identificador: string;
    tipologia: TipologiaUnidad;
    superficie_cubierta: number;
    piso: string;
    costo: number;
    precio_lista: number;
    porcentaje_ganancia: number;
    plan: { nombre: string; anticipo_porcentaje: number; cuotas: number };
  }) {
    const unidad =
      (await prisma.uNIDADFUNCIONAL.findFirst({
        where: {
          FK_proyecto: proyecto.id_proyecto,
          identificador: datos.identificador,
        },
      })) ??
      (await prisma.uNIDADFUNCIONAL.create({
        data: {
          FK_proyecto: proyecto.id_proyecto,
          identificador: datos.identificador,
          tipologia: datos.tipologia,
          superficie_cubierta: datos.superficie_cubierta,
          piso: datos.piso,
          costo: datos.costo,
          FK_usuario_creador: responsableProyectos.id_usuario,
          FK_usuario_actualizador: responsableProyectos.id_usuario,
        },
      }));

    const publicacion =
      (await prisma.pUBLICACIONUNIDAD.findFirst({
        where: { FK_unidad_funcional: unidad.id_unidad_funcional },
      })) ??
      (await prisma.pUBLICACIONUNIDAD.create({
        data: {
          FK_unidad_funcional: unidad.id_unidad_funcional,
          estado_comercial: EstadoComercial.EN_PLAN_DE_PAGO,
          precio_lista: datos.precio_lista,
          porcentaje_ganancia: datos.porcentaje_ganancia,
          fecha_publicacion: diasDesdeHoy(-160),
          FK_usuario_creador: responsableComercializacion.id_usuario,
          FK_usuario_actualizador: responsableComercializacion.id_usuario,
        },
      }));

    const plan =
      (await prisma.pLANEJEMPLO.findFirst({
        where: {
          FK_publicacion: publicacion.id_publicacion,
          nombre: datos.plan.nombre,
        },
      })) ??
      (await prisma.pLANEJEMPLO.create({
        data: {
          FK_publicacion: publicacion.id_publicacion,
          nombre: datos.plan.nombre,
          anticipo_porcentaje: datos.plan.anticipo_porcentaje,
          FK_plazo_financiacion: plazo(datos.plan.cuotas).id_plazo_financiacion,
          FK_usuario_creador: responsableComercializacion.id_usuario,
          FK_usuario_actualizador: responsableComercializacion.id_usuario,
        },
      }));

    return { publicacion, plan };
  }

  // ------------------------------------------------------------------
  // A-101 — anticipo 20 % (4.800.000) + 6 cuotas de 3.370.084,12 (TNA 18 %).
  // Vendida hace 140 días: vencieron el anticipo y las cuotas 1 a 4.
  // ------------------------------------------------------------------
  const unidadA = await upsertUnidadVendida({
    identificador: 'A-101',
    tipologia: TipologiaUnidad.DOS_DORMITORIOS,
    superficie_cubierta: 58,
    piso: '1',
    costo: 18_000_000,
    precio_lista: 24_000_000,
    porcentaje_ganancia: 33.33,
    plan: {
      nombre: 'Anticipo 20 % + 6 cuotas',
      anticipo_porcentaje: 20,
      cuotas: 6,
    },
  });
  await sembrarVenta(
    prisma,
    {
      FK_cliente: idCliente,
      FK_publicacion: unidadA.publicacion.id_publicacion,
      FK_plan_ejemplo: unidadA.plan.id_plan_ejemplo,
      fecha_venta: diasDesdeHoy(-140),
      precio: 24_000_000,
      modalidad: ModalidadPago.FINANCIADO,
      anticipo_porcentaje: 20,
      plazo: plazo(6),
      pagos: [
        // Anticipo, en 3 pagos.
        transferencia(0, 2_000_000, diasDesdeHoy(-140), 'TR-A101-001'),
        efectivo(0, 1_800_000, diasDesdeHoy(-135)),
        transferencia(0, undefined, diasDesdeHoy(-130), 'TR-A101-002'),
        // Cuota 1, en 3 pagos.
        transferencia(1, 2_000_000, diasDesdeHoy(-112), 'TR-A101-003'),
        transferencia(1, 1_000_000, diasDesdeHoy(-108), 'TR-A101-004'),
        efectivo(1, undefined, diasDesdeHoy(-100)),
        // Cuota 2: dos pagos presenciales y uno anulado. Los otros dos
        // llegan por declaraciones validadas (más abajo).
        transferencia(2, 500_000, diasDesdeHoy(-82), 'TR-A101-005'),
        efectivo(2, 500_000, diasDesdeHoy(-70)),
        {
          ...transferencia(2, 300_000, diasDesdeHoy(-60), 'TR-A101-006'),
          anulado: { motivo: 'Transferencia cargada dos veces por error' },
        },
      ],
    },
    responsableComercializacion.id_usuario,
  );

  // ------------------------------------------------------------------
  // B-201 — anticipo 25 % (3.000.000) + 3 cuotas sin interés de 3.000.000.
  // Vendida hace 25 días: solo venció el anticipo, que paga el cobro mixto.
  // ------------------------------------------------------------------
  const unidadB = await upsertUnidadVendida({
    identificador: 'B-201',
    tipologia: TipologiaUnidad.UN_DORMITORIO,
    superficie_cubierta: 42,
    piso: '2',
    costo: 9_600_000,
    precio_lista: 12_000_000,
    porcentaje_ganancia: 25,
    plan: {
      nombre: 'Anticipo 25 % + 3 cuotas sin interés',
      anticipo_porcentaje: 25,
      cuotas: 3,
    },
  });
  await sembrarVenta(
    prisma,
    {
      FK_cliente: idCliente,
      FK_publicacion: unidadB.publicacion.id_publicacion,
      FK_plan_ejemplo: unidadB.plan.id_plan_ejemplo,
      fecha_venta: diasDesdeHoy(-25),
      precio: 12_000_000,
      modalidad: ModalidadPago.FINANCIADO,
      anticipo_porcentaje: 25,
      plazo: plazo(3),
    },
    responsableComercializacion.id_usuario,
  );

  // ------------------------------------------------------------------
  // Declaraciones de pago (HU-29) y cobro mixto, en orden cronológico para
  // que la foto de saldos de cada cobro siga la secuencia real.
  // ------------------------------------------------------------------
  const declarar = (
    datos: Omit<
      Parameters<typeof sembrarDeclaracion>[1],
      'FK_cliente' | 'FK_forma_pago'
    >,
  ) =>
    sembrarDeclaracion(
      prisma,
      { ...datos, FK_cliente: idCliente, FK_forma_pago: idTransferencia },
      responsableTesoreria.id_usuario,
    );

  // Cuota 2 de A-101: dos pagos de 500.000 declarados y validados.
  await declarar({
    FK_publicacion: unidadA.publicacion.id_publicacion,
    numero_cuota: 2,
    importe: 500_000,
    numero_referencia: 'TR-A101-WEB-1',
    fecha_declaracion: diasDesdeHoy(-57),
    resolucion: {
      estado: EstadoDeclaracionPago.VALIDADA,
      fecha: diasDesdeHoy(-55),
    },
  });
  await declarar({
    FK_publicacion: unidadA.publicacion.id_publicacion,
    numero_cuota: 2,
    importe: 500_000,
    numero_referencia: 'TR-A101-WEB-2',
    fecha_declaracion: diasDesdeHoy(-42),
    resolucion: {
      estado: EstadoDeclaracionPago.VALIDADA,
      fecha: diasDesdeHoy(-40),
    },
  });
  // Cuota 3 de A-101: una declaración rechazada.
  await declarar({
    FK_publicacion: unidadA.publicacion.id_publicacion,
    numero_cuota: 3,
    numero_referencia: 'TR-A101-WEB-3',
    fecha_declaracion: diasDesdeHoy(-30),
    resolucion: {
      estado: EstadoDeclaracionPago.RECHAZADA,
      fecha: diasDesdeHoy(-28),
      motivo: 'El comprobante no corresponde a una cuenta de la empresa',
    },
  });

  // "Cobro mixto": una sola transferencia que Tesorería imputó a la cuota 3
  // de A-101 y al anticipo de B-201 al mismo tiempo. Ya corrió si el
  // anticipo de B-201 tiene algún cobro.
  const anticipoB = await prisma.cUOTA.findFirstOrThrow({
    where: {
      numero: 0,
      venta: { FK_publicacion: unidadB.publicacion.id_publicacion },
    },
  });
  const yaTieneMixto = await prisma.dETALLECOBRO.findFirst({
    where: { FK_cuota: anticipoB.id_cuota },
  });
  if (!yaTieneMixto) {
    const cuota3A = await prisma.cUOTA.findFirstOrThrow({
      where: {
        numero: 3,
        venta: { FK_publicacion: unidadA.publicacion.id_publicacion },
      },
    });
    await prisma.$transaction((tx) =>
      registrarCobro(
        tx,
        [{ cuota: cuota3A, importe: 1_000_000 }, { cuota: anticipoB }],
        idCliente,
        {
          fecha: diasDesdeHoy(-15),
          origen: OrigenCobro.PRESENCIAL,
          FK_forma_pago: idTransferencia,
          numero_referencia: 'TR-MIXTO-001',
          observaciones:
            'Transferencia única que Tesorería imputó a A-101 y B-201 (T112: caso de cobro partido entre unidades)',
        },
        responsableTesoreria.id_usuario,
      ),
    );
  }

  // Cuota 4 de A-101 (vencida): una declaración que Tesorería todavía no revisó.
  await declarar({
    FK_publicacion: unidadA.publicacion.id_publicacion,
    numero_cuota: 4,
    numero_referencia: 'TR-A101-WEB-4',
    fecha_declaracion: diasDesdeHoy(-1),
  });

  console.log(
    `Seed T112 listo. Unidades de ${email}: A-101 (con cuotas vencidas, 12 cobros y 4 declaraciones) y B-201 (sin cuotas vencidas).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
