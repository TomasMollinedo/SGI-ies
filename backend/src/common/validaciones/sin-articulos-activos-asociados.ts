import { ConflictException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Valida que no haya artículos activos asociados antes de dar de baja un
 * registro (Marca, Categoría, ...). Reutilizado por los submódulos de
 * Almacén que comparten esta regla.
 */
export async function validarSinArticulosActivosAsociados(
  prisma: PrismaService,
  entidad: string,
  where: Prisma.ARTICULOWhereInput,
) {
  const articulosActivos = await prisma.aRTICULO.count({
    where: { ...where, estado: true },
  });

  if (articulosActivos > 0) {
    throw new ConflictException(
      `No se puede dar de baja ${entidad}: tiene artículos activos asociados`,
    );
  }
}
