import { PrismaClient } from '../generated/prisma/client';
import { EstadoProyecto, TipologiaUnidad } from '../generated/prisma/enums';
import { RolNombre } from '../src/common/enums/rol.enum';
import { TipoAlertaNombre } from '../src/common/enums/tipo-alerta.enum';
import { ejecutarSeed } from './seed-ejecutar';
import { diasDesdeHoy } from './seed-fechas';
import { ProyectoSeed, sembrarProyecto } from './seed-proyectos';

/**
 * Seed de muestra de Almacén: llena la base con un juego de datos chico pero
 * realista (una constructora con un depósito central y tres obradores) para
 * poder mostrar Almacén funcionando end to end: catálogos, artículos, fichas
 * de stock, movimientos y alertas de reposición.
 *
 * Va encima de `prisma/seed.ts` (roles, usuarios y tipo de alerta), que
 * tiene que haber corrido antes. Queda aparte de `npm run seed:prueba`
 * porque los movimientos no son idempotentes:
 *   npm run seed:muestra            -> falla si ya hay artículos o movimientos
 *   npm run seed:muestra -- --reset -> borra el stock y lo recrea
 *
 * `--reset` solo borra lo que es exclusivo de este script (artículos, fichas,
 * movimientos y alertas de reposición). Catálogos, depósitos y proyectos se
 * buscan por nombre y se reutilizan, así que no pisa nada de los otros seeds.
 *
 * Como en los demás seeds de prueba: todo queda a nombre del Administrador
 * (dueño de los endpoints de Almacén y de Proyectos), las fechas son
 * relativas a hoy y las alertas se generan con el criterio de
 * `MovimientoService`.
 */

export const tiposMovimiento = [
  {
    nombre: 'Ajuste de inventario inicial',
    descripcion: 'Carga del stock existente al poner en marcha el sistema',
    indicador_entrada: true,
    estado: true,
  },
  {
    nombre: 'Entrada por compra',
    descripcion: 'Recepción de mercadería de un proveedor',
    indicador_entrada: true,
    estado: true,
  },
  {
    nombre: 'Devolución de obra',
    descripcion: 'Material sobrante que vuelve del obrador al depósito',
    indicador_entrada: true,
    estado: true,
  },
  {
    nombre: 'Salida por consumo',
    descripcion: 'Material entregado a una obra para su consumo',
    indicador_entrada: false,
    estado: true,
  },
  {
    nombre: 'Salida por transferencia',
    descripcion: 'Envío de material a otro depósito u obrador',
    indicador_entrada: false,
    estado: true,
  },
  {
    nombre: 'Baja por rotura o deterioro',
    descripcion: 'Material descartado por rotura, vencimiento o deterioro',
    indicador_entrada: false,
    // Dado de baja a propósito: sirve para mostrar que un tipo inactivo no se
    // puede usar en movimientos nuevos.
    estado: false,
  },
];

const categorias = [
  { nombre: 'Áridos', descripcion: 'Arena, piedra y materiales a granel' },
  {
    nombre: 'Cemento y Morteros',
    descripcion: 'Cementos, cales y morteros premezclados',
  },
  {
    nombre: 'Hierro y Acero',
    descripcion: 'Barras, mallas y perfiles para estructura',
  },
  { nombre: 'Mampostería', descripcion: 'Ladrillos, bloques y bovedillas' },
  {
    nombre: 'Impermeabilización',
    descripcion: 'Membranas, selladores y pinturas asfálticas',
  },
  {
    nombre: 'Herramientas',
    descripcion: 'Herramientas manuales y eléctricas de obra',
  },
  { nombre: 'Electricidad', descripcion: 'Cables, cajas y accesorios' },
  { nombre: 'Sanitarios', descripcion: 'Caños, accesorios y grifería' },
  { nombre: 'Pinturas', descripcion: 'Látex, esmaltes, fondos y diluyentes' },
  {
    nombre: 'Seguridad e Higiene',
    descripcion: 'Elementos de protección personal',
  },
  {
    nombre: 'Carpintería metálica',
    descripcion: 'Aberturas de aluminio y chapa',
    // Sin artículos y dada de baja: muestra el estado "inactivo" del ABM.
    estado: false,
  },
];

const marcas = [
  { nombre: 'Genérica', descripcion: 'Sin marca definida' },
  { nombre: 'Loma Negra', descripcion: 'Cementos y cales' },
  { nombre: 'Cementos Avellaneda', descripcion: 'Cementos y cales' },
  { nombre: 'Acindar', descripcion: 'Hierro y acero para construcción' },
  { nombre: 'Sika', descripcion: 'Químicos e impermeabilizantes' },
  { nombre: 'Stanley', descripcion: 'Herramientas manuales y eléctricas' },
  { nombre: 'Tigre', descripcion: 'Caños y accesorios sanitarios' },
  { nombre: 'Sherwin Williams', descripcion: 'Pinturas y revestimientos' },
  {
    nombre: 'Ferrum',
    descripcion: 'Sanitarios (proveedor discontinuado)',
    estado: false,
  },
];

