import { useEffect, useState } from 'react'
import {
  GitMerge, Users, Repeat, TrendingUp, Trophy, Lightbulb, Sparkles,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ComposedChart,
  Bar, Cell, LabelList, Legend,
} from 'recharts'
import api from '../../config/api'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { formatCurrency } from '../../utils/excelUtils'

const CSS = `
  @keyframes ret-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes ret-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes ret-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  .ret-a1 { animation: ret-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .ret-a2 { animation: ret-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .ret-a3 { animation: ret-fade-up .45s cubic-bezier(.22,1,.36,1) .12s both }
  .ret-orb-1 { animation: ret-orb-1 8s ease-in-out infinite }
  .ret-orb-2 { animation: ret-orb-2 11s ease-in-out infinite }
  .ret-kpi { transition: transform .25s ease, box-shadow .25s ease }
  .ret-kpi:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.12) }
  @media (prefers-reduced-motion: reduce) {
    .ret-a1, .ret-a2, .ret-a3, .ret-orb-1, .ret-orb-2 { animation: none !important; transition: none !important }
  }
`

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

// ─── Planes de hito (para anotaciones en la curva) ────────────────────────────

const HITOS = [
  { n: 1,  label: 'M1',  desc: '1ª renovación',           color: '#f59e0b' },
  { n: 7,  label: 'M7',  desc: 'Fin plan semestral+1',    color: '#10b981' },
  { n: 14, label: 'M14', desc: 'Fin plan anual+2',        color: '#6366f1' },
]

// ─── Curva promedio (doble: transaccional + ajustada) ─────────────────────────

