/** Formatos aceptados para el comprobante adjunto a una declaración de pago (HU-29). */
export const TIPOS_COMPROBANTE_PERMITIDOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type TipoComprobante = (typeof TIPOS_COMPROBANTE_PERMITIDOS)[number];

export const MAX_TAMANO_COMPROBANTE_BYTES = 5 * 1024 * 1024;

/**
 * La whitelist como regex anclada (`^...$`), para el `FileTypeValidator`: sin
 * anclar, un tipo como `image/png+algo` también matchearía.
 */
export const REGEX_TIPOS_COMPROBANTE = new RegExp(
  `^(${TIPOS_COMPROBANTE_PERMITIDOS.map((tipo) =>
    tipo.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'),
  ).join('|')})$`,
);

export function esTipoComprobantePermitido(
  tipo: string | null | undefined,
): tipo is TipoComprobante {
  return (TIPOS_COMPROBANTE_PERMITIDOS as readonly unknown[]).includes(tipo);
}

const EXTENSION_POR_TIPO: Record<TipoComprobante, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

/** `undefined` si el tipo no está en la whitelist. */
export function extensionDelComprobante(tipo: string): string | undefined {
  return esTipoComprobantePermitido(tipo)
    ? EXTENSION_POR_TIPO[tipo]
    : undefined;
}
