// Normaliza un teléfono al formato internacional que espera WhatsApp
// (solo dígitos, con indicativo de país, sin "+"). Reglas, en orden:
//  1. "+…" o "00…": ya trae indicativo → se respeta.
//  2. Con país conocido: si los dígitos ya empiezan por su indicativo (y son
//     largos) se dejan; si no, se antepone (quitando un 0 inicial de troncal,
//     p. ej. Venezuela 0412… → 58 412…).
//  3. Sin país: celular colombiano de 10 dígitos que empieza por 3 → 57…;
//     12 dígitos que empiezan por 573 → ya trae indicativo.
//  4. Si nada aplica, queda como está y se marca "sin indicativo" para avisar.
import { indicativoDe } from '../config/paises'

const LARGO_MIN = 8
const LARGO_MAX = 15

export function normalizarTelefono(raw, pais) {
  const texto = String(raw ?? '').trim()
  let digitos = texto.replace(/\D/g, '')
  if (!digitos) return { numero: '', conIndicativo: false, origen: 'vacio' }

  const largoOk = (n) => n.length >= LARGO_MIN && n.length <= LARGO_MAX

  if (texto.startsWith('+') || digitos.startsWith('00')) {
    if (!texto.startsWith('+')) digitos = digitos.replace(/^00/, '')
    return { numero: digitos, conIndicativo: largoOk(digitos), origen: 'internacional' }
  }

  const codigo = indicativoDe(pais)
  if (codigo) {
    if (digitos.startsWith(codigo) && digitos.length >= codigo.length + 8) {
      return { numero: digitos, conIndicativo: largoOk(digitos), origen: 'pais' }
    }
    const nacional = digitos.replace(/^0/, '')
    const numero = codigo + nacional
    return { numero, conIndicativo: largoOk(numero), origen: 'pais' }
  }

  if (digitos.length === 10 && digitos.startsWith('3')) {
    return { numero: `57${digitos}`, conIndicativo: true, origen: 'colombia' }
  }
  if (digitos.length === 12 && digitos.startsWith('573')) {
    return { numero: digitos, conIndicativo: true, origen: 'colombia' }
  }
  return { numero: digitos, conIndicativo: false, origen: 'sin_indicativo' }
}

// ¿Celular o tablet? En esos equipos WhatsApp se abre en la app; en el
// computador, en WhatsApp Web. (En Windows, Chrome y Edge también permiten
// "compartir" archivos, pero eso abre la hoja de Windows y no WhatsApp Web,
// así que la decisión se toma por el tipo de equipo y no por navigator.share.)
export function esDispositivoMovil(nav = globalThis.navigator) {
  if (!nav) return false
  if (nav.userAgentData && typeof nav.userAgentData.mobile === 'boolean') return nav.userAgentData.mobile
  const ua = String(nav.userAgent || '')
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua)) return true
  // iPadOS se presenta como Mac de escritorio, pero tiene pantalla táctil
  return /Macintosh/i.test(ua) && Number(nav.maxTouchPoints) > 1
}

// Enlace de WhatsApp.
//  · Computador con número → web.whatsapp.com/send?phone=…&text=… (chat
//    directo en WhatsApp Web). WhatsApp Web NO sabe abrir /send sin número
//    (queda la página en blanco): sin número se abre su página principal.
//  · Celular → api.whatsapp.com/send (abre la app, y sin número deja elegir
//    el chat). Se usa api.whatsapp.com y no wa.me: el redirect de wa.me
//    cambia los emojis por U+FFFD (�).
export const WHATSAPP_WEB = 'https://web.whatsapp.com/'
export function urlWhatsAppTexto(numero, texto, { movil = esDispositivoMovil() } = {}) {
  const params = [numero ? `phone=${numero}` : null, texto ? `text=${encodeURIComponent(texto)}` : null].filter(Boolean).join('&')
  if (movil) return `https://api.whatsapp.com/send/${params ? `?${params}` : ''}`
  if (!numero) return WHATSAPP_WEB
  return `https://web.whatsapp.com/send?${params}`
}

// Reserva la pestaña de WhatsApp dentro del clic (para usarla después de un
// await): si se abre más tarde, el bloqueador de ventanas la frena.
export function reservarVentanaWhatsApp() {
  return window.open('', '_blank')
}

// Abre WhatsApp. En el computador sin número, el mensaje se copia al
// portapapeles para pegarlo en el chat que se elija en WhatsApp Web.
// Devuelve { copiado } para que la pantalla lo avise.
export function abrirWhatsApp(numero, texto, { ventana } = {}) {
  const movil = esDispositivoMovil()
  const url = urlWhatsAppTexto(numero, texto, { movil })
  if (ventana && !ventana.closed) {
    ventana.location.href = url
  } else {
    window.open(url, '_blank')
  }
  const copiado = !movil && !numero && !!texto
  if (copiado) navigator.clipboard?.writeText(texto).catch(() => {})
  return { copiado }
}
// Si hubo un error después de reservar la pestaña, se cierra solo si quedó en
// blanco (nunca la pestaña de WhatsApp Web que el usuario ya tenía abierta).
export function cerrarVentanaVacia(ventana) {
  if (!ventana || ventana.closed) return
  try {
    if (ventana.location.href === 'about:blank') ventana.close()
  } catch { /* otra página (p. ej. WhatsApp Web): se deja abierta */ }
}
