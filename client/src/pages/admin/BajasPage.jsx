import { useState, useMemo, useEffect } from 'react'
import { useUi } from '../../context/UiContext'
import { Plus, Pencil, Trash2, X, Search, UserX, Tv, ArrowDownCircle, BarChart3, Calendar, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts'
import { ChartInsight, narrarBajasPorAnio, LABEL_STYLE } from './dashboard/biShared'
import api from '../../config/api'
import { useApiResource } from '../../hooks/useApiResource'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { formatDate } from '../../utils/excelUtils'
import { todayStr } from '../../utils/dateUtils'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const EMPTY = {
  idBaja: '', customerId: '', nombre: '', apellido: '', sku: '',
  tipoFire: '', devolucion: 'NO', nickname: '', estado: 'Desactivado', cortesia: 'NO',
  pantallas: 1, fechaBaja: '', fecha: '',
  anio: new Date().getFullYear(), mes: MESES[new Date().getMonth()], itemQuantity: 1,
  tipoPlan: '', tipoPantalla: '', cuentaDedicada: '', motivo: '', observaciones: ''
}

// Tarjeta KPI — colores corporativos naranja/blanco
function StatCard({ icon: Icon, label, value, sub, variant }) {
  const styles = {
    solid: 'bg-gradient-to-br from-orange-500 to-orange-600 text-white',
    light: 'bg-white border-2 border-orange-200 text-orange-700',
    outline: 'bg-orange-50 border border-orange-300 text-orange-800',
  }
  const iconBg = {
    solid: 'bg-white/20',
    light: 'bg-orange-100',
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

// Columnas de la tabla
const TABLE_COLUMNS = [
  { key: 'idBaja', label: 'ID Baja' },
  { key: 'customerId', label: 'ID Cliente' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'apellido', label: 'Apellido' },
  { key: 'sku', label: 'SKU' },
  { key: 'tipoFire', label: 'Tipo Fire' },
  { key: 'devolucion', label: 'Devolución' },
  { key: 'nickname', label: 'Nickname' },
  { key: 'estado', label: 'Estado' },
  { key: 'cortesia', label: 'Cortesía' },
  { key: 'pantallas', label: 'Pantallas' },
  { key: 'fechaBaja', label: 'Fecha Baja' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'anio', label: 'Año' },
  { key: 'mes', label: 'Mes' },
  { key: 'itemQuantity', label: 'Cantidad' },
  { key: 'tipoPlan', label: 'Tipo Plan' },
  { key: 'tipoPantalla', label: 'Tipo Pantalla' },
  { key: 'cuentaDedicada', label: 'Cta. Dedicada' },
]

// Icono de orden
function SortIcon({ sortKey, sortCol, sortDir }) {
  if (sortCol !== sortKey) return <ChevronsUpDown size={14} className="opacity-40" />
  return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
}

export default function BajasPage() {
  const { showToast } = useUi()
  const { data: bajas, loading, reload: load } = useApiResource('/admin/bajas')
  const [bajasPorAnio, setBajasPorAnio] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('fechaBaja')
  const [sortDir, setSortDir] = useState('desc')
  const [nicknames, setNicknames] = useState([])
  const [nicknameEditMode, setNicknameEditMode] = useState(false)

  // Comparativo año a año (agregado del dashboard-bi, movido desde el Dashboard)
  useEffect(() => {
    api.get('/admin/dashboard-bi')
      .then(r => setBajasPorAnio(r.data.bajasPorAnioDetalle || []))
      .catch(() => {})
  }, [])

  const openNew = async () => {
    setEditing(null)
    setForm(EMPTY)
    setNicknameEditMode(false)
    setShowForm(true)
    // Auto-generar ID
    try {
      const { data } = await api.get('/admin/bajas/next-id')
      setForm(f => ({ ...f, idBaja: data.nextId, fechaBaja: todayStr() }))
    } catch (e) { console.error(e) }
    // Cargar nicknames
    try {
      const { data } = await api.get('/admin/bajas/nicknames')
      setNicknames(data)
    } catch (e) { console.error(e) }
  }
  const openEdit = (b) => { setEditing(b); setForm({ ...b }); setNicknameEditMode(false); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setNicknameEditMode(false) }

  const handleNicknameSelect = (nick) => {
    if (!nick) { setForm(f => ({ ...f, nickname: '' })); return }
    const match = nicknames.find(n => n.nickname === nick)
    if (match) {
      setForm(f => ({
        ...f,
        nickname: nick,
        customerId: match.customerId || f.customerId,
        nombre: match.nombre || f.nombre,
        apellido: match.apellido || f.apellido,
        pantallas: match.pantallas || f.pantallas,
        fecha: match.fechaInicio || f.fecha,
        sku: match.sku || f.sku,
        tipoFire: match.tipoFire || f.tipoFire,
        tipoPlan: match.tipoPlan || f.tipoPlan,
        tipoPantalla: match.tipoPantalla || f.tipoPantalla,
        cuentaDedicada: match.cuentaDedicada || f.cuentaDedicada,
        cortesia: match.cortesia || f.cortesia,
        devolucion: match.devolucion || f.devolucion,
      }))
    } else {
      setForm(f => ({ ...f, nickname: nick }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.put(`/admin/bajas/${editing.id}`, form)
        showToast('Baja actualizada correctamente.', 'success')
      } else {
        await api.post('/admin/bajas', form)
        showToast('Baja registrada correctamente.', 'success')
      }
      closeForm()
      load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta baja?')) return
    try {
      await api.delete(`/admin/bajas/${id}`)
      showToast('Baja eliminada correctamente.', 'success')
      load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const handleSort = (key) => {
    if (sortCol === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(key)
      setSortDir('asc')
    }
  }

  // KPIs
  const stats = useMemo(() => {
    const total = bajas.length
    const devueltos = bajas.filter(b => b.devolucion === 'SI').length
    const cortesias = bajas.filter(b => b.cortesia === 'SI').length
    const meses = {}
    bajas.forEach(b => { if (b.mes) meses[b.mes] = (meses[b.mes] || 0) + 1 })
    const mesMasAlto = Object.entries(meses).sort((a, b) => b[1] - a[1])[0]
    const anioActual = bajas.filter(b => b.anio === 2026).length
    return { total, devueltos, cortesias, mesMasAlto, anioActual }
  }, [bajas])

  // Filtrar
  const filtered = useMemo(() => {
    let result = bajas
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(b =>
        (b.idBaja || '').toLowerCase().includes(s) ||
        (b.customerId || '').toLowerCase().includes(s) ||
        (b.nombre || '').toLowerCase().includes(s) ||
        (b.apellido || '').toLowerCase().includes(s) ||
        (b.nickname || '').toLowerCase().includes(s) ||
        (b.sku || '').toLowerCase().includes(s)
      )
    }
    // Ordenar
    result = [...result].sort((a, b) => {
      let va = a[sortCol] ?? ''
      let vb = b[sortCol] ?? ''
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va
      }
      va = String(va).toLowerCase()
      vb = String(vb).toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [bajas, search, sortCol, sortDir])

  // Render celda
  const renderCell = (b, col) => {
    switch (col.key) {
      case 'idBaja': return <span className="font-mono text-xs font-bold text-orange-700">{b.idBaja}</span>
      case 'nombre': return <span className="font-medium">{b.nombre}</span>
      case 'sku': return <span className="font-mono text-xs">{b.sku}</span>
      case 'devolucion': return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${b.devolucion === 'SI' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {b.devolucion || '—'}
        </span>
      )
      case 'estado': return (
        <Badge variant={b.estado === 'Desactivado' || b.estado === 'Baja' ? 'danger' : b.estado === 'Activo' ? 'success' : 'warning'}>
          {b.estado}
        </Badge>
      )
      case 'cortesia': return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${b.cortesia === 'SI' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
          {b.cortesia || '—'}
        </span>
      )
      case 'cuentaDedicada': return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${b.cuentaDedicada === 'SI' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
          {b.cuentaDedicada || '—'}
        </span>
      )
      case 'pantallas':
      case 'itemQuantity':
      case 'anio':
      case 'customerId':
        return <span className="text-center block">{b[col.key]}</span>
      case 'fechaBaja':
      case 'fecha':
        return <span className="text-gray-600">{b[col.key] ? formatDate(b[col.key]) : '—'}</span>
      default: return b[col.key] || '—'
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-accent">Bajas</h1>
          <p className="text-gray-500">Registro de cancelaciones y bajas de servicio</p>
        </div>
        <Button onClick={openNew}><Plus size={18} /> Nueva Baja</Button>
      </div>

      {/* KPI Cards — naranja corporativo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={UserX} label="Total Bajas" value={stats.total} variant="solid" sub="Histórico completo" />
        <StatCard icon={Calendar} label="Bajas 2026" value={stats.anioActual} variant="light" sub="Año en curso" />
        <StatCard icon={ArrowDownCircle} label="Devueltos" value={stats.devueltos} variant="outline" sub={`${stats.total ? Math.round(stats.devueltos/stats.total*100) : 0}% del total`} />
        <StatCard icon={Tv} label="Cortesías" value={stats.cortesias} variant="light" sub="Servicio gratuito" />
        <StatCard icon={BarChart3} label="Mes pico" value={stats.mesMasAlto ? stats.mesMasAlto[0] : '—'} variant="solid" sub={stats.mesMasAlto ? `${stats.mesMasAlto[1]} bajas` : ''} />
      </div>

      {/* Comparativo año a año (movido desde el Dashboard) */}
      {bajasPorAnio.length > 0 && (
        <Card className="border-orange-100 mb-6">
          <CardHeader className="border-orange-50">
            <CardTitle>Bajas — comparativo año a año</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Cancelaciones registradas por año — la otra cara de la moneda del crecimiento de la cartera</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={bajasPorAnio} margin={{ top: 22, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                <XAxis dataKey="anio" tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v, name) => [v, name === 'total' ? 'Bajas' : name]}
                  labelFormatter={(v, payload) => {
                    const d = payload?.[0]?.payload
                    return d?.variacionPct != null ? `Año ${v} · ${d.variacionPct >= 0 ? '+' : ''}${d.variacionPct}% vs. año anterior` : `Año ${v}`
                  }}
                />
                <Bar dataKey="total" name="Bajas" radius={[6, 6, 0, 0]} barSize={36}>
                  {bajasPorAnio.map((_, i) => <Cell key={i} fill="#f43f5e" />)}
                  <LabelList dataKey="total" position="top" formatter={(v) => v.toLocaleString('es-CO')} style={{ ...LABEL_STYLE, fontSize: 12 }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={narrarBajasPorAnio(bajasPorAnio)} />
          </CardBody>
        </Card>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ID, nombre, nickname, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-orange-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-lg border-orange-100 overflow-hidden">
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3"></div>
              <p className="text-gray-500">Cargando bajas...</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-gray-400">No se encontraron registros</p>
          ) : (
            <div className="overflow-auto max-h-[34rem] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-200 hover:[&::-webkit-scrollbar-thumb]:bg-orange-300">
              <table className="w-full text-base border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-white">
                    {TABLE_COLUMNS.map(col => (
                      <th
                        key={col.key}
                        scope="col"
                        onClick={() => handleSort(col.key)}
                        className="sticky top-0 z-10 bg-orange-600 px-3 py-3 font-semibold whitespace-nowrap cursor-pointer hover:bg-orange-700 transition-colors select-none shadow-[0_1px_0_0_rgba(0,0,0,0.08)]"
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          <SortIcon sortKey={col.key} sortCol={sortCol} sortDir={sortDir} />
                        </div>
                      </th>
                    ))}
                    <th className="sticky top-0 right-0 z-20 bg-orange-600 px-3 py-3 font-semibold whitespace-nowrap text-center shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b, i) => (
                    <tr key={b.id} className={`border-b border-orange-50 hover:bg-orange-50/70 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}`}>
                      {TABLE_COLUMNS.map(col => (
                        <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">{renderCell(b, col)}</td>
                      ))}
                      <td className="px-3 py-2.5 whitespace-nowrap text-center sticky right-0 z-10 bg-white shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => openEdit(b)} className="text-orange-600 hover:bg-orange-100 p-2 rounded-lg transition-colors"><Pencil size={20} /></button>
                          <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors"><Trash2 size={20} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
        <div className="flex items-center justify-between border-t border-orange-100 bg-orange-50/40 px-4 py-2 text-xs text-gray-500">
          <span>{filtered.length} de {bajas.length} registros</span>
          <span>Ordenado por <strong className="text-brand-accent">{TABLE_COLUMNS.find(c => c.key === sortCol)?.label}</strong> ({sortDir === 'asc' ? '↑ ascendente' : '↓ descendente'})</span>
        </div>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto shadow-2xl">
            <CardHeader className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-xl">
              <CardTitle className="text-white">{editing ? 'Editar Baja' : 'Nueva Baja'}</CardTitle>
              <button onClick={closeForm} className="hover:bg-white/20 p-1 rounded"><X size={20} /></button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardBody className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-3 lg:col-span-4 text-sm font-semibold text-orange-700 border-b border-orange-200 pb-1">📋 Identificación</div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Baja (Auto)</label>
                  <input value={form.idBaja || 'Generando...'} readOnly disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 font-mono font-bold cursor-not-allowed" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Nickname *</label>
                    {editing && (
                      <button
                        type="button"
                        onClick={() => setNicknameEditMode(m => !m)}
                        className="text-orange-600 hover:text-orange-700 text-xs font-semibold flex items-center gap-1"
                        title={nicknameEditMode ? 'Volver a la lista de cuentas activas' : 'Editar nickname manualmente'}
                      >
                        <Pencil size={12} /> {nicknameEditMode ? 'Usar lista' : 'Editar nickname'}
                      </button>
                    )}
                  </div>
                  {nicknameEditMode ? (
                    <input
                      value={form.nickname || ''}
                      onChange={(e) => setForm(f => ({ ...f, nickname: e.target.value }))}
                      className="w-full px-3 py-2 border border-orange-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                      required
                    />
                  ) : (
                    <>
                      <select
                        value={form.nickname || ''}
                        onChange={(e) => handleNicknameSelect(e.target.value)}
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                        required
                      >
                        <option value="">-- Seleccionar nickname --</option>
                        {form.nickname && !nicknames.some(n => n.nickname === form.nickname) && (
                          <option value={form.nickname}>{form.nickname}</option>
                        )}
                        {nicknames.map(n => (
                          <option key={n.nickname} value={n.nickname}>
                            {n.nickname}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400 mt-0.5">Al seleccionar se llenan los campos asociados</p>
                    </>
                  )}
                </div>
                <Input label="ID Cliente" value={form.customerId || ''} onChange={(e) => setForm({ ...form, customerId: e.target.value })} />
                <Input label="Nombre *" value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />

                <div className="sm:col-span-3 lg:col-span-4 text-sm font-semibold text-orange-700 border-b border-orange-200 pb-1 mt-2">📺 Dispositivo</div>
                <Input label="Apellido" value={form.apellido || ''} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
                <Input label="SKU" value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                <Input label="Tipo Fire TV" value={form.tipoFire || ''} onChange={(e) => setForm({ ...form, tipoFire: e.target.value })} />
                <Select label="Devolución" value={form.devolucion || ''} onChange={(e) => setForm({ ...form, devolucion: e.target.value })}>
                  <option value="">--</option>
                  <option value="SI">SI</option>
                  <option value="NO">NO</option>
                </Select>

                <div className="sm:col-span-3 lg:col-span-4 text-sm font-semibold text-orange-700 border-b border-orange-200 pb-1 mt-2">⚙️ Estado y Plan</div>
                <Select label="Estado" value={form.estado || 'Desactivado'} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  <option value="Desactivado">Desactivado</option>
                  <option value="Baja">Baja</option>
                  <option value="Activo">Activo</option>
                  <option value="Cortesía">Cortesía</option>
                </Select>
                <Select label="Cortesía" value={form.cortesia || ''} onChange={(e) => setForm({ ...form, cortesia: e.target.value })}>
                  <option value="">--</option>
                  <option value="SI">SI</option>
                  <option value="NO">NO</option>
                </Select>
                <Input label="Pantallas" type="number" value={form.pantallas || 1} onChange={(e) => setForm({ ...form, pantallas: e.target.value })} min="1" />
                <Input label="Cantidad" type="number" value={form.itemQuantity || 1} onChange={(e) => setForm({ ...form, itemQuantity: e.target.value })} min="1" />
                <Input label="Tipo de Plan" value={form.tipoPlan || ''} onChange={(e) => setForm({ ...form, tipoPlan: e.target.value })} placeholder="Plan Mensual, Semestral..." />
                <Input label="Tipo Pantalla" value={form.tipoPantalla || ''} onChange={(e) => setForm({ ...form, tipoPantalla: e.target.value })} placeholder="Individual, Revendedor..." />
                <Select label="Cuenta Dedicada" value={form.cuentaDedicada || ''} onChange={(e) => setForm({ ...form, cuentaDedicada: e.target.value })}>
                  <option value="">--</option>
                  <option value="SI">SI</option>
                  <option value="NO">NO</option>
                </Select>

                <div className="sm:col-span-3 lg:col-span-4 text-sm font-semibold text-orange-700 border-b border-orange-200 pb-1 mt-2">📅 Fechas</div>
                <Input label="Fecha de Baja" type="date" value={form.fechaBaja || ''} onChange={(e) => setForm({ ...form, fechaBaja: e.target.value })} />
                <Input label="Fecha" type="date" value={form.fecha || ''} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                <Input label="Año" type="number" value={form.anio || ''} onChange={(e) => setForm({ ...form, anio: e.target.value })} />
                <Select label="Mes" value={form.mes || ''} onChange={(e) => setForm({ ...form, mes: e.target.value })}>
                  <option value="">-- Seleccionar mes --</option>
                  <option value="Enero">Enero</option>
                  <option value="Febrero">Febrero</option>
                  <option value="Marzo">Marzo</option>
                  <option value="Abril">Abril</option>
                  <option value="Mayo">Mayo</option>
                  <option value="Junio">Junio</option>
                  <option value="Julio">Julio</option>
                  <option value="Agosto">Agosto</option>
                  <option value="Septiembre">Septiembre</option>
                  <option value="Octubre">Octubre</option>
                  <option value="Noviembre">Noviembre</option>
                  <option value="Diciembre">Diciembre</option>
                </Select>

                <div className="sm:col-span-3 lg:col-span-4 text-sm font-semibold text-orange-700 border-b border-orange-200 pb-1 mt-2">📝 Notas</div>
                <div className="sm:col-span-2">
                  <Select label="Motivo de la baja" value={form.motivo || ''} onChange={(e) => setForm({ ...form, motivo: e.target.value })}>
                    <option value="">-- Seleccionar motivo --</option>
                    <option value="Precio elevado">Precio elevado / No puede pagar</option>
                    <option value="Problemas de señal">Problemas de señal / Buffering</option>
                    <option value="Cambio de proveedor">Cambio a otro proveedor IPTV</option>
                    <option value="No usa el servicio">No usa el servicio / Poco interés</option>
                    <option value="Problemas con el dispositivo">Problemas con el dispositivo Fire TV</option>
                    <option value="Mala calidad de contenido">Mala calidad de contenido / Canales caídos</option>
                    <option value="Viaje o mudanza">Viaje, mudanza o cambio de residencia</option>
                    <option value="Problemas económicos">Problemas económicos del cliente</option>
                    <option value="Insatisfacción con el soporte">Insatisfacción con el soporte técnico</option>
                    <option value="Prefiere streaming legal">Prefiere plataformas de streaming legales</option>
                    <option value="Dispositivo dañado o perdido">Dispositivo dañado o perdido</option>
                    <option value="Problemas de compatibilidad">Problemas de compatibilidad con su TV/Internet</option>
                    <option value="Cliente moroso">Cliente moroso / No paga a tiempo</option>
                    <option value="Cancelación temporal">Cancelación temporal (planea volver)</option>
                    <option value="Fallecimiento">Fallecimiento del titular</option>
                    <option value="Otro">Otro motivo</option>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Textarea label="Observaciones" rows={2} value={form.observaciones || ''} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} placeholder="Detalles adicionales..." />
                </div>
              </CardBody>
              <div className="p-4 border-t border-orange-100 flex justify-end gap-2 bg-orange-50/50">
                <Button type="button" variant="secondary" onClick={closeForm}>Cancelar</Button>
                <Button type="submit">{editing ? 'Actualizar' : 'Registrar Baja'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
