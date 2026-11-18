// Lógica pura del mensaje de renovación y la oferta del Catálogo de venta.
// Sin React ni red: se prueba en renovacion.test.js. Decide qué precio ve el
// cliente, así que cualquier cambio aquí debe venir con su prueba.
import { formatDate, formatCurrency } from '../../../utils/excelUtils'
import { MARCA_CLIENTE, PAGO_NEQUI, PAGO_LLAVE } from '../../../config/negocio'
import { calcDias } from './rowHelpers'

// Familias del catálogo que entran en la oferta (en este orden). Los meses que
// se pagan definen la familia; los meses de REGALO salen del Catálogo de venta
// (duracionDias del plan): Semestral 210 días = 7 meses → regala 1; Anual 426
// días = 14 meses → regala 2. Si cambias la promoción en el catálogo, el
// mensaje cambia solo — nunca se promete un regalo que el catálogo no tiene.
export const FAMILIAS_OFERTA = [
  { match: /mensual/i,   emoji: '📌', mesesPago: 1,  gancho: 'ideal para ir mes a mes' },
  { match: /semestral/i, emoji: '⭐', mesesPago: 6,  gancho: '' },
  { match: /anual/i,     emoji: '👑', mesesPago: 12, gancho: 'el favorito' },
]

const DIAS_POR_MES = 30

// Meses totales que da un plan según su duración en el catálogo
export function mesesDePlan(duracionDias) {
  const d = Number(duracionDias)
  return Number.isFinite(d) && d > 0 ? Math.round(d / DIAS_POR_MES) : 0
}

// Meses de regalo = meses que da el plan − meses que se pagan (nunca negativo)
export function mesesGratisDe(duracionDias, mesesPago) {
  return Math.max(0, mesesDePlan(duracionDias) - mesesPago)
}

// El mensaje de renovación aplica a VENCIDO y ALERTA (PROXIMO A VENCER);
// el marcador manual CORTESIA se respeta: a una cortesía no se le cobra.
export function esRenovable(row) {
  const estado = (row.estadoReal || '').toUpperCase()
  const alerta = (row.alertaReal || '').toUpperCase()
  return (estado === 'VENCIDO' || estado === 'ALERTA') && alerta !== 'CORTESIA'
}

export function tipoPlanDe(row, pago) {
  if (pago?.tipoPlan) return pago.tipoPlan
  if (row.tipoPlan) return row.tipoPlan
  const d = row.duracionPlan != null ? Math.floor(Number(row.duracionPlan)) : null
  return { 14: 'Plan Anual', 7: 'Plan Semestral', 1: 'Plan Mensual' }[d] || '—'
}

export function diasRestantesDe(row) {
  return calcDias(row.duracionReal || row.finalizacion) ?? row.diasVencimientoReal ?? row.diasVencimiento ?? null
}

