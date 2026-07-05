/**
 * ClientsPage — Professional redesign
 * Skills applied: ui-ux-pro-max · huashu-design · taste-skill
 *
 * Interfaz profesional:
 *  – Hero header oscuro con orbs Teal/Emerald ambientales
 *  – KPI cards con gradientes y animaciones de entrada
 *  – Gráfica geográfica nativa integrada con diseño premium
 *  – Drawer lateral para edición de clientes
 *  – Confirm dialog custom
 *  – Skeleton shimmer loader
 *  – Búsqueda en tiempo real
 *  – Tabla con scroll horizontal y acciones hover
 */

import { useState, useMemo, useEffect } from 'react'
import {
  Search, Users, Globe, UserCheck, Repeat,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Plus, Pencil, Trash2, X, Upload, MapPin, Phone, AlertTriangle, User
} from 'lucide-react'

import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { KpiCard } from '../../components/ui/KpiCard'
import api from '../../config/api'
import { useApiResource } from '../../hooks/useApiResource'
import { useUi } from '../../context/UiContext'

const PAISES = [
  { nombre: 'Colombia', codigo: '+57' }, { nombre: 'México', codigo: '+52' },
  { nombre: 'Venezuela', codigo: '+58' }, { nombre: 'Ecuador', codigo: '+593' },
  { nombre: 'Perú', codigo: '+51' }, { nombre: 'Chile', codigo: '+56' },
  { nombre: 'Argentina', codigo: '+54' }, { nombre: 'Bolivia', codigo: '+591' },
  { nombre: 'Paraguay', codigo: '+595' }, { nombre: 'Uruguay', codigo: '+598' },
  { nombre: 'Brasil', codigo: '+55' }, { nombre: 'Panamá', codigo: '+507' },
  { nombre: 'Costa Rica', codigo: '+506' }, { nombre: 'Guatemala', codigo: '+502' },
  { nombre: 'Honduras', codigo: '+504' }, { nombre: 'El Salvador', codigo: '+503' },
  { nombre: 'Nicaragua', codigo: '+505' }, { nombre: 'República Dominicana', codigo: '+1' },
  { nombre: 'Puerto Rico', codigo: '+1' }, { nombre: 'Cuba', codigo: '+53' },
  { nombre: 'España', codigo: '+34' }, { nombre: 'Estados Unidos', codigo: '+1' },
]

