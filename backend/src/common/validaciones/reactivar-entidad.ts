import { ConflictException } from '@nestjs/common';

/**
 * Alta lógica (reactivar) de una entidad dada de baja: rechaza si ya está
 * activa, corre una revalidación opcional antes de aplicar el cambio (por
 * ejemplo, unicidad de nombre entre activas — mientras estuvo de baja, otro
 * registro pudo haber tomado ese mismo valor) y recién ahí actualiza el
 * estado. Reutilizado por los módulos con alta lógica (Marca, Tipo de
 * Movimiento, Proveedor, ...).
 */
export async function reactivarEntidad<
  E extends { estado: boolean },
  R,
>(params: {
  entidad: E;
  entidadYaActiva: string;
  revalidar?: () => Promise<void>;
  activar: () => Promise<R>;
}): Promise<R> {
  if (params.entidad.estado) {
    throw new ConflictException(params.entidadYaActiva);
  }

  if (params.revalidar) {
    await params.revalidar();
  }

  return params.activar();
}