const unidadesMedida = [
  { nombre: 'Unidad', abreviatura: 'un' },
  { nombre: 'Kilogramo', abreviatura: 'kg' },
  { nombre: 'Litro', abreviatura: 'l' },
  { nombre: 'Metro', abreviatura: 'm' },
  { nombre: 'Metro cúbico', abreviatura: 'm3' },
  { nombre: 'Bolsa', abreviatura: 'bol' },
  { nombre: 'Barra', abreviatura: 'bar' },
  { nombre: 'Rollo', abreviatura: 'rol' },
];

/**
 * Los depósitos vinculados a un proyecto usan el índice de `proyectosMuestra`
 * (0-based). `null` = depósito propio de la empresa.
 */
export const depositos = [
  {
    nombre: 'Depósito Central',
    es_obrador: false,
    ubicacion: 'Av. Colón 1450, Córdoba',
    descripcion: 'Depósito principal de la empresa',
    estado: true,
    proyecto: null,
  },
  {
    nombre: 'Obrador Torre Belgrano',
    es_obrador: true,
    ubicacion: 'Belgrano 780, Córdoba',
    descripcion: 'Obrador de la torre de 12 pisos en barrio Alberdi',
    estado: true,
    proyecto: 0,
  },
  {
    nombre: 'Obrador Barrio Los Tilos',
    es_obrador: true,
    ubicacion: 'Ruta Nacional 9, Km 42, Malagueño',
    descripcion: 'Obrador del loteo de casas de Barrio Los Tilos',
    estado: true,
    proyecto: 1,
  },
  {
    nombre: 'Obrador Barrio Sur',
    es_obrador: true,
    ubicacion: 'Pasaje Sucre 240, Córdoba',
    descripcion: 'Obrador cerrado al finalizar la obra',
    estado: false,
    proyecto: 2,
  },
];

const articulos = [
  {
    nombre: 'Cemento Portland CP40 50 kg',
    descripcion: 'Bolsa de cemento de uso general',
    categoria: 'Cemento y Morteros',
    marca: 'Loma Negra',
    unidad: 'Bolsa',
  },
  {
    nombre: 'Cal hidratada 25 kg',
    descripcion: 'Cal para morteros de asiento y revoques',
    categoria: 'Cemento y Morteros',
    marca: 'Cementos Avellaneda',
    unidad: 'Bolsa',
  },
  {
    nombre: 'Arena fina',
    descripcion: 'Arena lavada para revoque fino',
    categoria: 'Áridos',
    marca: null,
    unidad: 'Metro cúbico',
  },
  {
    nombre: 'Piedra partida 6-20',
    descripcion: 'Agregado grueso para hormigón',
    categoria: 'Áridos',
    marca: null,
    unidad: 'Metro cúbico',
  },
  {
    nombre: 'Hierro aletado 8 mm x 12 m',
    descripcion: 'Barra conformada para armadura',
    categoria: 'Hierro y Acero',
    marca: 'Acindar',
    unidad: 'Barra',
  },
  {
    nombre: 'Hierro aletado 10 mm x 12 m',
    descripcion: 'Barra conformada para armadura',
    categoria: 'Hierro y Acero',
    marca: 'Acindar',
    unidad: 'Barra',
  },
  {
    nombre: 'Malla Sima Q188 2x6 m',
    descripcion: 'Malla electrosoldada para losas y contrapisos',
    categoria: 'Hierro y Acero',
    marca: 'Acindar',
    unidad: 'Unidad',
  },
  {
    nombre: 'Ladrillo hueco 12x18x33',
    descripcion: 'Ladrillo cerámico portante',
    categoria: 'Mampostería',
    marca: 'Genérica',
    unidad: 'Unidad',
  },
  {
    nombre: 'Membrana asfáltica 4 mm x 10 m',
    descripcion: 'Rollo con terminación en aluminio',
    categoria: 'Impermeabilización',
    marca: 'Sika',
    unidad: 'Rollo',
  },
  {
    nombre: 'Sellador poliuretánico 300 ml',
    descripcion: 'Cartucho para juntas de dilatación',
    categoria: 'Impermeabilización',
    marca: 'Sika',
    unidad: 'Unidad',
  },
  {
    nombre: 'Amoladora angular 4 1/2"',
    descripcion: 'Amoladora de 850 W',
    categoria: 'Herramientas',
    marca: 'Stanley',
    unidad: 'Unidad',
  },
  {
    nombre: 'Juego de destornilladores 6 piezas',
    descripcion: 'Puntas planas y Phillips',
    categoria: 'Herramientas',
    marca: 'Stanley',
    unidad: 'Unidad',
  },
  {
    nombre: 'Cable unipolar 2,5 mm2',
    descripcion: 'Cable de cobre para instalación domiciliaria',
    categoria: 'Electricidad',
    marca: 'Genérica',
    unidad: 'Metro',
  },
  {
    nombre: 'Caja de embutir 10x5',
    descripcion: 'Caja rectangular de chapa',
    categoria: 'Electricidad',
    marca: 'Genérica',
    unidad: 'Unidad',
  },
  {
    nombre: 'Caño PVC 110 mm x 4 m',
    descripcion: 'Caño para desagüe cloacal',
    categoria: 'Sanitarios',
    marca: 'Tigre',
    unidad: 'Unidad',
  },
  {
    nombre: 'Látex interior 20 L',
    descripcion: 'Pintura látex lavable color blanco',
    categoria: 'Pinturas',
    marca: 'Sherwin Williams',
    unidad: 'Unidad',
  },
  {
    nombre: 'Casco de seguridad',
    descripcion: 'Casco con arnés regulable, norma IRAM',
    categoria: 'Seguridad e Higiene',
    marca: 'Genérica',
    unidad: 'Unidad',
  },
  {
    nombre: 'Guantes de puño reforzados',
    descripcion: 'Par de guantes de descarne',
    categoria: 'Seguridad e Higiene',
    marca: 'Genérica',
    unidad: 'Unidad',
  },
  {
    nombre: 'Bovedilla de telgopor',
    descripcion: 'Artículo discontinuado, reemplazado por bloque cerámico',
    categoria: 'Mampostería',
    marca: 'Genérica',
    unidad: 'Unidad',
    // Dado de baja: muestra el filtro por estado en el ABM de artículos.
    estado: false,
  },
];

