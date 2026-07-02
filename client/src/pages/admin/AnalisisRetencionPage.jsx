import { useEffect, useState } from 'react'
import {
  GitMerge, Users, Repeat, TrendingUp, Trophy, Lightbulb, Sparkles,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import api from '../../config/api'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { formatCurrency } from '../../utils/excelUtils'

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function SmartTag({ tone = 'info', icon: Icon = Sparkles, children }) {
  const styles = {
    good: 'bg-emerald-100 text-emerald-700',
    warn: 'bg-amber-100 text-amber-700',
    bad:  'bg-red-100 text-red-700',
    info: 'bg-sky-100 text-sky-700',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${styles[tone]}`}>
      <Icon size={10} />
      {children}
    </span>
  )
}

function BiCard({ icon: Icon, label, value, sub, variant = 'light', tag, onClick }) {
  const styles = {
    solid:   'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-orange-200',
    light:   'bg-white border-2 border-orange-200 text-orange-700',
    outline: 'bg-orange-50 border border-orange-300 text-orange-800',
  }
  const iconBg = {
    solid: 'bg-white/20', light: 'bg-orange-100', outline: 'bg-orange-200/60',
  }
  const interactive = typeof onClick === 'function'
  return (
    <div
      className={`${styles[variant]} rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 ${interactive ? 'cursor-pointer' : ''}`}
      {...(interactive ? {
        role: 'button', tabIndex: 0, onClick,
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } },
      } : {})}
    >
      <div className="flex items-center gap-3">
        <div className={`${iconBg[variant]} rounded-lg p-2`}>
          <Icon size={18} className={variant === 'solid' ? 'text-white' : 'text-orange-500'} />
        </div>
        <p className={`text-xs font-semibold uppercase tracking-wide ${variant === 'solid' ? 'text-white/80' : 'text-gray-500'}`}>
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {tag && <div className="mt-1.5"><SmartTag tone={tag.tone}>{tag.text}</SmartTag></div>}
      {sub && (
        <p className={`text-xs mt-2 leading-relaxed ${variant === 'solid' ? 'text-white/70' : 'text-gray-400'}`}>
          {sub}
        </p>
      )}
      {interactive && (
        <p className={`text-xs font-semibold mt-1.5 ${variant === 'solid' ? 'text-white/90' : 'text-brand-primary'}`}>¿Cómo se calcula?</p>
      )}
    </div>
  )
}

function ChartInsight({ text }) {
  if (!text) return null
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <div className="mt-4 flex gap-3 bg-orange-50 border border-orange-100 rounded-xl p-4">
      <Lightbulb size={18} className="text-orange-400 mt-0.5 shrink-0" />
      <p className="text-sm text-gray-600 leading-relaxed">
        {parts.map((p, i) =>
          i % 2 === 1 ? <strong key={i} className="text-orange-700">{p}</strong> : p
        )}
      </p>
    </div>
  )
}

// ─── Color de celda del heatmap ───────────────────────────────────────────────

function retColor(pct) {
  if (pct === null) return { bg: '#f3f4f6', text: '#9ca3af' }
  if (pct === 0) return { bg: '#fecaca', text: '#991b1b' }
  const h = Math.round(pct * 1.2)
  const l = pct > 60 ? 38 : 42
  return { bg: `hsl(${h},65%,${l + 30}%)`, text: `hsl(${h},65%,${l - 5}%)` }
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function CohortHeatmap({ cohortes }) {
  const MAX_MESES = 18
  const cols = Array.from({ length: MAX_MESES + 1 }, (_, i) => i)

  return (
    <div className="overflow-x-auto rounded-lg border border-violet-100 text-xs">
      <table className="border-collapse" style={{ minWidth: `${(MAX_MESES + 2) * 64}px` }}>
        <thead>
          <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
            <th className="sticky left-0 z-10 bg-slate-800 px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[140px]">
              Cohorte
            </th>
            {cols.map(n => (
              <th key={n} className="px-2 py-2 text-center font-semibold w-14">
                {n === 0 ? 'Mes 0' : `M${n}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohortes.map((c) => {
            const small = c.clientesIniciales < 3
            return (
              <tr key={c.mes} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className={`sticky left-0 z-10 bg-white px-3 py-1.5 font-mono font-semibold whitespace-nowrap border-r border-slate-100 ${small ? 'text-slate-400' : 'text-slate-700'}`}>
                  {c.mes}
                  <span className={`ml-1.5 font-normal text-[10px] ${small ? 'text-slate-400' : 'text-slate-500'}`}>
                    n={c.clientesIniciales}
                  </span>
                </td>
                {cols.map(n => {
                  const pct = c.retencion[n]
                  const { bg, text } = retColor(pct)
                  return (
                    <td
                      key={n}
                      className="text-center px-1 py-1.5 w-14"
                      style={{ backgroundColor: bg, color: text }}
                      title={pct !== null ? `${c.mes} · Mes ${n}: ${pct}%` : 'Sin datos aún'}
                    >
                      {pct !== null ? (
                        <span className="font-semibold">{pct}%</span>
                      ) : (
                        <span className="text-[10px]">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Curva promedio ───────────────────────────────────────────────────────────

function CurvaRetencionChart({ curvaPromedio }) {
  const data = curvaPromedio
    .map((pct, n) => ({ mes: n === 0 ? 'Act.' : `M${n}`, pct }))
    .filter(d => d.pct !== null)

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-orange-100 rounded-lg px-3 py-2 shadow text-xs">
        <p className="font-semibold text-slate-700">{label}</p>
        <p className="text-orange-600 font-bold">{payload[0].value}% retención promedio</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="retGradPage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
        <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#d1d5db" />
        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} stroke="#d1d5db" />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={50}
          stroke="#fbbf24"
          strokeDasharray="4 4"
          label={{ value: '50%', position: 'right', fontSize: 10, fill: '#d97706' }}
        />
        <Area
          type="monotone"
          dataKey="pct"
          stroke="#7c3aed"
          strokeWidth={2.5}
          fill="url(#retGradPage)"
          dot={{ r: 3, fill: '#7c3aed', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          name="Retención %"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Narrativa ────────────────────────────────────────────────────────────────

function narrarCohortes(cohortData) {
  if (!cohortData) return null
  const { resumen, cohortes } = cohortData
  if (!cohortes?.length) return null

  const mejorCohorte = cohortes
    .filter(c => c.clientesIniciales >= 3 && c.retencion[3] !== null)
    .sort((a, b) => (b.retencion[3] ?? 0) - (a.retencion[3] ?? 0))[0]

  const peorCohorte = cohortes
    .filter(c => c.clientesIniciales >= 3 && c.retencion[3] !== null)
    .sort((a, b) => (a.retencion[3] ?? 100) - (b.retencion[3] ?? 100))[0]

  const caida_m0_m1 = resumen.mes1 != null ? 100 - resumen.mes1 : null
  const estabilidad = resumen.mes3 != null && resumen.mes12 != null
    ? Math.abs(resumen.mes3 - resumen.mes12)
    : null

  return [
    `En promedio, el **${resumen.mes1 ?? '—'}%** de los clientes registra actividad transaccional en el mes siguiente a su activación`,
    `— y la retención se estabiliza alrededor del **${resumen.mes6 ?? '—'}–${resumen.mes12 ?? '—'}%** entre los meses 6 y 12.`,
    caida_m0_m1 != null
      ? ` Esto implica que **${caida_m0_m1} de cada 100 clientes** activados no generan una segunda transacción en el primer mes — señal de que el mes 1 es el punto de mayor fuga y el primero que conviene atacar con acciones de retención proactiva (recordatorios, descuentos de segunda renovación, contacto directo).`
      : '',
    estabilidad != null && estabilidad <= 5
      ? ` Entre el mes 3 y el mes 12 la curva es **relativamente plana** (${resumen.mes3}% → ${resumen.mes12}%), lo que sugiere que quienes superan el primer mes tienden a quedarse — el churn estructural del negocio ocurre principalmente al inicio.`
      : estabilidad != null
      ? ` Entre el mes 3 y el mes 12 hay una **caída adicional de ${estabilidad} puntos** (${resumen.mes3}% → ${resumen.mes12}%), indicando pérdida gradual de clientes incluso en la base establecida.`
      : '',
    mejorCohorte
      ? ` La cohorte con **mejor retención al mes 3** es **${mejorCohorte.mes}** (${mejorCohorte.retencion[3]}% con ${mejorCohorte.clientesIniciales} clientes)${peorCohorte && peorCohorte.mes !== mejorCohorte.mes ? ` y la de peor desempeño fue **${peorCohorte.mes}** (${peorCohorte.retencion[3]}%)` : ''} — investigar qué condiciones diferenciaron ambas cohortes puede revelar palancas de retención replicables.`
      : '',
    `\n\n⚠️ **Nota metodológica:** esta métrica mide "actividad de transacciones" (renovaciones/compras) por mes calendario, no "pantalla activa". Clientes en **plan anual** pueden aparecer sin actividad en meses 1–11 aunque estén usando el servicio. La curva subestima la retención real, especialmente en los meses intermedios.`,
  ].join('')
}

// ─── Smart tags para los BiCards ──────────────────────────────────────────────

function tagMes1(v) {
  if (v == null) return null
  if (v >= 50) return { tone: 'good', text: 'Retención inicial sólida' }
  if (v >= 25) return { tone: 'warn', text: 'Retención inicial moderada' }
  return { tone: 'bad', text: 'Fuga alta en mes 1' }
}
function tagMes3(v) {
  if (v == null) return null
  if (v >= 40) return { tone: 'good', text: 'Estabilización positiva' }
  if (v >= 20) return { tone: 'warn', text: 'Estabilización moderada' }
  return { tone: 'bad', text: 'Erosión significativa a mes 3' }
}
function tagMes6(v) {
  if (v == null) return null
  return v >= 35 ? { tone: 'good', text: 'Base fiel activa' } : { tone: 'info', text: 'Base parcialmente activa' }
}
function tagMes12(v) {
  if (v == null) return null
  if (v >= 30) return { tone: 'good', text: 'Núcleo fiel año completo' }
  if (v >= 15) return { tone: 'info', text: 'Fidelidad moderada a 12 meses' }
  return { tone: 'warn', text: 'Alta rotación al año' }
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AnalisisRetencionPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [explain, setExplain] = useState(null)

  useEffect(() => {
    api.get('/admin/dashboard-bi/cohorts')
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el análisis de retención.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <div className="bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl p-3 shadow-lg">
          <GitMerge size={26} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-accent">Análisis de Retención</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            ¿Qué porcentaje de los clientes activados en cada mes sigue generando transacciones en los meses siguientes?
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
          Cargando análisis de cohortes…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {data && (
        <>
          <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

          {/* KPIs de retención */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <BiCard
              icon={Users}
              variant="light"
              label="Retención · Mes 1"
              value={data.resumen.mes1 != null ? `${data.resumen.mes1}%` : '—'}
              sub="% que genera una 2ª transacción al mes siguiente de activación"
              tag={tagMes1(data.resumen.mes1)}
              onClick={() => setExplain({
                title: 'Retención · Mes 1', value: data.resumen.mes1 != null ? `${data.resumen.mes1}%` : '—', icon: Users,
                queEs: 'De cada 100 clientes que se activaron, cuántos volvieron a comprar (o renovar) al mes siguiente — la primera prueba de fuego de la relación.',
                comoSeCalcula: 'Cada cliente se agrupa en la **cohorte** del mes de su primera activación. Se revisa si tuvo alguna transacción en el mes calendario siguiente y se promedia sobre todas las cohortes.',
                origen: 'Fechas y tipos de pago de las ventas (módulo Pagos), excluyendo cortesías. **Ojo:** los clientes con plan anual no registran actividad mensual aunque estén activos, así que este % subestima la retención real.',
              })}
            />
            <BiCard
              icon={Repeat}
              variant="light"
              label="Retención · Mes 3"
              value={data.resumen.mes3 != null ? `${data.resumen.mes3}%` : '—'}
              sub="actividad a los 3 meses de haber entrado"
              tag={tagMes3(data.resumen.mes3)}
              onClick={() => setExplain({
                title: 'Retención · Mes 3', value: data.resumen.mes3 != null ? `${data.resumen.mes3}%` : '—', icon: Repeat,
                queEs: 'Cuántos clientes siguen comprando 3 meses después de haber entrado — el punto donde se separan los clientes de paso de los recurrentes.',
                comoSeCalcula: 'Mismo método de cohortes: % de clientes de cada cohorte con al menos una transacción en su tercer mes de vida, promediado.',
                origen: 'Ventas del módulo Pagos, agrupadas por cohorte de primera activación.',
              })}
            />
            <BiCard
              icon={TrendingUp}
              variant="light"
              label="Retención · Mes 6"
              value={data.resumen.mes6 != null ? `${data.resumen.mes6}%` : '—'}
              sub="actividad a los 6 meses — señal de fidelidad"
              tag={tagMes6(data.resumen.mes6)}
              onClick={() => setExplain({
                title: 'Retención · Mes 6', value: data.resumen.mes6 != null ? `${data.resumen.mes6}%` : '—', icon: TrendingUp,
                queEs: 'Cuántos clientes siguen activos medio año después de entrar — los que llegan aquí suelen quedarse.',
                comoSeCalcula: 'Mismo método de cohortes, medido en el sexto mes de vida de cada cliente.',
                origen: 'Ventas del módulo Pagos, agrupadas por cohorte.',
              })}
            />
            <BiCard
              icon={Trophy}
              variant="light"
              label="Retención · Mes 12"
              value={data.resumen.mes12 != null ? `${data.resumen.mes12}%` : '—'}
              sub="actividad al año — clientes de largo plazo"
              tag={tagMes12(data.resumen.mes12)}
              onClick={() => setExplain({
                title: 'Retención · Mes 12', value: data.resumen.mes12 != null ? `${data.resumen.mes12}%` : '—', icon: Trophy,
                queEs: 'Cuántos clientes cumplen un año comprando — el núcleo fiel que sostiene el ingreso recurrente y el LTV alto.',
                comoSeCalcula: 'Mismo método de cohortes, medido en el mes 12 de vida. Solo cuentan las cohortes con al menos un año de antigüedad.',
                origen: 'Ventas del módulo Pagos, agrupadas por cohorte. El detalle mes a mes está en el mapa de calor de abajo.',
              })}
            />
          </div>

          {/* Curva promedio */}
          <Card className="border-violet-100">
            <CardHeader className="border-violet-50">
              <CardTitle>Curva promedio de retención por mes de vida</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">
                Promedio de todas las cohortes · Línea de referencia al 50% · Datos hasta{' '}
                <span className="font-semibold text-violet-600">{data.maxMes}</span>
              </p>
            </CardHeader>
            <CardBody>
              <CurvaRetencionChart curvaPromedio={data.curvaPromedio} />
              <ChartInsight text={narrarCohortes(data)} />
            </CardBody>
          </Card>

          {/* Heatmap */}
          <Card className="border-violet-100">
            <CardHeader className="border-violet-50">
              <CardTitle>Matriz de cohortes</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">
                Cada fila = mes de primera activación · Cada columna = mes de vida (M0–M18) ·{' '}
                <span className="text-emerald-600 font-semibold">Verde</span> alto →{' '}
                <span className="text-red-600 font-semibold">Rojo</span> bajo ·{' '}
                Cohortes con n&lt;3 son estadísticamente pequeñas
              </p>
            </CardHeader>
            <CardBody className="p-0 pb-2">
              <CohortHeatmap cohortes={data.cohortes} />
            </CardBody>
          </Card>

          {/* Resumen metodológico */}
          <Card className="border-slate-100 bg-slate-50">
            <CardBody>
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong className="text-slate-700">¿Cómo se construye esta tabla?</strong>{' '}
                El mes de cohorte es el mes de la primera venta con tipoPago <em>"Activacion Pantalla"</em> de cada cliente.
                Un cliente se considera <em>retenido</em> en el mes N si registró al menos una transacción (renovación, activación
                o cambio de plan) en ese mes calendario. Las celdas grises (—) indican meses que aún no han transcurrido.
                La tasa promedio de retención refleja actividad transaccional, no el estado activo de una pantalla —
                clientes en plan anual no aparecerán en los meses intermedios aunque sigan activos.
              </p>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
