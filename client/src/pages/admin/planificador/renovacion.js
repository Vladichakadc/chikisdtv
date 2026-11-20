// Lógica pura del mensaje de renovación y la oferta del Catálogo de venta.
// Sin React ni red: se prueba en renovacion.test.js. Decide qué precio ve el
// cliente, así que cualquier cambio aquí debe venir con su prueba.
import { formatDate, formatCurrency } from '../../../utils/excelUtils'
import { MARCA_CLIENTE, PAGO_NEQUI, PAGO_LLAVE } from '../../../config/negocio'
import { calcDias, esCortesia } from './rowHelpers'

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

// ── Secuencia de cobro ────────────────────────────────────────────────────
// Tres mensajes por ciclo de plan, cada uno con su tono:
//  1. antes    (amable)  — mientras el plan está por vencer
//  2. dia      (directo) — el día del vencimiento (y los 2 días siguientes si
//                          no se alcanzó a enviar a tiempo)
//  3. despues  (firme)   — desde el día 3 después de vencer
export const DIAS_SEGUIMIENTO = 3
export const ETAPAS_COBRO = {
  antes:   { orden: 1, corto: 'Antes',   label: '1 · Antes de vencer',  tono: 'amable' },
  dia:     { orden: 2, corto: 'Día',     label: '2 · Día del vencimiento', tono: 'directo' },
  despues: { orden: 3, corto: '+3 días', label: `3 · A los ${DIAS_SEGUIMIENTO} días`, tono: 'firme' },
}

// Etapa que corresponde según los días al fin del plan
export function etapaSugerida(dias) {
  if (dias == null) return 'despues'
  if (dias > 0) return 'antes'
  if (dias > -DIAS_SEGUIMIENTO) return 'dia'
  return 'despues'
}

// Etapa que TOCA enviar hoy: la sugerida, salvo que ya se haya enviado en
// este ciclo (null = la secuencia está al día para esta pantalla).
export function etapaPendiente(dias, enviadas = []) {
  const e = etapaSugerida(dias)
  return enviadas.includes(e) ? null : e
}

