/**
 * Conversiones entre lo que devuelven los campos de fecha del navegador (que
 * siempre son horarios locales, sin zona) y el ISO 8601 que espera el backend.
 *
 * Nunca se usa `toISOString()`: pasa la fecha a UTC y, en Argentina (UTC-3),
 * eso corre el día en cualquier hora anterior a las 3 AM. Acá el string se arma
 * con los componentes locales y se le agrega el offset explícito, así el
 * instante que se manda es exactamente el que el usuario eligió.
 */

function pad(valor: number, largo = 2): string {
  return String(valor).padStart(largo, '0')
}

/** El offset local en formato `+HH:MM` / `-HH:MM` para esa fecha puntual. */
function offsetLocal(fecha: Date): string {
  // getTimezoneOffset() devuelve los minutos que hay que SUMAR para llegar a
  // UTC, o sea con el signo al revés del que lleva el ISO.
  const minutos = -fecha.getTimezoneOffset()
  const signo = minutos < 0 ? '-' : '+'
  const absoluto = Math.abs(minutos)

  return `${signo}${pad(Math.floor(absoluto / 60))}:${pad(absoluto % 60)}`
}

/** Un `Date` local → ISO 8601 con offset (ej. `2026-08-27T14:30:00.000-03:00`). */
export function aIsoConOffset(fecha: Date): string {
  const dia = `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`
  const hora = `${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`

  return `${dia}T${hora}.${pad(fecha.getMilliseconds(), 3)}${offsetLocal(fecha)}`
}

/**
 * El valor de un `<input type="datetime-local">` (`YYYY-MM-DDTHH:mm`) → `Date`
 * en horario local. Se parsea por componentes y no con `new Date(valor)` para
 * no depender de cómo interpreta cada navegador un string sin zona.
 */
export function desdeValorLocal(valor: string): Date {
  const [dia, hora = '00:00'] = valor.split('T')
  const [anio, mes, diaDelMes] = dia.split('-').map(Number)
  const [horas, minutos] = hora.split(':').map(Number)

  return new Date(anio, mes - 1, diaDelMes, horas, minutos)
}

/** `true` si el valor no es una fecha que el navegador (o el usuario) pueda haber roto. */
export function esValorLocalValido(valor: string): boolean {
  return !Number.isNaN(desdeValorLocal(valor).getTime())
}

/** Ahora mismo, con el formato que espera un `<input type="datetime-local">`. */
export function ahoraParaInputLocal(): string {
  const ahora = new Date()
  const dia = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`

  return `${dia}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`
}

/**
 * Un `YYYY-MM-DD` de un `<input type="date">` → el instante en que arranca ese
 * día en hora local, en ISO con offset.
 */
export function inicioDelDiaIso(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number)

  return aIsoConOffset(new Date(anio, mes - 1, dia, 0, 0, 0, 0))
}

/**
 * Un `YYYY-MM-DD` → el último instante de ese día en hora local, en ISO con
 * offset. Es lo que hace que un "hasta" incluya todo el día elegido: el backend
 * compara contra `fecha_movimiento`, que lleva hora, así que mandar la fecha
 * pelada dejaría afuera todo lo que pasó después de las 00:00.
 */
export function finDelDiaIso(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number)

  return aIsoConOffset(new Date(anio, mes - 1, dia, 23, 59, 59, 999))
}
