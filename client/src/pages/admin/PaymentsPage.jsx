import { useEffect, useState, useMemo, useRef } from 'react'
import { todayStr } from '../../utils/dateUtils'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search, Plus, Pencil, Trash2, X,
  DollarSign, ShoppingCart, RotateCcw, Zap,
  ChevronUp, ChevronDown, ChevronsUpDown, Sparkles, Calendar
} from 'lucide-react'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { formatDate, formatCurrency } from '../../utils/excelUtils'
import { cn } from '../../utils/cn'


// ─── Icono de orden ───────────────────────────────────────────────────────────

function SortIcon({ colKey, sortCol, sortDir }) {
  if (sortCol !== colKey) return <ChevronsUpDown size={13} className="opacity-40 flex-shrink-0" />
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="flex-shrink-0" />
    : <ChevronDown size={13} className="flex-shrink-0" />
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCOP = (v) => (v == null || v === '' ? '—' : formatCurrency(v))

const CSS = `
  @keyframes pg-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes pg-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes pg-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  @keyframes pg-drawer-in { from { transform:translateX(100%) } to { transform:translateX(0) } }
  @keyframes pg-fade-in { from { opacity:0 } to { opacity:1 } }
  .pg-a1 { animation: pg-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .pg-a2 { animation: pg-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .pg-orb-1 { animation: pg-orb-1 8s ease-in-out infinite }
  .pg-orb-2 { animation: pg-orb-2 11s ease-in-out infinite }
  .pg-cta {
    background: linear-gradient(135deg, #10b981, #059669);
    box-shadow: 0 4px 18px rgba(16,185,129,.4);
    transition: all .22s ease; border: none;
  }
  .pg-cta:hover { box-shadow: 0 7px 24px rgba(16,185,129,.55); transform: translateY(-2px) }
  .pg-overlay { animation: pg-fade-in .2s ease both }
  .pg-drawer { animation: pg-drawer-in .3s cubic-bezier(.22,1,.36,1) both }
  @media (prefers-reduced-motion: reduce) {
    .pg-a1, .pg-a2, .pg-orb-1, .pg-orb-2, .pg-overlay, .pg-drawer { animation: none !important; transition: none !important }
  }
`

function PagoCard({ icon: Icon, label, value, sub, variant, onClick }) {
  const isSolid = variant === 'solid'
  const isOutline = variant === 'outline'
  
  const containerClass = `relative bg-white rounded-2xl overflow-hidden select-none transition-all duration-300
    ${isSolid ? 'shadow-md border border-slate-100' : isOutline ? 'bg-emerald-50 border border-emerald-200' : 'border border-slate-200 shadow-sm'}
    ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50' : ''}`

  const topBorder = isSolid 
    ? 'linear-gradient(90deg, #10b981, #059669)'
    : 'linear-gradient(90deg, #34d39980, #10b98180)'

  return (
    <div className={containerClass} onClick={onClick}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: topBorder }} />
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[10px] font-bold tracking-[.14em] uppercase mb-1 ${isOutline ? 'text-emerald-600' : 'text-slate-400'}`}>
            {label}
          </p>
          <p className="text-3xl font-extrabold text-slate-800 tabular-nums leading-none mt-1">
            {value}
          </p>
          {sub && (
            <p className={`text-xs mt-2 font-medium ${isOutline ? 'text-emerald-600' : 'text-slate-500'}`}>
              {sub}
            </p>
          )}
          {onClick && (
            <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors">
              <span>¿Cómo se calcula?</span>
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${isSolid ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-50 text-emerald-600'}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

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

// ─── Meses (orden cronológico) ─────────────────────────────────────────────

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Normaliza para comparar meses sin distinguir mayúsculas/minúsculas (hay registros
// históricos con el mes en minúscula, p. ej. "julio" en vez de "Julio")
const normMes = (s) => (s || '').toString().trim().toLowerCase()

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
  // `null` = todos los meses (sin filtro). Array = subconjunto explícito seleccionado.
  const [selectedMonths, setSelectedMonths] = useState(null)
  const [monthMenuOpen, setMonthMenuOpen] = useState(false)
  const monthMenuRef = useRef(null)
  const [sortCol, setSortCol]   = useState('fecha')
  const [sortDir, setSortDir]   = useState('desc')
  const [explain, setExplain]   = useState(null)
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

  // Cierra el menú de meses al hacer clic fuera de él
  useEffect(() => {
    if (!monthMenuOpen) return
    const handler = (e) => {
      if (monthMenuRef.current && !monthMenuRef.current.contains(e.target)) {
        setMonthMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [monthMenuOpen])

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
    let next = { ...EMPTY, fecha: todayStr(), anio: String(now.getFullYear()), mes: MESES[now.getMonth()], ...extra }

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
        next.mes = MESES[parseInt(val.slice(5, 7), 10) - 1] || ''
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

  // Opciones de Mes: valores distintos ya registrados en la tabla de pagos, en orden cronológico
  const monthOptions = useMemo(() => {
    const set = new Set(rows.map(r => normMes(r.mes)).filter(Boolean))
    return MESES.filter(m => set.has(normMes(m)))
  }, [rows])

  const isMonthSelected = (month) => selectedMonths === null || selectedMonths.includes(month)
  const allMonthsSelected = selectedMonths === null || selectedMonths.length === monthOptions.length

  const toggleMonth = (month) => {
    setSelectedMonths(prev => {
      const effective = prev === null ? monthOptions : prev
      const next = effective.includes(month) ? effective.filter(m => m !== month) : [...effective, month]
      return next.length === monthOptions.length ? null : next
    })
  }

  const toggleAllMonths = () => {
    setSelectedMonths(prev => {
      const allSelected = prev === null || prev.length === monthOptions.length
      return allSelected ? [] : null
    })
  }

  const monthFilterLabel = selectedMonths === null
    ? 'Todos los meses'
    : selectedMonths.length === 0
      ? 'Ningún mes'
      : selectedMonths.length === 1
        ? selectedMonths[0]
        : `${selectedMonths.length} meses`

  // Resultado de búsqueda (sin ordenar todavía) — sirve de base tanto para la tabla como para las tarjetas
  const searched = useMemo(() => {
    let result = rows
    if (selectedYears !== null) {
      result = result.filter(r => selectedYears.includes(String(r.anio || '')))
    }
    if (selectedMonths !== null) {
      const wanted = new Set(selectedMonths.map(normMes))
      result = result.filter(r => wanted.has(normMes(r.mes)))
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
  }, [rows, search, selectedYears, selectedMonths])

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
      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="pg-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#064e3b 0%,#022c22 100%)' }}>
        <div className="pg-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#10b981,transparent 70%)' }} />
        <div className="pg-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.15] pointer-events-none" style={{ background: 'radial-gradient(circle,#059669,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 mb-4">
              <DollarSign size={12} className="text-emerald-300" />
              <span className="text-emerald-300 text-xs font-semibold tracking-widest uppercase">Finanzas</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Pagos
            </h1>
            <p className="text-emerald-100/70 text-sm mt-2">
              Ventas de licencias IPTV · {stats.total.toLocaleString()} registros
            </p>
          </div>
          <button onClick={() => openNew()} className="pg-cta px-5 py-2.5 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
            <Plus size={18} /> Nueva Venta
          </button>
        </div>
      </div>

      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PagoCard icon={ShoppingCart} label="Total Registros"  value={stats.total.toLocaleString()}          variant="solid"   sub={(search || selectedYears !== null || selectedMonths !== null) ? 'Resultados filtrados' : 'Histórico completo'}
          onClick={() => setExplain({
            title: 'Total Registros', value: stats.total.toLocaleString(), icon: ShoppingCart,
            queEs: 'Cuántas ventas de licencias hay en la vista actual. Si tienes un filtro de búsqueda, año o mes activo, el número refleja solo lo filtrado.',
            comoSeCalcula: 'Conteo simple de las filas de la tabla de ventas que pasan el filtro activo. **Sin filtros, coincide con el histórico completo.**',
            origen: 'Tabla de ventas de licencias de este módulo (importada del Excel original y alimentada con cada venta nueva).',
          })} />
        <PagoCard icon={DollarSign}   label="Ingresos Totales" value={fmtCOP(stats.ingresos)}                variant="light"   sub="Licencias vendidas"
          onClick={() => setExplain({
            title: 'Ingresos Totales', value: fmtCOP(stats.ingresos), icon: DollarSign,
            queEs: 'La plata que ha entrado por ventas de licencias en la vista actual (filtros incluidos).',
            comoSeCalcula: 'Se **suma el precio de venta** de cada registro visible. Sin filtros activos, este número es el mismo "Ingresos históricos" que muestran el Dashboard y Análisis Financiero — todos beben de la misma tabla.',
            origen: 'Campo precio de venta de cada fila de este módulo.',
          })} />
        <PagoCard icon={RotateCcw}    label="Renovaciones"     value={stats.renovaciones.toLocaleString()}   variant="outline" sub="Clientes recurrentes"
          onClick={() => setExplain({
            title: 'Renovaciones', value: stats.renovaciones.toLocaleString(), icon: RotateCcw,
            queEs: 'Ventas de clientes que ya estaban y volvieron a pagar — el ingreso recurrente y más barato de conseguir.',
            comoSeCalcula: 'Se cuentan los registros visibles cuyo **tipo de pago es "Renovacion"**.',
            origen: 'Campo tipo de pago de cada venta de este módulo.',
          })} />
        <PagoCard icon={Zap}          label="Activaciones"     value={stats.activaciones.toLocaleString()}   variant="light"   sub="Nuevas pantallas"
          onClick={() => setExplain({
            title: 'Activaciones', value: stats.activaciones.toLocaleString(), icon: Zap,
            queEs: 'Ventas que representan pantallas o clientes nuevos — el motor de crecimiento de la base.',
            comoSeCalcula: 'Se cuentan los registros visibles cuyo tipo de pago **empieza por "Activacion"** (incluye "Activacion" y "Activacion Pantalla").',
            origen: 'Campo tipo de pago de cada venta de este módulo.',
          })} />
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
            className="w-full pl-10 pr-4 py-2.5 border border-emerald-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all"
          />
        </div>

        {/* Filtro por Año (selección múltiple) */}
        <div className="relative" ref={yearMenuRef}>
          <button
            type="button"
            onClick={() => setYearMenuOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2.5 border border-emerald-200 rounded-xl bg-white shadow-sm hover:bg-emerald-50 text-sm font-medium text-gray-700 transition-colors"
          >
            <Calendar size={16} className="text-emerald-500" />
            <span>Año: <strong className="text-brand-accent">{yearFilterLabel}</strong></span>
            <ChevronDown size={14} className={cn('text-gray-400 transition-transform', yearMenuOpen && 'rotate-180')} />
          </button>

          {yearMenuOpen && (
            <div className="absolute z-20 mt-2 w-44 rounded-xl border border-emerald-100 bg-white shadow-lg p-1.5">
              <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer text-sm font-semibold text-brand-accent border-b border-gray-100 mb-1">
                <input
                  type="checkbox"
                  checked={allYearsSelected}
                  onChange={toggleAllYears}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
                />
                Seleccionar todos
              </label>
              <div className="max-h-56 overflow-auto">
                {yearOptions.map(year => (
                  <label key={year} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={isYearSelected(year)}
                      onChange={() => toggleYear(year)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
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

        {/* Filtro por Mes (selección múltiple) */}
        <div className="relative" ref={monthMenuRef}>
          <button
            type="button"
            onClick={() => setMonthMenuOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2.5 border border-emerald-200 rounded-xl bg-white shadow-sm hover:bg-emerald-50 text-sm font-medium text-gray-700 transition-colors"
          >
            <Calendar size={16} className="text-emerald-500" />
            <span>Mes: <strong className="text-brand-accent">{monthFilterLabel}</strong></span>
            <ChevronDown size={14} className={cn('text-gray-400 transition-transform', monthMenuOpen && 'rotate-180')} />
          </button>

          {monthMenuOpen && (
            <div className="absolute z-20 mt-2 w-48 rounded-xl border border-emerald-100 bg-white shadow-lg p-1.5">
              <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer text-sm font-semibold text-brand-accent border-b border-gray-100 mb-1">
                <input
                  type="checkbox"
                  checked={allMonthsSelected}
                  onChange={toggleAllMonths}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
                />
                Seleccionar todos
              </label>
              <div className="max-h-56 overflow-auto">
                {monthOptions.map(month => (
                  <label key={month} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={isMonthSelected(month)}
                      onChange={() => toggleMonth(month)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
                    />
                    {month}
                  </label>
                ))}
                {monthOptions.length === 0 && (
                  <p className="px-2.5 py-1.5 text-xs text-gray-400">Sin datos</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <Card className="shadow-lg border-emerald-100 overflow-hidden">
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3" />
              <p className="text-gray-500">Cargando ventas…</p>
            </div>
          ) : error ? (
            <p className="p-8 text-center text-red-500">{error}</p>
          ) : (
              <div className="overflow-auto max-h-[34rem] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-emerald-200 hover:[&::-webkit-scrollbar-thumb]:bg-emerald-300">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-white">
                      {COLS.map(col => (
                        <th
                          key={col.key}
                          scope="col"
                          onClick={() => handleSort(col.key)}
                          className={`sticky top-0 z-10 bg-emerald-600 px-3 py-3 font-semibold whitespace-nowrap transition-colors select-none shadow-[0_1px_0_0_rgba(0,0,0,0.08)] ${col.key !== 'acciones' ? 'cursor-pointer hover:bg-emerald-700' : ''}`}
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
                        className={`border-b border-emerald-50 hover:bg-emerald-50/70 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/30'}`}
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
        <div className="flex items-center justify-between border-t border-emerald-100 bg-emerald-50/40 px-4 py-2 text-xs text-gray-500">
          <span>{filtered.length.toLocaleString()} de {rows.length.toLocaleString()} registros</span>
          <span>Ordenado por <strong className="text-brand-accent">{COLS.find(c => c.key === sortCol)?.label ?? sortCol}</strong> ({sortDir === 'asc' ? '↑ ascendente' : '↓ descendente'})</span>
        </div>
      </Card>

      {/* Form Drawer (PRO MAX Drawer) */}
      {showForm && (
        <>
          <div className="pg-overlay fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={closeForm} />
          <div className="pg-drawer fixed inset-y-0 right-0 z-50 w-full md:w-[600px] bg-white shadow-2xl flex flex-col border-l border-slate-100">
            {/* Header del Drawer */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{editing ? 'Editar Venta' : 'Nueva Venta'}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {editing ? `Editando ${editing.idVM}` : 'Complete todos los campos'}
                </p>
              </div>
              <button onClick={closeForm} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {prefillNote && (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <Sparkles size={16} className="shrink-0" />
                <span>Datos pre-cargados automáticamente desde el Planificador · categoría <strong>{prefillNote}</strong>. Verifica y completa lo que falte antes de guardar.</span>
              </div>
            )}

            {/* Cuerpo del Formulario */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* Sección: Identificación */}
                <section>
                  <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-2 border-b border-emerald-100 pb-1 mb-4">
                    📋 Identificación
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Venta</label>
                      <input
                        value={form.idVM}
                        disabled
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 font-mono font-bold cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Cliente</label>
                      <input value={form.customerId} onChange={f('customerId')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                      <select value={form.sku} onChange={f('sku')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all font-mono">
                        <option value="">Seleccionar dispositivo…</option>
                        {form.sku && !skuOptions.includes(form.sku) && (
                          <option value={form.sku}>{form.sku} (actual)</option>
                        )}
                        {skuOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      {form.nickname && !lastVentaForNickname(form.nickname)?.sku && !nicknames.find(n => n.nickname === form.nickname)?.sku && (
                        <p className="text-[11px] font-semibold text-emerald-600 mt-1">Cliente nuevo · seleccione el dispositivo</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Pantalla</label>
                      <input value={form.idPantalla} onChange={f('idPantalla')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta ID</label>
                      <input value={form.cuentaId} onChange={f('cuentaId')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta</label>
                      <input value={form.cuenta} onChange={f('cuenta')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all" />
                    </div>
                  </div>
                </section>

                {/* Sección: Cliente */}
                <section>
                  <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-2 border-b border-emerald-100 pb-1 mb-4">
                    👤 Cliente
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                      <input value={form.nombre} onChange={f('nombre')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                      <input value={form.apellido} onChange={f('apellido')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
                      <select value={form.nickname} onChange={f('nickname')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Fire</label>
                      <select value={form.tipoFire} onChange={f('tipoFire')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                      <select value={form.estado} onChange={f('estado')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all">
                        <option value="">—</option>
                        <option>Activo</option>
                        <option>Desactivado</option>
                        <option>Baja</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cortesía</label>
                      <select value={form.cortesia} onChange={f('cortesia')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all">
                        <option value="">—</option>
                        <option>SI</option>
                        <option>NO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pantallas</label>
                      <input type="number" min="1" value={form.pantallas} onChange={f('pantallas')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Pantalla</label>
                      <input value={form.tipoPantalla} onChange={f('tipoPantalla')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Dedicada</label>
                      <select value={form.cuentaDedicada} onChange={f('cuentaDedicada')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all">
                        <option value="">—</option>
                        <option>SI</option>
                        <option>NO</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Sección: Pago */}
                <section>
                  <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-2 border-b border-emerald-100 pb-1 mb-4">
                    💳 Pago y Fechas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                      <input type="date" value={form.fecha} onChange={f('fecha')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Alta <span className="text-gray-400 font-normal normal-case">(opcional)</span>
                      </label>
                      <input type="date" value={form.fechaAlta} onChange={f('fechaAlta')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                      <input value={form.anio} onChange={f('anio')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                      <select value={form.mes} onChange={f('mes')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all">
                        <option value="">—</option>
                        {MESES.map(m => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta</label>
                      <CurrencyInput value={form.precioVenta} onChange={f('precioVenta')} decimals={0}
                        className="border-gray-200 focus:ring-emerald-400 w-full px-3 py-2.5 rounded-xl bg-white text-gray-800" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Medio de Pago</label>
                      <select value={form.medioPago} onChange={f('medioPago')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all">
                        <option value="">—</option>
                        {form.medioPago && !medioPagoOptions.includes(form.medioPago) && (
                          <option value={form.medioPago}>{form.medioPago} (actual)</option>
                        )}
                        {medioPagoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                      <input type="number" min="1" value={form.itemQuantity} onChange={f('itemQuantity')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pago</label>
                      <select value={form.tipoPago} onChange={f('tipoPago')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all">
                        <option value="">—</option>
                        <option>Renovacion</option>
                        <option>Activacion</option>
                        <option>Activacion Pantalla</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Plan</label>
                      <select value={form.tipoPlan} onChange={f('tipoPlan')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all">
                        <option value="">—</option>
                        {form.tipoPlan && !tipoPlanOptions.includes(form.tipoPlan) && (
                          <option value={form.tipoPlan}>{form.tipoPlan} (actual)</option>
                        )}
                        {tipoPlanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                </section>

              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="pg-cta px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md hover:shadow-lg"
                >
                  {editing ? 'Guardar cambios' : 'Crear venta'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
