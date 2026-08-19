import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { RolNombre } from '../src/common/enums/rol.enum';

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
    await prisma.uNIDADMEDIDA.upsert({
      where: { nombre: unidadMedida.nombre },
      update: unidadMedida,
      create: { ...unidadMedida, ...auditoria },
    });
  }
  console.log(
    `Seed de UNIDADMEDIDA: ${unidadesMedida.length} registros procesados.`,
  );

  for (const deposito of depositos) {
    await prisma.dEPOSITO.upsert({
      where: { nombre: deposito.nombre },
      update: deposito,
      create: { ...deposito, ...auditoria },
    });
  }
  console.log(`Seed de DEPOSITO: ${depositos.length} registros procesados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
