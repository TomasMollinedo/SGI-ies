/** Formatos aceptados para el comprobante adjunto a una declaración de pago (HU-29). */
export const TIPOS_COMPROBANTE_PERMITIDOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export const MAX_TAMANO_COMPROBANTE_BYTES = 5 * 1024 * 1024;

const EXTENSION_POR_TIPO: Record<(typeof TIPOS_COMPROBANTE_PERMITIDOS)[number], string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export function extensionDelComprobante(tipo: string): string {
  return EXTENSION_POR_TIPO[tipo as keyof typeof EXTENSION_POR_TIPO];
}