// El mensaje de renovación aplica a VENCIDO y ALERTA (PROXIMO A VENCER);
// el marcador manual CORTESIA se respeta: a una cortesía no se le cobra.
export function esRenovable(row) {
  const estado = (row.estadoReal || '').toUpperCase()
  return (estado === 'VENCIDO' || estado === 'ALERTA') && !esCortesia(row)
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
export function construirMensaje({ row, pantallas, ofertas, combo, porPantalla, identificarCuenta, etapa }) {
  const nombre = (row.nombre || '').trim() || (row.nickname || '').trim()
  const dias = diasRestantesDe(row)
  const fechaFin = formatDate(row.duracionReal || row.finalizacion)
  const vencido = dias == null || dias <= 0
  const paso = ETAPAS_COBRO[etapa] ? etapa : etapaSugerida(dias)

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

  // Tono según la etapa de la secuencia de cobro
  let apertura, puente, cierre
  if (paso === 'antes') {
    apertura = `Te escribo rapidito: ${situacion} y no queremos que te quedes sin tus series, películas y deportes en vivo.`
    puente = vencido
      ? 'La buena noticia: reactivarlo toma 1 minuto y te mantengo los mismos precios de siempre.'
      : 'Renovando hoy sigues sin cortes — cero interrupciones y los mismos precios de siempre.'
    cierre = vencido
      ? 'Me envías el pantallazo del pago y te reactivo de una, para que no te pierdas ni un segundo. 😉'
      : 'Me envías el pantallazo del pago y te dejo renovado de una, sin que se te corte la señal. 😉'
  } else if (paso === 'dia') {
    apertura = `Te aviso: ${situacion}.`
    puente = 'Si renuevas hoy mismo no pierdes ni un día de servicio y conservas tus precios de siempre.'
    cierre = 'Envíame el pantallazo del pago y lo dejo activo de inmediato. ⏰'
  } else {
    const hace = dias != null && dias < 0 ? ` (hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'})` : ''
    apertura = `Te escribo porque ${plan} se venció el ${fechaFin}${hace} y todavía no hemos recibido la renovación.`
    puente = 'Queremos que sigas con nosotros: reactivarlo toma 1 minuto y te mantengo los mismos precios de siempre.'
    cierre = 'Me envías el pantallazo del pago y te reactivo de una. Si prefieres no continuar, cuéntame y libero tu pantalla, sin problema. 🙏'
  }

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

  return [
    nombre ? `¡Hola, ${nombre}! 📺 ¿Cómo estás?` : '¡Hola! 📺 ¿Cómo estás?',
    apertura,
    `${puente} ${intro}`,
    bullets,
    `Renuevas en un momento:\n📲 Nequi: ${PAGO_NEQUI}\n🔑 Llave: ${PAGO_LLAVE}`,
    cierre,
  ].filter(Boolean).join('\n\n')
}

// Arma todo lo del mensaje de renovación de UNA cuenta a partir de la
// respuesta de /planificador/comprobante (catálogo y nº de cuentas del cliente)
export function prepararRenovacion(row, datos = {}, etapa) {
  const pantallas = Math.max(1, Math.floor(Number(row.pantallas)) || 1)
  const oferta = ofertasDe(datos.catalogo || [], pantallas)
  const identificarCuenta = (datos.pantallasCliente || 1) > 1
  const paso = ETAPAS_COBRO[etapa] ? etapa : etapaSugerida(diasRestantesDe(row))
  const mensaje = construirMensaje({ row, pantallas, ...oferta, identificarCuenta, etapa: paso })
  return { ...oferta, pantallas, identificarCuenta, etapa: paso, mensaje }
}

// ── Registrar renovación (formulario del Planificador) ────────────────────
// Meses por familia cuando el catálogo no trae el plan (coincide con la
// duración que el Planificador ya usaba: Mensual 1, Semestral 7, Anual 14).
const MESES_POR_FAMILIA = [
  { match: /mensual/i, meses: 1 },
  { match: /semestral/i, meses: 7 },
  { match: /anual/i, meses: 14 },
]

// Plan del catálogo que corresponde a un tipo de plan de Pagos ("Plan Anual")
// y a las pantallas de la cuenta
export function planCatalogoDe(tipoPlan, catalogo = [], pantallas = 1) {
  const fam = MESES_POR_FAMILIA.find(f => f.match.test(tipoPlan || ''))
  if (!fam) return null
  return catalogo.find(p => fam.match.test(p.nombre || '') && Number(p.numeroPantallas) === Number(pantallas))
    || null
}

// Meses que se suman al renovar con ese plan (null = promoción: escribirlos a mano)
export function mesesPorPlan(tipoPlan, catalogo = [], pantallas = 1) {
  const plan = planCatalogoDe(tipoPlan, catalogo, pantallas)
  const desdeCatalogo = plan ? mesesDePlan(plan.duracionDias) : 0
  if (desdeCatalogo) return desdeCatalogo
  return MESES_POR_FAMILIA.find(f => f.match.test(tipoPlan || ''))?.meses ?? null
}

// Precio sugerido: el del catálogo; si no, el último pago con ese mismo plan
export function precioPorPlan(tipoPlan, catalogo = [], pantallas = 1, ultimoPago = null) {
  const plan = planCatalogoDe(tipoPlan, catalogo, pantallas)
  if (plan) return Number(plan.precio)
  if (ultimoPago?.tipoPlan === tipoPlan && ultimoPago?.precioVenta != null) return Number(ultimoPago.precioVenta)
  return null
}

// Suma meses a YYYY-MM-DD en hora local (misma regla que el servidor)
export function sumarMeses(fecha, meses) {
  const m = String(fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  const n = Math.trunc(Number(meses))
  if (!m || !Number.isFinite(n)) return ''
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  d.setMonth(d.getMonth() + n)
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

// El nuevo período arranca en la fecha de vencimiento actual (vigente o ya
// vencido); solo sin fecha de fin se usa la fecha del pago. Igual que el servidor.
export function inicioSugerido(finActual, fechaPago) {
  const fin = String(finActual || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(fin) ? fin : fechaPago
}

// Datos del pago sugeridos para la renovación (mismas reglas que "Nueva Venta"
// en Pagos y que el servidor): SKU, equipo y cortesía del último pago de la
// pantalla; Tipo Pantalla según el Tipo Cliente de la Tabla Clientes; cuenta
// dedicada SI con 3 pantallas y NO con 1 o 2.
export function datosPagoSugeridos(row, ultimoPago = null, tipoCliente = null) {
  const pantallas = Number(row?.pantallas) || Number(ultimoPago?.pantallas) || 1
  return {
    sku: ultimoPago?.sku || '',
    tipoFire: ultimoPago?.tipoFire || '',
    estado: 'Activo',
    cortesia: ultimoPago?.cortesia || 'NO',
    pantallas,
    itemQuantity: 1,
    tipoPantalla: tipoCliente || ultimoPago?.tipoPantalla || '',
    cuentaDedicada: pantallas >= 3 ? 'SI' : 'NO',
  }
}

// ── Pagos en dólares ─────────────────────────────────────────────────────────
// Medios de pago que llegan en USD (PayPal, Western Union o "USD"). En la venta
// el precio siempre se guarda en pesos: el valor en dólares se convierte con
// la TRM del día.
export const esMedioUSD = (medio) => /(^|[^a-z])(usd|d[oó]lar|paypal|western?\s*union)/i.test(String(medio || ''))

// USD × TRM → pesos (enteros). null si falta algún dato.
export function usdAPesos(usd, trm) {
  const u = Number(String(usd ?? '').replace(',', '.'))
  const t = Number(trm)
  if (!(u > 0) || !(t > 0)) return null
  return Math.round(u * t)
}

// Pesos → USD con dos decimales (para sugerir el valor en dólares)
export function pesosAUsd(pesos, trm) {
  const p = Number(pesos)
  const t = Number(trm)
  if (!(p > 0) || !(t > 0)) return ''
  return String(Math.round((p / t) * 100) / 100)
}
