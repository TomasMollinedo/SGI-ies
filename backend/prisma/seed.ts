import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const usuarios = [
  { dni: '30111222', nombre: 'Ana', apellido: 'Gomez' },
  { dni: '28444555', nombre: 'Luis', apellido: 'Perez' },
  { dni: '35666777', nombre: 'Maria', apellido: 'Fernandez' },
];

const tiposMovimiento = [
  { nombre: 'Entrada por compra', indicador_entrada: true },
  { nombre: 'Salida por consumo', indicador_entrada: false },
];

const categorias = [
  { nombre: 'Insumos de oficina', descripcion: 'Articulos de libreria y oficina' },
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
  for (const usuario of usuarios) {
    await prisma.uSUARIO.upsert({
      where: { dni: usuario.dni },
      update: usuario,
      create: usuario,
    });
  }
  console.log(`Seed de USUARIO: ${usuarios.length} registros procesados.`);

  const admin = await prisma.uSUARIO.findUniqueOrThrow({
    where: { dni: usuarios[0].dni },
  });
  const auditoria = {
    FK_usuario_creador: admin.id_usuario,
    FK_usuario_actualizador: admin.id_usuario,
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

  for (const categoria of categorias) {
    await prisma.cATEGORIA.upsert({
      where: { nombre: categoria.nombre },
      update: categoria,
      create: { ...categoria, ...auditoria },
    });
  }
  console.log(`Seed de CATEGORIA: ${categorias.length} registros procesados.`);

  for (const marca of marcas) {
    await prisma.mARCA.upsert({
      where: { nombre: marca.nombre },
      update: marca,
      create: { ...marca, ...auditoria },
    });
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
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
