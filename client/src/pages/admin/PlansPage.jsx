/**
 * PlansPage — Professional redesign
 * Skills applied: ui-ux-pro-max · huashu-design · taste-skill
 *
 * Interfaz profesional:
 *  – Hero header oscuro con orbs cyan/blue ambientales
 *  – KPI cards con gradientes y animaciones de entrada
 *  – Drawer lateral para edición de planes
 *  – Confirm dialog custom
 *  – Skeleton shimmer loader
 *  – Búsqueda en tiempo real
 *  – Tabla con scroll horizontal y acciones hover
 */

import { useState, useMemo, useEffect } from 'react'
import {
  Search, Plus, Pencil, Trash2, X,
  CheckCircle2, XCircle, LayoutGrid, DollarSign,
  Activity, AlertTriangle, Layers, Monitor, Calendar
} from 'lucide-react'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { KpiCard } from '../../components/ui/KpiCard'
import { formatCurrency } from '../../utils/excelUtils'

/* ══════════════════════════════════════════════════════════════
   DESIGN TOKENS (Huashu — brand Cyan/Sky para Planes)
══════════════════════════════════════════════════════════════ */
const CSS = `
  @keyframes pl-fade-up  { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes pl-fade-in  { from { opacity:0 } to { opacity:1 } }
  @keyframes pl-scale-in { from { opacity:0; transform:scale(.94) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
  @keyframes pl-slide-in { from { opacity:0; transform:translateX(100%) } to { opacity:1; transform:translateX(0) } }
  @keyframes pl-shimmer  { from { background-position:-200% 0 } to { background-position:200% 0 } }
  @keyframes pl-orb-1    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes pl-orb-2    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }

  .pl-a1 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .pl-a2 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .pl-a3 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) .12s both }
  .pl-a4 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) .18s both }

  .pl-skeleton {
    background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
    background-size: 200% 100%;
    animation: pl-shimmer 1.6s infinite;
    border-radius: 6px;
  }
  .pl-drawer  { animation: pl-slide-in .3s cubic-bezier(.22,1,.36,1) both }
  .pl-overlay { animation: pl-fade-in .2s ease both }
  .pl-confirm { animation: pl-scale-in .22s cubic-bezier(.22,1,.36,1) both }

  .pl-kpi { transition: transform .25s ease, box-shadow .25s ease }
  .pl-kpi:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.12) }

  .pl-cta {
    background: linear-gradient(135deg, #0ea5e9, #3b82f6);
    box-shadow: 0 4px 18px rgba(14,165,233,.4);
    transition: all .22s ease;
  }
  .pl-cta:hover  { box-shadow: 0 7px 24px rgba(14,165,233,.55); transform: translateY(-2px) }
  .pl-cta:active { transform: translateY(0) }

  .pl-btn-danger {
    background: linear-gradient(135deg,#ef4444,#f87171);
    box-shadow: 0 4px 14px rgba(239,68,68,.3);
    transition: all .2s ease;
  }
  .pl-btn-danger:hover { box-shadow: 0 6px 20px rgba(239,68,68,.45); transform: translateY(-1px) }

  .pl-orb-1 { animation: pl-orb-1 8s ease-in-out infinite }
  .pl-orb-2 { animation: pl-orb-2 11s ease-in-out infinite }

  .pl-search:focus { outline: none; box-shadow: 0 0 0 3px rgba(14,165,233,.18) }

  .pl-row { transition: background .15s ease }
  .pl-row:hover td { background: rgba(14,165,233,.04) }

  .pl-th-sort { transition: background .15s ease }
  .pl-th-sort:hover { background: rgba(255,255,255,.12) }

  .pl-action-btn { transition: all .18s ease; opacity: 0 }
  tr:hover .pl-action-btn { opacity: 1 }
  .pl-action-btn:hover { transform: scale(1.15) }

  @media (prefers-reduced-motion: reduce) {
    .pl-a1,.pl-a2,.pl-a3,.pl-a4,
    .pl-drawer,.pl-overlay,.pl-confirm,
    .pl-orb-1,.pl-orb-2,.pl-skeleton { animation: none !important; transition: none !important }
  }
`

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════ */
const EMPTY = {
  nombre: '', precio: 0, duracionDias: 30, numeroPantallas: 1,
  descripcion: '', activo: true
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════ */

/** KPI card */

/** Skeleton table */
function SkeletonTable() {
  return (
    <div className="divide-y divide-slate-100">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
          <div className="flex-1 space-y-2">
            <div className="pl-skeleton h-4 rounded w-1/3" />
            <div className="pl-skeleton h-3 rounded w-1/2" />
          </div>
          <div className="pl-skeleton w-24 h-4 rounded hidden sm:block" />
          <div className="pl-skeleton w-16 h-4 rounded hidden md:block" />
          <div className="pl-skeleton w-14 h-5 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** Empty state */
function EmptyState({ onNew, hasSearch }) {
  return (
    <div className="py-20 flex flex-col items-center gap-5 text-center px-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-100 to-blue-50
                        flex items-center justify-center shadow-inner">
          <Layers size={36} className="text-sky-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-sky-500
                        flex items-center justify-center shadow-md">
          <Plus size={14} className="text-white" />
        </div>
      </div>
      <div className="max-w-xs">
        <p className="text-lg font-semibold text-slate-700">
          {hasSearch ? 'Sin resultados' : 'No hay planes'}
        </p>
        <p className="text-slate-400 text-sm mt-1.5">
          {hasSearch ? 'No se encontraron planes con esa búsqueda.' : 'Crea tu primer plan para comenzar a vender suscripciones.'}
        </p>
      </div>
      {!hasSearch && (
        <button onClick={onNew}
          className="pl-cta px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2">
          <Plus size={15} /> Nuevo Plan
        </button>
      )}
    </div>
  )
}

/** Confirm delete dialog */
function ConfirmDialog({ name, onConfirm, onCancel }) {
  return (
    <div className="pl-overlay fixed inset-0 bg-black/50 backdrop-blur-[3px] flex items-center justify-center z-[70] p-4" onClick={onCancel}>
      <div className="pl-confirm bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex gap-4 items-start">
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">¿Eliminar plan?</h3>
              {name && <p className="text-slate-500 text-sm mt-0.5">Plan: <strong className="text-slate-700">{name}</strong>.</p>}
              <p className="text-slate-400 text-xs mt-1">Si hay suscripciones usando este plan, podrían verse afectadas. Esta acción no se puede deshacer.</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="pl-btn-danger px-4 py-2 text-sm font-semibold text-white rounded-xl">Sí, eliminar</button>
        </div>
      </div>
    </div>
  )
}

/** Form field label */
function FieldLabel({ children }) {
  return <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{children}</label>
}

const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"

/** Section header inside drawer */
function DrawerSection({ children }) {
  return (
    <div className="flex items-center gap-3 pt-2 mb-1">
      <span className="text-[10px] font-bold tracking-[.14em] uppercase text-slate-400">{children}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

/** Slide-in drawer form */
function PlanDrawer({ editing, form, setForm, onSubmit, onClose }) {
  const [saving, setSaving] = useState(false)
  const submit = async (e) => { e.preventDefault(); setSaving(true); await onSubmit(e); setSaving(false) }

  return (
    <>
      <div className="pl-overlay fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50" onClick={onClose} />
      <div className="pl-drawer fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="absolute top-0 left-0 right-0 h-[3px]"
               style={{ background: 'linear-gradient(90deg,#0ea5e9,#3b82f6)' }} />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[.14em] uppercase text-sky-500 mb-0.5">
                {editing ? 'Editar registro' : 'Nuevo registro'}
              </p>
              <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {editing ? 'Editar Plan' : 'Nuevo Plan'}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Configura las características y el precio.</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all mt-0.5">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            <DrawerSection>Información General</DrawerSection>
            <div>
              <FieldLabel>Nombre del plan *</FieldLabel>
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required
                className={inputCls} placeholder="Ej. Plan Familiar Mensual" />
            </div>
            <div>
              <FieldLabel>Descripción</FieldLabel>
              <textarea value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                className={inputCls} rows={3} placeholder="Detalles de lo que incluye el plan..." />
            </div>

            <DrawerSection>Detalles Comerciales</DrawerSection>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Precio *</FieldLabel>
                <CurrencyInput value={form.precio} onChange={v => setForm({ ...form, precio: v })} decimals={0}
                  className="border-slate-200 focus:ring-sky-400 text-sm rounded-xl" required />
              </div>
              <div>
                <FieldLabel>Estado</FieldLabel>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button type="button" onClick={() => setForm({ ...form, activo: true })}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${form.activo ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    Activo
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, activo: false })}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${!form.activo ? 'bg-white shadow text-slate-700' : 'text-slate-500 hover:text-slate-700'}`}>
                    Inactivo
                  </button>
                </div>
              </div>
              <div>
                <FieldLabel>Duración (días) *</FieldLabel>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="number" min="1" value={form.duracionDias} onChange={e => setForm({ ...form, duracionDias: e.target.value })} required
                    className={`${inputCls} pl-9`} />
                </div>
              </div>
              <div>
                <FieldLabel>N° Pantallas *</FieldLabel>
                <div className="relative">
                  <Monitor size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="number" min="1" value={form.numeroPantallas} onChange={e => setForm({ ...form, numeroPantallas: e.target.value })} required
                    className={`${inputCls} pl-9`} />
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600
                         border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="pl-cta flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                         flex items-center justify-center gap-2 disabled:opacity-60">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
                : editing ? 'Guardar cambios' : <><Plus size={15} />Crear plan</>
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
export default function PlansPage() {
  const { showToast } = useUi()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/plans')
      setPlans(data)
    } catch (e) {
      showToast('Error al cargar los planes.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  /* ── Filter ── */
  const filtered = useMemo(() => {
    if (!search.trim()) return plans
    const s = search.toLowerCase()
    return plans.filter(p =>
      (p.nombre || '').toLowerCase().includes(s) ||
      (p.descripcion || '').toLowerCase().includes(s)
    )
  }, [plans, search])

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = plans.length
    const activos = plans.filter(p => p.activo).length
    const inactivos = total - activos
    const sumPrecioActivos = plans.filter(p => p.activo).reduce((sum, p) => sum + (Number(p.precio) || 0), 0)
    const precioPromedio = activos > 0 ? sumPrecioActivos / activos : 0
    return { total, activos, inactivos, precioPromedio }
  }, [plans])

  /* ── Handlers ── */
  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = (p) => { setEditing(p); setForm({ ...EMPTY, ...p }); setShowForm(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      precio: Number(form.precio),
      duracionDias: Number(form.duracionDias),
      numeroPantallas: Number(form.numeroPantallas)
    }
    try {
      if (editing) {
        await api.put(`/admin/plans/${editing.id}`, payload)
        showToast('Plan actualizado correctamente.', 'success')
      } else {
        await api.post('/admin/plans', payload)
        showToast('Plan creado correctamente.', 'success')
      }
      setShowForm(false)
      load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/admin/plans/${deleteTarget.id}`)
      showToast('Plan eliminado correctamente.', 'success')
      load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="space-y-6 pb-8">

        {/* ── HERO HEADER ── */}
        <div className="pl-a1 relative rounded-3xl overflow-hidden"
             style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)' }}>
          <div className="pl-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.15] pointer-events-none"
               style={{ background: 'radial-gradient(circle,#0ea5e9,transparent 70%)' }} />
          <div className="pl-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.10] pointer-events-none"
               style={{ background: 'radial-gradient(circle,#3b82f6,transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[.03] pointer-events-none"
               style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

          <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/25 mb-4">
                <Activity size={12} className="text-sky-400" />
                <span className="text-sky-400 text-xs font-semibold tracking-widest uppercase">Catálogo</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight"
                  style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
                Planes
              </h1>
              <p className="text-slate-400 text-sm mt-2">
                Configura los planes y precios para las suscripciones
              </p>
            </div>
            <button onClick={openNew}
              className="pl-cta shrink-0 px-5 py-3 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
              <Plus size={17} /> Nuevo Plan
            </button>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Layers}       label="Total Planes"  value={stats.total}          loading={loading} gradFrom="#0ea5e9" gradTo="#38bdf8" delay={2} />
          <KpiCard icon={CheckCircle2} label="Activos"       value={stats.activos}        loading={loading} gradFrom="#10b981" gradTo="#34d399" delay={3} sub="Disponibles para venta" />
          <KpiCard icon={XCircle}      label="Inactivos"     value={stats.inactivos}      loading={loading} gradFrom="#64748b" gradTo="#94a3b8" delay={4} sub="Ocultos del catálogo" />
          <KpiCard icon={DollarSign}   label="Precio Prom."  value={formatCurrency(stats.precioPromedio)} loading={loading} gradFrom="#8b5cf6" gradTo="#a78bfa" delay={5} sub="De planes activos" />
        </div>

        {/* ── SEARCH & TABLE ── */}
        <div className="pl-a4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="search" placeholder="Buscar por nombre o descripción…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-search w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200
                           bg-white text-sm text-slate-700 placeholder:text-slate-400 transition-shadow" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            {loading
              ? <SkeletonTable />
              : filtered.length === 0
                ? <EmptyState onNew={openNew} hasSearch={search.trim().length > 0} />
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500 font-semibold">
                          <th className="px-6 py-4">Nombre del Plan</th>
                          <th className="px-6 py-4">Precio</th>
                          <th className="px-6 py-4">Duración</th>
                          <th className="px-6 py-4 text-center">Pantallas</th>
                          <th className="px-6 py-4 text-center">Estado</th>
                          <th className="px-6 py-4 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map(p => (
                          <tr key={p.id} className="pl-row hover:bg-slate-50/50">
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-800">{p.nombre}</p>
                              {p.descripcion && <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{p.descripcion}</p>}
                            </td>
                            <td className="px-6 py-4 font-bold text-sky-600">
                              {formatCurrency(p.precio)}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              <span className="inline-flex items-center gap-1.5"><Calendar size={14} className="text-slate-400"/> {Math.round(p.duracionDias)} días</span>
                            </td>
                            <td className="px-6 py-4 text-center text-slate-600">
                              <span className="inline-flex items-center gap-1.5"><Monitor size={14} className="text-slate-400"/> {p.numeroPantallas}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {p.activo
                                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><CheckCircle2 size={10} />Activo</span>
                                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500"><XCircle size={10} />Inactivo</span>}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEdit(p)}
                                  className="pl-action-btn w-8 h-8 rounded-lg flex items-center justify-center text-sky-500 hover:bg-sky-50"
                                  title="Editar">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => setDeleteTarget(p)}
                                  className="pl-action-btn w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50"
                                  title="Eliminar">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
            }
          </div>
        </div>

      </div>

      {/* ── DRAWER ── */}
      {showForm && (
        <PlanDrawer
          editing={editing}
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* ── CONFIRM DELETE ── */}
      {deleteTarget && (
        <ConfirmDialog
          name={deleteTarget.nombre}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
