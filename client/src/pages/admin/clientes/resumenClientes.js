// Cálculos y formatos del módulo Clientes: une la Tabla de Clientes con el
// estado del servicio (GET /admin/clients/tabla-clientes/servicio) y arma las
// tarjetas sobre las filas que deja el filtro.
import { normalizarTelefono } from '../../../utils/telefono'
import { PAISES, indicativoDe } from '../../../config/paises'

export const ESTADOS = {
  activo: { nombre: 'Activos', singular: 'Activo', color: '#059669', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  por_vencer: { nombre: 'Por vencer', singular: 'Por vencer', color: '#f59e0b', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  vencido: { nombre: 'Vencidos', singular: 'Vencido', color: '#e11d48', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  sin_servicio: { nombre: 'Sin servicio', singular: 'Sin servicio', color: '#94a3b8', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

// Datos de contacto/perfil que deberían estar llenos
export const CAMPOS_CLAVE = {
  movil: 'Sin móvil',
  pais: 'Sin país',
  apellido: 'Sin apellido',
  genero: 'Sin género',
  ciudad: 'Sin ciudad',
}
export const faltantes = (r) => Object.keys(CAMPOS_CLAVE).filter(k => !String(r[k] ?? '').trim() || (k === 'movil' && !String(r.movil).replace(/\D/g, '').replace(/^\d{1,3}$/, '')))

const SIN = { estado: 'sin_servicio', pantallas: 0, proximoVence: null, diasVence: null, ultimoPago: null, diasSinPagar: null, totalPagado: 0, pagos: 0, recaudo12m: 0, bajas: 0 }

export function unirConServicio(rows, servicio = {}) {
  return rows.map(r => {
    const s = servicio[String(r.customerId ?? '').trim()] || SIN
    return {
      ...r,
      estadoServicio: s.estado, pantallas: s.pantallas, proximoVence: s.proximoVence, diasVence: s.diasVence,
      ultimoPago: s.ultimoPago, diasSinPagar: s.diasSinPagar, totalPagado: s.totalPagado, pagos: s.pagos,
      recaudo12m: s.recaudo12m, bajas: s.bajas,
    }
  })
}

// "+57 300 123 4567" a partir de lo que venga guardado
export function formatoTelefono(movil, pais) {
  const { numero, conIndicativo } = normalizarTelefono(movil, pais)
  if (!numero) return ''
  if (!conIndicativo) return String(movil).trim()
  const codigos = [...new Set([indicativoDe(pais), ...PAISES.map(p => p.codigo.replace(/\D/g, ''))].filter(Boolean))].sort((a, b) => b.length - a.length)
  const cod = codigos.find(c => numero.startsWith(c) && numero.length - c.length >= 7) || numero.slice(0, 2)
  const resto = numero.slice(cod.length)
  const grupos = resto.length === 10 ? [resto.slice(0, 3), resto.slice(3, 6), resto.slice(6)] : resto.match(/.{1,3}/g)
  return `+${cod} ${grupos.join(' ')}`
}

const clave = (v) => String(v ?? '').trim()
const contar = (lista, fn) => {
  const m = new Map()
  for (const r of lista) { const k = fn(r); m.set(k, (m.get(k) || 0) + 1) }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([nombre, n]) => ({ nombre, n }))
}

export function resumenClientes(filas) {
  const total = filas.length
  const porEstado = Object.fromEntries(Object.keys(ESTADOS).map(k => [k, 0]))
  for (const r of filas) porEstado[r.estadoServicio || 'sin_servicio'] += 1
  const conServicio = total - porEstado.sin_servicio
  const pantallas = filas.reduce((s, r) => s + (r.pantallas || 0), 0)
  const recaudo12m = filas.reduce((s, r) => s + (r.recaudo12m || 0), 0)
  const pagaron12m = filas.filter(r => r.recaudo12m > 0).length
  const conPagos = filas.filter(r => r.totalPagado > 0)
  const ltv = conPagos.length ? Math.round(conPagos.reduce((s, r) => s + r.totalPagado, 0) / conPagos.length) : 0
  const top = [...filas].sort((a, b) => (b.recaudo12m || 0) - (a.recaudo12m || 0))[0]
  const tipos = contar(filas, r => clave(r.tipoCliente) || 'Sin tipo').map(t => ({
    ...t, pantallas: filas.filter(r => (clave(r.tipoCliente) || 'Sin tipo') === t.nombre).reduce((s, r) => s + (r.pantallas || 0), 0),
  }))
  const paises = contar(filas, r => clave(r.pais) || 'Sin país')
  const ciudades = new Set(filas.map(r => clave(r.ciudad).toLowerCase()).filter(Boolean)).size
  const datos = Object.fromEntries(Object.keys(CAMPOS_CLAVE).map(k => [k, 0]))
  let completos = 0
  for (const r of filas) {
    const f = faltantes(r)
    for (const k of f) datos[k] += 1
    if (!f.length) completos += 1
  }
  const referidos = filas.filter(r => clave(r.referido)).length
  return {
    total, porEstado, conServicio, pantallas,
    pantallasPorCliente: conServicio ? pantallas / conServicio : 0,
    recaudo12m, pagaron12m, ltv,
    top: top && top.recaudo12m > 0 ? { nombre: [top.nombre, top.apellido].filter(Boolean).join(' ') || top.customerId, monto: top.recaudo12m } : null,
    tipos, paises, ciudades, datos, completos,
    pctCompletos: total ? (completos / total) * 100 : 0,
    referidos,
  }
}
