/**
 * Nombres de los tokens de color declarados en `src/styles/theme.css`, sin el
 * prefijo `--color-`. Los componentes que reciben un color por prop usan este
 * tipo para que sea imposible pasar un hex suelto o un token inexistente.
 *
 * Si agregás un color al theme, agregalo también acá.
 */
export type ColorToken =
  // paleta base
  | 'primary'
  | 'secondary'
  | 'neutral'
  | 'light'
  | 'dark'
  | 'fondotabla'
  | 'error'
  | 'warning'
  | 'success'
  | 'info'
  | 'reactivar'
  // fondos suaves de las acciones de tabla
  | 'fondo-ver'
  | 'fondo-editar'
  | 'fondo-eliminar'
  | 'fondo-reactivar'
  // semánticos
  | 'surface'
  | 'surface-muted'
  | 'content'
  | 'content-muted'
  | 'primary-content'
  | 'subtle'
