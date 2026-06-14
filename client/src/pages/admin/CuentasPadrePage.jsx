import { useState, useMemo, useEffect } from 'react'
import {
  Search, Plus, Pencil, Trash2, X,
  Server, ShieldCheck, Monitor, Clock,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Eye, EyeOff, RefreshCw, Upload,
  FileSpreadsheet, CheckCircle2, AlertCircle, Undo2,
  Layers, TrendingUp, Percent, Lightbulb, Sparkles,
} from 'lucide-react'
import {
  ComposedChart, Bar, CartesianGrid, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '../../config/api'
import { useApiResource } from '../../hooks/useApiResource'
import { useUi } from '../../context/UiContext'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { formatDate } from '../../utils/excelUtils'

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

// ─── Componentes de análisis de capacidad ────────────────────────────────────

function SmartTagCP({ tone = 'info', children }) {
  const s = { good: 'bg-emerald-100 text-emerald-700', warn: 'bg-amber-100 text-amber-700', bad: 'bg-red-100 text-red-700', info: 'bg-sky-100 text-sky-700' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${s[tone]}`}>
      <Sparkles size={10} />{children}
    </span>
  )
}

function BiCardCP({ icon: Icon, label, value, sub, variant = 'light', tag }) {
  const styles = { solid: 'bg-gradient-to-br from-sky-500 to-sky-700 text-white', light: 'bg-white border-2 border-sky-200 text-sky-700', outline: 'bg-sky-50 border border-sky-300 text-sky-800' }
  const iconBg  = { solid: 'bg-white/20', light: 'bg-sky-100', outline: 'bg-sky-200/60' }
  return (
    <div className={`${styles[variant]} rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${variant === 'solid' ? 'opacity-90' : ''}`}>{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {tag && <div className="mt-1.5"><SmartTagCP tone={tag.tone}>{tag.text}</SmartTagCP></div>}
          {sub && <p className={`text-xs mt-1 ${variant === 'solid' ? 'opacity-75' : 'text-gray-400'}`}>{sub}</p>}
        </div>
        <div className={`${iconBg[variant]} rounded-lg p-3`}><Icon size={22} /></div>
      </div>
    </div>
  )
}

function ChartInsightCP({ text }) {
  if (!text) return null
  return (
    <div className="mt-3 flex gap-2.5 bg-sky-50/70 border border-sky-100 rounded-lg px-3.5 py-2.5">
      <Lightbulb size={16} className="text-sky-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-gray-600 leading-relaxed">
        {text.split('**').map((chunk, j) => j % 2 === 1 ? <strong key={j} className="text-gray-800">{chunk}</strong> : chunk)}
      </p>
    </div>
  )
}

function tagOcupacionCP(pct) {
  if (pct >= 92) return { tone: 'warn', text: 'Capacidad casi agotada — recargar pronto' }
  if (pct >= 70) return { tone: 'good', text: 'Ocupación saludable' }
  return { tone: 'info', text: 'Margen amplio disponible' }
}

function narrarCapacidadCP(oc) {
  if (!oc?.totalCapacidad) return null
  const { totalCapacidad, totalOcupadas, totalLibres, pctOcupacionGlobal, detalle } = oc
  const cuentasLlenas = (detalle || []).filter(c => c.pctOcupacion >= 100).length
  const cuentasBaja   = (detalle || []).filter(c => c.pctOcupacion < 50).length
  const pctLibre = 100 - pctOcupacionGlobal
  const margen = pctOcupacionGlobal < 92
    ? `Quedan **${totalLibres} cupos libres** (${pctLibre}% de la capacidad instalada) disponibles para activar sin comprar créditos adicionales.`
    : `La capacidad está casi agotada — considera recargar antes de la próxima campaña de activaciones.`
  return `La red de **${(detalle || []).length} cuentas padre** suma **${totalCapacidad} pantallas de capacidad total**, de las cuales **${totalOcupadas} están activas** (${pctOcupacionGlobal}% de ocupación). ${margen}${cuentasLlenas > 0 ? ` **${cuentasLlenas} cuenta${cuentasLlenas > 1 ? 's están' : ' está'} al tope** — necesitan recarga para seguir creciendo.` : ''}${cuentasBaja > 0 ? ` **${cuentasBaja} cuenta${cuentasBaja > 1 ? 's tienen' : ' tiene'} menos del 50% de ocupación** — margen que se pierde mes a mes sin gestión activa.` : ''}`
}

// ─── Icono de orden ───────────────────────────────────────────────────────────

function SortIcon({ colKey, sortCol, sortDir }) {
  if (sortCol !== colKey) return <ChevronsUpDown size={13} className="opacity-40 flex-shrink-0" />
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="flex-shrink-0" />
    : <ChevronDown size={13} className="flex-shrink-0" />
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIAS_ALERTA = 30

function diasHasta(fecha) {
  if (!fecha) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(fecha); if (isNaN(d)) return null
  d.setHours(0, 0, 0, 0)
  return Math.round((d - today) / 86400000)
}

function getVariante(row) {
  const dias = diasHasta(row.fechaFin)
  if (dias === null) return 'sin_fecha'
  if (dias <= 0) return 'vencida'
  if (dias <= DIAS_ALERTA) return 'alerta'
  return 'valida'
}

const ROW_BG = {
  valida:    'hover:bg-green-50',
  alerta:    'bg-amber-50 hover:bg-amber-100',
  vencida:   'bg-red-50 hover:bg-red-100',
  sin_fecha: 'hover:bg-gray-50',
}

// ─── Columnas ─────────────────────────────────────────────────────────────────

const COLS = [
  { key: 'cuentaId',      label: 'ID Cuenta',  thClass: 'text-center', tdClass: 'text-center' },
  { key: 'nombreUsuario', label: 'Usuario',     thClass: '',            tdClass: 'text-left'   },
  { key: 'contrasena',    label: 'Contraseña',  thClass: '',            tdClass: 'text-left'   },
  { key: 'credito',       label: 'Crédito',     thClass: 'text-center', tdClass: 'text-center' },
  { key: 'fechaInicio',   label: 'Inicio',      thClass: 'text-center', tdClass: 'text-center' },
  { key: 'fechaFin',      label: 'Fin',         thClass: 'text-center', tdClass: 'text-center' },
  { key: '_dias',         label: 'Días',        thClass: 'text-center', tdClass: 'text-center' },
  { key: 'smartTv',       label: 'SmartTV',     thClass: 'text-center', tdClass: 'text-center' },
  { key: 'estado',        label: 'Estado',      thClass: 'text-center', tdClass: 'text-center' },
  { key: 'acciones',      label: '',            thClass: 'text-center', tdClass: 'text-center' },
]

// ─── Render celda ─────────────────────────────────────────────────────────────

function renderCell(row, key, onEdit, onDelete, showPwd) {
  const v = row[key]
  switch (key) {
    case 'acciones':
      return (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onEdit(row)}
            className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-100 transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(row.cuentaId)}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    case 'cuentaId':
      return <span className="font-mono font-bold text-orange-700">{v}</span>
    case 'contrasena':
      return (
        <span className="font-mono">
          {showPwd ? (v || '—') : (v ? '••••••••' : '—')}
        </span>
      )
    case 'credito':
      return <span className="font-semibold">{v ?? '—'}</span>
    case 'estado':
      return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
          ${v === 'Válido' ? 'bg-green-100 text-green-700'
          : v === 'Vencido' || v === 'Inactivo' ? 'bg-red-100 text-red-700'
          : 'bg-gray-100 text-gray-500'}`}>
          {v || '—'}
        </span>
      )
    case 'fechaFin': {
      if (!v) return <span className="text-gray-300">—</span>
      const dias = diasHasta(v)
      const color = dias == null ? 'text-gray-400'
        : dias <= 0             ? 'text-red-600 font-semibold'
        : dias <= DIAS_ALERTA   ? 'text-amber-600 font-semibold'
        : 'text-gray-700'
      return (
        <span className={color} title={dias != null ? `${dias} días restantes` : ''}>
          {formatDate(v)}
        </span>
      )
    }
    case '_dias': {
      const dias = diasHasta(row.fechaFin)
      if (dias === null) return <span className="text-gray-300">—</span>
      if (dias <= 0)
        return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">VENCIDA</span>
      if (dias <= DIAS_ALERTA)
        return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">{dias}d</span>
      return <span className="text-[10px] text-gray-500">{dias}d</span>
    }
    case 'fechaInicio':
      return <span className="text-gray-600">{v ? formatDate(v) : '—'}</span>
    default:
      return v || '—'
  }
}

