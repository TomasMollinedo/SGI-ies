import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import {
  EstadoCuota,
  EstadoDeclaracionPago,
  EstadoVenta,
  ModalidadPago,
  OrigenCobro,
} from '../generated/prisma/enums';
import { registrarCobro } from './seed-ventas';

/**
 * Helper compartido por los seeds que siembran declaraciones de pago (HU-29).
 * No es un seed: no se ejecuta solo.
 *
 * Deja cada declaración como la dejan `DeclaracionPagoService.declarar`,
 * `validar` y `rechazar`:
 * - el comprobante es un PDF de prueba subido de verdad al bucket privado
 *   (`STORAGE_BUCKET_COMPROBANTES`), con la clave `<uuid>.pdf`, así se puede
 *   abrir desde la API igual que uno que subió un cliente (T146);
 * - solo sobre cuotas declarables: venta vigente y financiada, cuota
 *   Pendiente o Parcial, importe que no supera el saldo;
 * - la validada genera su COBRO de origen ECOMMERCE (que descuenta el saldo)
 *   y queda apuntándolo; la rechazada no toca ni la cuota ni los cobros.
 *
 * Necesita MinIO levantado (`docker compose up`) con el bucket creado.
 */

export interface DeclaracionSeed {
  FK_cliente: number;
  /** La publicación vendida: la cuota se busca en su venta vigente. */
  FK_publicacion: number;
  numero_cuota: number;
  /** Una forma habilitada para autogestión. */
  FK_forma_pago: number;
  /** Sin importe, declara todo el saldo pendiente de la cuota. */
  importe?: number;
  numero_referencia: string;
  fecha_declaracion: Date;
  /** Sin resolución, queda PENDIENTE. */
  resolucion?:
    | { estado: typeof EstadoDeclaracionPago.VALIDADA; fecha: Date }
    | {
        estado: typeof EstadoDeclaracionPago.RECHAZADA;
        fecha: Date;
        motivo: string;
      };
}

let s3: S3Client | undefined;

/** Cliente S3 armado igual que `AlmacenamientoService`, con las mismas variables. */
function clienteAlmacenamiento(): S3Client {
  s3 ??= new S3Client({
    endpoint: `http://${variable('STORAGE_ENDPOINT')}:${process.env.STORAGE_PORT ?? 9000}`,
    // MinIO no usa regiones, pero el SDK exige una; y espera el bucket en
    // el path, no como subdominio.
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: variable('STORAGE_ACCESS_KEY'),
      secretAccessKey: variable('STORAGE_SECRET_KEY'),
    },
  });
  return s3;
}