/**
 * Fichas de stock. `inicial` es la cantidad que se carga con el movimiento de
 * inventario inicial, no un valor escrito a mano sobre STOCK: el stock final
 * de cada ficha lo determina la simulación de movimientos de más abajo.
 */
export const fichasStock = [
  // Depósito Central
  {
    deposito: 'Depósito Central',
    articulo: 'Cemento Portland CP40 50 kg',
    inicial: 400,
    umbral: 100,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Cal hidratada 25 kg',
    inicial: 180,
    umbral: 50,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Arena fina',
    inicial: 45,
    umbral: 15,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Piedra partida 6-20',
    inicial: 60,
    umbral: 20,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Hierro aletado 8 mm x 12 m',
    inicial: 320,
    umbral: 80,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Hierro aletado 10 mm x 12 m',
    inicial: 240,
    umbral: 80,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Malla Sima Q188 2x6 m',
    inicial: 90,
    umbral: 25,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Ladrillo hueco 12x18x33',
    inicial: 6000,
    umbral: 1500,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Membrana asfáltica 4 mm x 10 m',
    inicial: 40,
    umbral: 12,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Sellador poliuretánico 300 ml',
    inicial: 70,
    umbral: 20,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Amoladora angular 4 1/2"',
    inicial: 8,
    umbral: 2,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Juego de destornilladores 6 piezas',
    inicial: 15,
    umbral: 4,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Cable unipolar 2,5 mm2',
    inicial: 1200,
    umbral: 300,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Caja de embutir 10x5',
    inicial: 350,
    umbral: 100,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Caño PVC 110 mm x 4 m',
    inicial: 55,
    umbral: 15,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Látex interior 20 L',
    inicial: 36,
    umbral: 10,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Casco de seguridad',
    inicial: 60,
    umbral: 20,
  },
  {
    deposito: 'Depósito Central',
    articulo: 'Guantes de puño reforzados',
    inicial: 120,
    umbral: 40,
  },

  // Obrador Torre Belgrano
  {
    deposito: 'Obrador Torre Belgrano',
    articulo: 'Cemento Portland CP40 50 kg',
    inicial: 120,
    umbral: 60,
  },
  {
    deposito: 'Obrador Torre Belgrano',
    articulo: 'Cal hidratada 25 kg',
    inicial: 60,
    umbral: 25,
  },
  {
    deposito: 'Obrador Torre Belgrano',
    articulo: 'Arena fina',
    inicial: 12,
    umbral: 6,
  },
  {
    deposito: 'Obrador Torre Belgrano',
    articulo: 'Hierro aletado 8 mm x 12 m',
    inicial: 90,
    umbral: 40,
  },
  {
    deposito: 'Obrador Torre Belgrano',
    articulo: 'Ladrillo hueco 12x18x33',
    inicial: 2200,
    umbral: 800,
  },
  {
    deposito: 'Obrador Torre Belgrano',
    articulo: 'Casco de seguridad',
    inicial: 25,
    umbral: 10,
  },
  {
    deposito: 'Obrador Torre Belgrano',
    articulo: 'Guantes de puño reforzados',
    inicial: 40,
    umbral: 20,
  },
  {
    deposito: 'Obrador Torre Belgrano',
    articulo: 'Látex interior 20 L',
    inicial: 10,
    umbral: 4,
  },

  // Obrador Barrio Los Tilos
  {
    deposito: 'Obrador Barrio Los Tilos',
    articulo: 'Cemento Portland CP40 50 kg',
    inicial: 150,
    umbral: 80,
  },
  {
    deposito: 'Obrador Barrio Los Tilos',
    articulo: 'Piedra partida 6-20',
    inicial: 30,
    umbral: 12,
  },
  {
    deposito: 'Obrador Barrio Los Tilos',
    articulo: 'Malla Sima Q188 2x6 m',
    inicial: 40,
    umbral: 20,
  },
  {
    deposito: 'Obrador Barrio Los Tilos',
    articulo: 'Sellador poliuretánico 300 ml',
    inicial: 24,
    umbral: 10,
  },
  {
    deposito: 'Obrador Barrio Los Tilos',
    articulo: 'Casco de seguridad',
    inicial: 18,
    umbral: 8,
  },
  {
    deposito: 'Obrador Barrio Los Tilos',
    articulo: 'Cable unipolar 2,5 mm2',
    inicial: 0,
    umbral: 100,
    // Ficha dada de baja: el obrador dejó de manejar material eléctrico.
    estado: false,
  },
];

