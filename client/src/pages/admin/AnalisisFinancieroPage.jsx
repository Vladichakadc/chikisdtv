import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Wallet, Percent, PiggyBank, Activity,
  Landmark, AlertTriangle, Lightbulb, Scale, DollarSign, Hourglass,
  Target, Users, UserCheck, Tv, Repeat, Gem, Clock, AlertCircle,
  Package, ShoppingCart, BarChart2, Info,
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

function NarrativaFinanciera({ fin, kpisLic }) {
  if (!fin || !kpisLic) return null
  const { serieAnual, serieMensual } = fin
  const items = []

  if (kpisLic.margenEbitdaPct != null) {
    const nivel = kpisLic.margenEbitdaPct >= 50 ? 'excepcional' : kpisLic.margenEbitdaPct >= 30 ? 'sólido' : kpisLic.margenEbitdaPct >= 15 ? 'moderado' : 'estrecho'
    items.push({
      icon: PiggyBank,
      titulo: 'Nivel y calidad del EBITDA (licencias)',
      texto: `El negocio de suscripciones acumula un EBITDA histórico de ${formatCurrency(kpisLic.ebitdaHistorico)} sobre ingresos de licencias con un margen del ${kpisLic.margenEbitdaPct}% — un nivel ${nivel} para un distribuidor digital. Al no registrarse nómina ni gastos administrativos, este EBITDA coincide con la utilidad bruta operativa de la línea de TV.`,
    })
  }

  if (kpisLic.opexRatioPct != null) {
    const ultimo = serieAnual[serieAnual.length - 1]
    items.push({
      icon: Scale,
      titulo: 'Estructura de costos (OPEX)',
      texto: `Por cada $100 de ingreso de licencias, $${Math.round(kpisLic.opexRatioPct)} se destinan a recargas de créditos e impuesto 4x1000 — el único costo operativo registrado. ${ultimo?.opexRatioPct != null ? `En ${ultimo.anio} el ratio va en ${ultimo.opexRatioPct}%.` : ''} Al ser un costo variable ligado al dólar, el margen queda expuesto a la TRM.`,
    })
  }

  if (fin.kpis.tirAnualPct != null) {
    items.push({
      icon: TrendingUp,
      titulo: 'Retorno (TIR)',
      texto: `La TIR de los flujos netos mensuales es ${fin.kpis.tirMensualPct}% mensual (≈${fin.kpis.tirAnualPct}% anualizada)${fin.kpis.paybackMes ? `, con recuperación de la inversión inicial en ${fin.kpis.paybackMes.label}` : ''}.`,
    })
  } else if (fin.kpis.roiSobreOpex != null) {
    items.push({
      icon: TrendingUp,
      titulo: 'Retorno sobre el gasto operativo',
      texto: `La TIR clásica no es calculable porque la serie de flujos mensuales nunca fue negativa — el negocio operó en positivo desde el inicio registrado. La métrica sustituta es el ROI sobre OPEX: cada peso gastado en recargas generó $${fin.kpis.roiSobreOpex.toLocaleString('es-CO')} adicionales de excedente (${(fin.kpis.roiSobreOpex * 100).toFixed(0)}% de retorno acumulado sobre el costo).`,
    })
  }

  const trms = serieMensual.filter(m => m.trmPromedio != null)
  if (trms.length >= 2) {
    const primera = trms[0], ultima = trms[trms.length - 1]
    const varTrm = ((ultima.trmPromedio - primera.trmPromedio) / primera.trmPromedio) * 100
    items.push({
      icon: Landmark,
      titulo: 'Exposición cambiaria (TRM)',
      texto: `El costo de los créditos se paga referenciado al dólar. La TRM promedio pasó de $${primera.trmPromedio.toLocaleString('es-CO')} (${primera.label}) a $${ultima.trmPromedio.toLocaleString('es-CO')} (${ultima.label}), una variación del ${varTrm.toFixed(1)}%. ${varTrm > 5 ? 'Una devaluación sostenida comprime el margen EBITDA si no se trasladan los aumentos al precio de venta.' : varTrm < -5 ? 'La apreciación del peso ha jugado a favor del margen.' : 'La estabilidad cambiaria reciente da margen para planear precios sin sobresaltos.'}`,
    })
  }

  items.push({
    icon: AlertTriangle,
    titulo: 'CAPEX y calidad del dato',
    texto: `El negocio es asset-light: no hay CAPEX de infraestructura registrado y los equipos (Fire TV, ONN) se compran para reventa — contablemente son inventario/costo de venta, no inversión de capital. ${fin.kpis.cogsEquiposHistorico > 0 ? `Se han registrado ${formatCurrency(fin.kpis.cogsEquiposHistorico)} en costo de equipos (ver pestaña Equipos).` : 'El campo de costo de adquisición de los equipos está vacío en los registros: sin ese dato, el margen de hardware aparece sobreestimado. Registrar ese costo es la mejora #1 de calidad contable.'}`,
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

// ─── Tab button ──────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, icon: Icon, label, sub }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all border',
        active
          ? 'bg-orange-500 text-white border-orange-500 shadow-md'
          : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'
      )}
    >
      <Icon size={18} />
      <span>{label}</span>
      {sub && <span className={cn('text-xs rounded-full px-2 py-0.5', active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500')}>{sub}</span>}
    </button>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function AnalisisFinancieroPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('licencias')
  const [fin, setFin] = useState(null)
  const [bi, setBi] = useState(null)
  const [finEq, setFinEq] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [explain, setExplain] = useState(null)
  const [showArpuPanel, setShowArpuPanel] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard-bi/finanzas').then(r => setFin(r.data)),
      api.get('/admin/dashboard-bi').then(r => setBi(r.data)),
      api.get('/admin/dashboard-bi/finanzas-equipos').then(r => setFinEq(r.data)),
    ])
      .catch(e => setError(e.response?.data?.error || 'Error cargando datos financieros'))
      .finally(() => setLoading(false))
  }, [])

  // Serie momentum
  const momentumSerie = useMemo(() => {
    if (!bi) return []
    const meses = bi.porMes.filter(m => m.numVentas > 0)
    const out = []
    for (let i = 1; i < meses.length; i++) {
      const prev = meses[i - 1].ingresos
      const cur = meses[i].ingresos
      if (prev > 0) out.push({ label: meses[i].label, variacionPct: Number((((cur - prev) / prev) * 100).toFixed(1)) })
    }
    return out.slice(-12)
  }, [bi])

  // KPIs y series de licencias (derivadas del serieMensual del backend)
  const kpisLicencias = useMemo(() => {
    if (!fin) return null
    const totLic  = fin.serieMensual.reduce((s, m) => s + m.ingLicencias, 0)
    const totOpex = fin.serieMensual.reduce((s, m) => s + m.opex, 0)
    const ebitda  = totLic - totOpex
    const mesesConDatos = fin.serieMensual.filter(m => m.ingLicencias > 0 || m.opex > 0)
    const ltm12   = fin.serieMensual.slice(-12)
    const ltmIng  = ltm12.reduce((s, m) => s + m.ingLicencias, 0)
    const ltmOpex = ltm12.reduce((s, m) => s + m.opex, 0)
    const ltmEbitda = ltmIng - ltmOpex
    return {
      ebitdaHistorico:      Math.round(ebitda),
      margenEbitdaPct:      totLic > 0 ? Number(((ebitda / totLic) * 100).toFixed(1)) : null,
      opexHistorico:        Math.round(totOpex),
      opexRatioPct:         totLic > 0 ? Number(((totOpex / totLic) * 100).toFixed(1)) : null,
      ebitdaPromedioMensual: mesesConDatos.length > 0 ? Math.round(ebitda / mesesConDatos.length) : 0,
      ltm: {
        ebitda:         Math.round(ltmEbitda),
        margenEbitdaPct: ltmIng > 0 ? Number(((ltmEbitda / ltmIng) * 100).toFixed(1)) : null,
      },
    }
  }, [fin])

  const serieLicencias = useMemo(() => {
    if (!fin) return []
    let acum = 0
    return fin.serieMensual.map(m => {
      const ebitda = m.ingLicencias - m.opex
      acum += ebitda
      return {
        ...m,
        ingresos: m.ingLicencias,
        ebitda,
        margenEbitdaPct: m.ingLicencias > 0 ? Number(((ebitda / m.ingLicencias) * 100).toFixed(1)) : null,
        flujoAcumulado: acum,
      }
    })
  }, [fin])

  const serieAnualLicencias = useMemo(() => {
    if (!fin) return []
    const byAnio = {}
    for (const m of fin.serieMensual) {
      if (!byAnio[m.anio]) byAnio[m.anio] = { anio: m.anio, ingresos: 0, opex: 0, ebitda: 0 }
      byAnio[m.anio].ingresos += m.ingLicencias
      byAnio[m.anio].opex    += m.opex
      byAnio[m.anio].ebitda  += (m.ingLicencias - m.opex)
    }
    return Object.values(byAnio).sort((a, b) => a.anio.localeCompare(b.anio)).map(a => ({
      anio: a.anio,
      ingresos: Math.round(a.ingresos),
      opex:     Math.round(a.opex),
      ebitda:   Math.round(a.ebitda),
    }))
  }, [fin])

  if (loading) return <div className="py-20 text-center text-gray-400">Calculando indicadores financieros…</div>
  if (error)   return <div className="py-20 text-center text-red-500">{error}</div>
  if (!fin || fin.serieMensual.length === 0) {
    return <div className="py-20 text-center text-gray-400">Sin datos de ventas o costos registrados todavía.</div>
  }

  const { serieMensual } = fin
  const trmSerie = serieMensual.filter(m => m.trmPromedio != null)
  const k   = bi?.kpis
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
          <p className="text-sm text-gray-500">EBITDA, rentabilidad, MRR y LTV — todos los valores en pesos colombianos (COP)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 flex-wrap">
        <TabBtn
          active={tab === 'licencias'}
          onClick={() => setTab('licencias')}
          icon={Tv}
          label="Licencias · TV"
          sub="EBITDA · MRR · LTV"
        />
        <TabBtn
          active={tab === 'equipos'}
          onClick={() => setTab('equipos')}
          icon={Package}
          label="Equipos"
          sub={finEq ? `${finEq.kpis.totalRegistros} registros` : undefined}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: LICENCIAS / TV
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'licencias' && kpisLicencias && (
        <div className="space-y-8">

          {/* ─── EBITDA: KPIs fila 1 ──────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-3 flex items-center gap-1.5">
              <Tv size={13} /> Ingresos de licencias/suscripciones · OPEX excluido de equipos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                icon={PiggyBank} label="EBITDA histórico · licencias" tone={kpisLicencias.ebitdaHistorico >= 0 ? 'positive' : 'negative'}
                value={fmtM(kpisLicencias.ebitdaHistorico)}
                sub="Ingresos licencias − OPEX (recargas + 4x1000)"
                onClick={() => setExplain({
                  title: 'EBITDA histórico · licencias', value: formatCurrency(kpisLicencias.ebitdaHistorico), icon: PiggyBank,
                  queEs: 'La utilidad operativa acumulada del negocio de suscripciones TV: lo que queda después de pagar las recargas de créditos, antes de impuestos.',
                  comoSeCalcula: '**Ingresos de licencias − OPEX (recargas + 4x1000)**. No incluye ni los ingresos ni los costos de venta de equipos (Fire TV, ONN) — esos están en la pestaña Equipos.',
                  origen: 'Ventas de licencias (módulo Pagos) menos las recargas (módulo Costo Pantalla).',
                })}
              />
              <KpiCard
                icon={Percent} label="Margen EBITDA · licencias" tone="accent"
                value={kpisLicencias.margenEbitdaPct != null ? `${kpisLicencias.margenEbitdaPct}%` : '—'}
                sub="Sobre ingresos históricos de licencias"
                onClick={() => setExplain({
                  title: 'Margen EBITDA · licencias', value: `${kpisLicencias.margenEbitdaPct}%`, icon: Percent,
                  queEs: 'De cada $100 de licencias que entran, cuántos quedan como utilidad operativa.',
                  comoSeCalcula: '**(EBITDA licencias ÷ Ingresos licencias) × 100**.',
                  origen: 'Derivado de ventas de licencias y recargas (Costo Pantalla).',
                })}
              />
              <KpiCard
                icon={Wallet} label="OPEX ratio" tone="neutral"
                value={kpisLicencias.opexRatioPct != null ? `${kpisLicencias.opexRatioPct}%` : '—'}
                sub={`OPEX histórico: ${fmtM(kpisLicencias.opexHistorico)} (recargas + 4x1000)`}
                onClick={() => setExplain({
                  title: 'OPEX ratio', value: `${kpisLicencias.opexRatioPct}%`, icon: Wallet,
                  queEs: 'Qué porcentaje de cada peso de ingreso de licencias se va en el gasto operativo (recargas de créditos).',
                  comoSeCalcula: '**(OPEX ÷ Ingresos licencias) × 100**.',
                  origen: 'Módulo **Costo Pantalla** — cada recarga con su costo COP e impuesto.',
                  action: { label: 'Ver Costo Pantalla', onClick: () => navigate('/admin/costo-pantalla') },
                })}
              />
              <KpiCard
                icon={TrendingUp} label={fin.kpis.tirAnualPct != null ? 'TIR anualizada' : 'ROI sobre OPEX'} tone="positive"
                value={fin.kpis.tirAnualPct != null ? `${fin.kpis.tirAnualPct}%` : fin.kpis.roiSobreOpex != null ? `${(fin.kpis.roiSobreOpex * 100).toFixed(0)}%` : '—'}
                sub={fin.kpis.tirAnualPct != null ? `TIR mensual: ${fin.kpis.tirMensualPct}%` : 'TIR no calculable: flujos siempre positivos'}
                onClick={() => setExplain({
                  title: fin.kpis.tirAnualPct != null ? 'TIR anualizada' : 'ROI sobre OPEX',
                  value: fin.kpis.tirAnualPct != null ? `${fin.kpis.tirAnualPct}%` : `${(fin.kpis.roiSobreOpex * 100).toFixed(0)}%`,
                  icon: TrendingUp,
                  queEs: fin.kpis.tirAnualPct != null
                    ? 'La rentabilidad anual equivalente de los flujos de caja del negocio.'
                    : 'Cuánto excedente generó cada peso invertido en recargas.',
                  comoSeCalcula: fin.kpis.tirAnualPct != null
                    ? 'Tasa de descuento que hace que todos los flujos sumen cero (método TIR estándar), luego anualizada.'
                    : '**(EBITDA acumulado ÷ OPEX acumulado) × 100**.',
                  origen: 'Serie mensual de ingresos (Pagos + Venta Dispositivos) y gastos (Costo Pantalla).',
                })}
              />
            </div>
          </div>

          {/* ─── EBITDA: KPIs fila 2 ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={Activity} label="EBITDA licencias · LTM" tone={kpisLicencias.ltm.ebitda >= 0 ? 'positive' : 'negative'}
              value={fmtM(kpisLicencias.ltm.ebitda)}
              sub={kpisLicencias.ltm.margenEbitdaPct != null ? `Margen LTM: ${kpisLicencias.ltm.margenEbitdaPct}%` : undefined}
              onClick={() => setExplain({
                title: 'EBITDA licencias · últimos 12 meses', value: formatCurrency(kpisLicencias.ltm.ebitda), icon: Activity,
                queEs: 'La utilidad operativa de licencias en los últimos 12 meses — la foto reciente del negocio de suscripciones.',
                comoSeCalcula: 'Suma de los últimos 12 meses: ingLicencias menos OPEX de ese período.',
                origen: 'Serie mensual de licencias y recargas, acotada a 12 meses.',
              })}
            />
            <KpiCard
              icon={DollarSign} label="EBITDA promedio mensual" tone="neutral"
              value={fmtM(kpisLicencias.ebitdaPromedioMensual)}
              sub="Sobre meses con actividad registrada"
              onClick={() => setExplain({
                title: 'EBITDA promedio mensual · licencias', value: formatCurrency(kpisLicencias.ebitdaPromedioMensual), icon: DollarSign,
                queEs: 'Cuánta utilidad operativa de licencias deja el negocio en un mes típico.',
                comoSeCalcula: '**EBITDA histórico licencias ÷ número de meses con actividad**.',
                origen: 'Serie mensual de licencias y recargas.',
              })}
            />
            <KpiCard
              icon={Hourglass} label="Payback" tone="neutral"
              value={fin.kpis.paybackMes ? fin.kpis.paybackMes.label : 'Inmediato'}
              sub={fin.kpis.paybackMes ? `Mes ${fin.kpis.paybackMes.index} de operación` : 'El flujo acumulado nunca fue negativo'}
              onClick={() => setExplain({
                title: 'Payback', value: fin.kpis.paybackMes ? fin.kpis.paybackMes.label : 'Inmediato', icon: Hourglass,
                queEs: 'En qué momento el negocio recuperó lo invertido y empezó a estar "en verde" de forma acumulada.',
                comoSeCalcula: 'Se va sumando el flujo neto mes a mes; el payback es el primer mes en que la suma acumulada se vuelve positiva.',
                origen: 'Serie mensual acumulada de EBITDA.',
              })}
            />
            <KpiCard
              icon={AlertTriangle} label="CAPEX registrado" tone="neutral"
              value={fmtM(fin.kpis.capexRegistrado)}
              sub="Negocio asset-light — sin inversión de capital registrada"
              onClick={() => setExplain({
                title: 'CAPEX registrado', value: formatCurrency(fin.kpis.capexRegistrado), icon: AlertTriangle,
                queEs: 'La inversión en activos de largo plazo. En este negocio es prácticamente cero: modelo asset-light.',
                comoSeCalcula: 'No hay compras de activos registradas. Los equipos Fire TV/ONN que se compran son para reventa (inventario), no inversión de capital.',
                origen: 'No existe un módulo de activos fijos — este valor es una constatación.',
              })}
            />
          </div>

          {/* ─── Gráfico 1: EBITDA mensual + margen ─────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>EBITDA mensual de licencias y margen</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">Barras: EBITDA de suscripciones (COP). Línea: margen EBITDA % — solo ingresos de licencias menos OPEX</p>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={serieLicencias} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="cop" tickFormatter={fmtM} tick={{ fontSize: 10 }} width={58} />
                  <YAxis yAxisId="pct" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} width={40} />
                  <Tooltip formatter={(v, name) => name === 'Margen %' ? [`${v}%`, name] : tooltipMoney(v, name)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine yAxisId="cop" y={0} stroke="#94a3b8" />
                  <Bar yAxisId="cop" dataKey="ebitda" name="EBITDA licencias" radius={[3, 3, 0, 0]}>
                    {serieLicencias.map((m, i) => (
                      <Cell key={i} fill={m.ebitda >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                  <Line yAxisId="pct" dataKey="margenEbitdaPct" name="Margen %" stroke="#8b5cf6" strokeWidth={2} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* ─── Gráfico 2 + 3 ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Estructura anual: ingresos licencias, OPEX y EBITDA</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">La brecha entre la barra naranja y la gris es el EBITDA de la línea TV</p>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={serieAnualLicencias} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={fmtM} tick={{ fontSize: 10 }} width={58} />
                    <Tooltip formatter={tooltipMoney} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="ingresos" name="Ingresos licencias" fill="#f97316" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="opex" name="OPEX" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                    <Line dataKey="ebitda" name="EBITDA" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Flujo de caja acumulado · licencias</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Suma corrida del EBITDA mensual de suscripciones</p>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={serieLicencias} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradFlujoLic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tickFormatter={fmtM} tick={{ fontSize: 10 }} width={58} />
                    <Tooltip formatter={tooltipMoney} />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    <Area dataKey="flujoAcumulado" name="Flujo acumulado" stroke="#10b981" strokeWidth={2} fill="url(#gradFlujoLic)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>

          {/* ─── Gráfico 4: TRM vs OPEX ─────────────────────────────────── */}
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

          {/* ─── Rentabilidad y Ventas ──────────────────────────────────── */}
          {k && (
            <div>
              <SectionHeader
                icon={Target} gradient="from-emerald-500 to-emerald-600"
                title="Rentabilidad y Ventas · Lectura financiera"
                subtitle="Eficiencia, riesgo de cartera y productividad comercial"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <BiCard
                  icon={Scale} variant="solid" label="Markup sobre el costo"
                  value={`${k.markupPct.toFixed(1)}%`}
                  sub={`cada $1.000 de costo deja ${formatCurrency(Math.round(k.markupPct * 10))} de margen bruto`}
                  tag={tagMarkup(k)}
                  onClick={() => setExplain({
                    title: 'Markup sobre el costo', value: `${k.markupPct.toFixed(1)}%`, icon: Scale,
                    queEs: 'Cuánto "multiplica" cada peso invertido en costo.',
                    comoSeCalcula: '**(Ganancia ÷ Costos) × 100**.',
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
                    queEs: 'Cuántas veces alcanza el ingreso para pagar todo el costo operativo.',
                    comoSeCalcula: '**Ingresos ÷ Costos**.',
                    origen: 'Ingresos históricos sobre costos históricos (Costo Pantalla).',
                  })}
                />
                <BiCard
                  icon={Target} variant="outline" label="Punto de equilibrio"
                  value={`${k.puntoEquilibrioVentas.toLocaleString('es-CO')} ventas`}
                  sub={`al ticket promedio de ${formatCurrency(k.ticketPromedio)} para cubrir el costo total`}
                  tag={tagPuntoEquilibrio(k, bi.porAnio)}
                  onClick={() => setExplain({
                    title: 'Punto de equilibrio', value: `${k.puntoEquilibrioVentas.toLocaleString('es-CO')} ventas`, icon: Target,
                    queEs: 'El número mínimo de ventas que el negocio necesita para no perder plata.',
                    comoSeCalcula: '**Costos totales ÷ ticket promedio**, redondeado hacia arriba.',
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
                    queEs: 'Qué tan dependiente es el negocio de sus mejores clientes.',
                    comoSeCalcula: 'Se ordena el **20% superior** de clientes por ingreso y se calcula su % del total.',
                    origen: 'Ventas por cliente del módulo de **Pagos**.',
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
                    queEs: 'Cuánto ingreso ha producido, en promedio, cada pantalla en operación.',
                    comoSeCalcula: `**Ingresos históricos ÷ ${k.totalPantallas} pantallas activas**.`,
                    origen: 'Ingresos de Pagos divididos entre la suma de pantallas del Planificador.',
                    action: { label: 'Ver Planificador', onClick: () => navigate('/admin/planificador') },
                  })}
                />
                <BiCard
                  icon={TrendingUp} variant={k.momentumMrrPct >= 0 ? 'solid' : 'outline'} label="Momentum MRR"
                  value={`${k.momentumMrrPct > 0 ? '+' : ''}${k.momentumMrrPct.toFixed(1)}%`}
                  sub={`bruto: ${k.momentumVentasPct > 0 ? '+' : ''}${k.momentumVentasPct.toFixed(1)}%`}
                  tag={k.momentumMrrPct > 5  ? { tone: 'good',  text: 'Acelerando (MRR)' }
                    : k.momentumMrrPct > -5  ? { tone: 'info',  text: 'Ritmo estable' }
                    : { tone: 'warn', text: 'Desacelerando — vigilar' }}
                  onClick={() => setExplain({
                    title: 'Momentum MRR', value: `${k.momentumMrrPct > 0 ? '+' : ''}${k.momentumMrrPct.toFixed(1)}%`, icon: TrendingUp,
                    queEs: 'El "velocímetro" del negocio: si los últimos meses vienen creciendo o cayendo.',
                    comoSeCalcula: 'Variación % del MRR de cada mes frente al anterior (últimos 7 meses), promediada.',
                    origen: 'Serie mensual de MRR normalizado (Pagos).',
                  })}
                />
                <BiCard
                  icon={Repeat} variant="light" label="Renovaciones"
                  value={`${k.tasaRenovacionPct.toFixed(1)}%`}
                  sub={`del ingreso total · churn ${k.churnPct.toFixed(1)}%`}
                  onClick={() => setExplain({
                    title: 'Renovaciones', value: `${k.tasaRenovacionPct.toFixed(1)}%`, icon: Repeat,
                    queEs: 'Qué porcentaje de las ventas son clientes que volvieron a pagar.',
                    comoSeCalcula: '**Ventas tipo "Renovación" ÷ total de ventas × 100**.',
                    origen: 'Campo tipo de pago de cada venta (módulo Pagos).',
                    action: { label: 'Ver Análisis Retención', onClick: () => navigate('/admin/retencion') },
                  })}
                />
              </div>

              {/* Concentración + productividad */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <Card className="border-orange-100">
                  <CardHeader className="border-orange-50">
                    <CardTitle>Concentración de ingresos por cliente</CardTitle>
                    <p className="text-sm text-gray-400 mt-0.5">% del ingreso acumulado según el % de clientes (curva de Lorenz) — la brecha mide el riesgo de dependencia</p>
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
                        <Line type="monotone" dataKey="pctClientes" name="Distribución equitativa" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <ChartInsight text={narrarPareto(bi.paretoIngresos, k)} />
                  </CardBody>
                </Card>

                <Card className="border-orange-100">
                  <CardHeader className="border-orange-50">
                    <CardTitle>Productividad por pantalla</CardTitle>
                    <p className="text-sm text-gray-400 mt-0.5">Ingreso, costo y margen promedio por cada una de las {k.totalPantallas} pantallas en operación</p>
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

              {/* Momentum mensual */}
              <Card className="border-orange-100 mt-4">
                <CardHeader className="border-orange-50">
                  <CardTitle>Momentum de ventas — variación mensual de ingresos</CardTitle>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Variación % mes a mes de los últimos periodos con actividad (promedio: {k.momentumVentasPct > 0 ? '+' : ''}{k.momentumVentasPct.toFixed(1)}%)
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

          {/* ─── MRR ────────────────────────────────────────────────────── */}
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
                    queEs: 'El ingreso recurrente "real" de un mes: cuánto entra de manera sostenida.',
                    comoSeCalcula: 'Cada venta se **divide por la duración de su plan**: un plan anual de $190.000 aporta $15.833 al MRR, no $190.000.',
                    origen: 'Ventas del módulo de **Pagos**, usando el tipo de plan para saber la duración.',
                  })}
                />
                <BiCard icon={PiggyBank} variant="light" label="ARR estimado"
                  value={formatCurrency(k.arrActual)}
                  sub="MRR × 12 — proyección anualizada del ingreso recurrente actual"
                  tag={k.arrActual > 0 ? { tone: 'info', text: 'Proyección sostenida' } : null}
                  onClick={() => setExplain({
                    title: 'ARR estimado', value: formatCurrency(k.arrActual), icon: PiggyBank,
                    queEs: 'Cuánto ingresaría en un año completo si el ritmo recurrente actual se mantiene.',
                    comoSeCalcula: '**MRR del último mes × 12**.',
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
                  sub="promedio MoM del MRR normalizado — señal de tendencia"
                  tag={k.momentumMrrPct > 5  ? { tone: 'good', text: 'Acelerando (MRR)' }
                    : k.momentumMrrPct > -5  ? { tone: 'info', text: 'Ritmo MRR estable' }
                    : { tone: 'warn', text: 'MRR desacelerando' }}
                  onClick={() => setExplain({
                    title: 'Momentum MRR (7 meses)', value: `${k.momentumMrrPct > 0 ? '+' : ''}${k.momentumMrrPct.toFixed(1)}%`, icon: Activity,
                    queEs: 'La tendencia de fondo del ingreso recurrente: el promedio de 7 meses muestra la dirección real.',
                    comoSeCalcula: 'Variación mensual del MRR en los últimos 7 meses con datos, promediada.',
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

          {/* ─── LTV ────────────────────────────────────────────────────── */}
          {ltv && (
            <div>
              <SectionHeader
                icon={Gem} gradient="from-teal-500 to-teal-700"
                title="LTV · Valor de Vida del Cliente"
                subtitle="Cuánto ingreso generó cada cliente desde su primera activación"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <BiCard icon={Gem} variant="solid" label="LTV promedio"
                  value={formatCurrency(ltv.ltvPromedio)}
                  sub={`sobre ${ltv.numClientes} clientes con historial de compras`}
                  tag={tagLtv(ltv.ltvPromedio)}
                  onClick={() => setExplain({
                    title: 'LTV promedio', value: formatCurrency(ltv.ltvPromedio), icon: Gem,
                    queEs: 'Cuánto dinero deja un cliente típico durante toda su relación con el negocio.',
                    comoSeCalcula: 'Para cada cliente se **suman todas sus compras** y se promedia sobre todos los clientes con historial.',
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
                    comoSeCalcula: 'Para cada cliente: **su ingreso total ÷ sus meses de vida activa**, luego promediado.',
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
                    queEs: 'Cuántos meses dura, en promedio, la relación de un cliente con el negocio.',
                    comoSeCalcula: 'Meses entre la **primera activación** y la **última transacción**, promediados.',
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
                    queEs: 'El valor histórico de los clientes que hoy están a punto de irse.',
                    comoSeCalcula: 'Se identifican los clientes con pantallas **VENCIDAS o PRÓXIMAS A VENCER** y se **suma su LTV histórico**.',
                    origen: 'Cruce entre el Planificador y el historial de ventas de Pagos.',
                    action: { label: 'Ver Planificador', onClick: () => navigate('/admin/planificador') },
                  })}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-teal-100">
                  <CardHeader className="border-teal-50">
                    <CardTitle>Distribución del LTV por quintil</CardTitle>
                    <p className="text-sm text-gray-400 mt-0.5">Clientes agrupados en 5 segmentos según su LTV acumulado</p>
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
                    <p className="text-sm text-gray-400 mt-0.5">La brecha entre P25 y P90 revela la asimetría de la cartera</p>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-4 py-2">
                      {[
                        { label: 'P25 · cuartil bajo',  val: ltv.percentiles.p25, color: '#94a3b8' },
                        { label: 'P50 · mediana',        val: ltv.percentiles.p50, color: '#60a5fa' },
                        { label: 'P75 · cuartil alto',  val: ltv.percentiles.p75, color: '#34d399' },
                        { label: 'P90 · top 10%',       val: ltv.percentiles.p90, color: '#a855f7' },
                        { label: 'Máximo histórico',    val: ltv.percentiles.max, color: '#f97316' },
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

          {/* ─── Narrativa experta ──────────────────────────────────────── */}
          <div>
            <SectionHeader
              icon={Lightbulb} gradient="from-orange-500 to-orange-600"
              title="Lectura del analista · Licencias TV"
              subtitle="Interpretación financiera generada a partir de los datos reales del negocio de suscripciones"
            />
            <NarrativaFinanciera fin={fin} kpisLic={kpisLicencias} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: EQUIPOS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'equipos' && (
        <div className="space-y-8">
          {!finEq ? (
            <div className="py-20 text-center text-gray-400">Cargando datos de equipos…</div>
          ) : (
            <>
              {/* Advertencia si no hay costos registrados */}
              {finEq.kpis.sinCostoPct > 60 && (
                <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <Info size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Datos de costo incompletos — margen estimado</p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      El {finEq.kpis.sinCostoPct}% de los registros de equipos ({finEq.kpis.sinCostoCount} de {finEq.kpis.totalRegistros}) no tienen costo de adquisición registrado. El margen bruto mostrado está sobreestimado. Para mejorar la precisión, ingresa el costo de compra en cada registro de Venta de Dispositivos.
                    </p>
                  </div>
                </div>
              )}

              {/* KPI cards */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-3 flex items-center gap-1.5">
                  <Package size={13} /> Venta de equipos · Fire TV, ONN y otros dispositivos
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    icon={ShoppingCart} label="Ingresos totales equipos" tone="accent"
                    value={fmtM(finEq.kpis.totalIngresos)}
                    sub={`${finEq.kpis.totalRegistros} registros de venta`}
                  />
                  <KpiCard
                    icon={DollarSign} label="Costo registrado (COGS)" tone="neutral"
                    value={fmtM(finEq.kpis.totalCogs)}
                    sub={finEq.kpis.sinCostoCount > 0 ? `${finEq.kpis.sinCostoCount} registros sin costo` : 'Todos los costos registrados'}
                  />
                  <KpiCard
                    icon={TrendingUp} label="Margen bruto" tone={finEq.kpis.margenBruto >= 0 ? 'positive' : 'negative'}
                    value={fmtM(finEq.kpis.margenBruto)}
                    sub={finEq.kpis.margenBrutoPct != null ? `${finEq.kpis.margenBrutoPct}% sobre ingresos${finEq.kpis.sinCostoCount > 0 ? ' (estimado)' : ''}` : '—'}
                  />
                  <KpiCard
                    icon={BarChart2} label="Ticket promedio por venta" tone="neutral"
                    value={fmtM(finEq.kpis.ticketPromedio)}
                    sub={`sobre ${finEq.kpis.totalRegistros} registros`}
                  />
                </div>
              </div>

              {/* Gráfico: ingresos vs cogs por mes */}
              <Card>
                <CardHeader>
                  <CardTitle>Ingresos y margen de equipos por mes</CardTitle>
                  <p className="text-sm text-gray-400 mt-0.5">Barras: ingresos (naranja) y COGS registrado (gris). Línea: margen bruto %</p>
                </CardHeader>
                <CardBody>
                  {finEq.porMes.length === 0 ? (
                    <p className="py-12 text-center text-gray-400 text-sm">Sin datos de ventas de equipos por mes</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={finEq.porMes} margin={{ top: 10, right: 40, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis yAxisId="cop" tickFormatter={fmtM} tick={{ fontSize: 10 }} width={58} />
                        <YAxis yAxisId="pct" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} width={40} />
                        <Tooltip formatter={(v, name) => name === 'Margen %' ? [`${v}%`, name] : tooltipMoney(v, name)} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="cop" dataKey="ingresos" name="Ingresos equipos" fill="#f97316" radius={[3, 3, 0, 0]} />
                        <Bar yAxisId="cop" dataKey="cogs" name="COGS registrado" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                        <Line yAxisId="pct" dataKey="margenPct" name="Margen %" stroke="#6366f1" strokeWidth={2} dot={false} connectNulls />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </CardBody>
              </Card>

              {/* Gráfico: desglose por tipo de equipo */}
              <Card>
                <CardHeader>
                  <CardTitle>Desglose por tipo de equipo</CardTitle>
                  <p className="text-sm text-gray-400 mt-0.5">Ingresos acumulados por tipo de dispositivo vendido (Fire TV, ONN, etc.)</p>
                </CardHeader>
                <CardBody>
                  {finEq.porTipo.length === 0 ? (
                    <p className="py-12 text-center text-gray-400 text-sm">Sin datos de tipo de equipo</p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={Math.max(200, finEq.porTipo.length * 52)}>
                        <ComposedChart
                          data={finEq.porTipo}
                          layout="vertical"
                          margin={{ top: 8, right: 80, left: 8, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" tickFormatter={fmtM} tick={{ fontSize: 10 }} />
                          <YAxis type="category" dataKey="tipo" tick={{ fontSize: 11, fill: '#374151' }} width={120} />
                          <Tooltip
                            formatter={(v, name) => name === '% del total' ? [`${v}%`, name] : tooltipMoney(v, name)}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="ingresos" name="Ingresos" radius={[0, 6, 6, 0]} barSize={28}>
                            {finEq.porTipo.map((_, i) => (
                              <Cell key={i} fill={['#f97316', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#14b8a6'][i % 8]} />
                            ))}
                            <LabelList dataKey="pct" position="right" formatter={v => `${v}%`} style={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
                          </Bar>
                        </ComposedChart>
                      </ResponsiveContainer>

                      {/* Tabla resumen por tipo */}
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              <th className="text-left py-2 pr-4">Tipo de equipo</th>
                              <th className="text-right py-2 pr-4">Ingresos</th>
                              <th className="text-right py-2 pr-4">COGS</th>
                              <th className="text-right py-2 pr-4">Margen bruto</th>
                              <th className="text-right py-2">% del total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {finEq.porTipo.map((t, i) => (
                              <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                <td className="py-2 pr-4 font-medium text-gray-700">{t.tipo}</td>
                                <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(t.ingresos)}</td>
                                <td className="py-2 pr-4 text-right tabular-nums text-gray-500">{t.cogs > 0 ? formatCurrency(t.cogs) : <span className="text-amber-500 text-xs">sin dato</span>}</td>
                                <td className="py-2 pr-4 text-right tabular-nums">
                                  <span className={t.margen >= 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
                                    {formatCurrency(t.margen)}
                                  </span>
                                  {t.margenPct != null && <span className="text-gray-400 text-xs ml-1">({t.margenPct}%)</span>}
                                </td>
                                <td className="py-2 text-right">
                                  <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                    {t.pct}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-gray-200 font-semibold bg-gray-50">
                              <td className="py-2 pr-4">Total</td>
                              <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(finEq.kpis.totalIngresos)}</td>
                              <td className="py-2 pr-4 text-right tabular-nums text-gray-500">{formatCurrency(finEq.kpis.totalCogs)}</td>
                              <td className="py-2 pr-4 text-right tabular-nums text-green-700">{formatCurrency(finEq.kpis.margenBruto)}</td>
                              <td className="py-2 text-right">
                                <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-full">100%</span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}
