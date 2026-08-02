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

// El mes/año EN CURSO está por definición incompleto — compararlo contra meses/años
// YA CERRADOS (mes anterior, mismo mes del año pasado) como si fuera un período
// equivalente sesga cualquier promedio, "mejor/peor mes" o crecimiento MoM/YoY hacia
// abajo (el día 1 de cada mes, ese mes parece "el peor" solo porque casi no ha
// transcurrido). Fuente única de verdad para /dashboard-bi, /dashboard-bi/finanzas
// y /plans/performance: todas marcan el período en curso con `parcial: true` y
// excluyen ese período de máximos/mínimos/promedios/momentum antes de calcularlos.
function getPeriodoActual() {
  const hoy = new Date()
  const anioActual = hoy.getFullYear()
  const mesActual = hoy.getMonth() + 1 // 1-based
  return { anioActual, mesActual, mesesCerrados: mesActual - 1 }
}

const esMesParcial = (anio, mes, ref = getPeriodoActual()) =>
  Number(anio) === ref.anioActual && Number(mes) === ref.mesActual

const esAnioParcial = (anio, ref = getPeriodoActual()) =>
  Number(anio) === ref.anioActual

module.exports = { todayStr, daysFromNow, getPeriodoActual, esMesParcial, esAnioParcial }
