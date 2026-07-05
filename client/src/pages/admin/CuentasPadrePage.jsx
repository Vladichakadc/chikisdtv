/**
 * CuentasPadrePage — Professional redesign
 * Skills applied: ui-ux-pro-max · huashu-design · taste-skill
 *
 * Interfaz profesional:
 *  – Hero header oscuro con orbs Indigo/Blue ambientales
 *  – KPI cards con gradientes y animaciones de entrada
 *  – Drawer lateral para edición de cuentas
 *  – Confirm dialog custom
 *  – Skeleton shimmer loader
 *  – Layout dividido (Tabla ↔ Importación) con diseño premium
 *  – Tabla con scroll horizontal y acciones hover
 */

import { useState, useMemo, useEffect } from 'react'
import { todayStr } from '../../utils/dateUtils'
import {
  Search, Plus, Pencil, Trash2, X,
  Server, ShieldCheck, Monitor, Clock,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Eye, EyeOff, RefreshCw, Upload, Download,
  FileSpreadsheet, CheckCircle2, AlertCircle, Undo2,
  Layers, TrendingUp, Percent, Lightbulb, Sparkles, AlertTriangle
} from 'lucide-react'
import api from '../../config/api'
import { useApiResource } from '../../hooks/useApiResource'
import { useUi } from '../../context/UiContext'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { KpiCard } from '../../components/ui/KpiCard'
import { formatDate } from '../../utils/excelUtils'

/* ══════════════════════════════════════════════════════════════
   DESIGN TOKENS (Huashu — brand Indigo/Blue para Cuentas)
══════════════════════════════════════════════════════════════ */
const CSS = `
  @keyframes cp-fade-up  { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes cp-fade-in  { from { opacity:0 } to { opacity:1 } }
  @keyframes cp-scale-in { from { opacity:0; transform:scale(.94) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
  @keyframes cp-slide-in { from { opacity:0; transform:translateX(100%) } to { opacity:1; transform:translateX(0) } }
  @keyframes cp-shimmer  { from { background-position:-200% 0 } to { background-position:200% 0 } }
  @keyframes cp-orb-1    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes cp-orb-2    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }

  .cp-a1 { animation: cp-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .cp-a2 { animation: cp-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .cp-a3 { animation: cp-fade-up .45s cubic-bezier(.22,1,.36,1) .12s both }
  .cp-a4 { animation: cp-fade-up .45s cubic-bezier(.22,1,.36,1) .18s both }
  .cp-a5 { animation: cp-fade-up .45s cubic-bezier(.22,1,.36,1) .24s both }

  .cp-skeleton {
    background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
    background-size: 200% 100%;
    animation: cp-shimmer 1.6s infinite;
    border-radius: 6px;
  }
  .cp-drawer  { animation: cp-slide-in .3s cubic-bezier(.22,1,.36,1) both }
  .cp-overlay { animation: cp-fade-in .2s ease both }
  .cp-confirm { animation: cp-scale-in .22s cubic-bezier(.22,1,.36,1) both }

  .cp-kpi { transition: transform .25s ease, box-shadow .25s ease }
  .cp-kpi:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.12) }
  .cp-kpi.clickable { cursor: pointer }

  .cp-cta {
    background: linear-gradient(135deg, #4f46e5, #3b82f6);
    box-shadow: 0 4px 18px rgba(79,70,229,.4);
    transition: all .22s ease;
  }
  .cp-cta:hover  { box-shadow: 0 7px 24px rgba(79,70,229,.55); transform: translateY(-2px) }
  .cp-cta:active { transform: translateY(0) }

  .cp-btn-ghost {
    transition: all .2s ease;
    border: 1px solid rgba(255,255,255,.2);
  }
  .cp-btn-ghost:hover { background: rgba(255,255,255,.1) }

  .cp-btn-danger {
    background: linear-gradient(135deg,#ef4444,#f87171);
    box-shadow: 0 4px 14px rgba(239,68,68,.3);
    transition: all .2s ease;
  }
  .cp-btn-danger:hover { box-shadow: 0 6px 20px rgba(239,68,68,.45); transform: translateY(-1px) }

  .cp-orb-1 { animation: cp-orb-1 8s ease-in-out infinite }
  .cp-orb-2 { animation: cp-orb-2 11s ease-in-out infinite }

  .cp-search:focus { outline: none; box-shadow: 0 0 0 3px rgba(79,70,229,.18) }

  .cp-row { transition: background .15s ease }
  .cp-row:hover td { background: rgba(79,70,229,.04) }

  .cp-th-sort { transition: background .15s ease }
  .cp-th-sort:hover { background: rgba(255,255,255,.12) }

  .cp-action-btn { transition: all .18s ease; opacity: 0 }
  tr:hover .cp-action-btn { opacity: 1 }
  .cp-action-btn:hover { transform: scale(1.15) }

  @media (prefers-reduced-motion: reduce) {
    .cp-a1,.cp-a2,.cp-a3,.cp-a4,.cp-a5,
    .cp-drawer,.cp-overlay,.cp-confirm,
    .cp-orb-1,.cp-orb-2,.cp-skeleton { animation: none !important; transition: none !important }
  }
`

