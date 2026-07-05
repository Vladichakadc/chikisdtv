import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Search, Tv, CheckCircle, XCircle, Package, RefreshCw, Wallet, TrendingUp, ChevronDown } from 'lucide-react'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Card, CardBody } from '../../components/ui/Card'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatCurrency } from '../../utils/excelUtils'
import { cn } from '../../utils/cn'

// Paleta fija por referencia: el mismo color identifica a la referencia en las
// gráficas y en el punto de color de la tabla (mapeo consistente en toda la vista)
const REF_COLORS = ['#f97316', '#0ea5e9', '#16a34a', '#8b5cf6', '#ef4444', '#eab308', '#14b8a6', '#64748b']

// Un lote de "Nuevo Equipo" con Cantidad > 1 genera un campo Serie por unidad
// — todas comparten la misma Referencia/Descripción. Tope razonable para no
// romper la UI ni el formulario si alguien teclea un número desproporcionado.
const MAX_LOTE = 50

const CSS = `
  @keyframes dev-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes dev-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes dev-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  @keyframes dev-drawer-in { from { transform:translateX(100%) } to { transform:translateX(0) } }
  @keyframes dev-fade-in { from { opacity:0 } to { opacity:1 } }
  .dev-a1 { animation: dev-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .dev-a2 { animation: dev-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .dev-orb-1 { animation: dev-orb-1 8s ease-in-out infinite }
  .dev-orb-2 { animation: dev-orb-2 11s ease-in-out infinite }
  .dev-cta {
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    box-shadow: 0 4px 18px rgba(99,102,241,.4);
    transition: all .22s ease; border: none;
  }
  .dev-cta:hover { box-shadow: 0 7px 24px rgba(99,102,241,.55); transform: translateY(-2px) }
  .dev-overlay { animation: dev-fade-in .2s ease both }
  .dev-drawer { animation: dev-drawer-in .3s cubic-bezier(.22,1,.36,1) both }
  .dev-card { opacity:0; animation: dev-fade-up .55s cubic-bezier(.22,1,.36,1) both }
  .dev-card-num { font-variant-numeric: tabular-nums; }
  @keyframes dev-card-count { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
  @media (prefers-reduced-motion: reduce) {
    .dev-a1, .dev-a2, .dev-orb-1, .dev-orb-2, .dev-overlay, .dev-drawer, .dev-card { animation: none !important; transition: none !important }
  }
`

// Cada KPI tiene su propia identidad de color (no es decorativo: el color
// codifica el significado — verde = salud de stock, ámbar = dinero invertido,
// fucsia = oportunidad/ganancia, rosa = alerta/inactivo — así el usuario lee
// la fila de un vistazo sin tener que leer las etiquetas primero).
const CARD_TONES = {
  violet: {
    iconBg: 'linear-gradient(135deg,#a5b4fc,#6366f1)',
    glow: 'rgba(99,102,241,.5)',
    blob: 'radial-gradient(circle,#6366f1,transparent 72%)',
    label: 'text-indigo-300',
    bar: '#818cf8',
  },
  emerald: {
    iconBg: 'linear-gradient(135deg,#6ee7b7,#059669)',
    glow: 'rgba(16,185,129,.5)',
    blob: 'radial-gradient(circle,#10b981,transparent 72%)',
    label: 'text-emerald-300',
    bar: '#34d399',
  },
  amber: {
    iconBg: 'linear-gradient(135deg,#fcd34d,#d97706)',
    glow: 'rgba(245,158,11,.5)',
    blob: 'radial-gradient(circle,#f59e0b,transparent 72%)',
    label: 'text-amber-300',
    bar: '#fbbf24',
  },
  fuchsia: {
    iconBg: 'linear-gradient(135deg,#f9a8d4,#db2777)',
    glow: 'rgba(219,39,119,.5)',
    blob: 'radial-gradient(circle,#ec4899,transparent 72%)',
    label: 'text-fuchsia-300',
    bar: '#f472b6',
  },
  rose: {
    iconBg: 'linear-gradient(135deg,#fda4af,#e11d48)',
    glow: 'rgba(225,29,72,.5)',
    blob: 'radial-gradient(circle,#f43f5e,transparent 72%)',
    label: 'text-rose-300',
    bar: '#fb7185',
  },
  cyan: {
    iconBg: 'linear-gradient(135deg,#67e8f9,#0891b2)',
    glow: 'rgba(6,182,212,.5)',
    blob: 'radial-gradient(circle,#06b6d4,transparent 72%)',
    label: 'text-cyan-300',
    bar: '#22d3ee',
  },
}

