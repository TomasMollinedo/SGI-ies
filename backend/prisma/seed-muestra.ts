import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { RolNombre } from '../src/common/enums/rol.enum';
import { TipoAlertaNombre } from '../src/common/enums/tipo-alerta.enum';

/**
 * Seed de muestra: llena la base con un juego de datos chico pero realista
 * (una constructora con un depósito central y dos obradores) para poder
 * mostrar el sistema funcionando end to end.
 *
 * No reemplaza a `prisma/seed.ts`: aquel siembra lo mínimo indispensable para
 * que la aplicación arranque (roles, tipos de alerta, usuarios de prueba).
 * Este agrega encima el volumen de datos de demo.
 *
 * Uso:
 *   npm run seed:muestra            -> falla si ya hay datos de negocio cargados
 *   npm run seed:muestra -- --reset -> borra los datos de negocio y los recrea
 *
 * `--reset` NO toca ROL, TIPOALERTA ni USUARIO: solo las tablas que este
 * script llena.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Password de desarrollo, igual que en el seed base. NUNCA usar en un
// ambiente real.
const DEV_PASSWORD = 'Password123!';

const usuarios = [
  {
    email: 'almacen@axontech.test',
    nombre: 'Martín',
    apellido: 'Quiroga',
    dni: '10000001',
    rol: RolNombre.RESPONSABLE_ALMACEN,
  },
  {
    email: 'compras@axontech.test',
    nombre: 'Lucía',
    apellido: 'Ferreyra',
    dni: '10000002',
    rol: RolNombre.RESPONSABLE_COMPRAS,
  },
  {
    email: 'proyectos@axontech.test',
    nombre: 'Diego',
    apellido: 'Ontiveros',
    dni: '10000003',
    rol: RolNombre.RESPONSABLE_PROYECTOS,
  },
  {
    email: 'tesoreria@axontech.test',
    nombre: 'Carla',
    apellido: 'Bustos',
    dni: '10000004',
    rol: RolNombre.RESPONSABLE_TESORERIA,
  },
  {
    email: 'comercializacion@axontech.test',
    nombre: 'Sofía',
    apellido: 'Ledesma',
    dni: '10000005',
    rol: RolNombre.RESPONSABLE_COMERCIALIZACION,
  },
  {
    email: 'gerente@axontech.test',
    nombre: 'Roberto',
    apellido: 'Vega',
    dni: '10000006',
    rol: RolNombre.GERENTE_GENERAL,
  },
  {
    email: 'admin@axontech.test',
    nombre: 'Admin',
    apellido: 'Sistema',
    dni: '10000007',
    rol: RolNombre.ADMINISTRADOR,
  },
];

const descripcionPorTipoAlerta: Record<TipoAlertaNombre, string> = {
  [TipoAlertaNombre.REPOSICION]:
    'Stock de una ficha cruzó su umbral mínimo (generada por el módulo de Movimientos)',
};

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
 * Los depósitos vinculados a un proyecto usan el índice del PROYECTO stub
 * creado más abajo (0-based). `null` = depósito propio de la empresa.
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
    nombre: 'Obrador Ruta 9 Km 42',
    es_obrador: true,
    ubicacion: 'Ruta Nacional 9, Km 42',
    descripcion: 'Obrador del tramo de repavimentación',
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

  // Obrador Ruta 9 Km 42
  {
    deposito: 'Obrador Ruta 9 Km 42',
    articulo: 'Cemento Portland CP40 50 kg',
    inicial: 150,
    umbral: 80,
  },
  {
    deposito: 'Obrador Ruta 9 Km 42',
    articulo: 'Piedra partida 6-20',
    inicial: 30,
    umbral: 12,
  },
  {
    deposito: 'Obrador Ruta 9 Km 42',
    articulo: 'Malla Sima Q188 2x6 m',
    inicial: 40,
    umbral: 20,
  },
  {
    deposito: 'Obrador Ruta 9 Km 42',
    articulo: 'Sellador poliuretánico 300 ml',
    inicial: 24,
    umbral: 10,
  },
  {
    deposito: 'Obrador Ruta 9 Km 42',
    articulo: 'Casco de seguridad',
    inicial: 18,
    umbral: 8,
  },
  {
    deposito: 'Obrador Ruta 9 Km 42',
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
  fecha: string;
  tipo: string;
  deposito: string;
  referencia?: string;
  observaciones?: string;
  usuario: string;
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
    fecha: '2026-07-06',
    tipo: 'Entrada por compra',
    deposito: 'Depósito Central',
    referencia: 'REM-0001-00012345',
    observaciones: 'Compra mensual de cemento y cal',
    usuario: 'almacen@axontech.test',
    detalle: [
      { articulo: 'Cemento Portland CP40 50 kg', cantidad: 300 },
      { articulo: 'Cal hidratada 25 kg', cantidad: 120 },
    ],
  },
  {
    fecha: '2026-07-09',
    tipo: 'Salida por transferencia',
    deposito: 'Depósito Central',
    referencia: 'TR-2026-014',
    observaciones: 'Envío a Obrador Torre Belgrano',
    usuario: 'almacen@axontech.test',
    detalle: [
      { articulo: 'Cemento Portland CP40 50 kg', cantidad: 200 },
      { articulo: 'Ladrillo hueco 12x18x33', cantidad: 2500 },
      { articulo: 'Hierro aletado 8 mm x 12 m', cantidad: 120 },
    ],
  },
  {
    fecha: '2026-07-10',
    tipo: 'Entrada por compra',
    deposito: 'Obrador Torre Belgrano',
    referencia: 'TR-2026-014',
    observaciones: 'Recepción de la transferencia del depósito central',
    usuario: 'proyectos@axontech.test',
    detalle: [
      { articulo: 'Cemento Portland CP40 50 kg', cantidad: 200 },
      { articulo: 'Ladrillo hueco 12x18x33', cantidad: 2500 },
      { articulo: 'Hierro aletado 8 mm x 12 m', cantidad: 120 },
    ],
  },
  {
    fecha: '2026-07-17',
    tipo: 'Salida por consumo',
    deposito: 'Obrador Torre Belgrano',
    referencia: 'VP-2026-07-03',
    observaciones: 'Mampostería de los pisos 3 y 4',
    usuario: 'proyectos@axontech.test',
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
    fecha: '2026-07-22',
    tipo: 'Salida por consumo',
    deposito: 'Depósito Central',
    referencia: 'VP-2026-07-08',
    observaciones: 'Armado de columnas para la obra de Ruta 9',
    usuario: 'almacen@axontech.test',
    detalle: [
      { articulo: 'Hierro aletado 10 mm x 12 m', cantidad: 180 },
      { articulo: 'Hierro aletado 8 mm x 12 m', cantidad: 100 },
      { articulo: 'Piedra partida 6-20', cantidad: 25 },
    ],
  },
  {
    fecha: '2026-07-28',
    tipo: 'Salida por consumo',
    deposito: 'Obrador Ruta 9 Km 42',
    referencia: 'VP-2026-07-11',
    observaciones: 'Losa del puente peatonal',
    usuario: 'proyectos@axontech.test',
    detalle: [
      { articulo: 'Malla Sima Q188 2x6 m', cantidad: 26 },
      { articulo: 'Cemento Portland CP40 50 kg', cantidad: 90 },
      { articulo: 'Piedra partida 6-20', cantidad: 22 },
    ],
  },
  {
    fecha: '2026-08-03',
    tipo: 'Entrada por compra',
    deposito: 'Depósito Central',
    referencia: 'REM-0002-00003391',
    observaciones: 'Reposición de elementos de protección personal',
    usuario: 'compras@axontech.test',
    detalle: [
      { articulo: 'Casco de seguridad', cantidad: 40 },
      { articulo: 'Guantes de puño reforzados', cantidad: 100 },
    ],
  },
  {
    fecha: '2026-08-07',
    tipo: 'Salida por consumo',
    deposito: 'Depósito Central',
    referencia: 'VP-2026-08-02',
    observaciones: 'Instalación eléctrica de la torre',
    usuario: 'almacen@axontech.test',
    detalle: [
      { articulo: 'Cable unipolar 2,5 mm2', cantidad: 950 },
      { articulo: 'Caja de embutir 10x5', cantidad: 230 },
    ],
  },
  {
    fecha: '2026-08-12',
    tipo: 'Devolución de obra',
    deposito: 'Depósito Central',
    referencia: 'DEV-2026-05',
    observaciones: 'Sobrante de la obra de Barrio Sur',
    usuario: 'almacen@axontech.test',
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
    fecha: '2026-08-18',
    tipo: 'Salida por consumo',
    deposito: 'Depósito Central',
    referencia: 'VP-2026-08-06',
    observaciones: 'Impermeabilización de azotea',
    usuario: 'almacen@axontech.test',
    detalle: [
      { articulo: 'Membrana asfáltica 4 mm x 10 m', cantidad: 34 },
      { articulo: 'Sellador poliuretánico 300 ml', cantidad: 65 },
    ],
  },
  {
    fecha: '2026-08-21',
    tipo: 'Salida por consumo',
    deposito: 'Obrador Torre Belgrano',
    referencia: 'VP-2026-08-09',
    observaciones: 'Pintura de los departamentos del piso 2',
    usuario: 'proyectos@axontech.test',
    detalle: [
      { articulo: 'Látex interior 20 L', cantidad: 6 },
      { articulo: 'Guantes de puño reforzados', cantidad: 26 },
    ],
  },
  {
    fecha: '2026-08-25',
    tipo: 'Salida por consumo',
    deposito: 'Obrador Ruta 9 Km 42',
    referencia: 'VP-2026-08-12',
    observaciones: 'Sellado de juntas del tramo repavimentado',
    usuario: 'proyectos@axontech.test',
    detalle: [
      { articulo: 'Sellador poliuretánico 300 ml', cantidad: 14 },
      { articulo: 'Cemento Portland CP40 50 kg', cantidad: 40 },
    ],
  },
  {
    fecha: '2026-08-27',
    tipo: 'Entrada por compra',
    deposito: 'Obrador Ruta 9 Km 42',
    referencia: 'REM-0002-00003512',
    observaciones: 'Compra directa del proveedor a pie de obra',
    usuario: 'compras@axontech.test',
    detalle: [{ articulo: 'Piedra partida 6-20', cantidad: 18 }],
  },
];

/** Clave con la que se indexa una ficha de stock: depósito + artículo. */
function claveFicha(deposito: string, articulo: string) {
  return `${deposito}::${articulo}`;
}

