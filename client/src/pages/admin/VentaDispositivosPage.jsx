import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { todayStr } from '../../utils/dateUtils'
import {
  Search, Plus, Pencil, Trash2, X,
  DollarSign, ShoppingCart, Tv, RotateCcw,
  ChevronUp, ChevronDown, ChevronsUpDown, Sparkles
} from 'lucide-react'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Card, CardBody } from '../../components/ui/Card'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { formatDate, formatCurrency } from '../../utils/excelUtils'

// ─── KPI Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, variant, onClick }) {
  const styles = {
    solid:   'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white',
    light:   'bg-white border-2 border-indigo-200 text-indigo-700',
    outline: 'bg-indigo-50 border border-indigo-300 text-indigo-800',
  }
  const iconBg = {
    solid:   'bg-white/20',
    light:   'bg-indigo-100',
    outline: 'bg-indigo-200/60',
  }
  const interactive = typeof onClick === 'function'
  return (
    <div
      className={`${styles[variant]} rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 ${interactive ? 'cursor-pointer' : ''}`}
      {...(interactive ? {
        role: 'button', tabIndex: 0, onClick,
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } },
      } : {})}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${variant === 'solid' ? 'opacity-90' : ''}`}>{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sub && <p className={`text-xs mt-1 ${variant === 'solid' ? 'opacity-75' : 'text-indigo-500'}`}>{sub}</p>}
          {interactive && (
            <p className={`text-xs font-semibold mt-1.5 ${variant === 'solid' ? 'text-white/90' : 'text-indigo-600'}`}>¿Cómo se calcula?</p>
          )}
        </div>
        <div className={`${iconBg[variant]} rounded-lg p-3`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  )
}

// ─── Icono de orden ───────────────────────────────────────────────────────────

function SortIcon({ colKey, sortCol, sortDir }) {
  if (sortCol !== colKey) return <ChevronsUpDown size={13} className="opacity-40 flex-shrink-0" />
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="flex-shrink-0" />
    : <ChevronDown size={13} className="flex-shrink-0" />
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCOP = (v) => (v == null || v === '' ? '—' : formatCurrency(v))

// ─── Columnas ─────────────────────────────────────────────────────────────────

const COLS = [
  { key: 'idVM',           label: 'ID Venta' },
  { key: 'customerId',     label: 'ID Cliente' },
  { key: 'nombre',         label: 'Nombre' },
  { key: 'apellido',       label: 'Apellido' },
  { key: 'sku',            label: 'SKU' },
  { key: 'tipoFire',       label: 'Dispositivo' },
  { key: 'idPantalla',     label: 'Pantalla' },
  { key: 'nickname',       label: 'Nickname' },
  { key: 'estado',         label: 'Estado' },
  { key: 'fecha',          label: 'Fecha' },
  { key: 'precioVenta',    label: 'Precio' },
  { key: 'medioPago',      label: 'Medio Pago' },
  { key: 'acciones',       label: '' },
]

// ─── Render celda ─────────────────────────────────────────────────────────────

function renderCell(row, key, onEdit, onDelete) {
  const v = row[key]
  switch (key) {
    case 'acciones':
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(row)}
            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(row.idVM)}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    case 'idVM':
      return <span className="font-mono text-xs font-bold text-indigo-700">{v}</span>
    case 'idPantalla':
    case 'sku':
      return <span className="font-mono text-xs">{v || '—'}</span>
    case 'nombre':
    case 'apellido':
    case 'tipoFire':
      return <span className="font-medium">{v || '—'}</span>
    case 'estado':
      return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
          ${v === 'Activo' ? 'bg-green-100 text-green-700'
          : v === 'Desactivado' || v === 'Baja' ? 'bg-red-100 text-red-700'
          : 'bg-gray-100 text-gray-500'}`}>
          {v || '—'}
        </span>
      )
    case 'precioVenta':
      return <span className="font-semibold text-indigo-700 whitespace-nowrap">{fmtCOP(v)}</span>
    case 'fecha':
      return <span className="text-xs text-gray-600 whitespace-nowrap">{v ? formatDate(v) : '—'}</span>
    default:
      return v || '—'
  }
}

// ─── SKU adicionales con su Tipo Fire correspondiente ───────────────────────

const SKU_TIPO_FIRE = {
  ONN4KCH: 'Watch ONN 4K china',
  ONN4KO:  'Watch ONN 4K Original',
  ONNHDO:  'Watch ONN HD Original',
}

// ─── Formulario vacío ────────────────────────────────────────────────────────