// Tarjeta KPI "instrumento de control": vidrio oscuro + resplandor de color
// propio por métrica, coherente con el hero (mismo lenguaje visual, no un
// bloque blanco desconectado debajo de un header oscuro).
function DeviceCard({ icon: Icon, label, value, sub, tone = 'violet', delay = 0 }) {
  const t = CARD_TONES[tone] || CARD_TONES.violet
  return (
    <div
      className="dev-card group relative rounded-3xl overflow-hidden select-none bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-white/[.06] transition-all duration-300 hover:-translate-y-1.5"
      style={{ animationDelay: `${delay}ms`, boxShadow: '0 1px 0 0 rgba(255,255,255,.06) inset, 0 8px 24px -12px rgba(0,0,0,.5)' }}
    >
      <div
        className="absolute -top-10 -right-10 w-36 h-36 rounded-full opacity-40 blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-70"
        style={{ background: t.blob }}
      />
      <div
        className="absolute inset-0 opacity-[.05] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '18px 18px' }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: t.bar, boxShadow: `0 0 14px 1px ${t.glow}` }} />

      <div className="relative p-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-[10px] font-bold tracking-[.16em] uppercase mb-2', t.label)}>{label}</p>
          <p
            className="dev-card-num text-3xl font-extrabold text-white leading-none"
            style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", textShadow: `0 0 26px ${t.glow}` }}
          >
            {value}
          </p>
          {sub && <p className="text-xs mt-2 font-medium text-slate-400">{sub}</p>}
        </div>
        <div
          className="p-2.5 rounded-2xl shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
          style={{ background: t.iconBg, boxShadow: `0 6px 18px -3px ${t.glow}` }}
        >
          <Icon size={20} className="text-white" strokeWidth={2.25} />
        </div>
      </div>
    </div>
  )
}

const EMPTY = { clientId: '', subscriptionId: '', nombre: '', tipo: 'Smart TV', mac: '', activo: true, observaciones: '' }

const EMPTY_INV = {
  idInventario: '', fechaCompra: '', descripcion: '', proveedor: '', serie: '',
  cantidad: '1', costoUniCOP: '', precioSugerido: '', estado: 'En Bodega',
  costoUnitarioUSD: '', envioUSD: '', impuestosUSD: '', transporteCOP: '', trm: '',
}