/* ══════════════════════════════════════════════════════════════
   DESIGN TOKENS (Huashu — brand Teal/Emerald para Clientes)
══════════════════════════════════════════════════════════════ */
const CSS = `
  @keyframes cl-fade-up  { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes cl-fade-in  { from { opacity:0 } to { opacity:1 } }
  @keyframes cl-scale-in { from { opacity:0; transform:scale(.94) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
  @keyframes cl-slide-in { from { opacity:0; transform:translateX(100%) } to { opacity:1; transform:translateX(0) } }
  @keyframes cl-shimmer  { from { background-position:-200% 0 } to { background-position:200% 0 } }
  @keyframes cl-orb-1    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes cl-orb-2    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }

  .cl-a1 { animation: cl-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .cl-a2 { animation: cl-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .cl-a3 { animation: cl-fade-up .45s cubic-bezier(.22,1,.36,1) .12s both }
  .cl-a4 { animation: cl-fade-up .45s cubic-bezier(.22,1,.36,1) .18s both }
  .cl-a5 { animation: cl-fade-up .45s cubic-bezier(.22,1,.36,1) .24s both }

  .cl-skeleton {
    background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
    background-size: 200% 100%;
    animation: cl-shimmer 1.6s infinite;
    border-radius: 6px;
  }
  .cl-drawer  { animation: cl-slide-in .3s cubic-bezier(.22,1,.36,1) both }
  .cl-overlay { animation: cl-fade-in .2s ease both }
  .cl-confirm { animation: cl-scale-in .22s cubic-bezier(.22,1,.36,1) both }

  .cl-kpi { transition: transform .25s ease, box-shadow .25s ease }
  .cl-kpi:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.12) }
  .cl-kpi.clickable { cursor: pointer }

  .cl-cta {
    background: linear-gradient(135deg, #14b8a6, #0ea5e9);
    box-shadow: 0 4px 18px rgba(20,184,166,.4);
    transition: all .22s ease;
  }
  .cl-cta:hover  { box-shadow: 0 7px 24px rgba(20,184,166,.55); transform: translateY(-2px) }
  .cl-cta:active { transform: translateY(0) }

  .cl-btn-ghost {
    transition: all .2s ease;
    border: 1px solid rgba(255,255,255,.2);
  }
  .cl-btn-ghost:hover { background: rgba(255,255,255,.1) }

  .cl-btn-danger {
    background: linear-gradient(135deg,#ef4444,#f87171);
    box-shadow: 0 4px 14px rgba(239,68,68,.3);
    transition: all .2s ease;
  }
  .cl-btn-danger:hover { box-shadow: 0 6px 20px rgba(239,68,68,.45); transform: translateY(-1px) }

  .cl-orb-1 { animation: cl-orb-1 8s ease-in-out infinite }
  .cl-orb-2 { animation: cl-orb-2 11s ease-in-out infinite }

  .cl-search:focus { outline: none; box-shadow: 0 0 0 3px rgba(20,184,166,.18) }

  .cl-row { transition: background .15s ease }
  .cl-row:hover td { background: rgba(20,184,166,.04) }

  .cl-th-sort { transition: background .15s ease }
  .cl-th-sort:hover { background: rgba(255,255,255,.12) }

  .cl-action-btn { transition: all .18s ease; opacity: 0 }
  tr:hover .cl-action-btn { opacity: 1 }
  .cl-action-btn:hover { transform: scale(1.15) }

  @media (prefers-reduced-motion: reduce) {
    .cl-a1,.cl-a2,.cl-a3,.cl-a4,.cl-a5,
    .cl-drawer,.pl-overlay,.pl-confirm,
    .cl-orb-1,.cl-orb-2,.cl-skeleton { animation: none !important; transition: none !important }
  }
`

/* ══════════════════════════════════════════════════════════════
   CONSTANTS & UTILS
══════════════════════════════════════════════════════════════ */
const COLS = [
  { key: 'customerId',   label: 'ID' },
  { key: 'nombre',       label: 'Nombre' },
  { key: 'apellido',     label: 'Apellido' },
  { key: 'genero',       label: 'Género' },
  { key: 'pais',         label: 'País' },
  { key: 'ciudad',       label: 'Ciudad' },
  { key: 'tipoCliente',  label: 'Tipo' },
  { key: 'referido',     label: 'Referido' },
  { key: 'movil',        label: 'Móvil' },
]

