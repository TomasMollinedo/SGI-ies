/** Formatos aceptados para el comprobante adjunto a una declaración de pago (HU-29). */
export const TIPOS_COMPROBANTE_PERMITIDOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type TipoComprobante = (typeof TIPOS_COMPROBANTE_PERMITIDOS)[number];

export const MAX_TAMANO_COMPROBANTE_BYTES = 5 * 1024 * 1024;

/**
 * El `limits.fileSize` de multer: un byte más que el máximo, porque multer
 * rechaza el archivo cuando LLEGA al límite, no cuando lo supera. Así uno de
 * exactamente 5 MB se acepta ("hasta 5 MB", HU-29).
 */
export const LIMITE_MULTER_COMPROBANTE_BYTES = MAX_TAMANO_COMPROBANTE_BYTES + 1;

/** El campo del form multipart donde viaja el comprobante. */
export const CAMPO_COMPROBANTE = 'comprobante';

/**
 * El body de un error del comprobante, con la misma forma que los errores de
 * validación de Zod (`[{ campo, error }]`): el front lo muestra debajo del
 * campo.
 */
export function errorDelComprobante(error: string) {
  return { message: [{ campo: CAMPO_COMPROBANTE, error }] };
}

/** Errores del comprobante que ve el cliente debajo del campo (HU-29). */
export const MENSAJE_COMPROBANTE_REQUERIDO = 'Adjuntá el comprobante del pago';
export const MENSAJE_COMPROBANTE_TIPO_INVALIDO =
  'El comprobante tiene que ser un PDF, JPG o PNG';
export const MENSAJE_COMPROBANTE_MUY_GRANDE =
  'El comprobante no puede superar los 5 MB';
export const MENSAJE_COMPROBANTE_UNICO =
  'Adjuntá un único archivo en el campo comprobante';

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
