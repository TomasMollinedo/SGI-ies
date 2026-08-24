export interface Categoria {
  id_categoria: number
  nombre: string
  descripcion: string | null
  estado: boolean
}

export interface UsuarioResumen {
  nombre: string
  apellido: string
}

export interface CategoriaDetalle extends Categoria {
  hora_creacion: string
  hora_actualizacion: string | null
  usuarioCreador: UsuarioResumen
  usuarioActualizador: UsuarioResumen
}
export interface CrearCategoriaInput {
  nombre: string
  descripcion?: string
}

export type ActualizarCategoriaInput = Partial<CrearCategoriaInput>

export interface FiltrosCategorias {
  nombre?: string
  estado?: boolean
  page?: number
  limit?: number
}

export interface CategoriasPaginadas {
  data: Categoria[]
  meta: {
    total: number
    page: number
    limit: number
  }
}


