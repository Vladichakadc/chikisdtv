// Historial de cambios del Planificador con "Deshacer" por cambio. Deshacer
// lo hace el servidor y solo si nadie volvió a tocar esos campos después.
import { useEffect, useState } from 'react'
import { X, History, Undo2, Loader2, AlertTriangle } from 'lucide-react'
import api from '../../../config/api'
import { cn } from '../../../utils/cn'
import { useUi } from '../../../context/UiContext'
import { formatDate, formatCurrency } from '../../../utils/excelUtils'

export const ACCIONES = {
  editar:      { label: 'Edición',        cls: 'bg-sky-100 text-sky-700' },
  crear:       { label: 'Alta',           cls: 'bg-emerald-100 text-emerald-700' },
  eliminar:    { label: 'Eliminación',    cls: 'bg-red-100 text-red-700' },
  renovar:     { label: 'Renovación',     cls: 'bg-green-100 text-green-800' },
  baja:        { label: 'Baja',           cls: 'bg-rose-100 text-rose-700' },
  sincronizar: { label: 'Sincronización', cls: 'bg-violet-100 text-violet-700' },
  deshacer:    { label: 'Deshacer',       cls: 'bg-slate-200 text-slate-700' },
}

const FECHAS = new Set(['inicio', 'finalizacion', 'inicioReal', 'duracionReal'])
const DINERO = new Set(['montoDebe'])
export function valorLegible(campo, v) {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (FECHAS.has(campo)) return formatDate(v)
  if (DINERO.has(campo)) return formatCurrency(v)
  return String(v)
}

export function fechaHora(iso) {
  const d = new Date(String(iso).replace(' ', 'T').replace(/\s*\+00:00$/, 'Z'))
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const puedeDeshacer = (c) => !c.deshecho && c.accion !== 'deshacer'

// Deshace un cambio (o el lote de una sincronización). Devuelve true si se aplicó.
export async function deshacerCambioApi(c, showToast) {
  const url = c.accion === 'sincronizar' && c.lote
    ? `/admin/planificador/historial/lote/${encodeURIComponent(c.lote)}/deshacer`
    : `/admin/planificador/historial/${c.id}/deshacer`
  try {
    const r = await api.post(url)
    showToast(r.data.message || 'Cambio deshecho.', 'success')
    return true
  } catch (e) {
    const d = e.response?.data
    const extra = d?.detalles?.length ? ` (${d.detalles.map(x => x.campo).join(', ')})` : ''
    showToast((d?.error || e.message) + extra, 'error')
    return false
  }
}

export function HistorialPanel({ onClose, onCambio }) {
  const { showToast } = useUi()
  const [cambios, setCambios] = useState(null)
  const [trabajando, setTrabajando] = useState(null)

  const cargar = () => api.get('/admin/planificador/historial', { params: { limit: 100 } })
    .then(r => setCambios(r.data.cambios || []))
    .catch(() => { setCambios([]); showToast('No se pudo cargar el historial.', 'error') })

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const deshacer = async (c) => {
    const texto = c.accion === 'renovar'
      ? `¿Deshacer la renovación de ${c.idPantalla}? También se eliminará la venta ${c.ventaId} de Pagos.`
      : c.accion === 'baja'
        ? `¿Deshacer la baja de ${c.idPantalla}? La pantalla vuelve a su cliente y se elimina la baja ${c.ventaId} del módulo Bajas.`
      : c.accion === 'sincronizar'
        ? '¿Deshacer toda esta sincronización con Cuentas Padre?'
        : `¿Deshacer este cambio en ${c.idPantalla}?`
    if (!window.confirm(texto)) return
    setTrabajando(c.id)
    const ok = await deshacerCambioApi(c, showToast)
    setTrabajando(null)
    if (ok) { await cargar(); onCambio?.() }
  }

  // Una sincronización genera un registro por pantalla: se muestran agrupados
  const filas = []
  const lotesVistos = new Map()
  for (const c of cambios || []) {
    if (c.accion === 'sincronizar' && c.lote) {
      if (lotesVistos.has(c.lote)) { lotesVistos.get(c.lote).pantallas.push(c.idPantalla); continue }
      const grupo = { ...c, pantallas: [c.idPantalla] }
      lotesVistos.set(c.lote, grupo)
      filas.push(grupo)
    } else filas.push(c)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4" role="dialog" aria-label="Historial de cambios">
        <div className="rounded-t-2xl px-6 py-4 flex items-center justify-between text-white" style={{ background: 'linear-gradient(90deg,#334155,#475569)' }}>
          <div className="flex items-center gap-3">
            <div className="bg-white/15 rounded-lg p-2"><History size={20} /></div>
            <div>
              <h2 className="text-lg font-bold">Historial de cambios</h2>
              <p className="text-white/75 text-xs">Quién cambió qué y cuándo. Deshacer solo revierte si nadie volvió a tocar esos datos.</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 rounded-lg p-2" aria-label="Cerrar"><X size={18} /></button>
        </div>

        {!cambios ? (
          <div className="py-16 text-center text-gray-400"><Loader2 className="mx-auto animate-spin" /></div>
        ) : filas.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">Aún no hay cambios registrados.</div>
        ) : (
          <ul className="max-h-[65dvh] overflow-y-auto divide-y divide-gray-100">
            {filas.map(c => {
              const a = ACCIONES[c.accion] || { label: c.accion, cls: 'bg-gray-100 text-gray-600' }
              return (
                <li key={c.id} className={cn('px-6 py-3', c.deshecho && 'opacity-60')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', a.cls)}>{a.label}</span>
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {c.pantallas ? `${c.pantallas.length} pantalla${c.pantallas.length === 1 ? '' : 's'}` : c.idPantalla}
                        </span>
                        {c.cliente && !c.pantallas && <span className="text-xs text-slate-500 truncate">{c.cliente}</span>}
                        {c.ventaId && <span className="text-[11px] text-slate-500">· venta {c.ventaId}</span>}
                        {c.deshecho && <span className="text-[11px] font-semibold text-slate-500">· deshecho{c.deshechoPor ? ` por ${c.deshechoPor}` : ''}</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{fechaHora(c.createdAt)}{c.usuarioEmail ? ` · ${c.usuarioEmail}` : ''}</p>
                      {!c.pantallas && c.cambios.length > 0 && c.accion !== 'crear' && c.accion !== 'eliminar' && (
                        <ul className="mt-1 text-xs text-slate-600 space-y-0.5">
                          {c.cambios.slice(0, 6).map(x => (
                            <li key={x.campo}>
                              <span className="font-semibold">{x.etiqueta}:</span>{' '}
                              <span className="line-through text-slate-400">{valorLegible(x.campo, x.antes)}</span>{' → '}
                              <span>{valorLegible(x.campo, x.despues)}</span>
                            </li>
                          ))}
                          {c.cambios.length > 6 && <li className="text-slate-400">+{c.cambios.length - 6} campo(s) más</li>}
                        </ul>
                      )}
                    </div>
                    {puedeDeshacer(c) && (
                      <button onClick={() => deshacer(c)} disabled={trabajando === c.id}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-brand-primary hover:text-brand-primary disabled:opacity-50">
                        {trabajando === c.id ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />} Deshacer
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-2 text-[11px] text-slate-400">
          <AlertTriangle size={12} /> Las contraseñas no se guardan en el historial; un cambio de contraseña no se puede deshacer desde aquí.
        </div>
      </div>
    </div>
  )
}
