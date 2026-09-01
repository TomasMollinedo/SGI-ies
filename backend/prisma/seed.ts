import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { CondicionIVA } from '../generated/prisma/enums';
import { RolNombre } from '../src/common/enums/rol.enum';
import { TipoAlertaNombre } from '../src/common/enums/tipo-alerta.enum';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Password de desarrollo, solo para los usuarios de prueba de este seed.
// NUNCA usar este valor en un ambiente real.
const DEV_PASSWORD = 'Password123!';

const usuariosDePrueba: { email: string; rol: RolNombre; dni: string }[] = [
  {
    email: 'almacen@axontech.test',
    rol: RolNombre.RESPONSABLE_ALMACEN,
    dni: '10000001',
  },
  {
    email: 'compras@axontech.test',
    rol: RolNombre.RESPONSABLE_COMPRAS,
    dni: '10000002',
  },
  {
    email: 'proyectos@axontech.test',
    rol: RolNombre.RESPONSABLE_PROYECTOS,
    dni: '10000003',
  },
  {
    email: 'tesoreria@axontech.test',
    rol: RolNombre.RESPONSABLE_TESORERIA,
    dni: '10000004',
  },
  {
    email: 'comercializacion@axontech.test',
    rol: RolNombre.RESPONSABLE_COMERCIALIZACION,
    dni: '10000005',
  },
  {
    email: 'gerente@axontech.test',
    rol: RolNombre.GERENTE_GENERAL,
    dni: '10000006',
  },
  {
    email: 'admin@axontech.test',
    rol: RolNombre.ADMINISTRADOR,
    dni: '10000007',
  },
];

// Descripción de cada tipo de alerta. Es un Record sobre el enum a propósito:
// si mañana se suma un valor a TipoAlertaNombre, TypeScript obliga a
// describirlo acá en vez de dejarlo sin seedear.
const descripcionPorTipoAlerta: Record<TipoAlertaNombre, string> = {
  [TipoAlertaNombre.REPOSICION]:
    'Stock de una ficha cruzó su umbral mínimo (generada por el módulo de Movimientos)',
};

const tiposMovimiento = [
  { nombre: 'Entrada por compra', indicador_entrada: true },
  { nombre: 'Salida por consumo', indicador_entrada: false },
];

const categorias = [
  {
    nombre: 'Insumos de oficina',
    descripcion: 'Articulos de libreria y oficina',
  },
  { nombre: 'Herramientas', descripcion: 'Herramientas manuales y electricas' },
];

const marcas = [
  { nombre: 'Genérica', descripcion: null },
  { nombre: 'Stanley', descripcion: null },
];

const unidadesMedida = [
  { nombre: 'Unidad', abreviatura: 'un' },
  { nombre: 'Kilogramo', abreviatura: 'kg' },
  { nombre: 'Litro', abreviatura: 'l' },
];

const depositos = [
  {
    nombre: 'Deposito Central',
    es_obrador: false,
    ubicacion: 'Sede central',
    descripcion: null,
  },
];

// --- Datos de arranque del ciclo de gastos (Sprint 2) ---
//
// Ninguno de estos registros lleva id explícito a propósito: insertar con un id
// fijo en una columna autoincremental NO avanza la secuencia de Postgres, y el
// primer alta hecha desde la aplicación fallaría con clave duplicada. Como el
// equipo decidió que la PK autoincremental ES el número del documento, ese bug
// aparecería recién en la demo. Que los ids los asigne la base.
const proveedores = [
  {
    razon_social: 'Corralon San Martin S.A.',
    cuit: '30712345671',
    condicion_iva: CondicionIVA.RESPONSABLE_INSCRIPTO,
    domicilio: 'Av. San Martin 1450, Resistencia, Chaco',
    telefono: '3624-445566',
    correo: 'ventas@corralonsanmartin.test',
    observaciones: 'Proveedor habitual de materiales de obra gruesa.',
  },
  {
    razon_social: 'Hormigones del Litoral S.R.L.',
    cuit: '30689012341',
    condicion_iva: CondicionIVA.RESPONSABLE_INSCRIPTO,
    domicilio: 'Ruta 11 Km 1008, Corrientes',
    telefono: '3794-223344',
    correo: 'pedidos@hormigoneslitoral.test',
    observaciones: 'Hormigon elaborado, entrega con mixer propio.',
  },
  {
    razon_social: 'Ferreteria Industrial Rivadavia',
    cuit: '20356789017',
    condicion_iva: CondicionIVA.MONOTRIBUTISTA,
    domicilio: 'Rivadavia 880, Resistencia, Chaco',
    telefono: '3624-778899',
    correo: 'contacto@ferreteriarivadavia.test',
    observaciones: 'Herramientas y consumibles, compras chicas.',
  },
  {
    razon_social: 'Fundacion Obras Comunitarias',
    cuit: '30554433223',
    condicion_iva: CondicionIVA.EXENTO,
    domicilio: 'Belgrano 245, Barranqueras, Chaco',
    telefono: '3624-112233',
    correo: 'administracion@obrascomunitarias.test',
    observaciones: 'Entidad sin fines de lucro, exenta de IVA.',
  },
  {
    razon_social: 'Transporte y Aridos El Sauce',
    cuit: '27123456780',
    condicion_iva: CondicionIVA.CONSUMIDOR_FINAL,
    domicilio: 'Colectora Norte 320, Fontana, Chaco',
    telefono: '3624-990011',
    correo: 'fletes@elsauce.test',
    observaciones: 'Fletes de arena y ripio, factura como consumidor final.',
  },
];

