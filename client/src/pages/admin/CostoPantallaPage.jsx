import { useState, useMemo } from 'react'
import { todayStr } from '../../utils/dateUtils'
import {
  Search, Plus, Pencil, Trash2, X, Upload,
  DollarSign, Monitor, TrendingUp, BarChart3,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react'
import api from '../../config/api'
import { useApiResource } from '../../hooks/useApiResource'
import { useUi } from '../../context/UiContext'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { KpiCard } from '../../components/ui/KpiCard'
import { formatDate, formatCurrency, formatUSD, formatNumber } from '../../utils/excelUtils'

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ colKey, sortCol, sortDir }) {
  if (sortCol !== colKey) return <ChevronsUpDown size={13} className="opacity-40 flex-shrink-0" />
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="flex-shrink-0" />
    : <ChevronDown size={13} className="flex-shrink-0" />
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCOP = (v) => (v == null || v === '' ? '—' : formatCurrency(v))
const fmtUSD = (v) => (v == null || v === '' ? '—' : formatUSD(v))
const fmtNum = (v) => (v == null || v === '' ? '—' : formatNumber(v))

const CSS = `
  @keyframes iv-fade-up  { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes iv-fade-in  { from { opacity:0 } to { opacity:1 } }
  @keyframes iv-scale-in { from { opacity:0; transform:scale(.94) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
  @keyframes iv-slide-in { from { opacity:0; transform:translateX(100%) } to { opacity:1; transform:translateX(0) } }
  @keyframes iv-shimmer  { from { background-position:-200% 0 } to { background-position:200% 0 } }
  @keyframes iv-orb-1    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes iv-orb-2    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }

  .iv-a1 { animation: iv-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .iv-a2 { animation: iv-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .iv-a3 { animation: iv-fade-up .45s cubic-bezier(.22,1,.36,1) .12s both }
  .iv-a4 { animation: iv-fade-up .45s cubic-bezier(.22,1,.36,1) .18s both }
  .iv-a5 { animation: iv-fade-up .45s cubic-bezier(.22,1,.36,1) .24s both }

  .iv-skeleton {
    background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
    background-size: 200% 100%;
    animation: iv-shimmer 1.6s infinite;
    border-radius: 6px;
  }
  .iv-drawer  { animation: iv-slide-in .3s cubic-bezier(.22,1,.36,1) both }
  .iv-overlay { animation: iv-fade-in .2s ease both }
  .iv-confirm { animation: iv-scale-in .22s cubic-bezier(.22,1,.36,1) both }

  .iv-kpi { transition: transform .25s ease, box-shadow .25s ease }
  .iv-kpi:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.12) }
  .iv-kpi.clickable { cursor: pointer }

  .iv-cta {
    background: linear-gradient(135deg,#f97316,#ea580c);
    box-shadow: 0 4px 18px rgba(249,115,22,.4);
    transition: all .22s ease;
  }
  .iv-cta:hover  { box-shadow: 0 7px 24px rgba(249,115,22,.55); transform: translateY(-2px) }
  .iv-cta:active { transform: translateY(0) }

  .iv-btn-ghost {
    transition: all .2s ease;
    border: 1px solid rgba(255,255,255,.2);
  }
  .iv-btn-ghost:hover { background: rgba(255,255,255,.1) }

  .iv-btn-danger {
    background: linear-gradient(135deg,#ef4444,#f87171);
    box-shadow: 0 4px 14px rgba(239,68,68,.3);
    transition: all .2s ease;
  }
  .iv-btn-danger:hover { box-shadow: 0 6px 20px rgba(239,68,68,.45); transform: translateY(-1px) }

  .iv-orb-1 { animation: iv-orb-1 8s ease-in-out infinite }
  .iv-orb-2 { animation: iv-orb-2 11s ease-in-out infinite }

  .iv-search:focus { outline: none; box-shadow: 0 0 0 3px rgba(249,115,22,.18) }

  .iv-row { transition: background .15s ease }
  .iv-row:hover td { background: rgba(249,115,22,.04) }

  .iv-th-sort { transition: background .15s ease }
  .iv-th-sort:hover { background: rgba(255,255,255,.12) }

  .iv-action-btn { transition: all .18s ease; opacity: 0 }
  tr:hover .iv-action-btn { opacity: 1 }
  .iv-action-btn:hover { transform: scale(1.15) }

  @media (prefers-reduced-motion: reduce) {
    .iv-a1,.iv-a2,.iv-a3,.iv-a4,.iv-a5,
    .iv-drawer,.iv-overlay,.iv-confirm,
    .iv-orb-1,.iv-orb-2,.iv-skeleton { animation: none !important; transition: none !important }
  }
`


// ─── Columnas ─────────────────────────────────────────────────────────────────

const COLS = [
  { key: 'idRec',                   label: 'ID Rec' },
  { key: 'accion',                  label: 'Acción' },
  { key: 'creditos',                label: 'Créditos' },
  { key: 'fecha',                   label: 'Fecha' },
  { key: 'anio',                    label: 'Año' },
  { key: 'mes',                     label: 'Mes' },
  { key: 'itemQuantity',            label: 'Cant.' },
  { key: 'costoCOP',                label: 'Costo COP' },
  { key: 'impuesto4x100COP',        label: 'Imp. 4x1000' },
  { key: 'costoUSD',                label: 'Costo USD' },
  { key: 'trm',                     label: 'TRM' },
  { key: 'costoUnitarioCuentaUSD',  label: 'Cto. Unt. Cta USD' },
  { key: 'costoUnitarioCuentaCOP',  label: 'Cto. Unt. Cta COP' },
  { key: 'costoPantallaUSD',        label: 'Cto. Pantalla USD' },
  { key: 'costoPantallaCOP',        label: 'Cto. Pantalla COP' },
  { key: 'medioPago',               label: 'Medio Pago' },
  { key: 'acciones',                label: '' },
]

// ─── Render celda ─────────────────────────────────────────────────────────────

function renderCell(row, key, onEdit, onDelete) {
  const v = row[key]
  switch (key) {
    case 'acciones':
      return (
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(row)} className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-100 transition-colors" title="Editar">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(row.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Eliminar">
            <Trash2 size={14} />
          </button>
        </div>
      )
    case 'fecha':
      return <span className="text-xs text-gray-600 whitespace-nowrap">{v ? formatDate(v) : '—'}</span>
    case 'idRec':
      return <span className="font-mono text-xs font-bold text-orange-700">{v || '—'}</span>
    case 'accion':
      return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
          ${v === 'Recarga' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
          {v || '—'}
        </span>
      )
    case 'costoCOP':
    case 'impuesto4x100COP':
    case 'costoUnitarioCuentaCOP':
    case 'costoPantallaCOP':
      return <span className="font-semibold text-orange-700 whitespace-nowrap">{fmtCOP(v)}</span>
    case 'costoUSD':
    case 'costoUnitarioCuentaUSD':
    case 'costoPantallaUSD':
      return <span className="font-semibold text-green-700 whitespace-nowrap">{fmtUSD(v)}</span>
    case 'trm':
      return <span className="font-mono text-xs whitespace-nowrap">{fmtNum(v)}</span>
    case 'creditos':
    case 'itemQuantity':
      return <span className="block text-center font-medium">{v ?? '—'}</span>
    case 'medioPago':
      return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
          ${v === 'Nequi' ? 'bg-purple-100 text-purple-700'
          : v === 'Bancolombia' ? 'bg-yellow-100 text-yellow-700'
          : 'bg-gray-100 text-gray-500'}`}>
          {v || '—'}
        </span>
      )
    default:
      return v || '—'
  }
}

// ─── Formulario vacío ────────────────────────────────────────────────────────

const EMPTY = {
  idRec: '', accion: 'Recarga', creditos: '', fecha: '',
  anio: '', mes: '', itemQuantity: '1', costoCOP: '',
  impuesto4x100COP: '', costoUSD: '', trm: '',
  costoUnitarioCuentaUSD: '', costoUnitarioCuentaCOP: '',
  costoPantallaUSD: '', costoPantallaCOP: '', medioPago: 'Nequi',
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CostoPantallaPage() {
  const { showToast } = useUi()
  const { data: rows, setData: setRows, loading, error, reload: load } = useApiResource('/admin/payments/costo-pantalla')
  const [search, setSearch]     = useState('')
  const [sortCol, setSortCol]   = useState('id')
  const [sortDir, setSortDir]   = useState('desc')
  const [showForm, setShowForm]         = useState(false)
  const [explain, setExplain]           = useState(null)
  const [editing, setEditing]           = useState(null)
  const [form, setForm]                 = useState(EMPTY)

  const handleSort = (key) => {
    if (key === 'acciones') return
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(key); setSortDir('asc') }
  }

  const handleImport = async () => {
    if (!confirm('¿Re-importar todos los costos desde el Excel? Se reemplazarán los datos existentes.')) return
    try {
      const { data } = await api.post('/admin/payments/costo-pantalla/import')
      showToast(data.message, 'success')
      load()
    } catch (e) { showToast(e.response?.data?.error || e.message, 'error') }
  }

  const openNew = async () => {
    setEditing(null)
    setForm({ ...EMPTY, fecha: todayStr() })
    setShowForm(true)
    
    try {
      const { data } = await api.get('/admin/payments/costo-pantalla/next-id')
      if (data.nextIdRec) {
        setForm(prev => ({ ...prev, idRec: data.nextIdRec }))
      }
    } catch (e) {
      console.error('No se pudo obtener el siguiente ID', e)
    }
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({ ...EMPTY, ...row })
    setShowForm(true)
  }

  const closeForm = () => setShowForm(false)

  const f = (field) => (e) => {
    const val = e.target.value
    setForm(prev => {
      const next = { ...prev, [field]: val }
      
      // Auto-calc impuesto 4x1000
      if (field === 'costoCOP') {
        const costo = parseFloat(val) || 0
        next.impuesto4x100COP = String(Math.round(costo * 0.004))
      }
      
      let updatedTRM = next.trm
      let updatedCtoUSD = next.costoUnitarioCuentaUSD
      let updatedCtoPantallaUSD = next.costoPantallaUSD

      // Auto-calc TRM (Costo COP / Costo USD)
      if (field === 'costoCOP' || field === 'costoUSD') {
        const cCop = parseFloat(next.costoCOP) || 0
        const cUsd = parseFloat(next.costoUSD) || 0
        if (cCop > 0 && cUsd > 0) {
          updatedTRM = String((cCop / cUsd).toFixed(2))
          next.trm = updatedTRM
        } else if (val === '') {
          updatedTRM = ''
          next.trm = ''
        }
      }

      // Auto-calc Cto. Unit. Cuenta USD (Costo USD / Créditos)
      if (field === 'costoUSD' || field === 'creditos') {
        const cUsd = parseFloat(next.costoUSD) || 0
        const cred = parseFloat(next.creditos) || 0
        if (cUsd > 0 && cred > 0) {
          updatedCtoUSD = String((cUsd / cred).toFixed(2))
          next.costoUnitarioCuentaUSD = updatedCtoUSD
        } else if (val === '') {
          updatedCtoUSD = ''
          next.costoUnitarioCuentaUSD = ''
        }
      }

      // Auto-calc Cto. Unit. Cuenta COP (TRM * Cto. Unit. Cuenta USD)
      if (field === 'trm' || field === 'costoUnitarioCuentaUSD' || field === 'costoCOP' || field === 'costoUSD' || field === 'creditos') {
        const t = parseFloat(updatedTRM) || 0
        const cuUsd = parseFloat(updatedCtoUSD) || 0
        if (t > 0 && cuUsd > 0) {
          next.costoUnitarioCuentaCOP = String(Math.round(t * cuUsd))
        } else if (val === '') {
          next.costoUnitarioCuentaCOP = ''
        }
      }

      // Auto-calc Cto. Pantalla USD (Cto. Unit. Cuenta USD / 3)
      if (field === 'costoUnitarioCuentaUSD' || field === 'costoUSD' || field === 'creditos') {
        const cuUsd = parseFloat(updatedCtoUSD) || 0
        if (cuUsd > 0) {
          updatedCtoPantallaUSD = String((cuUsd / 3).toFixed(2))
          next.costoPantallaUSD = updatedCtoPantallaUSD
        } else if (val === '') {
          updatedCtoPantallaUSD = ''
          next.costoPantallaUSD = ''
        }
      }

      // Auto-calc Cto. Pantalla COP (Cto. Pantalla USD * TRM)
      if (field === 'trm' || field === 'costoPantallaUSD' || field === 'costoUnitarioCuentaUSD' || field === 'costoCOP' || field === 'costoUSD' || field === 'creditos') {
        const t = parseFloat(updatedTRM) || 0
        const cpUsd = parseFloat(updatedCtoPantallaUSD) || 0
        if (t > 0 && cpUsd > 0) {
          next.costoPantallaCOP = String(Math.round(t * cpUsd))
        } else if (val === '') {
          next.costoPantallaCOP = ''
        }
      }

      // Auto-calc fecha → año y mes
      if (field === 'fecha' && val) {
        next.anio = val.slice(0, 4)
        const months = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
        next.mes = months[parseInt(val.slice(5, 7), 10) - 1] || ''
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const { data } = await api.put(`/admin/payments/costo-pantalla/${editing.id}`, form)
        setRows(prev => prev.map(r => r.id === editing.id ? data : r))
        showToast('Registro de costo actualizado correctamente.', 'success')
      } else {
        const { data } = await api.post('/admin/payments/costo-pantalla', form)
        setRows(prev => [data, ...prev])
        showToast('Registro de costo creado correctamente.', 'success')
      }
      closeForm()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm(`¿Eliminar el registro #${id}?`)) return
    try {
      await api.delete(`/admin/payments/costo-pantalla/${id}`)
      setRows(prev => prev.filter(r => r.id !== id))
      showToast('Registro de costo eliminado correctamente.', 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const stats = useMemo(() => {
    const total         = rows.length
    const totalCostoCOP = rows.reduce((s, r) => s + (Number(r.costoCOP) || 0), 0)
    const totalImpuesto = rows.reduce((s, r) => s + (Number(r.impuesto4x100COP) || 0), 0)
    const totalCostoUSD = rows.reduce((s, r) => s + (Number(r.costoUSD) || 0), 0)
    const totalCreditos = rows.reduce((s, r) => s + (Number(r.creditos) || 0), 0)
    return { total, totalCostoCOP, totalImpuesto, totalConImpuesto: totalCostoCOP + totalImpuesto, totalCostoUSD, totalCreditos }
  }, [rows])

  // Serie mensual: costo total (con 4x1000) + TRM promedio — la misma
  // agregación que usan el Dashboard y Análisis Financiero como "OPEX".
  const filtered = useMemo(() => {
    let result = rows
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(r =>
        (r.idRec || '').toLowerCase().includes(s) ||
        (r.accion || '').toLowerCase().includes(s) ||
        (r.mes || '').toLowerCase().includes(s) ||
        (r.anio || '').toString().includes(s) ||
        (r.medioPago || '').toLowerCase().includes(s)
      )
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
  }, [rows, search, sortCol, sortDir])

  return (
    <div>
      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="iv-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#7c2d12 0%,#431407 100%)' }}>
        <div className="iv-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#f97316,transparent 70%)' }} />
        <div className="iv-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.15] pointer-events-none" style={{ background: 'radial-gradient(circle,#ea580c,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/25 mb-4">
              <DollarSign size={12} className="text-orange-300" />
              <span className="text-orange-300 text-xs font-semibold tracking-widest uppercase">Finanzas</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Costo Pantalla
            </h1>
            <p className="text-orange-100/70 text-sm mt-2">
              Control de costos por recarga IPTV · {stats.total.toLocaleString()} registros
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleImport} className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-bold text-white transition-all flex items-center gap-2">
              <Upload size={16} /> Importar Excel
            </button>
            <button onClick={openNew} className="iv-cta px-5 py-2.5 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
              <Plus size={18} /> Nueva Recarga
            </button>
          </div>
        </div>
      </div>

      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 iv-a2">
        <KpiCard icon={Monitor}     label="Total Recargas"    value={stats.total.toLocaleString()}   loading={loading} gradFrom="#f97316" gradTo="#fb923c" delay={2} sub="Histórico completo"
          onClick={() => setExplain({
            title: 'Total Recargas', value: stats.total.toLocaleString(), icon: Monitor,
            queEs: 'Cuántas compras de créditos se han hecho en el histórico — cada recarga es una transacción con el proveedor de IPTV.',
            comoSeCalcula: 'Conteo simple de los registros de este módulo.',
            origen: 'Tabla de costos de pantalla de este módulo.',
          })} />
        <KpiCard icon={DollarSign}  label="Total Costo COP"   value={fmtCOP(stats.totalCostoCOP)}   loading={loading} gradFrom="#10b981" gradTo="#34d399" delay={3} sub="Sin impuesto 4x1000"
          onClick={() => setExplain({
            title: 'Total Costo COP', value: fmtCOP(stats.totalCostoCOP), icon: DollarSign,
            queEs: 'Lo pagado en pesos por las recargas, **sin incluir** el impuesto 4x1000 de las transferencias.',
            comoSeCalcula: 'Se suma el campo **Costo COP** de cada recarga. Ojo: el Dashboard y Análisis Financiero reportan el costo **con** impuesto — esa cifra es la tarjeta "Costo Total" de al lado.',
            origen: 'Campo Costo COP de cada registro de este módulo.',
          })} />
        <KpiCard icon={DollarSign}  label="Costo Total (+4x1000)" value={fmtCOP(stats.totalConImpuesto)} loading={loading} gradFrom="#6366f1" gradTo="#818cf8" delay={4} sub="La cifra del Dashboard"
          onClick={() => setExplain({
            title: 'Costo Total (+4x1000)', value: fmtCOP(stats.totalConImpuesto), icon: DollarSign,
            queEs: 'El costo real completo de operar: recargas más el impuesto 4x1000 que cobra el banco por cada transferencia.',
            comoSeCalcula: '**Costo COP + impuesto 4x1000** de cada recarga, sumados. Esta es exactamente la cifra que el Dashboard muestra como "Costos históricos" y Análisis Financiero como "OPEX" — así todo coincide entre módulos.',
            origen: `Campos Costo COP (${fmtCOP(stats.totalCostoCOP)}) + Imp. 4x1000 (${fmtCOP(stats.totalImpuesto)}) de este módulo.`,
          })} />
        <KpiCard icon={TrendingUp}  label="Total Costo USD"   value={fmtUSD(stats.totalCostoUSD)}   loading={loading} gradFrom="#8b5cf6" gradTo="#a78bfa" delay={5} sub="Inversión en dólares"
          onClick={() => setExplain({
            title: 'Total Costo USD', value: fmtUSD(stats.totalCostoUSD), icon: TrendingUp,
            queEs: 'Lo pagado en dólares por las recargas — el proveedor cobra en USD y la TRM del día define cuántos pesos cuesta.',
            comoSeCalcula: 'Se suma el campo **Costo USD** de cada recarga. La relación con el costo en pesos es la TRM: Costo COP ÷ Costo USD.',
            origen: 'Campo Costo USD de cada registro de este módulo.',
          })} />
        <KpiCard icon={BarChart3}   label="Total Créditos"    value={stats.totalCreditos.toLocaleString()} loading={loading} gradFrom="#f59e0b" gradTo="#fbbf24" delay={6} sub="Créditos comprados"
          onClick={() => setExplain({
            title: 'Total Créditos', value: stats.totalCreditos.toLocaleString(), icon: BarChart3,
            queEs: 'Cuántos créditos (cupos de cuenta) se han comprado en total — la "materia prima" que luego se convierte en pantallas vendibles.',
            comoSeCalcula: 'Se suma el campo **Créditos** de cada recarga. Cada crédito habilita una cuenta que suele soportar 3 pantallas.',
            origen: 'Campo Créditos de cada registro de este módulo.',
          })} />
      </div>

      {/* ── SEARCH + TABLE ── */}
      <div className="iv-a4">
        {/* Search bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="search" placeholder="Buscar por ID, acción, mes, año, medio pago…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="iv-search w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200
                         bg-white text-sm text-slate-700 placeholder:text-slate-400 transition-shadow" />
          </div>
          {!loading && (
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {filtered.length.toLocaleString()} de {rows.length.toLocaleString()} registros
            </span>
          )}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
          {loading
            ? (
              <div className="divide-y divide-slate-100">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-3.5 animate-pulse">
                    <div className="iv-skeleton w-16 h-3.5 rounded" />
                    <div className="iv-skeleton w-20 h-3.5 rounded" />
                    <div className="flex-1 iv-skeleton h-3.5 rounded" />
                  </div>
                ))}
              </div>
            )
            : error
              ? (
                <div className="py-16 text-center">
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )
              : (
                <>
                  <div className="overflow-auto max-h-[36rem] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5
                                  [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full
                                  [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className="text-left text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                          {COLS.map(col => (
                            <th key={col.key} onClick={() => handleSort(col.key)}
                                className={`sticky top-0 z-10 bg-slate-50 px-4 py-3 font-semibold whitespace-nowrap
                                          border-b border-slate-200 backdrop-blur-sm
                                          ${col.key !== 'acciones' ? 'cursor-pointer iv-th-sort' : ''}`}>
                              {col.key !== 'acciones' ? (
                                <div className="flex items-center gap-1.5">
                                  {col.label}
                                  <SortIcon colKey={col.key} sortCol={sortCol} sortDir={sortDir} />
                                </div>
                              ) : null}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                          <tr><td colSpan={COLS.length} className="px-4 py-16 text-center text-slate-400">No se encontraron registros.</td></tr>
                        ) : (
                          filtered.map(row => (
                            <tr key={row.id} className="iv-row bg-white hover:bg-slate-50/50">
                              {COLS.map(col => (
                                <td key={col.key} className="px-4 py-2.5 whitespace-nowrap">
                                  {renderCell(row, col.key, openEdit, handleDelete)}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
        </div>
      </div>

      {/* Form Drawer (PRO MAX Drawer) */}
      {showForm && (
        <>
          <div className="iv-overlay fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={closeForm} />
          <div className="iv-drawer fixed inset-y-0 right-0 z-50 w-full md:w-[600px] bg-white shadow-2xl flex flex-col border-l border-slate-200">
            {/* Header del Drawer */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{editing ? 'Editar Registro' : 'Nueva Recarga'}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {editing ? `Editando ${editing.idRec}` : 'Complete todos los campos'}
                </p>
              </div>
              <button onClick={closeForm} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo del Formulario */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* Sección: Identificación */}
                <section>
                  <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2 border-b border-orange-100 pb-1 mb-4">
                    📋 Identificación
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Registro</label>
                      <input value={form.idRec} onChange={f('idRec')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm font-mono transition-all" placeholder="R39" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Acción</label>
                      <select value={form.accion} onChange={f('accion')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white transition-all">
                        <option>Recarga</option>
                        <option>Compra</option>
                        <option>Ajuste</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Créditos</label>
                      <input type="number" value={form.creditos} onChange={f('creditos')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                      <input type="number" min="1" value={form.itemQuantity} onChange={f('itemQuantity')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                  </div>
                </section>

                {/* Sección: Fechas */}
                <section>
                  <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2 border-b border-orange-100 pb-1 mb-4">
                    📅 Fecha
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                      <input type="date" value={form.fecha} onChange={f('fecha')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Año (auto)</label>
                      <input value={form.anio} onChange={f('anio')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm cursor-not-allowed" disabled />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mes (auto)</label>
                      <input value={form.mes} onChange={f('mes')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm cursor-not-allowed" disabled />
                    </div>
                  </div>
                </section>

                {/* Sección: Costos */}
                <section>
                  <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2 border-b border-orange-100 pb-1 mb-4">
                    💰 Costos
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Costo COP</label>
                      <CurrencyInput value={form.costoCOP} onChange={f('costoCOP')} decimals={0}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Impuesto 4x1000 COP (auto)</label>
                      <CurrencyInput value={form.impuesto4x100COP} onChange={f('impuesto4x100COP')} decimals={0}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Costo USD</label>
                      <CurrencyInput value={form.costoUSD} onChange={f('costoUSD')} decimals={2}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">TRM</label>
                      <CurrencyInput value={form.trm} onChange={f('trm')} decimals={2} prefix=""
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cto. Unit. Cuenta USD</label>
                      <CurrencyInput value={form.costoUnitarioCuentaUSD} onChange={f('costoUnitarioCuentaUSD')} decimals={2}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cto. Unit. Cuenta COP</label>
                      <CurrencyInput value={form.costoUnitarioCuentaCOP} onChange={f('costoUnitarioCuentaCOP')} decimals={0}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cto. Pantalla USD</label>
                      <CurrencyInput value={form.costoPantallaUSD} onChange={f('costoPantallaUSD')} decimals={2}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cto. Pantalla COP</label>
                      <CurrencyInput value={form.costoPantallaCOP} onChange={f('costoPantallaCOP')} decimals={0}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Medio de Pago</label>
                      <select value={form.medioPago} onChange={f('medioPago')}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white transition-all">
                        <option>Nequi</option>
                        <option>Bancolombia</option>
                        <option>Daviplata</option>
                        <option>Efectivo</option>
                        <option>Otro</option>
                      </select>
                    </div>
                  </div>
                </section>

              </div>
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-sm font-bold transition-colors shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="iv-cta px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md hover:shadow-lg"
                >
                  {editing ? 'Guardar cambios' : 'Crear registro'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
