// Utilidades de fecha para la zona horaria de Colombia (America/Bogota, UTC-5).
// Requiere que process.env.TZ = 'America/Bogota' esté activo (se establece en server.js).
// Nunca usar toISOString() para obtener "hoy": siempre devuelve UTC, no la hora local.

function todayStr() {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

module.exports = { todayStr, daysFromNow }
