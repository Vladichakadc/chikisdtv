/**
 * SubscriptionsPage — Professional redesign
 * Skills applied: ui-ux-pro-max · huashu-design · taste-skill
 *
 * La tabla de datos es el mismo componente compartido PlanificadorTable
 * que usa PlanificadorPage. Cualquier cambio en ese componente se refleja
 * automáticamente aquí también — siempre son una copia exacta.
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { todayStr } from '../../utils/dateUtils'
import {
  Plus, Pencil, Trash2, X, CheckCircle2, Clock, XCircle,
  AlertTriangle, Search, SlidersHorizontal,
  Users, TrendingUp, Activity, RefreshCw, Monitor,
} from 'lucide-react'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { PlanificadorTable } from '../../components/ui/PlanificadorTable'
import { formatDate } from '../../utils/excelUtils'
import { getRowVariant, getPlanSortVal } from './planificador/rowHelpers'

/* ══════════════════════════════════════════════════════════════
   DESIGN TOKENS  (Huashu system — scoped to this page)
══════════════════════════════════════════════════════════════ */
const CSS = `
  @keyframes sp-fade-up   { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes sp-fade-in   { from { opacity:0 }  to { opacity:1 } }
  @keyframes sp-scale-in  { from { opacity:0; transform:scale(.94) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
  @keyframes sp-slide-in  { from { opacity:0; transform:translateX(100%) } to { opacity:1; transform:translateX(0) } }
  @keyframes sp-shimmer   { from { background-position:-200% 0 } to { background-position:200% 0 } }
  @keyframes sp-orb-1     { 0%,100% { transform:translate(0,0) scale(1) }  50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes sp-orb-2     { 0%,100% { transform:translate(0,0) scale(1) }  50% { transform:translate(-25px,15px) scale(1.05) } }

  .sp-a1  { animation: sp-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .sp-a2  { animation: sp-fade-up .45s cubic-bezier(.22,1,.36,1) .08s both }
  .sp-a3  { animation: sp-fade-up .45s cubic-bezier(.22,1,.36,1) .16s both }
  .sp-a4  { animation: sp-fade-up .45s cubic-bezier(.22,1,.36,1) .24s both }
  .sp-a5  { animation: sp-fade-up .45s cubic-bezier(.22,1,.36,1) .32s both }

  .sp-skeleton {
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: sp-shimmer 1.6s infinite;
    border-radius: 6px;
  }

  .sp-drawer  { animation: sp-slide-in .3s cubic-bezier(.22,1,.36,1) both }
  .sp-overlay { animation: sp-fade-in .2s ease both }
  .sp-confirm { animation: sp-scale-in .22s cubic-bezier(.22,1,.36,1) both }

  .sp-kpi { transition: transform .25s ease, box-shadow .25s ease }
  .sp-kpi:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.1) }

  .sp-filter-btn { transition: all .18s ease }
  .sp-filter-btn:hover { transform: translateY(-1px) }

  .sp-cta {
    background: linear-gradient(135deg, #f97316, #fb923c);
    box-shadow: 0 4px 18px rgba(249,115,22,.35);
    transition: all .22s ease;
  }
  .sp-cta:hover { box-shadow: 0 7px 24px rgba(249,115,22,.5); transform: translateY(-2px) }
  .sp-cta:active { transform: translateY(0) }

  .sp-btn-danger {
    background: linear-gradient(135deg,#ef4444,#f87171);
    box-shadow: 0 4px 14px rgba(239,68,68,.3);
    transition: all .2s ease;
  }
  .sp-btn-danger:hover { box-shadow: 0 6px 20px rgba(239,68,68,.45); transform: translateY(-1px) }

  .sp-orb-1 { animation: sp-orb-1 8s ease-in-out infinite }
  .sp-orb-2 { animation: sp-orb-2 11s ease-in-out infinite }
  .sp-search:focus { outline: none; box-shadow: 0 0 0 3px rgba(249,115,22,.18) }

  @media (prefers-reduced-motion: reduce) {
    .sp-a1,.sp-a2,.sp-a3,.sp-a4,.sp-a5,
    .sp-drawer,.sp-overlay,.sp-confirm,
    .sp-orb-1,.sp-orb-2,.sp-skeleton { animation: none !important; transition: none !important }
  }
`

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════ */
const EMPTY = {
  clientId: '', planId: '', fechaInicio: '', fechaVencimiento: '',
  estado: 'Activo', observaciones: ''
}

