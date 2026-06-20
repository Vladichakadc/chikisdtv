import { useEffect, useState } from 'react'
import { todayStr } from '../../utils/dateUtils'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatDate } from '../../utils/excelUtils'

const EMPTY = { clientId: '', planId: '', fechaInicio: '', fechaVencimiento: '', estado: 'Activo', observaciones: '' }

export default function SubscriptionsPage() {
  const { showToast } = useUi()
  const [subs, setSubs] = useState([])
  const [clients, setClients] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const load = async () => {
    setLoading(true)
    const [s, c, p] = await Promise.all([
      api.get('/admin/subscriptions'),
      api.get('/admin/clients'),
      api.get('/admin/plans')
    ])
    setSubs(s.data)
    setClients(c.data.filter((x) => x.role === 'user'))
    setPlans(p.data.filter((x) => x.activo))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm({ ...EMPTY, fechaInicio: todayStr() }); setShowForm(true) }
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
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta suscripción?')) return
    try {
      await api.delete(`/admin/subscriptions/${id}`)
      showToast('Suscripción eliminada correctamente.', 'success')
      load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const columns = [
    { key: 'client', label: 'Cliente', render: (r) => r.client?.name || `#${r.clientId}` },
    { key: 'plan', label: 'Plan', render: (r) => r.plan?.nombre || `#${r.planId}` },
    { key: 'fechaInicio', label: 'Inicio', render: (r) => formatDate(r.fechaInicio) },
    { key: 'fechaVencimiento', label: 'Vence', render: (r) => formatDate(r.fechaVencimiento) },
    {
      key: 'estado', label: 'Estado', render: (r) => (
        <Badge variant={r.estado === 'Activo' ? 'success' : r.estado === 'Vencido' ? 'error' : 'neutral'}>{r.estado}</Badge>
      )
    },
    {
      key: 'actions', label: 'Acciones', render: (r) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(r)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Pencil size={16} /></button>
          <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
        </div>
      )
    }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-accent">Suscripciones</h1>
          <p className="text-gray-500">Gestión de suscripciones IPTV</p>
        </div>
        <Button onClick={openNew}><Plus size={18} /> Nueva Suscripción</Button>
      </div>

      <Card className="overflow-hidden">
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3" />
              <p className="text-gray-500">Cargando suscripciones…</p>
            </div>
          ) : <DataTable columns={columns} data={subs} defaultSortKey="fechaVencimiento" defaultSortDir="desc" />}
        </CardBody>
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>{editing ? 'Editar Suscripción' : 'Nueva Suscripción'}</CardTitle>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Select label="Cliente *" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
                    <option value="">— Selecciona —</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Select label="Plan *" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })} required>
                    <option value="">— Selecciona —</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </Select>
                </div>
                <Input label="Fecha inicio *" type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} required />
                <Input label="Fecha vencimiento" type="date" value={form.fechaVencimiento || ''} onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })} />
                <Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  <option value="Activo">Activo</option>
                  <option value="Vencido">Vencido</option>
                  <option value="Cancelado">Cancelado</option>
                </Select>
                <div className="sm:col-span-2">
                  <Textarea label="Observaciones" rows={2} value={form.observaciones || ''} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
                </div>
              </CardBody>
              <div className="p-4 border-t border-ui-border flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit">{editing ? 'Actualizar' : 'Crear'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
