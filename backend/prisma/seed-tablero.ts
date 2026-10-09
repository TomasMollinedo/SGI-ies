import { PrismaClient } from '../generated/prisma/client';
import {
  EstadoComercial,
  EstadoProyecto,
  ModalidadPago,
  OrigenCobro,
  TipologiaUnidad,
} from '../generated/prisma/enums';
import { RolNombre } from '../src/common/enums/rol.enum';
import { ejecutarSeed } from './seed-ejecutar';
import { mesesDesdeHoy } from './seed-fechas';
import { sembrarPlazos } from './seed-plazos';
import { sembrarProyecto } from './seed-proyectos';
import { numeroOperacion } from './seed-referencias';
import { PagoCuotaSeed, sembrarVenta } from './seed-ventas';

/**
 * Seed de prueba del Tablero del Gerente (HU-34): el historial de ventas de
 * 2025, el año anterior al en curso, para que el tablero tenga contra qué
 * comparar y se vea como el de una empresa con actividad.
 *
 * Por qué hace falta: `seed-comercializacion.ts` solo siembra cobros del año
 * en curso. Sin ingresos más viejos, el rango anterior de igual duración (el
 * que usa el tablero para la variación porcentual) queda en cero y todos los
 * indicadores muestran "sin datos del período anterior"; y sin volumen, el
 * ranking de proyectos de 2025 queda sin nombres.
 *
 * Siembra 8 proyectos Finalizados con 3 unidades cada uno, todas vendidas
 * entre enero y diciembre de 2025 (o sea, entre hace 21 y hace 10 meses,
 * contando desde octubre de 2026) y totalmente cobradas antes de fin de ese
 * año: cada cuota tiene su cobro confirmado, fechado el día de su
 * vencimiento. No siembra cobros del año en curso: esos son de
 * `seed-comercializacion`.
 *
 * Las ventas mezclan modalidades a propósito: de contado (un solo cobro
 * grande) y financiadas a 3 y a 6 cuotas. Los meses y las escalas de cada
 * proyecto están elegidos contra los egresos de Corralón de
 * `seed-cuenta-corriente-prueba.ts` para que 2025 cierre con unos $ 86 M de
 * ganancia, con pérdida en marzo, junio y septiembre. En 2026, el resultado
 * (unos $ 100 M, con pérdida en enero, mayo, julio y septiembre) sale de los
 * ingresos de `seed-comercializacion` y de las compras puntuales de ese
 * mismo seed de Corralón. Si se cambia cualquiera de los tres, hay que volver
 * a calcularlo.
 *
 * Los proyectos son de distinta escala (factor sobre el costo de cada
 * tipología) y los clientes compran en cantidades distintas, para que los
 * dos rankings no salgan parejos. Los costos son de viviendas económicas, más
 * bajos que los de los otros seeds, para que el volumen total entre en los
 * egresos de 2025.
 *
 * Requiere que hayan corrido `prisma/seed.ts`, `seed-cuenta-corriente-prueba`
 * y `seed-comercializacion` (usa a sus clientes y las formas de pago).
 * Es 100% idempotente (cada pieza se busca antes de crearse): correr
 *   npm run seed:tablero
 * las veces que haga falta no duplica datos. Pero tampoco corrige datos de una
 * versión anterior de este seed: las ventas ya sembradas se dejan como están.
 * Para rehacerlas hay que partir de una base limpia (`migrate reset`). Las
 * fechas son relativas a hoy (`seed-fechas.ts`).
 */

const COSTO_POR_TIPOLOGIA: Partial<Record<TipologiaUnidad, number>> = {
  [TipologiaUnidad.UN_DORMITORIO]: 10_000_000,
  [TipologiaUnidad.DOS_DORMITORIOS]: 14_000_000,
  [TipologiaUnidad.TRES_DORMITORIOS]: 20_000_000,
};
const SUPERFICIE_POR_TIPOLOGIA: Partial<Record<TipologiaUnidad, number>> = {
  [TipologiaUnidad.UN_DORMITORIO]: 45,
  [TipologiaUnidad.DOS_DORMITORIOS]: 62,
  [TipologiaUnidad.TRES_DORMITORIOS]: 85,
};
const TIPOLOGIAS = [
  TipologiaUnidad.UN_DORMITORIO,
  TipologiaUnidad.DOS_DORMITORIOS,
  TipologiaUnidad.TRES_DORMITORIOS,
];

const ANTICIPO_PORCENTAJE = 30;

/**
 * Cuántas cuotas tiene la financiación; 0 es una venta de contado. No hay
 * plan de 12: tendría cuotas en 2026, y este seed es solo de 2025.
 */
type CuotasVenta = 0 | 3 | 6;

interface VentaHistorica {
  /** Meses atrás (respecto de hoy) en que se vendió la unidad. */
  mesesAtras: number;
  cuotas: CuotasVenta;
}