interface LineaMuestra {
  articulo: string;
  cantidad: number;
  observacion?: string;
}

interface MovimientoMuestra {
  /** Días respecto de hoy (negativo = pasado). */
  dias: number;
  tipo: string;
  deposito: string;
  referencia: string;
  observaciones?: string;
  detalle: LineaMuestra[];
}

/**
 * Movimientos posteriores al inventario inicial, en orden cronológico. Las
 * cantidades están pensadas para que ninguna salida deje una ficha en
 * negativo y para que unas pocas terminen debajo de su umbral, que es lo que
 * dispara las alertas de reposición.
 */
export const movimientos: MovimientoMuestra[] = [
  {
    dias: -85,
    tipo: 'Entrada por compra',
    deposito: 'Depósito Central',
    referencia: 'REM-0001-00012345',
    observaciones: 'Compra mensual de cemento y cal',
    detalle: [
      { articulo: 'Cemento Portland CP40 50 kg', cantidad: 300 },
      { articulo: 'Cal hidratada 25 kg', cantidad: 120 },
    ],
  },
  {
    dias: -82,
    tipo: 'Salida por transferencia',
    deposito: 'Depósito Central',
    referencia: 'TR-0014',
    observaciones: 'Envío a Obrador Torre Belgrano',
    detalle: [
      { articulo: 'Cemento Portland CP40 50 kg', cantidad: 200 },
      { articulo: 'Ladrillo hueco 12x18x33', cantidad: 2500 },
      { articulo: 'Hierro aletado 8 mm x 12 m', cantidad: 120 },
    ],
  },
  {
    dias: -81,
    tipo: 'Entrada por compra',
    deposito: 'Obrador Torre Belgrano',
    referencia: 'TR-0014',
    observaciones: 'Recepción de la transferencia del depósito central',
    detalle: [
      { articulo: 'Cemento Portland CP40 50 kg', cantidad: 200 },
      { articulo: 'Ladrillo hueco 12x18x33', cantidad: 2500 },
      { articulo: 'Hierro aletado 8 mm x 12 m', cantidad: 120 },
    ],
  },
  {
    dias: -74,
    tipo: 'Salida por consumo',
    deposito: 'Obrador Torre Belgrano',
    referencia: 'VP-0103',
    observaciones: 'Mampostería de los pisos 3 y 4',
    detalle: [
      { articulo: 'Ladrillo hueco 12x18x33', cantidad: 3800 },
      { articulo: 'Cemento Portland CP40 50 kg', cantidad: 180 },
      {
        articulo: 'Cal hidratada 25 kg',
        cantidad: 45,
        observacion: 'Mortero de asiento',
      },
      { articulo: 'Arena fina', cantidad: 6 },
    ],
  },
  {
    dias: -69,
    tipo: 'Salida por consumo',
    deposito: 'Depósito Central',
    referencia: 'VP-0108',
    observaciones: 'Armado de columnas para Barrio Los Tilos',
    detalle: [
      { articulo: 'Hierro aletado 10 mm x 12 m', cantidad: 180 },
      { articulo: 'Hierro aletado 8 mm x 12 m', cantidad: 100 },
      { articulo: 'Piedra partida 6-20', cantidad: 25 },
    ],
  },
  {
    dias: -63,
    tipo: 'Salida por consumo',
    deposito: 'Obrador Barrio Los Tilos',
    referencia: 'VP-0111',
    observaciones: 'Plateas de las primeras casas',
    detalle: [
      { articulo: 'Malla Sima Q188 2x6 m', cantidad: 26 },
      { articulo: 'Cemento Portland CP40 50 kg', cantidad: 90 },
      { articulo: 'Piedra partida 6-20', cantidad: 22 },
    ],
  },
  {
    dias: -57,
    tipo: 'Entrada por compra',
    deposito: 'Depósito Central',
    referencia: 'REM-0002-00003391',
    observaciones: 'Reposición de elementos de protección personal',
    detalle: [
      { articulo: 'Casco de seguridad', cantidad: 40 },
      { articulo: 'Guantes de puño reforzados', cantidad: 100 },
    ],
  },
  {
    dias: -53,
    tipo: 'Salida por consumo',
    deposito: 'Depósito Central',
    referencia: 'VP-0122',
    observaciones: 'Instalación eléctrica de la torre',
    detalle: [
      { articulo: 'Cable unipolar 2,5 mm2', cantidad: 950 },
      { articulo: 'Caja de embutir 10x5', cantidad: 230 },
    ],
  },
  {
    dias: -48,
    tipo: 'Devolución de obra',
    deposito: 'Depósito Central',
    referencia: 'DEV-0005',
    observaciones: 'Sobrante de la obra de Barrio Sur',
    detalle: [
      { articulo: 'Membrana asfáltica 4 mm x 10 m', cantidad: 6 },
      {
        articulo: 'Sellador poliuretánico 300 ml',
        cantidad: 12,
        observacion: 'Cartuchos sin abrir',
      },
      { articulo: 'Amoladora angular 4 1/2"', cantidad: 2 },
    ],
  },
  {
    dias: -42,
    tipo: 'Salida por consumo',
    deposito: 'Depósito Central',
    referencia: 'VP-0126',
    observaciones: 'Impermeabilización de azotea',
    detalle: [
      { articulo: 'Membrana asfáltica 4 mm x 10 m', cantidad: 34 },
      { articulo: 'Sellador poliuretánico 300 ml', cantidad: 65 },
    ],
  },
  {
    dias: -39,
    tipo: 'Salida por consumo',
    deposito: 'Obrador Torre Belgrano',
    referencia: 'VP-0129',
    observaciones: 'Pintura de los departamentos del piso 2',
    detalle: [
      { articulo: 'Látex interior 20 L', cantidad: 6 },
      { articulo: 'Guantes de puño reforzados', cantidad: 26 },
    ],
  },
  {
    dias: -35,
    tipo: 'Salida por consumo',
    deposito: 'Obrador Barrio Los Tilos',
    referencia: 'VP-0132',
    observaciones: 'Sellado de juntas de las veredas',
    detalle: [
      { articulo: 'Sellador poliuretánico 300 ml', cantidad: 14 },
      { articulo: 'Cemento Portland CP40 50 kg', cantidad: 40 },
    ],
  },
  {
    dias: -33,
    tipo: 'Entrada por compra',
    deposito: 'Obrador Barrio Los Tilos',
    referencia: 'REM-0002-00003512',
    observaciones: 'Compra directa del proveedor a pie de obra',
    detalle: [{ articulo: 'Piedra partida 6-20', cantidad: 18 }],
  },
];