function variable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre} (ver .env.example)`,
    );
  }
  return valor;
}

/**
 * Un PDF de una página, armado a mano para no sumar dependencias, con el
 * texto del comprobante. Es un PDF válido: los visores lo abren.
 */
function pdfDePrueba(lineas: string[]): Buffer {
  const escapar = (texto: string) => texto.replace(/[\\()]/g, '\\$&');
  const contenido = lineas
    .map(
      (linea, indice) =>
        `BT /F1 12 Tf 50 ${780 - indice * 20} Td (${escapar(linea)}) Tj ET`,
    )
    .join('\n');
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(contenido, 'latin1')} >>\nstream\n${contenido}\nendstream`,
  ];

  // Latin-1 para que los acentos coincidan con WinAnsiEncoding y cada
  // carácter ocupe un byte (los offsets de la tabla xref son en bytes).
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const [indice, objeto] of objetos.entries()) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
  }
  const inicioXref = Buffer.byteLength(pdf, 'latin1');
  pdf +=
    `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n` +
    offsets
      .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
      .join('') +
    `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

/** Sube el PDF al bucket privado y devuelve su clave, como `subirComprobante`. */
async function subirComprobante(contenido: Buffer): Promise<string> {
  const ruta = `${randomUUID()}.pdf`;
  try {
    await clienteAlmacenamiento().send(
      new PutObjectCommand({
        Bucket: variable('STORAGE_BUCKET_COMPROBANTES'),
        Key: ruta,
        Body: contenido,
        ContentType: 'application/pdf',
      }),
    );
  } catch (error) {
    throw new Error(
      `No se pudo subir el comprobante de prueba al bucket de comprobantes. ¿Está levantado MinIO (docker compose up)?`,
      { cause: error },
    );
  }
  return ruta;
}

/**
 * Crea la declaración con su comprobante y, si corresponde, su resolución.
 * Idempotente por (cuota, número de referencia): si ya existe, la devuelve
 * sin subir nada.
 */
export async function sembrarDeclaracion(
  prisma: PrismaClient,
  datos: DeclaracionSeed,
  validadorId: number,
) {
  const cuota = await prisma.cUOTA.findFirst({
    where: {
      numero: datos.numero_cuota,
      venta: {
        FK_publicacion: datos.FK_publicacion,
        FK_cliente: datos.FK_cliente,
        estado: EstadoVenta.VIGENTE,
      },
    },
    include: { planPago: { select: { modalidad: true } } },
  });
  if (!cuota) {
    throw new Error(
      `El cliente ${datos.FK_cliente} no tiene una cuota ${datos.numero_cuota} en una venta vigente de la publicación ${datos.FK_publicacion}`,
    );
  }

  const existente = await prisma.dECLARACIONPAGO.findFirst({
    where: {
      FK_cuota: cuota.id_cuota,
      numero_referencia: datos.numero_referencia,
    },
  });
  if (existente) return existente;

  // Las mismas reglas que `declarar`: si no se cumplen, el seed estaría
  // sembrando algo que la API nunca dejaría pasar.
  const importe =
    datos.importe === undefined
      ? cuota.saldo_pendiente
      : new Prisma.Decimal(datos.importe);
  if (
    cuota.planPago.modalidad !== ModalidadPago.FINANCIADO ||
    (cuota.estado !== EstadoCuota.PENDIENTE &&
      cuota.estado !== EstadoCuota.PARCIAL) ||
    importe.greaterThan(cuota.saldo_pendiente)
  ) {
    throw new Error(
      `La cuota ${cuota.id_cuota} no admite la declaración ${datos.numero_referencia} (venta de contado, cuota saldada o importe mayor al saldo)`,
    );
  }

  const fechaComprobante = datos.fecha_declaracion.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  const ruta = await subirComprobante(
    pdfDePrueba([
      'Comprobante de transferencia bancaria',
      `Referencia: ${datos.numero_referencia}`,
      `Importe: $ ${importe.toFixed(2)}`,
      `Fecha: ${fechaComprobante}`,
      'Documento de prueba generado por el seed: no es un comprobante real.',
    ]),
  );

  try {
    return await prisma.$transaction(async (tx) => {
      const { resolucion } = datos;
      let idCobro: number | null = null;
      if (resolucion?.estado === EstadoDeclaracionPago.VALIDADA) {
        // Como `validar`: el cobro lo registra quien valida, con la fecha
        // de la validación.
        const { cobro } = await registrarCobro(
          tx,
          [{ cuota, importe: importe.toNumber() }],
          datos.FK_cliente,
          {
            fecha: resolucion.fecha,
            origen: OrigenCobro.ECOMMERCE,
            FK_forma_pago: datos.FK_forma_pago,
            numero_referencia: datos.numero_referencia,
          },
          validadorId,
        );
        idCobro = cobro.id_cobro;
      }

      return tx.dECLARACIONPAGO.create({
        data: {
          FK_cliente: datos.FK_cliente,
          FK_cuota: cuota.id_cuota,
          FK_forma_pago: datos.FK_forma_pago,
          importe,
          numero_referencia: datos.numero_referencia,
          comprobante_ruta: ruta,
          comprobante_nombre_archivo: `comprobante-${datos.numero_referencia.toLowerCase()}.pdf`,
          comprobante_tipo: 'application/pdf',
          hora_creacion: datos.fecha_declaracion,
          estado: resolucion?.estado ?? EstadoDeclaracionPago.PENDIENTE,
          motivo_rechazo:
            resolucion?.estado === EstadoDeclaracionPago.RECHAZADA
              ? resolucion.motivo
              : null,
          fecha_resolucion: resolucion?.fecha ?? null,
          FK_usuario_validador: resolucion ? validadorId : null,
          FK_cobro: idCobro,
        },
      });
    });
  } catch (error) {
    // Igual que `declarar`: si falla el alta, no dejar el archivo huérfano.
    await clienteAlmacenamiento()
      .send(
        new DeleteObjectCommand({
          Bucket: variable('STORAGE_BUCKET_COMPROBANTES'),
          Key: ruta,
        }),
      )
      .catch(() => undefined);
    throw error;
  }
}
