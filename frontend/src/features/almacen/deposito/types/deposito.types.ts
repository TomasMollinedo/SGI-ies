/** Shape exacto de GET /api/depositos — sin transformar nombres de campo. */
export interface Deposito {
  id_deposito: number
  nombre: string
  es_obrador: boolean
  ubicacion: string
  descripcion: string
  estado: boolean
  FK_Proyecto: number
}

export interface FiltrosDepositos {
  nombre?: string
  estado?: boolean
  esObrador?: boolean
  page?: number
  limit?: number
}