/* ══════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
══════════════════════════════════════════════════════════════ */
const DIAS_ALERTA = 30

function diasHasta(fecha) {
  if (!fecha) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(fecha); if (isNaN(d)) return null
  d.setHours(0, 0, 0, 0)
  return Math.round((d - today) / 86400000)
}

function getVariante(row) {
  const dias = diasHasta(row.fechaFin)
  if (dias === null) return 'sin_fecha'
  if (dias <= 0) return 'vencida'
  if (dias <= DIAS_ALERTA) return 'alerta'
  return 'valida'
}

const ROW_BG = {
  valida:    'hover:bg-emerald-50/50',
  alerta:    'bg-amber-50 hover:bg-amber-100/60',
  vencida:   'bg-red-50 hover:bg-red-100/60',
  sin_fecha: 'hover:bg-slate-50',
}

const COLS = [
  { key: 'cuentaId',      label: 'ID Cuenta' },
  { key: 'nombreUsuario', label: 'Usuario' },
  { key: 'contrasena',    label: 'Contraseña' },
  { key: 'credito',       label: 'Crédito' },
  { key: 'fechaInicio',   label: 'Inicio' },
  { key: 'fechaFin',      label: 'Fin' },
  { key: '_dias',         label: 'Días' },
  { key: 'smartTv',       label: 'SmartTV' },
  { key: 'estado',        label: 'Estado' },
]

const EMPTY = {
  cuentaId: '', nombreUsuario: '', contrasena: '',
  credito: '', fechaInicio: '', fechaFin: '', smartTv: '', estado: '',
}

const CAMPO_LABELS = {
  nombreUsuario: 'Usuario', contrasena: 'Contraseña', credito: 'Crédito',
  fechaInicio: 'Inicio', fechaFin: 'Fin', smartTv: 'SmartTV', estado: 'Estado',
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════ */

/** KPI card */

function SortIcon({ colKey, sortCol, sortDir }) {
  if (sortCol !== colKey) return <ChevronsUpDown size={12} className="opacity-30 shrink-0" />
  return sortDir === 'asc' ? <ChevronUp size={12} className="shrink-0 text-indigo-300" /> : <ChevronDown size={12} className="shrink-0 text-indigo-300" />
}

function SkeletonTable() {
  return (
    <div className="divide-y divide-slate-100">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
          <div className="cp-skeleton h-4 w-12 rounded" />
          <div className="flex-1 space-y-2">
            <div className="cp-skeleton h-4 rounded w-1/3" />
            <div className="cp-skeleton h-3 rounded w-1/4" />
          </div>
          <div className="cp-skeleton w-20 h-5 rounded-full hidden sm:block" />
          <div className="cp-skeleton w-24 h-4 rounded hidden md:block" />
        </div>
      ))}
    </div>
  )
}

