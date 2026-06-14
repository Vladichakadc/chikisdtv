import { useEffect, useState, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search, Plus, Pencil, Trash2, X,
  DollarSign, ShoppingCart, RotateCcw, Zap,
  ChevronUp, ChevronDown, ChevronsUpDown, Sparkles, Calendar
} from 'lucide-react'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Card, CardBody } from '../../components/ui/Card'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { formatDate, formatCurrency } from '../../utils/excelUtils'
import { cn } from '../../utils/cn'

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
  { key: 'tipoFire',       label: 'Tipo Fire' },
  { key: 'idPantalla',     label: 'ID Pantalla' },
  { key: 'nickname',       label: 'Nickname' },
  { key: 'cuentaId',       label: 'Cta. ID' },
  { key: 'cuenta',         label: 'Cuenta' },
  { key: 'estado',         label: 'Estado' },
  { key: 'cortesia',       label: 'Cortesía' },
  { key: 'pantallas',      label: '#' },
  { key: 'fechaAlta',      label: 'Alta' },
  { key: 'fecha',          label: 'Fecha' },
  { key: 'anio',           label: 'Año' },
  { key: 'mes',            label: 'Mes' },
  { key: 'precioVenta',    label: 'Precio' },
  { key: 'medioPago',      label: 'Medio Pago' },
  { key: 'itemQuantity',   label: 'Cant.' },
  { key: 'tipoPago',       label: 'Tipo Pago' },
  { key: 'tipoPlan',       label: 'Plan' },
  { key: 'tipoPantalla',   label: 'Tipo Pantalla' },
  { key: 'cuentaDedicada', label: 'Cta. Dedicada' },
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
            className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-100 transition-colors"
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
      return <span className="font-mono text-xs font-bold text-orange-700">{v}</span>
    case 'idPantalla':
    case 'cuentaId':
    case 'sku':
      return <span className="font-mono text-xs">{v || '—'}</span>
    case 'nombre':
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
    case 'cortesia':
    case 'cuentaDedicada':
      return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
          ${v === 'SI' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
          {v || '—'}
        </span>
      )
    case 'precioVenta':
      return <span className="font-semibold text-orange-700 whitespace-nowrap">{fmtCOP(v)}</span>
    case 'tipoPago':
      return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
          ${v === 'Renovacion' ? 'bg-blue-100 text-blue-700'
          : v?.startsWith('Activacion') ? 'bg-orange-100 text-orange-700'
          : 'bg-gray-100 text-gray-500'}`}>
          {v || '—'}
        </span>
      )
    case 'pantallas':
    case 'itemQuantity':
    case 'anio':
      return <span className="block text-center">{v ?? '—'}</span>
    case 'fechaAlta':
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
  cuentaId: '', cuenta: '', estado: 'Activo', cortesia: '',
  pantallas: '', fechaAlta: '', fecha: '',
  anio: '', mes: '', precioVenta: '', medioPago: '',
  itemQuantity: 1, tipoPago: '', tipoPlan: '',
  tipoPantalla: '', cuentaDedicada: '',
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { showToast } = useUi()
  const location = useLocation()
  const navigate = useNavigate()
  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  // `null` = todos los años (sin filtro). Array = subconjunto explícito seleccionado.
  const [selectedYears, setSelectedYears] = useState(null)
  const [yearMenuOpen, setYearMenuOpen] = useState(false)
  const yearMenuRef = useRef(null)
  const [sortCol, setSortCol]   = useState('fecha')
  const [sortDir, setSortDir]   = useState('desc')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [prefillNote, setPrefillNote] = useState(null)

  const [nicknames, setNicknames] = useState([])
  const [clientesTabla, setClientesTabla] = useState([])
  const [promosPlanificador, setPromosPlanificador] = useState([])

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/admin/payments/ventas-licencia')
      setRows(data)

      const resNicks = await api.get('/admin/bajas/nicknames')
      setNicknames(resNicks.data || [])

      const resClientes = await api.get('/admin/clients/tabla-clientes')
      setClientesTabla(resClientes.data || [])

      // Promos registradas en "Editar Pantalla" del Planificador (campo Tipo de Plan, p. ej. "3+1")
      const resPlanificador = await api.get('/admin/planificador')
      const promos = new Set((resPlanificador.data?.pantallas || []).map(p => (p.tipoPlan || '').trim()).filter(Boolean))
      setPromosPlanificador([...promos])
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Si llegamos desde una tarjeta inteligente del Planificador (con datos de cliente/pantalla
  // ya armados), abre "Nueva Venta" pre-cargada en cuanto los catálogos terminen de cargar,
  // y limpia el estado de navegación para que un refresh no la vuelva a abrir.
  useEffect(() => {
    const prefill = location.state?.prefillVenta
    if (prefill && !loading) {
      openNew(prefill, location.state?.prefillSource || null)
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, loading])

  // Cierra el menú de años al hacer clic fuera de él
  useEffect(() => {
    if (!yearMenuOpen) return
    const handler = (e) => {
      if (yearMenuRef.current && !yearMenuRef.current.contains(e.target)) {
        setYearMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [yearMenuOpen])

  const handleSort = (key) => {
    if (key === 'acciones') return
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(key); setSortDir('asc') }
  }

  // `extra` permite pre-cargar el formulario (p. ej. desde una tarjeta inteligente del
  // Planificador): se completan los datos conocidos de cliente/pantalla y se enriquecen
  // con la misma lógica de autocompletado que el selector de Nickname (SKU, Tipo Fire,
  // Tipo Pantalla…), sin sobreescribir lo que ya viene explícito en `extra`.
  const openNew = async (extra = null, sourceLabel = null) => {
    setEditing(null)
    const now = new Date()
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    let next = { ...EMPTY, fecha: now.toISOString().split('T')[0], anio: String(now.getFullYear()), mes: months[now.getMonth()], ...extra }

    if (extra?.nickname) {
      const found = nicknames.find(n => n.nickname === extra.nickname)
      if (found) {
        next.customerId = next.customerId || found.customerId || ''
        next.nombre = next.nombre || found.nombre || ''
        next.apellido = next.apellido || found.apellido || ''
        next.idPantalla = next.idPantalla || found.idPantalla || ''
        next.cuentaId = next.cuentaId || found.cuentaId || ''
        next.cuenta = next.cuenta || found.cuenta || ''
        const numPantallas = Number(found.pantallas)
        next.pantallas = next.pantallas || found.pantallas || ''
        if (numPantallas === 1 || numPantallas === 2) next.cuentaDedicada = 'NO'
        else if (numPantallas === 3) next.cuentaDedicada = 'SI'
      }
      const lastVenta = lastVentaForNickname(extra.nickname)
      next.sku = next.sku || lastVenta?.sku || found?.sku || ''
      next.tipoFire = next.tipoFire || lastVenta?.tipoFire || ''
      next.cortesia = next.cortesia || lastVenta?.cortesia || found?.cortesia || 'NO'
      const tipoCliente = tipoClienteForCustomerId(next.customerId)
      if (tipoCliente) next.tipoPantalla = next.tipoPantalla || tipoCliente
    }

    setForm(next)
    setPrefillNote(sourceLabel)
    setShowForm(true)
    try {
      const { data } = await api.get('/admin/payments/ventas-licencia/next-id')
      setForm(f => ({ ...f, idVM: data.nextId }))
    } catch (e) { console.error(e) }
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({ ...EMPTY, ...row })
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setPrefillNote(null) }

  // Busca en la tabla de pagos (ventas) el registro más reciente de un nickname dado
  const lastVentaForNickname = (nick) => {
    const target = (nick || '').trim().toLowerCase()
    const matches = rows.filter(r => (r.nickname || '').trim().toLowerCase() === target)
    if (!matches.length) return null
    return [...matches].sort((a, b) => {
      const da = a.fecha || a.fechaAlta || ''
      const db = b.fecha || b.fechaAlta || ''
      if (da !== db) return da < db ? 1 : -1
      return (b.idVM || '').localeCompare(a.idVM || '')
    })[0]
  }

  // Busca en la tabla de pagos el Tipo Fire más reciente asociado a un SKU dado
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

      if (field === 'nickname') {
        const found = nicknames.find(n => n.nickname === val)
        if (found) {
          next.customerId = found.customerId || prev.customerId
          next.nombre = found.nombre || prev.nombre
          next.apellido = found.apellido || prev.apellido
          next.idPantalla = found.idPantalla || prev.idPantalla
          next.cuentaId = found.cuentaId || prev.cuentaId
          next.cuenta = found.cuenta || prev.cuenta
          // # de pantallas del Planificador → campo Pantallas
          const numPantallas = Number(found.pantallas)
          next.pantallas = found.pantallas || prev.pantallas
          // Según el # de pantallas del Planificador: 1 o 2 → Cuenta Dedicada "NO", 3 → "SI"
          if (numPantallas === 1 || numPantallas === 2) next.cuentaDedicada = 'NO'
          else if (numPantallas === 3) next.cuentaDedicada = 'SI'
        }
        // El SKU, Tipo Fire y Cortesía se traen del último registro de esta nickname en la tabla de pagos
        const lastVenta = lastVentaForNickname(val)
        next.sku = lastVenta?.sku || found?.sku || prev.sku
        next.tipoFire = lastVenta?.tipoFire || prev.tipoFire
        next.cortesia = lastVenta?.cortesia || found?.cortesia || prev.cortesia || 'NO'

        // Tipo Pantalla validado en la Tabla Cliente según el ID Cliente
        const tipoCliente = tipoClienteForCustomerId(next.customerId)
        if (tipoCliente) next.tipoPantalla = tipoCliente
      }

      if (field === 'customerId') {
        const tipoCliente = tipoClienteForCustomerId(val)
        if (tipoCliente) next.tipoPantalla = tipoCliente
      }

      if (field === 'sku') {
        if (SKU_TIPO_FIRE[val]) {
          next.tipoFire = SKU_TIPO_FIRE[val]
        } else {
          // Cliente nuevo: el Tipo Fire se busca según los registros existentes con ese SKU
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
        const { data } = await api.put(`/admin/payments/ventas-licencia/${editing.idVM}`, form)
        setRows(prev => prev.map(r => r.idVM === editing.idVM ? data : r))
        showToast('Venta actualizada correctamente.', 'success')
      } else {
        const { data } = await api.post('/admin/payments/ventas-licencia', form)
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
      await api.delete(`/admin/payments/ventas-licencia/${idVM}`)
      setRows(prev => prev.filter(r => r.idVM !== idVM))
      showToast('Venta eliminada correctamente.', 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  // Opciones de dispositivo (SKU): valores distintos ya registrados en la tabla de pagos + variantes ONN
  const skuOptions = useMemo(() => {
    const set = new Set(rows.map(r => (r.sku || '').trim()).filter(Boolean))
    Object.keys(SKU_TIPO_FIRE).forEach(k => set.add(k))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [rows])

  // Opciones de Tipo de Plan: valores distintos ya registrados en la tabla de pagos,
  // más las promociones ingresadas en "Editar Pantalla" del Planificador (p. ej. "3+1")
  const tipoPlanOptions = useMemo(() => {
    const set = new Set(rows.map(r => (r.tipoPlan || '').trim()).filter(Boolean))
    promosPlanificador.forEach(p => set.add(p))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [rows, promosPlanificador])

  // Opciones de Medio de Pago: valores distintos ya registrados en la tabla de pagos
  const medioPagoOptions = useMemo(() => {
    const set = new Set(rows.map(r => (r.medioPago || '').trim()).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [rows])

  // Opciones de Año: valores distintos ya registrados en la tabla de pagos, más recientes primero
  const yearOptions = useMemo(() => {
    const set = new Set(rows.map(r => String(r.anio || '').trim()).filter(Boolean))
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [rows])

  const isYearSelected = (year) => selectedYears === null || selectedYears.includes(year)
  const allYearsSelected = selectedYears === null || selectedYears.length === yearOptions.length

  const toggleYear = (year) => {
    setSelectedYears(prev => {
      const effective = prev === null ? yearOptions : prev
      const next = effective.includes(year) ? effective.filter(y => y !== year) : [...effective, year]
      return next.length === yearOptions.length ? null : next
    })
  }

  const toggleAllYears = () => {
    setSelectedYears(prev => {
      const allSelected = prev === null || prev.length === yearOptions.length
      return allSelected ? [] : null
    })
  }

  const yearFilterLabel = selectedYears === null
    ? 'Todos los años'
    : selectedYears.length === 0
      ? 'Ningún año'
      : selectedYears.length === 1
        ? selectedYears[0]
        : `${selectedYears.length} años`

  // Resultado de búsqueda (sin ordenar todavía) — sirve de base tanto para la tabla como para las tarjetas
  const searched = useMemo(() => {
    let result = rows
    if (selectedYears !== null) {
      result = result.filter(r => selectedYears.includes(String(r.anio || '')))
    }
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(r =>
        (r.idVM || '').toLowerCase().includes(s) ||
        (r.customerId || '').toString().toLowerCase().includes(s) ||
        (r.nombre || '').toLowerCase().includes(s) ||
        (r.apellido || '').toLowerCase().includes(s) ||
        (r.nickname || '').toLowerCase().includes(s) ||
        (r.idPantalla || '').toLowerCase().includes(s) ||
        (r.cuenta || '').toLowerCase().includes(s)
      )
    }
    return result
  }, [rows, search, selectedYears])

  // Las tarjetas inteligentes reflejan el resultado filtrado por la búsqueda y el año
  const stats = useMemo(() => {
    const total       = searched.length
    const ingresos    = searched.reduce((s, r) => s + (Number(r.precioVenta) || 0), 0)
    const renovaciones = searched.filter(r => r.tipoPago === 'Renovacion').length
    const activaciones = searched.filter(r => r.tipoPago?.startsWith('Activacion')).length
    return { total, ingresos, renovaciones, activaciones }
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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-accent">Pagos</h1>
          <p className="text-gray-500">Ventas de licencias IPTV · {stats.total.toLocaleString()} registros</p>
        </div>
        <button
          onClick={() => openNew()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-dark text-white text-sm font-medium transition-colors shadow-sm hover:shadow-md"
        >
          <Plus size={16} /> Nueva Venta
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ShoppingCart} label="Total Registros"  value={stats.total.toLocaleString()}          variant="solid"   sub={(search || selectedYears !== null) ? 'Resultados filtrados' : 'Histórico completo'} />
        <StatCard icon={DollarSign}   label="Ingresos Totales" value={fmtCOP(stats.ingresos)}                variant="light"   sub="Licencias vendidas" />
        <StatCard icon={RotateCcw}    label="Renovaciones"     value={stats.renovaciones.toLocaleString()}   variant="outline" sub="Clientes recurrentes" />
        <StatCard icon={Zap}          label="Activaciones"     value={stats.activaciones.toLocaleString()}   variant="light"   sub="Nuevas pantallas" />
      </div>

      {/* Búsqueda y filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ID, nombre, nickname, pantalla, cuenta…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-orange-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all"
          />
        </div>

        {/* Filtro por Año (selección múltiple) */}
        <div className="relative" ref={yearMenuRef}>
          <button
            type="button"
            onClick={() => setYearMenuOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2.5 border border-orange-200 rounded-xl bg-white shadow-sm hover:bg-orange-50 text-sm font-medium text-gray-700 transition-colors"
          >
            <Calendar size={16} className="text-orange-500" />
            <span>Año: <strong className="text-brand-accent">{yearFilterLabel}</strong></span>
            <ChevronDown size={14} className={cn('text-gray-400 transition-transform', yearMenuOpen && 'rotate-180')} />
          </button>

          {yearMenuOpen && (
            <div className="absolute z-20 mt-2 w-44 rounded-xl border border-orange-100 bg-white shadow-lg p-1.5">
              <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-orange-50 cursor-pointer text-sm font-semibold text-brand-accent border-b border-gray-100 mb-1">
                <input
                  type="checkbox"
                  checked={allYearsSelected}
                  onChange={toggleAllYears}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                />
                Seleccionar todos
              </label>
              <div className="max-h-56 overflow-auto">
                {yearOptions.map(year => (
                  <label key={year} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-orange-50 cursor-pointer text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={isYearSelected(year)}
                      onChange={() => toggleYear(year)}
                      className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                    />
                    {year}
                  </label>
                ))}
                {yearOptions.length === 0 && (
                  <p className="px-2.5 py-1.5 text-xs text-gray-400">Sin datos</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <Card className="shadow-lg border-orange-100 overflow-hidden">
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3" />
              <p className="text-gray-500">Cargando ventas…</p>
            </div>
          ) : error ? (
            <p className="p-8 text-center text-red-500">{error}</p>
          ) : (
            <div className="overflow-auto max-h-[34rem] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-200 hover:[&::-webkit-scrollbar-thumb]:bg-orange-300">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-white">
                    {COLS.map(col => (
                      <th
                        key={col.key}
                        scope="col"
                        onClick={() => handleSort(col.key)}
                        className={`sticky top-0 z-10 bg-orange-600 px-3 py-3 font-semibold whitespace-nowrap transition-colors select-none shadow-[0_1px_0_0_rgba(0,0,0,0.08)] ${col.key !== 'acciones' ? 'cursor-pointer hover:bg-orange-700' : ''}`}
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
                      className={`border-b border-orange-50 hover:bg-orange-50/70 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}`}
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

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4">
            {/* Header modal */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editing ? 'Editar Venta' : 'Nueva Venta'}
                </h2>
                <p className="text-orange-100 text-sm">
                  {editing ? `Editando ${editing.idVM}` : 'Complete todos los campos'}
                </p>
              </div>
              <button onClick={closeForm} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                <X size={20} />
              </button>
            </div>

            {prefillNote && (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                <Sparkles size={14} className="shrink-0" />
                <span>Datos pre-cargados automáticamente desde el Planificador · categoría <strong>{prefillNote}</strong>. Verifica y completa lo que falte antes de guardar.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Sección: Identificación */}
              <section>
                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3 border-b border-orange-100 pb-1">
                  Identificación
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ID Venta</label>
                    <input
                      value={form.idVM}
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ID Cliente</label>
                    <input value={form.customerId} onChange={f('customerId')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
                    <select value={form.sku} onChange={f('sku')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm font-mono bg-white">
                      <option value="">Seleccionar dispositivo…</option>
                      {form.sku && !skuOptions.includes(form.sku) && (
                        <option value={form.sku}>{form.sku} (actual)</option>
                      )}
                      {skuOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    {form.nickname && !lastVentaForNickname(form.nickname)?.sku && !nicknames.find(n => n.nickname === form.nickname)?.sku && (
                      <p className="text-[11px] text-orange-500 mt-1">Cliente nuevo · seleccione el dispositivo</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ID Pantalla</label>
                    <input value={form.idPantalla} onChange={f('idPantalla')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta ID</label>
                    <input value={form.cuentaId} onChange={f('cuentaId')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta</label>
                    <input value={form.cuenta} onChange={f('cuenta')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                </div>
              </section>

              {/* Sección: Cliente */}
              <section>
                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3 border-b border-orange-100 pb-1">
                  Cliente
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                    <input value={form.nombre} onChange={f('nombre')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Apellido</label>
                    <input value={form.apellido} onChange={f('apellido')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nickname</label>
                    <select value={form.nickname} onChange={f('nickname')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white">
                      <option value="">Seleccionar nickname…</option>
                      {form.nickname && !nicknames.some(n => n.nickname === form.nickname) && (
                        <option value={form.nickname}>{form.nickname} (actual)</option>
                      )}
                      {nicknames.map(n => (
                        <option key={n.nickname} value={n.nickname}>{n.nickname}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Fire</label>
                    <select value={form.tipoFire} onChange={f('tipoFire')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white">
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                    <select value={form.estado} onChange={f('estado')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white">
                      <option value="">—</option>
                      <option>Activo</option>
                      <option>Desactivado</option>
                      <option>Baja</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cortesía</label>
                    <select value={form.cortesia} onChange={f('cortesia')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white">
                      <option value="">—</option>
                      <option>SI</option>
                      <option>NO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pantallas</label>
                    <input type="number" min="1" value={form.pantallas} onChange={f('pantallas')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Pantalla</label>
                    <input value={form.tipoPantalla} onChange={f('tipoPantalla')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Dedicada</label>
                    <select value={form.cuentaDedicada} onChange={f('cuentaDedicada')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white">
                      <option value="">—</option>
                      <option>SI</option>
                      <option>NO</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Sección: Pago */}
              <section>
                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3 border-b border-orange-100 pb-1">
                  Pago y Fechas
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                    <input type="date" value={form.fecha} onChange={f('fecha')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Fecha de Alta <span className="text-gray-400 font-normal normal-case">(opcional)</span>
                    </label>
                    <input type="date" value={form.fechaAlta} onChange={f('fechaAlta')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Año</label>
                    <input value={form.anio} onChange={f('anio')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mes</label>
                    <select value={form.mes} onChange={f('mes')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white">
                      <option value="">—</option>
                      {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map(m => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Precio Venta</label>
                    <CurrencyInput value={form.precioVenta} onChange={f('precioVenta')} decimals={0}
                      className="border-orange-200 focus:ring-orange-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Medio de Pago</label>
                    <select value={form.medioPago} onChange={f('medioPago')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white">
                      <option value="">—</option>
                      {form.medioPago && !medioPagoOptions.includes(form.medioPago) && (
                        <option value={form.medioPago}>{form.medioPago} (actual)</option>
                      )}
                      {medioPagoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                    <input type="number" min="1" value={form.itemQuantity} onChange={f('itemQuantity')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Pago</label>
                    <select value={form.tipoPago} onChange={f('tipoPago')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white">
                      <option value="">—</option>
                      <option>Renovacion</option>
                      <option>Activacion</option>
                      <option>Activacion Pantalla</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Plan</label>
                    <select value={form.tipoPlan} onChange={f('tipoPlan')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white">
                      <option value="">—</option>
                      {form.tipoPlan && !tipoPlanOptions.includes(form.tipoPlan) && (
                        <option value={form.tipoPlan}>{form.tipoPlan} (actual)</option>
                      )}
                      {tipoPlanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Botones */}
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
                  {editing ? 'Guardar cambios' : 'Crear venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