/**
 * Borra los datos de negocio que llena este script, en orden inverso al de
 * las dependencias. No toca ROL, TIPOALERTA ni USUARIO: son la base sobre la
 * que se apoya todo lo demás (y el login de los usuarios de prueba).
 */
async function limpiarDatosDeNegocio() {
  await prisma.aLERTA.deleteMany();
  await prisma.sTOCKMOVIMIENTO.deleteMany();
  await prisma.mOVIMIENTO.deleteMany();
  await prisma.sTOCK.deleteMany();
  await prisma.aRTICULO.deleteMany();
  await prisma.tIPOMOVIMIENTO.deleteMany();
  await prisma.cATEGORIA.deleteMany();
  await prisma.mARCA.deleteMany();
  await prisma.uNIDADMEDIDA.deleteMany();
  await prisma.dEPOSITO.deleteMany();
  await prisma.pROYECTO.deleteMany();
  console.log('Datos de negocio previos eliminados (--reset).');
}

async function main() {
  const reset = process.argv.includes('--reset');

  const yaHayDatos =
    (await prisma.aRTICULO.count()) > 0 ||
    (await prisma.mOVIMIENTO.count()) > 0;

  if (yaHayDatos && !reset) {
    throw new Error(
      'La base ya tiene artículos o movimientos cargados. Volvé a correr con --reset ' +
        'para borrar los datos de negocio y recrear el juego de muestra.',
    );
  }
  if (reset) {
    await limpiarDatosDeNegocio();
  }

  // --- Tablas de referencia (mismo criterio que el seed base) ---------------
  const roles = await Promise.all(
    Object.values(RolNombre).map((nombre) =>
      prisma.rOL.upsert({ where: { nombre }, update: {}, create: { nombre } }),
    ),
  );
  const idPorRol = new Map(roles.map((rol) => [rol.nombre, rol.id_rol]));

  await Promise.all(
    Object.values(TipoAlertaNombre).map((nombre) =>
      prisma.tIPOALERTA.upsert({
        where: { nombre },
        update: { descripcion: descripcionPorTipoAlerta[nombre] },
        create: { nombre, descripcion: descripcionPorTipoAlerta[nombre] },
      }),
    ),
  );

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const idPorUsuario = new Map<string, number>();
  for (const { email, nombre, apellido, dni, rol } of usuarios) {
    const usuario = await prisma.uSUARIO.upsert({
      where: { email },
      update: { nombre, apellido, FK_rol: idPorRol.get(rol)! },
      create: {
        nombre,
        apellido,
        email,
        dni,
        password: passwordHash,
        FK_rol: idPorRol.get(rol)!,
      },
    });
    idPorUsuario.set(email, usuario.id_usuario);
  }
  console.log(`USUARIO: ${usuarios.length} registros.`);

  const idAlmacen = idPorUsuario.get('almacen@axontech.test')!;
  const idGerente = idPorUsuario.get('gerente@axontech.test')!;
  // Los catálogos los mantiene el Responsable de Almacén, que es el rol dueño
  // del dominio.
  const auditoria = {
    FK_usuario_creador: idAlmacen,
    FK_usuario_actualizador: idAlmacen,
  };

  // --- Catálogos -----------------------------------------------------------
  const idPorTipoMovimiento = new Map<string, number>();
  for (const tipo of tiposMovimiento) {
    const creado = await prisma.tIPOMOVIMIENTO.create({
      data: { ...tipo, ...auditoria },
    });
    idPorTipoMovimiento.set(creado.nombre, creado.id_tipo_movimiento);
  }
  console.log(`TIPOMOVIMIENTO: ${tiposMovimiento.length} registros.`);

  const idPorCategoria = new Map<string, number>();
  for (const categoria of categorias) {
    const creada = await prisma.cATEGORIA.create({
      data: { ...categoria, ...auditoria },
    });
    idPorCategoria.set(creada.nombre, creada.id_categoria);
  }
  console.log(`CATEGORIA: ${categorias.length} registros.`);

  const idPorMarca = new Map<string, number>();
  for (const marca of marcas) {
    const creada = await prisma.mARCA.create({
      data: { ...marca, ...auditoria },
    });
    idPorMarca.set(creada.nombre, creada.id_marca);
  }
  console.log(`MARCA: ${marcas.length} registros.`);

  const idPorUnidad = new Map<string, number>();
  for (const unidad of unidadesMedida) {
    const creada = await prisma.uNIDADMEDIDA.create({
      data: { ...unidad, ...auditoria },
    });
    idPorUnidad.set(creada.nombre, creada.id_unidad_medida);
  }
  console.log(`UNIDADMEDIDA: ${unidadesMedida.length} registros.`);

  // PROYECTO es todavía un stub (solo el id): se crean tantos como obradores
  // vinculados haya, para poder mostrar la relación depósito-proyecto.
  const cantidadProyectos = new Set(
    depositos
      .map((deposito) => deposito.proyecto)
      .filter((indice): indice is number => indice !== null),
  ).size;
  const proyectos: number[] = [];
  for (let i = 0; i < cantidadProyectos; i++) {
    const proyecto = await prisma.pROYECTO.create({ data: {} });
    proyectos.push(proyecto.id_proyecto);
  }
  console.log(`PROYECTO: ${cantidadProyectos} registros.`);

  const idPorDeposito = new Map<string, number>();
  for (const { proyecto, ...deposito } of depositos) {
    const creado = await prisma.dEPOSITO.create({
      data: {
        ...deposito,
        FK_Proyecto: proyecto === null ? null : proyectos[proyecto],
        ...auditoria,
      },
    });
    idPorDeposito.set(creado.nombre, creado.id_deposito);
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
  const fichaPorClave = new Map<
    string,
    {
      id: number;
      cantidad: number;
      umbral: number;
      articulo: string;
      activa: boolean;
    }
  >();
  for (const ficha of fichasStock) {
    const activa = ficha.estado ?? true;
    const creada = await prisma.sTOCK.create({
      data: {
        cantidad: 0,
        umbral_minimo: ficha.umbral,
        estado: activa,
        FK_deposito: idPorDeposito.get(ficha.deposito)!,
        FK_articulo: idPorArticulo.get(ficha.articulo)!,
        ...auditoria,
      },
    });
    fichaPorClave.set(claveFicha(ficha.deposito, ficha.articulo), {
      id: creada.id_stock,
      cantidad: 0,
      umbral: ficha.umbral,
      articulo: ficha.articulo,
      activa,
    });
  }
  console.log(`STOCK: ${fichasStock.length} fichas.`);

  // --- Movimientos ---------------------------------------------------------
  // El inventario inicial se arma como un movimiento de entrada por depósito,
  // en vez de escribir la cantidad directo sobre STOCK: así el stock actual de
  // cada ficha siempre se explica por su historial de movimientos, igual que
  // en el sistema real.
  const inventarioInicial: MovimientoMuestra[] = [...idPorDeposito.keys()]
    .map((deposito) => ({
      fecha: '2026-07-01',
      tipo: 'Ajuste de inventario inicial',
      deposito,
      referencia: 'INV-2026-001',
      observaciones: 'Carga del stock existente al poner en marcha el sistema',
      usuario: 'almacen@axontech.test',
      detalle: fichasStock
        .filter((ficha) => ficha.deposito === deposito && ficha.inicial > 0)
        .map((ficha) => ({
          articulo: ficha.articulo,
          cantidad: ficha.inicial,
        })),
    }))
    .filter((movimiento) => movimiento.detalle.length > 0);

  let lineasCreadas = 0;
  for (const movimiento of [...inventarioInicial, ...movimientos]) {
    const tipoId = idPorTipoMovimiento.get(movimiento.tipo)!;
    const esEntrada = tiposMovimiento.find(
      (tipo) => tipo.nombre === movimiento.tipo,
    )!.indicador_entrada;
    const usuarioId = idPorUsuario.get(movimiento.usuario)!;
    const fecha = new Date(`${movimiento.fecha}T12:00:00.000Z`);

    const cabecera = await prisma.mOVIMIENTO.create({
      data: {
        fecha_movimiento: fecha,
        referencia: movimiento.referencia,
        observaciones: movimiento.observaciones,
        hora_creacion: fecha,
        hora_actualizacion: fecha,
        FK_TipoMovimiento: tipoId,
        FK_Deposito: idPorDeposito.get(movimiento.deposito)!,
        FK_usuario_creador: usuarioId,
        FK_usuario_actualizador: usuarioId,
      },
    });

    for (const linea of movimiento.detalle) {
      const ficha = fichaPorClave.get(
        claveFicha(movimiento.deposito, linea.articulo),
      );
      if (!ficha) {
        throw new Error(
          `El movimiento del ${movimiento.fecha} usa "${linea.articulo}" en "${movimiento.deposito}", que no tiene ficha de stock.`,
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
          `El movimiento del ${movimiento.fecha} deja "${linea.articulo}" en ${stockNuevo} en "${movimiento.deposito}".`,
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

  // --- Alertas -------------------------------------------------------------
  // Se generan con el mismo criterio que MovimientoService: una alerta abierta
  // por cada ficha que quedó debajo de su umbral, con la clave de
  // deduplicación "REPOSICION-<id_stock>".
  const tipoReposicion = await prisma.tIPOALERTA.findUniqueOrThrow({
    where: { nombre: TipoAlertaNombre.REPOSICION },
  });
  const rolAlmacen = idPorRol.get(RolNombre.RESPONSABLE_ALMACEN)!;

  let alertasAbiertas = 0;
  for (const ficha of fichaPorClave.values()) {
    // Una ficha dada de baja no alerta: no se mueve, así que en el sistema
    // real nunca llegaría a dispararse.
    if (!ficha.activa || ficha.cantidad >= ficha.umbral) {
      continue;
    }
    await prisma.aLERTA.create({
      data: {
        FK_tipo_alerta: tipoReposicion.id_tipo_alerta,
        FK_rol_destinatario: rolAlmacen,
        mensaje: `Stock de "${ficha.articulo}" bajó a ${ficha.cantidad} unidades (umbral: ${ficha.umbral})`,
        datos: {
          stockId: ficha.id,
          stockNuevo: ficha.cantidad,
          umbralMinimo: ficha.umbral,
        },
        clave_deduplicacion: `${TipoAlertaNombre.REPOSICION}-${ficha.id}`,
      },
    });
    alertasAbiertas++;
  }

  // Una alerta ya atendida, para que la pantalla muestre los dos estados. Es
  // de una ficha que hoy está por encima del umbral: se disparó en su momento
  // y se resolvió reponiendo.
  const fichaRepuesta = fichaPorClave.get(
    claveFicha('Depósito Central', 'Casco de seguridad'),
  )!;
  await prisma.aLERTA.create({
    data: {
      FK_tipo_alerta: tipoReposicion.id_tipo_alerta,
      FK_rol_destinatario: rolAlmacen,
      mensaje: `Stock de "${fichaRepuesta.articulo}" bajó a 18 unidades (umbral: ${fichaRepuesta.umbral})`,
      datos: {
        stockId: fichaRepuesta.id,
        stockNuevo: 18,
        umbralMinimo: fichaRepuesta.umbral,
      },
      clave_deduplicacion: `${TipoAlertaNombre.REPOSICION}-${fichaRepuesta.id}`,
      atendida: true,
      FK_usuario_atencion: idGerente,
      fecha_atencion: new Date('2026-08-03T15:30:00.000Z'),
      hora_creacion: new Date('2026-08-01T09:10:00.000Z'),
    },
  });
  console.log(`ALERTA: ${alertasAbiertas} abiertas, 1 atendida.`);

  console.log('\nSeed de muestra completo.');
  console.log(`Usuarios de prueba: password "${DEV_PASSWORD}"`);
}

// Guarda para poder importar los datos de muestra desde un script auxiliar
// (por ejemplo, para verificarlos) sin disparar la escritura en la base.
if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
