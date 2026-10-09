import { Prisma, PrismaClient } from '../generated/prisma/client';
import { CondicionIVA } from '../generated/prisma/enums';
import { RolNombre } from '../src/common/enums/rol.enum';
import { ejecutarSeed } from './seed-ejecutar';
import { diasDesdeHoy, mesesDesdeHoy } from './seed-fechas';
import { numeroOperacion, numeroRecibo } from './seed-referencias';

/**
 * Seed de prueba para poder probar a mano, contra datos reales:
 * - GET /cuentas-corrientes y GET /cuentas-corrientes/:id/movimientos (HU
 *   cuenta corriente de proveedores).
 * - GET /pagos, GET /pagos/:id, GET /pagos/comprobantes-imputables y POST
 *   /pagos (HU-18, pantalla de emisión T90).
 *
 * Aparte de `prisma/seed.ts` a propósito: ese seed base debe quedar
 * idempotente y mínimo (roles, usuarios, catálogos), sin datos transaccionales
 * de prueba mezclados. Este script no lo reemplaza ni lo modifica — asume que
 * ya corrió (necesita el usuario Administrador y el proveedor "Ferreteria
 * Industrial Rivadavia" que crea `seed.ts`) y agrega encima 5 proveedores +
 * sus comprobantes/pagos, pensados para cubrir en un solo lugar los casos de
 * borde de ambas HU: DEUDOR, A_FAVOR, SIN_SALDO, proveedor dado de baja (sin
 * saldo, como exige la baja), comprobantes vencidos y no vencidos, un comprobante ANULADO y un pago
 * ANULADO (ambos deben quedar afuera del cálculo de saldo).
 *
 * Además, un quinto proveedor (Corralón El Constructor) con una factura
 * pagada por mes: son los egresos del Tablero del Gerente (HU-34). Todas las
 * fechas son relativas a hoy (`seed-fechas.ts`), para que lo vencido siga
 * vencido y los egresos caigan en los últimos meses el día que se corra.
 *
 * No crea ninguna tabla ni lógica nueva: COMPROBANTEPROVEEDOR,
 * DETALLECOMPROBANTE, PAGO y DETALLEPAGO ya existen en el schema. Inserta
 * filas directo con Prisma en el mismo estado que dejarían
 * ComprobanteService.confirmar() / .anular() y PagoService.create() / .anular()
 * si las hubiera llamado un usuario real. Los comprobantes A (Responsables
 * Inscriptos) discriminan 21 % de IVA y los C (monotributistas) no.
 *
 * Es 100% idempotente (buscar-y-crear, nunca borra nada): correr
 *   npm run seed:cuenta-corriente-prueba
 * las veces que haga falta no duplica datos. Para arrancar de datos
 * completamente limpios (recomendado antes de una tanda de pruebas manuales):
 *   npx prisma migrate reset   (borra la base y aplica las migraciones)
 *   npx prisma db seed         (corre seed.ts: desde Prisma 7 el reset no lo corre solo)
 *   npm run seed:cuenta-corriente-prueba   (agrega los datos de este script)
 */

