/**
 * Tipos de la unidad funcional que comparten el panel interno
 * (comercialización) y el sitio público (catálogo): los devuelven tanto
 * `GET /publicaciones` como `GET /catalogo`, con los mismos valores.
 */

export type TipologiaUnidad =
  | 'MONOAMBIENTE'
  | 'UN_DORMITORIO'
  | 'DOS_DORMITORIOS'
  | 'TRES_DORMITORIOS'
  | 'LOCAL_COMERCIAL'
  | 'COCHERA'
  | 'OTRO'

export type CodigoCondicionEntrega = 'TERMINADA' | 'A_ENTREGAR_CON_FECHA' | 'A_ENTREGAR_SIN_FECHA'

export interface CondicionEntrega {
  codigo: CodigoCondicionEntrega
  texto: string
  fecha_referencia: string | null
}
