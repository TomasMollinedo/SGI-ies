import {
  Building2,
  ClipboardCheck,
  Clock,
  Compass,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  UserPlus,
} from 'lucide-react'
import type {
  DatoContacto,
  ItemNavegacion,
  LineaTitulo,
  NumeroDestacado,
  PasoComoFunciona,
} from '@/features/ecommerce/types/sitioPublico.types'

/**
 * TODO el contenido estático de la landing (HU-24). Ningún texto visible se
 * escribe en los componentes: cambiar el eslogan, un número de teléfono o el
 * orden del menú se hace acá y en ningún otro lado.
 *
 * DATOS DE CONTACTO PROVISIONALES: teléfono, WhatsApp, email, dirección y
 * horario son de muestra. Reemplazar por los reales de IES antes de publicar.
 */

export const EMPRESA = {
  nombreCompleto: 'IES Desarrollos Inmobiliarios',
  /** Alt del logo en el header y el footer. */
  altLogo: 'IES Desarrollos Inmobiliarios',
} as const

export const NAVEGACION: ItemNavegacion[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'obras', label: 'Obras' },
  { id: 'consultanos', label: 'Consultanos' },
]

export const HERO = {
  badge: 'Desde 2010 • Obras públicas y privadas',
  titulo: [
    { texto: 'Construimos', acento: false },
    { texto: 'espacios,', acento: false },
    { texto: 'creamos', acento: true },
    { texto: 'historias', acento: true },
  ] satisfies LineaTitulo[],
  cta: 'Ver nuestras obras',
  /** Vive en `public/`, así que se referencia por ruta absoluta (no se importa). */
  imagen: '/landing.svg',
  imagenAlt:
    'Torres de departamentos vidriadas construidas por IES, enmarcadas por líneas en terracota',
} as const

export const NOSOTROS = {
  etiqueta: 'Nosotros',
  titulo: 'Más de una década levantando el norte argentino',
  texto:
    'Somos una constructora de Salta capital. Ejecutamos obras públicas y privadas y desarrollamos proyectos propios de vivienda, del primer plano a la entrega de llaves, con equipo propio y plazos que cumplimos.',
  /*
   * PENDIENTE DE CONFIRMAR: los tres últimos son estimaciones coherentes entre
   * sí (unas 4 obras por año, de las cuales 12 son desarrollos propios, con un
   * promedio de 28 unidades cada uno), no datos verificados de la empresa.
   */
  numeros: [
    { valor: '+15', etiqueta: 'Años de trayectoria' },
    { valor: '+60', etiqueta: 'Obras públicas y privadas' },
    { valor: '12', etiqueta: 'Proyectos de vivienda propios' },
    { valor: '+340', etiqueta: 'Unidades entregadas' },
  ] satisfies NumeroDestacado[],
} as const

export const OBRAS = {
  etiqueta: 'Obras',
  titulo: 'Proyectos destacados',
  subtitulo: 'Las obras con más unidades disponibles para comprar hoy.',
  cta: 'Ver todas las obras',
  /** Textos de cada tarjeta. `{cantidad}` se reemplaza por el número real. */
  unidadesDisponibles: (cantidad: number) =>
    cantidad === 1 ? '1 unidad disponible' : `${cantidad} unidades disponibles`,
  precioDesde: 'Desde',
  sinImagen: 'Obra sin imagen de portada',
} as const

export const COMO_FUNCIONA = {
  etiqueta: 'Cómo funciona',
  titulo: 'De la búsqueda a las llaves, en cuatro pasos',
  pasos: [
    {
      titulo: 'Explorá nuestras obras',
      descripcion: 'Mirá los proyectos en marcha y las unidades disponibles en cada uno.',
      icono: Compass,
    },
    {
      titulo: 'Elegí tu unidad',
      descripcion: 'Comparás tipología, superficie, piso y precio desde el catálogo.',
      icono: Building2,
    },
    {
      titulo: 'Registrate y consultá',
      descripcion: 'Creás tu cuenta con Google y nos escribís por la unidad que te interesa.',
      icono: UserPlus,
    },
    {
      titulo: 'Reservá',
      descripcion: 'Coordinamos la visita, el plan de pago y la reserva de tu unidad.',
      icono: ClipboardCheck,
    },
  ] satisfies PasoComoFunciona[],
} as const

export const CONTACTO = {
  etiqueta: 'Consultanos',
  titulo: 'Hablemos de tu próxima propiedad',
  texto: 'Escribinos o acercate a la oficina: te respondemos en el día.',
  /*
   * DATOS PROVISIONALES: teléfono, WhatsApp, email, dirección y horario son de
   * ejemplo —formato válido de Salta, pero inventados— para que la pantalla se
   * vea completa. Reemplazar por los de IES antes de publicar: el teléfono y el
   * WhatsApp llevan a llamar y a escribir de verdad.
   *
   * Al cambiarlos, actualizar también el `href`: en `tel:` y `wa.me` va el
   * número sin espacios ni guiones y con código de país.
   */
  datos: [
    {
      etiqueta: 'Teléfono',
      valor: '+54 387 400-0000',
      href: 'tel:+543874000000',
      icono: Phone,
    },
    {
      etiqueta: 'WhatsApp',
      valor: '+54 9 387 400-0000',
      href: 'https://wa.me/5493874000000',
      icono: MessageCircle,
    },
    {
      etiqueta: 'Email',
      valor: 'contacto@iesdesarrollos.com.ar',
      href: 'mailto:contacto@iesdesarrollos.com.ar',
      icono: Mail,
    },
    {
      etiqueta: 'Dirección',
      valor: 'Av. Belgrano 1200, Salta capital, Salta',
      icono: MapPin,
    },
    {
      etiqueta: 'Horario de atención',
      valor: 'Lunes a viernes de 8 a 17 h',
      icono: Clock,
    },
  ] satisfies DatoContacto[],
} as const

export const FOOTER = {
  /** El año se agrega en runtime, no se escribe en el texto. */
  copyright: `${EMPRESA.nombreCompleto}. Todos los derechos reservados.`,
} as const

export const HEADER = {
  volverAlInicio: 'Volver al inicio',
  tituloMenu: 'Menú de navegación',
  abrirMenu: 'Abrir menú',
  cerrarMenu: 'Cerrar menú',
  iniciarSesion: 'Iniciar sesión o registrarme',
} as const
