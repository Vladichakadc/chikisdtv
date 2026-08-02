import { useEffect, useState, useMemo, useRef } from 'react'
import {
  DollarSign, ShoppingCart, RotateCcw, Zap, Calendar, ChevronDown, Activity,
  Receipt, Users, LineChart as LineChartIcon, Lightbulb, Scale, Filter,
} from 'lucide-react'
import api from '../../config/api'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { KpiCard } from '../../components/ui/KpiCard'
import { formatCurrency } from '../../utils/excelUtils'
import { cn } from '../../utils/cn'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts'
import { ChartInsight, PIE_COLORS, LABEL_STYLE, renderDonutLabel } from './dashboard/biShared'
import { IncomeByPlanYearChart } from './dashboard/IncomeByPlanYearChart'

const fmtCOP = (v) => (v == null || v === '' ? '—' : formatCurrency(v))

// Cortesia (regalo, $0) y Cambio de Plan (registro administrativo, no es una
// transacción real) no cuentan como ingreso — misma exclusión que ya aplican
// dashboard-bi y /plans/performance, para que las cifras coincidan entre módulos.
const esIngresoReal = (r) => r.tipoPago !== 'Cortesia' && r.tipoPago !== 'Cambio de Plan'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MES_ABREV = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const normMes = m => (m || '').trim().toLowerCase()
const MES_NUM = Object.fromEntries(MESES.map((m, i) => [normMes(m), i + 1]))

const CSS = `
  @keyframes pg-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes pg-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes pg-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  .pg-a1 { animation: pg-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .pg-orb-1 { animation: pg-orb-1 8s ease-in-out infinite }
  .pg-orb-2 { animation: pg-orb-2 11s ease-in-out infinite }
  .pg-chart-controls { display: flex; flex-wrap: wrap; gap: 4px; background: #f1f5f9; border-radius: 10px; padding: 3px; }
  .pg-chart-btn {
    padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700;
    cursor: pointer; transition: all .18s; border: none; background: transparent; color: #64748b;
    white-space: nowrap;
  }
  .pg-chart-btn.active { background: #fff; color: #047857; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .pg-filter-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .pg-filter-tag {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em;
  }
`

// PagoCard → KpiCard global (dark Huashu)
const PagoCard = (props) => <KpiCard {...props} tone="emerald" />

