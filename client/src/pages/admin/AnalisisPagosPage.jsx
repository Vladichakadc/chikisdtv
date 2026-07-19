import { useEffect, useState, useMemo, useRef } from 'react'
import {
  DollarSign, ShoppingCart, RotateCcw, Zap, Calendar, ChevronDown, Activity
} from 'lucide-react'
import api from '../../config/api'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { KpiCard } from '../../components/ui/KpiCard'
import { formatCurrency } from '../../utils/excelUtils'
import { cn } from '../../utils/cn'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts'
import { ChartInsight, PIE_COLORS, LABEL_STYLE, renderDonutLabel } from './dashboard/biShared'
import { IncomeByPlanYearChart } from './dashboard/IncomeByPlanYearChart'

const fmtCOP = (v) => (v == null || v === '' ? '—' : formatCurrency(v))

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const normMes = m => (m || '').trim().toLowerCase()

const CSS = `
  @keyframes pg-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes pg-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes pg-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  .pg-a1 { animation: pg-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .pg-orb-1 { animation: pg-orb-1 8s ease-in-out infinite }
  .pg-orb-2 { animation: pg-orb-2 11s ease-in-out infinite }
`

// PagoCard → KpiCard global (dark Huashu)
const PagoCard = (props) => <KpiCard {...props} tone="emerald" />

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
    try {
      const { data } = await api.get('/admin/payments/ventas-licencia-by-plan-year')
      setIncomeByPlanYear(data.series || [])
      setTiposPlanes(data.tiposPlanes || [])
    } catch (e) {
      console.error('Error cargando ingresos por plan y año:', e.message)
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
    const ingresos    = searched.reduce((s, r) => s + (Number(r.precioVenta) || 0), 0)
    const renovaciones = searched.filter(r => r.tipoPago === 'Renovacion').length
    const activaciones = searched.filter(r => r.tipoPago?.startsWith('Activacion')).length
    return { total, ingresos, renovaciones, activaciones }
  }, [searched])

  const porMedioPago = useMemo(() => {
    const map = {}
    for (const r of searched) {
      const medio = (r.medioPago || '').trim() || 'Sin registrar'
      map[medio] = (map[medio] || 0) + (Number(r.precioVenta) || 0)
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
  }, [searched])

  const porTipoPlan = useMemo(() => {
    const map = {}
    for (const r of searched) {
      const plan = (r.tipoPlan || '').trim() || 'Sin clasificar'
      if (!map[plan]) map[plan] = { plan, ingresos: 0, ventas: 0 }
      map[plan].ingresos += Number(r.precioVenta) || 0
      map[plan].ventas += 1
    }
    return Object.values(map)
      .map(p => ({ ...p, ingresos: Math.round(p.ingresos), ticket: p.ventas > 0 ? Math.round(p.ingresos / p.ventas) : 0 }))
      .sort((a, b) => b.ingresos - a.ingresos)
  }, [searched])

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PagoCard icon={ShoppingCart} label="Total Registros" value={stats.total.toLocaleString()} variant="solid" sub={(selectedYears !== null || selectedMonths !== null) ? 'Resultados filtrados' : 'Histórico completo'}
          onClick={() => setExplain({
            title: 'Total Registros', value: stats.total.toLocaleString(), icon: ShoppingCart,
            queEs: 'Cuántas ventas de licencias hay en la vista actual. Si tienes un filtro de búsqueda, año o mes activo, el número refleja solo lo filtrado.',
            comoSeCalcula: 'Conteo simple de las filas de la tabla de ventas que pasan el filtro activo. **Sin filtros, coincide con el histórico completo.**',
            origen: 'Tabla de ventas de licencias de este módulo.',
          })} />
        <PagoCard icon={DollarSign} label="Ingresos Totales" value={fmtCOP(stats.ingresos)} variant="light" sub="Licencias vendidas"
          onClick={() => setExplain({
            title: 'Ingresos Totales', value: fmtCOP(stats.ingresos), icon: DollarSign,
            queEs: 'La plata que ha entrado por ventas de licencias en la vista actual.',
            comoSeCalcula: 'Se **suma el precio de venta** de cada registro visible.',
            origen: 'Campo precio de venta de cada fila de este módulo.',
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
          <IncomeByPlanYearChart data={incomeByPlanYear} tiposPlanes={tiposPlanes} />
          <ChartInsight text={tiposPlanes.length > 0
            ? `La composición de ingresos muestra **${tiposPlanes.sort((a, b) => {
              const totalA = incomeByPlanYear.reduce((s, y) => s + (y[a] || 0), 0);
              const totalB = incomeByPlanYear.reduce((s, y) => s + (y[b] || 0), 0);
              return totalB - totalA;
            })[0]}** como la línea de negocio principal. Monitorea la diversificación: planes únicos concentran riesgo, mientras mezclas balanceadas ofrecen resiliencia. Los planes largos (semestral/anual) adelantan caja pero pueden ocultar churn; los mensuales dan señal temprana de fuga.`
            : 'Agregando datos de ingresos por tipo de plan...'} />
        </CardBody>
      </Card>
    </div>
  )
}
