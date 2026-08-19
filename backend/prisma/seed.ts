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

const usuariosDePrueba: { email: string; rol: RolNombre }[] = [
  { email: 'almacen@axontech.test', rol: RolNombre.RESPONSABLE_ALMACEN },
  { email: 'compras@axontech.test', rol: RolNombre.RESPONSABLE_COMPRAS },
  { email: 'proyectos@axontech.test', rol: RolNombre.RESPONSABLE_PROYECTOS },
  { email: 'tesoreria@axontech.test', rol: RolNombre.RESPONSABLE_TESORERIA },
  {
    email: 'comercializacion@axontech.test',
    rol: RolNombre.RESPONSABLE_COMERCIALIZACION,
  },
  { email: 'gerente@axontech.test', rol: RolNombre.GERENTE_GENERAL },
  { email: 'admin@axontech.test', rol: RolNombre.ADMINISTRADOR },
];

async function main() {
  const roles = await Promise.all(
    Object.values(RolNombre).map((nombre) =>
      prisma.rol.upsert({
        where: { nombre },
        update: {},
        create: { nombre },
      }),
    ),
  );
  const idPorRol = new Map(roles.map((rol) => [rol.nombre, rol.id_rol]));

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  for (const { email, rol } of usuariosDePrueba) {
    await prisma.usuario.upsert({
      where: { email },
      update: {},
      create: {
        nombre: rol,
        apellido: 'Prueba',
        email,
        password: passwordHash,
        FK_rol: idPorRol.get(rol)!,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
