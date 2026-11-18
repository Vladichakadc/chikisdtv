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

// Enlace de WhatsApp con el texto prellenado. Se usa api.whatsapp.com directo
// (el destino oficial de wa.me): el redirect de wa.me cambia emojis por U+FFFD.
export function urlWhatsAppTexto(numero, texto) {
  const t = encodeURIComponent(texto || '')
  return numero
    ? `https://api.whatsapp.com/send/?phone=${numero}&text=${t}`
    : `https://api.whatsapp.com/send/?text=${t}`
}
