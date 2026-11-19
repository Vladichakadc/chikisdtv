// Mensaje de WhatsApp para avisar a un cliente que, por mantenimiento, las
// credenciales de acceso de su cuenta de FlujoTV cambiaron. Nombra el o los
// nicknames afectados para que un cliente con varias cuentas sepa cuál cambió.

export const APP_NOMBRE = 'FlujoTV'
const SEPARADOR = '━━━━━━━━━━━━━━━━'

// Primer nombre del cliente (o el nickname si no hay nombre)
export function saludoDe({ nombre, nickname } = {}) {
  const base = String(nombre || '').trim().split(/\s+/)[0] || String(nickname || '').trim()
  return base ? `¡Hola, ${base}! 👋` : '¡Hola! 👋'
}

// ['A','B','C'] → "*A*, *B* y *C*"
export function listar(items = []) {
  const n = items.filter(Boolean).map(x => `*${x}*`)
  if (n.length <= 1) return n[0] || ''
  return `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`
}

export function mensajeAvisoCredenciales({ nombre, nicknames = [], otrasCuentas = [], usuario, contrasena, nota } = {}) {
  const nicks = nicknames.filter(Boolean)
  const varias = nicks.length > 1
  const cuentas = listar(nicks)
  const otras = otrasCuentas.filter(Boolean)
  const lineas = [
    saludoDe({ nombre, nickname: nicks[0] }),
    `🛠️ *Aviso de mantenimiento · ${APP_NOMBRE}*`,
    nicks.length
      ? `Realizamos un mantenimiento programado en la aplicación *${APP_NOMBRE}* y, como parte de este proceso, actualizamos los datos de acceso de ${varias ? 'tus cuentas' : 'tu cuenta'}:\n\n📺 ${cuentas}`
      : `Realizamos un mantenimiento programado en la aplicación *${APP_NOMBRE}* y, como parte de este proceso, actualizamos tus datos de acceso.`,
    [
      SEPARADOR,
      '🔐 *TUS NUEVOS DATOS DE ACCESO*',
      '',
      `👤 Usuario: \`${usuario || '—'}\``,
      `🔑 Contraseña: \`${contrasena || '—'}\``,
      SEPARADOR,
    ].join('\n'),
    [
      '✅ *¿Qué debes hacer?*',
      `1️⃣ Abre *${APP_NOMBRE}* en ${varias ? 'los dispositivos' : 'el dispositivo'} donde usas ${cuentas || 'tu cuenta'}.`,
      '2️⃣ Cierra la sesión actual.',
      '3️⃣ Ingresa con el usuario y la contraseña de arriba, tal cual aparecen (respetando mayúsculas y minúsculas).',
    ].join('\n'),
    otras.length
      ? (otras.length > 1
          ? `ℹ️ Tus otras cuentas (${listar(otras)}) *no cambian*: siguen funcionando con sus datos de siempre.`
          : `ℹ️ Tu otra cuenta (${listar(otras)}) *no cambia*: sigue funcionando con sus datos de siempre.`)
      : null,
    String(nota || '').trim() ? `📝 ${String(nota).trim()}` : null,
    '💬 ¿Tienes algún inconveniente? Respóndenos este mensaje y con gusto te ayudamos.',
    '¡Gracias por tu comprensión y por confiar en nosotros! 📺✨',
  ]
  return lineas.filter(Boolean).join('\n\n')
}

// Divide una línea con formato de WhatsApp (*negrita*, _cursiva_, `código`)
// en segmentos para mostrar la vista previa tal como la verá el cliente.
export function segmentosWhatsApp(linea = '') {
  const out = []
  const re = /(\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g
  let ultimo = 0
  for (const m of linea.matchAll(re)) {
    if (m.index > ultimo) out.push({ tipo: 'texto', valor: linea.slice(ultimo, m.index) })
    const t = m[0]
    out.push({ tipo: t[0] === '*' ? 'negrita' : t[0] === '_' ? 'cursiva' : 'codigo', valor: t.slice(1, -1) })
    ultimo = m.index + t.length
  }
  if (ultimo < linea.length) out.push({ tipo: 'texto', valor: linea.slice(ultimo) })
  return out
}
