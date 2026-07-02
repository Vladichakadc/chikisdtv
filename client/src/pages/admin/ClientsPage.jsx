import { useState, useMemo, useEffect } from 'react'
import {
  Search, Users, Globe, UserCheck, Repeat,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Plus, Pencil, Trash2, X, Upload
} from 'lucide-react'
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts'
import { ChartInsight, narrarGeografia, LABEL_STYLE, PIE_COLORS } from './dashboard/biShared'
import api from '../../config/api'
import { useApiResource } from '../../hooks/useApiResource'
import { useUi } from '../../context/UiContext'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

const PAISES = [
  { nombre: 'Colombia', codigo: '+57' },
  { nombre: 'México', codigo: '+52' },
  { nombre: 'Venezuela', codigo: '+58' },
  { nombre: 'Ecuador', codigo: '+593' },
  { nombre: 'Perú', codigo: '+51' },
  { nombre: 'Chile', codigo: '+56' },
  { nombre: 'Argentina', codigo: '+54' },
  { nombre: 'Bolivia', codigo: '+591' },
  { nombre: 'Paraguay', codigo: '+595' },
  { nombre: 'Uruguay', codigo: '+598' },
  { nombre: 'Brasil', codigo: '+55' },
  { nombre: 'Panamá', codigo: '+507' },
  { nombre: 'Costa Rica', codigo: '+506' },
  { nombre: 'Guatemala', codigo: '+502' },
  { nombre: 'Honduras', codigo: '+504' },
  { nombre: 'El Salvador', codigo: '+503' },
  { nombre: 'Nicaragua', codigo: '+505' },
  { nombre: 'República Dominicana', codigo: '+1' },
  { nombre: 'Puerto Rico', codigo: '+1' },
  { nombre: 'Cuba', codigo: '+53' },
  { nombre: 'España', codigo: '+34' },
  { nombre: 'Estados Unidos', codigo: '+1' },
]

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, variant }) {
  const styles = {
    solid:   'bg-gradient-to-br from-orange-500 to-orange-600 text-white',
    light:   'bg-white border-2 border-orange-200 text-orange-700',
    outline: 'bg-orange-50 border border-orange-300 text-orange-800',
  }
  const iconBg = { solid: 'bg-white/20', light: 'bg-orange-100', outline: 'bg-orange-200/60' }
  return (
    <div className={`${styles[variant]} rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${variant === 'solid' ? 'opacity-90' : ''}`}>{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sub && <p className={`text-xs mt-1 ${variant === 'solid' ? 'opacity-75' : 'text-orange-500'}`}>{sub}</p>}
        </div>
        <div className={`${iconBg[variant]} rounded-lg p-3`}><Icon size={24} /></div>
      </div>
    </div>
  )
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ colKey, sortCol, sortDir }) {
  if (sortCol !== colKey) return <ChevronsUpDown size={13} className="opacity-40 flex-shrink-0" />
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="flex-shrink-0" />
    : <ChevronDown size={13} className="flex-shrink-0" />
}

// ─── Columnas ─────────────────────────────────────────────────────────────────

const COLS = [
  { key: 'customerId',   label: 'ID Cliente' },
  { key: 'nombre',       label: 'Nombre' },
  { key: 'apellido',     label: 'Apellido' },
  { key: 'genero',       label: 'Género' },
  { key: 'pais',         label: 'País' },
  { key: 'ciudad',       label: 'Ciudad' },
  { key: 'tipoCliente',  label: 'Tipo Cliente' },
  { key: 'concatenar',   label: 'Nombre Completo' },
  { key: 'referido',     label: 'Referido' },
  { key: 'movil',        label: 'Móvil' },
]

// ─── Render celda ─────────────────────────────────────────────────────────────

