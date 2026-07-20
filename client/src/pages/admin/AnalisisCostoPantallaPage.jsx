import { useState, useMemo, useEffect } from 'react'
import {
  Monitor, Percent, Wallet, AlertTriangle,
  Lightbulb, Filter, Banknote, Scale, Landmark,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LabelList, Cell,
} from 'recharts'
import { ChartInsight } from './dashboard/biShared'
import { KpiCard } from '../../components/ui/KpiCard'
import api from '../../config/api'
import { useApiResource } from '../../hooks/useApiResource'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { formatCurrency } from '../../utils/excelUtils'

const MES_ORDEN = {
  ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
  JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
}
const MES_ABREV = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const fmtC = (v) => formatCurrency(v)

const CSS = `
  @keyframes acp-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes acp-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes acp-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  .acp-a1 { animation: acp-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .acp-a2 { animation: acp-fade-up .45s .08s cubic-bezier(.22,1,.36,1) both }
  .acp-a3 { animation: acp-fade-up .45s .16s cubic-bezier(.22,1,.36,1) both }
  .acp-orb-1 { animation: acp-orb-1 8s ease-in-out infinite }
  .acp-orb-2 { animation: acp-orb-2 11s ease-in-out infinite }
  .acp-chart-controls { display: flex; flex-wrap: wrap; gap: 4px; background: #f1f5f9; border-radius: 10px; padding: 3px; }
  .acp-chart-btn {
    padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700;
    cursor: pointer; transition: all .18s; border: none; background: transparent; color: #64748b;
    white-space: nowrap;
  }
  .acp-chart-btn.active { background: #fff; color: #c2410c; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .acp-filter-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .acp-filter-tag {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em;
  }
`