export async function sembrarCuentaCorrientePrueba(prisma: PrismaClient) {
  const admin = await prisma.uSUARIO.findFirstOrThrow({
    where: { rol: { nombre: RolNombre.ADMINISTRADOR } },
    select: { id_usuario: true },
  });
  const auditoria = {
    FK_usuario_creador: admin.id_usuario,
    FK_usuario_actualizador: admin.id_usuario,
  };

  const ferreteria = await prisma.pROVEEDOR.findUniqueOrThrow({
    where: { cuit: '20356789017' }, // Ferreteria Industrial Rivadavia, de seed.ts
    select: { id_proveedor: true },
  });

  const proveedoresDePrueba = [
    {
      razon_social: 'Aceros del Nordeste S.A.',
      cuit: '30712233445',
      condicion_iva: CondicionIVA.RESPONSABLE_INSCRIPTO,
      domicilio: 'Parque Industrial, Resistencia, Chaco',
      telefono: '3624-556677',
      correo: 'ventas@acerosnordeste.test',
      observaciones:
        'Proveedor de hierro y perfiles. Entregas en obra con 48 h de anticipación.',
    },
    {
      razon_social: 'Deposito Fiscal Chaqueno S.R.L.',
      cuit: '30798765432',
      condicion_iva: CondicionIVA.RESPONSABLE_INSCRIPTO,
      domicilio: 'Zona Franca, Resistencia, Chaco',
      telefono: '3624-334455',
      correo: 'administracion@depositofiscal.test',
      observaciones:
        'Depósito de materiales importados. Bonifica por volumen de compra.',
    },
    {
      razon_social: 'Maderera del Chaco S.R.L.',
      cuit: '30655544332',
      condicion_iva: CondicionIVA.MONOTRIBUTISTA,
      domicilio: 'Ruta 16 Km 8, Chaco',
      telefono: '3624-667788',
      correo: 'contacto@madereradelchaco.test',
      observaciones:
        'Dado de baja: cerró la sucursal de Resistencia, con la cuenta saldada.',
      estado: false,
    },
    {
      razon_social: 'Insumos Norte S.A.',
      cuit: '30734455661',
      condicion_iva: CondicionIVA.RESPONSABLE_INSCRIPTO,
      domicilio: 'Av. 9 de Julio 620, Resistencia, Chaco',
      telefono: '3624-889900',
      correo: 'ventas@insumosnorte.test',
      observaciones:
        'Tornillería, fijaciones y caños. Pago a 15 días de la factura.',
    },
    {
      razon_social: 'Corralón El Constructor S.A.',
      cuit: '30711122233',
      condicion_iva: CondicionIVA.RESPONSABLE_INSCRIPTO,
      domicilio: 'Av. Alvear 3100, Resistencia, Chaco',
      telefono: '3624-441122',
      correo: 'cuentas@elconstructor.test',
      observaciones:
        'Corralón principal: materiales de obra para todos los proyectos, facturación mensual.',
    },
  ];

  for (const proveedor of proveedoresDePrueba) {
    await prisma.pROVEEDOR.upsert({
      where: { cuit: proveedor.cuit },
      update: proveedor,
      create: { ...proveedor, ...auditoria },
    });
  }
  console.log(
    `Seed de prueba - PROVEEDOR: ${proveedoresDePrueba.length} registros procesados.`,
  );

  const idProveedorPorCuit = new Map(
    (
      await prisma.pROVEEDOR.findMany({
        where: { cuit: { in: proveedoresDePrueba.map((p) => p.cuit) } },
        select: { id_proveedor: true, cuit: true },
      })
    ).map((p) => [p.cuit, p.id_proveedor]),
  );
  const idAceros = idProveedorPorCuit.get('30712233445')!;
  const idDepositoFiscal = idProveedorPorCuit.get('30798765432')!;
  const idMadereraBaja = idProveedorPorCuit.get('30655544332')!;
  const idInsumosNorte = idProveedorPorCuit.get('30734455661')!;
  const idCorralon = idProveedorPorCuit.get('30711122233')!;

  const idTipoComprobantePorNombre = new Map(
    (
      await prisma.tIPOCOMPROBANTE.findMany({
        select: { id_tipo_comprobante: true, nombre: true },
      })
    ).map((t) => [t.nombre, t.id_tipo_comprobante]),
  );
  const idFormaPagoPorNombre = new Map(
    (
      await prisma.fORMAPAGO.findMany({
        select: { id_forma_pago: true, nombre: true },
      })
    ).map((f) => [f.nombre, f.id_forma_pago]),
  );

  /**
   * IVA según la letra, como lo cargaría Tesorería: la Factura/Nota A de un
   * Responsable Inscripto discrimina 21 %; la C de un monotributista no
   * discrimina IVA (alícuota 0). Los importes de este seed son netos y el
   * total sale igual que en `ComprobanteService.calcularTotales`.
   */
  function totalesPorLetra(letra: string, importeNeto: number) {
    const alicuota_iva = letra === 'A' ? 21 : 0;
    // Neto entero en pesos: × alícuota ÷ 100 da el IVA exacto en centavos.
    const importe_iva = Math.round(importeNeto * alicuota_iva) / 100;
    return {
      importe_neto: importeNeto,
      alicuota_iva,
      importe_iva,
      importe_total: importeNeto + importe_iva,
    };
  }

  /**
   * Idempotente por (proveedor, tipo, letra, punto de venta, número) — el
   * mismo criterio que ya documenta el índice de COMPROBANTEPROVEEDOR en
   * schema.prisma para esta misma verificación. Queda REGISTRADO, como
   * después de `ComprobanteService.confirmar()`, con el saldo que le dejan
   * los pagos por `importePagado` (que se siembran aparte, con `upsertPago`).
   */
  async function upsertComprobante(datos: {
    idProveedor: number;
    tipoComprobante: string;
    letra: string;
    punto_de_venta: number;
    numero: number;
    fecha_emision: Date;
    fecha_vencimiento: Date;
    importe_neto: number;
    importePagado?: number;
    descripcionDetalle: string;
    anulado?: { motivo: string };
  }) {
    const FK_tipo_comprobante = idTipoComprobantePorNombre.get(
      datos.tipoComprobante,
    )!;

    const existente = await prisma.cOMPROBANTEPROVEEDOR.findFirst({
      where: {
        FK_proveedor: datos.idProveedor,
        FK_tipo_comprobante,
        letra: datos.letra,
        punto_de_venta: datos.punto_de_venta,
        numero: datos.numero,
      },
    });
    if (existente) return existente;

    const totales = totalesPorLetra(datos.letra, datos.importe_neto);
    const saldo = totales.importe_total - (datos.importePagado ?? 0);

    return prisma.cOMPROBANTEPROVEEDOR.create({
      data: {
        FK_proveedor: datos.idProveedor,
        FK_tipo_comprobante,
        letra: datos.letra,
        punto_de_venta: datos.punto_de_venta,
        numero: datos.numero,
        fecha_emision: datos.fecha_emision,
        fecha_vencimiento: datos.fecha_vencimiento,
        ...totales,
        // Anulado: mismo criterio que `ComprobanteService.anular()` (sin
        // saldo, fuera de la cuenta corriente, motivo obligatorio).
        ...(datos.anulado
          ? {
              saldo_pendiente: null,
              saldo_cancelado: null,
              estado: 'ANULADO',
              motivo_anulacion: datos.anulado.motivo,
            }
          : {
              saldo_pendiente: saldo,
              saldo_cancelado: saldo === 0,
              estado: 'REGISTRADO',
            }),
        ...auditoria,
        detalles: {
          create: [
            {
              descripcion: datos.descripcionDetalle,
              cantidad: 1,
              precio_unitario: datos.importe_neto,
              subtotal: datos.importe_neto,
            },
          ],
        },
      },
    });
  }

  /**
   * Pago de un solo comprobante, idempotente por `numero_referencia`. Sin
   * `importe`, paga todo el total. Uno anulado (como después de
   * `PagoService.anular()`) deja la foto del saldo pero no lo descuenta: el
   * comprobante se siembra con su saldo intacto.
   */
  async function upsertPago(datos: {
    idProveedor: number;
    formaPago: string;
    numero_referencia: string;
    fecha_pago: Date;
    comprobante: {
      id_comprobante_proveedor: number;
      importe_total: Prisma.Decimal;
    };
    importe?: number;
    anulado?: { motivo: string };
  }) {
    const existente = await prisma.pAGO.findFirst({
      where: { numero_referencia: datos.numero_referencia },
    });
    if (existente) return existente;

    const total = datos.comprobante.importe_total.toNumber();
    const importe = datos.importe ?? total;

    return prisma.pAGO.create({
      data: {
        fecha_pago: datos.fecha_pago,
        numero_referencia: datos.numero_referencia,
        importe_total: importe,
        estado: datos.anulado ? 'ANULADA' : 'CONFIRMADA',
        motivo_anulacion: datos.anulado?.motivo ?? null,
        FK_proveedor: datos.idProveedor,
        FK_forma_pago: idFormaPagoPorNombre.get(datos.formaPago)!,
        ...auditoria,
        detalles: {
          create: {
            FK_comprobante_proveedor:
              datos.comprobante.id_comprobante_proveedor,
            importe_imputado: importe,
            saldo_anterior: total,
            saldo_posterior: total - importe,
          },
        },
      },
    });
  }

  // Importes netos; las Facturas/Notas A suman 21 % de IVA (ver
  // `totalesPorLetra`).

  // Aceros del Nordeste (RI): 2 facturas + 1 nota de crédito + 1 pago
  // parcial. Queda DEUDOR (saldo 204.100) con historial rico para probar el
  // extracto (días respecto de hoy, importes con IVA):
  // -128 factura 181.500 (debe) -> acum. 181.500
  //  -84 factura  96.800 (debe) -> acum. 278.300
  //  -79 NC       24.200 (haber)-> acum. 254.100
  //  -67 pago     50.000 (haber)-> acum. 204.100  (== saldo de findAll)
  const facturaAceros1 = await upsertComprobante({
    idProveedor: idAceros,
    tipoComprobante: 'Factura',
    letra: 'A',
    punto_de_venta: 1,
    numero: 101,
    fecha_emision: diasDesdeHoy(-128),
    fecha_vencimiento: diasDesdeHoy(-98),
    importe_neto: 150_000,
    importePagado: 50_000,
    descripcionDetalle: 'Hierro y perfiles estructurales',
  });
  await upsertComprobante({
    idProveedor: idAceros,
    tipoComprobante: 'Factura',
    letra: 'A',
    punto_de_venta: 1,
    numero: 102,
    fecha_emision: diasDesdeHoy(-84),
    fecha_vencimiento: diasDesdeHoy(-53),
    importe_neto: 80_000,
    descripcionDetalle: 'Chapas galvanizadas',
  });
  await upsertComprobante({
    idProveedor: idAceros,
    tipoComprobante: 'Nota de Credito',
    letra: 'A',
    punto_de_venta: 1,
    numero: 5,
    fecha_emision: diasDesdeHoy(-79),
    fecha_vencimiento: diasDesdeHoy(-79),
    importe_neto: 20_000,
    descripcionDetalle: 'Devolución de mercadería con fallas',
  });

  // Depósito Fiscal Chaqueño (RI): solo una nota de crédito, sin facturas ->
  // queda A_FAVOR (saldo -42.350). Cubre el criterio "solo notas de crédito
  // arroja saldo negativo".
  await upsertComprobante({
    idProveedor: idDepositoFiscal,
    tipoComprobante: 'Nota de Credito',
    letra: 'A',
    punto_de_venta: 2,
    numero: 10,
    fecha_emision: diasDesdeHoy(-89),
    fecha_vencimiento: diasDesdeHoy(-89),
    importe_neto: 35_000,
    descripcionDetalle: 'Bonificación por volumen de compra',
  });

  // Maderera del Chaco (monotributista, Factura C): pagó su última factura y
  // después se dio de baja. `ProveedorService.baja` no deja dar de baja a un
  // proveedor con comprobantes con saldo pendiente, así que queda inactivo y
  // SIN_SALDO.
  const facturaMaderera = await upsertComprobante({
    idProveedor: idMadereraBaja,
    tipoComprobante: 'Factura',
    letra: 'C',
    punto_de_venta: 4,
    numero: 1,
    fecha_emision: diasDesdeHoy(-114),
    fecha_vencimiento: diasDesdeHoy(-84),
    importe_neto: 60_000,
    importePagado: 60_000,
    descripcionDetalle: 'Madera para encofrado',
  });

  // Ferretería Industrial Rivadavia (proveedor de seed.ts, monotributista):
  // factura pagada por completo -> queda SIN_SALDO, cubre
  // saldo_cancelado=true / sin comprobantes pendientes.
  const facturaFerreteria = await upsertComprobante({
    idProveedor: ferreteria.id_proveedor,
    tipoComprobante: 'Factura',
    letra: 'C',
    punto_de_venta: 3,
    numero: 50,
    fecha_emision: diasDesdeHoy(-159),
    fecha_vencimiento: diasDesdeHoy(-128),
    importe_neto: 45_000,
    importePagado: 45_000,
    descripcionDetalle: 'Herramientas manuales varias',
  });

  // Ferretería Industrial Rivadavia: una 2da factura, esta ANULADA -> no debe
  // sumar al saldo (sigue en SIN_SALDO) ni aparecer en el extracto. Cubre
  // "excluye los comprobantes ANULADOS".
  await upsertComprobante({
    idProveedor: ferreteria.id_proveedor,
    tipoComprobante: 'Factura',
    letra: 'C',
    punto_de_venta: 3,
    numero: 51,
    fecha_emision: diasDesdeHoy(-119),
    fecha_vencimiento: diasDesdeHoy(-89),
    importe_neto: 18_000,
    descripcionDetalle: 'Bulonería varia',
    anulado: {
      motivo: 'Cargada por error: la mercadería no llegó a recibirse',
    },
  });

  // Insumos Norte (RI): 1 factura vencida + 1 no vencida, las dos DEUDOR
  // (saldo 58.080) -> cubre "comprobante vencido con saldo pendiente" y le
  // da contraste a uno no vencido, para comparar el indicador visual.
  const facturaInsumosVencida = await upsertComprobante({
    idProveedor: idInsumosNorte,
    tipoComprobante: 'Factura',
    letra: 'A',
    punto_de_venta: 1,
    numero: 20,
    fecha_emision: diasDesdeHoy(-98),
    fecha_vencimiento: diasDesdeHoy(-84), // vencida
    importe_neto: 30_000,
    descripcionDetalle: 'Tornillería y fijaciones',
  });
  await upsertComprobante({
    idProveedor: idInsumosNorte,
    tipoComprobante: 'Factura',
    letra: 'A',
    punto_de_venta: 1,
    numero: 21,
    fecha_emision: diasDesdeHoy(-36),
    fecha_vencimiento: diasDesdeHoy(25), // no vencida
    importe_neto: 18_000,
    descripcionDetalle: 'Caños y accesorios de PVC',
  });

  await upsertPago({
    idProveedor: idAceros,
    formaPago: 'Transferencia bancaria',
    numero_referencia: numeroOperacion('pago-aceros-101'),
    fecha_pago: diasDesdeHoy(-67),
    comprobante: facturaAceros1,
    importe: 50_000,
  });
  await upsertPago({
    idProveedor: ferreteria.id_proveedor,
    formaPago: 'Efectivo',
    numero_referencia: numeroRecibo(3, 850),
    fecha_pago: diasDesdeHoy(-140),
    comprobante: facturaFerreteria,
  });
  await upsertPago({
    idProveedor: idMadereraBaja,
    formaPago: 'Transferencia bancaria',
    numero_referencia: numeroOperacion('pago-maderera-1'),
    fecha_pago: diasDesdeHoy(-95),
    comprobante: facturaMaderera,
  });

  // Insumos Norte: pago ANULADO sobre la factura vencida. No debe descontar
  // saldo (queda en 36.300, como si nunca hubiera surtido efecto) ni sumar al
  // listado de pagos confirmados, pero sí debe verse en GET /pagos con estado
  // Anulado y quedar afuera del extracto de cuenta corriente. Cubre "excluye
  // los pagos ANULADOS" y da un caso de detalle de pago anulado para HU-18.
  await upsertPago({
    idProveedor: idInsumosNorte,
    formaPago: 'Efectivo',
    numero_referencia: numeroRecibo(1, 231),
    fecha_pago: diasDesdeHoy(-63),
    comprobante: facturaInsumosVencida,
    anulado: { motivo: 'Se cargó el pago duplicado por error de tipeo' },
  });

  // Corralón El Constructor (RI): los materiales de obra de cada mes,
  // facturados y pagados por transferencia 10 días después (SIN_SALDO). Son
  // los egresos del tablero (HU-34, T152): uno por mes en los últimos 11
  // meses, por montos del mismo orden que los cobros de las ventas, para que
  // el resultado del período tenga meses positivos y negativos. Importes
  // netos (más 21 % de IVA).
  const MATERIALES_POR_MES = [
    { neto: 8_400_000, detalle: 'Hormigón elaborado H-21' },
    { neto: 6_200_000, detalle: 'Hierro aletado y mallas sima' },
    { neto: 12_500_000, detalle: 'Ladrillos, cemento y cal' },
    { neto: 9_800_000, detalle: 'Hormigón elaborado H-30' },
    { neto: 15_300_000, detalle: 'Aberturas de aluminio' },
    { neto: 7_100_000, detalle: 'Caños, cables y tableros eléctricos' },
    { neto: 11_600_000, detalle: 'Cerámicos y porcellanatos' },
    { neto: 13_900_000, detalle: 'Hierro aletado y perfiles' },
    { neto: 6_800_000, detalle: 'Sanitarios y grifería' },
    { neto: 10_400_000, detalle: 'Placas de yeso y perfilería' },
    { neto: 9_200_000, detalle: 'Pinturas e impermeabilizantes' },
  ];
  /**
   * Una factura de Corralón por mes, pagada a los 10 días. `numeroInicial` y
   * `mesInicial` (meses respecto de hoy) fijan de dónde parte cada tanda: no
   * se tocan una vez sembradas, porque de ellos salen la clave que usa la
   * idempotencia.
   */
  async function sembrarMaterialesCorralon(
    materiales: { neto: number; detalle: string }[],
    numeroInicial: number,
    mesInicial: number,
  ) {
    for (const [indice, material] of materiales.entries()) {
      const numero = numeroInicial + indice;
      const fechaEmision = mesesDesdeHoy(mesInicial + indice);
      const factura = await upsertComprobante({
        idProveedor: idCorralon,
        tipoComprobante: 'Factura',
        letra: 'A',
        punto_de_venta: 7,
        numero,
        fecha_emision: fechaEmision,
        fecha_vencimiento: new Date(fechaEmision.getTime() + 30 * 86_400_000),
        importe_neto: material.neto,
        importePagado: totalesPorLetra('A', material.neto).importe_total,
        descripcionDetalle: material.detalle,
      });
      await upsertPago({
        idProveedor: idCorralon,
        formaPago: 'Transferencia bancaria',
        numero_referencia: numeroOperacion(`pago-corralon-${numero}`),
        fecha_pago: new Date(fechaEmision.getTime() + 10 * 86_400_000),
        comprobante: factura,
      });
    }
  }

  await sembrarMaterialesCorralon(
    MATERIALES_POR_MES,
    1001,
    -MATERIALES_POR_MES.length,
  );

  // Los 10 meses anteriores a esos 11 (de hace 21 a hace 12 meses): con el
  // año en curso por defecto, el tablero compara contra el rango anterior de
  // igual duración, y sin estos egresos todas las variaciones darían "sin
  // datos del período anterior". Sus importes y los de `seed-tablero.ts` se
  // calcularon juntos para que 2025 cierre con ganancia y algún mes en
  // pérdida: si cambian, hay que volver a calcularlos.
  const MATERIALES_ANIO_ANTERIOR = [
    { neto: 6_800_000, detalle: 'Excavación y movimiento de suelos' },
    { neto: 9_900_000, detalle: 'Hormigón elaborado H-17' },
    { neto: 7_600_000, detalle: 'Hierro aletado y mallas sima' },
    { neto: 11_600_000, detalle: 'Ladrillos huecos y cemento' },
    { neto: 6_000_000, detalle: 'Arena, piedra y cal' },
    { neto: 10_800_000, detalle: 'Hormigón elaborado H-21' },
    { neto: 12_800_000, detalle: 'Aberturas y vidrios' },
    { neto: 7_400_000, detalle: 'Caños y accesorios sanitarios' },
    { neto: 9_100_000, detalle: 'Cables y tableros eléctricos' },
    { neto: 8_200_000, detalle: 'Revoques y yeso' },
  ];
  await sembrarMaterialesCorralon(MATERIALES_ANIO_ANTERIOR, 1101, -21);

  // Compras puntuales de obra del año en curso, fuera de la rutina mensual de
  // arriba: son las que dejan en pérdida algunos meses de 2026 (enero, mayo,
  // julio y, junto con la venta de agosto de `seed-comercializacion`,
  // septiembre) y bajan el pico de agosto. Cada una es una factura de un mes
  // puntual, de hace 9, 5, 3 y 2 meses; los números siguen a los de arriba.
  await sembrarMaterialesCorralon(
    [{ neto: 7_900_000, detalle: 'Estructura de hormigón armado, 2.º tramo' }],
    1201,
    -9,
  );
  await sembrarMaterialesCorralon(
    [{ neto: 7_400_000, detalle: 'Mampostería y cerramientos de planta baja' }],
    1202,
    -5,
  );
  await sembrarMaterialesCorralon(
    [{ neto: 7_400_000, detalle: 'Instalaciones sanitarias y de gas' }],
    1203,
    -3,
  );
  await sembrarMaterialesCorralon(
    [
      {
        neto: 17_000_000,
        detalle: 'Terminaciones: pisos, revestimientos y carpintería',
      },
    ],
    1204,
    -2,
  );
  const EGRESOS_PUNTUALES = 4;

  console.log(
    `Seed de prueba - COMPROBANTEPROVEEDOR: ${8 + MATERIALES_POR_MES.length + MATERIALES_ANIO_ANTERIOR.length + EGRESOS_PUNTUALES} registros procesados (1 ANULADO).`,
  );
  console.log(
    `Seed de prueba - PAGO: ${4 + MATERIALES_POR_MES.length + MATERIALES_ANIO_ANTERIOR.length + EGRESOS_PUNTUALES} registros procesados (1 ANULADO).`,
  );
}

// Corrido suelto (`npm run seed:...`); desde `seed-prueba.ts` solo se importa.
if (require.main === module) ejecutarSeed(sembrarCuentaCorrientePrueba);
