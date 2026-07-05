import { useEffect, useState, useMemo } from 'react'
import { Tv, TrendingUp, DollarSign, PieChart as PieChartIcon, Lightbulb } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import api from '../../config/api'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { KpiCard } from '../../components/ui/KpiCard'
import { formatCurrency } from '../../utils/excelUtils'
import { cn } from '../../utils/cn'

const CSS = `
  @keyframes disp-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes disp-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes disp-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  .disp-a1 { animation: disp-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .disp-a2 { animation: disp-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .disp-a3 { animation: disp-fade-up .45s cubic-bezier(.22,1,.36,1) .12s both }
  .disp-orb-1 { animation: disp-orb-1 8s ease-in-out infinite }
  .disp-orb-2 { animation: disp-orb-2 11s ease-in-out infinite }
  .disp-kpi { transition: transform .25s ease, box-shadow .25s ease }
  .disp-kpi:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.12) }
  @media (prefers-reduced-motion: reduce) {
    .disp-a1, .disp-a2, .disp-a3, .disp-orb-1, .disp-orb-2 { animation: none !important; transition: none !important }
  }
`

// ─── Helpers de UI ────────────────────────────────────────────────────────────

// StatCard → KpiCard global (dark Huashu)
// color prop: indigo | emerald | orange | violet → mapped to tone
const COLOR_TO_TONE = { indigo: 'indigo', emerald: 'emerald', orange: 'orange', violet: 'purple' }
const StatCard = ({ color = 'indigo', ...props }) =>
  <KpiCard {...props} tone={COLOR_TO_TONE[color] || 'indigo'} />

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#8b5cf6']

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AnalisisDispositivosPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [explain, setExplain] = useState(null)

  useEffect(() => {
    api.get('/admin/payments/ventas-equipos')
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el análisis.'))
      .finally(() => setLoading(false))
  }, [])

  const { stats, ventasMes, ingresosMes, tipoDispositivos } = useMemo(() => {
    if (!data.length) return { stats: {}, ventasMes: [], ingresosMes: [], tipoDispositivos: [] }

    let totalIngresos = 0
    let activos = 0
    
    // Agrupaciones
    const porMes = {}
    const porMesIngresos = {}
    const porTipo = {}

    data.forEach(v => {
      const p = Number(v.precioVenta) || 0
      totalIngresos += p
      if (v.estado === 'Activo') activos++

      // Ventas y ingresos por mes
      if (v.anio && v.mes) {
        const key = `${v.mes.substring(0, 3)} ${v.anio}`
        porMes[key] = (porMes[key] || 0) + 1
        porMesIngresos[key] = (porMesIngresos[key] || 0) + p
      }

      // Por tipo
      const t = v.tipoFire || 'No especificado'
      porTipo[t] = (porTipo[t] || 0) + 1
    })

    const ventasMesArr = Object.keys(porMes).map(k => ({ name: k, Ventas: porMes[k] }))
    const ingresosMesArr = Object.keys(porMesIngresos).map(k => ({ name: k, Ingresos: porMesIngresos[k] }))
    const tipoArr = Object.keys(porTipo).map(k => ({ name: k, value: porTipo[k] })).sort((a,b) => b.value - a.value)

    return {
      stats: { total: data.length, activos, totalIngresos },
      ventasMes: ventasMesArr.reverse(), // Asumiendo orden desc en BD, queremos asc temporal
      ingresosMes: ingresosMesArr.reverse(),
      tipoDispositivos: tipoArr
    }
  }, [data])

  return (
    <div className="p-6 space-y-6">
      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="disp-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)' }}>
        <div className="disp-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.25] pointer-events-none" style={{ background: 'radial-gradient(circle,#8b5cf6,transparent 70%)' }} />
        <div className="disp-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/25 mb-4">
              <PieChartIcon size={12} className="text-indigo-300" />
              <span className="text-indigo-300 text-xs font-semibold tracking-widest uppercase">Análisis</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Análisis de Dispositivos
            </h1>
            <p className="text-indigo-100/70 text-sm mt-2 max-w-xl">
              Métricas clave, evolución mensual e ingresos generados por venta de equipos físicos.
            </p>
          </div>
        </div>
      </div>

      {loading && <div className="py-24 text-center text-gray-400">Cargando análisis…</div>}
      {error && <div className="bg-red-50 p-4 text-red-700 rounded-xl">{error}</div>}

      {!loading && !error && (
        <>
          <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 disp-a2">
            <StatCard icon={Tv} label="Total Dispositivos Vendidos" value={stats.total} color="indigo" sub={`${stats.activos} actualmente activos`}
              onClick={() => setExplain({
                title: 'Total Dispositivos Vendidos', value: stats.total, icon: Tv,
                queEs: 'Cuántos equipos físicos se han vendido en toda la historia, y cuántos siguen activos con clientes.',
                comoSeCalcula: 'Conteo de los registros de ventas de equipos. "Activos" cuenta los que tienen **Estado = Activo**. Coincide con "Total Equipos" del módulo Venta Dispositivos.',
                origen: 'Tabla de ventas de equipos (módulo **Venta Dispositivos**).',
              })} />
            <StatCard icon={DollarSign} label="Ingresos Totales (Histórico)" value={formatCurrency(stats.totalIngresos)} color="emerald" sub="Suma de ventas de equipos"
              onClick={() => setExplain({
                title: 'Ingresos Totales (Histórico)', value: formatCurrency(stats.totalIngresos), icon: DollarSign,
                queEs: 'Todo el dinero recaudado por venta de hardware — la línea de ingreso complementaria a las licencias.',
                comoSeCalcula: 'Se **suma el precio de venta** de todos los equipos. Es la misma cifra de "Ingresos Equipos" en Venta Dispositivos y de la línea de equipos en Análisis Financiero — todo sale de la misma tabla.',
                origen: 'Campo precio de venta de las ventas de equipos.',
              })} />
            <StatCard icon={TrendingUp} label="Dispositivo más popular" value={tipoDispositivos[0]?.name || '—'} color="orange" sub={`${tipoDispositivos[0]?.value || 0} unidades vendidas`}
              onClick={() => setExplain({
                title: 'Dispositivo más popular', value: tipoDispositivos[0]?.name || '—', icon: TrendingUp,
                queEs: 'El tipo de equipo que más se ha vendido — la referencia que conviene mantener en inventario.',
                comoSeCalcula: 'Se agrupan las ventas por **tipo de dispositivo** y se toma el de mayor conteo. El desglose completo está en la dona de abajo.',
                origen: 'Campo tipo de dispositivo de las ventas de equipos.',
              })} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 disp-a3">
            {/* Ventas por mes */}
            <Card className="border-indigo-100">
              <CardHeader className="border-indigo-50">
                <CardTitle>Unidades vendidas por mes</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ventasMes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="Ventas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

            {/* Ingresos por mes */}
            <Card className="border-emerald-100">
              <CardHeader className="border-emerald-50">
                <CardTitle>Evolución de ingresos (Dispositivos)</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ingresosMes} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <YAxis tickFormatter={v => `$${v/1000}k`} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <RechartsTooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

            {/* Distribución por tipo */}
            <Card className="border-orange-100 lg:col-span-2">
              <CardHeader className="border-orange-50">
                <CardTitle>Distribución por Tipo de Dispositivo</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col md:flex-row items-center">
                <div className="h-80 w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={tipoDispositivos} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                        {tipoDispositivos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 p-4">
                  <h4 className="font-semibold text-gray-700 mb-4">Top Dispositivos</h4>
                  <div className="space-y-3">
                    {tipoDispositivos.slice(0, 5).map((t, i) => (
                      <div key={t.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-medium text-gray-600">{t.name}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-800">{t.value} uds. ({(t.value/stats.total*100).toFixed(1)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