/** Clave con la que se indexa una ficha de stock: depósito + artículo. */
function claveFicha(deposito: string, articulo: string) {
  return `${deposito}::${articulo}`;
}

/**
 * Los proyectos de los obradores, como los deja el ABM de Proyecto
 * (`sembrarProyecto`: código `PROY-NNNN`, idempotente por nombre, fechas a la
 * medianoche de Argentina). Cada uno tiene unidades funcionales cargadas:
 * el servicio no deja pasar a En ejecución un proyecto sin unidades. Las
 * unidades no se publican: la parte comercial la siembra
 * `seed-comercializacion.ts`.
 */
const proyectosMuestra: (ProyectoSeed & {
  unidades: {
    identificador: string;
    tipologia: TipologiaUnidad;
    superficie_cubierta: number;
    piso?: string;
    costo: number;
  }[];
})[] = [
  {
    nombre: 'Torre Belgrano',
    descripcion: 'Torre de 12 pisos con 4 departamentos por piso.',
    localidad: 'Córdoba, Córdoba',
    direccion: 'Belgrano 780, Córdoba',
    estado_obra: EstadoProyecto.EN_EJECUCION,
    fecha_inicio: '2025-11-01',
    fecha_fin_estimada: '2027-04-01',
    cantidad_unidades_planificadas: 48,
    portada: null,
    imagenes: [],
    unidades: [
      {
        identificador: '1-A',
        tipologia: TipologiaUnidad.UN_DORMITORIO,
        superficie_cubierta: 42,
        piso: '1',
        costo: 16_000_000,
      },
      {
        identificador: '1-B',
        tipologia: TipologiaUnidad.DOS_DORMITORIOS,
        superficie_cubierta: 58,
        piso: '1',
        costo: 21_000_000,
      },
      {
        identificador: '2-A',
        tipologia: TipologiaUnidad.UN_DORMITORIO,
        superficie_cubierta: 42,
        piso: '2',
        costo: 16_500_000,
      },
    ],
  },
  {
    nombre: 'Barrio Los Tilos',
    descripcion: 'Loteo de casas de 2 y 3 dormitorios sobre la Ruta 9.',
    localidad: 'Malagueño, Córdoba',
    direccion: 'Ruta Nacional 9, Km 42',
    estado_obra: EstadoProyecto.EN_EJECUCION,
    fecha_inicio: '2026-02-01',
    fecha_fin_estimada: '2027-08-01',
    cantidad_unidades_planificadas: 30,
    portada: null,
    imagenes: [],
    unidades: [
      {
        identificador: 'LOTE-01',
        tipologia: TipologiaUnidad.DOS_DORMITORIOS,
        superficie_cubierta: 70,
        costo: 28_000_000,
      },
      {
        identificador: 'LOTE-02',
        tipologia: TipologiaUnidad.TRES_DORMITORIOS,
        superficie_cubierta: 92,
        costo: 36_000_000,
      },
    ],
  },
  {
    nombre: 'Barrio Sur',
    descripcion: 'Barrio de 20 casas, ya entregado.',
    localidad: 'Córdoba, Córdoba',
    direccion: 'Pasaje Sucre 240, Córdoba',
    estado_obra: EstadoProyecto.FINALIZADO,
    fecha_inicio: '2024-08-01',
    fecha_fin_estimada: '2026-06-01',
    cantidad_unidades_planificadas: 20,
    portada: null,
    imagenes: [],
    unidades: [
      {
        identificador: 'CASA-01',
        tipologia: TipologiaUnidad.DOS_DORMITORIOS,
        superficie_cubierta: 65,
        costo: 24_000_000,
      },
      {
        identificador: 'CASA-02',
        tipologia: TipologiaUnidad.TRES_DORMITORIOS,
        superficie_cubierta: 85,
        costo: 31_000_000,
      },
    ],
  },
];

