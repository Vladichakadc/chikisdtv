import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Wallet, Percent, PiggyBank, Activity,
  Landmark, AlertTriangle, Lightbulb, Scale, DollarSign, Hourglass,
  Target, Users, UserCheck, Tv, Repeat, Gem, Clock, AlertCircle,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, AreaChart, Area, Cell, ReferenceLine, LabelList,
} from 'recharts'
import api from '../../config/api'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { formatCurrency } from '../../utils/excelUtils'
import { cn } from '../../utils/cn'
import {
  BiCard, ChartInsight, LABEL_STYLE, MomentumValueLabel,
  tagMarkup, tagCobertura, tagPuntoEquilibrio, tagConcentracion, tagArpu, tagPantalla,
  tagLtv, tagValorEnRiesgo,
  narrarPareto, narrarProductividad, narrarMomentum, narrarMrr, narrarLtv,
} from './dashboard/biShared'
import { IngresoPorClientePanel } from './dashboard/IngresoPorClientePanel'

// ─── Formateadores ───────────────────────────────────────────────────────────

const fmtM = (v) => {
  if (v == null) return '—'
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`
  if (abs >= 1_000) return `$${(v / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 0 })}K`
  return `$${v.toLocaleString('es-CO')}`
}

const tooltipMoney = (value, name) => [formatCurrency(value), name]

// ─── KPI card (con clic → modal explicativo) ────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, tone = 'neutral', onClick }) {
  const tones = {
    positive: 'border-green-200 bg-green-50/50',
    negative: 'border-red-200 bg-red-50/50',
    neutral:  'border-ui-border bg-white',
    accent:   'border-orange-200 bg-orange-50/50',
  }
  const iconTones = {
    positive: 'bg-green-100 text-green-600',
    negative: 'bg-red-100 text-red-600',
    neutral:  'bg-slate-100 text-slate-600',
    accent:   'bg-orange-100 text-orange-600',
  }
  const interactive = typeof onClick === 'function'
  return (
    <div
      className={cn('rounded-xl border p-4 shadow-card', tones[tone], interactive && 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg')}
      {...(interactive ? {
        role: 'button', tabIndex: 0, onClick,
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } },
      } : {})}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-brand-accent mt-1 tabular-nums truncate">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
          {interactive && <p className="text-xs font-semibold text-brand-primary mt-1.5">¿Cómo se calcula?</p>}
        </div>
        <div className={cn('rounded-lg p-2 flex-shrink-0', iconTones[tone])}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

// ─── Narrativa experta EBITDA ────────────────────────────────────────────────

function NarrativaFinanciera({ fin }) {
  if (!fin) return null
  const { kpis, serieAnual, serieMensual } = fin
  const items = []

  if (kpis.margenEbitdaPct != null) {
    const nivel = kpis.margenEbitdaPct >= 50 ? 'excepcional' : kpis.margenEbitdaPct >= 30 ? 'sólido' : kpis.margenEbitdaPct >= 15 ? 'moderado' : 'estrecho'
    items.push({
      icon: PiggyBank,
      titulo: 'Nivel y calidad del EBITDA',
      texto: `El negocio acumula un EBITDA histórico de ${formatCurrency(kpis.ebitdaHistorico)} sobre ingresos que rinden un margen del ${kpis.margenEbitdaPct}% — un nivel ${nivel} para un distribuidor digital. Importante: al no registrarse nómina ni gastos administrativos, este EBITDA es en la práctica la utilidad bruta operativa; el EBITDA real será menor una vez se imputen esos gastos.`,
    })
  }

  if (kpis.opexRatioPct != null) {
    const ultimo = serieAnual[serieAnual.length - 1]
    items.push({
      icon: Scale,
      titulo: 'Estructura de costos (OPEX)',
      texto: `Por cada $100 de ingreso, $${Math.round(kpis.opexRatioPct)} se destinan a recargas de créditos e impuesto 4x1000 — el único costo operativo registrado. ${ultimo?.opexRatioPct != null ? `En ${ultimo.anio} el ratio va en ${ultimo.opexRatioPct}%.` : ''} Al ser un costo variable ligado al dólar, el apalancamiento operativo es bajo: el negocio escala sin costos fijos relevantes, pero el margen queda expuesto a la TRM.`,
    })
  }

  if (kpis.tirAnualPct != null) {
    items.push({
      icon: TrendingUp,
      titulo: 'Retorno (TIR)',
      texto: `La TIR de los flujos netos mensuales es ${kpis.tirMensualPct}% mensual (≈${kpis.tirAnualPct}% anualizada)${kpis.paybackMes ? `, con recuperación de la inversión inicial en ${kpis.paybackMes.label}` : ''}.`,
    })
  } else if (kpis.roiSobreOpex != null) {
    items.push({
      icon: TrendingUp,
      titulo: 'Retorno sobre el gasto operativo',
      texto: `La TIR clásica no es calculable porque la serie de flujos mensuales nunca fue negativa — el negocio operó en positivo desde el inicio registrado, lo cual en sí es una señal de salud. La métrica sustituta es el ROI sobre OPEX: cada peso gastado en recargas generó $${kpis.roiSobreOpex.toLocaleString('es-CO')} adicionales de excedente (${(kpis.roiSobreOpex * 100).toFixed(0)}% de retorno acumulado sobre el costo).`,
    })
  }

  const trms = serieMensual.filter(m => m.trmPromedio != null)
  if (trms.length >= 2) {
    const primera = trms[0], ultima = trms[trms.length - 1]
    const varTrm = ((ultima.trmPromedio - primera.trmPromedio) / primera.trmPromedio) * 100
    items.push({
      icon: Landmark,
      titulo: 'Exposición cambiaria (TRM)',
      texto: `El costo de los créditos se paga referenciado al dólar. La TRM promedio pasó de $${primera.trmPromedio.toLocaleString('es-CO')} (${primera.label}) a $${ultima.trmPromedio.toLocaleString('es-CO')} (${ultima.label}), una variación del ${varTrm.toFixed(1)}%. ${varTrm > 5 ? 'Una devaluación sostenida comprime el margen EBITDA si no se trasladan los aumentos al precio de venta.' : varTrm < -5 ? 'La apreciación del peso ha jugado a favor del margen — es buen momento para consolidar precios.' : 'La estabilidad cambiaria reciente da margen para planear precios sin sobresaltos.'}`,
    })
  }

  items.push({
    icon: AlertTriangle,
    titulo: 'CAPEX y calidad del dato',
    texto: `El negocio es asset-light: no hay CAPEX de infraestructura registrado y los equipos (Fire TV, ONN) se compran para reventa — contablemente son inventario/costo de venta, no inversión de capital. ${kpis.cogsEquiposHistorico > 0 ? `Se han registrado ${formatCurrency(kpis.cogsEquiposHistorico)} en costo de equipos.` : 'El campo de costo de adquisición de los equipos está vacío en los registros: sin ese dato, el margen de la línea de hardware aparece sobreestimado (hoy se asume 100% de margen en cada equipo vendido). Registrar ese costo es la mejora #1 de calidad contable.'}`,
  })

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <Card key={i} className="border-orange-100">
            <CardBody className="flex gap-3">
              <div className="bg-orange-100 text-orange-600 rounded-lg p-2 h-fit flex-shrink-0">
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-brand-accent text-sm">{item.titulo}</p>
                <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{item.texto}</p>
              </div>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}

// ─── Encabezado de sección ───────────────────────────────────────────────────

function SectionHeader({ icon: Icon, gradient, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`bg-gradient-to-br ${gradient} rounded-xl p-2.5 shadow-md`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-brand-accent">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function AnalisisFinancieroPage() {
  const navigate = useNavigate()
  const [fin, setFin] = useState(null)
  const [bi, setBi] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [explain, setExplain] = useState(null)
  const [showArpuPanel, setShowArpuPanel] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard-bi/finanzas').then(r => setFin(r.data)),
      api.get('/admin/dashboard-bi').then(r => setBi(r.data)),
    ])
      .catch(e => setError(e.response?.data?.error || 'Error cargando datos financieros'))
      .finally(() => setLoading(false))
  }, [])

  // Serie de variación mensual de ingresos (momentum)
  const momentumSerie = useMemo(() => {
    if (!bi) return []
    const meses = bi.porMes.filter(m => m.numVentas > 0)
    const out = []
    for (let i = 1; i < meses.length; i++) {
      const prev = meses[i - 1].ingresos
      const cur = meses[i].ingresos
      if (prev > 0) {
        out.push({ label: meses[i].label, variacionPct: Number((((cur - prev) / prev) * 100).toFixed(1)) })
      }
    }
    return out.slice(-12)
  }, [bi])

  if (loading) return <div className="py-20 text-center text-gray-400">Calculando indicadores financieros…</div>
  if (error) return <div className="py-20 text-center text-red-500">{error}</div>
  if (!fin || fin.serieMensual.length === 0) {
    return <div className="py-20 text-center text-gray-400">Sin datos de ventas o costos registrados todavía.</div>
  }

  const { kpis, serieMensual, serieAnual } = fin
  const trmSerie = serieMensual.filter(m => m.trmPromedio != null)
  const k = bi?.kpis
  const ltv = bi?.ltv
  const QUINTIL_COLORS = ['#94a3b8', '#60a5fa', '#34d399', '#f97316', '#a855f7']

  return (
    <div className="space-y-8">
      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />
      {showArpuPanel && <IngresoPorClientePanel onClose={() => setShowArpuPanel(false)} />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-2.5 shadow-md">
          <Landmark size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-accent">Análisis Financiero</h1>
          <p className="text-sm text-gray-500">EBITDA, rentabilidad, MRR y LTV — todos los valores en pesos colombianos (COP). Haz clic en cualquier tarjeta para ver cómo se calcula</p>
        </div>
      </div>

      {/* ─── EBITDA: KPIs fila 1 ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={PiggyBank} label="EBITDA histórico" tone={kpis.ebitdaHistorico >= 0 ? 'positive' : 'negative'}
          value={fmtM(kpis.ebitdaHistorico)}
          sub="Ingresos − OPEX − costo de equipos"
          onClick={() => setExplain({
            title: 'EBITDA histórico', value: formatCurrency(kpis.ebitdaHistorico), icon: PiggyBank,
            queEs: 'La utilidad operativa acumulada del negocio: lo que queda después de pagar los costos directos de operación, antes de impuestos e intereses.',
            comoSeCalcula: '**Ingresos totales − OPEX (recargas + 4x1000) − costo de equipos vendidos**. Como no hay nómina ni gastos administrativos registrados, en la práctica coincide con la utilidad bruta.',
            origen: 'Ventas de licencias y equipos (módulo Pagos y Venta Dispositivos) menos las recargas (módulo Costo Pantalla).',
          })}
        />
        <KpiCard
          icon={Percent} label="Margen EBITDA" tone="accent"
          value={kpis.margenEbitdaPct != null ? `${kpis.margenEbitdaPct}%` : '—'}
          sub="Sobre ingresos históricos totales"
          onClick={() => setExplain({
            title: 'Margen EBITDA', value: `${kpis.margenEbitdaPct}%`, icon: Percent,
            queEs: 'De cada $100 que entran, cuántos quedan como utilidad operativa. Es la medida estándar de eficiencia con la que se comparan negocios entre sí.',
            comoSeCalcula: '**(EBITDA ÷ Ingresos) × 100**.',
            origen: 'Derivado de los mismos módulos que el EBITDA (Pagos, Venta Dispositivos y Costo Pantalla).',
          })}
        />
        <KpiCard
          icon={Wallet} label="OPEX ratio" tone="neutral"
          value={kpis.opexRatioPct != null ? `${kpis.opexRatioPct}%` : '—'}
          sub={`OPEX histórico: ${fmtM(kpis.opexHistorico)} (recargas + 4x1000)`}
          onClick={() => setExplain({
            title: 'OPEX ratio', value: `${kpis.opexRatioPct}%`, icon: Wallet,
            queEs: 'Qué porcentaje de cada peso de ingreso se va en el gasto operativo (las recargas de créditos que mantienen las pantallas funcionando).',
            comoSeCalcula: '**(OPEX ÷ Ingresos) × 100**, donde OPEX = costo en pesos de cada recarga + impuesto 4x1000.',
            origen: 'Módulo **Costo Pantalla** — cada recarga registrada con su costo COP e impuesto.',
            action: { label: 'Ver Costo Pantalla', onClick: () => navigate('/admin/costo-pantalla') },
          })}
        />
        <KpiCard
          icon={TrendingUp} label={kpis.tirAnualPct != null ? 'TIR anualizada' : 'ROI sobre OPEX'} tone="positive"
          value={kpis.tirAnualPct != null ? `${kpis.tirAnualPct}%` : kpis.roiSobreOpex != null ? `${(kpis.roiSobreOpex * 100).toFixed(0)}%` : '—'}
          sub={kpis.tirAnualPct != null ? `TIR mensual: ${kpis.tirMensualPct}%` : 'TIR no calculable: flujos siempre positivos'}
          onClick={() => setExplain({
            title: kpis.tirAnualPct != null ? 'TIR anualizada' : 'ROI sobre OPEX',
            value: kpis.tirAnualPct != null ? `${kpis.tirAnualPct}%` : `${(kpis.roiSobreOpex * 100).toFixed(0)}%`,
            icon: TrendingUp,
            queEs: kpis.tirAnualPct != null
              ? 'La rentabilidad anual equivalente de los flujos de caja del negocio — comparable con la tasa de un CDT o cualquier otra inversión.'
              : 'Cuánto excedente generó cada peso invertido en recargas. Sustituye a la TIR porque el negocio nunca tuvo un mes en pérdida (no hay "inversión inicial" que recuperar).',
            comoSeCalcula: kpis.tirAnualPct != null
              ? 'Se toma el flujo neto de cada mes (ingresos − gastos) y se busca la tasa de descuento que hace que todos los flujos sumen cero — el método financiero estándar (TIR). Luego se anualiza.'
              : '**(EBITDA acumulado ÷ OPEX acumulado) × 100**. Ejemplo: 200% significa que cada $1.000 en recargas generó $2.000 de ganancia.',
            origen: 'Serie mensual de ingresos (Pagos + Venta Dispositivos) y gastos (Costo Pantalla).',
          })}
        />
      </div>

      {/* ─── EBITDA: KPIs fila 2 ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Activity} label="EBITDA últimos 12 meses" tone={kpis.ltm.ebitda >= 0 ? 'positive' : 'negative'}
          value={fmtM(kpis.ltm.ebitda)}
          sub={kpis.ltm.margenEbitdaPct != null ? `Margen LTM: ${kpis.ltm.margenEbitdaPct}%` : undefined}
          onClick={() => setExplain({
            title: 'EBITDA últimos 12 meses', value: formatCurrency(kpis.ltm.ebitda), icon: Activity,
            queEs: 'La utilidad operativa de los últimos 12 meses — la foto reciente del negocio, sin el peso de los años anteriores.',
            comoSeCalcula: 'Se suman los últimos 12 meses de la serie: ingresos menos OPEX menos costo de equipos de ese período.',
            origen: 'Misma fuente que el EBITDA histórico, acotado a los 12 meses más recientes.',
          })}
        />
        <KpiCard
          icon={DollarSign} label="EBITDA promedio mensual" tone="neutral"
          value={fmtM(kpis.ebitdaPromedioMensual)}
          sub="Sobre meses con actividad registrada"
          onClick={() => setExplain({
            title: 'EBITDA promedio mensual', value: formatCurrency(kpis.ebitdaPromedioMensual), icon: DollarSign,
            queEs: 'Cuánta utilidad operativa deja el negocio en un mes típico — útil para proyectar y para saber cuánto puede retirarse sin descapitalizar.',
            comoSeCalcula: '**EBITDA histórico ÷ número de meses con actividad** (se excluyen meses sin registros para no diluir el promedio).',
            origen: 'Serie mensual de ingresos y gastos.',
          })}
        />
        <KpiCard
          icon={Hourglass} label="Payback" tone="neutral"
          value={kpis.paybackMes ? kpis.paybackMes.label : 'Inmediato'}
          sub={kpis.paybackMes ? `Mes ${kpis.paybackMes.index} de operación` : 'El flujo acumulado nunca fue negativo'}
          onClick={() => setExplain({
            title: 'Payback', value: kpis.paybackMes ? kpis.paybackMes.label : 'Inmediato', icon: Hourglass,
            queEs: 'En qué momento el negocio recuperó lo invertido y empezó a estar "en verde" de forma acumulada.',
            comoSeCalcula: 'Se va sumando el flujo neto mes a mes desde el inicio; el payback es el primer mes en que esa suma acumulada se vuelve positiva. Si nunca fue negativa, el retorno fue inmediato.',
            origen: 'Serie mensual acumulada de EBITDA.',
          })}
        />
        <KpiCard
          icon={AlertTriangle} label="CAPEX registrado" tone="neutral"
          value={fmtM(kpis.capexRegistrado)}
          sub="Negocio asset-light — sin inversión de capital registrada"
          onClick={() => setExplain({
            title: 'CAPEX registrado', value: formatCurrency(kpis.capexRegistrado), icon: AlertTriangle,
            queEs: 'La inversión en activos de largo plazo (infraestructura, equipos propios). En este negocio es prácticamente cero: es un modelo "asset-light".',
            comoSeCalcula: 'No hay compras de activos registradas en el sistema. Los equipos Fire TV/ONN que se compran son para **reventa** (inventario), no inversión de capital.',
            origen: 'No existe un módulo de activos fijos — este valor es una constatación, no un cálculo.',
          })}
        />
      </div>

      {/* ─── Gráfico 1: EBITDA mensual + margen ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>EBITDA mensual y margen</CardTitle>
          <p className="text-sm text-gray-400 mt-0.5">Barras: EBITDA del mes (COP). Línea: margen EBITDA % — verde cuando el mes cierra en positivo, rojo en negativo</p>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={serieMensual} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis yAxisId="cop" tickFormatter={fmtM} tick={{ fontSize: 10 }} width={58} />
              <YAxis yAxisId="pct" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(v, name) => name === 'Margen %' ? [`${v}%`, name] : tooltipMoney(v, name)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine yAxisId="cop" y={0} stroke="#94a3b8" />
              <Bar yAxisId="cop" dataKey="ebitda" name="EBITDA" radius={[3, 3, 0, 0]}>
                {serieMensual.map((m, i) => (
                  <Cell key={i} fill={m.ebitda >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
              <Line yAxisId="pct" dataKey="margenEbitdaPct" name="Margen %" stroke="#8b5cf6" strokeWidth={2} dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* ─── Gráfico 2 + 3 ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Estructura anual: ingresos, OPEX y EBITDA</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">La brecha entre la barra naranja (ingresos) y la gris (OPEX) es el EBITDA del año</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={serieAnual} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 10 }} width={58} />
                <Tooltip formatter={tooltipMoney} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#f97316" radius={[3, 3, 0, 0]} />
                <Bar dataKey="opex" name="OPEX" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                <Line dataKey="ebitda" name="EBITDA" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flujo de caja acumulado</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Suma corrida del EBITDA mensual — la pendiente indica la velocidad de generación de caja</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={serieMensual} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradFlujo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmtM} tick={{ fontSize: 10 }} width={58} />
                <Tooltip formatter={tooltipMoney} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Area dataKey="flujoAcumulado" name="Flujo acumulado" stroke="#10b981" strokeWidth={2} fill="url(#gradFlujo)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* ─── Gráfico 4: TRM vs OPEX ──────────────────────────────────────── */}
      {trmSerie.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Exposición cambiaria: TRM vs OPEX mensual</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Las recargas se pagan en dólares — cuando la TRM (línea azul) sube, cada crédito cuesta más pesos</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={trmSerie} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis yAxisId="opex" tickFormatter={fmtM} tick={{ fontSize: 10 }} width={58} />
                <YAxis yAxisId="trm" orientation="right" tickFormatter={v => `$${v.toLocaleString('es-CO')}`} tick={{ fontSize: 10 }} width={54} domain={['auto', 'auto']} />
                <Tooltip formatter={(v, name) => name === 'TRM promedio' ? [`$${Number(v).toLocaleString('es-CO')}`, name] : tooltipMoney(v, name)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="opex" dataKey="opex" name="OPEX (recargas)" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                <Line yAxisId="trm" dataKey="trmPromedio" name="TRM promedio" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* ─── Rentabilidad y Ventas (movido desde el Dashboard) ───────────── */}
      {k && (
        <div>
          <SectionHeader
            icon={Target} gradient="from-emerald-500 to-emerald-600"
            title="Rentabilidad y Ventas · Lectura financiera"
            subtitle="Eficiencia, riesgo de cartera y productividad comercial — haz clic en cada tarjeta para entender el cálculo"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <BiCard
              icon={Scale} variant="solid" label="Markup sobre el costo"
              value={`${k.markupPct.toFixed(1)}%`}
              sub={`cada $1.000 de costo deja ${formatCurrency(Math.round(k.markupPct * 10))} de margen bruto`}
              tag={tagMarkup(k)}
              onClick={() => setExplain({
                title: 'Markup sobre el costo', value: `${k.markupPct.toFixed(1)}%`, icon: Scale,
                queEs: 'Cuánto "multiplica" cada peso invertido en costo. Es la otra cara del margen: en vez de mirar desde el ingreso, mira desde el costo.',
                comoSeCalcula: '**(Ganancia ÷ Costos) × 100**. Ejemplo: markup de 200% significa que cada $1.000 de recargas generan $2.000 de ganancia.',
                origen: 'Ganancia histórica (Pagos − Costo Pantalla) dividida entre los costos históricos.',
              })}
            />
            <BiCard
              icon={Activity} variant="light" label="Cobertura de costos"
              value={`${k.coberturaCostos.toFixed(2)}×`}
              sub="veces que el ingreso operativo cubre el costo de pantallas/cuentas"
              tag={tagCobertura(k)}
              onClick={() => setExplain({
                title: 'Cobertura de costos', value: `${k.coberturaCostos.toFixed(2)}×`, icon: Activity,
                queEs: 'Cuántas veces alcanza el ingreso para pagar todo el costo operativo. Mide el "colchón financiero": qué tanto pueden caer las ventas antes de entrar en pérdida.',
                comoSeCalcula: '**Ingresos ÷ Costos**. Una cobertura de 3× significa que las ventas podrían caer a la tercera parte antes de dejar de cubrir los costos.',
                origen: 'Ingresos históricos (Pagos) sobre costos históricos (Costo Pantalla).',
              })}
            />
            <BiCard
              icon={Target} variant="outline" label="Punto de equilibrio"
              value={`${k.puntoEquilibrioVentas.toLocaleString('es-CO')} ventas`}
              sub={`al ticket promedio de ${formatCurrency(k.ticketPromedio)} para cubrir el costo total`}
              tag={tagPuntoEquilibrio(k, bi.porAnio)}
              onClick={() => setExplain({
                title: 'Punto de equilibrio', value: `${k.puntoEquilibrioVentas.toLocaleString('es-CO')} ventas`, icon: Target,
                queEs: 'El número mínimo de ventas que el negocio necesita para no perder plata. Todo lo que se venda por encima es ganancia.',
                comoSeCalcula: '**Costos totales ÷ ticket promedio**, redondeado hacia arriba. Ejemplo: si los costos son $10 millones y cada venta promedia $25.000, se necesitan 400 ventas para cubrir los costos.',
                origen: 'Costos históricos (Costo Pantalla) y ticket promedio de las ventas (Pagos).',
              })}
            />
            <BiCard
              icon={Users} variant="light" label="Concentración de cartera"
              value={`${k.concentracionTop20Pct.toFixed(1)}%`}
              sub={`del ingreso histórico lo aporta el 20% top de clientes (${Math.ceil(k.numClientesCompradores * 0.2)} de ${k.numClientesCompradores})`}
              tag={tagConcentracion(k)}
              onClick={() => setExplain({
                title: 'Concentración de cartera', value: `${k.concentracionTop20Pct.toFixed(1)}%`, icon: Users,
                queEs: 'Qué tan dependiente es el negocio de sus mejores clientes. Si pocos clientes concentran mucho ingreso, perder uno duele mucho más.',
                comoSeCalcula: 'Se ordenan los clientes de mayor a menor ingreso, se toma el **20% superior** y se calcula qué porcentaje del ingreso total aportan.',
                origen: 'Ventas por cliente del módulo de **Pagos**. La curva completa está en la gráfica de concentración de abajo.',
              })}
            />
            <BiCard
              icon={UserCheck} variant="outline" label="ARPU · ingreso por cliente"
              value={formatCurrency(k.arpu)}
              sub={`promedio histórico sobre ${k.numClientesCompradores} clientes con compras registradas`}
              tag={tagArpu(k)}
              clickHint="Ver detalle por cliente"
              onClick={() => setShowArpuPanel(true)}
            />
            <BiCard
              icon={Tv} variant="light" label="Ingreso por pantalla"
              value={formatCurrency(k.ingresoPorPantalla)}
              sub={`costo por pantalla ${formatCurrency(k.costoPorPantalla)} · ${k.totalPantallas} pantallas en operación`}
              tag={tagPantalla(k)}
              onClick={() => setExplain({
                title: 'Ingreso por pantalla', value: formatCurrency(k.ingresoPorPantalla), icon: Tv,
                queEs: 'Cuánto ingreso ha producido, en promedio, cada pantalla en operación — la "unidad económica" más pequeña del negocio.',
                comoSeCalcula: `**Ingresos históricos ÷ ${k.totalPantallas} pantallas activas**. El costo por pantalla se calcula igual con los costos (${formatCurrency(k.costoPorPantalla)}), y la diferencia es el margen unitario.`,
                origen: 'Ingresos de Pagos divididos entre la suma de pantallas del Planificador.',
                action: { label: 'Ver Planificador', onClick: () => navigate('/admin/planificador') },
              })}
            />
            <BiCard
              icon={TrendingUp} variant={k.momentumMrrPct >= 0 ? 'solid' : 'outline'} label="Momentum MRR"
              value={`${k.momentumMrrPct > 0 ? '+' : ''}${k.momentumMrrPct.toFixed(1)}%`}
              sub={`bruto: ${k.momentumVentasPct > 0 ? '+' : ''}${k.momentumVentasPct.toFixed(1)}% · MRR corregido (sin ruido de planes largos)`}
              tag={k.momentumMrrPct > 5  ? { tone: 'good',  text: 'Acelerando (MRR)' }
                : k.momentumMrrPct > -5  ? { tone: 'info',  text: 'Ritmo estable' }
                : { tone: 'warn', text: 'Desacelerando — vigilar' }}
              onClick={() => setExplain({
                title: 'Momentum MRR', value: `${k.momentumMrrPct > 0 ? '+' : ''}${k.momentumMrrPct.toFixed(1)}%`, icon: TrendingUp,
                queEs: 'El "velocímetro" del negocio: si en promedio los últimos meses vienen creciendo o cayendo frente al mes anterior.',
                comoSeCalcula: 'Se calcula la variación % del MRR de cada mes frente al anterior (últimos 7 meses con datos) y se promedia. Se usa el MRR normalizado — no el ingreso bruto — para que un plan anual vendido en un mes no infle artificialmente la señal.',
                origen: 'Serie mensual de MRR derivada de las ventas (Pagos), normalizando cada venta por la duración de su plan.',
              })}
            />
            <BiCard
              icon={Repeat} variant="light" label="Renovaciones"
              value={`${k.tasaRenovacionPct.toFixed(1)}%`}
              sub={`del ingreso total · churn ${k.churnPct.toFixed(1)}%`}
              onClick={() => setExplain({
                title: 'Renovaciones', value: `${k.tasaRenovacionPct.toFixed(1)}%`, icon: Repeat,
                queEs: 'Qué porcentaje de las ventas son clientes que ya estaban y volvieron a pagar — el ingreso "seguro" del negocio. El churn es lo contrario: clientes que se fueron.',
                comoSeCalcula: '**Ventas tipo "Renovación" ÷ total de ventas × 100**. El churn se calcula como suscripciones canceladas sobre el total histórico (activas + canceladas).',
                origen: 'Campo tipo de pago de cada venta (módulo Pagos) y estados de las suscripciones.',
                action: { label: 'Ver Análisis Retención', onClick: () => navigate('/admin/retencion') },
              })}
            />
          </div>

          {/* Gráficos: concentración + productividad */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <Card className="border-orange-100">
              <CardHeader className="border-orange-50">
                <CardTitle>Concentración de ingresos por cliente</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">% del ingreso acumulado según el % de clientes (ordenados de mayor a menor aporte) — la brecha frente a la diagonal mide el riesgo de dependencia de la cartera</p>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={bi.paretoIngresos} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="paretoFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                    <XAxis dataKey="pctClientes" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#78716c' }} />
                    <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} tick={{ fontSize: 11, fill: '#78716c' }} />
                    <Tooltip formatter={(v, name) => [`${v}%`, name]} labelFormatter={(v) => `${v}% de los clientes`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="pctIngresos" name="% del ingreso acumulado" stroke="#f97316" strokeWidth={2.5} fill="url(#paretoFill)" />
                    <Line type="monotone" dataKey="pctClientes" name="Distribución equitativa (referencia)" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
                <ChartInsight text={narrarPareto(bi.paretoIngresos, k)} />
              </CardBody>
            </Card>

            <Card className="border-orange-100">
              <CardHeader className="border-orange-50">
                <CardTitle>Productividad por pantalla</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Ingreso, costo y margen promedio por cada una de las {k.totalPantallas} pantallas en operación — la "unidad económica" del negocio</p>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart
                    data={[
                      { concepto: 'Ingreso', valor: k.ingresoPorPantalla },
                      { concepto: 'Costo', valor: k.costoPorPantalla },
                      { concepto: 'Margen', valor: k.ingresoPorPantalla - k.costoPorPantalla },
                    ]}
                    layout="vertical"
                    margin={{ top: 10, right: 70, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: '#78716c' }} />
                    <YAxis type="category" dataKey="concepto" tick={{ fontSize: 12, fill: '#78716c', fontWeight: 600 }} width={70} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={32}>
                      <Cell fill="#f97316" />
                      <Cell fill="#94a3b8" />
                      <Cell fill="#16a34a" />
                      <LabelList dataKey="valor" position="right" formatter={(v) => formatCurrency(v)} style={{ ...LABEL_STYLE, fontSize: 12 }} />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
                <ChartInsight text={narrarProductividad(k)} />
              </CardBody>
            </Card>
          </div>

          {/* Gráfico: momentum mensual */}
          <Card className="border-orange-100 mt-4">
            <CardHeader className="border-orange-50">
              <CardTitle>Momentum de ventas — variación mensual de ingresos</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">
                Variación porcentual mes a mes de los últimos periodos con actividad; su promedio es el indicador "Momentum de ventas" (
                {k.momentumVentasPct > 0 ? '+' : ''}{k.momentumVentasPct.toFixed(1)}%)
              </p>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={momentumSerie} margin={{ top: 24, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#78716c' }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Variación']} />
                  <Bar dataKey="variacionPct" name="Variación mensual %" radius={[6, 6, 0, 0]} barSize={28}>
                    {momentumSerie.map((m, i) => (
                      <Cell key={i} fill={m.variacionPct >= 0 ? '#16a34a' : '#ef4444'} />
                    ))}
                    <LabelList dataKey="variacionPct" content={<MomentumValueLabel />} />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
              <ChartInsight text={narrarMomentum(momentumSerie, k)} />
            </CardBody>
          </Card>
        </div>
      )}

      {/* ─── MRR (movido desde el Dashboard) ─────────────────────────────── */}
      {k && (
        <div>
          <SectionHeader
            icon={Repeat} gradient="from-violet-500 to-violet-700"
            title="MRR · Ingreso Recurrente Mensual"
            subtitle="Ingresos normalizados por duración de plan — corrige la distorsión de planes anuales y semestrales"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <BiCard icon={Wallet} variant="solid" label={`MRR · ${k.mrrMesLabel || 'Último mes'}`}
              value={formatCurrency(k.mrrActual)}
              sub="ingreso recurrente mensual normalizado por duración de plan"
              tag={k.mrrActual > 0 ? { tone: 'info', text: 'Base recurrente real' } : null}
              onClick={() => setExplain({
                title: 'MRR', value: formatCurrency(k.mrrActual), icon: Wallet,
                queEs: 'El ingreso recurrente "real" de un mes: cuánto entra de manera sostenida, sin que un plan anual pagado de contado infle el número.',
                comoSeCalcula: 'Cada venta se **divide por la duración de su plan**: un plan anual de $190.000 aporta $15.833 al MRR de cada uno de sus 12 meses, no $190.000 al mes de la venta.',
                origen: 'Ventas del módulo de **Pagos**, usando el campo tipo de plan para saber la duración.',
              })}
            />
            <BiCard icon={PiggyBank} variant="light" label="ARR estimado"
              value={formatCurrency(k.arrActual)}
              sub="MRR × 12 — proyección anualizada del ingreso recurrente actual"
              tag={k.arrActual > 0 ? { tone: 'info', text: 'Proyección sostenida' } : null}
              onClick={() => setExplain({
                title: 'ARR estimado', value: formatCurrency(k.arrActual), icon: PiggyBank,
                queEs: 'Cuánto ingresaría en un año completo si el ritmo recurrente actual se mantiene — la proyección anualizada del negocio.',
                comoSeCalcula: '**MRR del último mes × 12**. Es una proyección, no una garantía: asume que ni churn ni ventas nuevas cambian el ritmo.',
                origen: 'Derivado directamente del MRR.',
              })}
            />
            <BiCard icon={TrendingUp}
              variant={k.crecimientoMrrMomPct == null ? 'light' : k.crecimientoMrrMomPct >= 0 ? 'solid' : 'outline'}
              label="Crecimiento MRR · MoM"
              value={k.crecimientoMrrMomPct != null ? `${k.crecimientoMrrMomPct >= 0 ? '+' : ''}${k.crecimientoMrrMomPct.toFixed(1)}%` : '—'}
              sub="variación del MRR normalizado respecto al mes anterior"
              tag={k.crecimientoMrrMomPct != null
                ? k.crecimientoMrrMomPct >= 5  ? { tone: 'good', text: 'Crecimiento MRR sólido' }
                : k.crecimientoMrrMomPct >= -5 ? { tone: 'info', text: 'MRR estable' }
                : { tone: 'warn', text: 'MRR en contracción' }
                : null}
              onClick={() => setExplain({
                title: 'Crecimiento MRR mes a mes', value: k.crecimientoMrrMomPct != null ? `${k.crecimientoMrrMomPct >= 0 ? '+' : ''}${k.crecimientoMrrMomPct.toFixed(1)}%` : '—', icon: TrendingUp,
                queEs: 'Si el ingreso recurrente del último mes creció o cayó frente al mes anterior.',
                comoSeCalcula: '**(MRR del último mes − MRR del mes anterior) ÷ MRR del mes anterior × 100**.',
                origen: 'Serie mensual de MRR normalizado.',
              })}
            />
            <BiCard icon={Activity}
              variant={k.momentumMrrPct >= 0 ? 'solid' : 'outline'}
              label="Momentum MRR (7 meses)"
              value={`${k.momentumMrrPct > 0 ? '+' : ''}${k.momentumMrrPct.toFixed(1)}%`}
              sub="promedio MoM del MRR normalizado — señal de tendencia sin ruido de planes largos"
              tag={k.momentumMrrPct > 5  ? { tone: 'good', text: 'Acelerando (MRR)' }
                : k.momentumMrrPct > -5  ? { tone: 'info', text: 'Ritmo MRR estable' }
                : { tone: 'warn', text: 'MRR desacelerando' }}
              onClick={() => setExplain({
                title: 'Momentum MRR (7 meses)', value: `${k.momentumMrrPct > 0 ? '+' : ''}${k.momentumMrrPct.toFixed(1)}%`, icon: Activity,
                queEs: 'La tendencia de fondo del ingreso recurrente: un solo mes puede ser suerte; el promedio de 7 meses muestra la dirección real.',
                comoSeCalcula: 'Se calcula la variación mensual del MRR en los últimos 7 meses con datos y se **promedian esas variaciones**.',
                origen: 'Serie mensual de MRR normalizado.',
              })}
            />
          </div>

          <Card className="border-violet-100">
            <CardHeader className="border-violet-50">
              <CardTitle>Mix de planes por contribución al MRR histórico</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">Distribución del ingreso recurrente total generado, por tipo de plan</p>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {(bi.mrrPorTipoPlan || []).map((p, i) => {
                  const PLAN_COLORS = { 'Plan Mensual': '#f97316', 'Plan Semestral': '#7c3aed', 'Plan Anual': '#16a34a' }
                  const color = PLAN_COLORS[p.plan] || '#64748b'
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-700">{p.plan}</span>
                        <span className="text-slate-500">{formatCurrency(p.mrr)} · <strong style={{ color }}>{p.pct}%</strong></span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${p.pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <ChartInsight text={narrarMrr(bi)} />
            </CardBody>
          </Card>
        </div>
      )}

      {/* ─── LTV (movido desde el Dashboard) ─────────────────────────────── */}
      {ltv && (
        <div>
          <SectionHeader
            icon={Gem} gradient="from-teal-500 to-teal-700"
            title="LTV · Valor de Vida del Cliente"
            subtitle="Cuánto ingreso generó cada cliente desde su primera activación — el techo de lo que vale invertir en retenerlo"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <BiCard icon={Gem} variant="solid" label="LTV promedio"
              value={formatCurrency(ltv.ltvPromedio)}
              sub={`sobre ${ltv.numClientes} clientes con historial de compras`}
              tag={tagLtv(ltv.ltvPromedio)}
              onClick={() => setExplain({
                title: 'LTV promedio', value: formatCurrency(ltv.ltvPromedio), icon: Gem,
                queEs: 'Cuánto dinero deja un cliente típico durante toda su relación con el negocio. Define el tope de lo que vale gastar en retener (o conseguir) un cliente.',
                comoSeCalcula: 'Para cada cliente se **suman todas sus compras** desde su primera activación hasta su última transacción (excluyendo cortesías), y se promedia sobre todos los clientes con historial.',
                origen: 'Ventas por cliente del módulo de **Pagos**.',
              })}
            />
            <BiCard icon={Wallet} variant="light" label="ARPU mensual"
              value={formatCurrency(ltv.arpuMensualLtv)}
              sub="ingreso promedio por cliente por mes activo"
              tag={{ tone: 'info', text: 'Tasa de consumo mensual' }}
              onClick={() => setExplain({
                title: 'ARPU mensual', value: formatCurrency(ltv.arpuMensualLtv), icon: Wallet,
                queEs: 'Cuánto paga en promedio un cliente por cada mes que permanece activo.',
                comoSeCalcula: 'Para cada cliente: **su ingreso total ÷ sus meses de vida activa**. Luego se promedia sobre todos los clientes.',
                origen: 'Ventas y fechas de actividad de cada cliente (módulo Pagos).',
              })}
            />
            <BiCard icon={Clock} variant="outline" label="Vida promedio"
              value={`${ltv.vidaPromedioMeses} meses`}
              sub="desde primera activación hasta última transacción registrada"
              tag={ltv.vidaPromedioMeses >= 12
                ? { tone: 'good', text: 'Clientes de largo aliento' }
                : ltv.vidaPromedioMeses >= 6
                ? { tone: 'info', text: 'Vida media razonable' }
                : { tone: 'warn', text: 'Alta rotación — reforzar retención' }}
              onClick={() => setExplain({
                title: 'Vida promedio', value: `${ltv.vidaPromedioMeses} meses`, icon: Clock,
                queEs: 'Cuántos meses dura, en promedio, la relación de un cliente con el negocio antes de dejar de comprar.',
                comoSeCalcula: 'Meses transcurridos entre la **primera activación** y la **última transacción** de cada cliente, promediados.',
                origen: 'Fechas de las ventas de cada cliente (módulo Pagos).',
              })}
            />
            <BiCard
              icon={AlertCircle}
              variant={ltv.valorEnRiesgo > 0 ? 'outline' : 'light'}
              label="Valor LTV en riesgo"
              value={formatCurrency(ltv.valorEnRiesgo)}
              sub={`LTV histórico de ${ltv.clientesEnRiesgoCount} clientes con pantallas vencidas o próximas`}
              tag={tagValorEnRiesgo(ltv.valorEnRiesgo, ltv.ltvPromedio)}
              onClick={() => setExplain({
                title: 'Valor LTV en riesgo', value: formatCurrency(ltv.valorEnRiesgo), icon: AlertCircle,
                queEs: 'El valor histórico de los clientes que hoy están a punto de irse (pantallas vencidas o por vencer). Es la plata que está "en juego" si no se les contacta.',
                comoSeCalcula: 'Se identifican los clientes con pantallas **VENCIDAS o PRÓXIMAS A VENCER** en el Planificador y se **suma su LTV histórico**.',
                origen: 'Cruce entre el estado de alertas del **Planificador** y el historial de ventas de **Pagos**. La lista con nombres está en el panel de Operaciones del Dashboard.',
                action: { label: 'Ver Planificador', onClick: () => navigate('/admin/planificador') },
              })}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-teal-100">
              <CardHeader className="border-teal-50">
                <CardTitle>Distribución del LTV por quintil</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Clientes agrupados en 5 segmentos según su LTV acumulado — de menor a mayor aporte histórico</p>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={ltv.distribucion} margin={{ top: 22, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#99f6e4" opacity={0.4} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716c' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} />
                    <Tooltip
                      formatter={(v) => [v, 'Clientes']}
                      labelFormatter={(label, payload) => {
                        const d = payload?.[0]?.payload
                        return d ? `${label} · hasta ${formatCurrency(d.maxLtv)}` : label
                      }}
                    />
                    <Bar dataKey="cantidad" name="Clientes" radius={[6, 6, 0, 0]} barSize={38}>
                      {(ltv.distribucion || []).map((_, i) => (
                        <Cell key={i} fill={QUINTIL_COLORS[i % QUINTIL_COLORS.length]} />
                      ))}
                      <LabelList dataKey="cantidad" position="top" formatter={(v) => v.toLocaleString('es-CO')} style={{ ...LABEL_STYLE, fontSize: 11 }} />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            <Card className="border-teal-100">
              <CardHeader className="border-teal-50">
                <CardTitle>Percentiles de LTV</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">La brecha entre P25 y P90 revela la asimetría de la cartera — cuánto "valen" los clientes en distintos segmentos</p>
              </CardHeader>
              <CardBody>
                <div className="space-y-4 py-2">
                  {[
                    { label: 'P25 · cuartil bajo',   val: ltv.percentiles.p25, color: '#94a3b8' },
                    { label: 'P50 · mediana',         val: ltv.percentiles.p50, color: '#60a5fa' },
                    { label: 'P75 · cuartil alto',   val: ltv.percentiles.p75, color: '#34d399' },
                    { label: 'P90 · top 10%',        val: ltv.percentiles.p90, color: '#a855f7' },
                    { label: 'Máximo histórico',     val: ltv.percentiles.max, color: '#f97316' },
                  ].map(({ label, val, color }) => {
                    const barPct = ltv.percentiles.max > 0 ? Math.round((val / ltv.percentiles.max) * 100) : 0
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-slate-600">{label}</span>
                          <span className="font-bold" style={{ color }}>{formatCurrency(val)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <ChartInsight text={narrarLtv(ltv)} />
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ─── Narrativa experta ───────────────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={Lightbulb} gradient="from-orange-500 to-orange-600"
          title="Lectura del analista"
          subtitle="Interpretación financiera generada a partir de los datos reales del negocio"
        />
        <NarrativaFinanciera fin={fin} />
      </div>
    </div>
  )
}
