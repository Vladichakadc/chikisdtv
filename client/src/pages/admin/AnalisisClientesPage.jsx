import { useState, useMemo, useEffect } from 'react'
import {
  Users, Globe, UserCheck, Repeat, Activity
} from 'lucide-react'
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts'
import { ChartInsight, narrarGeografia, LABEL_STYLE, PIE_COLORS } from './dashboard/biShared'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import api from '../../config/api'

const CSS = `
  @keyframes cl-fade-up  { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes cl-orb-1    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes cl-orb-2    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  .cl-a1 { animation: cl-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .cl-orb-1 { animation: cl-orb-1 8s ease-in-out infinite }
  .cl-orb-2 { animation: cl-orb-2 11s ease-in-out infinite }
  
  .cl-kpi { transition: transform .25s ease, box-shadow .25s ease }
  .cl-kpi:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.12) }
  .cl-kpi.clickable { cursor: pointer }
`

function KpiCard({ icon: Icon, label, value, loading, gradFrom, gradTo, delay = 0, onClick, sub }) {
  return (
    <div
      onClick={onClick}
      className={`cl-kpi relative bg-white rounded-2xl p-5 overflow-hidden border border-slate-100 shadow-sm flex flex-col justify-between ${onClick ? 'clickable' : ''}`}
      style={{ animation: `cl-fade-up .4s cubic-bezier(.22,1,.36,1) ${delay * 0.06}s both` }}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Icon size={80} style={{ color: gradFrom }} />
      </div>
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
             style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}>
          <Icon size={20} />
        </div>
        {onClick && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-slate-50 px-2 py-1 rounded-md">
            Info
          </span>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-1">{label}</p>
        <p className="text-3xl font-extrabold text-slate-800 tabular-nums leading-none">
          {loading ? <span className="inline-block w-16 h-8 rounded-md cl-skeleton" /> : value}
        </p>
        {sub && <p className="text-[11px] font-medium text-slate-400 mt-2">{sub}</p>}
      </div>
    </div>
  )
}

export default function AnalisisClientesPage() {
  const [rows, setRows] = useState([])
  const [paisesClientes, setPaisesClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [explain, setExplain] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [resClientes, resBi] = await Promise.all([
          api.get('/admin/clients/tabla-clientes'),
          api.get('/admin/dashboard-bi')
        ])
        setRows(resClientes.data || [])
        setPaisesClientes(resBi.data.paisesClientes || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const stats = useMemo(() => ({
    total:        rows.length,
    finales:      rows.filter(r => r.tipoCliente === 'Final').length,
    revendedores: rows.filter(r => r.tipoCliente === 'Revendedor').length,
    paises:       new Set(rows.map(r => r.pais).filter(Boolean)).size,
  }), [rows])

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mb-3" />
        <p className="text-gray-500">Cargando datos de clientes…</p>
      </div>
    )
  }

  if (error) {
    return <p className="p-8 text-center text-red-500">{error}</p>
  }

  return (
    <div className="p-6 space-y-6 pb-12">
      <style>{CSS}</style>
      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

      {/* ── HERO HEADER ── */}
      <div className="cl-a1 relative rounded-3xl overflow-hidden mb-6"
           style={{ background: 'linear-gradient(135deg,#064e3b 0%,#022c22 100%)' }}>
        <div className="cl-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.15] pointer-events-none"
             style={{ background: 'radial-gradient(circle,#14b8a6,transparent 70%)' }} />
        <div className="cl-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.10] pointer-events-none"
             style={{ background: 'radial-gradient(circle,#0ea5e9,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none"
             style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/25 mb-4">
              <Activity size={12} className="text-teal-400" />
              <span className="text-teal-400 text-xs font-semibold tracking-widest uppercase">Análisis Demográfico</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight"
                style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Análisis de Clientes
            </h1>
            <p className="text-teal-100/70 text-sm mt-2">
              Distribución y estadísticas de la base de usuarios
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users}     label="Total Clientes"   value={stats.total.toLocaleString()}        loading={loading} gradFrom="#14b8a6" gradTo="#2dd4bf" delay={2} sub="Histórico completo"
          onClick={() => setExplain({
            title: 'Total Clientes', value: stats.total.toLocaleString(), icon: Users,
            queEs: 'Cuántos clientes hay registrados en la tabla de clientes.',
            comoSeCalcula: 'Conteo simple de las filas. Ojo: "Clientes Activos" en el Dashboard usa otra fuente.',
            origen: 'Tabla de clientes.',
          })} />
        <KpiCard icon={UserCheck} label="Clientes Finales" value={stats.finales.toLocaleString()}      loading={loading} gradFrom="#10b981" gradTo="#34d399" delay={3} sub="Usuarios directos"
          onClick={() => setExplain({
            title: 'Clientes Finales', value: stats.finales.toLocaleString(), icon: UserCheck,
            queEs: 'Clientes que consumen el servicio directamente (mayor margen).',
            comoSeCalcula: 'Registros con Tipo Cliente = Final.',
            origen: 'Tabla de clientes.',
          })} />
        <KpiCard icon={Repeat}    label="Revendedores"     value={stats.revendedores.toLocaleString()} loading={loading} gradFrom="#f59e0b" gradTo="#fbbf24" delay={4} sub="Canal de reventa"
          onClick={() => setExplain({
            title: 'Revendedores', value: stats.revendedores.toLocaleString(), icon: Repeat,
            queEs: 'Clientes que compran para revender a terceros.',
            comoSeCalcula: 'Registros con Tipo Cliente = Revendedor.',
            origen: 'Tabla de clientes.',
          })} />
        <KpiCard icon={Globe}     label="Países"           value={stats.paises.toLocaleString()}       loading={loading} gradFrom="#0ea5e9" gradTo="#38bdf8" delay={5} sub="Cobertura global"
          onClick={() => setExplain({
            title: 'Países', value: stats.paises.toLocaleString(), icon: Globe,
            queEs: 'En cuántos países distintos hay clientes registrados.',
            comoSeCalcula: 'Valores únicos del campo País.',
            origen: 'Tabla de clientes.',
          })} />
      </div>

      {/* ── CHART GEOGRAFIA ── */}
      {paisesClientes.length > 0 && (
        <div className="cl-a1 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 overflow-hidden">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Distribución geográfica</h3>
          <p className="text-xs text-slate-400 mb-6">Países con más clientes registrados</p>

          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={paisesClientes} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="pais" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} width={90} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, name, p) => [`${v} clientes (${p.payload.pct}%)`, 'Cantidad']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="cantidad" name="Clientes" radius={[0, 6, 6, 0]} barSize={24}>
                {paisesClientes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                <LabelList dataKey="cantidad" position="right" formatter={(v) => v.toLocaleString('es-CO')} style={{ ...LABEL_STYLE, fontSize: 11, fill: '#64748b' }} />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <ChartInsight text={narrarGeografia(paisesClientes)} />
          </div>
        </div>
      )}
    </div>
  )
}
