import { useState, useMemo } from 'react'
import { todayStr } from '../../utils/dateUtils'
import {
  Search, Plus, Pencil, Trash2, X, Upload,
  DollarSign, Monitor, TrendingUp, BarChart3,
  ChevronUp, ChevronDown, ChevronsUpDown
} from 'lucide-react'
import api from '../../config/api'
import { useApiResource } from '../../hooks/useApiResource'
import { useUi } from '../../context/UiContext'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { formatDate, formatCurrency, formatUSD, formatNumber } from '../../utils/excelUtils'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { ModuleStatCard as StatCard, ChartInsight } from './dashboard/biShared'

const MES_ORDEN = {
  ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
  JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
}
const MES_ABREV = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

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
  const [showForm, setShowForm] = useState(false)
  const [explain, setExplain]   = useState(null)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)

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
  const serieMensualCosto = useMemo(() => {
    const map = {}
    for (const r of rows) {
      const m = MES_ORDEN[(r.mes || '').toString().trim().toUpperCase()] || 0
      if (!m || !r.anio) continue
      const key = `${r.anio}-${String(m).padStart(2, '0')}`
      if (!map[key]) map[key] = { key, costo: 0, trmSum: 0, trmN: 0 }
      map[key].costo += (Number(r.costoCOP) || 0) + (Number(r.impuesto4x100COP) || 0)
      if (Number(r.trm) > 0) { map[key].trmSum += Number(r.trm); map[key].trmN += 1 }
    }
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).map(x => {
      const [anio, mm] = x.key.split('-')
      return {
        label: `${MES_ABREV[Number(mm)]} ${anio.slice(2)}`,
        costo: Math.round(x.costo),
        trm: x.trmN > 0 ? Math.round(x.trmSum / x.trmN) : null,
      }
    })
  }, [rows])

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-brand-accent">Costo Pantalla</h1>
          <p className="text-gray-500">Control de costos por recarga IPTV · {stats.total.toLocaleString()} registros</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleImport} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-200 text-orange-700 hover:bg-orange-50 text-sm font-medium transition-colors">
            <Upload size={15} /> Importar Excel
          </button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors shadow">
            <Plus size={16} /> Nuevo Registro
          </button>
        </div>
      </div>

      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={Monitor}     label="Total Recargas"    value={stats.total.toLocaleString()}        variant="solid"   sub="Histórico completo"
          onClick={() => setExplain({
            title: 'Total Recargas', value: stats.total.toLocaleString(), icon: Monitor,
            queEs: 'Cuántas compras de créditos se han hecho en el histórico — cada recarga es una transacción con el proveedor de IPTV.',
            comoSeCalcula: 'Conteo simple de los registros de este módulo.',
            origen: 'Tabla de costos de pantalla de este módulo.',
          })} />
        <StatCard icon={DollarSign}  label="Total Costo COP"   value={fmtCOP(stats.totalCostoCOP)}        variant="light"   sub="Sin impuesto 4x1000"
          onClick={() => setExplain({
            title: 'Total Costo COP', value: fmtCOP(stats.totalCostoCOP), icon: DollarSign,
            queEs: 'Lo pagado en pesos por las recargas, **sin incluir** el impuesto 4x1000 de las transferencias.',
            comoSeCalcula: 'Se suma el campo **Costo COP** de cada recarga. Ojo: el Dashboard y Análisis Financiero reportan el costo **con** impuesto — esa cifra es la tarjeta "Costo Total" de al lado.',
            origen: 'Campo Costo COP de cada registro de este módulo.',
          })} />
        <StatCard icon={DollarSign}  label="Costo Total (+4x1000)" value={fmtCOP(stats.totalConImpuesto)}  variant="outline" sub="La cifra del Dashboard"
          onClick={() => setExplain({
            title: 'Costo Total (+4x1000)', value: fmtCOP(stats.totalConImpuesto), icon: DollarSign,
            queEs: 'El costo real completo de operar: recargas más el impuesto 4x1000 que cobra el banco por cada transferencia.',
            comoSeCalcula: '**Costo COP + impuesto 4x1000** de cada recarga, sumados. Esta es exactamente la cifra que el Dashboard muestra como "Costos históricos" y Análisis Financiero como "OPEX" — así todo coincide entre módulos.',
            origen: `Campos Costo COP (${fmtCOP(stats.totalCostoCOP)}) + Imp. 4x1000 (${fmtCOP(stats.totalImpuesto)}) de este módulo.`,
          })} />
        <StatCard icon={TrendingUp}  label="Total Costo USD"   value={fmtUSD(stats.totalCostoUSD)}        variant="light" sub="Inversión en dólares"
          onClick={() => setExplain({
            title: 'Total Costo USD', value: fmtUSD(stats.totalCostoUSD), icon: TrendingUp,
            queEs: 'Lo pagado en dólares por las recargas — el proveedor cobra en USD y la TRM del día define cuántos pesos cuesta.',
            comoSeCalcula: 'Se suma el campo **Costo USD** de cada recarga. La relación con el costo en pesos es la TRM: Costo COP ÷ Costo USD.',
            origen: 'Campo Costo USD de cada registro de este módulo.',
          })} />
        <StatCard icon={BarChart3}   label="Total Créditos"    value={stats.totalCreditos.toLocaleString()} variant="light"  sub="Créditos comprados"
          onClick={() => setExplain({
            title: 'Total Créditos', value: stats.totalCreditos.toLocaleString(), icon: BarChart3,
            queEs: 'Cuántos créditos (cupos de cuenta) se han comprado en total — la "materia prima" que luego se convierte en pantallas vendibles.',
            comoSeCalcula: 'Se suma el campo **Créditos** de cada recarga. Cada crédito habilita una cuenta que suele soportar 3 pantallas.',
            origen: 'Campo Créditos de cada registro de este módulo.',
          })} />
      </div>

      {/* ─── Evolución mensual del costo (OPEX) y TRM ─────────────────────── */}
      {serieMensualCosto.length >= 2 && (
        <Card className="border-orange-100 mb-6">
          <CardHeader className="border-orange-50">
            <CardTitle>Evolución mensual del costo (con 4x1000) y TRM</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Barras = costo total del mes (la misma serie "OPEX" de Análisis Financiero) · Línea azul = TRM promedio pagada</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={serieMensualCosto} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716c' }} interval="preserveStartEnd" />
                <YAxis yAxisId="cop" tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}K`} tick={{ fontSize: 10, fill: '#78716c' }} width={52} />
                <YAxis yAxisId="trm" orientation="right" tickFormatter={(v) => `$${v.toLocaleString('es-CO')}`} tick={{ fontSize: 10, fill: '#78716c' }} width={54} domain={['auto', 'auto']} />
                <Tooltip formatter={(v, name) => name === 'TRM promedio' ? [`$${Number(v).toLocaleString('es-CO')}`, name] : [formatCurrency(v), name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="cop" dataKey="costo" name="Costo total" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                <Line yAxisId="trm" dataKey="trm" name="TRM promedio" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={(() => {
              const conTrm = serieMensualCosto.filter(m => m.trm != null)
              if (conTrm.length < 2) return null
              const primera = conTrm[0], ultima = conTrm[conTrm.length - 1]
              const varTrm = ((ultima.trm - primera.trm) / primera.trm) * 100
              const pico = serieMensualCosto.reduce((a, b) => (b.costo > a.costo ? b : a))
              return `El mes de mayor inversión fue **${pico.label}** (${formatCurrency(pico.costo)}). La TRM promedio pasó de $${primera.trm.toLocaleString('es-CO')} a $${ultima.trm.toLocaleString('es-CO')} (${varTrm >= 0 ? '+' : ''}${varTrm.toFixed(1)}%) — ${varTrm > 5 ? 'cada crédito cuesta más pesos que antes: si el precio de venta no sube en la misma proporción, el margen se comprime.' : varTrm < -5 ? 'el dólar ha bajado y cada crédito cuesta menos pesos — un viento a favor del margen.' : 'la estabilidad cambiaria mantiene el costo unitario predecible.'}`
            })()} />
          </CardBody>
        </Card>
      )}

      {/* Búsqueda */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ID, acción, mes, año, medio pago…"
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
              <p className="text-gray-500">Cargando costos…</p>
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
                      key={row.id}
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
                        No se encontraron registros.
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
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editing ? 'Editar Registro' : 'Nueva Recarga'}
                </h2>
                <p className="text-orange-100 text-sm">
                  {editing ? `Editando ${editing.idRec}` : 'Complete los campos'}
                </p>
              </div>
              <button onClick={closeForm} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Sección: Identificación */}
              <section>
                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3 border-b border-orange-100 pb-1">
                  Identificación
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ID Registro</label>
                    <input value={form.idRec} onChange={f('idRec')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm font-mono" placeholder="R39" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Acción</label>
                    <select value={form.accion} onChange={f('accion')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white">
                      <option>Recarga</option>
                      <option>Compra</option>
                      <option>Ajuste</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Créditos</label>
                    <input type="number" value={form.creditos} onChange={f('creditos')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                    <input type="number" min="1" value={form.itemQuantity} onChange={f('itemQuantity')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                </div>
              </section>

              {/* Sección: Fechas */}
              <section>
                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3 border-b border-orange-100 pb-1">
                  Fecha
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                    <input type="date" value={form.fecha} onChange={f('fecha')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Año (auto)</label>
                    <input value={form.anio} onChange={f('anio')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mes (auto)</label>
                    <input value={form.mes} onChange={f('mes')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm" />
                  </div>
                </div>
              </section>

              {/* Sección: Costos */}
              <section>
                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3 border-b border-orange-100 pb-1">
                  Costos
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Costo COP</label>
                    <CurrencyInput value={form.costoCOP} onChange={f('costoCOP')} decimals={0}
                      className="border-orange-200 focus:ring-orange-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Impuesto 4x1000 COP (auto)</label>
                    <CurrencyInput value={form.impuesto4x100COP} onChange={f('impuesto4x100COP')} decimals={0}
                      className="border-gray-200 bg-gray-50 text-gray-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Costo USD</label>
                    <CurrencyInput value={form.costoUSD} onChange={f('costoUSD')} decimals={2}
                      className="border-orange-200 focus:ring-orange-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">TRM</label>
                    <CurrencyInput value={form.trm} onChange={f('trm')} decimals={2} prefix=""
                      className="border-orange-200 focus:ring-orange-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cto. Unit. Cuenta USD</label>
                    <CurrencyInput value={form.costoUnitarioCuentaUSD} onChange={f('costoUnitarioCuentaUSD')} decimals={2}
                      className="border-orange-200 focus:ring-orange-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cto. Unit. Cuenta COP</label>
                    <CurrencyInput value={form.costoUnitarioCuentaCOP} onChange={f('costoUnitarioCuentaCOP')} decimals={0}
                      className="border-orange-200 focus:ring-orange-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cto. Pantalla USD</label>
                    <CurrencyInput value={form.costoPantallaUSD} onChange={f('costoPantallaUSD')} decimals={2}
                      className="border-orange-200 focus:ring-orange-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cto. Pantalla COP</label>
                    <CurrencyInput value={form.costoPantallaCOP} onChange={f('costoPantallaCOP')} decimals={0}
                      className="border-orange-200 focus:ring-orange-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Medio de Pago</label>
                    <select value={form.medioPago} onChange={f('medioPago')}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm bg-white">
                      <option>Nequi</option>
                      <option>Bancolombia</option>
                      <option>Daviplata</option>
                      <option>Efectivo</option>
                      <option>Otro</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={closeForm}
                  className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit"
                  className="px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow transition-colors">
                  {editing ? 'Guardar cambios' : 'Crear registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