function CurvaRetencionChart({ curvaPromedio, curvaPromedioAjustada }) {
  const data = curvaPromedio.map((pct, n) => {
    const aj = curvaPromedioAjustada?.[n] ?? null
    return {
      mes: n === 0 ? 'Act.' : `M${n}`,
      n,
      pct: pct !== null ? pct : undefined,
      pctAj: aj !== null ? aj : undefined,
    }
  })

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const hito = HITOS.find(h => label === (h.n === 0 ? 'Act.' : `M${h.n}`))
    return (
      <div className="bg-white border border-violet-100 rounded-xl shadow-lg px-4 py-3 text-xs min-w-[200px]">
        <p className="font-bold text-slate-700 mb-1.5 border-b border-gray-100 pb-1">{label}{hito ? ` — ${hito.desc}` : ''}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4 mb-0.5">
            <span style={{ color: p.color }} className="font-medium">{p.name}</span>
            <span style={{ color: p.color }} className="font-bold">{p.value}%</span>
          </div>
        ))}
        {payload.length === 2 && payload[0].value != null && payload[1].value != null && (
          <p className="mt-1.5 pt-1 border-t border-gray-100 text-gray-400">
            Diferencia: <strong className="text-indigo-600">+{payload[1].value - payload[0].value}pp</strong> por planes multi-mes
          </p>
        )}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 16, right: 32, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="retGradTx" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="retGradAj" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0891b2" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#0891b2" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
        <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="#d1d5db" />
        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} stroke="#d1d5db" width={36} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={50} stroke="#fbbf24" strokeDasharray="4 4"
          label={{ value: '50%', position: 'insideTopRight', fontSize: 9, fill: '#d97706' }} />
        {HITOS.map(h => (
          <ReferenceLine key={h.n} x={h.n === 0 ? 'Act.' : `M${h.n}`}
            stroke={h.color} strokeDasharray="3 3" strokeWidth={1.5}
            label={{ value: h.label, position: 'top', fontSize: 9, fill: h.color, fontWeight: 700 }} />
        ))}
        {curvaPromedioAjustada && (
          <Area type="monotone" dataKey="pctAj"
            name="Por servicio activo (ajustado plan)"
            stroke="#0891b2" strokeWidth={2.5}
            fill="url(#retGradAj)"
            dot={{ r: 3, fill: '#0891b2', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls />
        )}
        <Area type="monotone" dataKey="pct"
          name="Transaccional (renovaciones)"
          stroke="#7c3aed" strokeWidth={2.5}
          fill="url(#retGradTx)"
          dot={{ r: 3, fill: '#7c3aed', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Gráfico de distribución de planes ───────────────────────────────────────

const PLAN_COLORS = { 'Plan Mensual': '#7c3aed', 'Plan Semestral': '#0891b2', 'Plan Anual': '#059669', 'Sin clasificar': '#94a3b8' }

function DistribucionPlanesChart({ distribucionPlanes }) {
  if (!distribucionPlanes?.length) return null
  const total = distribucionPlanes.reduce((s, p) => s + p.count, 0)
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, distribucionPlanes.length * 42)}>
      <ComposedChart layout="vertical" data={distribucionPlanes} margin={{ top: 4, right: 56, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" opacity={0.4} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#78716c' }} allowDecimals={false} />
        <YAxis type="category" dataKey="plan" tick={{ fontSize: 11, fill: '#374151' }} width={140} />
        <Tooltip formatter={(v, name, props) => [`${v} ventas (${props.payload.pct}%)`, 'Cantidad']} />
        <Bar dataKey="count" name="Ventas" radius={[0, 6, 6, 0]} maxBarSize={32}>
          {distribucionPlanes.map((p, i) => (
            <Cell key={i} fill={PLAN_COLORS[p.plan] || '#6366f1'} />
          ))}
          <LabelList
            formatter={(v) => {
              const p = distribucionPlanes.find(d => d.count === v)
              return p ? `${v} (${p.pct}%)` : v
            }}
            position="right"
            style={{ fontSize: 11, fontWeight: 700, fill: '#1e293b' }} />
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Narrativa ────────────────────────────────────────────────────────────────

function narrarCohortes(cohortData) {
  if (!cohortData) return null
  const { resumen, resumenAjustado, cohortes } = cohortData
  if (!cohortes?.length) return null

  const mejorCohorte = cohortes
    .filter(c => c.clientesIniciales >= 3 && c.retencion[3] !== null)
    .sort((a, b) => (b.retencion[3] ?? 0) - (a.retencion[3] ?? 0))[0]

  const peorCohorte = cohortes
    .filter(c => c.clientesIniciales >= 3 && c.retencion[3] !== null)
    .sort((a, b) => (a.retencion[3] ?? 100) - (b.retencion[3] ?? 100))[0]

  const caida_m0_m1 = resumen.mes1 != null ? 100 - resumen.mes1 : null
  const brechaAjuste = resumenAjustado?.mes6 != null && resumen.mes6 != null
    ? resumenAjustado.mes6 - resumen.mes6
    : null

  return [
    `La **curva transaccional** (violeta) muestra que el **${resumen.mes1 ?? '—'}%** de los clientes genera una 2ª transacción al mes siguiente. `,
    `La **curva ajustada por plan** (azul) sube esa cifra a **${resumenAjustado?.mes1 ?? '—'}%** — la diferencia son clientes en planes semestrales o anuales que están activos pero no renovaron ese mes específico. `,
    brechaAjuste != null && brechaAjuste > 5
      ? `Al mes 6, la brecha entre ambas curvas es de **${brechaAjuste} puntos porcentuales** (${resumen.mes6}% transaccional vs ${resumenAjustado?.mes6}% ajustado) — eso confirma que una parte importante del "churn aparente" son clientes en plan semestral (6+1 meses) que no renuevan hasta el mes 7. `
      : '',
    mejorCohorte
      ? `La cohorte con **mejor retención a mes 3** es **${mejorCohorte.mes}** (${mejorCohorte.retencion[3]}% con ${mejorCohorte.clientesIniciales} clientes)${peorCohorte && peorCohorte.mes !== mejorCohorte.mes ? ` y la de menor desempeño fue **${peorCohorte.mes}** (${peorCohorte.retencion[3]}%)` : ''}.`
      : '',
    `\n\n💡 **Las líneas verticales** marcan los hitos clave: **M1** (primera renovación mensual), **M7** (vencimiento plan semestral +1 gratis) y **M14** (vencimiento plan anual +2 gratis). Un "valle" en la curva ajustada justo antes de M7 o M14 es la señal más clara de que clientes en planes largos están cancelando en lugar de renovar.`,
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
      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="ret-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)' }}>
        <div className="ret-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.25] pointer-events-none" style={{ background: 'radial-gradient(circle,#a855f7,transparent 70%)' }} />
        <div className="ret-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#8b5cf6,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 mb-4">
              <GitMerge size={12} className="text-violet-300" />
              <span className="text-violet-300 text-xs font-semibold tracking-widest uppercase">Análisis</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Análisis de Retención
            </h1>
            <p className="text-violet-100/70 text-sm mt-2 max-w-xl">
              ¿Qué porcentaje de los clientes activados en cada mes sigue generando transacciones en los meses siguientes?
            </p>
          </div>
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

          {/* KPIs de retención — transaccional vs ajustado por plan */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 ret-a2">
            {[
              { n: 'mes1', Icon: Users,      label: 'Retención · Mes 1',  sub: 'Primera renovación', tag: tagMes1, desc: 'De cada 100 clientes activados, cuántos generan una 2ª transacción al mes siguiente. Clientes en plan semestral/anual pueden aparecer como "no retenidos" aunque estén activos.' },
              { n: 'mes3', Icon: Repeat,     label: 'Retención · Mes 3',  sub: 'Punto de estabilización', tag: tagMes3, desc: 'Cuántos siguen con actividad a los 3 meses. Separa clientes de paso de los recurrentes.' },
              { n: 'mes6', Icon: TrendingUp, label: 'Retención · Mes 6',  sub: 'Señal de fidelidad media', tag: tagMes6, desc: 'M7 = fin del plan semestral + 1 gratis. La curva ajustada sube notablemente en este punto.' },
              { n: 'mes12', Icon: Trophy,    label: 'Retención · Mes 12', sub: 'Núcleo fiel anual', tag: tagMes12, desc: 'M14 = fin del plan anual + 2 gratis. Solo cuentan cohortes con más de un año de antigüedad.' },
            ].map(({ n, Icon, label, sub, tag, desc }) => {
              const vTx = data.resumen[n]
              const vAj = data.resumenAjustado?.[n]
              const brecha = vAj != null && vTx != null ? vAj - vTx : null
              return (
                <div key={n} className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden select-none cursor-pointer ret-kpi"
                  onClick={() => setExplain({ title: label, value: vTx != null ? `${vTx}%` : '—', icon: Icon,
                    queEs: desc,
                    comoSeCalcula: 'Cada cliente entra a la cohorte del mes de su primera "Activacion Pantalla". Se mide si tuvo alguna transacción (excl. cortesías) en el mes N. **Ajustado**: los planes semestrales se marcan como activos 7 meses, los anuales 14 meses.',
                    origen: 'Ventas del módulo Pagos agrupadas por cohorte de primera activación.',
                  })}>
                  <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)' }} />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-violet-500/10 rounded-lg p-2"><Icon size={18} className="text-violet-600" /></div>
                      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">{label}</p>
                    </div>
                    <div className="flex items-end gap-2 mb-1.5">
                      <p className="text-3xl font-extrabold text-slate-800 tabular-nums leading-none">{vAj != null ? `${vAj}%` : '—'}</p>
                      {brecha != null && brecha > 0 && (
                        <span className="text-xs text-slate-400 font-medium">({vTx}% tx)</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {brecha != null && brecha > 0 && (
                        <SmartTag tone="info">+{brecha}pp ajustado por plan</SmartTag>
                      )}
                      {tag && <div>{(() => { const t = tag(vTx); return t ? <SmartTag tone={t.tone}>{t.text}</SmartTag> : null })()}</div>}
                    </div>
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">{sub}</p>
                    <p className="text-[11px] font-bold text-violet-500 mt-3 inline-flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
                      <Lightbulb size={12} /> ¿Cómo se calcula?
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Distribución de planes */}
          {data.distribucionPlanes?.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 ret-a3">
              <Card className="border-violet-100 lg:col-span-2">
                <CardHeader className="border-violet-50">
                  <CardTitle>Curva promedio de retención por mes de vida</CardTitle>
                  <p className="text-sm text-gray-400 mt-0.5">
                    <span className="text-violet-600 font-semibold">Violeta</span> = transaccional (renovaciones reales) ·{' '}
                    <span className="text-cyan-600 font-semibold">Azul</span> = servicio activo estimado (ajustado por duración de plan) ·{' '}
                    datos hasta <span className="font-semibold">{data.maxMes}</span>
                  </p>
                </CardHeader>
                <CardBody>
                  <CurvaRetencionChart curvaPromedio={data.curvaPromedio} curvaPromedioAjustada={data.curvaPromedioAjustada} />
                  <ChartInsight text={narrarCohortes(data)} />
                </CardBody>
              </Card>
              <Card className="border-violet-100">
                <CardHeader className="border-violet-50">
                  <CardTitle>Distribución por plan</CardTitle>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Ventas por tipo de plan · Explica la brecha entre las dos curvas
                  </p>
                </CardHeader>
                <CardBody>
                  <DistribucionPlanesChart distribucionPlanes={data.distribucionPlanes} />
                  <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                      <span><strong>Plan Anual</strong>: 12 meses + 2 gratis = 14 meses servicio activo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-600 shrink-0" />
                      <span><strong>Plan Semestral</strong>: 6 meses + 1 gratis = 7 meses servicio activo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-600 shrink-0" />
                      <span><strong>Plan Mensual</strong>: renovación cada mes = tasa real</span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* Curva sin distribución de planes */}
          {!data.distribucionPlanes?.length && (
            <Card className="border-violet-100">
              <CardHeader className="border-violet-50">
                <CardTitle>Curva promedio de retención por mes de vida</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">
                  Promedio de todas las cohortes · Datos hasta{' '}
                  <span className="font-semibold text-violet-600">{data.maxMes}</span>
                </p>
              </CardHeader>
              <CardBody>
                <CurvaRetencionChart curvaPromedio={data.curvaPromedio} curvaPromedioAjustada={data.curvaPromedioAjustada} />
                <ChartInsight text={narrarCohortes(data)} />
              </CardBody>
            </Card>
          )}

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
