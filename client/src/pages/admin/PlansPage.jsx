import { useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import api from '../../config/api'
import { useApiResource } from '../../hooks/useApiResource'
import { useUi } from '../../context/UiContext'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatCurrency } from '../../utils/excelUtils'

const EMPTY = { nombre: '', precio: 0, duracionDias: 30, numeroPantallas: 1, descripcion: '', activo: true }

export default function PlansPage() {
  const { showToast } = useUi()
  const { data: plans, loading, reload: load } = useApiResource('/admin/plans')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = (p) => { setEditing(p); setForm(p); setShowForm(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, precio: Number(form.precio), duracionDias: Number(form.duracionDias), numeroPantallas: Number(form.numeroPantallas) }
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

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este plan?')) return
    try {
      await api.delete(`/admin/plans/${id}`)
      showToast('Plan eliminado correctamente.', 'success')
      load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const columns = [
    { key: 'nombre', label: 'Nombre del Plan' },
    { key: 'precio', label: 'Precio' , render: (r) => formatCurrency(r.precio) },
    { key: 'duracionDias', label: 'Duración (días)', render: (r) => `${Math.round(r.duracionDias)} días` },
    { key: 'numeroPantallas', label: 'N° Pantallas' },
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
          <h1 className="text-3xl font-bold text-brand-accent">Planes</h1>
          <p className="text-gray-500">Catálogo de planes IPTV</p>
        </div>
        <Button onClick={openNew}><Plus size={18} /> Nuevo Plan</Button>
      </div>

      <Card className="overflow-hidden">
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3" />
              <p className="text-gray-500">Cargando planes…</p>
            </div>
          ) : <DataTable columns={columns} data={plans} defaultSortKey="id" defaultSortDir="desc" />}
        </CardBody>
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>{editing ? 'Editar Plan' : 'Nuevo Plan'}</CardTitle>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input label="Nombre del plan *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <CurrencyInput label="Precio *" decimals={0} value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
                <Input label="Duración (días) *" type="number" min="1" value={form.duracionDias} onChange={(e) => setForm({ ...form, duracionDias: e.target.value })} required />
                <Input label="N° Pantallas" type="number" min="1" value={form.numeroPantallas} onChange={(e) => setForm({ ...form, numeroPantallas: e.target.value })} />
                <Select label="Activo" value={form.activo ? 'true' : 'false'} onChange={(e) => setForm({ ...form, activo: e.target.value === 'true' })}>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </Select>
                <div className="sm:col-span-2">
                  <Textarea label="Descripción" rows={3} value={form.descripcion || ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
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
