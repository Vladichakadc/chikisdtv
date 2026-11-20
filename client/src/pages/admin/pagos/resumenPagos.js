// Cálculos de las tarjetas del módulo Pagos (tabla de ventas), sobre las filas
// que deja el filtro de la tabla. Mismas reglas que el Dashboard y el Análisis
// de Pagos: las cortesías ($0) y los cambios de plan no son ingreso.
import { MESES } from '../../../config/equipos'

export const esIngresoReal = (r) => r.tipoPago !== 'Cortesia' && r.tipoPago !== 'Cambio de Plan'
export const tipoDe = (t) => (/^renov/i.test(t || '') ? 'renovacion' : /^activ/i.test(t || '') ? 'activacion' : /^cortes/i.test(t || '') ? 'cortesia' : 'otros')
export const TIPOS = {
  renovacion: { nombre: 'Renovaciones', color: '#059669' },
  activacion: { nombre: 'Activaciones', color: '#f97316' },
  cortesia: { nombre: 'Cortesías', color: '#a855f7' },
  otros: { nombre: 'Cambios de plan y otros', color: '#94a3b8' },
}
// Etiqueta legible del tipo de pago guardado (los valores se guardan sin tilde)
export const ETIQUETA_TIPO_PAGO = {
  Renovacion: 'Renovación', Activacion: 'Activación', 'Activacion Pantalla': 'Activación pantalla',
  Cortesia: 'Cortesía', 'Cambio de Plan': 'Cambio de plan',
}
export const etiquetaTipoPago = (t) => ETIQUETA_TIPO_PAGO[t] || t || '—'

export const medioDe = (m) => {
  const t = String(m || '').trim()
  if (!t) return 'Sin registrar'
  if (/^(nu|un|nu\s*bank|nubank)$/i.test(t)) return 'NU'
  if (/^paypal$/i.test(t)) return 'PayPal'
  if (/wester/i.test(t)) return 'Western Union'
  return t
}

// "julio" → "Julio" (hay registros históricos en minúscula)
export const mesBonito = (m) => {
  const t = String(m || '').trim()
  if (!t) return '—'
  const exacto = MESES.find(x => x.toLowerCase() === t.toLowerCase())
  return exacto || t.charAt(0).toUpperCase() + t.slice(1)
}

const ym = (f) => String(f || '').slice(0, 7)
function sumarMeses(mes, n) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const mediana = (xs) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const i = Math.floor(s.length / 2)
  return s.length % 2 ? s[i] : Math.round((s[i - 1] + s[i]) / 2)
}
const clienteDe = (r) => String(r.customerId || '').trim() || (r.nickname ? `nick:${String(r.nickname).trim().toLowerCase()}` : null)

export function resumenPagos(filas, { hoy = new Date().toLocaleDateString('en-CA') } = {}) {
  const reales = filas.filter(esIngresoReal)
  const montos = reales.map(r => Number(r.precioVenta) || 0)
  const recaudo = montos.reduce((s, v) => s + v, 0)
  const clientes = new Set(reales.map(clienteDe).filter(Boolean)).size

  const porTipo = Object.fromEntries(Object.keys(TIPOS).map(k => [k, { ventas: 0, monto: 0 }]))
  for (const r of filas) {
    const t = porTipo[tipoDe(r.tipoPago)]
    t.ventas += 1
    t.monto += Number(r.precioVenta) || 0
  }

  const medios = new Map()
  for (const r of reales) {
    const k = medioDe(r.medioPago)
    const m = medios.get(k) || { nombre: k, monto: 0, ventas: 0 }
    m.monto += Number(r.precioVenta) || 0
    m.ventas += 1
    medios.set(k, m)
  }
  const listaMedios = [...medios.values()].sort((a, b) => b.monto - a.monto)
    .map(m => ({ ...m, pct: recaudo ? (m.monto / recaudo) * 100 : 0 }))

  // Serie de los últimos 12 meses con pagos dentro del filtro (por fecha del pago)
  const mesesConPago = [...new Set(reales.map(r => ym(r.fecha)).filter(Boolean))].sort()
  const ultimo = mesesConPago.at(-1)
  const serie = []
  if (ultimo) {
    for (let m = sumarMeses(ultimo, -11); m <= ultimo; m = sumarMeses(m, 1)) {
      serie.push({ mes: m, monto: reales.filter(r => ym(r.fecha) === m).reduce((s, r) => s + (Number(r.precioVenta) || 0), 0) })
    }
  }

  return {
    registros: filas.length,
    pagos: reales.length,
    recaudo,
    ticket: reales.length ? Math.round(recaudo / reales.length) : 0,
    mediana: mediana(montos),
    minimo: montos.length ? Math.min(...montos) : 0,
    maximo: montos.length ? Math.max(...montos) : 0,
    clientes,
    pagosPorCliente: clientes ? reales.length / clientes : 0,
    porTipo,
    ticketPorTipo: Object.fromEntries(['renovacion', 'activacion'].map(k => [k, porTipo[k].ventas ? Math.round(porTipo[k].monto / porTipo[k].ventas) : 0])),
    medios: listaMedios,
    serie,
    hoy,
  }
}

// Mes en curso (siempre sobre todas las ventas, sin filtros): lo recaudado
// hasta hoy contra lo que había entrado el mes anterior a la misma fecha
export function mesEnCurso(filas, { hoy = new Date().toLocaleDateString('en-CA') } = {}) {
  const mes = ym(hoy)
  const anterior = sumarMeses(mes, -1)
  const dia = Number(hoy.slice(8, 10))
  const [y, m] = mes.split('-').map(Number)
  const diasMes = new Date(y, m, 0).getDate()
  const reales = filas.filter(r => esIngresoReal(r) && r.fecha)
  const suma = (lista) => lista.reduce((s, r) => s + (Number(r.precioVenta) || 0), 0)
  const delMes = reales.filter(r => ym(r.fecha) === mes && String(r.fecha).slice(0, 10) <= hoy)
  const delAnterior = reales.filter(r => ym(r.fecha) === anterior && Number(String(r.fecha).slice(8, 10)) <= dia)
  const deHoy = reales.filter(r => String(r.fecha).slice(0, 10) === hoy)
  const recaudo = suma(delMes)
  const mismaFecha = suma(delAnterior)
  return {
    mes, dia, diasMes,
    recaudo, pagos: delMes.length,
    hoyRecaudo: suma(deHoy), hoyPagos: deHoy.length,
    mismaFechaAnterior: mismaFecha,
    variacion: mismaFecha ? ((recaudo - mismaFecha) / mismaFecha) * 100 : null,
    proyeccion: dia ? Math.round((recaudo / dia) * diasMes) : 0,
  }
}
