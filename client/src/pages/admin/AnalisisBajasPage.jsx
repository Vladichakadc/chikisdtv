import { useState, useMemo, useEffect } from 'react'
import { UserX, BarChart3, Calendar, ArrowDownCircle, Tv, Activity } from 'lucide-react'
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, Legend } from 'recharts'
import { ChartInsight, narrarBajasPorAnio, LABEL_STYLE } from './dashboard/biShared'
import { KpiCard } from '../../components/ui/KpiCard'
import api from '../../config/api'
import { useApiResource } from '../../hooks/useApiResource'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const CSS = `
  @keyframes abj-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes abj-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes abj-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  .abj-a1 { animation: abj-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .abj-orb-1 { animation: abj-orb-1 8s ease-in-out infinite }
  .abj-orb-2 { animation: abj-orb-2 11s ease-in-out infinite }
`

// BajaCard → KpiCard global (dark Huashu)
const BajaCard = (props) => <KpiCard {...props} tone="rose" />

export default function AnalisisBajasPage() {
  const { data: bajas, loading } = useApiResource('/admin/bajas')
  const [bajasPorAnio, setBajasPorAnio] = useState([])

  useEffect(() => {
    api.get('/admin/dashboard-bi')
      .then(r => setBajasPorAnio(r.data.bajasPorAnioDetalle || []))
      .catch(() => {})
  }, [])

  const stats = useMemo(() => {
    const total = bajas?.length || 0
    const devueltos = bajas?.filter(b => b.devolucion === 'SI').length || 0
    const cortesias = bajas?.filter(b => b.cortesia === 'SI').length || 0
    const meses = {}
    bajas?.forEach(b => { if (b.mes) meses[b.mes] = (meses[b.mes] || 0) + 1 })
    const mesMasAlto = Object.keys(meses).length ? Object.entries(meses).sort((a, b) => b[1] - a[1])[0] : null
    const anioActual = bajas?.filter(b => b.anio === 2026).length || 0
    return { total, devueltos, cortesias, mesMasAlto, anioActual }
  }, [bajas])

  const bajasPorMesCalendario = useMemo(() => {
    const counts = {}
    bajas?.forEach(b => { if (b.mes) counts[b.mes] = (counts[b.mes] || 0) + 1 })
    const max = Math.max(...Object.values(counts), 1)
    return MESES.map(m => ({ mes: m.slice(0, 3), mesNombre: m, total: counts[m] || 0, max }))
  }, [bajas])

  const bajasMensualReciente = useMemo(() => {
    const mesIdx = Object.fromEntries(MESES.map((m, i) => [m, i]))
    const map = {}
    bajas?.forEach(b => {
      const anio = Number(b.anio)
      if (!b.mes || anio < 2025) return
      const idx = mesIdx[b.mes] ?? -1
      if (idx < 0) return
      if (!map[idx]) map[idx] = { mesNum: idx, mes: MESES[idx].slice(0, 3), '2025': 0, '2026': 0 }
      map[idx][String(anio)] = (map[idx][String(anio)] || 0) + 1
    })
    return MESES.map((_, i) => map[i] || { mesNum: i, mes: MESES[i].slice(0, 3), '2025': 0, '2026': 0 })
  }, [bajas])

  const bajasPorMotivo = useMemo(() => {
    const counts = {}
    bajas?.forEach(b => {
      const m = (b.motivo || '').trim() || 'Sin especificar'
      counts[m] = (counts[m] || 0) + 1
    })
    return Object.entries(counts)
      .map(([motivo, total]) => ({ motivo: motivo.length > 30 ? motivo.slice(0, 28) + '…' : motivo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [bajas])

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mb-3" />
        <p className="text-gray-500">Cargando datos de análisis de bajas…</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 pb-12">
      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="abj-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#701a75 0%,#4c0519 100%)' }}>
        <div className="abj-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#f43f5e,transparent 70%)' }} />
        <div className="abj-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.15] pointer-events-none" style={{ background: 'radial-gradient(circle,#be123c,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/25 mb-4">
              <Activity size={12} className="text-rose-300" />
              <span className="text-rose-300 text-xs font-semibold tracking-widest uppercase">Análisis Financiero</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Análisis de Bajas
            </h1>
            <p className="text-rose-100/70 text-sm mt-2">
              Cancelaciones históricas, motivos y estacionalidad del churn
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <BajaCard icon={UserX} label="Total Bajas" value={stats.total} variant="solid" sub="Histórico completo" />
        <BajaCard icon={Calendar} label="Bajas 2026" value={stats.anioActual} variant="light" sub="Año en curso" />
        <BajaCard icon={ArrowDownCircle} label="Devueltos" value={stats.devueltos} variant="outline" sub={`${stats.total ? Math.round(stats.devueltos/stats.total*100) : 0}% del total`} />
        <BajaCard icon={Tv} label="Cortesías" value={stats.cortesias} variant="light" sub="Servicio gratuito" />
        <BajaCard icon={BarChart3} label="Mes pico" value={stats.mesMasAlto ? stats.mesMasAlto[0] : '—'} variant="solid" sub={stats.mesMasAlto ? `${stats.mesMasAlto[1]} bajas` : ''} />
      </div>

      {bajasPorAnio.length > 0 && (
        <Card className="border-rose-100 mb-6">
          <CardHeader className="border-rose-50">
            <CardTitle>Bajas — comparativo año a año</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Cancelaciones registradas por año — la otra cara de la moneda del crecimiento de la cartera</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={bajasPorAnio} margin={{ top: 22, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" opacity={0.4} />
                <XAxis dataKey="anio" tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v, name) => [v, name === 'total' ? 'Bajas' : name]}
                  labelFormatter={(v, payload) => {
                    const d = payload?.[0]?.payload
                    return d?.variacionPct != null ? `Año ${v} · ${d.variacionPct >= 0 ? '+' : ''}${d.variacionPct}% vs. año anterior` : `Año ${v}`
                  }}
                />
                <Bar dataKey="total" name="Bajas" radius={[6, 6, 0, 0]} barSize={36}>
                  {bajasPorAnio.map((_, i) => <Cell key={i} fill="#f43f5e" />)}
                  <LabelList dataKey="total" position="top" formatter={(v) => v.toLocaleString('es-CO')} style={{ ...LABEL_STYLE, fontSize: 12 }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={narrarBajasPorAnio(bajasPorAnio)} />
          </CardBody>
        </Card>
      )}

      {bajas?.length > 0 && (
        <Card className="border-rose-100 mb-6">
          <CardHeader className="border-rose-50">
            <CardTitle>Estacionalidad de bajas por mes</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Suma histórica de cancelaciones por mes del calendario · Revela cuándo se concentra el churn</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={bajasPorMesCalendario} margin={{ top: 22, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" opacity={0.4} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} width={32} />
                <Tooltip formatter={(v) => [v, 'Bajas']} />
                <Bar dataKey="total" name="Bajas" radius={[5, 5, 0, 0]} maxBarSize={44}>
                  {bajasPorMesCalendario.map((d, i) => (
                    <Cell key={i} fill={
                      d.total === d.max ? '#e11d48'
                      : d.total >= d.max * 0.7 ? '#f43f5e'
                      : d.total >= d.max * 0.4 ? '#fb923c'
                      : '#fca5a5'
                    } />
                  ))}
                  <LabelList dataKey="total" position="top"
                    style={{ fontSize: 11, fontWeight: 700, fill: '#1e293b', stroke: '#fff', strokeWidth: 3, strokeLinejoin: 'round', paintOrder: 'stroke' }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={(() => {
              const total = bajasPorMesCalendario.reduce((s, m) => s + m.total, 0)
              if (!total) return null
              const pico = bajasPorMesCalendario.reduce((a, b) => b.total > a.total ? b : a)
              const q1 = bajasPorMesCalendario.slice(0, 3).reduce((s, m) => s + m.total, 0)
              const pctQ1 = Math.round(q1 / total * 100)
              const picoIdx = bajasPorMesCalendario.findIndex(m => m.mes === pico.mes)
              return `El mes con más cancelaciones históricas es **${MESES[picoIdx]} (${pico.total} bajas)**${pico.total === 0 ? '.' : `, con ${Math.round(pico.total / total * 100)}% del total histórico. `}${pctQ1 > 35 ? `El primer trimestre (Ene–Mar) concentra el **${pctQ1}% del churn anual** — señal de estacionalidad post-renovación de año que conviene anticipar con acciones de retención en diciembre.` : 'La distribución es relativamente uniforme, sin un pico estacional dominante — el churn ocurre todo el año.'}`
            })()} />
          </CardBody>
        </Card>
      )}

      {bajas?.some(b => Number(b.anio) >= 2025) && (
        <Card className="border-rose-100 mb-6">
          <CardHeader className="border-rose-50">
            <CardTitle>Bajas mensuales — 2025 vs 2026</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Comparación mes a mes entre el año anterior y el año en curso · Detecta si el churn mejora o empeora</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={bajasMensualReciente} margin={{ top: 22, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" opacity={0.4} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} width={32} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="2025" name="2025" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={22}>
                  <LabelList dataKey="2025" position="top"
                    formatter={v => v > 0 ? v : ''}
                    style={{ fontSize: 10, fontWeight: 700, fill: '#475569' }} />
                </Bar>
                <Bar dataKey="2026" name="2026" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={22}>
                  <LabelList dataKey="2026" position="top"
                    formatter={v => v > 0 ? v : ''}
                    style={{ fontSize: 10, fontWeight: 700, fill: '#be123c' }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={(() => {
              const total25 = bajasMensualReciente.reduce((s, m) => s + (m['2025'] || 0), 0)
              const total26 = bajasMensualReciente.reduce((s, m) => s + (m['2026'] || 0), 0)
              if (!total25 && !total26) return null
              const meses26 = bajasMensualReciente.filter(m => m['2026'] > 0).length
              const ritmo = meses26 > 0 ? (total26 / meses26).toFixed(1) : 0
              const proyAnual = meses26 > 0 ? Math.round(total26 / meses26 * 12) : 0
              const varPct = total25 > 0 ? ((total26 - total25) / total25 * 100).toFixed(1) : null
              return `En **2025** se registraron **${total25} bajas** en el año completo. En lo corrido de **2026** van **${total26} bajas** (${meses26} mes${meses26 !== 1 ? 'es' : ''}, ritmo: ${ritmo}/mes → proyección anual ~${proyAnual}).${varPct ? ` Al ritmo actual el año cerraría con un **${Number(varPct) >= 0 ? '+' : ''}${varPct}% vs 2025** — ${Number(varPct) > 10 ? 'tendencia preocupante que requiere acciones de retención.' : Number(varPct) < -10 ? 'tendencia positiva, el churn está mejorando.' : 'variación dentro de rangos normales.'}` : ''}`
            })()} />
          </CardBody>
        </Card>
      )}

      {bajasPorMotivo.filter(m => m.motivo !== 'Sin especificar').length > 0 && (
        <Card className="border-rose-100 mb-6">
          <CardHeader className="border-rose-50">
            <CardTitle>Motivos de cancelación (top {bajasPorMotivo.length})</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Razones declaradas al registrar la baja · Útil para priorizar mejoras de retención</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={Math.max(200, bajasPorMotivo.length * 34)}>
              <ComposedChart layout="vertical" data={bajasPorMotivo} margin={{ top: 4, right: 48, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" opacity={0.3} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#78716c' }} allowDecimals={false} />
                <YAxis type="category" dataKey="motivo" tick={{ fontSize: 10, fill: '#4b5563' }} width={170} />
                <Tooltip formatter={(v) => [v, 'Bajas']} />
                <Bar dataKey="total" name="Bajas" radius={[0, 5, 5, 0]} maxBarSize={28}>
                  {bajasPorMotivo.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#e11d48' : i < 3 ? '#f97316' : '#fbbf24'} />
                  ))}
                  <LabelList dataKey="total" position="right"
                    style={{ fontSize: 11, fontWeight: 700, fill: '#1e293b' }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={(() => {
              const conMotivo = bajasPorMotivo.filter(m => m.motivo !== 'Sin especificar')
              if (!conMotivo.length) return null
              const total = bajasPorMotivo.reduce((s, m) => s + m.total, 0)
              const top1 = conMotivo[0]
              const top3 = conMotivo.slice(0, 3).reduce((s, m) => s + m.total, 0)
              const pct3 = Math.round(top3 / total * 100)
              return `El motivo más frecuente es **"${top1.motivo}" (${top1.total} bajas)**. Los **3 primeros motivos concentran el ${pct3}%** del total con causa declarada — atacar esas raíces es lo que más impacto tiene sobre la tasa de churn.`
            })()} />
          </CardBody>
        </Card>
      )}
    </div>
  )
}