/**
 * Borra el stock que llena este script: alertas, movimientos, fichas y
 * artículos, en orden inverso al de las dependencias. No toca catálogos,
 * depósitos ni proyectos (se reutilizan por nombre), ni nada de los otros
 * seeds.
 */
async function limpiarStock(prisma: PrismaClient) {
  await prisma.aLERTA.deleteMany({
    where: { tipoAlerta: { nombre: TipoAlertaNombre.REPOSICION } },
  });
  await prisma.sTOCKMOVIMIENTO.deleteMany();
  await prisma.mOVIMIENTO.deleteMany();
  await prisma.sTOCK.deleteMany();
  await prisma.aRTICULO.deleteMany();
  console.log('Stock previo eliminado (--reset).');
}

export async function sembrarMuestra(prisma: PrismaClient) {
  const reset = process.argv.includes('--reset');

  const yaHayDatos =
    (await prisma.aRTICULO.count()) > 0 ||
    (await prisma.mOVIMIENTO.count()) > 0;

  if (yaHayDatos && !reset) {
    throw new Error(
      'La base ya tiene artículos o movimientos cargados. Volvé a correr con --reset ' +
        'para borrar el stock y recrear el juego de muestra.',
    );
  }
  if (reset) {
    await limpiarStock(prisma);
  }

  // Todos los endpoints de Almacén y de Proyectos son del rol Administrador:
  // la auditoría queda a su nombre, como en los demás seeds de prueba.
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

  // --- Catálogos -----------------------------------------------------------
  // Se buscan por nombre y se actualizan, igual que en `seed.ts`: varios
  // (Herramientas, Genérica, Stanley, Unidad, Depósito Central…) ya los crea
  // ese seed, y el nombre es único entre los activos.
  const idPorTipoMovimiento = new Map<string, number>();
  for (const tipo of tiposMovimiento) {
    const creado = await prisma.tIPOMOVIMIENTO.upsert({
      where: { nombre: tipo.nombre },
      update: tipo,
      create: { ...tipo, ...auditoria },
    });
    idPorTipoMovimiento.set(creado.nombre, creado.id_tipo_movimiento);
  }
  console.log(`TIPOMOVIMIENTO: ${tiposMovimiento.length} registros.`);

  const idPorCategoria = new Map<string, number>();
  for (const categoria of categorias) {
    const existente = await prisma.cATEGORIA.findFirst({
      where: { nombre: categoria.nombre },
    });
    const guardada = existente
      ? await prisma.cATEGORIA.update({
          where: { id_categoria: existente.id_categoria },
          data: categoria,
        })
      : await prisma.cATEGORIA.create({ data: { ...categoria, ...auditoria } });
    idPorCategoria.set(guardada.nombre, guardada.id_categoria);
  }
  console.log(`CATEGORIA: ${categorias.length} registros.`);

  const idPorMarca = new Map<string, number>();
  for (const marca of marcas) {
    const existente = await prisma.mARCA.findFirst({
      where: { nombre: marca.nombre },
    });
    const guardada = existente
      ? await prisma.mARCA.update({
          where: { id_marca: existente.id_marca },
          data: marca,
        })
      : await prisma.mARCA.create({ data: { ...marca, ...auditoria } });
    idPorMarca.set(guardada.nombre, guardada.id_marca);
  }
  console.log(`MARCA: ${marcas.length} registros.`);

  const idPorUnidad = new Map<string, number>();
  for (const unidad of unidadesMedida) {
    const existente = await prisma.uNIDADMEDIDA.findFirst({
      where: { nombre: unidad.nombre },
    });
    const guardada = existente
      ? await prisma.uNIDADMEDIDA.update({
          where: { id_unidad_medida: existente.id_unidad_medida },
          data: unidad,
        })
      : await prisma.uNIDADMEDIDA.create({ data: { ...unidad, ...auditoria } });
    idPorUnidad.set(guardada.nombre, guardada.id_unidad_medida);
  }
  console.log(`UNIDADMEDIDA: ${unidadesMedida.length} registros.`);

  // --- Proyectos y depósitos -----------------------------------------------
  const proyectos: number[] = [];
  for (const { unidades, ...datos } of proyectosMuestra) {
    const proyecto = await sembrarProyecto(prisma, datos, idAdministrador);
    proyectos.push(proyecto.id_proyecto);

    for (const unidad of unidades) {
      const existente = await prisma.uNIDADFUNCIONAL.findFirst({
        where: {
          FK_proyecto: proyecto.id_proyecto,
          identificador: unidad.identificador,
        },
      });
      if (existente) continue;

      await prisma.uNIDADFUNCIONAL.create({
        data: {
          ...unidad,
          FK_proyecto: proyecto.id_proyecto,
          ...auditoria,
        },
      });
    }
  }
  console.log(`PROYECTO: ${proyectosMuestra.length} registros.`);

  const idPorDeposito = new Map<string, number>();
  for (const { proyecto, ...deposito } of depositos) {
    const datos = {
      ...deposito,
      FK_Proyecto: proyecto === null ? null : proyectos[proyecto],
    };
    const existente = await prisma.dEPOSITO.findFirst({
      where: { nombre: deposito.nombre },
    });
    const guardado = existente
      ? await prisma.dEPOSITO.update({
          where: { id_deposito: existente.id_deposito },
          data: datos,
        })
      : await prisma.dEPOSITO.create({ data: { ...datos, ...auditoria } });
    idPorDeposito.set(guardado.nombre, guardado.id_deposito);
  }
  console.log(`DEPOSITO: ${depositos.length} registros.`);

  const idPorArticulo = new Map<string, number>();
  for (const { categoria, marca, unidad, ...articulo } of articulos) {
    const creado = await prisma.aRTICULO.create({
      data: {
        ...articulo,
        FK_Categoria: idPorCategoria.get(categoria)!,
        FK_Marca: marca === null ? null : idPorMarca.get(marca)!,
        FK_UnidadMedida: idPorUnidad.get(unidad)!,
        ...auditoria,
      },
    });
    idPorArticulo.set(creado.nombre, creado.id_articulo);
  }
  console.log(`ARTICULO: ${articulos.length} registros.`);

  // --- Fichas de stock -----------------------------------------------------
  // Arrancan en 0 (como cuando las crea el ABM) y la cantidad final la
  // determinan los movimientos que se simulan más abajo.
  interface FichaSimulada {
    id: number;
    cantidad: number;
    umbral: number;
    articulo: string;
    deposito: string;
    idArticulo: number;
    idDeposito: number;
    activa: boolean;
    /** La alerta de reposición abierta de la ficha, si tiene. */
    alertaAbierta: number | null;
  }
  const fichaPorClave = new Map<string, FichaSimulada>();
  for (const ficha of fichasStock) {
    const activa = ficha.estado ?? true;
    const idDeposito = idPorDeposito.get(ficha.deposito)!;
    const idArticulo = idPorArticulo.get(ficha.articulo)!;
    const creada = await prisma.sTOCK.create({
      data: {
        cantidad: 0,
        umbral_minimo: ficha.umbral,
        estado: activa,
        FK_deposito: idDeposito,
        FK_articulo: idArticulo,
        ...auditoria,
      },
    });
    fichaPorClave.set(claveFicha(ficha.deposito, ficha.articulo), {
      id: creada.id_stock,
      cantidad: 0,
      umbral: ficha.umbral,
      articulo: ficha.articulo,
      deposito: ficha.deposito,
      idArticulo,
      idDeposito,
      activa,
      alertaAbierta: null,
    });
  }
  console.log(`STOCK: ${fichasStock.length} fichas.`);

  // --- Movimientos y alertas -------------------------------------------------
  // El inventario inicial se arma como un movimiento de entrada por depósito,
  // en vez de escribir la cantidad directo sobre STOCK: así el stock actual de
  // cada ficha siempre se explica por su historial de movimientos, igual que
  // en el sistema real.
  const inventarioInicial: MovimientoMuestra[] = [...idPorDeposito.keys()]
    .map((deposito) => ({
      dias: -90,
      tipo: 'Ajuste de inventario inicial',
      deposito,
      referencia: 'INV-0001',
      observaciones: 'Carga del stock existente al poner en marcha el sistema',
      detalle: fichasStock
        .filter((ficha) => ficha.deposito === deposito && ficha.inicial > 0)
        .map((ficha) => ({
          articulo: ficha.articulo,
          cantidad: ficha.inicial,
        })),
    }))
    .filter((movimiento) => movimiento.detalle.length > 0);

  const tipoReposicion = await prisma.tIPOALERTA.findUniqueOrThrow({
    where: { nombre: TipoAlertaNombre.REPOSICION },
  });
  const rolAlmacen = await prisma.rOL.findUniqueOrThrow({
    where: { nombre: RolNombre.RESPONSABLE_ALMACEN },
  });

  let lineasCreadas = 0;
  let alertasCreadas = 0;
  let alertasAtendidas = 0;
  for (const movimiento of [...inventarioInicial, ...movimientos]) {
    const esEntrada = tiposMovimiento.find(
      (tipo) => tipo.nombre === movimiento.tipo,
    )!.indicador_entrada;
    // Fecha de negocio a la medianoche de Argentina (`fechaIsoSchema`); se
    // registra en el sistema esa misma mañana.
    const fecha = diasDesdeHoy(movimiento.dias);
    const registrado = new Date(fecha.getTime() + 10 * 3_600_000);

    const cabecera = await prisma.mOVIMIENTO.create({
      data: {
        fecha_movimiento: fecha,
        referencia: movimiento.referencia,
        observaciones: movimiento.observaciones,
        hora_creacion: registrado,
        hora_actualizacion: registrado,
        FK_TipoMovimiento: idPorTipoMovimiento.get(movimiento.tipo)!,
        FK_Deposito: idPorDeposito.get(movimiento.deposito)!,
        ...auditoria,
      },
    });

    for (const linea of movimiento.detalle) {
      const ficha = fichaPorClave.get(
        claveFicha(movimiento.deposito, linea.articulo),
      );
      if (!ficha || !ficha.activa) {
        throw new Error(
          `El movimiento de ${movimiento.referencia} usa "${linea.articulo}" en "${movimiento.deposito}", que no tiene una ficha de stock activa.`,
        );
      }

      const stockAnterior = ficha.cantidad;
      const stockNuevo = esEntrada
        ? stockAnterior + linea.cantidad
        : stockAnterior - linea.cantidad;

      // Los datos de muestra están armados para que esto nunca pase: si salta,
      // es un error de los movimientos definidos arriba, no del sistema.
      if (stockNuevo < 0) {
        throw new Error(
          `El movimiento de ${movimiento.referencia} deja "${linea.articulo}" en ${stockNuevo} en "${movimiento.deposito}".`,
        );
      }

      await prisma.sTOCKMOVIMIENTO.create({
        data: {
          FK_Movimiento: cabecera.id_movimiento,
          FK_Stock: ficha.id,
          cantidad: linea.cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          observacion: linea.observacion,
        },
      });
      ficha.cantidad = stockNuevo;
      lineasCreadas++;

      // Alertas de reposición con el mismo criterio que MovimientoService:
      // si el movimiento deja la ficha debajo de su umbral y no tiene una
      // alerta abierta (deduplicación por clave), se genera una.
      if (stockNuevo < ficha.umbral && ficha.alertaAbierta === null) {
        const alerta = await prisma.aLERTA.create({
          data: {
            FK_tipo_alerta: tipoReposicion.id_tipo_alerta,
            // Fijo, como en el servicio: los roles no son por depósito.
            FK_rol_destinatario: rolAlmacen.id_rol,
            mensaje: `Stock de "${ficha.articulo}" en el depósito "${ficha.deposito}" bajó a ${stockNuevo} unidades (umbral: ${ficha.umbral})`,
            datos: {
              stockId: ficha.id,
              movimientoId: cabecera.id_movimiento,
              articuloId: ficha.idArticulo,
              depositoId: ficha.idDeposito,
              stockNuevo,
              umbralMinimo: ficha.umbral,
            },
            clave_deduplicacion: `${TipoAlertaNombre.REPOSICION}-${ficha.id}`,
            hora_creacion: registrado,
          },
        });
        ficha.alertaAbierta = alerta.id_alerta;
        alertasCreadas++;
      }

      // Cuando una entrada repone la ficha por encima del umbral, el
      // Administrador atiende la alerta ese mismo día: así la pantalla de
      // alertas muestra los dos estados con un historial que cierra.
      if (stockNuevo >= ficha.umbral && ficha.alertaAbierta !== null) {
        await prisma.aLERTA.update({
          where: { id_alerta: ficha.alertaAbierta },
          data: {
            atendida: true,
            FK_usuario_atencion: idAdministrador,
            fecha_atencion: new Date(registrado.getTime() + 3_600_000),
          },
        });
        ficha.alertaAbierta = null;
        alertasAtendidas++;
      }
    }
  }

  for (const ficha of fichaPorClave.values()) {
    await prisma.sTOCK.update({
      where: { id_stock: ficha.id },
      data: { cantidad: ficha.cantidad },
    });
  }
  console.log(
    `MOVIMIENTO: ${inventarioInicial.length + movimientos.length} cabeceras, ${lineasCreadas} líneas de detalle.`,
  );
  console.log(
    `ALERTA: ${alertasCreadas - alertasAtendidas} abiertas, ${alertasAtendidas} atendidas.`,
  );

  console.log('\nSeed de muestra completo.');
}

// Corrido suelto (`npm run seed:muestra`); los datos de muestra también se
// pueden importar desde otro script sin escribir en la base.
if (require.main === module) ejecutarSeed(sembrarMuestra);