function ConfirmDialog({ id, onConfirm, onCancel }) {
  return (
    <div className="cp-overlay fixed inset-0 bg-black/50 backdrop-blur-[3px] flex items-center justify-center z-[70] p-4" onClick={onCancel}>
      <div className="cp-confirm bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex gap-4 items-start">
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">¿Eliminar cuenta?</h3>
              <p className="text-slate-500 text-sm mt-0.5">Se eliminará la cuenta padre <strong className="text-slate-700 font-mono">{id}</strong>.</p>
              <p className="text-slate-400 text-xs mt-1">Si hay pantallas asignadas a esta cuenta, perderán su referencia. Esta acción es permanente.</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="cp-btn-danger px-4 py-2 text-sm font-semibold text-white rounded-xl">Sí, eliminar</button>
        </div>
      </div>
    </div>
  )
}

function FieldLabel({ children }) {
  return <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{children}</label>
}
const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
const selectCls = inputCls

function DrawerSection({ children }) {
  return (
    <div className="flex items-center gap-3 pt-2 mb-1">
      <span className="text-[10px] font-bold tracking-[.14em] uppercase text-slate-400">{children}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

function CuentaDrawer({ editing, form, f, onSubmit, onClose }) {
  const [saving, setSaving] = useState(false)
  const submit = async (e) => { e.preventDefault(); setSaving(true); await onSubmit(e); setSaving(false) }

  return (
    <>
      <div className="cp-overlay fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50" onClick={onClose} />
      <div className="cp-drawer fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="relative px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg,#4f46e5,#3b82f6)' }} />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[.14em] uppercase text-indigo-500 mb-0.5">
                {editing ? 'Editar registro' : 'Nuevo registro'}
              </p>
              <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {editing ? 'Editar Cuenta Padre' : 'Nueva Cuenta Padre'}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Completa los datos operativos de la cuenta.</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all mt-0.5"><X size={20} /></button>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <DrawerSection>Credenciales</DrawerSection>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FieldLabel>ID Cuenta</FieldLabel>
                <input value={form.cuentaId} onChange={f('cuentaId')} disabled={!!editing} placeholder="Ej: M101"
                  className={`${inputCls} font-mono ${editing ? 'bg-slate-50 text-slate-400' : ''}`} required />
              </div>
              <div>
                <FieldLabel>Usuario</FieldLabel>
                <input value={form.nombreUsuario} onChange={f('nombreUsuario')} className={inputCls} />
              </div>
              <div>
                <FieldLabel>Contraseña</FieldLabel>
                <input value={form.contrasena} onChange={f('contrasena')} className={`${inputCls} font-mono`} />
              </div>
            </div>

            <DrawerSection>Detalles Comerciales</DrawerSection>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Estado</FieldLabel>
                <select value={form.estado} onChange={f('estado')} className={selectCls}>
                  <option value="">—</option>
                  <option>Válido</option>
                  <option>Vencido</option>
                  <option>Inactivo</option>
                </select>
              </div>
              <div>
                <FieldLabel>Crédito</FieldLabel>
                <input type="number" min="0" value={form.credito} onChange={f('credito')} className={inputCls} />
              </div>
              <div className="col-span-2">
                <FieldLabel>SmartTV (Dispositivo)</FieldLabel>
                <input value={form.smartTv} onChange={f('smartTv')} className={inputCls} />
              </div>
              <div>
                <FieldLabel>Fecha Inicio</FieldLabel>
                <input type="date" value={form.fechaInicio} onChange={f('fechaInicio')} className={inputCls} />
              </div>
              <div>
                <FieldLabel>Fecha Fin</FieldLabel>
                <input type="date" value={form.fechaFin} onChange={f('fechaFin')} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={saving} className="cp-cta flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</> : editing ? 'Guardar cambios' : <><Plus size={15} />Crear cuenta</>}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function ImportDiffModal({ diff, canUndo, onUndo, onClose, undoing }) {
  const nuevas      = diff.filter(d => d.status === 'nueva')
  const actualizadas = diff.filter(d => d.status === 'actualizada')
  const sinCambio   = diff.filter(d => d.status === 'sin_cambio')
  const sorted = [...nuevas, ...actualizadas, ...sinCambio]

  return (
    <div className="cp-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[3px] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-t-2xl px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileSpreadsheet size={20} /> Informe de Importación
            </h2>
            <p className="text-indigo-100 text-sm">Resumen de cambios aplicados a la base de datos.</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex items-center flex-wrap gap-3 px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
          {nuevas.length > 0 && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold"><Plus size={14} />{nuevas.length} nuevas</span>}
          {actualizadas.length > 0 && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold"><Pencil size={14} />{actualizadas.length} actualizadas</span>}
          {sinCambio.length > 0 && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200 text-slate-600 text-sm font-semibold"><CheckCircle2 size={14} />{sinCambio.length} sin cambio</span>}
          <span className="ml-auto text-xs font-semibold text-slate-400">{diff.length} registros analizados</span>
        </div>

        <div className="overflow-auto flex-1 p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="px-6 py-3">ID Cuenta</th>
                <th className="px-6 py-3">Usuario</th>
                <th className="px-6 py-3 text-center">Estado</th>
                <th className="px-6 py-3">Cambios detectados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((item, i) => (
                <tr key={i} className={`hover:bg-slate-50/50 ${item.status === 'nueva' ? 'bg-emerald-50/20' : item.status === 'actualizada' ? 'bg-amber-50/20' : ''}`}>
                  <td className="px-6 py-3 font-mono font-bold text-indigo-700">{item.cuentaId}</td>
                  <td className="px-6 py-3 text-slate-700 font-medium max-w-[180px] truncate">{item.nombreUsuario}</td>
                  <td className="px-6 py-3 text-center">
                    {item.status === 'nueva' ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold"><Plus size={10} />Nueva</span>
                    : item.status === 'actualizada' ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold"><Pencil size={10} />Actualizada</span>
                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold"><CheckCircle2 size={10} />Sin cambio</span>}
                  </td>
                  <td className="px-6 py-3">
                    {item.cambios.length > 0 ? (
                      <div className="space-y-1">
                        {item.cambios.map((c, j) => (
                          <div key={j} className="flex items-baseline flex-wrap gap-1.5 text-xs">
                            <span className="font-semibold text-slate-600">{CAMPO_LABELS[c.campo] || c.campo}:</span>
                            <span className="text-red-400 line-through">{c.antes ?? '—'}</span>
                            <span className="text-slate-300">→</span>
                            <span className="text-emerald-600 font-bold">{c.despues ?? '—'}</span>
                          </div>
                        ))}
                      </div>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0 bg-slate-50/50">
          <p className="text-xs text-slate-500 font-medium"><CheckCircle2 size={14} className="inline mr-1 text-emerald-500" />Cambios guardados en BD.</p>
          <div className="flex gap-2">
            {canUndo && (
              <button onClick={onUndo} disabled={undoing} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 text-sm font-semibold transition-colors">
                <Undo2 size={14} /> {undoing ? 'Deshaciendo…' : 'Deshacer carga'}
              </button>
            )}
            <button onClick={onClose} className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BiCardCP({ icon: Icon, label, value, sub, variant = 'light', tag, onClick }) {
  const styles = { solid: 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md', light: 'bg-white border border-slate-200 text-indigo-700 shadow-sm', outline: 'bg-indigo-50/50 border border-indigo-100 text-indigo-800' }
  const iconBg  = { solid: 'bg-white/20', light: 'bg-indigo-50 text-indigo-500', outline: 'bg-indigo-100/50 text-indigo-500' }
  return (
    <div className={`rounded-2xl p-5 transition-all hover:-translate-y-0.5 ${styles[variant]} ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}`} onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${variant === 'solid' ? 'text-indigo-100' : 'text-slate-400'}`}>{label}</p>
          <p className="text-3xl font-extrabold tabular-nums leading-none">{value}</p>
          {tag && (
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                tag.tone === 'good' ? 'bg-emerald-100 text-emerald-700' :
                tag.tone === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
              }`}><Sparkles size={10} />{tag.text}</span>
            </div>
          )}
          {sub && <p className={`text-xs mt-2 font-medium ${variant === 'solid' ? 'text-indigo-100/80' : 'text-slate-400'}`}>{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${iconBg[variant]}`}><Icon size={22} /></div>
      </div>
    </div>
  )
}
function tagOcupacionCP(pct) {
  if (pct >= 92) return { tone: 'warn', text: 'Capacidad casi agotada' }
  if (pct >= 70) return { tone: 'good', text: 'Ocupación saludable' }
  return { tone: 'info', text: 'Margen amplio' }
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function CuentasPadrePage() {
  const { showToast } = useUi()
  const { data: rows, setData: setRows, loading, error, reload: load } = useApiResource('/admin/cuentas-padre')
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('cuentaId')
  const [sortDir, setSortDir] = useState('asc')
  const [filterVariante, setFilterVariante] = useState('ALL')
  const [showPwd, setShowPwd] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [explain, setExplain] = useState(null)

  // Upload state
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [showDiff, setShowDiff] = useState(false)
  const [diffData, setDiffData] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [prevRows, setPrevRows] = useState([])
  const [canUndo, setCanUndo] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [ocupacion, setOcupacion] = useState(null)

  useEffect(() => { api.get('/admin/dashboard-bi').then(r => setOcupacion(r.data.ocupacion)).catch(() => {}) }, [])

  /* ── Stats & Filters ── */
  const stats = useMemo(() => ({
    total: rows.length,
    validas: rows.filter(r => getVariante(r) === 'valida').length,
    credito: rows.reduce((s, r) => s + (Number(r.credito) || 0), 0),
    proximas: rows.filter(r => getVariante(r) === 'alerta').length,
    vencidas: rows.filter(r => getVariante(r) === 'vencida').length
  }), [rows])

  const filtered = useMemo(() => {
    let result = rows
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(r => (r.cuentaId || '').toLowerCase().includes(s) || (r.nombreUsuario || '').toLowerCase().includes(s) || (r.estado || '').toLowerCase().includes(s))
    }
    if (filterVariante !== 'ALL') result = result.filter(r => getVariante(r) === filterVariante)
    return [...result].sort((a, b) => {
      let va = a[sortCol] ?? ''; let vb = b[sortCol] ?? ''
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va
      va = String(va).toLowerCase(); vb = String(vb).toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, search, sortCol, sortDir, filterVariante])

  /* ── Handlers ── */
  const handleSort = (key) => {
    if (key === 'acciones') return
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(key); setSortDir('asc') }
  }

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = (row) => { setEditing(row); setForm({ ...EMPTY, ...row }); setShowForm(true) }
  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const { data } = await api.put(`/admin/cuentas-padre/${editing.cuentaId}`, form)
        setRows(prev => prev.map(r => r.cuentaId === editing.cuentaId ? data : r))
        showToast('Cuenta actualizada.', 'success')
      } else {
        const { data } = await api.post('/admin/cuentas-padre', form)
        setRows(prev => [data, ...prev])
        showToast('Cuenta creada.', 'success')
      }
      setShowForm(false)
    } catch (e) { showToast(e.response?.data?.error || e.message, 'error') }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/admin/cuentas-padre/${deleteTarget}`)
      setRows(prev => prev.filter(r => r.cuentaId !== deleteTarget))
      showToast('Cuenta eliminada.', 'success')
    } catch (e) { showToast(e.response?.data?.error || e.message, 'error') }
    finally { setDeleteTarget(null) }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const r = await api.get('/admin/cuentas-padre/export', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a'); a.href = url; a.download = `CuentasPadre_${todayStr()}.xlsx`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      showToast('Excel exportado', 'success')
    } catch (e) { showToast(e.response?.data?.error || e.message, 'error') }
    finally { setExporting(false) }
  }

  /* ── Upload Handlers ── */
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f && /\.(xlsx|xls)$/i.test(f.name)) { setUploadFile(f); setUploadResult(null) } }
  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true); setUploadResult(null); setCanUndo(false)
    try {
      const fd = new FormData(); fd.append('file', uploadFile)
      const { data } = await api.post('/admin/cuentas-padre/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPrevRows([...rows]); setRows(data.rows); setUploadResult({ ok: true, message: data.message })
      setUploadFile(null); setCanUndo(true)
      if (data.diff?.length > 0) { setDiffData(data.diff); setShowDiff(true) }
    } catch (e) { setUploadResult({ ok: false, message: e.response?.data?.error || e.message }) }
    finally { setUploading(false) }
  }
  const executeUndo = async () => {
    setUploading(true)
    try {
      const { data } = await api.post('/admin/cuentas-padre/restore', prevRows)
      setRows(data.rows); setCanUndo(false); setPrevRows([]); setUploadResult({ ok: true, message: data.message })
      setShowDiff(false); setDiffData([])
    } catch (e) { setUploadResult({ ok: false, message: e.response?.data?.error || e.message }) }
    finally { setUploading(false) }
  }
  const handleRestoreOriginal = async () => {
    if (!confirm('¿Restaurar desde Tabla_Cuentaspadre.xlsx?\nSe perderán cambios no guardados en el Excel original.')) return
    setUploading(true); setUploadResult(null)
    try {
      const { data } = await api.post('/admin/cuentas-padre/import')
      setRows(data.rows); setCanUndo(false); setPrevRows([]); setUploadResult({ ok: true, message: data.message })
    } catch (e) { setUploadResult({ ok: false, message: e.response?.data?.error || e.message }) }
    finally { setUploading(false) }
  }

  /* ── Render Cell ── */
  const renderCell = (row, key) => {
    const v = row[key]
    switch (key) {
      case 'cuentaId': return <span className="font-mono text-sm font-extrabold text-indigo-700">{v}</span>
      case 'nombreUsuario': return <span className="font-medium text-slate-700">{v || '—'}</span>
      case 'contrasena': return <span className="font-mono text-slate-500">{showPwd ? (v || '—') : (v ? '••••••••' : '—')}</span>
      case 'credito': return <span className="font-bold text-slate-700">{v ?? '—'}</span>
      case 'smartTv': return <span className="text-slate-600">{v || '—'}</span>
      case 'estado':
        return v === 'Válido' ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><CheckCircle2 size={10} />Válido</span>
          : v === 'Vencido' || v === 'Inactivo' ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 ring-1 ring-red-200"><AlertTriangle size={10} />{v}</span>
          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">{v || '—'}</span>
      case 'fechaFin':
        if (!v) return <span className="text-slate-300">—</span>
        const d = diasHasta(v)
        const c = d == null ? 'text-slate-400' : d <= 0 ? 'text-red-600 font-bold' : d <= DIAS_ALERTA ? 'text-amber-600 font-bold' : 'text-slate-600'
        return <span className={c} title={d != null ? `${d} días restantes` : ''}>{formatDate(v)}</span>
      case '_dias':
        const d2 = diasHasta(row.fechaFin)
        if (d2 === null) return <span className="text-slate-300">—</span>
        if (d2 <= 0) return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">VENCIDA</span>
        if (d2 <= DIAS_ALERTA) return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">{d2}d</span>
        return <span className="text-[10px] text-slate-400 font-medium">{d2}d</span>
      case 'fechaInicio': return <span className="text-slate-500 text-xs">{v ? formatDate(v) : '—'}</span>
      default: return <span className="text-slate-600">{v || '—'}</span>
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

      <div className="space-y-6 pb-8">

        {/* ── HERO HEADER ── */}
        <div className="cp-a1 relative rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)' }}>
          <div className="cp-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.15] pointer-events-none" style={{ background: 'radial-gradient(circle,#4f46e5,transparent 70%)' }} />
          <div className="cp-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.10] pointer-events-none" style={{ background: 'radial-gradient(circle,#3b82f6,transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

          <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/25 mb-4">
                <Server size={12} className="text-indigo-400" />
                <span className="text-indigo-400 text-xs font-semibold tracking-widest uppercase">Infraestructura</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
                Cuentas Padre
              </h1>
              <p className="text-indigo-100/70 text-sm mt-2">Gestión de cuentas principales del proveedor IPTV {!loading && <span className="text-indigo-400/50">· {rows.length.toLocaleString()} registros</span>}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleExport} disabled={exporting} className="cp-btn-ghost shrink-0 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/80 flex items-center gap-2 transition-colors disabled:opacity-50">
                {exporting ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />} Exportar Excel
              </button>
              <button onClick={openNew} className="cp-cta shrink-0 px-5 py-3 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
                <Plus size={17} /> Nueva Cuenta
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard icon={Server} label="Total Cuentas" value={stats.total} loading={loading} gradFrom="#4f46e5" gradTo="#6366f1" delay={2} sub="Histórico completo" />
          <KpiCard icon={ShieldCheck} label="Válidas" value={stats.validas} loading={loading} gradFrom="#10b981" gradTo="#34d399" delay={3} sub="Cuentas operativas" />
          <KpiCard icon={Monitor} label="Crédito" value={stats.credito} loading={loading} gradFrom="#0ea5e9" gradTo="#38bdf8" delay={3} sub="Saldo registrado" />
          <KpiCard icon={Clock} label="Próx. a vencer" value={stats.proximas} loading={loading} gradFrom="#f59e0b" gradTo="#fbbf24" delay={4} sub={`≤ ${DIAS_ALERTA} días`} />
          <KpiCard icon={AlertCircle} label="Vencidas" value={stats.vencidas} loading={loading} gradFrom="#ef4444" gradTo="#f87171" delay={5} sub="Requieren acción" />
        </div>

        {/* ── LAYOUT DIVIDIDO: TABLA ↔ IMPORTACIÓN ── */}
        <div className="cp-a5 flex flex-col xl:flex-row gap-5 items-start">

          {/* Izquierda: Buscador + Tabla */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="search" placeholder="Buscar por ID, usuario, estado…" value={search} onChange={e => setSearch(e.target.value)}
                  className="cp-search w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 transition-shadow" />
              </div>
              <select value={filterVariante} onChange={e => setFilterVariante(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 focus:ring-2 focus:ring-indigo-400 outline-none transition-all">
                <option value="ALL">Todos los estados</option>
                <option value="valida">Vigentes</option>
                <option value="alerta">En alerta</option>
                <option value="vencida">Vencidas</option>
              </select>
              <button onClick={() => setShowPwd(s => !s)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap">
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />} <span className="hidden sm:inline">{showPwd ? 'Ocultar' : 'Mostrar'}</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
              {loading ? <SkeletonTable /> : error ? (
                <div className="py-16 text-center">
                  <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-4 text-center">
                  <Server size={36} className="text-indigo-200" />
                  <p className="text-slate-500 font-medium">No se encontraron cuentas padre.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto max-h-[36rem] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500 font-semibold sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                          {COLS.map(col => (
                            <th key={col.key} onClick={() => handleSort(col.key)} className="cp-th-sort px-4 py-3.5 cursor-pointer whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                {col.label} <SortIcon colKey={col.key} sortCol={sortCol} sortDir={sortDir} />
                              </div>
                            </th>
                          ))}
                          <th className="px-4 py-3.5 w-16 text-center sticky right-0 bg-slate-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map(row => (
                          <tr key={row.cuentaId} className={`cp-row group ${ROW_BG[getVariante(row)]}`}>
                            {COLS.map(col => <td key={col.key} className="px-4 py-3 whitespace-nowrap">{renderCell(row, col.key)}</td>)}
                            <td className="px-2 py-3 whitespace-nowrap text-center sticky right-0 bg-white shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)] z-10 group-hover:bg-slate-50/50 transition-colors">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => openEdit(row)} className="cp-action-btn w-7 h-7 rounded-lg flex items-center justify-center text-indigo-600 hover:bg-indigo-50" title="Editar"><Pencil size={13} /></button>
                                <button onClick={() => setDeleteTarget(row.cuentaId)} className="cp-action-btn w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50" title="Eliminar"><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
                    <span className="text-xs text-slate-400">{filtered.length} de {rows.length} registros</span>
                    <span className="text-xs text-slate-400">Orden: <strong className="text-indigo-600">{COLS.find(c => c.key === sortCol)?.label ?? sortCol}</strong></span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Derecha: Importación Excel */}
          <div className="w-full xl:w-72 flex-shrink-0 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-indigo-50"><FileSpreadsheet size={16} className="text-indigo-600" /></div>
                  <h3 className="font-bold text-slate-800">Carga Masiva</h3>
                </div>
                <p className="text-xs text-slate-400">Actualiza las cuentas arrastrando el archivo Excel original.</p>
              </div>

              <label onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
                  dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                }`}>
                <Upload size={24} className={`transition-colors ${dragOver ? 'text-indigo-500' : 'text-slate-300'}`} />
                <span className="text-xs text-slate-500 font-medium text-center">
                  {uploadFile ? <span className="text-indigo-700">{uploadFile.name}</span> : 'Arrastra o haz clic aquí'}
                </span>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) { setUploadFile(f); setUploadResult(null) } }} />
              </label>

              {uploadFile && (
                <button onClick={handleUpload} disabled={uploading} className="cp-cta w-full py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                  {uploading ? <><RefreshCw size={14} className="animate-spin" /> Procesando…</> : 'Procesar archivo'}
                </button>
              )}
              {!uploadFile && (
                <button onClick={handleRestoreOriginal} disabled={uploading} className="w-full py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
                  <RefreshCw size={13} /> Restaurar servidor
                </button>
              )}

              {uploadResult && (
                <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-slate-100">
                  <div className={`rounded-xl px-3 py-2.5 text-xs font-medium flex gap-2 ${uploadResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {uploadResult.ok ? <CheckCircle2 size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
                    <p>{uploadResult.message}</p>
                  </div>
                  {uploadResult.ok && diffData.length > 0 && (
                    <button onClick={() => setShowDiff(true)} className="w-full py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors">Ver cambios</button>
                  )}
                  {uploadResult.ok && canUndo && (
                    <button onClick={() => { if(confirm('¿Deshacer carga?')) executeUndo() }} disabled={uploading} className="w-full py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold transition-colors">Deshacer</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SECCIÓN CAPACIDAD (Ocupación) ── */}
        {ocupacion && (
          <div className="cp-a5 bg-slate-50 rounded-3xl p-6 lg:p-8 border border-slate-200/60 mt-8 shadow-inner">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-600 rounded-xl p-2.5 shadow-md shadow-indigo-200"><Layers size={20} className="text-white" /></div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Capacidad Operativa</h2>
                <p className="text-sm text-slate-500 font-medium">Uso de pantallas según el Planificador</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <BiCardCP icon={Layers} variant="solid" label="Instalada" value={ocupacion.totalCapacidad} tag={{ tone: 'info', text: 'Total disp.' }} sub="Pantallas registradas" />
              <BiCardCP icon={Monitor} variant="light" label="Activas" value={ocupacion.totalOcupadas} tag={tagOcupacionCP(ocupacion.pctOcupacionGlobal)} sub="Generando ingreso" />
              <BiCardCP icon={TrendingUp} variant="outline" label="Libres" value={ocupacion.totalLibres} tag={ocupacion.totalLibres > 0 ? { tone: 'good', text: 'Venta posible' } : { tone: 'warn', text: 'Agotado' }} sub="Costo marginal cero" />
              <BiCardCP icon={Percent} variant={ocupacion.pctOcupacionGlobal >= 92 ? 'outline' : 'light'} label="Ocupación" value={`${ocupacion.pctOcupacionGlobal}%`} sub={`${ocupacion.detalle.filter(c => c.pctOcupacion >= 100).length} ctas llenas`} />
            </div>
          </div>
        )}

      </div>

      {showForm && <CuentaDrawer editing={editing} form={form} f={f} onSubmit={handleSubmit} onClose={closeForm} />}
      {deleteTarget && <ConfirmDialog id={deleteTarget} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />}
      {showDiff && diffData.length > 0 && <ImportDiffModal diff={diffData} canUndo={canUndo} onUndo={executeUndo} onClose={() => setShowDiff(false)} undoing={uploading} />}
    </>
  )
}