function ChartChips({ options, value, onChange }) {
  return (
    <div className="acp-chart-controls">
      {options.map(o => (
        <button key={o.key} type="button" className={`acp-chart-btn ${String(value) === String(o.key) ? 'active' : ''}`} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
function ChartToggle({ active, onClick, children }) {
  return (
    <button type="button" className={`acp-chart-btn ${active ? 'active' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}
function ChartControlsRow({ children }) {
  return (
    <div className="acp-filter-row">
      <span className="acp-filter-tag"><Filter size={11} /> Esta gráfica</span>
      {children}
    </div>
  )
}

function PremiumTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #e2e8f0', borderLeft: '3px solid #ea580c', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', minWidth: 180 }}>
      <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#64748b', fontWeight: 600 }}>
          {p.name}: {formatter ? formatter(p.value, p.name) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function AnalisisCostoPantallaPage() {
  const { data: recargas, loading: loadingRecargas } = useApiResource('/admin/payments/costo-pantalla')
  const [perf, setPerf] = useState(null)
  const [loadingPerf, setLoadingPerf] = useState(true)

  useEffect(() => {
    api.get('/admin/plans/performance')
      .then(r => setPerf(r.data))
      .catch(() => {})
      .finally(() => setLoadingPerf(false))
  }, [])

  const loading = loadingRecargas || loadingPerf

  // ── Controles locales por gráfica ──────────────────────────────────────
  const [costoUnitAnio, setCostoUnitAnio]   = useState('todos')
  const [margenSoloCosteables, setMargenSoloCosteables] = useState(true)
  const [eficienciaAnio, setEficienciaAnio] = useState('todos')

  const aniosDisponibles = useMemo(() => {
    const set = new Set(recargas.map(r => r.anio).filter(Boolean))
    return Array.from(set).sort()
  }, [recargas])

  // ── 1. Costo unitario por pantalla-mes + TRM ───────────────────────────
  const serieCostoUnitario = useMemo(() => {
    const map = {}
    for (const r of recargas) {
      const m = MES_ORDEN[(r.mes || '').toString().trim().toUpperCase()] || 0
      if (!m || !r.anio) continue
      if (costoUnitAnio !== 'todos' && String(r.anio) !== costoUnitAnio) continue
      const key = `${r.anio}-${String(m).padStart(2, '0')}`
      if (!map[key]) map[key] = { key, sumaCosto: 0, n: 0, sumaTrm: 0, nTrm: 0 }
      const cp = Number(r.costoPantallaCOP)
      if (cp > 0) { map[key].sumaCosto += cp; map[key].n += 1 }
      if (Number(r.trm) > 0) { map[key].sumaTrm += Number(r.trm); map[key].nTrm += 1 }
    }
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).map(x => {
      const [anio, mm] = x.key.split('-')
      return {
        label: `${MES_ABREV[Number(mm)]} ${anio.slice(2)}`,
        costoUnitario: x.n > 0 ? Math.round(x.sumaCosto / x.n) : null,
        trm: x.nTrm > 0 ? Math.round(x.sumaTrm / x.nTrm) : null,
      }
    })
  }, [recargas, costoUnitAnio])

  // ── 2. Margen por plan (ingresos vs costo estimado de servir el plan) ──
  const planesMargen = useMemo(() => {
    if (!perf?.planes) return []
    const list = margenSoloCosteables ? perf.planes.filter(p => p.costoEstimado != null) : perf.planes
    return list
      .map(p => ({
        plan: (p.plan || '').replace(/^Plan\s+/i, ''),
        ingresos: p.ingresos,
        costo: p.costoEstimado ?? 0,
        margenPct: p.margenPctEstimado,
        sinCosteo: p.costoEstimado == null,
      }))
      .sort((a, b) => b.ingresos - a.ingresos)
  }, [perf, margenSoloCosteables])

  // ── 3. Estructura del costo por año: recarga directa vs impuesto 4x1000 ─
  const estructuraCosto = useMemo(() => {
    const map = {}
    for (const r of recargas) {
      if (!r.anio) continue
      if (!map[r.anio]) map[r.anio] = { anio: r.anio, costo: 0, impuesto: 0 }
      map[r.anio].costo += Number(r.costoCOP) || 0
      map[r.anio].impuesto += Number(r.impuesto4x100COP) || 0
    }
    return Object.values(map).sort((a, b) => a.anio.localeCompare(b.anio)).map(x => {
      const total = x.costo + x.impuesto
      return { ...x, total, pctImpuesto: total > 0 ? Number(((x.impuesto / total) * 100).toFixed(2)) : 0 }
    })
  }, [recargas])

  // ── 4. Eficiencia por medio de pago ─────────────────────────────────────
  const eficienciaPago = useMemo(() => {
    let rows = recargas
    if (eficienciaAnio !== 'todos') rows = rows.filter(r => String(r.anio) === eficienciaAnio)
    const map = {}
    for (const r of rows) {
      const medio = r.medioPago || 'Sin registrar'
      const cp = Number(r.costoUnitarioCuentaCOP)
      if (!cp) continue
      if (!map[medio]) map[medio] = { medio, suma: 0, n: 0 }
      map[medio].suma += cp; map[medio].n += 1
    }
    return Object.values(map)
      .map(x => ({ medio: x.medio, costoPromedio: Math.round(x.suma / x.n), recargas: x.n }))
      .sort((a, b) => b.recargas - a.recargas)
  }, [recargas, eficienciaAnio])

  // ── 5. Sensibilidad cambiaria (TRM) sobre el costo total mensual ───────
  const sensibilidad = useMemo(() => {
    if (!perf?.costoPantalla || !perf?.totales) return []
    const trmBase = perf.costoPantalla.trmVigente || 0
    const costoVigenteCOP = perf.costoPantalla.vigente || 0
    const pantallas = perf.totales.pantallasVigentes || 0
    if (!trmBase || !costoVigenteCOP || !pantallas) return []
    const costoUnitUSD = costoVigenteCOP / trmBase
    return [-10, 0, 10, 20].map(pct => {
      const trm = Math.round(trmBase * (1 + pct / 100))
      const costoUnit = Math.round(costoUnitUSD * trm)
      return {
        label: pct === 0 ? 'TRM actual' : `TRM ${pct > 0 ? '+' : ''}${pct}%`,
        pct, trm, costoUnit,
        costoTotalMensual: Math.round(costoUnit * pantallas),
      }
    })
  }, [perf])

  // ── KPIs ─────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const cp = perf?.costoPantalla
    const costoVigente = cp?.vigente || 0
    const promedioHist = cp?.promedioHistorico || 0
    const trendCosto = promedioHist > 0 ? Number((((costoVigente - promedioHist) / promedioHist) * 100).toFixed(1)) : null

    const trms = recargas.filter(r => Number(r.trm) > 0).map(r => Number(r.trm))
    const trmPromHist = trms.length ? trms.reduce((s, v) => s + v, 0) / trms.length : 0
    const trendTrm = trmPromHist > 0 && cp?.trmVigente ? Number((((cp.trmVigente - trmPromHist) / trmPromHist) * 100).toFixed(1)) : null

    const costeables = (perf?.planes || []).filter(p => p.costoEstimado != null)
    const ingCosteable = costeables.reduce((s, p) => s + p.ingresos, 0)
    const costoCosteable = costeables.reduce((s, p) => s + p.costoEstimado, 0)
    const margenPct = ingCosteable > 0 ? Number((((ingCosteable - costoCosteable) / ingCosteable) * 100).toFixed(1)) : null

    const pantallas = perf?.totales?.pantallasVigentes || 0
    const exposicionMensual = costoVigente * pantallas

    const esc = sensibilidad
    const impacto20 = esc.length === 4 ? esc[3].costoTotalMensual - esc[1].costoTotalMensual : null

    return { costoVigente, promedioHist, trendCosto, trmVigente: cp?.trmVigente || 0, trmPromHist, trendTrm, margenPct, ingCosteable, costoCosteable, pantallas, exposicionMensual, impacto20 }
  }, [perf, recargas, sensibilidad])

  // ── Recomendaciones narrativas ──────────────────────────────────────────
  const recomendaciones = useMemo(() => {
    const out = []
    if (kpis.trendCosto != null && Math.abs(kpis.trendCosto) >= 5) {
      out.push(kpis.trendCosto > 0
        ? `El costo por pantalla-mes está **${kpis.trendCosto.toFixed(1)}% por encima** del promedio histórico (${fmtC(kpis.costoVigente)} vs ${fmtC(kpis.promedioHist)}) — si los precios de venta no se ajustan, el margen se sigue comprimiendo.`
        : `El costo por pantalla-mes está **${Math.abs(kpis.trendCosto).toFixed(1)}% por debajo** del promedio histórico — un viento a favor que se puede aprovechar para mejorar el margen o ser más competitivo en precio.`)
    }
    const peorPlan = planesMargen.filter(p => p.margenPct != null).sort((a, b) => a.margenPct - b.margenPct)[0]
    if (peorPlan && peorPlan.margenPct < 40) {
      out.push(`El plan **${peorPlan.plan}** tiene el margen más bajo (**${peorPlan.margenPct.toFixed(1)}%**) — ingresos de ${fmtC(peorPlan.ingresos)} frente a un costo estimado de ${fmtC(peorPlan.costo)}. Es candidato a revisión de precio.`)
    }
    if (kpis.impacto20 != null && kpis.impacto20 > 0) {
      out.push(`Una subida del dólar del **20%** sobre la TRM actual (${fmtC(kpis.trmVigente)}) elevaría el costo mensual total en **${fmtC(kpis.impacto20)}** (sobre ${kpis.pantallas} pantallas activas) sin que cambie ni un peso de ingreso — es el principal riesgo no controlable del negocio.`)
    }
    if (eficienciaPago.length >= 2) {
      const ordenado = [...eficienciaPago].filter(m => m.recargas >= 3).sort((a, b) => a.costoPromedio - b.costoPromedio)
      if (ordenado.length >= 2) {
        const barato = ordenado[0], caro = ordenado[ordenado.length - 1]
        const diffPct = ((caro.costoPromedio - barato.costoPromedio) / barato.costoPromedio) * 100
        if (diffPct >= 5) {
          out.push(`Recargar por **${caro.medio}** cuesta en promedio **${diffPct.toFixed(1)}% más** por cuenta que por **${barato.medio}** (${fmtC(caro.costoPromedio)} vs ${fmtC(barato.costoPromedio)}) — priorizar ${barato.medio} cuando el proveedor lo permita reduce el costo unitario sin ningún otro cambio.`)
        }
      }
    }
    if (out.length === 0) out.push('No se detectan alertas relevantes: el costo por pantalla, los márgenes por plan y la exposición cambiaria se mantienen dentro de rangos estables.')
    return out
  }, [kpis, planesMargen, eficienciaPago])

  return (
    <div>
      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="acp-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#7c2d12 0%,#431407 100%)' }}>
        <div className="acp-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#f97316,transparent 70%)' }} />
        <div className="acp-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.15] pointer-events-none" style={{ background: 'radial-gradient(circle,#ea580c,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative px-7 py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/25 mb-4">
            <Landmark size={12} className="text-orange-300" />
            <span className="text-orange-300 text-xs font-semibold tracking-widest uppercase">Alta gerencia</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
            Análisis Económico · Costo Pantalla
          </h1>
          <p className="text-orange-100/70 text-sm mt-2 max-w-2xl">
            Unidad económica del negocio: costo real por pantalla, márgenes por plan y exposición al riesgo cambiario — para decisiones de precio y compra.
          </p>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 acp-a2">
        <KpiCard icon={Monitor} label="Costo / pantalla (vigente)" value={fmtC(kpis.costoVigente)} loading={loading}
          tone="orange" delay={2} trend={kpis.trendCosto} sub={`vs histórico ${fmtC(kpis.promedioHist)}`} />
        <KpiCard icon={Banknote} label="TRM vigente" value={kpis.trmVigente ? `$${kpis.trmVigente.toLocaleString('es-CO')}` : '—'} loading={loading}
          tone="sky" delay={3} trend={kpis.trendTrm} sub={`vs promedio histórico $${Math.round(kpis.trmPromHist).toLocaleString('es-CO')}`} />
        <KpiCard icon={Percent} label="Margen bruto (costo pantalla)" value={kpis.margenPct != null ? `${kpis.margenPct.toFixed(1)}%` : '—'} loading={loading}
          tone={kpis.margenPct != null && kpis.margenPct < 40 ? 'red' : 'emerald'} delay={4}
          sub={`${fmtC(kpis.ingCosteable - kpis.costoCosteable)} sobre ${fmtC(kpis.ingCosteable)} en ingresos`} />
        <KpiCard icon={Wallet} label="Exposición mensual actual" value={fmtC(kpis.exposicionMensual)} loading={loading}
          tone="indigo" delay={5} sub={`${kpis.pantallas.toLocaleString()} pantallas activas`} />
        <KpiCard icon={AlertTriangle} label="Riesgo cambiario (TRM +20%)" value={kpis.impacto20 != null ? `+${fmtC(kpis.impacto20)}` : '—'} loading={loading}
          tone="red" delay={6} sub="Costo adicional/mes sin cambio de ingresos" />
      </div>

      {/* ── 1. Costo unitario por pantalla-mes + TRM ── */}
      {serieCostoUnitario.length >= 2 && (
        <Card className="border-orange-100 mb-6 acp-a3">
          <CardHeader className="border-orange-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Costo unitario por pantalla-mes y TRM</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Costo promedio de servir una pantalla por un mes (Costo Pantalla COP) · línea azul = TRM promedio pagada</p>
              </div>
              <ChartControlsRow>
                <ChartChips options={[{ key: 'todos', label: 'Todos' }, ...aniosDisponibles.map(a => ({ key: a, label: a }))]} value={costoUnitAnio} onChange={setCostoUnitAnio} />
              </ChartControlsRow>
            </div>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={serieCostoUnitario} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716c' }} interval="preserveStartEnd" />
                <YAxis yAxisId="cop" tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}K`} tick={{ fontSize: 10, fill: '#78716c' }} width={52} />
                <YAxis yAxisId="trm" orientation="right" tickFormatter={(v) => `$${v.toLocaleString('es-CO')}`} tick={{ fontSize: 10, fill: '#78716c' }} width={54} domain={['auto', 'auto']} />
                <Tooltip content={<PremiumTooltip formatter={(v, name) => name === 'TRM promedio' ? `$${Number(v).toLocaleString('es-CO')}` : fmtC(v)} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="cop" dataKey="costoUnitario" name="Costo unitario / pantalla" fill="#f97316" radius={[3, 3, 0, 0]} />
                <Line yAxisId="trm" dataKey="trm" name="TRM promedio" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={(() => {
              const conDatos = serieCostoUnitario.filter(m => m.costoUnitario != null)
              if (conDatos.length < 2) return null
              const primera = conDatos[0], ultima = conDatos[conDatos.length - 1]
              const varCosto = ((ultima.costoUnitario - primera.costoUnitario) / primera.costoUnitario) * 100
              return `Entre **${primera.label}** y **${ultima.label}** el costo unitario por pantalla pasó de ${fmtC(primera.costoUnitario)} a ${fmtC(ultima.costoUnitario)} (${varCosto >= 0 ? '+' : ''}${varCosto.toFixed(1)}%). ${varCosto > 5 ? 'Este es un costo variable creciente que erosiona margen si el precio de venta no se revisa.' : varCosto < -5 ? 'El costo por pantalla viene bajando — una oportunidad para mejorar margen o precio competitivo.' : 'El costo se mantiene estable en el período.'}`
            })()} />
          </CardBody>
        </Card>
      )}

      {/* ── 2. Margen por plan ── */}
      {planesMargen.length > 0 && (
        <Card className="border-orange-100 mb-6 acp-a3">
          <CardHeader className="border-orange-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Margen por plan</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Ingresos vs. costo estimado de servir cada plan (Costo Pantalla × meses de cobertura) · línea = margen %</p>
              </div>
              <ChartControlsRow>
                <ChartToggle active={margenSoloCosteables} onClick={() => setMargenSoloCosteables(v => !v)}>Solo planes costeables</ChartToggle>
              </ChartControlsRow>
            </div>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={planesMargen} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                <XAxis dataKey="plan" tick={{ fontSize: 10, fill: '#78716c' }} interval={0} angle={-12} textAnchor="end" height={50} />
                <YAxis yAxisId="cop" tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}K`} tick={{ fontSize: 10, fill: '#78716c' }} width={52} />
                <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#78716c' }} width={40} />
                <Tooltip content={<PremiumTooltip formatter={(v, name) => name === 'Margen %' ? `${Number(v).toFixed(1)}%` : fmtC(v)} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="cop" dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="cop" dataKey="costo" name="Costo estimado" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Line yAxisId="pct" dataKey="margenPct" name="Margen %" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={(() => {
              const conMargen = planesMargen.filter(p => p.margenPct != null)
              if (!conMargen.length) return null
              const mejor = conMargen.reduce((a, b) => b.margenPct > a.margenPct ? b : a)
              const peor = conMargen.reduce((a, b) => b.margenPct < a.margenPct ? b : a)
              return `El plan con mejor margen es **${mejor.plan}** (${mejor.margenPct.toFixed(1)}%) y el de menor margen es **${peor.plan}** (${peor.margenPct.toFixed(1)}%). ${peor.margenPct < 40 ? 'Este último es el primer candidato a revisión de precio o a promoción cruzada hacia planes más rentables.' : 'Todos los planes costeados mantienen un margen saludable.'}`
            })()} />
          </CardBody>
        </Card>
      )}

      {/* ── 3. Estructura del costo por año ── */}
      {estructuraCosto.length > 0 && (
        <Card className="border-orange-100 mb-6 acp-a3">
          <CardHeader className="border-orange-50">
            <CardTitle>Estructura del costo por año</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Costo directo de recarga vs. impuesto 4×1000 bancario — historial completo</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={estructuraCosto} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                <XAxis dataKey="anio" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}K`} tick={{ fontSize: 10, fill: '#78716c' }} width={52} />
                <Tooltip content={<PremiumTooltip formatter={(v) => fmtC(v)} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="costo" stackId="a" name="Costo directo" fill="#fb923c" radius={[0, 0, 0, 0]} />
                <Bar dataKey="impuesto" stackId="a" name="Impuesto 4x1000" fill="#78716c" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="pctImpuesto" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 10, fill: '#57534e', fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* ── 4. Eficiencia por medio de pago ── */}
      {eficienciaPago.length > 0 && (
        <Card className="border-orange-100 mb-6 acp-a3">
          <CardHeader className="border-orange-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Eficiencia por medio de pago</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Costo unitario promedio por cuenta recargada, según el medio de pago usado</p>
              </div>
              <ChartControlsRow>
                <ChartChips options={[{ key: 'todos', label: 'Todos' }, ...aniosDisponibles.map(a => ({ key: a, label: a }))]} value={eficienciaAnio} onChange={setEficienciaAnio} />
              </ChartControlsRow>
            </div>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={eficienciaPago} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                <XAxis dataKey="medio" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1e3)}K`} tick={{ fontSize: 10, fill: '#78716c' }} width={48} />
                <Tooltip content={<PremiumTooltip formatter={(v, name) => name === 'Recargas' ? v : fmtC(v)} />} />
                <Bar dataKey="costoPromedio" name="Costo unitario promedio" radius={[3, 3, 0, 0]}>
                  {eficienciaPago.map((_, i) => <Cell key={i} fill={['#f97316', '#6366f1', '#10b981', '#94a3b8'][i % 4]} />)}
                  <LabelList dataKey="recargas" position="top" formatter={(v) => `${v} rec.`} style={{ fontSize: 10, fill: '#57534e', fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* ── 5. Sensibilidad cambiaria (TRM) ── */}
      {sensibilidad.length > 0 && (
        <Card className="border-orange-100 mb-6 acp-a3">
          <CardHeader className="border-orange-50">
            <CardTitle>Sensibilidad al tipo de cambio (TRM)</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Impacto en el costo total mensual (base: {kpis.pantallas.toLocaleString()} pantallas activas) si la TRM se mueve respecto al valor vigente</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sensibilidad} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}K`} tick={{ fontSize: 10, fill: '#78716c' }} width={52} />
                <Tooltip content={<PremiumTooltip formatter={(v, name) => name === 'TRM' ? `$${Number(v).toLocaleString('es-CO')}` : fmtC(v)} />} />
                <Bar dataKey="costoTotalMensual" name="Costo total mensual" radius={[3, 3, 0, 0]}>
                  {sensibilidad.map((s, i) => <Cell key={i} fill={s.pct < 0 ? '#10b981' : s.pct === 0 ? '#f97316' : s.pct <= 10 ? '#f59e0b' : '#ef4444'} />)}
                  <LabelList dataKey="costoTotalMensual" position="top" formatter={(v) => fmtC(v)} style={{ fontSize: 10, fill: '#57534e', fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* ── Recomendaciones ── */}
      <Card className="border-orange-100 mb-2 acp-a3">
        <CardHeader className="border-orange-50">
          <div className="flex items-center gap-2">
            <Lightbulb size={18} className="text-orange-500" />
            <CardTitle>Recomendaciones para la toma de decisiones</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <ul className="space-y-3">
            {recomendaciones.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                <Scale size={15} className="text-orange-400 flex-shrink-0 mt-0.5" />
                <span>{r.split('**').map((chunk, j) => j % 2 === 1 ? <strong key={j} className="text-gray-800">{chunk}</strong> : chunk)}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}