function ChartChips({ options, value, onChange }) {
  return (
    <div className="pg-chart-controls">
      {options.map(o => (
        <button key={o.key} type="button" className={`pg-chart-btn ${String(value) === String(o.key) ? 'active' : ''}`} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
function ChartControlsRow({ children }) {
  return (
    <div className="pg-filter-row">
      <span className="pg-filter-tag"><Filter size={11} /> Esta gráfica</span>
      {children}
    </div>
  )
}
function PremiumTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #e2e8f0', borderLeft: '3px solid #059669', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', minWidth: 180 }}>
      <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#64748b', fontWeight: 600 }}>
          {p.name}: {formatter ? formatter(p.value, p.name) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function AnalisisPagosPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedYears, setSelectedYears] = useState(null)
  const [yearMenuOpen, setYearMenuOpen] = useState(false)
  const yearMenuRef = useRef(null)

  const [selectedMonths, setSelectedMonths] = useState(null)
  const [monthMenuOpen, setMonthMenuOpen] = useState(false)
  const monthMenuRef = useRef(null)

  const [explain, setExplain] = useState(null)

  const [incomeByPlanYear, setIncomeByPlanYear] = useState([])
  const [tiposPlanes, setTiposPlanes] = useState([])
  const [incomeByPlanYearError, setIncomeByPlanYearError] = useState(null)
  const [incomeByPlanYearLoading, setIncomeByPlanYearLoading] = useState(false)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/admin/payments/ventas-licencia')
      setRows(data)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadIncomeByPlanYear = async () => {
    setIncomeByPlanYearLoading(true)
    setIncomeByPlanYearError(null)
    try {
      const { data } = await api.get('/admin/payments/ventas-licencia-by-plan-year')
      if (!data || !data.series || !Array.isArray(data.series)) {
        throw new Error('Respuesta del servidor sin estructura esperada')
      }
      setIncomeByPlanYear(data.series || [])
      setTiposPlanes(data.tiposPlanes || [])
    } catch (e) {
      console.error('Error cargando ingresos por plan y año:', e.message, e.response?.status, e.response?.data)
      setIncomeByPlanYearError(e.response?.data?.error || e.message || 'Error al cargar datos')
      setIncomeByPlanYear([])
      setTiposPlanes([])
    } finally {
      setIncomeByPlanYearLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { loadIncomeByPlanYear() }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (yearMenuRef.current && !yearMenuRef.current.contains(event.target)) setYearMenuOpen(false)
      if (monthMenuRef.current && !monthMenuRef.current.contains(event.target)) setMonthMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const searched = useMemo(() => {
    let result = rows
    if (selectedYears !== null) {
      result = result.filter(r => selectedYears.includes(String(r.anio || '')))
    }
    if (selectedMonths !== null) {
      const wanted = new Set(selectedMonths.map(normMes))
      result = result.filter(r => wanted.has(normMes(r.mes)))
    }
    return result
  }, [rows, selectedYears, selectedMonths])

  const stats = useMemo(() => {
    const total       = searched.length
    const ingresos    = searched.filter(esIngresoReal).reduce((s, r) => s + (Number(r.precioVenta) || 0), 0)
    const renovaciones = searched.filter(r => r.tipoPago === 'Renovacion').length
    const activaciones = searched.filter(r => r.tipoPago?.startsWith('Activacion')).length
    return { total, ingresos, renovaciones, activaciones }
  }, [searched])

  const porMedioPago = useMemo(() => {
    const map = {}
    for (const r of searched.filter(esIngresoReal)) {
      const medio = (r.medioPago || '').trim() || 'Sin registrar'
      map[medio] = (map[medio] || 0) + (Number(r.precioVenta) || 0)
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
  }, [searched])

  const porTipoPlan = useMemo(() => {
    const map = {}
    for (const r of searched.filter(esIngresoReal)) {
      const plan = (r.tipoPlan || '').trim() || 'Sin clasificar'
      if (!map[plan]) map[plan] = { plan, ingresos: 0, ventas: 0 }
      map[plan].ingresos += Number(r.precioVenta) || 0
      map[plan].ventas += 1
    }
    return Object.values(map)
      .map(p => ({ ...p, ingresos: Math.round(p.ingresos), ticket: p.ventas > 0 ? Math.round(p.ingresos / p.ventas) : 0 }))
      .sort((a, b) => b.ingresos - a.ingresos)
  }, [searched])

  // ── Controles locales de las gráficas nuevas (independientes del filtro global) ──
  const [evolAnio, setEvolAnio]     = useState('todos')
  const [paretoTopN, setParetoTopN] = useState('10')

  // ── Evolución mensual de ingresos + ticket promedio (histórico completo, sin filtro global) ──
  const serieMensual = useMemo(() => {
    let src = rows.filter(esIngresoReal)
    if (evolAnio !== 'todos') src = src.filter(r => String(r.anio) === evolAnio)
    const map = {}
    for (const r of src) {
      const mm = MES_NUM[normMes(r.mes)] || 0
      if (!mm || !r.anio) continue
      const key = `${r.anio}-${String(mm).padStart(2, '0')}`
      if (!map[key]) map[key] = { key, ingresos: 0, ventas: 0 }
      map[key].ingresos += Number(r.precioVenta) || 0
      map[key].ventas += 1
    }
    const hoy = new Date()
    const keyHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).map(x => {
      const [anio, mm] = x.key.split('-')
      return {
        label: `${MES_ABREV[Number(mm) - 1]} ${anio.slice(2)}`,
        ingresos: Math.round(x.ingresos),
        ventas: x.ventas,
        ticket: x.ventas > 0 ? Math.round(x.ingresos / x.ventas) : 0,
        // El mes en curso está incompleto — no es comparable con meses cerrados
        // (evita que una "caída" de fin de mes se lea como una señal real).
        parcial: x.key === keyHoy,
      }
    })
  }, [rows, evolAnio])

  // ── Concentración de ingresos por cliente (Pareto 80/20) ──────────────────
  const pareto = useMemo(() => {
    const map = {}
    for (const r of rows.filter(esIngresoReal)) {
      const key = r.customerId || r.nickname || `${r.nombre || ''} ${r.apellido || ''}`.trim() || 'Sin identificar'
      if (!map[key]) map[key] = { cliente: r.nickname || `${r.nombre || ''} ${r.apellido || ''}`.trim() || key, ingresos: 0, ventas: 0 }
      map[key].ingresos += Number(r.precioVenta) || 0
      map[key].ventas += 1
    }
    const list = Object.values(map).sort((a, b) => b.ingresos - a.ingresos)
    const total = list.reduce((s, c) => s + c.ingresos, 0)
    let acc = 0
    const withCum = list.map(c => {
      acc += c.ingresos
      return { ...c, ingresos: Math.round(c.ingresos), pctAcum: total > 0 ? Number(((acc / total) * 100).toFixed(1)) : 0 }
    })
    const n80 = withCum.findIndex(c => c.pctAcum >= 80) + 1
    return { list: withCum, total: Math.round(total), n80: n80 || withCum.length, totalClientes: withCum.length }
  }, [rows])

  const paretoChartData = useMemo(() => {
    const n = paretoTopN === 'todos' ? pareto.list.length : Number(paretoTopN)
    return pareto.list.slice(0, n)
  }, [pareto, paretoTopN])

  // ── Tendencia YTD vs mismo período del año anterior (estable, no depende del filtro de la página) ──
  const trendStats = useMemo(() => {
    const hoy = new Date()
    const anioHoy = hoy.getFullYear()
    // Tope en el último mes CERRADO (no en mesHoy): `mm > mesHoy` solo excluía
    // los meses futuros, pero dejaba pasar el mes en curso — comparado contra
    // el mismo mes ya cerrado del año anterior, siempre perdía por incompleto.
    const mesesCerrados = hoy.getMonth() // 0-based = cantidad de meses ya cerrados
    let ytd = 0, ytdAnt = 0, ventasYtd = 0, ventasYtdAnt = 0
    for (const r of rows.filter(esIngresoReal)) {
      const anio = Number(r.anio)
      const mm = MES_NUM[normMes(r.mes)] || 0
      if (!anio || !mm || mm > mesesCerrados) continue
      const monto = Number(r.precioVenta) || 0
      if (anio === anioHoy) { ytd += monto; ventasYtd += 1 }
      else if (anio === anioHoy - 1) { ytdAnt += monto; ventasYtdAnt += 1 }
    }
    const growthIngresos = ytdAnt > 0 ? Number((((ytd - ytdAnt) / ytdAnt) * 100).toFixed(1)) : null
    const ticketYtd = ventasYtd > 0 ? ytd / ventasYtd : 0
    const ticketYtdAnt = ventasYtdAnt > 0 ? ytdAnt / ventasYtdAnt : 0
    const growthTicket = ticketYtdAnt > 0 ? Number((((ticketYtd - ticketYtdAnt) / ticketYtdAnt) * 100).toFixed(1)) : null
    return { ytd, ytdAnt, growthIngresos, ticketYtd: Math.round(ticketYtd), growthTicket }
  }, [rows])

  // ── Recomendaciones narrativas para alta gerencia ──────────────────────────
  const recomendaciones = useMemo(() => {
    const out = []
    if (trendStats.growthIngresos != null) {
      out.push(trendStats.growthIngresos >= 0
        ? `Los ingresos de este año van **${trendStats.growthIngresos.toFixed(1)}% por encima** del mismo período del año anterior (${fmtCOP(trendStats.ytd)} vs ${fmtCOP(trendStats.ytdAnt)}).`
        : `Los ingresos de este año van **${Math.abs(trendStats.growthIngresos).toFixed(1)}% por debajo** del mismo período del año anterior (${fmtCOP(trendStats.ytd)} vs ${fmtCOP(trendStats.ytdAnt)}) — vale la pena revisar qué canal o plan explica la caída antes de que se acumule más.`)
    }
    if (porMedioPago.length > 0) {
      const totalMedios = porMedioPago.reduce((s, p) => s + p.value, 0)
      const pctTop = totalMedios > 0 ? (porMedioPago[0].value / totalMedios) * 100 : 0
      if (pctTop >= 55) {
        out.push(`**${porMedioPago[0].name}** concentra el **${pctTop.toFixed(0)}%** del recaudo — una dependencia alta de un solo canal de pago; si cambian sus condiciones o falla, el impacto en caja sería inmediato. Conviene incentivar un segundo canal activo.`)
      }
    }
    if (pareto.totalClientes >= 5) {
      const pctClientes = (pareto.n80 / pareto.totalClientes) * 100
      out.push(`El **80%** de los ingresos proviene de solo **${pareto.n80} de ${pareto.totalClientes} clientes** (${pctClientes.toFixed(1)}% de la base) — ${pctClientes < 20 ? 'concentración alta: perder a los clientes top tendría un impacto financiero desproporcionado, conviene un plan de retención dedicado a ese grupo.' : 'la base de ingresos está razonablemente distribuida entre clientes.'}`)
    }
    if (porTipoPlan.length > 0) {
      out.push(`**${porTipoPlan[0].plan}** es la línea que más ingresos genera (${fmtCOP(porTipoPlan[0].ingresos)}, ticket promedio ${fmtCOP(porTipoPlan[0].ticket)}) — es la referencia a proteger en cualquier ajuste de precios.`)
    }
    if (trendStats.growthTicket != null && Math.abs(trendStats.growthTicket) >= 5) {
      out.push(trendStats.growthTicket > 0
        ? `El ticket promedio subió **${trendStats.growthTicket.toFixed(1)}%** frente al año anterior (${fmtCOP(trendStats.ticketYtd)} actual) — buena señal de mix de planes más altos o menos descuentos.`
        : `El ticket promedio bajó **${Math.abs(trendStats.growthTicket).toFixed(1)}%** frente al año anterior (${fmtCOP(trendStats.ticketYtd)} actual) — revisar si hay presión de descuentos o migración hacia planes más económicos.`)
    }
    if (out.length === 0) out.push('No se detectan alertas relevantes: ingresos, concentración de canal y de clientes se mantienen en rangos estables.')
    return out
  }, [trendStats, porMedioPago, pareto, porTipoPlan])

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3" />
        <p className="text-gray-500">Cargando datos de pagos…</p>
      </div>
    )
  }

  if (error) {
    return <p className="p-8 text-center text-red-500">{error}</p>
  }

  return (
    <div className="p-6 space-y-6 pb-12">
      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="pg-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#064e3b 0%,#022c22 100%)' }}>
        <div className="pg-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#10b981,transparent 70%)' }} />
        <div className="pg-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.15] pointer-events-none" style={{ background: 'radial-gradient(circle,#059669,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 mb-4">
              <Activity size={12} className="text-emerald-300" />
              <span className="text-emerald-300 text-xs font-semibold tracking-widest uppercase">Análisis Financiero</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Análisis de Pagos
            </h1>
            <p className="text-emerald-100/70 text-sm mt-2">
              Visualiza cómo se distribuyen los ingresos
            </p>
          </div>
        </div>
      </div>

      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

      {/* Búsqueda y filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Filtro por Año */}
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
                <input type="checkbox" checked={allYearsSelected} onChange={toggleAllYears} className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
                Seleccionar todos
              </label>
              <div className="max-h-56 overflow-auto">
                {yearOptions.map(year => (
                  <label key={year} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer text-sm text-gray-600">
                    <input type="checkbox" checked={isYearSelected(year)} onChange={() => toggleYear(year)} className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
                    {year}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filtro por Mes */}
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
                <input type="checkbox" checked={allMonthsSelected} onChange={toggleAllMonths} className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
                Seleccionar todos
              </label>
              <div className="max-h-56 overflow-auto">
                {monthOptions.map(month => (
                  <label key={month} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer text-sm text-gray-600">
                    <input type="checkbox" checked={isMonthSelected(month)} onChange={() => toggleMonth(month)} className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
                    {month}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <PagoCard icon={ShoppingCart} label="Total Registros" value={stats.total.toLocaleString()} variant="solid" sub={(selectedYears !== null || selectedMonths !== null) ? 'Resultados filtrados' : 'Histórico completo'}
          onClick={() => setExplain({
            title: 'Total Registros', value: stats.total.toLocaleString(), icon: ShoppingCart,
            queEs: 'Cuántas ventas de licencias hay en la vista actual. Si tienes un filtro de búsqueda, año o mes activo, el número refleja solo lo filtrado.',
            comoSeCalcula: 'Conteo simple de las filas de la tabla de ventas que pasan el filtro activo. **Sin filtros, coincide con el histórico completo.**',
            origen: 'Tabla de ventas de licencias de este módulo.',
          })} />
        <PagoCard icon={DollarSign} label="Ingresos Totales" value={fmtCOP(stats.ingresos)} variant="light" sub="YTD vs año anterior" trend={trendStats.growthIngresos}
          onClick={() => setExplain({
            title: 'Ingresos Totales', value: fmtCOP(stats.ingresos), icon: DollarSign,
            queEs: 'La plata que ha entrado por ventas de licencias en la vista actual. La tendencia (↑/↓) compara lo corrido de este año contra el mismo período del año anterior, sin importar el filtro activo.',
            comoSeCalcula: 'Se **suma el precio de venta** de cada registro visible. Tendencia: (YTD actual − YTD año anterior) / YTD año anterior.',
            origen: 'Campo precio de venta de cada fila de este módulo.',
          })} />
        <PagoCard icon={Receipt} label="Ticket Promedio" value={fmtCOP(stats.total > 0 ? stats.ingresos / stats.total : 0)} variant="outline" sub="YTD vs año anterior" trend={trendStats.growthTicket}
          onClick={() => setExplain({
            title: 'Ticket Promedio', value: fmtCOP(stats.total > 0 ? stats.ingresos / stats.total : 0), icon: Receipt,
            queEs: 'Cuánto deja en promedio cada venta — sube si se venden más planes largos/caros o si hay menos descuentos, baja en el caso contrario.',
            comoSeCalcula: 'Ingresos totales de la vista ÷ número de registros. Tendencia: ticket promedio YTD vs mismo período del año anterior.',
            origen: 'Campos precio de venta de cada fila de este módulo.',
          })} />
        <PagoCard icon={RotateCcw} label="Renovaciones" value={stats.renovaciones.toLocaleString()} variant="outline" sub="Clientes recurrentes"
          onClick={() => setExplain({
            title: 'Renovaciones', value: stats.renovaciones.toLocaleString(), icon: RotateCcw,
            queEs: 'Ventas de clientes que ya estaban y volvieron a pagar.',
            comoSeCalcula: 'Se cuentan los registros visibles cuyo **tipo de pago es "Renovacion"**.',
            origen: 'Campo tipo de pago de cada venta de este módulo.',
          })} />
        <PagoCard icon={Zap} label="Activaciones" value={stats.activaciones.toLocaleString()} variant="light" sub="Nuevas pantallas"
          onClick={() => setExplain({
            title: 'Activaciones', value: stats.activaciones.toLocaleString(), icon: Zap,
            queEs: 'Ventas que representan pantallas o clientes nuevos.',
            comoSeCalcula: 'Se cuentan los registros visibles cuyo tipo de pago **empieza por "Activacion"**.',
            origen: 'Campo tipo de pago de cada venta de este módulo.',
          })} />
      </div>

      {/* Evolución mensual de ingresos y ticket promedio (histórico completo) */}
      {serieMensual.length >= 2 && (
        <Card className="border-orange-100 mb-4">
          <CardHeader className="border-orange-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LineChartIcon size={18} className="text-emerald-600" />
                <div>
                  <CardTitle>Evolución mensual de ingresos</CardTitle>
                  <p className="text-sm text-gray-400 mt-0.5">Barras = ingresos del mes · línea = ticket promedio · histórico completo, independiente del filtro superior</p>
                </div>
              </div>
              <ChartControlsRow>
                <ChartChips options={[{ key: 'todos', label: 'Todos' }, ...yearOptions.map(y => ({ key: y, label: y }))]} value={evolAnio} onChange={setEvolAnio} />
              </ChartControlsRow>
            </div>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={serieMensual} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#a7f3d0" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716c' }} interval="preserveStartEnd" />
                <YAxis yAxisId="cop" tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}K`} tick={{ fontSize: 10, fill: '#78716c' }} width={52} />
                <YAxis yAxisId="ticket" orientation="right" tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}K`} tick={{ fontSize: 10, fill: '#78716c' }} width={52} />
                <Tooltip content={<PremiumTooltip formatter={(v, name) => name === 'Ventas' ? v : fmtCOP(v)} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="cop" dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[3, 3, 0, 0]}>
                  {serieMensual.map((m, i) => <Cell key={i} fill="#10b981" fillOpacity={m.parcial ? 0.35 : 1} stroke={m.parcial ? '#10b981' : 'none'} strokeDasharray={m.parcial ? '3 2' : undefined} />)}
                </Bar>
                <Line yAxisId="ticket" dataKey="ticket" name="Ticket promedio" stroke="#6366f1" strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={(() => {
              if (serieMensual.length < 2) return null
              // Compara los últimos dos meses CERRADOS — el mes en curso está
              // incompleto y su caída natural de fin de mes no es una señal real.
              const cerrados = serieMensual.filter(m => !m.parcial)
              const ultimo = cerrados[cerrados.length - 1]
              const penultimo = cerrados[cerrados.length - 2]
              const momPct = ultimo && penultimo && penultimo.ingresos > 0 ? ((ultimo.ingresos - penultimo.ingresos) / penultimo.ingresos) * 100 : null
              const pico = cerrados.length > 0 ? cerrados.reduce((a, b) => (b.ingresos > a.ingresos ? b : a)) : null
              const mesEnCurso = serieMensual[serieMensual.length - 1]?.parcial ? serieMensual[serieMensual.length - 1] : null
              return `${pico ? `El mes de mayor recaudo fue **${pico.label}** (${fmtCOP(pico.ingresos)}).` : ''} ${momPct != null ? `De ${penultimo.label} a ${ultimo.label} (últimos meses cerrados) los ingresos ${momPct >= 0 ? 'subieron' : 'bajaron'} **${Math.abs(momPct).toFixed(1)}%** mes a mes.` : ''} ${mesEnCurso ? `**${mesEnCurso.label}** está en curso — su valor parcial (${fmtCOP(mesEnCurso.ingresos)} hasta hoy) todavía no es comparable con un mes cerrado.` : ''} Usa este gráfico para detectar estacionalidad y anticipar meses flojos con campañas de renovación.`
            })()} />
          </CardBody>
        </Card>
      )}

      {/* Composición financiera */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-orange-100">
          <CardHeader className="border-orange-50">
            <CardTitle>Ingresos por medio de pago</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Por dónde entra la plata — refleja el filtro activo</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={porMedioPago} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} label={renderDonutLabel} labelLine={false}>
                  {porMedioPago.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-1">
              {porMedioPago.slice(0, 5).map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {p.name}
                  </span>
                  <span className="font-semibold text-brand-accent">{formatCurrency(p.value)}</span>
                </div>
              ))}
            </div>
            <ChartInsight text={porMedioPago.length > 0
              ? `**${porMedioPago[0].name}** es el canal de recaudo dominante con ${formatCurrency(porMedioPago[0].value)}${porMedioPago.length > 1 ? `, seguido de **${porMedioPago[1].name}** (${formatCurrency(porMedioPago[1].value)})` : ''}. Concentrar el recaudo en pocos canales simplifica la conciliación, pero conviene mantener al menos dos activos por si uno falla o cambia sus comisiones.`
              : null} />
          </CardBody>
        </Card>

        <Card className="border-orange-100">
          <CardHeader className="border-orange-50">
            <CardTitle>Ingresos por tipo de plan</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Qué planes sostienen el ingreso — con ticket promedio por plan</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={porTipoPlan} layout="vertical" margin={{ top: 5, right: 70, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}K`} tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis type="category" dataKey="plan" tick={{ fontSize: 11, fill: '#78716c' }} width={100} />
                <Tooltip formatter={(v, name, p) => [`${formatCurrency(v)} · ${p.payload.ventas} ventas · ticket ${formatCurrency(p.payload.ticket)}`, 'Ingresos']} />
                <Bar dataKey="ingresos" name="Ingresos" radius={[0, 6, 6, 0]} barSize={22}>
                  {porTipoPlan.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  <LabelList dataKey="ingresos" position="right" formatter={(v) => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : formatCurrency(v)} style={{ ...LABEL_STYLE, fontSize: 11 }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={porTipoPlan.length > 0
              ? `**${porTipoPlan[0].plan}** lidera con ${formatCurrency(porTipoPlan[0].ingresos)} en ${porTipoPlan[0].ventas} ventas (ticket promedio ${formatCurrency(porTipoPlan[0].ticket)}). Los planes largos (semestral/anual) adelantan caja pero "esconden" el churn; los mensuales dan señal temprana de fuga.`
              : null} />
          </CardBody>
        </Card>
      </div>

      {/* Gráfica de ingresos por tipo de plan por años */}
      <Card className="border-orange-100">
        <CardHeader className="border-orange-50">
          <CardTitle>Evolución de Ingresos por Tipo de Plan (Años)</CardTitle>
          <p className="text-sm text-gray-400 mt-0.5">Análisis histórico de composición de MRR: identifica cambios en mix de producto y crecimiento por línea de negocio</p>
        </CardHeader>
        <CardBody>
          <IncomeByPlanYearChart
            data={incomeByPlanYear}
            tiposPlanes={tiposPlanes}
            loading={incomeByPlanYearLoading}
            error={incomeByPlanYearError}
          />
          <ChartInsight text={tiposPlanes.length > 0
            ? `La composición de ingresos muestra **${tiposPlanes.sort((a, b) => {
              const totalA = incomeByPlanYear.reduce((s, y) => s + (y[a] || 0), 0);
              const totalB = incomeByPlanYear.reduce((s, y) => s + (y[b] || 0), 0);
              return totalB - totalA;
            })[0]}** como la línea de negocio principal. Monitorea la diversificación: planes únicos concentran riesgo, mientras mezclas balanceadas ofrecen resiliencia. Los planes largos (semestral/anual) adelantan caja pero pueden ocultar churn; los mensuales dan señal temprana de fuga.`
            : 'Agregando datos de ingresos por tipo de plan...'} />
        </CardBody>
      </Card>

      {/* Concentración de ingresos por cliente (Pareto 80/20) */}
      {pareto.totalClientes >= 5 && (
        <Card className="border-orange-100">
          <CardHeader className="border-orange-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-emerald-600" />
                <div>
                  <CardTitle>Concentración de ingresos por cliente</CardTitle>
                  <p className="text-sm text-gray-400 mt-0.5">Barras = ingresos por cliente · línea = % acumulado del total (regla 80/20) · histórico completo</p>
                </div>
              </div>
              <ChartControlsRow>
                <ChartChips options={[{ key: '10', label: 'Top 10' }, { key: '20', label: 'Top 20' }, { key: 'todos', label: 'Todos' }]} value={paretoTopN} onChange={setParetoTopN} />
              </ChartControlsRow>
            </div>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={paretoChartData} margin={{ top: 10, right: 12, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#a7f3d0" opacity={0.4} />
                <XAxis dataKey="cliente" tick={{ fontSize: 9, fill: '#78716c' }} interval={0} angle={-35} textAnchor="end" height={60} />
                <YAxis yAxisId="cop" tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}K`} tick={{ fontSize: 10, fill: '#78716c' }} width={52} />
                <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#78716c' }} width={40} />
                <Tooltip content={<PremiumTooltip formatter={(v, name) => name === '% acumulado' ? `${Number(v).toFixed(1)}%` : fmtCOP(v)} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="cop" dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Line yAxisId="pct" dataKey="pctAcum" name="% acumulado" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={`El **80%** de los ingresos históricos proviene de solo **${pareto.n80} de ${pareto.totalClientes} clientes** (${((pareto.n80 / pareto.totalClientes) * 100).toFixed(1)}% de la base). ${((pareto.n80 / pareto.totalClientes) * 100) < 20 ? 'Es una concentración alta — un plan de fidelización dedicado a ese grupo protege una porción desproporcionada del ingreso.' : 'La base de clientes está razonablemente diversificada, lo que reduce el riesgo de depender de pocas cuentas.'}`} />
          </CardBody>
        </Card>
      )}

      {/* Recomendaciones para la toma de decisiones */}
      <Card className="border-orange-100">
        <CardHeader className="border-orange-50">
          <div className="flex items-center gap-2">
            <Lightbulb size={18} className="text-emerald-600" />
            <CardTitle>Recomendaciones para la toma de decisiones</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <ul className="space-y-3">
            {recomendaciones.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                <Scale size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{r.split('**').map((chunk, j) => j % 2 === 1 ? <strong key={j} className="text-gray-800">{chunk}</strong> : chunk)}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}