export function mesRestanteDe(row) {
  const dias = diasRestantesDe(row)
  if (dias == null) return '—'
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`
  if (dias < 30) return `${dias} día${dias === 1 ? '' : 's'}`
  return `${+(dias / 30).toFixed(1)} meses`
}

// Arma la oferta con precios del Catálogo de venta. Si la cuenta tiene un
// número de pantallas con combo exacto en el catálogo (1, 2, 3…) se ofrece el
// combo; si no existe combo para esa cantidad, se ofertan precios por
// pantalla (los de 1 pantalla) — nunca se inventan precios no catalogados.
export function ofertasDe(catalogo = [], pantallas = 1) {
  const disponibles = new Set(catalogo.map(p => p.numeroPantallas))
  const exacto = disponibles.has(pantallas)
  const nPrecio = exacto ? pantallas : 1
  const ofertas = FAMILIAS_OFERTA
    .map(f => {
      const plan = catalogo.find(p => f.match.test(p.nombre || '') && p.numeroPantallas === nPrecio)
      return plan
        ? { ...f, nombre: plan.nombre, precio: Number(plan.precio), mesesGratis: mesesGratisDe(plan.duracionDias, f.mesesPago) }
        : null
    })
    .filter(Boolean)
  return { ofertas, combo: exacto && pantallas > 1, porPantalla: !exacto && pantallas > 1 }
}

// El mensaje se arma SOLO para la cuenta (fila del Planificador) que se está
// renovando: precio según las pantallas de esa cuenta, no la suma de todas las
// cuentas del cliente. Si el cliente tiene varias cuentas, se nombra la cuenta
// por su nickname para que sepa cuál es la que vence.
export function construirMensaje({ row, pantallas, ofertas, combo, porPantalla, identificarCuenta }) {
  const nombre = (row.nombre || '').trim() || (row.nickname || '').trim()
  const dias = diasRestantesDe(row)
  const fechaFin = formatDate(row.duracionReal || row.finalizacion)
  const vencido = dias == null || dias <= 0

  const cuenta = (row.nickname || '').trim()
  const plan = identificarCuenta && cuenta
    ? `el plan de tu cuenta *${cuenta}* de ${MARCA_CLIENTE}`
    : `tu plan de ${MARCA_CLIENTE}`

  let situacion
  if (dias == null)    situacion = `${plan} está pendiente de renovación 😅`
  else if (dias < 0)   situacion = `${plan} se venció el ${fechaFin} 😅`
  else if (dias === 0) situacion = `${plan} vence HOY (${fechaFin}) ⏳`
  else if (dias === 1) situacion = `${plan} vence MAÑANA (${fechaFin}) ⏳`
  else                 situacion = `${plan} vence en ${dias} días (el ${fechaFin}) ⏳`

  const puente = vencido
    ? 'La buena noticia: reactivarlo toma 1 minuto y te mantengo los mismos precios de siempre.'
    : 'Renovando hoy sigues sin cortes — cero interrupciones y los mismos precios de siempre.'

  let intro
  if (combo)            intro = `Como esta cuenta tiene ${pantallas} pantallas, te dejo los precios del combo para renovarla completa:`
  else if (porPantalla) intro = `Esta cuenta tiene ${pantallas} pantallas — estos son los precios por cada pantalla:`
  else                  intro = 'Mira las opciones:'

  const etiqueta = combo ? ` (${pantallas} pantallas)` : ''
  const bullets = ofertas.map(o => {
    const precio = formatCurrency(o.precio)
    if (!o.mesesGratis) {
      const cola = o.gancho ? ` — ${o.gancho}` : ''
      return `${o.emoji} *${o.nombre}*${etiqueta}: ${precio} · ${o.mesesPago} mes${o.mesesPago === 1 ? '' : 'es'}${cola}`
    }
    const total = o.mesesPago + o.mesesGratis
    const porMes = formatCurrency(Math.round(o.precio / total))
    const cola = o.gancho ? ` — ${o.gancho}` : ''
    return `${o.emoji} *${o.nombre}*${etiqueta}: ${precio} · pagas ${o.mesesPago} meses ¡y te REGALAMOS ${o.mesesGratis === 1 ? '1 mes' : `${o.mesesGratis} meses`}! Son ${total} meses corridos, a ${porMes}/mes${cola}`
  }).join('\n')

  const cierre = vencido
    ? 'Me envías el pantallazo del pago y te reactivo de una, para que no te pierdas ni un segundo. 😉'
    : 'Me envías el pantallazo del pago y te dejo renovado de una, sin que se te corte la señal. 😉'

  return [
    nombre ? `¡Hola, ${nombre}! 📺 ¿Cómo estás?` : '¡Hola! 📺 ¿Cómo estás?',
    `Te escribo rapidito: ${situacion} y no queremos que te quedes sin tus series, películas y deportes en vivo.`,
    `${puente} ${intro}`,
    bullets,
    `Renuevas en un momento:\n📲 Nequi: ${PAGO_NEQUI}\n🔑 Llave: ${PAGO_LLAVE}`,
    cierre,
  ].filter(Boolean).join('\n\n')
}
