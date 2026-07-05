import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Search, Tv, CheckCircle, XCircle, Package, RefreshCw, Wallet, TrendingUp, ChevronDown } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LabelList,
} from 'recharts'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatCurrency } from '../../utils/excelUtils'
import { cn } from '../../utils/cn'

// Paleta fija por referencia: el mismo color identifica a la referencia en las
// gráficas y en el punto de color de la tabla (mapeo consistente en toda la vista)
const REF_COLORS = ['#f97316', '#0ea5e9', '#16a34a', '#8b5cf6', '#ef4444', '#eab308', '#14b8a6', '#64748b']

const fmtPesos = (v) => `$${Number(v || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
const fmtEjePesos = (v) => v >= 1_000_000 ? `$${(v / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M` : `$${Math.round(v / 1000)}K`

// Un lote de "Nuevo Equipo" con Cantidad > 1 genera un campo Serie por unidad
// — todas comparten la misma Referencia/Descripción. Tope razonable para no
// romper la UI ni el formulario si alguien teclea un número desproporcionado.
const MAX_LOTE = 50

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

  // Agregación por referencia (descripción): alimenta las dos gráficas y el
  // mapa de colores compartido con la tabla. Métrica: costo total COP (inversión)
  // y ganancia potencial a precio sugerido — mismas definiciones que las tarjetas.
  const porReferencia = useMemo(() => {
    const acc = {}
    for (const r of inventario) {
      const ref = (r.descripcion || 'Sin referencia').trim()
      if (!acc[ref]) acc[ref] = { referencia: ref, unidades: 0, inversion: 0, ganancia: 0, margenSum: 0, margenN: 0 }
      acc[ref].unidades += Number(r.cantidad) || 0
      acc[ref].inversion += Number(r.costoTotalCOP) || 0
      acc[ref].ganancia += Number(r.ganancia) || 0
      if (r.utilidadPct != null) { acc[ref].margenSum += Number(r.utilidadPct); acc[ref].margenN += 1 }
    }
    return Object.values(acc)
      .map(x => ({ ...x, margenPct: x.margenN > 0 ? Number((x.margenSum / x.margenN).toFixed(1)) : 0 }))
      .sort((a, b) => b.inversion - a.inversion)
  }, [inventario])

  const refColor = useMemo(() => {
    const map = {}
    porReferencia.forEach((r, i) => { map[r.referencia] = REF_COLORS[i % REF_COLORS.length] })
    return map
  }, [porReferencia])

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-accent">Inventario Equipos</h1>
          <p className="text-gray-500">
            {tab === 'inventario'
              ? 'Inventario físico de compra 2026 — costos, precios sugeridos y estado de cada unidad'
              : 'Gestión de dispositivos físicos por cliente'}
          </p>
        </div>
        {tab === 'inventario'
          ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleImportInventario} disabled={importing}>
                <RefreshCw size={18} className={importing ? 'animate-spin' : ''} />
                {importing ? 'Importando…' : 'Recargar desde Excel'}
              </Button>
              <Button onClick={openNewInv}><Plus size={18} /> Nuevo Equipo</Button>
            </div>
          )
          : <Button onClick={openNew}><Plus size={18} /> Nuevo Dispositivo</Button>}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('inventario')}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${tab === 'inventario' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span className="flex items-center gap-1.5"><Package size={15} /> Inventario 2026</span>
        </button>
        <button
          onClick={() => setTab('clientes')}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${tab === 'clientes' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span className="flex items-center gap-1.5"><Tv size={15} /> Equipos por cliente</span>
        </button>
      </div>

      {tab === 'inventario' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Package} label="Unidades" value={invStats.unidades} variant="solid" sub={`${porReferencia.length} referencias del lote 2026`} />
            <StatCard icon={CheckCircle} label="En Bodega" value={invStats.enBodega} variant="light" sub={`${invStats.vendidos} vendidas`} />
            <StatCard icon={Wallet} label="Inversión Total" value={formatCurrency(invStats.inversion)} variant="outline" sub="Costo total COP del lote" />
            <StatCard icon={TrendingUp} label="Ganancia Potencial" value={formatCurrency(invStats.gananciaPotencial)} variant="light" sub="Si se vende la bodega a precio sugerido" />
          </div>

          {porReferencia.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inversión y ganancia potencial por referencia</CardTitle>
                  <p className="text-xs text-gray-400 mt-0.5">Pesos COP del lote 2026 — costo de compra vs. utilidad esperada a precio sugerido</p>
                </CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={Math.max(220, porReferencia.length * 52)}>
                    <BarChart data={porReferencia} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tickFormatter={fmtEjePesos} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 'auto']} />
                      <YAxis type="category" dataKey="referencia" width={118} tick={{ fontSize: 11, fill: '#334155' }} />
                      <Tooltip
                        formatter={(v, name) => [fmtPesos(v), name]}
                        labelStyle={{ fontWeight: 600, color: '#1e293b' }}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="inversion" name="Inversión" fill="#334155" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="ganancia" name="Ganancia potencial" fill="#16a34a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Margen de utilidad por referencia</CardTitle>
                  <p className="text-xs text-gray-400 mt-0.5">Utilidad promedio sobre el costo (%) — identifica qué referencia conviene priorizar</p>
                </CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={Math.max(220, porReferencia.length * 52)}>
                    <BarChart data={[...porReferencia].sort((a, b) => b.margenPct - a.margenPct)} layout="vertical" margin={{ top: 0, right: 44, left: 8, bottom: 0 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 'auto']} />
                      <YAxis type="category" dataKey="referencia" width={118} tick={{ fontSize: 11, fill: '#334155' }} />
                      <Tooltip
                        formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Margen promedio']}
                        labelStyle={{ fontWeight: 600, color: '#1e293b' }}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                      <Bar dataKey="margenPct" name="Margen %" radius={[0, 4, 4, 0]}>
                        {[...porReferencia].sort((a, b) => b.margenPct - a.margenPct).map((r) => (
                          <Cell key={r.referencia} fill={refColor[r.referencia]} />
                        ))}
                        <LabelList dataKey="margenPct" position="right" formatter={(v) => `${Number(v).toFixed(1)}%`} style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Tv} label="Total Equipos" value={stats.total} variant="solid" sub="Registrados en inventario" />
          <StatCard icon={CheckCircle} label="Equipos Activos" value={stats.activos} variant="light" sub="En funcionamiento" />
          <StatCard icon={XCircle} label="Equipos Inactivos" value={stats.inactivos} variant="outline" sub="Desactivados / Baja" />
          <StatCard icon={Tv} label="Smart TV / TV Box" value={stats.firetv} variant="light" sub="Dispositivos principales" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={tab === 'inventario' ? 'Buscar por descripción, serie o proveedor...' : 'Buscar por cliente, dispositivo o MAC...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
          />
        </div>
        {tab === 'inventario' ? (
          <select
            value={filterEstadoInv}
            onChange={(e) => setFilterEstadoInv(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          >
            <option value="todos">Todos los estados</option>
            {estadosInv.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        ) : (
          <>
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

      {showInvForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>{invEditing ? `Editar equipo ${invEditing.idInventario}` : 'Nuevo equipo de inventario'}</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Se guarda directamente en la base de datos (tabla inventario_equipos)</p>
              </div>
              <button onClick={() => setShowInvForm(false)} aria-label="Cerrar"><X size={20} /></button>
            </CardHeader>
            <form onSubmit={handleInvSubmit}>
              <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label={esLote ? 'IDs inventario (rango)' : 'ID inventario'}
                  value={idRangoPreview || invForm.idInventario} disabled readOnly
                  className="bg-gray-50 text-gray-400" placeholder="Generado automáticamente"
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
                        <button type="button" onClick={() => { setRefCustom(false); setInvForm({ ...invForm, descripcion: '' }) }} className="mt-1 text-xs text-brand-primary hover:underline">
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
                      onChange={(e) => setInvForm({ ...invForm, serie: e.target.value })} placeholder="G4N1CQ…" className="font-mono"
                    />
                  </div>
                )}

                {esLote && (
                  <div className="sm:col-span-3">
                    <p className="text-sm font-medium text-brand-accent mb-1">
                      Serie de cada equipo <span className="font-normal text-gray-400">— {cantidadNum} unidades de "{invForm.descripcion || 'la referencia seleccionada'}"</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto rounded-lg border border-ui-border bg-ui-background/40 p-3">
                      {invSeries.map((s, i) => (
                        <Input
                          key={i}
                          label={`Serie #${i + 1}`} value={s} required placeholder="Serie física" className="font-mono"
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
                    disabled={usdAuto} className={usdAuto ? 'bg-amber-50 text-amber-800 font-semibold' : ''}
                  />
                  {usdAuto && <p className="text-[11px] text-amber-600 mt-1">Calculado desde USD × TRM (bloqueado)</p>}
                </div>
                <CurrencyInput
                  label="Precio sugerido (COP)" value={invForm.precioSugerido}
                  onChange={(e) => setInvForm({ ...invForm, precioSugerido: e.target.value })} placeholder="130.000"
                />
                <div className="rounded-lg border border-orange-100 bg-orange-50/60 px-3 py-2 self-end">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">
                    Cálculo automático {esLote && `— total del lote (${cantidadNum} equipos)`}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5 tabular-nums">
                    Total: <span className="font-semibold">{formatCurrency(invPreview.costoTotal)}</span>
                    {invPreview.ganancia != null && (
                      <>
                        {' · '}Ganancia: <span className="font-semibold text-green-700">{formatCurrency(invPreview.ganancia)}</span>
                        {' · '}<span className="font-semibold">{invPreview.utilidadPct.toFixed(1)}%</span>
                      </>
                    )}
                  </p>
                  {esLote && <p className="text-[11px] text-gray-400 mt-0.5">Cada equipo se registra con costo unitario {formatCurrency(Number(invForm.costoUniCOP) || 0)}</p>}
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={toggleCostosImport}
                    className="flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:text-orange-600"
                  >
                    <ChevronDown size={16} className={cn('transition-transform', showCostosImport && 'rotate-180')} />
                    Costos de importación en USD (convierte a COP automáticamente)
                  </button>
                  {showCostosImport && (
                    <div className="mt-3 rounded-lg border border-ui-border bg-ui-background/50 p-4">
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
                          <p className="text-[11px] text-gray-400 mt-1">
                            {loadingTrm
                              ? 'Consultando TRM del día…'
                              : trmInfo?.trm
                                ? `Fuente: ${trmInfo.fuente} · vigente ${trmInfo.vigencia}`
                                : 'Escribe la TRM manualmente si no hay conexión'}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                        <span className="font-semibold">Fórmula:</span> Costo unitario COP = (USD unitario + envío + impuestos) × TRM + transporte COP
                        {usdAuto && (
                          <span className="ml-1 font-semibold tabular-nums">
                            = (US${usdSubtotal.toLocaleString('es-CO', { maximumFractionDigits: 2 })} × {Number(invForm.trm).toLocaleString('es-CO', { maximumFractionDigits: 2 })}) + {formatCurrency(Number(invForm.transporteCOP) || 0)} = {formatCurrency(Number(invForm.costoUniCOP) || 0)}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </CardBody>
              <div className="p-4 border-t border-ui-border flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowInvForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={savingInv}>
                  {savingInv ? 'Guardando…' : invEditing ? 'Actualizar equipo' : esLote ? `Guardar ${cantidadNum} equipos` : 'Guardar equipo'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
