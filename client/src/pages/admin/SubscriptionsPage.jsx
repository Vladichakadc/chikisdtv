import { useEffect, useState, useCallback } from 'react'
import { todayStr } from '../../utils/dateUtils'
import {
  Plus, Pencil, Trash2, X, CheckCircle2, Clock, XCircle,
  CalendarDays, Users, Layers, AlertTriangle
} from 'lucide-react'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatDate } from '../../utils/excelUtils'

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */
const EMPTY = {
  clientId: '',
  planId: '',
  fechaInicio: '',
  fechaVencimiento: '',
  estado: 'Activo',
  observaciones: ''
}

const ESTADO_CONFIG = {
  Activo:    { variant: 'success', icon: CheckCircle2, label: 'Activo',    color: 'text-emerald-600' },
  Vencido:   { variant: 'error',   icon: Clock,        label: 'Vencido',   color: 'text-red-500'     },
  Cancelado: { variant: 'neutral', icon: XCircle,      label: 'Cancelado', color: 'text-gray-500'    }
}

/* ─────────────────────────────────────────────────────────────
   Skeleton row (Huashu shimmer loader)
───────────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 rounded-full" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  )
}

/* ─────────────────────────────────────────────────────────────
   Stat Card
───────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, gradient, delay = 0 }) {
  return (
    <div
      className="relative bg-white rounded-2xl border border-slate-200 p-5 overflow-hidden
                 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]
                 transition-all duration-300 hover:-translate-y-0.5 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Top gradient bar */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${gradient} rounded-t-2xl`} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-800 leading-none tabular-nums">
            {value ?? <span className="inline-block h-8 w-12 bg-slate-200 rounded animate-pulse" />}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${gradient} bg-opacity-15 group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Confirm Delete Modal (replaces native confirm())
───────────────────────────────────────────────────────────── */
function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      style={{ animation: 'sub-fade-in 0.18s ease' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
        style={{ animation: 'sub-scale-in 0.22s ease' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-red-50 rounded-xl">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Eliminar suscripción</h3>
            <p className="text-sm text-slate-500 mt-0.5">Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm}>Sí, eliminar</Button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Form Modal
───────────────────────────────────────────────────────────── */
function SubscriptionFormModal({ editing, form, setForm, clients, plans, onSubmit, onClose }) {
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await onSubmit(e)
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      style={{ animation: 'sub-fade-in 0.2s ease' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ animation: 'sub-scale-in 0.25s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header with gradient accent */}
        <div className="relative px-6 py-4 border-b border-slate-100">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-500 to-amber-400 rounded-t-2xl" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-orange-500 mb-0.5">
                {editing ? 'Editar registro' : 'Nuevo registro'}
              </p>
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? 'Editar Suscripción' : 'Nueva Suscripción'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100
                         transition-all duration-200 active:scale-95"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Select
                label="Cliente *"
                value={form.clientId}
                onChange={e => setForm({ ...form, clientId: e.target.value })}
                required
              >
                <option value="">— Selecciona un cliente —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Select
                label="Plan *"
                value={form.planId}
                onChange={e => setForm({ ...form, planId: e.target.value })}
                required
              >
                <option value="">— Selecciona un plan —</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </Select>
            </div>
            <Input
              label="Fecha de inicio *"
              type="date"
              value={form.fechaInicio}
              onChange={e => setForm({ ...form, fechaInicio: e.target.value })}
              required
            />
            <Input
              label="Fecha de vencimiento"
              type="date"
              value={form.fechaVencimiento || ''}
              onChange={e => setForm({ ...form, fechaVencimiento: e.target.value })}
            />
            <Select
              label="Estado"
              value={form.estado}
              onChange={e => setForm({ ...form, estado: e.target.value })}
            >
              <option value="Activo">Activo</option>
              <option value="Vencido">Vencido</option>
              <option value="Cancelado">Cancelado</option>
            </Select>
            <div className="sm:col-span-2">
              <Textarea
                label="Observaciones"
                rows={2}
                value={form.observaciones || ''}
                onChange={e => setForm({ ...form, observaciones: e.target.value })}
              />
            </div>
          </div>

          {/* Modal footer */}
          <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="min-w-[120px]">
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Guardando…
                </span>
              ) : (
                editing ? 'Guardar cambios' : 'Crear suscripción'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Empty state
───────────────────────────────────────────────────────────── */
function EmptyState({ onNew }) {
  return (
    <div className="py-16 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50
                      flex items-center justify-center shadow-inner mb-1">
        <Layers size={32} className="text-orange-400" />
      </div>
      <div>
        <p className="font-semibold text-slate-700 text-lg">Sin suscripciones todavía</p>
        <p className="text-slate-400 text-sm mt-1">Agrega la primera para empezar a gestionar tu comunidad IPTV.</p>
      </div>
      <Button onClick={onNew} className="mt-2">
        <Plus size={16} /> Agregar suscripción
      </Button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────── */
export default function SubscriptionsPage() {
  const { showToast } = useUi()
  const [subs, setSubs]       = useState([])
  const [clients, setClients] = useState([])
  const [plans, setPlans]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState(null)
  const [form, setForm]               = useState(EMPTY)
  const [deleteTarget, setDeleteTarget] = useState(null)   // id to confirm delete

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, c, p] = await Promise.all([
        api.get('/admin/subscriptions'),
        api.get('/admin/clients'),
        api.get('/admin/plans')
      ])
      setSubs(s.data)
      setClients(c.data.filter(x => x.role === 'user'))
      setPlans(p.data.filter(x => x.activo))
    } catch {
      showToast('Error al cargar los datos.', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY, fechaInicio: todayStr() })
    setShowForm(true)
  }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ ...s, clientId: s.clientId, planId: s.planId })
    setShowForm(true)
  }

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
      setShowForm(false)
      load()
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/admin/subscriptions/${deleteTarget}`)
      showToast('Suscripción eliminada correctamente.', 'success')
      load()
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  /* ── Stats ── */
  const total    = subs.length
  const activos  = subs.filter(s => s.estado === 'Activo').length
  const vencidos = subs.filter(s => s.estado === 'Vencido').length
  const cancelados = subs.filter(s => s.estado === 'Cancelado').length

  /* ── Table columns ── */
  const columns = [
    {
      key: 'client',
      label: 'Cliente',
      render: r => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-300
                          flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
            {(r.client?.name || '?')[0].toUpperCase()}
          </div>
          <span className="font-medium text-slate-700 truncate">{r.client?.name || `#${r.clientId}`}</span>
        </div>
      )
    },
    {
      key: 'plan',
      label: 'Plan',
      render: r => (
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <Layers size={13} className="text-orange-400 shrink-0" />
          {r.plan?.nombre || `#${r.planId}`}
        </span>
      )
    },
    {
      key: 'fechaInicio',
      label: 'Inicio',
      render: r => (
        <span className="inline-flex items-center gap-1.5 text-slate-500 text-sm">
          <CalendarDays size={13} className="text-slate-400 shrink-0" />
          {formatDate(r.fechaInicio)}
        </span>
      )
    },
    {
      key: 'fechaVencimiento',
      label: 'Vence',
      render: r => (
        <span className="inline-flex items-center gap-1.5 text-slate-500 text-sm">
          <CalendarDays size={13} className="text-slate-400 shrink-0" />
          {r.fechaVencimiento ? formatDate(r.fechaVencimiento) : <span className="text-slate-300 italic">—</span>}
        </span>
      )
    },
    {
      key: 'estado',
      label: 'Estado',
      render: r => {
        const cfg = ESTADO_CONFIG[r.estado] || ESTADO_CONFIG.Cancelado
        const Icon = cfg.icon
        return (
          <Badge variant={cfg.variant} className="inline-flex items-center gap-1 py-1 px-2.5">
            <Icon size={11} />
            {r.estado}
          </Badge>
        )
      }
    },
    {
      key: 'actions',
      label: '',
      render: r => (
        <div className="flex items-center gap-1 justify-end">
          <button
            id={`edit-sub-${r.id}`}
            onClick={() => openEdit(r)}
            title="Editar suscripción"
            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50
                       transition-all duration-200 active:scale-90"
          >
            <Pencil size={15} />
          </button>
          <button
            id={`delete-sub-${r.id}`}
            onClick={() => setDeleteTarget(r.id)}
            title="Eliminar suscripción"
            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50
                       transition-all duration-200 active:scale-90"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )
    }
  ]

  return (
    <>
      {/* ── Page animations ── */}
      <style>{`
        @keyframes sub-fade-in  { from { opacity:0 } to { opacity:1 } }
        @keyframes sub-scale-in { from { opacity:0; transform:scale(0.96) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes sub-slide-up { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        .sub-animate { animation: sub-slide-up 0.4s ease both; }
        @media (prefers-reduced-motion: reduce) {
          .sub-animate, [style*="animation"] { animation: none !important; }
        }
      `}</style>

      <div className="space-y-6">

        {/* ── Page header ── */}
        <div className="sub-animate flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-orange-500 mb-0.5">Gestión</p>
            <h1 className="text-3xl font-bold text-slate-800 leading-tight">Suscripciones</h1>
            <p className="text-slate-400 text-sm mt-1">Administra las suscripciones IPTV de tus clientes.</p>
          </div>
          <Button
            id="new-subscription-btn"
            onClick={openNew}
            className="shrink-0 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600
                       hover:to-amber-500 shadow-[0_4px_14px_rgba(249,115,22,0.35)]
                       hover:shadow-[0_6px_20px_rgba(249,115,22,0.45)] hover:-translate-y-0.5
                       transition-all duration-200"
          >
            <Plus size={17} />
            Nueva suscripción
          </Button>
        </div>

        {/* ── Stat cards ── */}
        <div
          className="sub-animate grid grid-cols-2 lg:grid-cols-4 gap-4"
          style={{ animationDelay: '60ms' }}
        >
          <StatCard
            icon={Users}
            label="Total"
            value={loading ? null : total}
            gradient="bg-gradient-to-r from-slate-600 to-slate-500"
            delay={0}
          />
          <StatCard
            icon={CheckCircle2}
            label="Activas"
            value={loading ? null : activos}
            gradient="bg-gradient-to-r from-emerald-500 to-teal-400"
            delay={60}
          />
          <StatCard
            icon={Clock}
            label="Vencidas"
            value={loading ? null : vencidos}
            gradient="bg-gradient-to-r from-red-500 to-rose-400"
            delay={120}
          />
          <StatCard
            icon={XCircle}
            label="Canceladas"
            value={loading ? null : cancelados}
            gradient="bg-gradient-to-r from-slate-400 to-gray-300"
            delay={180}
          />
        </div>

        {/* ── Data table ── */}
        <div
          className="sub-animate"
          style={{ animationDelay: '120ms' }}
        >
          <Card className="overflow-hidden border-slate-200/80">
            {loading ? (
              <div className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {['Cliente', 'Plan', 'Inicio', 'Vence', 'Estado', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                  </tbody>
                </table>
              </div>
            ) : subs.length === 0 ? (
              <EmptyState onNew={openNew} />
            ) : (
              <CardBody className="p-0">
                <DataTable
                  columns={columns}
                  data={subs}
                  defaultSortKey="fechaVencimiento"
                  defaultSortDir="desc"
                />
              </CardBody>
            )}
          </Card>
        </div>
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <SubscriptionFormModal
          editing={editing}
          form={form}
          setForm={setForm}
          clients={clients}
          plans={plans}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* ── Confirm Delete Modal ── */}
      {deleteTarget && (
        <ConfirmModal
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
