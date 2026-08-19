import { ConflictException } from '@nestjs/common';

/**
 * Valida la regla "nombre único solo entre registros activos" (uno dado de
 * baja libera su nombre para uno nuevo). Reutilizado por los submódulos de
 * Almacén que la comparten (Marca, Categoría, ...).
 */
export async function validarNombreUnicoEntreActivos(params: {
  entidad: string;
  nombre: string;
  existeOtroActivo: () => Promise<boolean>;
}) {
  const { entidad, nombre, existeOtroActivo } = params;

  if (await existeOtroActivo()) {
    throw new ConflictException(
      `Ya existe ${entidad} activa con el nombre "${nombre}"`,
    );
  }
}