export default function DevicesPage() {
  const { showToast } = useUi()
  const [tab, setTab] = useState('inventario')
  const [devices, setDevices] = useState([])
  const [inventario, setInventario] = useState([])
  const [clients, setClients] = useState([])
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [showInvForm, setShowInvForm] = useState(false)
  const [invEditing, setInvEditing] = useState(null)
  const [invForm, setInvForm] = useState(EMPTY_INV)
  const [showCostosImport, setShowCostosImport] = useState(false)
  const [savingInv, setSavingInv] = useState(false)
  const [referencias, setReferencias] = useState([])
  const [refCustom, setRefCustom] = useState(false)
  const [trmInfo, setTrmInfo] = useState(null)
  const [loadingTrm, setLoadingTrm] = useState(false)
  const [invSeries, setInvSeries] = useState([''])

  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterActivo, setFilterActivo] = useState('todos')
  const [filterEstadoInv, setFilterEstadoInv] = useState('todos')
  const [search, setSearch] = useState('')

  const stats = useMemo(() => {
    const total = devices.length
    const activos = devices.filter(d => d.activo).length
    const inactivos = devices.filter(d => !d.activo).length
    const firetv = devices.filter(d => (d.tipo || '').toLowerCase().includes('smart tv') || (d.tipo || '').toLowerCase().includes('fire')).length
    return { total, activos, inactivos, firetv }
  }, [devices])

  // Una unidad cuenta como vendida si el serial cruza con una venta de equipo
  // o si el estado manual del Excel ya no dice "En Bodega"
  const esVendido = (r) => Boolean(r.venta) || (r.estado || '').toLowerCase() !== 'en bodega'

  const invStats = useMemo(() => {
    const unidades = inventario.reduce((s, r) => s + (Number(r.cantidad) || 0), 0)
    const vendidos = inventario.filter(esVendido).length
    const enBodega = inventario.length - vendidos
    const inversion = inventario.reduce((s, r) => s + (Number(r.costoTotalCOP) || 0), 0)
    const gananciaPotencial = inventario.filter(r => !esVendido(r)).reduce((s, r) => s + (Number(r.ganancia) || 0), 0)
    return { unidades, enBodega, vendidos, inversion, gananciaPotencial }
  }, [inventario])

  const estadosInv = useMemo(
    () => [...new Set(inventario.map(r => (r.estado || '').trim()).filter(Boolean))],
    [inventario]
  )

  const refColor = useMemo(() => {
    const refs = [...new Set(inventario.map(r => (r.descripcion || 'Sin referencia').trim()))].sort()
    const map = {}
    refs.forEach((ref, i) => { map[ref] = REF_COLORS[i % REF_COLORS.length] })
    return map
  }, [inventario])

  const totalReferencias = useMemo(() => Object.keys(refColor).length, [refColor])

  // Vista previa financiera en vivo del formulario (misma aritmética del backend)
  const invPreview = useMemo(() => {
    const costoUni = Number(invForm.costoUniCOP) || 0
    const cantidad = Number(invForm.cantidad) || 1
    const precio = Number(invForm.precioSugerido) || 0
    return {
      costoTotal: costoUni * cantidad,
      ganancia: costoUni > 0 && precio > 0 ? (precio - costoUni) * cantidad : null,
      utilidadPct: costoUni > 0 && precio > 0 ? ((precio - costoUni) / costoUni) * 100 : null,
    }
  }, [invForm.costoUniCOP, invForm.cantidad, invForm.precioSugerido])

  const filteredInventario = useMemo(() => {
    return inventario.filter(r => {
      if (filterEstadoInv !== 'todos' && (r.estado || '').trim() !== filterEstadoInv) return false
      if (search) {
        const s = search.toLowerCase()
        if (!((r.descripcion || '').toLowerCase().includes(s) ||
              (r.serie || '').toLowerCase().includes(s) ||
              (r.proveedor || '').toLowerCase().includes(s) ||
              (r.idInventario || '').toLowerCase().includes(s))) return false
      }
      return true
    })
  }, [inventario, filterEstadoInv, search])

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
    const [d, c, s, inv, refs] = await Promise.all([
      api.get('/admin/devices'),
      api.get('/admin/clients'),
      api.get('/admin/subscriptions'),
      api.get('/admin/inventario-equipos'),
      api.get('/admin/inventario-equipos/referencias').catch(() => ({ data: { referencias: [] } }))
    ])
    setDevices(d.data)
    setClients(c.data.filter((x) => x.role === 'user'))
    setSubs(s.data)
    setInventario(inv.data)
    setReferencias(refs.data.referencias || [])
    setLoading(false)
  }

  // TRM del día: se consulta al abrir la sección de costos de importación y se
  // prellena el campo si está vacío (fuente oficial con respaldo local)
  const cargarTrm = async () => {
    if (trmInfo || loadingTrm) return trmInfo
    setLoadingTrm(true)
    try {
      const { data } = await api.get('/admin/inventario-equipos/trm')
      setTrmInfo(data)
      if (data.trm) setInvForm(f => (f.trm ? f : { ...f, trm: String(data.trm) }))
      return data
    } catch {
      return null
    } finally {
      setLoadingTrm(false)
    }
  }

  const toggleCostosImport = () => {
    const abrir = !showCostosImport
    setShowCostosImport(abrir)
    if (abrir) cargarTrm()
  }

  // Conversión automática USD → COP (fórmula del negocio):
  // costo unitario COP = (USD unitario + envío + impuestos) × TRM + transporte COP.
  // Mientras haya costos USD y TRM, el campo COP se calcula solo.
  const usdSubtotal = (Number(invForm.costoUnitarioUSD) || 0) + (Number(invForm.envioUSD) || 0) + (Number(invForm.impuestosUSD) || 0)
  const usdAuto = usdSubtotal > 0 && (Number(invForm.trm) || 0) > 0
  useEffect(() => {
    if (!showInvForm || !usdAuto) return
    const cop = Math.round(usdSubtotal * Number(invForm.trm) + (Number(invForm.transporteCOP) || 0))
    setInvForm(f => (String(f.costoUniCOP) === String(cop) ? f : { ...f, costoUniCOP: String(cop) }))
  }, [showInvForm, usdAuto, usdSubtotal, invForm.trm, invForm.transporteCOP])

  // Cantidad > 1 en "Nuevo Equipo" (no aplica al editar una fila existente):
  // se genera un campo Serie por unidad, todas bajo la misma Referencia/Descripción.
  const cantidadNum = Math.min(Math.max(Math.round(Number(invForm.cantidad)) || 1, 1), MAX_LOTE)
  const esLote = !invEditing && cantidadNum > 1
  useEffect(() => {
    if (!showInvForm || invEditing) return
    setInvSeries(prev => {
      if (prev.length === cantidadNum) return prev
      const next = prev.slice(0, cantidadNum)
      while (next.length < cantidadNum) next.push('')
      return next
    })
  }, [showInvForm, invEditing, cantidadNum])

  // Vista previa del rango de IDs que se asignarán al guardar el lote (los IDs
  // reales los asigna el servidor de forma atómica al momento de guardar)
  const idRangoPreview = useMemo(() => {
    if (!esLote || !invForm.idInventario) return null
    const m = String(invForm.idInventario).match(/^([a-zA-Z]*)(\d+)$/)
    if (!m) return null
    const [, prefijo, digitos] = m
    const inicio = parseInt(digitos, 10)
    const fin = inicio + cantidadNum - 1
    return `${prefijo}${String(inicio).padStart(digitos.length, '0')} – ${prefijo}${String(fin).padStart(digitos.length, '0')}`
  }, [esLote, invForm.idInventario, cantidadNum])

  useEffect(() => { load() }, [])

  const handleImportInventario = async () => {
    if (!confirm('Esto recarga el inventario desde order_inventario2026.xlsx y REEMPLAZA los datos actuales — incluidos los equipos agregados o editados manualmente. ¿Continuar?')) return
    setImporting(true)
    try {
      const { data } = await api.post('/admin/inventario-equipos/import')
      showToast(data.message, 'success')
      await load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  const openNewInv = async () => {
    setInvEditing(null)
    setShowCostosImport(false)
    setRefCustom(false)
    setInvSeries([''])
    let nextId = ''
    try {
      nextId = (await api.get('/admin/inventario-equipos/next-id')).data.nextId
    } catch {
      // El campo ya no se puede escribir a mano: sin respuesta del servidor se
      // genera un ID único localmente para no dejar el formulario bloqueado.
      nextId = `in-${Date.now()}`
      showToast('No se pudo consultar el consecutivo del servidor; se generó un ID temporal.', 'error')
    }
    setInvForm({ ...EMPTY_INV, idInventario: nextId, fechaCompra: new Date().toISOString().slice(0, 10) })
    setShowInvForm(true)
  }

  const openEditInv = (r) => {
    setInvEditing(r)
    setInvSeries([r.serie || ''])
    setRefCustom(Boolean(r.descripcion) && !referencias.some(ref => ref.toLowerCase() === (r.descripcion || '').trim().toLowerCase()))
    const tieneUSD = Boolean(r.costoUnitarioUSD || r.envioUSD || r.impuestosUSD || r.transporteCOP || r.trm)
    setShowCostosImport(tieneUSD)
    if (tieneUSD) cargarTrm()
    setInvForm({
      idInventario: r.idInventario,
      fechaCompra: r.fechaCompra || '',
      descripcion: r.descripcion || '',
      proveedor: r.proveedor || '',
      serie: r.serie || '',
      cantidad: r.cantidad != null ? String(r.cantidad) : '1',
      costoUniCOP: r.costoUniCOP != null ? String(r.costoUniCOP) : '',
      precioSugerido: r.precioSugerido != null ? String(r.precioSugerido) : '',
      estado: r.estado || 'En Bodega',
      costoUnitarioUSD: r.costoUnitarioUSD != null ? String(r.costoUnitarioUSD) : '',
      envioUSD: r.envioUSD != null ? String(r.envioUSD) : '',
      impuestosUSD: r.impuestosUSD != null ? String(r.impuestosUSD) : '',
      transporteCOP: r.transporteCOP != null ? String(r.transporteCOP) : '',
      trm: r.trm != null ? String(r.trm) : '',
    })
    setShowInvForm(true)
  }

  const handleInvSubmit = async (e) => {
    e.preventDefault()

    // Lote (Cantidad > 1, solo al crear): un equipo por serie, misma referencia
    if (esLote) {
      const series = invSeries.map(s => s.trim())
      if (series.some(s => !s)) { showToast('Ingresa la serie de cada equipo antes de guardar.', 'error'); return }
      const vistas = new Set()
      for (const s of series) {
        const clave = s.toLowerCase()
        if (vistas.has(clave)) { showToast(`La serie "${s}" está repetida — cada equipo debe tener una serie única.`, 'error'); return }
        vistas.add(clave)
      }
      setSavingInv(true)
      try {
        const { idInventario, cantidad, serie, ...compartido } = invForm
        const { data } = await api.post('/admin/inventario-equipos/bulk', { ...compartido, series })
        showToast(data.message, 'success')
        setShowInvForm(false)
        await load()
      } catch (e) {
        showToast(e.response?.data?.error || e.message, 'error')
      } finally {
        setSavingInv(false)
      }
      return
    }

    setSavingInv(true)
    try {
      if (invEditing) {
        await api.put(`/admin/inventario-equipos/${invEditing.idInventario}`, invForm)
        showToast('Equipo actualizado en el inventario.', 'success')
      } else {
        await api.post('/admin/inventario-equipos', invForm)
        showToast('Equipo guardado en el inventario.', 'success')
      }
      setShowInvForm(false)
      await load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setSavingInv(false)
    }
  }

  const handleInvDelete = async (r) => {
    if (!confirm(`¿Eliminar el equipo ${r.idInventario} (${r.descripcion || 'sin descripción'}) del inventario?`)) return
    try {
      await api.delete(`/admin/inventario-equipos/${r.idInventario}`)
      showToast('Equipo eliminado del inventario.', 'success')
      await load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

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

  // Fechas DATEONLY (YYYY-MM-DD) → DD-MM-YYYY como en el resto de la app
  const fmtFecha = (d) => {
    const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '—'
  }

  const numHead = 'text-right'
  const numCell = 'text-right tabular-nums whitespace-nowrap'

  const invColumns = [
    {
      key: 'idInventario', label: 'ID',
      render: (r) => <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">{r.idInventario}</span>
    },
    { key: 'fechaCompra', label: 'F. Compra', cellClassName: 'whitespace-nowrap text-gray-500', render: (r) => fmtFecha(r.fechaCompra) },
    {
      key: 'descripcion', label: 'Referencia',
      render: (r) => (
        <span className="flex items-center gap-2 font-medium text-brand-accent whitespace-nowrap">
          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: refColor[(r.descripcion || 'Sin referencia').trim()] || '#94a3b8' }} />
          {r.descripcion || '—'}
        </span>
      )
    },
    { key: 'proveedor', label: 'Proveedor', cellClassName: 'text-gray-500' },
    { key: 'serie', label: 'Serie', render: (r) => <span className="font-mono text-xs text-gray-500">{r.serie || '—'}</span> },
    { key: 'cantidad', label: 'Cant.', className: 'text-center', cellClassName: 'text-center tabular-nums' },
    { key: 'costoUniCOP', label: 'Costo Uni.', className: numHead, cellClassName: numCell, render: (r) => formatCurrency(r.costoUniCOP || 0) },
    { key: 'costoTotalCOP', label: 'Costo Total', className: numHead, cellClassName: numCell, render: (r) => formatCurrency(r.costoTotalCOP || 0) },
    {
      key: 'utilidadPct', label: 'Utilidad', className: numHead, cellClassName: numCell,
      render: (r) => r.utilidadPct != null
        ? (
          <span className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
            r.utilidadPct >= 50 ? 'bg-green-100 text-green-700' : r.utilidadPct >= 25 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
          )}>
            {Number(r.utilidadPct).toFixed(1)}%
          </span>
        )
        : <span className="text-gray-300">—</span>
    },
    { key: 'precioSugerido', label: 'P. Sugerido', className: numHead, cellClassName: numCell, render: (r) => <span className="font-semibold">{formatCurrency(r.precioSugerido || 0)}</span> },
    { key: 'ganancia', label: 'Ganancia', className: numHead, cellClassName: numCell, render: (r) => <span className="font-medium text-green-700">{formatCurrency(r.ganancia || 0)}</span> },
    {
      key: 'estado', label: 'Estado', className: 'text-center', cellClassName: 'text-center',
      render: (r) => esVendido(r)
        ? <Badge variant="info">{r.venta ? 'Vendido' : (r.estado || 'Vendido')}</Badge>
        : <Badge variant="success">En Bodega</Badge>
    },
    {
      key: 'venta', label: 'Venta asociada', render: (r) => r.venta
        ? (
          <div className="text-xs whitespace-nowrap">
            <p className="font-medium text-brand-accent">{[r.venta.nombre, r.venta.apellido].filter(Boolean).join(' ') || r.venta.nickname || r.venta.idVM}</p>
            <p className="text-gray-400">{fmtFecha(r.venta.fecha)} · {formatCurrency(r.venta.precioVenta || 0)}</p>
          </div>
        )
        : <span className="text-gray-300">—</span>
    },
    {
      key: 'actions', label: '', render: (r) => (
        <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
          <button title="Editar" onClick={() => openEditInv(r)} className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"><Pencil size={15} /></button>
          <button title="Eliminar" onClick={() => handleInvDelete(r)} className="rounded-md p-1.5 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
        </div>
      )
    },
  ]

  return (
    <div>
      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="dev-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#0f172a 100%)' }}>
        <div className="dev-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.25] pointer-events-none" style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)' }} />
        <div className="dev-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#818cf8,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/25 mb-4">
              <Package size={12} className="text-indigo-300" />
              <span className="text-indigo-300 text-xs font-semibold tracking-widest uppercase">Stock & Hardware</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Inventario Equipos
            </h1>
            <p className="text-indigo-100/70 text-sm mt-2">
              {tab === 'inventario'
                ? 'Inventario físico de compra 2026 — costos, precios sugeridos y estado de cada unidad'
                : 'Gestión de dispositivos físicos por cliente'}
            </p>
          </div>
          <div className="flex gap-3">
            {tab === 'inventario' ? (
              <>
                <button onClick={handleImportInventario} disabled={importing} className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-bold text-white transition-all flex items-center gap-2">
                  <RefreshCw size={16} className={importing ? 'animate-spin' : ''} />
                  {importing ? 'Importando…' : 'Recargar Excel'}
                </button>
                <button onClick={openNewInv} className="dev-cta px-5 py-2.5 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
                  <Plus size={18} /> Nuevo Equipo
                </button>
              </>
            ) : (
              <button onClick={openNew} className="dev-cta px-5 py-2.5 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
                <Plus size={18} /> Nuevo Dispositivo
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1.5 mb-6 w-fit dev-a2">
        <button
          onClick={() => setTab('inventario')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'inventario' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Package size={16} /> Inventario 2026</span>
        </button>
        <button
          onClick={() => setTab('clientes')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'clientes' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Tv size={16} /> Equipos por cliente</span>
        </button>
      </div>

      {tab === 'inventario' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <DeviceCard icon={Package} label="Unidades" value={invStats.unidades} tone="violet" delay={0} sub={`${totalReferencias} referencias del lote 2026`} />
            <DeviceCard icon={CheckCircle} label="En Bodega" value={invStats.enBodega} tone="emerald" delay={70} sub={`${invStats.vendidos} vendidas`} />
            <DeviceCard icon={Wallet} label="Inversión Total" value={formatCurrency(invStats.inversion)} tone="amber" delay={140} sub="Costo total COP del lote" />
            <DeviceCard icon={TrendingUp} label="Ganancia Potencial" value={formatCurrency(invStats.gananciaPotencial)} tone="fuchsia" delay={210} sub="A precio sugerido" />
          </div>


        </>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <DeviceCard icon={Tv} label="Total Equipos" value={stats.total} tone="violet" delay={0} sub="Registrados en sistema" />
          <DeviceCard icon={CheckCircle} label="Equipos Activos" value={stats.activos} tone="emerald" delay={70} sub="En funcionamiento" />
          <DeviceCard icon={XCircle} label="Equipos Inactivos" value={stats.inactivos} tone="rose" delay={140} sub="Desactivados / Baja" />
          <DeviceCard icon={Tv} label="Smart TV / TV Box" value={stats.firetv} tone="cyan" delay={210} sub="Dispositivos principales" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-4 dev-a2">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={tab === 'inventario' ? 'Buscar por descripción, serie o proveedor...' : 'Buscar por cliente, dispositivo o MAC...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none transition-all shadow-sm"
          />
        </div>
        {tab === 'inventario' ? (
          <select
            value={filterEstadoInv}
            onChange={(e) => setFilterEstadoInv(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-400 bg-white transition-all shadow-sm"
          >
            <option value="todos">Todos los estados</option>
            {estadosInv.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        ) : (
          <>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-400 bg-white transition-all shadow-sm"
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
              className="border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-400 bg-white transition-all shadow-sm"
            >
              <option value="todos">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3" />
              <p className="text-gray-500">Cargando datos…</p>
            </div>
          ) : tab === 'inventario'
            ? <DataTable columns={invColumns} data={filteredInventario} defaultSortKey="idInventario" defaultSortDir="asc" />
            : <DataTable columns={columns} data={filteredDevices} defaultSortKey="id" defaultSortDir="desc" />}
        </CardBody>
      </Card>

      {showForm && (
        <>
          <div className="dev-overlay fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowForm(false)} />
          <div className="dev-drawer fixed inset-y-0 right-0 z-50 w-full md:w-[500px] bg-white shadow-2xl flex flex-col border-l border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{editing ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}</h2>
                <p className="text-sm text-slate-500 mt-1">Gestión de dispositivos por cliente</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                <div className="space-y-4">
                  <Select label="Cliente *" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, subscriptionId: '' })} required>
                    <option value="">— Selecciona —</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                  <Select label="Suscripción (opcional)" value={form.subscriptionId || ''} onChange={(e) => setForm({ ...form, subscriptionId: e.target.value })}>
                    <option value="">— Sin asignar —</option>
                    {clientSubs.map((s) => <option key={s.id} value={s.id}>{s.plan?.nombre}</option>)}
                  </Select>
                  <Input label="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="TV Sala" />
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                      <option value="Smart TV">Smart TV</option>
                      <option value="PC">PC</option>
                      <option value="Celular">Celular</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Otro">Otro</option>
                    </Select>
                    <Select label="Activo" value={form.activo ? 'true' : 'false'} onChange={(e) => setForm({ ...form, activo: e.target.value === 'true' })}>
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </Select>
                  </div>
                  <Input label="MAC / ID dispositivo" value={form.mac || ''} onChange={(e) => setForm({ ...form, mac: e.target.value })} />
                  <Textarea label="Observaciones" rows={3} value={form.observaciones || ''} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-bold transition-colors">Cancelar</button>
                <button type="submit" className="dev-cta px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md">{editing ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </>
      )}

      {showInvForm && (
        <>
          <div className="dev-overlay fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowInvForm(false)} />
          <div className="dev-drawer fixed inset-y-0 right-0 z-50 w-full md:w-[700px] bg-white shadow-2xl flex flex-col border-l border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{invEditing ? `Editar equipo ${invEditing.idInventario}` : 'Nuevo equipo de inventario'}</h2>
                <p className="text-sm text-slate-500 mt-1">Se guarda directamente en la base de datos (tabla inventario_equipos)</p>
              </div>
              <button onClick={() => setShowInvForm(false)} aria-label="Cerrar" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleInvSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <Input
                    label={esLote ? 'IDs inventario (rango)' : 'ID inventario'}
                    value={idRangoPreview || invForm.idInventario} disabled readOnly
                    className="bg-slate-50 text-slate-500 font-mono" placeholder="Generado automáticamente"
                  />
                  <Input
                    label="Fecha de compra" type="date" value={invForm.fechaCompra || ''}
                    onChange={(e) => setInvForm({ ...invForm, fechaCompra: e.target.value })}
                  />
                  <Select label="Estado" value={invForm.estado} onChange={(e) => setInvForm({ ...invForm, estado: e.target.value })}>
                    <option value="En Bodega">En Bodega</option>
                    <option value="Vendido">Vendido</option>
                    <option value="Averiado">Averiado</option>
                    <option value="En Garantía">En Garantía</option>
                  </Select>
  
                  <div className="sm:col-span-2">
                    {refCustom || referencias.length === 0 ? (
                      <>
                        <Input
                          label="Referencia / Descripción *" value={invForm.descripcion} required
                          onChange={(e) => setInvForm({ ...invForm, descripcion: e.target.value })} placeholder="Escribe la referencia nueva"
                        />
                        {referencias.length > 0 && (
                          <button type="button" onClick={() => { setRefCustom(false); setInvForm({ ...invForm, descripcion: '' }) }} className="mt-1.5 text-xs font-bold text-indigo-600 hover:underline">
                            ← Elegir de la lista de referencias
                          </button>
                        )}
                      </>
                    ) : (
                      <Select
                        label="Referencia / Descripción *" value={invForm.descripcion} required
                        onChange={(e) => {
                          if (e.target.value === '__otra__') { setRefCustom(true); setInvForm({ ...invForm, descripcion: '' }) }
                          else setInvForm({ ...invForm, descripcion: e.target.value })
                        }}
                      >
                        <option value="">— Selecciona una referencia —</option>
                        {referencias.map((ref) => <option key={ref} value={ref}>{ref}</option>)}
                        <option value="__otra__">➕ Otra referencia…</option>
                      </Select>
                    )}
                  </div>
                  <Input
                    label="Proveedor" value={invForm.proveedor}
                    onChange={(e) => setInvForm({ ...invForm, proveedor: e.target.value })} placeholder="Amazon / Local"
                  />
  
                  <Input
                    label="Cantidad" type="number" min="1" max={MAX_LOTE} value={invForm.cantidad}
                    onChange={(e) => setInvForm({ ...invForm, cantidad: e.target.value })}
                  />
                  {!esLote && (
                    <div className="sm:col-span-2">
                      <Input
                        label="Serie" value={invForm.serie}
                        onChange={(e) => setInvForm({ ...invForm, serie: e.target.value })} placeholder="G4N1CQ…" className="font-mono uppercase"
                      />
                    </div>
                  )}
  
                  {esLote && (
                    <div className="sm:col-span-3">
                      <p className="text-sm font-semibold text-indigo-700 mb-2">
                        Serie de cada equipo <span className="font-normal text-slate-500">— {cantidadNum} unidades de "{invForm.descripcion || 'la referencia seleccionada'}"</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
                        {invSeries.map((s, i) => (
                          <Input
                            key={i}
                            label={`Serie #${i + 1}`} value={s} required placeholder="Serie física" className="font-mono uppercase text-sm"
                            onChange={(e) => setInvSeries(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                          />
                        ))}
                      </div>
                    </div>
                  )}
  
                  <div>
                    <CurrencyInput
                      label="Costo unitario (COP) *" value={invForm.costoUniCOP} required
                      onChange={(e) => setInvForm({ ...invForm, costoUniCOP: e.target.value })} placeholder="110.000"
                      disabled={usdAuto} className={usdAuto ? 'bg-amber-50 text-amber-800 font-bold border-amber-200' : ''}
                    />
                    {usdAuto && <p className="text-[11px] font-semibold text-amber-600 mt-1">Calculado desde USD (bloqueado)</p>}
                  </div>
                  <CurrencyInput
                    label="Precio sugerido (COP)" value={invForm.precioSugerido}
                    onChange={(e) => setInvForm({ ...invForm, precioSugerido: e.target.value })} placeholder="130.000"
                  />
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 self-end">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1">
                      Cálculo automático {esLote && `— lote (${cantidadNum})`}
                    </p>
                    <p className="text-xs text-slate-600 tabular-nums">
                      Total: <span className="font-extrabold text-slate-800">{formatCurrency(invPreview.costoTotal)}</span>
                      {invPreview.ganancia != null && (
                        <>
                          <br/><span className="text-emerald-700 font-bold">+{formatCurrency(invPreview.ganancia)}</span> 
                          <span className="text-slate-400 font-medium ml-1">({invPreview.utilidadPct.toFixed(1)}%)</span>
                        </>
                      )}
                    </p>
                  </div>
  
                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={toggleCostosImport}
                      className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors w-fit"
                    >
                      <ChevronDown size={16} className={cn('transition-transform', showCostosImport && 'rotate-180')} />
                      Costos de importación (USD → COP)
                    </button>
                    {showCostosImport && (
                      <div className="mt-3 rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <CurrencyInput
                            label="Costo unitario (USD)" prefix="US$" decimals={2} value={invForm.costoUnitarioUSD}
                            onChange={(e) => setInvForm({ ...invForm, costoUnitarioUSD: e.target.value })}
                          />
                          <CurrencyInput
                            label="Envío (USD)" prefix="US$" decimals={2} value={invForm.envioUSD}
                            onChange={(e) => setInvForm({ ...invForm, envioUSD: e.target.value })}
                          />
                          <CurrencyInput
                            label="Impuestos (USD)" prefix="US$" decimals={2} value={invForm.impuestosUSD}
                            onChange={(e) => setInvForm({ ...invForm, impuestosUSD: e.target.value })}
                          />
                          <CurrencyInput
                            label="Transporte (COP)" value={invForm.transporteCOP}
                            onChange={(e) => setInvForm({ ...invForm, transporteCOP: e.target.value })}
                          />
                          <div>
                            <CurrencyInput
                              label="TRM del día" decimals={2} value={invForm.trm}
                              onChange={(e) => setInvForm({ ...invForm, trm: e.target.value })}
                              placeholder={loadingTrm ? 'Consultando…' : ''}
                            />
                            <p className="text-[10px] text-slate-500 mt-1 font-medium">
                              {loadingTrm
                                ? 'Consultando TRM...'
                                : trmInfo?.trm
                                  ? `Fuente: ${trmInfo.fuente}`
                                  : 'Sin conexión, ingresa manual'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3 text-xs text-indigo-800">
                          <p className="font-bold mb-1 flex items-center gap-1.5"><TrendingUp size={14} /> Fórmula de conversión:</p>
                          <p>Costo COP = (USD unitario + envío + impuestos) × TRM + transporte COP</p>
                          {usdAuto && (
                            <p className="mt-1.5 font-bold tabular-nums text-indigo-900 bg-white inline-block px-2 py-1 rounded">
                              = (US${usdSubtotal.toLocaleString('es-CO', { maximumFractionDigits: 2 })} × {Number(invForm.trm).toLocaleString('es-CO', { maximumFractionDigits: 2 })}) + {formatCurrency(Number(invForm.transporteCOP) || 0)} = {formatCurrency(Number(invForm.costoUniCOP) || 0)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={() => setShowInvForm(false)} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-bold transition-colors">Cancelar</button>
                <button type="submit" disabled={savingInv} className="dev-cta px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md">
                  {savingInv ? 'Guardando…' : invEditing ? 'Actualizar equipo' : esLote ? `Guardar ${cantidadNum} equipos` : 'Guardar equipo'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