function renderCell(row, key) {
  const v = row[key]
  switch (key) {
    case 'customerId':
      return <span className="font-mono text-base font-bold text-orange-700">{v}</span>
    case 'nombre':
      return <span className="font-medium">{v || '—'}</span>
    case 'genero':
      return v ? (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
          ${v === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
          {v === 'F' ? 'Femenino' : 'Masculino'}
        </span>
      ) : <span className="text-gray-400">—</span>
    case 'tipoCliente':
      return v ? (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
          ${v === 'Final' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
          {v}
        </span>
      ) : <span className="text-gray-400">—</span>
    default:
      return v || <span className="text-gray-400">—</span>
  }
}

// ─── Formulario vacío ─────────────────────────────────────────────────────────

const EMPTY = {
  customerId: '', nombre: '', apellido: '', genero: '',
  pais: '', ciudad: '', tipoCliente: 'Final', concatenar: '', referido: '', movil: '',
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ClientsPage() {
  const { showToast } = useUi()
  const { data: rows, setData: setRows, loading, error, reload: load } = useApiResource('/admin/clients/tabla-clientes')
  const [search, setSearch]     = useState('')
  const [sortCol, setSortCol]   = useState('customerId')
  const [sortDir, setSortDir]   = useState('desc')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [paisesClientes, setPaisesClientes] = useState([])

  // Distribución geográfica (agregado del dashboard-bi, movido desde el Dashboard)
  useEffect(() => {
    api.get('/admin/dashboard-bi')
      .then(r => setPaisesClientes(r.data.paisesClientes || []))
      .catch(() => {})
  }, [])

  const handleImport = async () => {
    if (!confirm('¿Re-importar todos los clientes desde el Excel? Los cambios manuales se conservan si el ID ya existe.')) return
    try {
      const { data } = await api.post('/admin/clients/tabla-clientes/import')
      showToast(data.message, 'success')
      load()
    } catch (e) { showToast(e.response?.data?.error || e.message, 'error') }
  }

  const openNew  = async () => {
    setEditing(null); setForm(EMPTY); setShowForm(true)
    try {
      const { data } = await api.get('/admin/clients/tabla-clientes/next-id')
      setForm(prev => ({ ...prev, customerId: data.nextId }))
    } catch (e) { console.error(e) }
  }
  const openEdit = (r) => { setEditing(r); setForm({ ...r }); setShowForm(true) }
  const closeForm = () => setShowForm(false)

  const f = (field) => (e) => {
    const val = e?.target ? e.target.value : e
    setForm(prev => {
      const next = { ...prev, [field]: val }
      if (field === 'nombre' || field === 'apellido') {
        next.concatenar = `${next.nombre || ''}${next.apellido || ''}`
      }
      if (field === 'pais') {
        const pais = PAISES.find(p => p.nombre === val)
        if (pais) {
          next.movil = pais.codigo + ' '
        }
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
      closeForm(); load()
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error')
    }
  }

  const handleDelete = async (row) => {
    if (!confirm(`¿Eliminar al cliente ${row.nombre} ${row.apellido} (ID: ${row.customerId})?\n\nEsta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/admin/clients/tabla-clientes/${row.customerId}`)
      setRows(prev => prev.filter(r => r.customerId !== row.customerId))
      showToast('Cliente eliminado correctamente.', 'success')
    } catch (e) { showToast(e.response?.data?.error || e.message, 'error') }
  }

  const handleSort = (key) => {
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(key); setSortDir('asc') }
  }

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
      if (typeof va === 'number' && typeof vb === 'number')
        return sortDir === 'asc' ? va - vb : vb - va
      va = String(va).toLowerCase(); vb = String(vb).toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, search, sortCol, sortDir])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-accent">Clientes</h1>
          <p className="text-gray-500">Base de suscriptores IPTV · {stats.total.toLocaleString()} registros</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleImport} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-200 text-orange-700 hover:bg-orange-50 text-sm font-medium transition-colors">
            <Upload size={15} /> Importar Excel
          </button>
          <Button onClick={openNew}><Plus size={18} /> Nuevo Cliente</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users}     label="Total Clientes"   value={stats.total.toLocaleString()}        variant="solid"   sub="Histórico completo" />
        <StatCard icon={UserCheck} label="Clientes Finales" value={stats.finales.toLocaleString()}      variant="light"   sub="Usuarios directos" />
        <StatCard icon={Repeat}    label="Revendedores"     value={stats.revendedores.toLocaleString()}  variant="outline" sub="Canal de reventa" />
        <StatCard icon={Globe}     label="Países"           value={stats.paises.toLocaleString()}        variant="light"   sub="Cobertura global" />
      </div>

      {/* Distribución geográfica (movido desde el Dashboard) */}
      {paisesClientes.length > 0 && (
        <Card className="border-orange-100 mb-6">
          <CardHeader className="border-orange-50">
            <CardTitle>Distribución geográfica de clientes</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Países con más clientes registrados en la tabla de clientes</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={paisesClientes} layout="vertical" margin={{ top: 10, right: 40, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis type="category" dataKey="pais" tick={{ fontSize: 11, fill: '#78716c' }} width={90} />
                <Tooltip formatter={(v, name, p) => [`${v} clientes (${p.payload.pct}%)`, 'Cantidad']} />
                <Bar dataKey="cantidad" name="Clientes" radius={[0, 6, 6, 0]} barSize={18}>
                  {paisesClientes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  <LabelList dataKey="cantidad" position="right" formatter={(v) => v.toLocaleString('es-CO')} style={{ ...LABEL_STYLE, fontSize: 11 }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={narrarGeografia(paisesClientes)} />
          </CardBody>
        </Card>
      )}

      {/* Búsqueda */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ID, nombre, país, ciudad, referido…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-orange-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Tabla */}
      <Card className="shadow-lg border-orange-100 overflow-hidden">
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3" />
              <p className="text-gray-500">Cargando clientes…</p>
            </div>
          ) : error ? (
            <p className="p-8 text-center text-red-500">{error}</p>
          ) : (
            <div className="overflow-auto max-h-[34rem] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-200 hover:[&::-webkit-scrollbar-thumb]:bg-orange-300">
              <table className="w-full text-base table-fixed border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-white">
                    {COLS.map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)} scope="col"
                        className="sticky top-0 z-10 bg-orange-600 px-4 py-3 font-semibold whitespace-nowrap cursor-pointer hover:bg-orange-700 transition-colors select-none text-sm shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                        <div className="flex items-center gap-1">
                          {col.label}
                          <SortIcon colKey={col.key} sortCol={sortCol} sortDir={sortDir} />
                        </div>
                      </th>
                    ))}
                    <th className="sticky top-0 z-10 bg-orange-600 px-4 py-3 font-semibold whitespace-nowrap text-center text-sm shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr key={row.customerId}
                      className={`group border-b border-orange-50 hover:bg-orange-50/70 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}`}>
                      {COLS.map(col => (
                        <td key={col.key} className="px-4 py-3 whitespace-nowrap">{renderCell(row, col.key)}</td>
                      ))}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => openEdit(row)} className="text-orange-600 hover:bg-orange-100 p-2 rounded-lg transition-colors"><Pencil size={20} /></button>
                          <button onClick={() => handleDelete(row)} className="text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors"><Trash2 size={20} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={COLS.length + 1} className="px-4 py-12 text-center text-gray-400">No se encontraron clientes.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
        <div className="flex items-center justify-between border-t border-orange-100 bg-orange-50/40 px-4 py-2 text-xs text-gray-500">
          <span>{filtered.length.toLocaleString()} de {rows.length.toLocaleString()} registros</span>
          <span>Ordenado por <strong className="text-brand-accent">{COLS.find(c => c.key === sortCol)?.label ?? sortCol}</strong> ({sortDir === 'asc' ? '↑ ascendente' : '↓ descendente'})</span>
        </div>
      </Card>

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl">
            <CardHeader className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-xl">
              <CardTitle className="text-white">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</CardTitle>
              <button onClick={closeForm} className="hover:bg-white/20 p-1 rounded"><X size={20} /></button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="sm:col-span-2 text-sm font-semibold text-orange-700 border-b border-orange-200 pb-1">
                  👤 Identificación
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Cliente (auto)</label>
                  <input
                    value={form.customerId || 'Generando…'}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 font-mono font-bold cursor-not-allowed"
                  />
                </div>

                <Select label="Tipo de Cliente" value={form.tipoCliente} onChange={f('tipoCliente')}>
                  <option value="Final">Final</option>
                  <option value="Revendedor">Revendedor</option>
                </Select>

                <div className="sm:col-span-2 text-sm font-semibold text-orange-700 border-b border-orange-200 pb-1 mt-2">
                  📋 Datos Personales
                </div>

                <Input label="Nombre *" value={form.nombre} onChange={f('nombre')} required />
                <Input label="Apellido" value={form.apellido} onChange={f('apellido')} />

                <Select label="Género" value={form.genero} onChange={f('genero')}>
                  <option value="">-- Seleccionar --</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </Select>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referido por</label>
                  <select
                    value={form.referido || ''}
                    onChange={e => f('referido')(e.target.value)}
                    className="w-full px-3 py-2 border border-orange-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm"
                  >
                    <option value="">-- Sin referido --</option>
                    {[...rows]
                      .sort((a, b) => Number(a.customerId) - Number(b.customerId))
                      .map(r => (
                        <option key={r.customerId} value={r.customerId}>
                          {r.customerId} — {r.nombre} {r.apellido}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="sm:col-span-2 text-sm font-semibold text-orange-700 border-b border-orange-200 pb-1 mt-2">
                  🌍 Ubicación
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                  <input
                    list="paises-list"
                    value={form.pais || ''}
                    onChange={f('pais')}
                    placeholder="Seleccionar o escribir país..."
                    className="w-full px-3 py-2 border border-orange-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm"
                  />
                  <datalist id="paises-list">
                    {PAISES.map(p => (
                      <option key={p.nombre} value={p.nombre}>{p.nombre} ({p.codigo})</option>
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-400 mt-0.5">Selecciona de la lista o escribe uno nuevo</p>
                </div>
                <Input label="Ciudad" value={form.ciudad || ''} onChange={f('ciudad')} placeholder="Ej: Bogotá" />
                <Input label="Móvil" value={form.movil || ''} onChange={f('movil')} placeholder="Ej: +57 300 123 4567" />

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo (auto)</label>
                  <input
                    value={form.concatenar || ''}
                    onChange={f('concatenar')}
                    placeholder="Se genera automáticamente al ingresar nombre y apellido"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-400 outline-none text-sm text-gray-600"
                  />
                </div>

              </CardBody>
              <div className="p-4 border-t border-orange-100 flex justify-end gap-2 bg-orange-50/50">
                <Button type="button" variant="secondary" onClick={closeForm}>Cancelar</Button>
                <Button type="submit">{editing ? 'Actualizar' : 'Registrar Cliente'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