// ─── Formulario vacío ────────────────────────────────────────────────────────

const EMPTY = {
  cuentaId: '', nombreUsuario: '', contrasena: '',
  credito: '', fechaInicio: '', fechaFin: '', smartTv: '', estado: '',
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CuentasPadrePage() {
  const { showToast } = useUi()
  const { data: rows, setData: setRows, loading, error, reload: load } = useApiResource('/admin/cuentas-padre')
  const [search, setSearch]     = useState('')
  const [sortCol, setSortCol]   = useState('cuentaId')
  const [sortDir, setSortDir]   = useState('asc')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [showPwd, setShowPwd]     = useState(true)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading]   = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [ocupacion, setOcupacion]   = useState(null)

  useEffect(() => {
    api.get('/admin/dashboard-bi')
      .then(r => setOcupacion(r.data.ocupacion))
      .catch(() => {})
  }, [])
  const [dragOver, setDragOver]     = useState(false)
  const [prevRows, setPrevRows]     = useState([])
  const [canUndo, setCanUndo]       = useState(false)
  const [filterVariante, setFilterVariante] = useState('ALL')


  const handleSort = (key) => {
    if (key === 'acciones') return
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(key); setSortDir('asc') }
  }

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY })
    setShowForm(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({ ...EMPTY, ...row })
    setShowForm(true)
  }

  const closeForm = () => setShowForm(false)

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const { data } = await api.put(`/admin/cuentas-padre/${editing.cuentaId}`, form)
        setRows(prev => prev.map(r => r.cuentaId === editing.cuentaId ? data : r))
        showToast('Cuenta padre actualizada correctamente.', 'success')
      } else {
        const { data } = await api.post('/admin/cuentas-padre', form)
        setRows(prev => [data, ...prev])
        showToast('Cuenta padre creada correctamente.', 'success')
      }
      closeForm()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const handleDelete = async (cuentaId) => {
    if (!confirm(`¿Eliminar la cuenta ${cuentaId}?`)) return
    try {
      await api.delete(`/admin/cuentas-padre/${cuentaId}`)
      setRows(prev => prev.filter(r => r.cuentaId !== cuentaId))
      showToast('Cuenta padre eliminada correctamente.', 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (f) { setUploadFile(f); setUploadResult(null) }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && /\.(xlsx|xls)$/i.test(f.name)) { setUploadFile(f); setUploadResult(null) }
  }

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true); setUploadResult(null); setCanUndo(false)
    const snapshot = [...rows]
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      const { data } = await api.post('/admin/cuentas-padre/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPrevRows(snapshot)
      setRows(data.rows)
      setUploadResult({ ok: true, message: data.message, newCount: data.newCount })
      setUploadFile(null)
      setCanUndo(true)
    } catch (e) {
      setUploadResult({ ok: false, message: e.response?.data?.error || e.message })
    } finally {
      setUploading(false)
    }
  }

  const handleUndo = async () => {
    if (!confirm('¿Deshacer la última carga y restaurar el estado anterior?')) return
    setUploading(true)
    try {
      const { data } = await api.post('/admin/cuentas-padre/restore', prevRows)
      setRows(data.rows)
      setCanUndo(false)
      setPrevRows([])
      setUploadResult({ ok: true, message: data.message })
    } catch (e) {
      setUploadResult({ ok: false, message: e.response?.data?.error || e.message })
    } finally {
      setUploading(false)
    }
  }

  const handleRestoreOriginal = async () => {
    if (!confirm('¿Restaurar la tabla completa desde Tabla_Cuentaspadre.xlsx?\nEsto elimina cualquier cambio no guardado en el archivo original.')) return
    setUploading(true); setUploadResult(null)
    try {
      const { data } = await api.post('/admin/cuentas-padre/import')
      setRows(data.rows)
      setCanUndo(false); setPrevRows([])
      setUploadResult({ ok: true, message: data.message })
    } catch (e) {
      setUploadResult({ ok: false, message: e.response?.data?.error || e.message })
    } finally {
      setUploading(false)
    }
  }

  const stats = useMemo(() => {
    const total    = rows.length
    const validas  = rows.filter(r => getVariante(r) === 'valida').length
    const credito  = rows.reduce((s, r) => s + (Number(r.credito) || 0), 0)
    const proximas = rows.filter(r => getVariante(r) === 'alerta').length
    const vencidas = rows.filter(r => getVariante(r) === 'vencida').length
    return { total, validas, credito, proximas, vencidas }
  }, [rows])

  const filtered = useMemo(() => {
    let result = rows
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(r =>
        (r.cuentaId      || '').toLowerCase().includes(s) ||
        (r.nombreUsuario || '').toLowerCase().includes(s) ||
        (r.estado        || '').toLowerCase().includes(s)
      )
    }
    if (filterVariante !== 'ALL') {
      result = result.filter(r => getVariante(r) === filterVariante)
    }
    return [...result].sort((a, b) => {
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
  }, [rows, search, sortCol, sortDir, filterVariante])

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-accent">Cuentas Padre</h1>
          <p className="text-gray-500">Gestión de cuentas principales · {stats.total.toLocaleString()} registros</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors shadow"
        >
          <Plus size={16} /> Nueva Cuenta
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={Server}      label="Total Cuentas"     value={stats.total.toLocaleString()}    variant="solid"   sub="Histórico completo" />
        <StatCard icon={ShieldCheck} label="Cuentas Válidas"   value={stats.validas.toLocaleString()}  variant="light"   sub="Estado activo" />
        <StatCard icon={Monitor}     label="Crédito Total"     value={stats.credito.toLocaleString()}  variant="outline" sub="Pantallas disponibles" />
        <StatCard icon={Clock}       label={`Próx. a vencer`}  value={stats.proximas.toLocaleString()} variant="light"   sub={`≤ ${DIAS_ALERTA} días`} />
        <StatCard icon={AlertCircle} label="Vencidas"          value={stats.vencidas.toLocaleString()} variant="outline" sub="Requieren acción" />
      </div>

      <div className="flex gap-4 items-start">

        {/* ── Izquierda: buscador + tabla ──────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Búsqueda + toggle contraseñas */}
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por ID, usuario, estado…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-orange-200 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all text-sm"
              />
            </div>
            <select
              value={filterVariante}
              onChange={e => setFilterVariante(e.target.value)}
              className="px-3 py-2 border border-orange-200 rounded-lg bg-white text-xs text-gray-600 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all"
            >
              <option value="ALL">Todos los estados</option>
              <option value="valida">Vigentes</option>
              <option value="alerta">Alerta (próx. vencer)</option>
              <option value="vencida">Vencidas</option>
              <option value="sin_fecha">Sin fecha</option>
            </select>
            <button
              onClick={() => setShowPwd(s => !s)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-orange-200 text-xs text-gray-600 hover:bg-orange-50 transition-colors whitespace-nowrap"
            >
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPwd ? 'Ocultar' : 'Mostrar'} claves
            </button>
          </div>

          {/* Tabla */}
          <Card className="shadow-lg border-orange-100 overflow-hidden">
            <CardBody className="p-0">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3" />
                  <p className="text-gray-500">Cargando cuentas…</p>
                </div>
              ) : error ? (
                <p className="p-8 text-center text-red-500">{error}</p>
              ) : (
                <div className="overflow-auto max-h-[34rem] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-200 hover:[&::-webkit-scrollbar-thumb]:bg-orange-300">
                  <table className="w-full text-base border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left text-white">
                        {COLS.map(col => (
                          <th
                            key={col.key}
                            scope="col"
                            onClick={() => handleSort(col.key)}
                            className={`sticky top-0 z-10 bg-orange-600 px-3 py-3 font-semibold whitespace-nowrap transition-colors select-none shadow-[0_1px_0_0_rgba(0,0,0,0.08)] ${col.thClass} ${col.key !== 'acciones' ? 'cursor-pointer hover:bg-orange-700' : ''}`}
                          >
                            {col.key !== 'acciones' ? (
                              <div className={`flex items-center gap-1 ${col.thClass.includes('text-center') ? 'justify-center' : ''}`}>
                                {col.label}
                                <SortIcon colKey={col.key} sortCol={sortCol} sortDir={sortDir} />
                              </div>
                            ) : null}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) => (
                        <tr
                          key={row.cuentaId}
                          className={`border-b border-orange-50 transition-colors ${ROW_BG[getVariante(row)]}`}
                        >
                          {COLS.map(col => (
                            <td key={col.key} className={`px-3 py-2.5 whitespace-nowrap ${col.tdClass}`}>
                              {renderCell(row, col.key, openEdit, handleDelete, showPwd)}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={COLS.length} className="px-4 py-12 text-center text-gray-400">
                            No se encontraron registros con los filtros aplicados.
                          </td>
                        </tr>
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
        </div>

        {/* ── Derecha: panel de carga ──────────────────────────────────── */}
        <div className="w-60 flex-shrink-0 flex flex-col gap-3">

          {/* Zona de carga */}
          <div className="bg-white rounded-xl border border-orange-100 shadow-md p-4 flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <FileSpreadsheet size={15} className="text-orange-500" />
                <h3 className="font-semibold text-sm text-brand-accent">Importar Excel</h3>
              </div>
              <p className="text-xs text-gray-400 leading-tight">
                Cuentas sin ID recibirán código <span className="font-mono text-orange-600">M###</span> automático.
              </p>
            </div>

            {/* Drop zone */}
            <label
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors ${
                dragOver ? 'border-orange-400 bg-orange-50' : 'border-orange-200 hover:border-orange-400 hover:bg-orange-50/60'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload size={22} className={`transition-colors ${dragOver ? 'text-orange-500' : 'text-orange-300'}`} />
              <span className="text-xs text-gray-500 text-center leading-tight">
                {uploadFile
                  ? <span className="text-orange-700 font-medium break-all">{uploadFile.name}</span>
                  : 'Arrastra un archivo o haz clic'}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {/* Info archivo */}
            {uploadFile && (
              <div className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2 text-xs">
                <span className="text-orange-700 font-medium truncate">{uploadFile.name}</span>
                <span className="text-gray-400 ml-2 whitespace-nowrap">{(uploadFile.size / 1024).toFixed(1)} KB</span>
              </div>
            )}

            {/* Botón procesar */}
            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="w-full py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {uploading
                ? <><RefreshCw size={13} className="animate-spin" /> Procesando…</>
                : <><Upload size={13} /> Procesar archivo</>}
            </button>

            {/* Botón restaurar original */}
            <button
              onClick={handleRestoreOriginal}
              disabled={uploading}
              className="w-full py-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} /> Restaurar desde Excel original
            </button>

            {/* Resultado + deshacer */}
            {uploadResult && (
              <div className="flex flex-col gap-2">
                <div className={`rounded-lg px-3 py-2.5 text-xs flex gap-2 ${
                  uploadResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {uploadResult.ok
                    ? <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                    : <AlertCircle   size={14} className="flex-shrink-0 mt-0.5" />}
                  <div>
                    <p>{uploadResult.message}</p>
                    {uploadResult.ok && uploadResult.newCount > 0 && (
                      <p className="font-semibold mt-0.5">{uploadResult.newCount} ID(s) asignado(s)</p>
                    )}
                  </div>
                </div>

                {uploadResult.ok && canUndo && (
                  <button
                    onClick={handleUndo}
                    disabled={uploading}
                    className="w-full py-1.5 rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 disabled:opacity-40 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Undo2 size={13} /> Deshacer carga
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Formato esperado */}
          <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">Columnas del archivo:</p>
            <ul className="text-xs text-gray-400 space-y-0.5 font-mono">
              {['cuenta_id','Nombre de usuario','Contraseña','Crédito',
                'Fecha de inicio','Fecha de finalización','smartTv','Estado'].map(h => (
                <li key={h} className="truncate">· {h}</li>
              ))}
            </ul>
            <p className="text-xs text-orange-500 mt-2 leading-tight">
              Deja <span className="font-mono">cuenta_id</span> vacío para cuentas nuevas.
            </p>
          </div>
        </div>

      </div>

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editing ? 'Editar Cuenta' : 'Nueva Cuenta Padre'}
                </h2>
                <p className="text-orange-100 text-sm">
                  {editing ? `Editando ${editing.cuentaId}` : 'Complete los campos de la cuenta'}
                </p>
              </div>
              <button onClick={closeForm} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Identificación */}
              <section>
                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3 border-b border-orange-100 pb-1">
                  Identificación
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ID Cuenta</label>
                    <input
                      value={form.cuentaId}
                      onChange={f('cuentaId')}
                      disabled={!!editing}
                      placeholder="Ej: M101"
                      className={`w-full px-3 py-2 border rounded-lg text-sm font-mono ${editing ? 'bg-gray-50 text-gray-400 border-gray-200' : 'border-orange-200 focus:ring-2 focus:ring-orange-400 outline-none'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Usuario</label>
                    <input value={form.nombreUsuario} onChange={f('nombreUsuario')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña</label>
                    <input value={form.contrasena} onChange={f('contrasena')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm font-mono" />
                  </div>
                </div>
              </section>

              {/* Detalles */}
              <section>
                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3 border-b border-orange-100 pb-1">
                  Detalles de Cuenta
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Crédito</label>
                    <input type="number" min="0" value={form.credito} onChange={f('credito')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">SmartTV</label>
                    <input value={form.smartTv} onChange={f('smartTv')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                    <select value={form.estado} onChange={f('estado')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white">
                      <option value="">—</option>
                      <option>Válido</option>
                      <option>Vencido</option>
                      <option>Inactivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Inicio</label>
                    <input type="date" value={form.fechaInicio} onChange={f('fechaInicio')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Fin</label>
                    <input type="date" value={form.fechaFin} onChange={f('fechaFin')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                </div>
              </section>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow transition-colors"
                >
                  {editing ? 'Guardar cambios' : 'Crear cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Capacidad · Ocupación de Cuentas Padre ───────────────────────── */}
      {ocupacion && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-sky-500 to-sky-700 rounded-xl p-2.5 shadow-md">
              <Layers size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-accent">Capacidad · Ocupación de Cuentas Padre</h2>
              <p className="text-sm text-gray-500">La rentabilidad marginal del negocio depende de cuántas pantallas de cada cuenta están realmente generando ingreso — el costo ya está pagado</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <BiCardCP icon={Layers} variant="solid" label="Capacidad instalada"
              value={`${ocupacion.totalCapacidad} pantallas`}
              sub="cupos comprados en todas las cuentas padre"
              tag={{ tone: 'info', text: 'Infraestructura disponible' }}
            />
            <BiCardCP icon={Monitor} variant="light" label="Pantallas activas"
              value={ocupacion.totalOcupadas}
              sub={`generando ingreso hoy · ${ocupacion.pctOcupacionGlobal}% de la capacidad`}
              tag={tagOcupacionCP(ocupacion.pctOcupacionGlobal)}
            />
            <BiCardCP icon={TrendingUp} variant="outline" label="Pantallas libres"
              value={ocupacion.totalLibres}
              sub="disponibles para activar sin comprar más créditos"
              tag={ocupacion.totalLibres > 0
                ? { tone: 'good', text: `${ocupacion.totalLibres} ventas posibles hoy sin costo adicional` }
                : { tone: 'warn', text: 'Capacidad agotada — recargar pronto' }}
            />
            <BiCardCP icon={Percent} variant={ocupacion.pctOcupacionGlobal >= 92 ? 'outline' : 'solid'} label="Tasa de ocupación"
              value={`${ocupacion.pctOcupacionGlobal}%`}
              sub={`${ocupacion.detalle.filter(c => c.pctOcupacion >= 100).length} cuentas llenas · ${ocupacion.detalle.filter(c => c.pctOcupacion < 50).length} con baja ocupación`}
              tag={tagOcupacionCP(ocupacion.pctOcupacionGlobal)}
            />
          </div>

          <Card className="border-sky-100">
            <CardHeader className="border-sky-50">
              <CardTitle>Ocupación por cuenta padre</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">Pantallas activas vs. capacidad total por cuenta — en naranja las cuentas con alta disponibilidad libre</p>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={Math.max(180, ocupacion.detalle.length * 26)}>
                <ComposedChart
                  data={ocupacion.detalle.map((c, i) => ({
                    nombre: `CP-${String(i + 1).padStart(2, '0')}`,
                    cuentaId: c.cuentaId,
                    ocupadas: c.ocupadas,
                    libres: c.libres,
                    capacidad: c.capacidad,
                    pct: c.pctOcupacion,
                  }))}
                  layout="vertical"
                  margin={{ top: 4, right: 40, left: 48, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#bae6fd" opacity={0.4} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#78716c' }} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: '#78716c' }} width={42} />
                  <Tooltip
                    formatter={(v, name) => [v, name === 'ocupadas' ? 'Activas' : 'Libres']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.cuentaId || ''}
                  />
                  <Bar dataKey="ocupadas" name="Activas" stackId="a" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="libres"   name="Libres"  stackId="a" fill="#fed7aa" radius={[0, 4, 4, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
              <ChartInsightCP text={narrarCapacidadCP(ocupacion)} />
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