interface ProyectoHistorico {
  nombre: string;
  localidad: string;
  direccion: string;
  /** Multiplica el costo de cada tipología: la escala de importes del proyecto. */
  factorCosto: number;
  /** Cómo se vendió cada una de sus 3 unidades, en el orden de `TIPOLOGIAS`. */
  ventas: [VentaHistorica, VentaHistorica, VentaHistorica];
}

const PROYECTOS_HISTORICOS: ProyectoHistorico[] = [
  {
    nombre: 'Torre Sarmiento',
    localidad: 'Resistencia, Chaco',
    direccion: 'Av. Sarmiento 1450',
    factorCosto: 0.8,
    ventas: [
      { mesesAtras: 15, cuotas: 0 },
      { mesesAtras: 18, cuotas: 0 },
      { mesesAtras: 10, cuotas: 0 },
    ],
  },
  {
    nombre: 'Edificio Las Palmeras',
    localidad: 'Resistencia, Chaco',
    direccion: 'Av. Sarmiento 850',
    factorCosto: 0.6,
    ventas: [
      { mesesAtras: 18, cuotas: 0 },
      { mesesAtras: 20, cuotas: 3 },
      { mesesAtras: 17, cuotas: 6 },
    ],
  },
  {
    nombre: 'Altos de la Costanera',
    localidad: 'Resistencia, Chaco',
    direccion: 'Av. Costanera 300',
    factorCosto: 0.5,
    ventas: [
      { mesesAtras: 15, cuotas: 3 },
      { mesesAtras: 15, cuotas: 0 },
      { mesesAtras: 11, cuotas: 0 },
    ],
  },
  {
    nombre: 'Residencial Las Acacias',
    localidad: 'Resistencia, Chaco',
    direccion: 'Av. Alberdi 2400',
    factorCosto: 0.5,
    ventas: [
      { mesesAtras: 20, cuotas: 0 },
      { mesesAtras: 12, cuotas: 0 },
      { mesesAtras: 20, cuotas: 0 },
    ],
  },
  {
    nombre: 'Barrio Santa Lucía',
    localidad: 'Barranqueras, Chaco',
    direccion: 'Calle 14 y Av. Italia',
    factorCosto: 0.4,
    ventas: [
      { mesesAtras: 17, cuotas: 0 },
      { mesesAtras: 18, cuotas: 6 },
      { mesesAtras: 21, cuotas: 0 },
    ],
  },
  {
    nombre: 'Loteo Los Algarrobos',
    localidad: 'Fontana, Chaco',
    direccion: 'Ruta 11 Km 6',
    factorCosto: 0.3,
    ventas: [
      { mesesAtras: 14, cuotas: 3 },
      { mesesAtras: 21, cuotas: 0 },
      { mesesAtras: 19, cuotas: 6 },
    ],
  },
  {
    nombre: 'Casas del Parque',
    localidad: 'Resistencia, Chaco',
    direccion: 'Calle Güemes 780',
    factorCosto: 0.3,
    ventas: [
      { mesesAtras: 20, cuotas: 6 },
      { mesesAtras: 12, cuotas: 0 },
      { mesesAtras: 17, cuotas: 3 },
    ],
  },
  {
    nombre: 'Complejo Villa Elisa',
    localidad: 'Resistencia, Chaco',
    direccion: 'Calle Brown 1900',
    factorCosto: 0.3,
    ventas: [
      { mesesAtras: 18, cuotas: 6 },
      { mesesAtras: 15, cuotas: 3 },
      { mesesAtras: 14, cuotas: 0 },
    ],
  },
];

/**
 * Quién compra cada venta, en el orden en que se siembran (vuelve a empezar
 * al terminar). Repetido a propósito en distinta medida: Valentina y Braian
 * compran más que el resto, así el ranking de clientes tiene un orden claro.
 * Camila no figura: es la clienta sin DNI que no compró (ver
 * `seed-comercializacion`).
 */
const EMAILS_CLIENTES = [
  'valentina.roldan.demo@gmail.com',
  'braian.sosa.demo@gmail.com',
  'valentina.roldan.demo@gmail.com',
  'emiliano.duarte.demo@gmail.com',
  'micaela.benitez.demo@gmail.com',
  'valentina.roldan.demo@gmail.com',
  'braian.sosa.demo@gmail.com',
  'rodrigo.acosta.demo@gmail.com',
  'emiliano.duarte.demo@gmail.com',
  'valentina.roldan.demo@gmail.com',
  'braian.sosa.demo@gmail.com',
  'micaela.benitez.demo@gmail.com',
];

