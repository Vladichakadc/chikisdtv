import { useState, useMemo, useEffect } from 'react'
import { Package, TrendingUp, CheckCircle, Wallet, Activity } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LabelList } from 'recharts'
import { formatCurrency } from '../../utils/excelUtils'
import api from '../../config/api'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'

const REF_COLORS = ['#f97316', '#0ea5e9', '#16a34a', '#8b5cf6', '#ef4444', '#eab308', '#14b8a6', '#64748b']

const fmtPesos = (v) => `$${Number(v || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
const fmtEjePesos = (v) => v >= 1_000_000 ? `$${(v / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M` : `$${Math.round(v / 1000)}K`

const CSS = `
  @keyframes iv-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes iv-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes iv-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  .iv-a1 { animation: iv-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .iv-orb-1 { animation: iv-orb-1 8s ease-in-out infinite }
  .iv-orb-2 { animation: iv-orb-2 11s ease-in-out infinite }
`

function DeviceCard({ icon: Icon, label, value, sub, variant }) {
  const isSolid = variant === 'solid'
  const isOutline = variant === 'outline'
  
  const containerClass = `relative bg-white rounded-2xl overflow-hidden select-none transition-all duration-300
    ${isSolid ? 'shadow-md border border-slate-100' : isOutline ? 'bg-indigo-50 border border-indigo-200' : 'border border-slate-200 shadow-sm'}
    hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50`

  const topBorder = isSolid 
    ? 'linear-gradient(90deg, #6366f1, #4f46e5)'
    : 'linear-gradient(90deg, #818cf880, #6366f180)'

  return (
    <div className={containerClass}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: topBorder }} />
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[10px] font-bold tracking-[.14em] uppercase mb-1 ${isOutline ? 'text-indigo-600' : 'text-slate-400'}`}>
            {label}
          </p>
          <p className="text-3xl font-extrabold text-slate-800 tabular-nums leading-none mt-1">
            {value}
          </p>
          {sub && (
            <p className={`text-xs mt-2 font-medium ${isOutline ? 'text-indigo-600' : 'text-slate-500'}`}>
              {sub}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${isSolid ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-50 text-indigo-600'}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

export default function AnalisisInventarioPage() {
  const [inventario, setInventario] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/admin/inventario-equipos')
      .then(r => setInventario(r.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const invStats = useMemo(() => {
    let unidades = 0; let enBodega = 0; let vendidos = 0; let inversion = 0; let gananciaPotencial = 0
    for (const r of inventario) {
      unidades += Number(r.cantidad) || 0
      inversion += Number(r.costoTotalCOP) || 0
      gananciaPotencial += Number(r.ganancia) || 0
      const e = (r.estado || '').trim()
      if (e === 'En Bodega') enBodega += Number(r.cantidad) || 0
      if (e === 'Vendido') vendidos += Number(r.cantidad) || 0
    }
    return { unidades, enBodega, vendidos, inversion, gananciaPotencial }
  }, [inventario])

  const porReferencia = useMemo(() => {
    const acc = {}
    for (const r of inventario) {
      const ref = (r.descripcion || 'Sin referencia').trim()
      if (!acc[ref]) acc[ref] = { referencia: ref, unidades: 0, inversion: 0, ganancia: 0, margenSum: 0, margenN: 0 }
      acc[ref].unidades += Number(r.cantidad) || 0
      acc[ref].inversion += Number(r.costoTotalCOP) || 0
      acc[ref].ganancia += Number(r.ganancia) || 0
      if (r.utilidadPct != null) { acc[ref].margenSum += Number(r.utilidadPct); acc[ref].margenN += 1 }
    }
    return Object.values(acc)
      .map(x => ({ ...x, margenPct: x.margenN > 0 ? Number((x.margenSum / x.margenN).toFixed(1)) : 0 }))
      .sort((a, b) => b.inversion - a.inversion)
  }, [inventario])

  const refColor = useMemo(() => {
    const map = {}
    porReferencia.forEach((r, i) => { map[r.referencia] = REF_COLORS[i % REF_COLORS.length] })
    return map
  }, [porReferencia])

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3" />
        <p className="text-gray-500">Cargando datos de inventario…</p>
      </div>
    )
  }

  if (error) {
    return <p className="p-8 text-center text-red-500">{error}</p>
  }

  return (
    <div className="p-6 space-y-6 pb-12">
      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="iv-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#0f172a 100%)' }}>
        <div className="iv-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.25] pointer-events-none" style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)' }} />
        <div className="iv-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#818cf8,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/25 mb-4">
              <Activity size={12} className="text-indigo-300" />
              <span className="text-indigo-300 text-xs font-semibold tracking-widest uppercase">Análisis Financiero</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Análisis de Inventario
            </h1>
            <p className="text-indigo-100/70 text-sm mt-2">
              Inversión, ganancias potenciales y métricas de utilidad del stock físico
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <DeviceCard icon={Package} label="Unidades" value={invStats.unidades} variant="solid" sub={`${porReferencia.length} referencias del lote 2026`} />
        <DeviceCard icon={CheckCircle} label="En Bodega" value={invStats.enBodega} variant="light" sub={`${invStats.vendidos} vendidas`} />
        <DeviceCard icon={Wallet} label="Inversión Total" value={formatCurrency(invStats.inversion)} variant="outline" sub="Costo total COP del lote" />
        <DeviceCard icon={TrendingUp} label="Ganancia Potencial" value={formatCurrency(invStats.gananciaPotencial)} variant="light" sub="A precio sugerido" />
      </div>

      {porReferencia.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Inversión y ganancia potencial por referencia</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Pesos COP del lote 2026 — costo de compra vs. utilidad esperada a precio sugerido</p>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={Math.max(220, porReferencia.length * 52)}>
                <BarChart data={porReferencia} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtEjePesos} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 'auto']} />
                  <YAxis type="category" dataKey="referencia" width={118} tick={{ fontSize: 11, fill: '#334155' }} />
                  <Tooltip
                    formatter={(v, name) => [fmtPesos(v), name]}
                    labelStyle={{ fontWeight: 600, color: '#1e293b' }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="inversion" name="Inversión" fill="#334155" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="ganancia" name="Ganancia potencial" fill="#16a34a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Margen de utilidad por referencia</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Utilidad promedio sobre el costo (%) — identifica qué referencia conviene priorizar</p>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={Math.max(220, porReferencia.length * 52)}>
                <BarChart data={[...porReferencia].sort((a, b) => b.margenPct - a.margenPct)} layout="vertical" margin={{ top: 0, right: 44, left: 8, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 'auto']} />
                  <YAxis type="category" dataKey="referencia" width={118} tick={{ fontSize: 11, fill: '#334155' }} />
                  <Tooltip
                    formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Margen promedio']}
                    labelStyle={{ fontWeight: 600, color: '#1e293b' }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="margenPct" name="Margen %" radius={[0, 4, 4, 0]}>
                    {[...porReferencia].sort((a, b) => b.margenPct - a.margenPct).map((r) => (
                      <Cell key={r.referencia} fill={refColor[r.referencia]} />
                    ))}
                    <LabelList dataKey="margenPct" position="right" formatter={(v) => `${Number(v).toFixed(1)}%`} style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
