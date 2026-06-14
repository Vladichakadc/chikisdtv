import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Search, Tv, CheckCircle, XCircle } from 'lucide-react'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'

// ─── KPI Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, variant }) {
  const styles = {
    solid:   'bg-gradient-to-br from-orange-500 to-orange-600 text-white',
    light:   'bg-white border-2 border-orange-200 text-orange-700',
    outline: 'bg-orange-50 border border-orange-300 text-orange-800',
  }
  const iconBg = {
    solid:   'bg-white/20',
    light:   'bg-orange-100',
    outline: 'bg-orange-200/60',
  }
  return (
    <div className={`${styles[variant]} rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${variant === 'solid' ? 'opacity-90' : ''}`}>{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sub && <p className={`text-xs mt-1 ${variant === 'solid' ? 'opacity-75' : 'text-orange-500'}`}>{sub}</p>}
        </div>
        <div className={`${iconBg[variant]} rounded-lg p-3`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  )
}

const EMPTY = { clientId: '', subscriptionId: '', nombre: '', tipo: 'Smart TV', mac: '', activo: true, observaciones: '' }

export default function DevicesPage() {
  const { showToast } = useUi()
  const [devices, setDevices] = useState([])
  const [clients, setClients] = useState([])
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterActivo, setFilterActivo] = useState('todos')
  const [search, setSearch] = useState('')

  const stats = useMemo(() => {
    const total = devices.length
    const activos = devices.filter(d => d.activo).length
    const inactivos = devices.filter(d => !d.activo).length
    const firetv = devices.filter(d => (d.tipo || '').toLowerCase().includes('smart tv') || (d.tipo || '').toLowerCase().includes('fire')).length
    return { total, activos, inactivos, firetv }
  }, [devices])

  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      if (filterTipo !== 'todos' && d.tipo !== filterTipo) return false;
      if (filterActivo !== 'todos' && String(d.activo) !== filterActivo) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!((d.nombre || '').toLowerCase().includes(s) || (d.mac || '').toLowerCase().includes(s) || (d.client?.name || '').toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [devices, filterTipo, filterActivo, search])

  const load = async () => {
    setLoading(true)
    const [d, c, s] = await Promise.all([
      api.get('/admin/devices'),
      api.get('/admin/clients'),
      api.get('/admin/subscriptions')
    ])
    setDevices(d.data)
    setClients(c.data.filter((x) => x.role === 'user'))
    setSubs(s.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = (d) => { setEditing(d); setForm({ ...d, subscriptionId: d.subscriptionId || '' }); setShowForm(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      clientId: Number(form.clientId),
      subscriptionId: form.subscriptionId ? Number(form.subscriptionId) : null
    }
    try {
      if (editing) {
        await api.put(`/admin/devices/${editing.id}`, payload)
        showToast('Dispositivo actualizado correctamente.', 'success')
      } else {
        await api.post('/admin/devices', payload)
        showToast('Dispositivo creado correctamente.', 'success')
      }
      setShowForm(false)
      load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este dispositivo?')) return
    try {
      await api.delete(`/admin/devices/${id}`)
      showToast('Dispositivo eliminado correctamente.', 'success')
      load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const clientSubs = subs.filter((s) => s.clientId === Number(form.clientId))

  const columns = [
    { key: 'client', label: 'Cliente', render: (r) => r.client?.name || `#${r.clientId}` },
    { key: 'nombre', label: 'Dispositivo' },
    { key: 'tipo', label: 'Tipo', render: (r) => <Badge variant="info">{r.tipo}</Badge> },
    { key: 'mac', label: 'MAC' },
    { key: 'plan', label: 'Plan', render: (r) => r.subscription?.plan?.nombre || '—' },
    { key: 'activo', label: 'Estado', render: (r) => <Badge variant={r.activo ? 'success' : 'neutral'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge> },
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
          <h1 className="text-3xl font-bold text-brand-accent">Inventario Equipos</h1>
          <p className="text-gray-500">Gestión de dispositivos físicos por cliente</p>
        </div>
        <Button onClick={openNew}><Plus size={18} /> Nuevo Dispositivo</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Tv} label="Total Equipos" value={stats.total} variant="solid" sub="Registrados en inventario" />
        <StatCard icon={CheckCircle} label="Equipos Activos" value={stats.activos} variant="light" sub="En funcionamiento" />
        <StatCard icon={XCircle} label="Equipos Inactivos" value={stats.inactivos} variant="outline" sub="Desactivados / Baja" />
        <StatCard icon={Tv} label="Smart TV / TV Box" value={stats.firetv} variant="light" sub="Dispositivos principales" />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, dispositivo o MAC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
          />
        </div>
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        >
          <option value="todos">Todos los tipos</option>
          <option value="Smart TV">Smart TV</option>
          <option value="PC">PC</option>
          <option value="Celular">Celular</option>
          <option value="Tablet">Tablet</option>
          <option value="Otro">Otro</option>
        </select>
        <select
          value={filterActivo}
          onChange={(e) => setFilterActivo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        >
          <option value="todos">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3" />
              <p className="text-gray-500">Cargando dispositivos…</p>
            </div>
          ) : <DataTable columns={columns} data={filteredDevices} defaultSortKey="id" defaultSortDir="desc" />}
        </CardBody>
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>{editing ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}</CardTitle>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Select label="Cliente *" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, subscriptionId: '' })} required>
                    <option value="">— Selecciona —</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Select label="Suscripción (opcional)" value={form.subscriptionId || ''} onChange={(e) => setForm({ ...form, subscriptionId: e.target.value })}>
                    <option value="">— Sin asignar —</option>
                    {clientSubs.map((s) => <option key={s.id} value={s.id}>{s.plan?.nombre}</option>)}
                  </Select>
                </div>
                <Input label="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="TV Sala" />
                <Select label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  <option value="Smart TV">Smart TV</option>
                  <option value="PC">PC</option>
                  <option value="Celular">Celular</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Otro">Otro</option>
                </Select>
                <Input label="MAC / ID dispositivo" value={form.mac || ''} onChange={(e) => setForm({ ...form, mac: e.target.value })} />
                <Select label="Activo" value={form.activo ? 'true' : 'false'} onChange={(e) => setForm({ ...form, activo: e.target.value === 'true' })}>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
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