const ESTADO = {
  Activo:    { icon: CheckCircle2, pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  Vencido:   { icon: Clock,        pill: 'bg-red-50    text-red-600    ring-1 ring-red-200',       dot: 'bg-red-500'     },
  Cancelado: { icon: XCircle,      pill: 'bg-slate-100 text-slate-500  ring-1 ring-slate-200',     dot: 'bg-slate-400'   },
}

const AVATAR_COLORS = [
  'from-orange-400 to-amber-300', 'from-violet-500 to-purple-400',
  'from-cyan-500 to-sky-400',     'from-emerald-500 to-teal-400',
  'from-rose-500 to-pink-400',
]
const avatarColor = (name = '') =>
  AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════ */

function KpiCard({ icon: Icon, label, value, loading, gradFrom, gradTo, delay }) {
  return (
    <div className={`sp-kpi sp-a${delay} relative bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-default select-none`}>
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
           style={{ background: `linear-gradient(90deg,${gradFrom},${gradTo})` }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[.14em] uppercase text-slate-400 mb-2">{label}</p>
            {loading
              ? <div className="sp-skeleton h-8 w-14 mt-1" />
              : <p className="text-3xl font-bold text-slate-800 tabular-nums leading-none">{value}</p>
            }
          </div>
          <div className="p-2.5 rounded-xl shrink-0"
               style={{ background: `linear-gradient(135deg,${gradFrom}20,${gradTo}30)` }}>
            <Icon size={20} style={{ color: gradFrom }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function SkeletonTable() {
  return (
    <div className="divide-y divide-slate-100">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
          <div className="sp-skeleton w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="sp-skeleton h-3.5 rounded w-1/3" />
            <div className="sp-skeleton h-3 rounded w-1/5" />
          </div>
          <div className="sp-skeleton h-3.5 rounded w-24 hidden sm:block" />
          <div className="sp-skeleton h-6 rounded-full w-20" />
          <div className="sp-skeleton h-7 rounded-lg w-16" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasFilters, onNew, onClear }) {
  return (
    <div className="py-20 flex flex-col items-center gap-5 text-center px-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-100 to-amber-50
                        flex items-center justify-center shadow-inner">
          <Monitor size={36} className="text-orange-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-orange-500
                        flex items-center justify-center shadow-md">
          <Plus size={14} className="text-white" />
        </div>
      </div>
      <div className="max-w-xs">
        <p className="text-lg font-semibold text-slate-700">
          {hasFilters ? 'Sin resultados' : 'Sin datos del planificador'}
        </p>
        <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
          {hasFilters
            ? 'Ningún registro coincide con los filtros actuales.'
            : 'No hay pantallas en el planificador todavía.'}
        </p>
      </div>
      <div className="flex gap-3 flex-wrap justify-center">
        {hasFilters && (
          <button onClick={onClear}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600
                       border border-slate-200 hover:bg-slate-50 transition-colors">
            Limpiar filtros
          </button>
        )}
        <button onClick={onNew} data-testid="empty-new-btn"
          className="sp-cta px-4 py-2 rounded-xl text-sm font-semibold text-white
                     flex items-center gap-1.5">
          <Plus size={15} /> Nueva suscripción
        </button>
      </div>
    </div>
  )
}

function ConfirmDialog({ name, onConfirm, onCancel }) {
  return (
    <div className="sp-overlay fixed inset-0 bg-black/50 backdrop-blur-[3px] flex items-center
                    justify-center z-[70] p-4" onClick={onCancel}>
      <div className="sp-confirm bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
           onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex gap-4 items-start mb-4">
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">¿Eliminar suscripción?</h3>
              {name && <p className="text-slate-500 text-sm mt-0.5">Suscripción de <strong className="text-slate-700">{name}</strong>.</p>}
              <p className="text-slate-400 text-xs mt-1">Esta acción es permanente y no se puede deshacer.</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200
                       rounded-xl hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} data-testid="confirm-delete-btn"
            className="sp-btn-danger px-4 py-2 text-sm font-semibold text-white rounded-xl">
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

function SubscriptionDrawer({ editing, form, setForm, clients, plans, onSubmit, onClose }) {
  const [saving, setSaving] = useState(false)
  const submit = async (e) => { e.preventDefault(); setSaving(true); await onSubmit(e); setSaving(false) }

  return (
    <>
      <div className="sp-overlay fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50" onClick={onClose} />
      <div className="sp-drawer fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl
                      flex flex-col overflow-hidden">
        <div className="relative px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="absolute top-0 left-0 right-0 h-[3px]"
               style={{ background: 'linear-gradient(90deg,#f97316,#fb923c,#fbbf24)' }} />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[.14em] uppercase text-orange-500 mb-0.5">
                {editing ? 'Editar registro' : 'Nuevo registro'}
              </p>
              <h2 className="text-xl font-bold text-slate-800"
                  style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {editing ? 'Editar Suscripción' : 'Nueva Suscripción'}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {editing ? 'Modifica los datos de esta suscripción.' : 'Completa los datos para crear una nueva suscripción.'}
              </p>
            </div>
            <button onClick={onClose} data-testid="drawer-close-btn"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all mt-0.5">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            <div>
              <p className="text-[10px] font-bold tracking-[.12em] uppercase text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-4 h-[1px] bg-slate-300 inline-block" />Cliente
                <span className="flex-1 h-[1px] bg-slate-100 inline-block" />
              </p>
              <Select label="Cliente *" value={form.clientId}
                onChange={e => setForm({ ...form, clientId: e.target.value })} required>
                <option value="">— Selecciona un cliente —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
              </Select>
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-[.12em] uppercase text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-4 h-[1px] bg-slate-300 inline-block" />Plan
                <span className="flex-1 h-[1px] bg-slate-100 inline-block" />
              </p>
              <div className="grid grid-cols-1 gap-3">
                {plans.map(p => (
                  <label key={p.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200
                      ${Number(form.planId) === p.id ? 'border-orange-400 bg-orange-50/60' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                    <input type="radio" name="planId" value={p.id}
                      checked={Number(form.planId) === p.id}
                      onChange={e => setForm({ ...form, planId: e.target.value })}
                      className="accent-orange-500" required />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm">{p.nombre}</p>
                      {p.descripcion && <p className="text-xs text-slate-400 truncate">{p.descripcion}</p>}
                    </div>
                    {p.precio != null && (
                      <span className="text-sm font-bold text-orange-600 shrink-0">${p.precio.toLocaleString()}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-[.12em] uppercase text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-4 h-[1px] bg-slate-300 inline-block" />Periodo y estado
                <span className="flex-1 h-[1px] bg-slate-100 inline-block" />
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Fecha de inicio *" type="date" value={form.fechaInicio}
                  onChange={e => setForm({ ...form, fechaInicio: e.target.value })} required />
                <Input label="Fecha vencimiento" type="date" value={form.fechaVencimiento || ''}
                  onChange={e => setForm({ ...form, fechaVencimiento: e.target.value })} />
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
                <div className="flex gap-2">
                  {Object.entries(ESTADO).map(([key, val]) => {
                    const Icon = val.icon
                    return (
                      <button key={key} type="button"
                        onClick={() => setForm({ ...form, estado: key })}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border-2 transition-all duration-200
                          ${form.estado === key ? val.pill + ' border-current' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                        <Icon size={13} />{key}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-[.12em] uppercase text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-4 h-[1px] bg-slate-300 inline-block" />Observaciones
                <span className="flex-1 h-[1px] bg-slate-100 inline-block" />
              </p>
              <Textarea rows={3} placeholder="Notas internas…"
                value={form.observaciones || ''}
                onChange={e => setForm({ ...form, observaciones: e.target.value })} />
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600
                         border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} data-testid="drawer-submit-btn"
              className="sp-cta flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                         flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
                : editing ? 'Guardar cambios' : <><Plus size={15} />Crear suscripción</>
              }
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function SubscriptionsPage() {
  const { showToast } = useUi()

  // ── Suscripciones (para el drawer y las KPI cards) ──
  const [subs, setSubs]         = useState([])
  const [clients, setClients]   = useState([])
  const [plans, setPlans]       = useState([])
  const [loadingSubs, setLoadingSubs] = useState(true)

  // ── Datos del Planificador (misma tabla que PlanificadorPage) ──
  const [planData, setPlanData]   = useState(null)
  const [loadingPlan, setLoadingPlan] = useState(true)

  // ── UI state ──
  const [showDrawer, setShowDrawer]       = useState(false)
  const [editing, setEditing]             = useState(null)
  const [form, setForm]                   = useState(EMPTY)
  const [deleteTarget, setDeleteTarget]   = useState(null)
  const [search, setSearch]               = useState('')
  const [filterEstado, setFilterEstado]   = useState('Todos')
  const [sortConfig, setSortConfig]       = useState({ key: 'cuentaId', dir: 'asc' })
  const [hidePwd, setHidePwd]             = useState({})

  /* ── Load suscripciones ── */
  const loadSubs = useCallback(async () => {
    setLoadingSubs(true)
    try {
      const [s, c, p] = await Promise.all([
        api.get('/admin/subscriptions'),
        api.get('/admin/clients'),
        api.get('/admin/plans'),
      ])
      setSubs(s.data)
      setClients(c.data.filter(x => x.role === 'user'))
      setPlans(p.data.filter(x => x.activo))
    } catch {
      showToast('Error al cargar suscripciones.', 'error')
    } finally {
      setLoadingSubs(false)
    }
  }, [showToast])

  /* ── Load planificador ── */
  const loadPlan = useCallback(async () => {
    setLoadingPlan(true)
    try {
      const r = await api.get('/admin/planificador')
      setPlanData(r.data)
    } catch {
      showToast('Error al cargar el planificador.', 'error')
    } finally {
      setLoadingPlan(false)
    }
  }, [showToast])

  useEffect(() => { loadSubs(); loadPlan() }, [loadSubs, loadPlan])

  /* ── Sort handler (same logic as PlanificadorPage) ── */
  const onSort = (key) => setSortConfig(prev =>
    prev.key === key
      ? prev.dir === 'asc' ? { key, dir: 'desc' } : { key: null, dir: 'asc' }
      : { key, dir: 'asc' }
  )
  const togglePwd = (id) => setHidePwd(p => ({ ...p, [id]: !p[id] }))

  /* ── CRUD ── */
  const openNew  = () => { setEditing(null); setForm({ ...EMPTY, fechaInicio: todayStr() }); setShowDrawer(true) }
  const openEdit = (s) => { setEditing(s); setForm({ ...s }); setShowDrawer(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, clientId: Number(form.clientId), planId: Number(form.planId) }
    if (!payload.fechaVencimiento) delete payload.fechaVencimiento
    try {
      if (editing) {
        await api.put(`/admin/subscriptions/${editing.id}`, payload)
        showToast('Suscripción actualizada correctamente.', 'success')
      } else {
        await api.post('/admin/subscriptions', payload)
        showToast('Suscripción creada correctamente.', 'success')
      }
      setShowDrawer(false)
      loadSubs()
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/admin/subscriptions/${deleteTarget.id}`)
      showToast('Suscripción eliminada.', 'success')
      loadSubs()
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  /* ── KPI stats (from suscripciones) ── */
  const stats = useMemo(() => ({
    total:      subs.length,
    activos:    subs.filter(s => s.estado === 'Activo').length,
    vencidos:   subs.filter(s => s.estado === 'Vencido').length,
    cancelados: subs.filter(s => s.estado === 'Cancelado').length,
  }), [subs])

  /* ── Process planificador rows (same logic as PlanificadorPage) ── */
  const { rows: planRows, planStats } = useMemo(() => {
    if (!planData) return { rows: [], planStats: {} }
    const { pantallas, diasAlerta } = planData

    let filtered = pantallas

    // Search filter
    if (search.trim()) {
      const sq = search.toLowerCase()
      filtered = filtered.filter(p =>
        (p.cuentaId || '').toLowerCase().includes(sq) ||
        (p.cuenta || '').toLowerCase().includes(sq) ||
        (p.nombre || '').toLowerCase().includes(sq) ||
        (p.apellido || '').toLowerCase().includes(sq) ||
        (`${p.nombre || ''} ${p.apellido || ''}`).toLowerCase().includes(sq) ||
        (p.nickname || '').toLowerCase().includes(sq) ||
        (p.customerId || '').toLowerCase().includes(sq)
      )
    }

    // Status filter
    if (filterEstado !== 'Todos') {
      const target = filterEstado.toLowerCase()
      filtered = filtered.filter(p => getRowVariant(p, diasAlerta) === target)
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortConfig.key) {
        const aVal = getPlanSortVal(a, sortConfig.key)
        const bVal = getPlanSortVal(b, sortConfig.key)
        if (aVal !== bVal) {
          if (aVal == null) return 1
          if (bVal == null) return -1
          const cmp = typeof aVal === 'string'
            ? aVal.localeCompare(bVal, 'es', { sensitivity: 'base' })
            : Number(aVal) - Number(bVal)
          if (cmp !== 0) return sortConfig.dir === 'asc' ? cmp : -cmp
        }
      }
      if (a.cuentaId !== b.cuentaId) return a.cuentaId < b.cuentaId ? -1 : 1
      return a.idPantalla < b.idPantalla ? -1 : 1
    })

    const rows = filtered.map((p, i) => ({
      ...p,
      isGroupStart: i === 0 || filtered[i - 1].cuentaId !== p.cuentaId,
    }))

    return { rows, planStats: { diasAlerta, total: pantallas.length } }
  }, [planData, search, filterEstado, sortConfig])

  const hasFilters   = search.trim() !== '' || filterEstado !== 'Todos'
  const isLoading    = loadingSubs || loadingPlan

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{CSS}</style>

      <div className="space-y-6 pb-8">

        {/* ── HERO HEADER ── */}
        <div className="sp-a1 relative rounded-3xl overflow-hidden"
             style={{ background: 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)' }}>
          <div className="sp-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.15] pointer-events-none"
               style={{ background: 'radial-gradient(circle,#f97316,transparent 70%)' }} />
          <div className="sp-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.10] pointer-events-none"
               style={{ background: 'radial-gradient(circle,#7c3aed,transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[.03] pointer-events-none"
               style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/25 mb-4">
                <Activity size={12} className="text-orange-400" />
                <span className="text-orange-400 text-xs font-semibold tracking-widest uppercase">Gestión</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight"
                  style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
                Suscripciones
              </h1>
              <p className="text-slate-400 text-sm mt-2 max-w-sm">
                Vista completa del planificador — idéntica a la tabla en Planificador.
                {planStats.total != null && !isLoading && (
                  <span className="ml-1 text-slate-500">· {planStats.total} pantallas</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { loadSubs(); loadPlan() }}
                className="shrink-0 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/80
                           border border-white/20 hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                Actualizar
              </button>
              <button id="new-subscription-btn" data-testid="new-subscription-btn"
                onClick={openNew}
                className="sp-cta shrink-0 px-5 py-3 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
                <Plus size={17} />Nueva suscripción
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI CARDS (suscripciones) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Users}        label="Total"      value={stats.total}      loading={loadingSubs} gradFrom="#64748b" gradTo="#94a3b8" delay={2} />
          <KpiCard icon={CheckCircle2} label="Activas"    value={stats.activos}    loading={loadingSubs} gradFrom="#10b981" gradTo="#34d399" delay={3} />
          <KpiCard icon={Clock}        label="Vencidas"   value={stats.vencidos}   loading={loadingSubs} gradFrom="#ef4444" gradTo="#f87171" delay={4} />
          <KpiCard icon={TrendingUp}   label="Canceladas" value={stats.cancelados} loading={loadingSubs} gradFrom="#8b5cf6" gradTo="#a78bfa" delay={5} />
        </div>

        {/* ── FILTER BAR ── */}
        <div className="sp-a3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="search" placeholder="Buscar nombre, cuenta, nickname…"
              value={search} onChange={e => setSearch(e.target.value)}
              data-testid="search-input"
              className="sp-search w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200
                         bg-white text-sm text-slate-700 placeholder:text-slate-400 transition-shadow duration-200" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal size={14} className="text-slate-400 shrink-0" />
            {[
              { key: 'Todos',   color: 'bg-slate-800 text-white border-slate-800',   inactive: 'border-slate-200 text-slate-500' },
              { key: 'vigente', color: 'bg-emerald-500 text-white border-emerald-500', inactive: 'border-slate-200 text-slate-500' },
              { key: 'alerta',  color: 'bg-amber-500 text-white border-amber-500',     inactive: 'border-slate-200 text-slate-500' },
              { key: 'vencido', color: 'bg-red-500 text-white border-red-500',         inactive: 'border-slate-200 text-slate-500' },
              { key: 'libre',   color: 'bg-slate-400 text-white border-slate-400',     inactive: 'border-slate-200 text-slate-500' },
            ].map(({ key, color, inactive }) => (
              <button key={key}
                onClick={() => setFilterEstado(key)}
                data-testid={`filter-${key.toLowerCase()}`}
                className={`sp-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                  ${filterEstado === key ? color : inactive}`}>
                {key === 'Todos' ? 'Todos' : key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
            {!loadingPlan && planRows.length > 0 && (
              <span className="text-xs text-slate-400 ml-1">{planRows.length} filas</span>
            )}
          </div>
        </div>

        {/* ── PLANIFICADOR TABLE (shared component) ── */}
        <div className="sp-a4">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              Tabla sincronizada con Planificador — actualización en tiempo real
            </p>
          </div>
          <Card className="overflow-hidden border-slate-200/80">
            {isLoading
              ? <SkeletonTable />
              : planRows.length === 0
                ? <EmptyState
                    hasFilters={hasFilters}
                    onNew={openNew}
                    onClear={() => { setSearch(''); setFilterEstado('Todos') }}
                  />
                : <PlanificadorTable
                    rows={planRows}
                    stats={planStats}
                    sortConfig={sortConfig}
                    onSort={onSort}
                    hidePwd={hidePwd}
                    onTogglePwd={togglePwd}
                    readOnly={true}
                  />
            }
          </Card>
        </div>

      </div>

      {/* ── DRAWER ── */}
      {showDrawer && (
        <SubscriptionDrawer
          editing={editing}
          form={form}
          setForm={setForm}
          clients={clients}
          plans={plans}
          onSubmit={handleSubmit}
          onClose={() => setShowDrawer(false)}
        />
      )}

      {/* ── CONFIRM DELETE ── */}
      {deleteTarget && (
        <ConfirmDialog
          name={deleteTarget.name}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
