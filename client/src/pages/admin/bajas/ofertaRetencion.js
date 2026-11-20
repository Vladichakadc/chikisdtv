// Oferta de regreso para un cliente dado de baja (plan de retención).
//
// Reglas (alineadas con buenas prácticas de win-back):
//   · Tres opciones —mensual, semestral y anual— para las mismas pantallas que
//     tenía el cliente. Semestral y anual llevan los meses de regalo de
//     siempre (6+1 y 12+2), así que el valor por mes baja de verdad.
//   · Si el cliente pagaba menos que el catálogo actual en esa misma
//     modalidad, se le respeta su precio de siempre.
//   · Una sola estrategia agresiva para todos (ESTRATEGIA): descuento máximo
//     (30 %, el tope para no enseñar a cancelar por rebaja), plan anual
//     destacado y fecha límite corta. El mensaje solo promete lo que el
//     servicio ya incluye.
import { MARCA_CLIENTE, PAGO_NEQUI, PAGO_LLAVE } from '../../../config/negocio'

export const MODALIDADES = [
  { clave: 'mensual', nombre: 'Mensual', patron: /mensual/i, pagas: 1, regalo: 0 },
  { clave: 'semestral', nombre: 'Semestral', patron: /semestral/i, pagas: 6, regalo: 1 },
  { clave: 'anual', nombre: 'Anual', patron: /anual/i, pagas: 12, regalo: 2 },
]
const DESCUENTO_MAXIMO_VALOR = 30
export const DESCUENTO_MAXIMO = DESCUENTO_MAXIMO_VALOR

// Estrategia única y agresiva para todos los clientes, sin importar el motivo:
// el descuento más alto permitido, el plan anual destacado (el de menor valor
// por mes, con 2 meses de regalo) y una ventana corta de 3 días.
export const ESTRATEGIA = {
  descuento: DESCUENTO_MAXIMO_VALOR,
  recomendado: 'anual',
  vigenciaDias: 3,
  gancho: 'Te extrañamos 💔 y queremos que vuelvas YA: si regresas en estos días, te damos nuestro *descuento de regreso más alto*.',
}
export const estrategiaDe = () => ESTRATEGIA

const pesos = (v) => `$${Math.round(Number(v) || 0).toLocaleString('es-CO')}`
export const redondear500 = (v) => Math.round((Number(v) || 0) / 500) * 500
export const modalidadDe = (tipoPlan) => MODALIDADES.find(m => m.patron.test(String(tipoPlan || '')))?.clave || null

// Precio del catálogo activo para una modalidad y número de pantallas
export function precioCatalogo(planes, modalidad, pantallas) {
  const m = MODALIDADES.find(x => x.clave === modalidad)
  const candidatos = (planes || []).filter(p => m.patron.test(p.nombre) && Number(p.precio) > 0)
  const exacto = candidatos.find(p => (Number(p.numeroPantallas) || 1) === pantallas)
  return exacto ? Math.round(Number(exacto.precio)) : null
}

// Precios base (sin descuento) de las tres modalidades
export function preciosBase(candidato, planes) {
  const pantallas = Math.max(1, Number(candidato.pantallas) || 1)
  const ultima = candidato.ultimaVenta
  const modUltima = modalidadDe(ultima?.tipoPlan || candidato.tipoPlan)
  const base = {}
  const respetado = {}
  for (const m of MODALIDADES) {
    let p = precioCatalogo(planes, m.clave, pantallas)
    if (m.clave === modUltima && ultima?.precioVenta > 0 && (p == null || ultima.precioVenta < p)) {
      p = Math.round(ultima.precioVenta)
      respetado[m.clave] = true
    }
    base[m.clave] = p
  }
  return { base, respetado, pantallas, modUltima }
}

const fechaLarga = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
export function sumarDias(iso, n) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('en-CA')
}
const primerNombre = (c) => String(c.nombre || c.nickname || '').trim().split(/\s+/)[0] || ''