const EMPTY = {
  customerId: '', nombre: '', apellido: '', genero: '',
  pais: '', ciudad: '', tipoCliente: 'Final', concatenar: '', referido: '', movil: '',
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════ */

/** KPI card */

function SortIcon({ colKey, sortCol, sortDir }) {
  if (sortCol !== colKey) return <ChevronsUpDown size={12} className="opacity-30 shrink-0" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="shrink-0 text-teal-200" />
    : <ChevronDown size={12} className="shrink-0 text-teal-200" />
}

function SkeletonTable() {
  return (
    <div className="divide-y divide-slate-100">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
          <div className="cl-skeleton h-4 w-12 rounded" />
          <div className="flex-1 space-y-2">
            <div className="cl-skeleton h-4 rounded w-1/3" />
            <div className="cl-skeleton h-3 rounded w-1/4" />
          </div>
          <div className="cl-skeleton w-20 h-5 rounded-full hidden sm:block" />
          <div className="cl-skeleton w-24 h-4 rounded hidden md:block" />
          <div className="cl-skeleton w-16 h-5 rounded-full hidden lg:block" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onNew, hasSearch }) {
  return (
    <div className="py-20 flex flex-col items-center gap-5 text-center px-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-100 to-emerald-50
                        flex items-center justify-center shadow-inner">
          <Users size={36} className="text-teal-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-teal-500
                        flex items-center justify-center shadow-md">
          <Plus size={14} className="text-white" />
        </div>
      </div>
      <div className="max-w-xs">
        <p className="text-lg font-semibold text-slate-700">
          {hasSearch ? 'Sin resultados' : 'No hay clientes'}
        </p>
        <p className="text-slate-400 text-sm mt-1.5">
          {hasSearch ? 'No se encontraron clientes con esa búsqueda.' : 'Aún no has registrado ningún cliente en el sistema.'}
        </p>
      </div>
      {!hasSearch && (
        <button onClick={onNew}
          className="cl-cta px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2">
          <Plus size={15} /> Nuevo Cliente
        </button>
      )}
    </div>
  )
}

function ConfirmDialog({ id, name, onConfirm, onCancel }) {
  return (
    <div className="cl-overlay fixed inset-0 bg-black/50 backdrop-blur-[3px] flex items-center justify-center z-[70] p-4" onClick={onCancel}>
      <div className="cl-confirm bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex gap-4 items-start">
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">¿Eliminar cliente?</h3>
              <p className="text-slate-500 text-sm mt-0.5">Se eliminará a <strong className="text-slate-700">{name}</strong> (ID: {id}).</p>
              <p className="text-slate-400 text-xs mt-1">Esta acción es permanente y no se puede deshacer.</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="cl-btn-danger px-4 py-2 text-sm font-semibold text-white rounded-xl">Sí, eliminar</button>
        </div>
      </div>
    </div>
  )
}

function FieldLabel({ children }) {
  return <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{children}</label>
}

const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all"
const selectCls = inputCls

function DrawerSection({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 pt-2 mb-1">
      {Icon && <Icon size={14} className="text-teal-500" />}
      <span className="text-[10px] font-bold tracking-[.14em] uppercase text-slate-400">{children}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

/** Slide-in drawer form */
function ClientDrawer({ editing, form, f, rows, onSubmit, onClose }) {
  const [saving, setSaving] = useState(false)
  const submit = async (e) => { e.preventDefault(); setSaving(true); await onSubmit(e); setSaving(false) }

  return (
    <>
      <div className="cl-overlay fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50" onClick={onClose} />
      <div className="cl-drawer fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="absolute top-0 left-0 right-0 h-[3px]"
               style={{ background: 'linear-gradient(90deg,#14b8a6,#0ea5e9)' }} />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[.14em] uppercase text-teal-600 mb-0.5">
                {editing ? 'Editar registro' : 'Nuevo registro'}
              </p>
              <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {editing ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Gestión de datos demográficos y de contacto.</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all mt-0.5">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            <DrawerSection icon={User}>Identificación y Perfil</DrawerSection>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>ID Cliente (auto)</FieldLabel>
                <input value={form.customerId || 'Generando…'} readOnly disabled
                  className="w-full px-3 py-2.5 border border-slate-100 rounded-xl bg-slate-50 text-slate-400 text-sm font-mono font-bold" />
              </div>
              <div>
                <FieldLabel>Tipo de Cliente</FieldLabel>
                <select value={form.tipoCliente} onChange={f('tipoCliente')} className={selectCls}>
                  <option value="Final">Final</option>
                  <option value="Revendedor">Revendedor</option>
                </select>
              </div>
              <div>
                <FieldLabel>Nombre *</FieldLabel>
                <input value={form.nombre} onChange={f('nombre')} required className={inputCls} />
              </div>
              <div>
                <FieldLabel>Apellido</FieldLabel>
                <input value={form.apellido} onChange={f('apellido')} className={inputCls} />
              </div>
              <div>
                <FieldLabel>Género</FieldLabel>
                <select value={form.genero} onChange={f('genero')} className={selectCls}>
                  <option value="">-- Seleccionar --</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
              <div>
                <FieldLabel>Referido por</FieldLabel>
                <select value={form.referido || ''} onChange={e => f('referido')(e.target.value)} className={selectCls}>
                  <option value="">-- Sin referido --</option>
                  {[...rows].sort((a, b) => Number(a.customerId) - Number(b.customerId)).map(r => (
                    <option key={r.customerId} value={r.customerId}>{r.customerId} — {r.nombre} {r.apellido}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <FieldLabel>Nombre Completo (auto)</FieldLabel>
                <input value={form.concatenar || ''} readOnly disabled
                  placeholder="Generado automáticamente"
                  className="w-full px-3 py-2.5 border border-slate-100 rounded-xl bg-slate-50 text-slate-500 text-sm" />
              </div>
            </div>

            <DrawerSection icon={MapPin}>Ubicación y Contacto</DrawerSection>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FieldLabel>País</FieldLabel>
                <input list="paises-list" value={form.pais || ''} onChange={f('pais')} placeholder="Seleccionar o escribir país..." className={inputCls} />
                <datalist id="paises-list">
                  {PAISES.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre} ({p.codigo})</option>)}
                </datalist>
              </div>
              <div>
                <FieldLabel>Ciudad</FieldLabel>
                <input value={form.ciudad || ''} onChange={f('ciudad')} placeholder="Ej: Bogotá" className={inputCls} />
              </div>
              <div>
                <FieldLabel>Móvil</FieldLabel>
                <input value={form.movil || ''} onChange={f('movil')} placeholder="Ej: +57 300 123 4567" className={inputCls} />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="cl-cta flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</> : editing ? 'Guardar cambios' : <><Plus size={15} />Crear cliente</>}
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
export default function ClientsPage() {
  const { showToast } = useUi()
  const { data: rows, setData: setRows, loading, error, reload: load } = useApiResource('/admin/clients/tabla-clientes')

  const [search, setSearch]     = useState('')
  const [sortCol, setSortCol]   = useState('customerId')
  const [sortDir, setSortDir]   = useState('desc')

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)

  const [explain, setExplain] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  /* ── Stats & Data ── */
  const stats = useMemo(() => ({
    total:        rows.length,
    finales:      rows.filter(r => r.tipoCliente === 'Final').length,
    revendedores: rows.filter(r => r.tipoCliente === 'Revendedor').length,
    paises:       new Set(rows.map(r => r.pais).filter(Boolean)).size,
  }), [rows])

  const filtered = useMemo(() => {
    let result = rows
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(r =>
        (r.customerId || '').toString().toLowerCase().includes(s) ||
        (r.nombre    || '').toLowerCase().includes(s) ||
        (r.apellido  || '').toLowerCase().includes(s) ||
        (r.pais      || '').toLowerCase().includes(s) ||
        (r.ciudad    || '').toLowerCase().includes(s) ||
        (r.referido  || '').toLowerCase().includes(s)
      )
    }
    return [...result].sort((a, b) => {
      let va = a[sortCol] ?? '', vb = b[sortCol] ?? ''
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va
      va = String(va).toLowerCase(); vb = String(vb).toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, search, sortCol, sortDir])

  /* ── Handlers ── */
  const handleSort = (key) => {
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(key); setSortDir('asc') }
  }

  const handleImport = async () => {
    if (!confirm('¿Re-importar todos los clientes desde el Excel? Los cambios manuales se conservan si el ID ya existe.')) return
    try {
      const { data } = await api.post('/admin/clients/tabla-clientes/import')
      showToast(data.message, 'success')
      load()
    } catch (e) { showToast(e.response?.data?.error || e.message, 'error') }
  }

  const openNew = async () => {
    setEditing(null); setForm(EMPTY); setShowForm(true)
    try {
      const { data } = await api.get('/admin/clients/tabla-clientes/next-id')
      setForm(prev => ({ ...prev, customerId: data.nextId }))
    } catch (e) { console.error(e) }
  }
  const openEdit = (r) => { setEditing(r); setForm({ ...r }); setShowForm(true) }

  const f = (field) => (e) => {
    const val = e?.target ? e.target.value : e
    setForm(prev => {
      const next = { ...prev, [field]: val }
      if (field === 'nombre' || field === 'apellido') {
        next.concatenar = `${next.nombre || ''}${next.apellido || ''}`
      }
      if (field === 'pais') {
        const pais = PAISES.find(p => p.nombre === val)
        if (pais) next.movil = pais.codigo + ' '
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.put(`/admin/clients/tabla-clientes/${editing.customerId}`, form)
        showToast('Cliente actualizado correctamente.', 'success')
      } else {
        await api.post('/admin/clients/tabla-clientes', form)
        showToast('Cliente creado correctamente.', 'success')
      }
      setShowForm(false); load()
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/admin/clients/tabla-clientes/${deleteTarget.customerId}`)
      setRows(prev => prev.filter(r => r.customerId !== deleteTarget.customerId))
      showToast('Cliente eliminado correctamente.', 'success')
    } catch (e) { showToast(e.response?.data?.error || e.message, 'error') }
    finally { setDeleteTarget(null) }
  }

  /* ── Render Cell ── */
  const renderCell = (row, key) => {
    const v = row[key]
    switch (key) {
      case 'customerId':
        return <span className="font-mono text-xs font-bold text-teal-700">{v}</span>
      case 'nombre':
      case 'apellido':
        return <span className="font-medium text-slate-700">{v || '—'}</span>
      case 'genero':
        return v ? (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold
            ${v === 'F' ? 'bg-pink-50 text-pink-700 ring-1 ring-pink-200' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'}`}>
            {v === 'F' ? 'Femenino' : 'Masculino'}
          </span>
        ) : <span className="text-slate-400">—</span>
      case 'tipoCliente':
        return v ? (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold
            ${v === 'Final' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}>
            {v}
          </span>
        ) : <span className="text-slate-400">—</span>
      case 'pais':
        return <span className="text-slate-600 flex items-center gap-1.5"><Globe size={13} className="text-slate-400" />{v || '—'}</span>
      case 'movil':
        return <span className="text-slate-600 flex items-center gap-1.5"><Phone size={13} className="text-slate-400" />{v || '—'}</span>
      default:
        return <span className="text-slate-600">{v || '—'}</span>
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

      <div className="space-y-6 pb-8">

        {/* ── HERO HEADER ── */}
        <div className="cl-a1 relative rounded-3xl overflow-hidden"
             style={{ background: 'linear-gradient(135deg,#064e3b 0%,#022c22 100%)' }}>
          <div className="cl-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.15] pointer-events-none"
               style={{ background: 'radial-gradient(circle,#14b8a6,transparent 70%)' }} />
          <div className="cl-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.10] pointer-events-none"
               style={{ background: 'radial-gradient(circle,#0ea5e9,transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[.03] pointer-events-none"
               style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

          <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/25 mb-4">
                <Users size={12} className="text-teal-400" />
                <span className="text-teal-400 text-xs font-semibold tracking-widest uppercase">Directorio</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight"
                  style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
                Clientes
              </h1>
              <p className="text-teal-100/70 text-sm mt-2">
                Base de suscriptores y clientes históricos IPTV
                {!loading && <span className="text-teal-400/50"> · {rows.length.toLocaleString()} registros</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleImport}
                className="cl-btn-ghost shrink-0 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white/80
                           flex items-center gap-2 transition-colors">
                <Upload size={15} /> Importar Excel
              </button>
              <button onClick={openNew}
                className="cl-cta shrink-0 px-5 py-3 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
                <Plus size={17} /> Nuevo Cliente
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Users}     label="Total Clientes"   value={stats.total.toLocaleString()}        loading={loading} gradFrom="#14b8a6" gradTo="#2dd4bf" delay={2} sub="Histórico completo"
            onClick={() => setExplain({
              title: 'Total Clientes', value: stats.total.toLocaleString(), icon: Users,
              queEs: 'Cuántos clientes hay registrados en la tabla de clientes.',
              comoSeCalcula: 'Conteo simple de las filas. Ojo: "Clientes Activos" en el Dashboard usa otra fuente.',
              origen: 'Tabla de clientes.',
            })} />
          <KpiCard icon={UserCheck} label="Clientes Finales" value={stats.finales.toLocaleString()}      loading={loading} gradFrom="#10b981" gradTo="#34d399" delay={3} sub="Usuarios directos"
            onClick={() => setExplain({
              title: 'Clientes Finales', value: stats.finales.toLocaleString(), icon: UserCheck,
              queEs: 'Clientes que consumen el servicio directamente (mayor margen).',
              comoSeCalcula: 'Registros con Tipo Cliente = Final.',
              origen: 'Tabla de clientes.',
            })} />
          <KpiCard icon={Repeat}    label="Revendedores"     value={stats.revendedores.toLocaleString()} loading={loading} gradFrom="#f59e0b" gradTo="#fbbf24" delay={4} sub="Canal de reventa"
            onClick={() => setExplain({
              title: 'Revendedores', value: stats.revendedores.toLocaleString(), icon: Repeat,
              queEs: 'Clientes que compran para revender a terceros.',
              comoSeCalcula: 'Registros con Tipo Cliente = Revendedor.',
              origen: 'Tabla de clientes.',
            })} />
          <KpiCard icon={Globe}     label="Países"           value={stats.paises.toLocaleString()}       loading={loading} gradFrom="#0ea5e9" gradTo="#38bdf8" delay={5} sub="Cobertura global"
            onClick={() => setExplain({
              title: 'Países', value: stats.paises.toLocaleString(), icon: Globe,
              queEs: 'En cuántos países distintos hay clientes registrados.',
              comoSeCalcula: 'Valores únicos del campo País.',
              origen: 'Tabla de clientes.',
            })} />
        </div>



        {/* ── SEARCH & TABLE ── */}
        <div className="cl-a5">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="search" placeholder="Buscar por ID, nombre, país, referido…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="cl-search w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200
                           bg-white text-sm text-slate-700 placeholder:text-slate-400 transition-shadow" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            {loading
              ? <SkeletonTable />
              : error
                ? (
                  <div className="py-16 text-center">
                    <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
                    <p className="text-red-500 text-sm">{error}</p>
                    <button onClick={load} className="mt-4 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Reintentar</button>
                  </div>
                )
                : filtered.length === 0
                  ? <EmptyState onNew={openNew} hasSearch={search.trim().length > 0} />
                  : (
                    <>
                      <div className="overflow-x-auto max-h-[36rem] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500 font-semibold sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                              {COLS.map(col => (
                                <th key={col.key} onClick={() => handleSort(col.key)}
                                  className="cl-th-sort px-4 py-3.5 cursor-pointer whitespace-nowrap">
                                  <div className="flex items-center gap-1">
                                    {col.label}
                                    <SortIcon colKey={col.key} sortCol={sortCol} sortDir={sortDir} />
                                  </div>
                                </th>
                              ))}
                              <th className="px-4 py-3.5 w-16 text-center sticky right-0 bg-slate-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filtered.map(row => (
                              <tr key={row.customerId} className="cl-row hover:bg-slate-50/50 group">
                                {COLS.map(col => (
                                  <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                                    {renderCell(row, col.key)}
                                  </td>
                                ))}
                                <td className="px-2 py-3 whitespace-nowrap text-center sticky right-0 bg-white shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)] z-10 group-hover:bg-slate-50/50 transition-colors">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => openEdit(row)}
                                      className="cl-action-btn w-7 h-7 rounded-lg flex items-center justify-center text-teal-600 hover:bg-teal-50" title="Editar">
                                      <Pencil size={13} />
                                    </button>
                                    <button onClick={() => setDeleteTarget(row)}
                                      className="cl-action-btn w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50" title="Eliminar">
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer tabla */}
                      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
                        <span className="text-xs text-slate-400">{filtered.length.toLocaleString()} de {rows.length.toLocaleString()} registros</span>
                        <span className="text-xs text-slate-400">Ordenado por <strong className="text-teal-600">{COLS.find(c => c.key === sortCol)?.label ?? sortCol}</strong> ({sortDir === 'asc' ? '↑ asc' : '↓ desc'})</span>
                      </div>
                    </>
                  )
            }
          </div>
        </div>

      </div>

      {/* ── DRAWER ── */}
      {showForm && (
        <ClientDrawer
          editing={editing} form={form} f={f} rows={rows}
          onSubmit={handleSubmit} onClose={() => setShowForm(false)}
        />
      )}

      {/* ── CONFIRM DELETE ── */}
      {deleteTarget && (
        <ConfirmDialog
          id={deleteTarget.customerId} name={`${deleteTarget.nombre || ''} ${deleteTarget.apellido || ''}`.trim()}
          onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