const EMPTY = {
  idVM: '', customerId: '', nombre: '', apellido: '',
  sku: '', tipoFire: '', idPantalla: '', nickname: '',
  cuentaId: '', cuenta: '', estado: 'Activo', cortesia: 'NO',
  pantallas: 1, fechaAlta: '', fecha: '',
  anio: '', mes: '', precioVenta: '', medioPago: '',
  itemQuantity: 1, tipoPago: 'Activacion Pantalla', tipoPlan: '',
  tipoPantalla: '', cuentaDedicada: 'NO',
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function VentaDispositivosPage() {
  const { showToast } = useUi()
  const location = useLocation()
  const navigate = useNavigate()
  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [sortCol, setSortCol]   = useState('fecha')
  const [sortDir, setSortDir]   = useState('desc')
  const [explain, setExplain]   = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)

  const [nicknames, setNicknames] = useState([])
  const [clientesTabla, setClientesTabla] = useState([])

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/admin/payments/ventas-equipos')
      setRows(data)

      const resNicks = await api.get('/admin/bajas/nicknames')
      setNicknames(resNicks.data || [])

      const resClientes = await api.get('/admin/clients/tabla-clientes')
      setClientesTabla(resClientes.data || [])
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSort = (key) => {
    if (key === 'acciones') return
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(key); setSortDir('asc') }
  }

  const openNew = async () => {
    setEditing(null)
    const now = new Date()
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    let next = { ...EMPTY, fecha: todayStr(), anio: String(now.getFullYear()), mes: months[now.getMonth()] }

    setForm(next)
    setShowForm(true)
    try {
      const { data } = await api.get('/admin/payments/ventas-equipos/next-id')
      setForm(f => ({ ...f, idVM: data.nextId }))
    } catch (e) { console.error(e) }
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({ ...EMPTY, ...row })
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false) }

  // Busca en la tabla el Tipo Fire más reciente asociado a un SKU dado
  const lastTipoFireForSku = (sku) => {
    const target = (sku || '').trim().toLowerCase()
    if (!target) return null
    const matches = rows.filter(r => (r.sku || '').trim().toLowerCase() === target && (r.tipoFire || '').trim())
    if (!matches.length) return null
    return [...matches].sort((a, b) => {
      const da = a.fecha || a.fechaAlta || ''
      const db = b.fecha || b.fechaAlta || ''
      if (da !== db) return da < db ? 1 : -1
      return (b.idVM || '').localeCompare(a.idVM || '')
    })[0]?.tipoFire || null
  }

  // Busca el Tipo Cliente en la Tabla Cliente a partir del ID Cliente
  const tipoClienteForCustomerId = (customerId) => {
    const target = (customerId || '').toString().trim()
    if (!target) return null
    const cliente = clientesTabla.find(c => (c.customerId || '').toString().trim() === target)
    return cliente?.tipoCliente || null
  }

  const f = (field) => (e) => {
    const val = e.target.value
    setForm(prev => {
      const next = { ...prev, [field]: val }

      if (field === 'customerId') {
        const tipoCliente = tipoClienteForCustomerId(val)
        if (tipoCliente) next.tipoPantalla = tipoCliente
      }

      if (field === 'sku') {
        if (SKU_TIPO_FIRE[val]) {
          next.tipoFire = SKU_TIPO_FIRE[val]
        } else {
          const tipoFire = lastTipoFireForSku(val)
          if (tipoFire) next.tipoFire = tipoFire
        }
      }

      if (field === 'fecha' && val) {
        next.anio = val.slice(0, 4)
        const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
        next.mes = months[parseInt(val.slice(5, 7), 10) - 1] || ''
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const { data } = await api.put(`/admin/payments/ventas-equipos/${editing.idVM}`, form)
        setRows(prev => prev.map(r => r.idVM === editing.idVM ? data : r))
        showToast('Venta actualizada correctamente.', 'success')
      } else {
        const { data } = await api.post('/admin/payments/ventas-equipos', form)
        setRows(prev => [data, ...prev])
        showToast('Venta creada correctamente.', 'success')
      }
      closeForm()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const handleDelete = async (idVM) => {
    if (!confirm(`¿Eliminar la venta ${idVM}?`)) return
    try {
      await api.delete(`/admin/payments/ventas-equipos/${idVM}`)
      setRows(prev => prev.filter(r => r.idVM !== idVM))
      showToast('Venta eliminada correctamente.', 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  // Opciones
  const skuOptions = useMemo(() => {
    const set = new Set(rows.map(r => (r.sku || '').trim()).filter(Boolean))
    Object.keys(SKU_TIPO_FIRE).forEach(k => set.add(k))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [rows])

  const medioPagoOptions = useMemo(() => {
    const set = new Set(rows.map(r => (r.medioPago || '').trim()).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [rows])

  // Clientes (Tabla Cliente) ordenados para el selector
  const clienteOptions = useMemo(() => {
    return [...clientesTabla]
      .filter(c => c.customerId)
      .sort((a, b) => String(a.customerId).localeCompare(String(b.customerId), undefined, { numeric: true }))
  }, [clientesTabla])

  // Pantallas del Planificador (nickname → idPantalla M001-1) para el selector
  const pantallaOptions = useMemo(() => {
    return nicknames
      .filter(n => (n.idPantalla || '').trim())
      .sort((a, b) => String(a.idPantalla).localeCompare(String(b.idPantalla), undefined, { numeric: true }))
  }, [nicknames])

  // Al elegir un cliente: fija customerId y autocompleta nombre/apellido
  const pickCliente = (customerId) => {
    const c = clientesTabla.find(x => String(x.customerId) === String(customerId))
    setForm(prev => ({
      ...prev,
      customerId: customerId || '',
      nombre: c?.nombre ?? prev.nombre,
      apellido: c?.apellido ?? prev.apellido,
      tipoPantalla: c?.tipoCliente ?? prev.tipoPantalla,
    }))
  }

  // Al elegir una pantalla del Planificador: fija idPantalla (M001-1), nickname, cuentaId
  // y hereda el cliente de la pantalla si la venta aún no lo tiene
  const pickPantalla = (idPantalla) => {
    const p = pantallaOptions.find(x => String(x.idPantalla) === String(idPantalla))
    setForm(prev => ({
      ...prev,
      idPantalla: idPantalla || '',
      nickname: p?.nickname ?? prev.nickname,
      cuentaId: p?.cuentaId ?? prev.cuentaId,
      cuenta: p?.cuenta ?? prev.cuenta,
      customerId: prev.customerId || p?.customerId || '',
      nombre: prev.nombre || p?.nombre || '',
      apellido: prev.apellido || p?.apellido || '',
    }))
  }

  // Busqueda
  const searched = useMemo(() => {
    if (!search) return rows
    const s = search.toLowerCase()
    return rows.filter(r =>
      (r.idVM || '').toLowerCase().includes(s) ||
      (r.customerId || '').toString().toLowerCase().includes(s) ||
      (r.nombre || '').toLowerCase().includes(s) ||
      (r.apellido || '').toLowerCase().includes(s) ||
      (r.tipoFire || '').toLowerCase().includes(s) ||
      (r.idPantalla || '').toLowerCase().includes(s) ||
      (r.sku || '').toLowerCase().includes(s)
    )
  }, [rows, search])

  // Stats
  const stats = useMemo(() => {
    const total       = searched.length
    const ingresos    = searched.reduce((s, r) => s + (Number(r.precioVenta) || 0), 0)
    const firetv      = searched.filter(r => (r.tipoFire || '').toLowerCase().includes('fire')).length
    const onn         = searched.filter(r => (r.tipoFire || '').toLowerCase().includes('onn')).length
    return { total, ingresos, firetv, onn }
  }, [searched])

  const filtered = useMemo(() => {
    return [...searched].sort((a, b) => {
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
  }, [searched, sortCol, sortDir])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-indigo-700">Venta de Dispositivos</h1>
          <p className="text-gray-500">Historial de dispositivos físicos vendidos · {stats.total.toLocaleString()} registros</p>
        </div>
        <button
          onClick={() => openNew()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm hover:shadow-md"
        >
          <Plus size={16} /> Nueva Venta de Equipo
        </button>
      </div>

      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ShoppingCart} label="Total Equipos"    value={stats.total.toLocaleString()}     variant="solid"   sub={search ? 'Resultados filtrados' : 'Ventas totales'}
          onClick={() => setExplain({
            title: 'Total Equipos', value: stats.total.toLocaleString(), icon: ShoppingCart,
            queEs: 'Cuántos dispositivos físicos (Fire TV, ONN…) se han vendido. Si hay una búsqueda activa, refleja solo lo filtrado.',
            comoSeCalcula: 'Conteo de los registros de venta de equipos visibles en la tabla.',
            origen: 'Tabla de ventas de equipos de este módulo. Las gráficas de tendencia viven en **Análisis Dispositivos**.',
            action: { label: 'Ver Análisis Dispositivos', onClick: () => navigate('/admin/analisis-dispositivos') },
          })} />
        <StatCard icon={DollarSign}   label="Ingresos Equipos" value={fmtCOP(stats.ingresos)}           variant="light"   sub="Monto recaudado"
          onClick={() => setExplain({
            title: 'Ingresos Equipos', value: fmtCOP(stats.ingresos), icon: DollarSign,
            queEs: 'La plata recaudada por venta de hardware. Es una línea de ingreso separada de las licencias.',
            comoSeCalcula: 'Se **suma el precio de venta** de cada equipo visible. Sin filtros, coincide con los "Ingresos Totales" de Análisis Dispositivos y con la línea de equipos de Análisis Financiero. Ojo: el **costo de compra** de los equipos casi nunca está registrado, así que el margen real de esta línea no es medible todavía.',
            origen: 'Campo precio de venta de cada registro de este módulo.',
          })} />
        <StatCard icon={Tv}           label="FireTV Vendidos"  value={stats.firetv.toLocaleString()}    variant="outline" sub="Equipos Amazon"
          onClick={() => setExplain({
            title: 'FireTV Vendidos', value: stats.firetv.toLocaleString(), icon: Tv,
            queEs: 'Cuántos de los equipos vendidos son Fire TV de Amazon (el dispositivo estrella del negocio).',
            comoSeCalcula: 'Se cuentan los registros visibles cuyo campo **tipo de dispositivo contiene "fire"**.',
            origen: 'Campo tipo de dispositivo de cada venta de este módulo.',
          })} />
        <StatCard icon={Tv}           label="ONN Vendidos"     value={stats.onn.toLocaleString()}       variant="outline" sub="Equipos ONN"
          onClick={() => setExplain({
            title: 'ONN Vendidos', value: stats.onn.toLocaleString(), icon: Tv,
            queEs: 'Cuántos de los equipos vendidos son ONN (la alternativa económica de Walmart).',
            comoSeCalcula: 'Se cuentan los registros visibles cuyo campo **tipo de dispositivo contiene "onn"**.',
            origen: 'Campo tipo de dispositivo de cada venta de este módulo.',
          })} />
      </div>

      {/* Búsqueda */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ID, nombre, equipo, MAC…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-indigo-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Tabla */}
      <Card className="shadow-lg border-indigo-100 overflow-hidden">
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3" />
              <p className="text-gray-500">Cargando dispositivos…</p>
            </div>
          ) : error ? (
            <p className="p-8 text-center text-red-500">{error}</p>
          ) : (
            <div className="overflow-auto max-h-[34rem] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-indigo-200 hover:[&::-webkit-scrollbar-thumb]:bg-indigo-300">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-white">
                    {COLS.map(col => (
                      <th
                        key={col.key}
                        scope="col"
                        onClick={() => handleSort(col.key)}
                        className={`sticky top-0 z-10 bg-indigo-600 px-3 py-3 font-semibold whitespace-nowrap transition-colors select-none shadow-[0_1px_0_0_rgba(0,0,0,0.08)] ${col.key !== 'acciones' ? 'cursor-pointer hover:bg-indigo-700' : ''}`}
                      >
                        {col.key !== 'acciones' ? (
                          <div className="flex items-center gap-1">
                            {col.label}
                            <SortIcon colKey={col.key} sortCol={sortCol} sortDir={sortDir} />
                          </div>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr
                      key={row.idVM}
                      className={`border-b border-indigo-50 hover:bg-indigo-50/70 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-indigo-50/30'}`}
                    >
                      {COLS.map(col => (
                        <td key={col.key} className="px-3 py-2 whitespace-nowrap">
                          {renderCell(row, col.key, openEdit, handleDelete)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={COLS.length} className="px-4 py-12 text-center text-gray-400">
                        No se encontraron registros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
        <div className="flex items-center justify-between border-t border-indigo-100 bg-indigo-50/40 px-4 py-2 text-xs text-gray-500">
          <span>{filtered.length.toLocaleString()} de {rows.length.toLocaleString()} registros</span>
          <span>Ordenado por <strong className="text-indigo-600">{COLS.find(c => c.key === sortCol)?.label ?? sortCol}</strong> ({sortDir === 'asc' ? '↑ ascendente' : '↓ descendente'})</span>
        </div>
      </Card>

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editing ? 'Editar Equipo' : 'Nueva Venta de Equipo'}
                </h2>
                <p className="text-indigo-100 text-sm">
                  {editing ? `Editando ${editing.idVM}` : 'Complete todos los campos'}
                </p>
              </div>
              <button onClick={closeForm} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-3 border-b border-indigo-100 pb-1">
                  Identificación
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ID Venta</label>
                    <input value={form.idVM} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
                    <select
                      value={form.customerId}
                      onChange={(e) => pickCliente(e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm bg-white"
                    >
                      <option value="">Seleccionar cliente…</option>
                      {form.customerId && !clienteOptions.some(c => String(c.customerId) === String(form.customerId)) && (
                        <option value={form.customerId}>{form.customerId} · {form.nombre || 'cliente'}</option>
                      )}
                      {clienteOptions.map(c => (
                        <option key={c.customerId} value={c.customerId}>
                          {c.customerId} · {[c.nombre, c.apellido].filter(Boolean).join(' ') || '—'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                    <input value={form.nombre} onChange={f('nombre')} className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Apellido</label>
                    <input value={form.apellido} onChange={f('apellido')} className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm" />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-3 border-b border-indigo-100 pb-1">
                  Dispositivo Físico
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Dispositivo (FireTV, ONN...)</label>
                    <select value={form.tipoFire} onChange={f('tipoFire')} className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm bg-white">
                      <option value="">Seleccionar equipo…</option>
                      {form.tipoFire && ![
                        'FireTV Stick', 'FireTV Stick 4K', 'FireTV Stick 4K Max', 'FireTV Cube', 'FireTV TV',
                        'Watch ONN 4K Original', 'Watch ONN 4K China', 'Watch ONN HD Original',
                        'Smart TV (Android/Google)', 'Smart TV (Samsung/LG/Roku)', 'PC / Web', 'Celular / Tablet', 'Otro'
                      ].includes(form.tipoFire) && <option value={form.tipoFire}>{form.tipoFire} (actual)</option>}
                      <option>FireTV Stick</option>
                      <option>FireTV Stick 4K</option>
                      <option>FireTV Stick 4K Max</option>
                      <option>FireTV Cube</option>
                      <option>FireTV TV</option>
                      <option>Watch ONN 4K Original</option>
                      <option>Watch ONN 4K China</option>
                      <option>Watch ONN HD Original</option>
                      <option>Smart TV (Android/Google)</option>
                      <option>Smart TV (Samsung/LG/Roku)</option>
                      <option>PC / Web</option>
                      <option>Celular / Tablet</option>
                      <option>Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
                    <select value={form.sku} onChange={f('sku')} className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm font-mono bg-white">
                      <option value="">Seleccionar SKU…</option>
                      {form.sku && !skuOptions.includes(form.sku) && <option value={form.sku}>{form.sku}</option>}
                      {skuOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Serial del equipo</label>
                    <input value={form.serial || ''} onChange={f('serial')} placeholder="Serial físico" className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm font-mono" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pantalla / Nickname (Planificador)</label>
                    <select
                      value={form.idPantalla || ''}
                      onChange={(e) => pickPantalla(e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm bg-white"
                    >
                      <option value="">Sin asignar — seleccionar pantalla…</option>
                      {form.idPantalla && !pantallaOptions.some(p => String(p.idPantalla) === String(form.idPantalla)) && (
                        <option value={form.idPantalla}>{form.idPantalla} · {form.nickname || ''} (actual)</option>
                      )}
                      {pantallaOptions.map(p => (
                        <option key={p.idPantalla} value={p.idPantalla}>
                          {p.idPantalla} · {p.nickname}{p.cuentaId ? ` · ${p.cuentaId}` : ''}
                        </option>
                      ))}
                    </select>
                    {form.idPantalla && (
                      <p className="mt-1 text-xs text-indigo-500">
                        Cuenta padre: <span className="font-mono font-semibold">{form.cuentaId || '—'}</span>
                        {form.nickname ? <> · Nickname: <span className="font-semibold">{form.nickname}</span></> : null}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                    <select value={form.estado} onChange={f('estado')} className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm bg-white">
                      <option>Activo</option>
                      <option>Desactivado</option>
                      <option>Baja</option>
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-3 border-b border-indigo-100 pb-1">
                  Pago y Fechas
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                    <input type="date" value={form.fecha} onChange={f('fecha')} className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Precio Venta</label>
                    <CurrencyInput value={form.precioVenta} onChange={f('precioVenta')} decimals={0} className="border-indigo-200 focus:ring-indigo-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Medio de Pago</label>
                    <select value={form.medioPago} onChange={f('medioPago')} className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm bg-white">
                      <option value="">—</option>
                      {form.medioPago && !medioPagoOptions.includes(form.medioPago) && <option value={form.medioPago}>{form.medioPago}</option>}
                      {medioPagoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Pago</label>
                    <select value={form.tipoPago} onChange={f('tipoPago')} className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm bg-white">
                      <option value="Activacion Pantalla">Activacion Pantalla</option>
                      <option value="Activacion">Activacion</option>
                    </select>
                  </div>
                </div>
              </section>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={closeForm} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow transition-colors">
                  {editing ? 'Guardar cambios' : 'Crear venta de equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