// Arma la oferta completa: opciones con precios y el texto para WhatsApp
export function construirOferta(candidato, planes, { descuento, vigenciaDias = 7, recomendado, base: baseManual, hoy }) {
  const { base: baseCatalogo, respetado, pantallas, modUltima } = preciosBase(candidato, planes)
  const base = { ...baseCatalogo, ...(baseManual || {}) }
  const d = Math.min(DESCUENTO_MAXIMO, Math.max(0, Number(descuento) || 0))
  const mensualBase = base.mensual

  const opciones = MODALIDADES.filter(m => Number(base[m.clave]) > 0).map(m => {
    const precioBase = Math.round(Number(base[m.clave]))
    const precio = d ? redondear500(precioBase * (1 - d / 100)) : precioBase
    const meses = m.pagas + m.regalo
    // Ahorro frente a pagar mes a mes los mismos meses al precio mensual normal
    const ahorroVsMensual = mensualBase && m.clave !== 'mensual' ? Math.max(0, mensualBase * meses - precio) : 0
    return {
      clave: m.clave, nombre: m.nombre, pagas: m.pagas, regalo: m.regalo, meses,
      precioBase, precio, ahorroDescuento: precioBase - precio, porMes: Math.round(precio / meses),
      ahorroVsMensual, respetado: !!respetado[m.clave], ultimo: m.clave === modUltima,
    }
  })
  const destacado = opciones.find(o => o.clave === recomendado)?.clave
    || opciones.find(o => o.ultimo)?.clave || opciones[0]?.clave || null
  for (const o of opciones) o.recomendado = o.clave === destacado

  const validoHasta = sumarDias(hoy || new Date().toLocaleDateString('en-CA'), vigenciaDias)
  const mensaje = mensajeOferta({ candidato, opciones, descuento: d, validoHasta, pantallas })
  return { opciones, descuento: d, validoHasta, mensaje, pantallas }
}

const NUMEROS = ['1️⃣', '2️⃣', '3️⃣']
export function mensajeOferta({ candidato, opciones, descuento, validoHasta, pantallas }) {
  const nombre = primerNombre(candidato)
  const est = estrategiaDe()
  const pant = pantallas === 1 ? 'tu pantalla' : `tus ${pantallas} pantallas`
  const ultimo = candidato.ultimaVenta?.tipoPlan || (candidato.tipoPlan !== 'Sin plan' ? candidato.tipoPlan : null)

  const lineas = opciones.map((o, i) => {
    const titulo = o.regalo ? `*${o.nombre}* (${o.pagas} meses + ${o.regalo} de regalo 🎁)` : `*${o.nombre}*`
    const precio = o.ahorroDescuento > 0 ? `~${pesos(o.precioBase)}~ *${pesos(o.precio)}*` : `*${pesos(o.precio)}*`
    const extra = [
      o.meses > 1 ? `sale a ${pesos(o.porMes)}/mes` : null,
      o.respetado ? 'tu precio de siempre' : null,
    ].filter(Boolean).join(' · ')
    return `${NUMEROS[i] || '•'} ${titulo} — ${precio}${extra ? `\n     ${extra}` : ''}${o.recomendado ? '  ⭐ *Recomendado*' : ''}`
  })

  const mejorAhorro = opciones.reduce((m, o) => (o.ahorroVsMensual > (m?.ahorroVsMensual || 0) ? o : m), null)

  return [
    `¡Hola${nombre ? ` ${nombre}` : ''}! 👋 Te saluda *${MARCA_CLIENTE}* 📺`,
    est.gancho,
    `${ultimo ? `Tu último plan con nosotros fue el *${ultimo}*. ` : ''}Para que vuelvas, te preparamos una *oferta especial de regreso*${descuento ? ` con *${descuento}% de descuento*` : ''} para ${pant}:`,
    lineas.join('\n'),
    mejorAhorro ? `💡 Con el plan ${mejorAhorro.nombre.toLowerCase()} ahorras ${pesos(mejorAhorro.ahorroVsMensual)} frente a pagar mes a mes.` : null,
    '✨ Incluye +800 canales HD, deportes en vivo y +9.000 películas y series.\n🛠️ Te dejamos todo funcionando con soporte por videollamada de WhatsApp.',
    `💳 *Para activar, consigna a:*\n📲 Nequi: ${PAGO_NEQUI}\n🔑 Llave BreB: ${PAGO_LLAVE}\n🌎 PayPal (pagos internacionales)`,
    `⏳ *Solo hasta el ${fechaLarga(validoHasta)}.* Después vuelve al precio normal.`,
    'Respóndeme *VUELVO* con el plan que prefieres y envíame el comprobante: te reactivo hoy mismo. 😉',
  ].filter(Boolean).join('\n\n')
}