// Datos del sistema, no valores fijos en el codigo: los services leen estos
// registros en vez de tener la logica cableada.
const tiposComprobante = [
  {
    nombre: 'Factura',
    descripcion: 'Comprobante de compra que genera deuda con el proveedor',
    aumenta_saldo: true, // true = aumenta el saldo del proveedor
    requiere_comprobante_origen: false,
  },
  {
    nombre: 'Nota de Debito',
    descripcion: 'Ajuste que incrementa el importe de un comprobante anterior',
    aumenta_saldo: true, // true = aumenta el saldo del proveedor
    requiere_comprobante_origen: true, // se aplica sobre un comprobante existente
  },
  {
    nombre: 'Nota de Credito',
    descripcion: 'Ajuste que reduce el importe de un comprobante anterior',
    aumenta_saldo: false, // false = disminuye el saldo del proveedor
    requiere_comprobante_origen: true, // se aplica sobre un comprobante existente
  },
];

const formasPago = [
  {
    nombre: 'Efectivo',
    descripcion: 'Pago en mano, sin instrumento de respaldo',
    requiere_referencia: false,
  },
  {
    nombre: 'Transferencia bancaria',
    descripcion: 'Acreditacion en cuenta del proveedor',
    requiere_referencia: true, // numero de operacion de la transferencia
  },
  {
    nombre: 'Cheque',
    descripcion: 'Cheque propio o de terceros endosado',
    requiere_referencia: true, // numero del cheque
  },
];

