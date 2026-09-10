import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { CondicionIVA } from '../generated/prisma/enums';
import { RolNombre } from '../src/common/enums/rol.enum';

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
 * Industrial Rivadavia" que crea `seed.ts`) y agrega encima 4 proveedores +
 * sus comprobantes/pagos, pensados para cubrir en un solo lugar los casos de
 * borde de ambas HU: DEUDOR, A_FAVOR, SIN_SALDO, proveedor dado de baja con
 * saldo, comprobantes vencidos y no vencidos, un comprobante ANULADO y un pago
 * ANULADO (ambos deben quedar afuera del cálculo de saldo).
 *
 * No crea ninguna tabla ni lógica nueva: COMPROBANTEPROVEEDOR,
 * DETALLECOMPROBANTE, PAGO y DETALLEPAGO ya existen en el schema. Inserta
 * filas directo con Prisma en el mismo estado que dejarían
 * ComprobanteService.confirmar() / .anular() y PagoService.create() / .anular()
 * si las hubiera llamado un usuario real. IVA simplificado a 0% (importe_neto
 * = importe_total) porque no aporta nada a lo que esto prueba.
 *
 * Es 100% idempotente (buscar-y-crear, nunca borra nada): correr
 *   npm run seed:cuenta-corriente-prueba
 * las veces que haga falta no duplica datos. Para arrancar de datos
 * completamente limpios (recomendado antes de una tanda de pruebas manuales):
 *   npx prisma migrate reset   (borra la base, aplica migraciones y corre seed.ts solo)
 *   npm run seed:cuenta-corriente-prueba   (agrega los datos de este script)
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
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
        'Seed de prueba: queda DEUDOR, con historial rico para el extracto.',
    },
    {
      razon_social: 'Deposito Fiscal Chaqueno S.R.L.',
      cuit: '30798765432',
      condicion_iva: CondicionIVA.RESPONSABLE_INSCRIPTO,
      domicilio: 'Zona Franca, Resistencia, Chaco',
      telefono: '3624-334455',
      correo: 'administracion@depositofiscal.test',
      observaciones:
        'Seed de prueba: solo tiene una nota de credito, queda A_FAVOR.',
    },
    {
      razon_social: 'Maderera Baja de Prueba S.R.L.',
      cuit: '30655544332',
      condicion_iva: CondicionIVA.MONOTRIBUTISTA,
      domicilio: 'Ruta 16 Km 8, Chaco',
      telefono: '3624-667788',
      correo: 'contacto@madererabaja.test',
      observaciones:
        'Seed de prueba: dado de baja pero con saldo pendiente (queda inactivo).',
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
        'Seed de prueba: 1 factura vencida + 1 no vencida (ambas DEUDOR), y un pago ANULADO que no debe afectar el saldo.',
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
   * Idempotente por (proveedor, tipo, letra, punto de venta, número) — el
   * mismo criterio que ya documenta el índice de COMPROBANTEPROVEEDOR en
   * schema.prisma para esta misma verificación.
   */
  async function upsertComprobante(datos: {
    idProveedor: number;
    tipoComprobante: string;
    letra: string;
    punto_de_venta: number;
    numero: number;
    fecha_emision: Date;
    fecha_vencimiento: Date;
    importe_total: number;
    saldo_pendiente: number;
    saldo_cancelado: boolean;
    descripcionDetalle: string;
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

    return prisma.cOMPROBANTEPROVEEDOR.create({
      data: {
        FK_proveedor: datos.idProveedor,
        FK_tipo_comprobante,
        letra: datos.letra,
        punto_de_venta: datos.punto_de_venta,
        numero: datos.numero,
        fecha_emision: datos.fecha_emision,
        fecha_vencimiento: datos.fecha_vencimiento,
        importe_neto: datos.importe_total,
        alicuota_iva: 0,
        importe_iva: 0,
        importe_total: datos.importe_total,
        saldo_pendiente: datos.saldo_pendiente,
        saldo_cancelado: datos.saldo_cancelado,
        estado: 'REGISTRADO',
        ...auditoria,
        detalles: {
          create: [
            {
              descripcion: datos.descripcionDetalle,
              cantidad: 1,
              precio_unitario: datos.importe_total,
              subtotal: datos.importe_total,
            },
          ],
        },
      },
    });
  }

  /**
   * Como `upsertComprobante`, pero para un comprobante ya ANULADO: mismo
   * criterio que `ComprobanteService.anular()` (`saldo_pendiente` y
   * `saldo_cancelado` en `null`, motivo obligatorio). Queda fuera del cálculo
   * de saldo y del extracto — cubre "excluye los comprobantes ANULADOS".
   */
  async function upsertComprobanteAnulado(datos: {
    idProveedor: number;
    tipoComprobante: string;
    letra: string;
    punto_de_venta: number;
    numero: number;
    fecha_emision: Date;
    fecha_vencimiento: Date;
    importe_total: number;
    motivo_anulacion: string;
    descripcionDetalle: string;
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

    return prisma.cOMPROBANTEPROVEEDOR.create({
      data: {
        FK_proveedor: datos.idProveedor,
        FK_tipo_comprobante,
        letra: datos.letra,
        punto_de_venta: datos.punto_de_venta,
        numero: datos.numero,
        fecha_emision: datos.fecha_emision,
        fecha_vencimiento: datos.fecha_vencimiento,
        importe_neto: datos.importe_total,
        alicuota_iva: 0,
        importe_iva: 0,
        importe_total: datos.importe_total,
        saldo_pendiente: null,
        saldo_cancelado: null,
        estado: 'ANULADO',
        motivo_anulacion: datos.motivo_anulacion,
        ...auditoria,
        detalles: {
          create: [
            {
              descripcion: datos.descripcionDetalle,
              cantidad: 1,
              precio_unitario: datos.importe_total,
              subtotal: datos.importe_total,
            },
          ],
        },
      },
    });
  }

  /** Idempotente por `numero_referencia`, usado acá solo como tag del seed. */
  async function upsertPago(datos: {
    idProveedor: number;
    formaPago: string;
    numero_referencia: string;
    fecha_pago: Date;
    importe_total: number;
    imputaciones: {
      idComprobante: number;
      importe_imputado: number;
      saldo_anterior: number;
      saldo_posterior: number;
    }[];
  }) {
    const existente = await prisma.pAGO.findFirst({
      where: { numero_referencia: datos.numero_referencia },
    });
    if (existente) return existente;

    const FK_forma_pago = idFormaPagoPorNombre.get(datos.formaPago)!;

    return prisma.pAGO.create({
      data: {
        fecha_pago: datos.fecha_pago,
        numero_referencia: datos.numero_referencia,
        importe_total: datos.importe_total,
        estado: 'CONFIRMADA',
        FK_proveedor: datos.idProveedor,
        FK_forma_pago,
        ...auditoria,
        detalles: {
          create: datos.imputaciones.map((imp) => ({
            FK_comprobante_proveedor: imp.idComprobante,
            importe_imputado: imp.importe_imputado,
            saldo_anterior: imp.saldo_anterior,
            saldo_posterior: imp.saldo_posterior,
          })),
        },
      },
    });
  }

  /**
   * Un pago que ya nace ANULADA, como si `PagoService.anular()` lo hubiera
   * revertido justo después de confirmarse: mismo criterio que ese método
   * (restituye el saldo del comprobante, acá directamente no lo descuenta).
   * Cubre "excluye los pagos ANULADOS" tanto en el listado de pagos como en el
   * extracto de cuenta corriente — el comprobante que "pagaba" sigue con su
   * saldo pendiente intacto.
   */
  async function upsertPagoAnulado(datos: {
    idProveedor: number;
    formaPago: string;
    numero_referencia: string;
    fecha_pago: Date;
    importe_total: number;
    motivo_anulacion: string;
    imputaciones: {
      idComprobante: number;
      importe_imputado: number;
      saldo_anterior: number;
      saldo_posterior: number;
    }[];
  }) {
    const existente = await prisma.pAGO.findFirst({
      where: { numero_referencia: datos.numero_referencia },
    });
    if (existente) return existente;

    const FK_forma_pago = idFormaPagoPorNombre.get(datos.formaPago)!;

    return prisma.pAGO.create({
      data: {
        fecha_pago: datos.fecha_pago,
        numero_referencia: datos.numero_referencia,
        importe_total: datos.importe_total,
        estado: 'ANULADA',
        motivo_anulacion: datos.motivo_anulacion,
        FK_proveedor: datos.idProveedor,
        FK_forma_pago,
        ...auditoria,
        detalles: {
          create: datos.imputaciones.map((imp) => ({
            FK_comprobante_proveedor: imp.idComprobante,
            importe_imputado: imp.importe_imputado,
            saldo_anterior: imp.saldo_anterior,
            saldo_posterior: imp.saldo_posterior,
          })),
        },
      },
    });
  }

  // Aceros del Nordeste: 2 facturas + 1 nota de crédito + 1 pago parcial.
  // Queda DEUDOR (saldo 160.000) con historial rico para probar el extracto:
  // 01/06 factura 150.000 (debe) -> acum. 150.000
  // 15/07 factura  80.000 (debe) -> acum. 230.000
  // 20/07 NC       20.000 (haber)-> acum. 210.000
  // 01/08 pago     50.000 (haber)-> acum. 160.000  (== saldo de findAll)
  const facturaAceros1 = await upsertComprobante({
    idProveedor: idAceros,
    tipoComprobante: 'Factura',
    letra: 'A',
    punto_de_venta: 1,
    numero: 101,
    fecha_emision: new Date('2026-06-01'),
    fecha_vencimiento: new Date('2026-07-01'),
    importe_total: 150000,
    saldo_pendiente: 100000, // 150.000 - 50.000 imputados por el pago de abajo
    saldo_cancelado: false,
    descripcionDetalle: 'Hierro y perfiles estructurales',
  });
  await upsertComprobante({
    idProveedor: idAceros,
    tipoComprobante: 'Factura',
    letra: 'A',
    punto_de_venta: 1,
    numero: 102,
    fecha_emision: new Date('2026-07-15'),
    fecha_vencimiento: new Date('2026-08-15'),
    importe_total: 80000,
    saldo_pendiente: 80000,
    saldo_cancelado: false,
    descripcionDetalle: 'Chapas galvanizadas',
  });
  await upsertComprobante({
    idProveedor: idAceros,
    tipoComprobante: 'Nota de Credito',
    letra: 'A',
    punto_de_venta: 1,
    numero: 5,
    fecha_emision: new Date('2026-07-20'),
    fecha_vencimiento: new Date('2026-07-20'),
    importe_total: 20000,
    saldo_pendiente: 20000,
    saldo_cancelado: false,
    descripcionDetalle: 'Devolucion de mercaderia con fallas',
  });

  // Deposito Fiscal Chaqueno: solo una nota de crédito, sin facturas -> queda
  // A_FAVOR (saldo -35.000). Cubre el criterio "solo notas de crédito arroja
  // saldo negativo".
  await upsertComprobante({
    idProveedor: idDepositoFiscal,
    tipoComprobante: 'Nota de Credito',
    letra: 'A',
    punto_de_venta: 2,
    numero: 10,
    fecha_emision: new Date('2026-07-10'),
    fecha_vencimiento: new Date('2026-07-10'),
    importe_total: 35000,
    saldo_pendiente: 35000,
    saldo_cancelado: false,
    descripcionDetalle: 'Bonificacion por volumen de compra',
  });

  // Maderera Baja de Prueba: proveedor inactivo con una factura pendiente ->
  // cubre "un proveedor dado de baja puede seguir teniendo saldo pendiente".
  await upsertComprobante({
    idProveedor: idMadereraBaja,
    tipoComprobante: 'Factura',
    letra: 'A',
    punto_de_venta: 4,
    numero: 1,
    fecha_emision: new Date('2026-06-15'),
    fecha_vencimiento: new Date('2026-07-15'),
    importe_total: 60000,
    saldo_pendiente: 60000,
    saldo_cancelado: false,
    descripcionDetalle: 'Madera para encofrado',
  });

  // Ferreteria Industrial Rivadavia (proveedor de seed.ts): factura pagada
  // por completo -> queda SIN_SALDO, cubre saldo_cancelado=true / sin
  // comprobantes pendientes.
  const facturaFerreteria = await upsertComprobante({
    idProveedor: ferreteria.id_proveedor,
    tipoComprobante: 'Factura',
    letra: 'A',
    punto_de_venta: 3,
    numero: 50,
    fecha_emision: new Date('2026-05-01'),
    fecha_vencimiento: new Date('2026-06-01'),
    importe_total: 45000,
    saldo_pendiente: 0,
    saldo_cancelado: true,
    descripcionDetalle: 'Herramientas manuales varias',
  });

  // Ferreteria Industrial Rivadavia: una 2da factura, esta ANULADA -> no debe
  // sumar al saldo (sigue en SIN_SALDO) ni aparecer en el extracto. Cubre
  // "excluye los comprobantes ANULADOS".
  await upsertComprobanteAnulado({
    idProveedor: ferreteria.id_proveedor,
    tipoComprobante: 'Factura',
    letra: 'A',
    punto_de_venta: 3,
    numero: 51,
    fecha_emision: new Date('2026-06-10'),
    fecha_vencimiento: new Date('2026-07-10'),
    importe_total: 18000,
    motivo_anulacion: 'Cargada por error: la mercadería no llegó a recibirse',
    descripcionDetalle: 'Bulonería varia',
  });

  // Insumos Norte: 1 factura vencida + 1 no vencida, las dos DEUDOR (saldo
  // 48.000) -> cubre "comprobante vencido con saldo pendiente" y le da
  // contraste a uno no vencido, para comparar el indicador visual.
  const facturaInsumosVencida = await upsertComprobante({
    idProveedor: idInsumosNorte,
    tipoComprobante: 'Factura',
    letra: 'A',
    punto_de_venta: 1,
    numero: 20,
    fecha_emision: new Date('2026-07-01'),
    fecha_vencimiento: new Date('2026-07-15'), // vencida (hoy: 2026-09-10)
    importe_total: 30000,
    saldo_pendiente: 30000,
    saldo_cancelado: false,
    descripcionDetalle: 'Tornillería y fijaciones',
  });
  await upsertComprobante({
    idProveedor: idInsumosNorte,
    tipoComprobante: 'Factura',
    letra: 'A',
    punto_de_venta: 1,
    numero: 21,
    fecha_emision: new Date('2026-09-01'),
    fecha_vencimiento: new Date('2026-11-01'), // no vencida
    importe_total: 18000,
    saldo_pendiente: 18000,
    saldo_cancelado: false,
    descripcionDetalle: 'Caños y accesorios de PVC',
  });

  console.log(
    'Seed de prueba - COMPROBANTEPROVEEDOR: 8 registros procesados (1 ANULADO).',
  );

  await upsertPago({
    idProveedor: idAceros,
    formaPago: 'Transferencia bancaria',
    numero_referencia: 'SEED-PAGO-ACEROS-01',
    fecha_pago: new Date('2026-08-01'),
    importe_total: 50000,
    imputaciones: [
      {
        idComprobante: facturaAceros1.id_comprobante_proveedor,
        importe_imputado: 50000,
        saldo_anterior: 150000,
        saldo_posterior: 100000,
      },
    ],
  });
  await upsertPago({
    idProveedor: ferreteria.id_proveedor,
    formaPago: 'Efectivo',
    numero_referencia: 'SEED-PAGO-FERRETERIA-01',
    fecha_pago: new Date('2026-05-20'),
    importe_total: 45000,
    imputaciones: [
      {
        idComprobante: facturaFerreteria.id_comprobante_proveedor,
        importe_imputado: 45000,
        saldo_anterior: 45000,
        saldo_posterior: 0,
      },
    ],
  });

  // Insumos Norte: pago ANULADO sobre la factura vencida. No debe descontar
  // saldo (queda en 30.000, como si nunca hubiera surtido efecto) ni sumar al
  // listado de pagos confirmados, pero sí debe verse en GET /pagos con estado
  // Anulado y quedar afuera del extracto de cuenta corriente. Cubre "excluye
  // los pagos ANULADOS" y da un caso de detalle de pago anulado para HU-18.
  await upsertPagoAnulado({
    idProveedor: idInsumosNorte,
    formaPago: 'Efectivo',
    numero_referencia: 'SEED-PAGO-INSUMOSNORTE-01-ANULADO',
    fecha_pago: new Date('2026-08-05'),
    importe_total: 30000,
    motivo_anulacion: 'Se cargó el pago duplicado por error de tipeo',
    imputaciones: [
      {
        idComprobante: facturaInsumosVencida.id_comprobante_proveedor,
        importe_imputado: 30000,
        saldo_anterior: 30000,
        saldo_posterior: 0,
      },
    ],
  });

  console.log('Seed de prueba - PAGO: 3 registros procesados (1 ANULADO).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