export async function sembrarTablero(prisma: PrismaClient) {
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

  const plazoPorCuotas = await sembrarPlazos(prisma, idAdministrador);
  const plazoDe = (cuotas: number) => {
    const plazo = plazoPorCuotas.get(cuotas);
    if (!plazo) throw new Error(`No hay un plazo sembrado de ${cuotas} cuotas`);
    return plazo;
  };

  const { id_forma_pago: idTransferencia } =
    await prisma.fORMAPAGO.findFirstOrThrow({
      where: { nombre: 'Transferencia bancaria' },
      select: { id_forma_pago: true },
    });

  const clientes = await prisma.cLIENTE.findMany({
    where: { email: { in: EMAILS_CLIENTES } },
    select: { id_cliente: true, email: true },
  });
  const idClientePorEmail = new Map(
    clientes.map((c) => [c.email, c.id_cliente]),
  );

  /**
   * Paga completas, por transferencia, las cuotas ya vencidas: el anticipo
   * (cuota 0, o el precio entero si es de contado) y una por cada mes
   * transcurrido desde la venta, hasta la última. Cobrar una cuota futura es
   * un error del seed (`registrarCobro`).
   */
  const pagosVencidos = (
    referencia: string,
    cuotas: CuotasVenta,
    mesesDesdeLaVenta: number,
  ): PagoCuotaSeed[] =>
    Array.from(
      { length: Math.min(cuotas, mesesDesdeLaVenta) + 1 },
      (_, numero) => ({
        numero_cuota: numero,
        origen: OrigenCobro.PRESENCIAL,
        FK_forma_pago: idTransferencia,
        numero_referencia: numeroOperacion(`${referencia}-${numero}`),
      }),
    );

  let ventas = 0;
  for (const [indiceProyecto, datos] of PROYECTOS_HISTORICOS.entries()) {
    // Con alguna venta todavía pagando cuotas, la obra sigue en marcha.
    const todasPagadas = datos.ventas.every(
      (venta) => venta.mesesAtras >= venta.cuotas,
    );
    const proyecto = await sembrarProyecto(
      prisma,
      {
        nombre: datos.nombre,
        descripcion: null,
        localidad: datos.localidad,
        direccion: datos.direccion,
        estado_obra: todasPagadas
          ? EstadoProyecto.FINALIZADO
          : EstadoProyecto.EN_EJECUCION,
        fecha_inicio: null,
        fecha_fin_estimada: null,
        cantidad_unidades_planificadas: TIPOLOGIAS.length,
        portada: null,
        imagenes: [],
      },
      idAdministrador,
    );

    for (const [indice, tipologia] of TIPOLOGIAS.entries()) {
      const identificador = `U${indice + 1}`;
      const costo = Math.round(
        COSTO_POR_TIPOLOGIA[tipologia]! * datos.factorCosto,
      );
      const precio = Math.round(costo * 1.3);
      const { mesesAtras, cuotas } = datos.ventas[indice];
      // Sin saldo (todas las cuotas ya vencieron y se cobraron) queda Vendida.
      const pagada = mesesAtras >= cuotas;

      const unidad =
        (await prisma.uNIDADFUNCIONAL.findFirst({
          where: {
            FK_proyecto: proyecto.id_proyecto,
            identificador,
          },
        })) ??
        (await prisma.uNIDADFUNCIONAL.create({
          data: {
            FK_proyecto: proyecto.id_proyecto,
            identificador,
            tipologia,
            superficie_cubierta: SUPERFICIE_POR_TIPOLOGIA[tipologia]!,
            costo,
            ...auditoria,
          },
        }));

      const publicacion =
        (await prisma.pUBLICACIONUNIDAD.findFirst({
          where: { FK_unidad_funcional: unidad.id_unidad_funcional },
        })) ??
        (await prisma.pUBLICACIONUNIDAD.create({
          data: {
            FK_unidad_funcional: unidad.id_unidad_funcional,
            estado_comercial: pagada
              ? EstadoComercial.VENDIDA
              : EstadoComercial.EN_PLAN_DE_PAGO,
            fecha_publicacion: mesesDesdeHoy(-mesesAtras - 1),
            precio_lista: precio,
            porcentaje_ganancia: 30,
            ...auditoria,
          },
        }));

      const email = EMAILS_CLIENTES[ventas % EMAILS_CLIENTES.length];
      const idCliente = idClientePorEmail.get(email);
      if (idCliente === undefined) {
        throw new Error(
          `No existe el cliente ${email}: corré antes seed-comercializacion`,
        );
      }

      await sembrarVenta(
        prisma,
        {
          FK_cliente: idCliente,
          FK_publicacion: publicacion.id_publicacion,
          fecha_venta: mesesDesdeHoy(-mesesAtras),
          precio,
          ...(cuotas === 0
            ? { modalidad: ModalidadPago.CONTADO }
            : {
                modalidad: ModalidadPago.FINANCIADO,
                anticipo_porcentaje: ANTICIPO_PORCENTAJE,
                plazo: plazoDe(cuotas),
              }),
          pagos: pagosVencidos(
            `TBL-${indiceProyecto + 1}-${identificador}`,
            cuotas,
            mesesAtras,
          ),
        },
        idAdministrador,
      );
      ventas++;
    }
  }

  console.log(
    `Seed tablero - ${PROYECTOS_HISTORICOS.length} proyectos y ${ventas} ventas (de contado y financiadas), con sus cuotas vencidas cobradas, procesados.`,
  );
}

// Corrido suelto (`npm run seed:tablero`); desde `seed-prueba.ts` solo se importa.
if (require.main === module) ejecutarSeed(sembrarTablero);
