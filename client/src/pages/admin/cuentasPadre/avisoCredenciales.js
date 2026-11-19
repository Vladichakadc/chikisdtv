// Mensaje de WhatsApp para avisar a un cliente que, por mantenimiento, las
// credenciales de acceso de su cuenta cambiaron.

export const APP_NOMBRE = 'FlujoTV'

// Primer nombre del cliente (o el nickname si no hay nombre)
export function saludoDe({ nombre, nickname } = {}) {
  const base = String(nombre || '').trim().split(/\s+/)[0] || String(nickname || '').trim()
  return base ? `¡Hola, ${base}! 👋` : '¡Hola! 👋'
}

export function mensajeAvisoCredenciales({ nombre, nickname, usuario, contrasena } = {}) {
  return [
    saludoDe({ nombre, nickname }),
    `Te escribimos para informarte que realizamos un *mantenimiento programado* en la aplicación *${APP_NOMBRE}* y, como parte de este proceso, *tus credenciales de acceso fueron actualizadas*.`,
    `Para seguir disfrutando de tu servicio sin interrupciones, cierra la sesión actual en *${APP_NOMBRE}* e ingresa nuevamente con los siguientes datos:`,
    `👤 *Usuario:* ${usuario || '—'}\n🔑 *Contraseña:* ${contrasena || '—'}`,
    'Te recomendamos escribirlos tal cual aparecen (respetando mayúsculas y minúsculas). Si tienes algún inconveniente para ingresar, respóndenos este mensaje y con gusto te ayudamos. 🙌',
    '¡Gracias por tu comprensión y por confiar en nosotros! 📺',
  ].join('\n\n')
}
