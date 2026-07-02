import { useEffect, useState } from 'react'
import {
  TrendingUp, Wallet, Percent, PiggyBank, Activity,
  Landmark, AlertTriangle, Lightbulb, Scale, DollarSign, Hourglass,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, AreaChart, Area, Cell, ReferenceLine,
} from 'recharts'
import api from '../../config/api'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { formatCurrency } from '../../utils/excelUtils'
import { cn } from '../../utils/cn'

// ─── Formateadores ───────────────────────────────────────────────────────────

const fmtM = (v) => {
  if (v == null) return '—'
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`
  if (abs >= 1_000) return `$${(v / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 0 })}K`
  return `$${v.toLocaleString('es-CO')}`
}

const tooltipMoney = (value, name) => [formatCurrency(value), name]

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, tone = 'neutral' }) {
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
  return (
    <div className={cn('rounded-xl border p-4 shadow-card', tones[tone])}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-brand-accent mt-1 tabular-nums truncate">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={cn('rounded-lg p-2 flex-shrink-0', iconTones[tone])}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

// ─── Narrativa experta generada desde los datos ─────────────────────────────

function NarrativaFinanciera({ fin }) {
  if (!fin) return null
  const { kpis, serieAnual, serieMensual } = fin
  const items = []

  // 1) Nivel y calidad del EBITDA
  if (kpis.margenEbitdaPct != null) {
    const nivel = kpis.margenEbitdaPct >= 50 ? 'excepcional' : kpis.margenEbitdaPct >= 30 ? 'sólido' : kpis.margenEbitdaPct >= 15 ? 'moderado' : 'estrecho'
    items.push({
      icon: PiggyBank,
      titulo: 'Nivel y calidad del EBITDA',
      texto: `El negocio acumula un EBITDA histórico de ${formatCurrency(kpis.ebitdaHistorico)} sobre ingresos que rinden un margen del ${kpis.margenEbitdaPct}% — un nivel ${nivel} para un distribuidor digital. Importante: al no registrarse nómina ni gastos administrativos, este EBITDA es en la práctica la utilidad bruta operativa; el EBITDA real será menor una vez se imputen esos gastos.`,
    })
  }

  // 2) Estructura de costos y apalancamiento operativo
  if (kpis.opexRatioPct != null) {
    const ultimo = serieAnual[serieAnual.length - 1]
    items.push({
      icon: Scale,
      titulo: 'Estructura de costos (OPEX)',
      texto: `Por cada $100 de ingreso, $${Math.round(kpis.opexRatioPct)} se destinan a recargas de créditos e impuesto 4x1000 — el único costo operativo registrado. ${ultimo?.opexRatioPct != null ? `En ${ultimo.anio} el ratio va en ${ultimo.opexRatioPct}%.` : ''} Al ser un costo variable ligado al dólar, el apalancamiento operativo es bajo: el negocio escala sin costos fijos relevantes, pero el margen queda expuesto a la TRM.`,
    })
  }

  // 3) TIR / retorno
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

  // 4) Riesgo cambiario
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

  // 5) CAPEX y advertencia metodológica
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

// ─── Página ──────────────────────────────────────────────────────────────────

export default function AnalisisFinancieroPage() {
  const [fin, setFin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/admin/dashboard-bi/finanzas')
      .then(r => setFin(r.data))
      .catch(e => setError(e.response?.data?.error || 'Error cargando datos financieros'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-20 text-center text-gray-400">Calculando indicadores financieros…</div>
  if (error) return <div className="py-20 text-center text-red-500">{error}</div>
  if (!fin || fin.serieMensual.length === 0) {
    return <div className="py-20 text-center text-gray-400">Sin datos de ventas o costos registrados todavía.</div>
  }

  const { kpis, serieMensual, serieAnual } = fin
  const trmSerie = serieMensual.filter(m => m.trmPromedio != null)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-2.5 shadow-md">
          <Landmark size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-accent">Análisis Financiero · EBITDA, OPEX y Retorno</h1>
          <p className="text-sm text-gray-500">Todos los valores en pesos colombianos (COP), sobre la información registrada en el sistema</p>
        </div>
      </div>

      {/* KPIs fila 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={PiggyBank} label="EBITDA histórico" tone={kpis.ebitdaHistorico >= 0 ? 'positive' : 'negative'}
          value={fmtM(kpis.ebitdaHistorico)}
          sub="Ingresos − OPEX − costo de equipos"
        />
        <KpiCard
          icon={Percent} label="Margen EBITDA" tone="accent"
          value={kpis.margenEbitdaPct != null ? `${kpis.margenEbitdaPct}%` : '—'}
          sub="Sobre ingresos históricos totales"
        />
        <KpiCard
          icon={Wallet} label="OPEX ratio" tone="neutral"
          value={kpis.opexRatioPct != null ? `${kpis.opexRatioPct}%` : '—'}
          sub={`OPEX histórico: ${fmtM(kpis.opexHistorico)} (recargas + 4x1000)`}
        />
        <KpiCard
          icon={TrendingUp} label={kpis.tirAnualPct != null ? 'TIR anualizada' : 'ROI sobre OPEX'} tone="positive"
          value={kpis.tirAnualPct != null ? `${kpis.tirAnualPct}%` : kpis.roiSobreOpex != null ? `${(kpis.roiSobreOpex * 100).toFixed(0)}%` : '—'}
          sub={kpis.tirAnualPct != null ? `TIR mensual: ${kpis.tirMensualPct}%` : 'TIR no calculable: flujos siempre positivos'}
        />
      </div>

      {/* KPIs fila 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Activity} label="EBITDA últimos 12 meses" tone={kpis.ltm.ebitda >= 0 ? 'positive' : 'negative'}
          value={fmtM(kpis.ltm.ebitda)}
          sub={kpis.ltm.margenEbitdaPct != null ? `Margen LTM: ${kpis.ltm.margenEbitdaPct}%` : undefined}
        />
        <KpiCard
          icon={DollarSign} label="EBITDA promedio mensual" tone="neutral"
          value={fmtM(kpis.ebitdaPromedioMensual)}
          sub="Sobre meses con actividad registrada"
        />
        <KpiCard
          icon={Hourglass} label="Payback" tone="neutral"
          value={kpis.paybackMes ? kpis.paybackMes.label : 'Inmediato'}
          sub={kpis.paybackMes ? `Mes ${kpis.paybackMes.index} de operación` : 'El flujo acumulado nunca fue negativo'}
        />
        <KpiCard
          icon={AlertTriangle} label="CAPEX registrado" tone="neutral"
          value={fmtM(kpis.capexRegistrado)}
          sub="Negocio asset-light — sin inversión de capital registrada"
        />
      </div>

      {/* Gráfico 1: EBITDA mensual + margen */}
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

      {/* Gráfico 2 + 3 */}
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

      {/* Gráfico 4: TRM vs OPEX */}
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

      {/* Narrativa experta */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-2.5 shadow-md">
            <Lightbulb size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand-accent">Lectura del analista</h2>
            <p className="text-sm text-gray-500">Interpretación financiera generada a partir de los datos reales del negocio</p>
          </div>
        </div>
        <NarrativaFinanciera fin={fin} />
      </div>
    </div>
  )
}
