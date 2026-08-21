import { ConflictException } from '@nestjs/common';

/**
 * Valida la regla "nombre único solo entre registros activos" (uno dado de
 * baja libera su nombre para uno nuevo). Reutilizado por los submódulos de
 * Almacén que la comparten (Marca, Categoría, Depósito, ...).
 */
export async function validarNombreUnicoEntreActivos(params: {
  /** Frase ya conjugada en género/número, ej. "una marca activa" o "un depósito/obrador activo". */
  entidadActiva: string;
  nombre: string;
  existeOtroActivo: () => Promise<boolean>;
}) {
  const { entidadActiva, nombre, existeOtroActivo } = params;

  if (await existeOtroActivo()) {
    throw new ConflictException(
      `Ya existe ${entidadActiva} con el nombre "${nombre}"`,
    );
  }
}