async function main() {
  const roles = await Promise.all(
    Object.values(RolNombre).map((nombre) =>
      prisma.rOL.upsert({
        where: { nombre },
        update: {},
        create: { nombre },
      }),
    ),
  );
  const idPorRol = new Map(roles.map((rol) => [rol.nombre, rol.id_rol]));

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  let idUsuarioAdmin: number | undefined;
  for (const { email, rol, dni } of usuariosDePrueba) {
    const usuario = await prisma.uSUARIO.upsert({
      where: { email },
      update: {},
      create: {
        nombre: rol,
        apellido: 'Prueba',
        email,
        password: passwordHash,
        dni,
        FK_rol: idPorRol.get(rol)!,
      },
    });
    if (rol === RolNombre.ADMINISTRADOR) {
      idUsuarioAdmin = usuario.id_usuario;
    }
  }

  // TIPOALERTA sigue el mismo criterio que ROL: es una tabla de referencia que
  // se llena desde un enum del código, no desde una pantalla, así que va por
  // upsert contra el `nombre` unique.
  await Promise.all(
    Object.values(TipoAlertaNombre).map((nombre) =>
      prisma.tIPOALERTA.upsert({
        where: { nombre },
        update: { descripcion: descripcionPorTipoAlerta[nombre] },
        create: { nombre, descripcion: descripcionPorTipoAlerta[nombre] },
      }),
    ),
  );
  console.log(
    `Seed de TIPOALERTA: ${Object.values(TipoAlertaNombre).length} registros procesados.`,
  );

  // Catálogos base: se atribuyen al usuario admin de prueba como creador/actualizador.
  const auditoria = {
    FK_usuario_creador: idUsuarioAdmin!,
    FK_usuario_actualizador: idUsuarioAdmin!,
  };

  for (const tipoMovimiento of tiposMovimiento) {
    await prisma.tIPOMOVIMIENTO.upsert({
      where: { nombre: tipoMovimiento.nombre },
      update: tipoMovimiento,
      create: { ...tipoMovimiento, ...auditoria },
    });
  }
  console.log(
    `Seed de TIPOMOVIMIENTO: ${tiposMovimiento.length} registros procesados.`,
  );

  // CATEGORIA y MARCA ya no tienen `nombre` unique a nivel de base (es único
  // solo entre registros activos, se valida en cada service), así que no se
  // puede hacer upsert por nombre: buscamos primero y creamos/actualizamos a
  // mano.
  for (const categoria of categorias) {
    const existente = await prisma.cATEGORIA.findFirst({
      where: { nombre: categoria.nombre },
    });
    if (existente) {
      await prisma.cATEGORIA.update({
        where: { id_categoria: existente.id_categoria },
        data: categoria,
      });
    } else {
      await prisma.cATEGORIA.create({ data: { ...categoria, ...auditoria } });
    }
  }
  console.log(`Seed de CATEGORIA: ${categorias.length} registros procesados.`);

  for (const marca of marcas) {
    const existente = await prisma.mARCA.findFirst({
      where: { nombre: marca.nombre },
    });
    if (existente) {
      await prisma.mARCA.update({
        where: { id_marca: existente.id_marca },
        data: marca,
      });
    } else {
      await prisma.mARCA.create({ data: { ...marca, ...auditoria } });
    }
  }
  console.log(`Seed de MARCA: ${marcas.length} registros procesados.`);

  for (const unidadMedida of unidadesMedida) {
    const existente = await prisma.uNIDADMEDIDA.findFirst({
      where: { nombre: unidadMedida.nombre },
    });
    if (existente) {
      await prisma.uNIDADMEDIDA.update({
        where: { id_unidad_medida: existente.id_unidad_medida },
        data: unidadMedida,
      });
    } else {
      await prisma.uNIDADMEDIDA.create({
        data: { ...unidadMedida, ...auditoria },
      });
    }
  }
  console.log(
    `Seed de UNIDADMEDIDA: ${unidadesMedida.length} registros procesados.`,
  );

  // DEPOSITO tampoco tiene `nombre` unique a nivel de base (mismo criterio
  // que CATEGORIA y MARCA): buscamos primero y creamos/actualizamos a mano.
  for (const deposito of depositos) {
    const existente = await prisma.dEPOSITO.findFirst({
      where: { nombre: deposito.nombre },
    });
    if (existente) {
      await prisma.dEPOSITO.update({
        where: { id_deposito: existente.id_deposito },
        data: deposito,
      });
    } else {
      await prisma.dEPOSITO.create({ data: { ...deposito, ...auditoria } });
    }
  }
  console.log(`Seed de DEPOSITO: ${depositos.length} registros procesados.`);

  // PROVEEDOR sí tiene una clave natural unique en la base (el CUIT identifica
  // a la persona jurídica), así que acá el upsert sirve — sin tocar la PK.
  for (const proveedor of proveedores) {
    await prisma.pROVEEDOR.upsert({
      where: { cuit: proveedor.cuit },
      update: proveedor,
      create: { ...proveedor, ...auditoria },
    });
  }
  console.log(`Seed de PROVEEDOR: ${proveedores.length} registros procesados.`);

  // TIPOCOMPROBANTE y FORMAPAGO no tienen ningún campo unique en la base (el
  // nombre es único solo entre activos y lo valida el service), así que va el
  // mismo patrón que CATEGORIA/MARCA: buscar por nombre y crear si no existe.
  // No agregar un @unique al schema solo para poder usar upsert acá.
  for (const tipoComprobante of tiposComprobante) {
    const existente = await prisma.tIPOCOMPROBANTE.findFirst({
      where: { nombre: tipoComprobante.nombre },
    });
    if (existente) {
      await prisma.tIPOCOMPROBANTE.update({
        where: { id_tipo_comprobante: existente.id_tipo_comprobante },
        data: tipoComprobante,
      });
    } else {
      await prisma.tIPOCOMPROBANTE.create({
        data: { ...tipoComprobante, ...auditoria },
      });
    }
  }
  console.log(
    `Seed de TIPOCOMPROBANTE: ${tiposComprobante.length} registros procesados.`,
  );

  for (const formaPago of formasPago) {
    const existente = await prisma.fORMAPAGO.findFirst({
      where: { nombre: formaPago.nombre },
    });
    if (existente) {
      await prisma.fORMAPAGO.update({
        where: { id_forma_pago: existente.id_forma_pago },
        data: formaPago,
      });
    } else {
      await prisma.fORMAPAGO.create({ data: { ...formaPago, ...auditoria } });
    }
  }
  console.log(`Seed de FORMAPAGO: ${formasPago.length} registros procesados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
