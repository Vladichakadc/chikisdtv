import { useEffect, useState, useMemo } from 'react'
import { Tv, TrendingUp, DollarSign, PieChart as PieChartIcon } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import api from '../../config/api'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { formatCurrency } from '../../utils/excelUtils'

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'from-indigo-500 to-indigo-600 text-white shadow-indigo-200',
    emerald: 'from-emerald-500 to-emerald-600 text-white shadow-emerald-200',
    orange: 'from-orange-500 to-orange-600 text-white shadow-orange-200',
    violet: 'from-violet-500 to-violet-600 text-white shadow-violet-200',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5`}>
      <div className="flex items-center gap-3">
        <div className="bg-white/20 rounded-lg p-2">
          <Icon size={18} className="text-white" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
          {label}
        </p>
      </div>
      <p className="text-3xl font-bold mt-2">{value}</p>
      {sub && <p className="text-xs mt-2 leading-relaxed text-white/70">{sub}</p>}
    </div>
  )
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#8b5cf6']

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AnalisisDispositivosPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl p-3 shadow-lg">
          <PieChartIcon size={26} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-accent">Análisis de Dispositivos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Métricas clave, evolución mensual e ingresos generados por venta de equipos físicos.
          </p>
        </div>
      </div>

      {loading && <div className="py-24 text-center text-gray-400">Cargando análisis…</div>}
      {error && <div className="bg-red-50 p-4 text-red-700 rounded-xl">{error}</div>}

      {!loading && !error && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={Tv} label="Total Dispositivos Vendidos" value={stats.total} color="indigo" sub={`${stats.activos} actualmente activos`} />
            <StatCard icon={DollarSign} label="Ingresos Totales (Histórico)" value={formatCurrency(stats.totalIngresos)} color="emerald" sub="Suma de ventas de equipos" />
            <StatCard icon={TrendingUp} label="Dispositivo más popular" value={tipoDispositivos[0]?.name || '—'} color="orange" sub={`${tipoDispositivos[0]?.value || 0} unidades vendidas`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
