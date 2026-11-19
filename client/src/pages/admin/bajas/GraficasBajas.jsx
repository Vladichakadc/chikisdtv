// Gráficas del Análisis de Bajas. Todas llevan rótulos de datos con halo
// blanco (legibles sobre barras y cuadrícula) y las barras arrancan en 0.
// Los rótulos viajan en el propio dato (campo "rotulo"): el index que entrega
// LabelList no es confiable con barras apiladas.
import {
  ResponsiveContainer, BarChart, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from 'recharts'
import { HALO } from '../retencion/etiquetas'
import { COLORES_MOTIVO, fmtPesos, fmtPesosCorto } from './lecturas'

const EJE = { fontSize: 11, fill: '#64748b' }
const GRID = <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
const nombreMes = (ym, corto = false) => {
  const [y, m] = ym.split('-').map(Number)
  const t = new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'short', ...(corto ? {} : { year: '2-digit' }) }).replace('.', '')
  return t
}
// Eje Y con marcas redondas y espacio arriba para el rótulo
function ejeY(max) {
  const paso = max > 40 ? 15 : max > 20 ? 10 : max > 8 ? 4 : 2
  const tope = Math.max(paso, Math.ceil((max * 1.12) / paso) * paso)
  return { domain: [0, tope], ticks: Array.from({ length: tope / paso + 1 }, (_, i) => i * paso) }
}
const pct0 = (v) => `${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 0 })}%`

// Eje de meses: mes arriba y el año solo en enero (o en el primer mes)
function TickMes({ x, y, payload, index }) {
  const [a, m] = String(payload.value).split('-').map(Number)
  const mes = new Date(a, m - 1, 1).toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')
  return (
    <g transform={`translate(${x},${y + 10})`}>
      <text textAnchor="middle" fontSize={10.5} fill="#64748b">{mes}</text>
      {(m === 1 || index === 0) && <text y={13} textAnchor="middle" fontSize={10} fontWeight={700} fill="#334155">{a}</text>}
    </g>
  )
}

// Rótulo a la derecha de una barra horizontal
function RotuloDerecha({ x, y, width, height, value }) {
  if (value == null || value === '' || x == null) return null
  return (
    <text x={x + width + 6} y={y + height / 2 + 4} fontSize={11} fontWeight={700} fill="#334155" {...HALO}>{value}</text>
  )
}
// Rótulo sobre una barra vertical
function RotuloArriba({ x, y, width, value }) {
  if (!value || x == null) return null
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#334155" {...HALO}>{value}</text>
  )
}

function Vacio({ texto }) {
  return <div className="h-40 flex items-center justify-center text-sm text-slate-400 text-center px-6">{texto}</div>
}

function TooltipCaja({ active, payload, render }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-lg bg-white shadow-lg ring-1 ring-slate-200 px-3 py-2 text-xs text-slate-700 space-y-0.5">{render(payload[0].payload)}</div>
}

// ── 1. Motivos de baja (ranking) ────────────────────────────────────────────
export function MotivosRanking({ categorias, movil }) {
  const filas = categorias.map(c => ({ ...c, rotulo: `${c.bajas} · ${pct0(c.pctConMotivo)}` }))
  if (!filas.length) return <Vacio texto="Aún no hay bajas con motivo en este período. Clasifícalas en el panel de arriba." />
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, filas.length * 40 + 30)}>
      <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 70, left: 4, bottom: 4 }}>
        {GRID}
        <XAxis type="number" allowDecimals={false} tick={EJE} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="nombre" width={movil ? 120 : 210} tick={{ ...EJE, fill: '#334155' }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: '#f8fafc' }} content={<TooltipCaja render={(d) => (<>
          <p className="font-bold text-slate-900">{d.nombre}</p>
          <p>{d.bajas} baja{d.bajas === 1 ? '' : 's'} · {pct0(d.pctConMotivo)} de las que tienen motivo</p>
          <p>Ingreso mensual que se fue: {fmtPesos(d.ingresoMensual)}</p>
          {d.vidaPromedio != null && <p>Estuvieron en promedio {d.vidaPromedio.toLocaleString('es-CO', { maximumFractionDigits: 1 })} meses</p>}
        </>)} />} />
        <Bar dataKey="bajas" radius={[0, 6, 6, 0]} maxBarSize={26} minPointSize={3}>
          {filas.map(f => <Cell key={f.clave} fill={COLORES_MOTIVO[f.clave] || '#94a3b8'} />)}
          <LabelList dataKey="rotulo" content={RotuloDerecha} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── 2. Ingreso mensual perdido por motivo ───────────────────────────────────
export function IngresoPorMotivo({ categorias, movil }) {
  const filas = [...categorias].filter(c => c.ingresoMensual > 0)
    .sort((a, b) => b.ingresoMensual - a.ingresoMensual)
    .map(c => ({ ...c, rotulo: fmtPesosCorto(c.ingresoMensual) }))
  if (!filas.length) return <Vacio texto="Sin ingreso perdido en el período." />
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, filas.length * 40 + 30)}>
      <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 76, left: 4, bottom: 4 }}>
        {GRID}
        <XAxis type="number" tick={EJE} tickFormatter={fmtPesosCorto} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="nombre" width={movil ? 120 : 210} tick={{ ...EJE, fill: '#334155' }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: '#f8fafc' }} content={<TooltipCaja render={(d) => (<>
          <p className="font-bold text-slate-900">{d.nombre}</p>
          <p>{fmtPesos(d.ingresoMensual)} al mes dejaron de entrar</p>
          <p>{d.pantallas} pantalla{d.pantallas === 1 ? '' : 's'}</p>
        </>)} />} />
        <Bar dataKey="ingresoMensual" radius={[0, 6, 6, 0]} maxBarSize={26} minPointSize={3}>
          {filas.map(f => <Cell key={f.clave} fill={COLORES_MOTIVO[f.clave] || '#94a3b8'} fillOpacity={f.clave === 'sin_motivo' ? 1 : 0.9} />)}
          <LabelList dataKey="rotulo" content={RotuloDerecha} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── 3. Bajas por mes, apiladas por motivo ───────────────────────────────────
export function BajasPorMes({ porMes, top, catalogo, movil }) {
  const meses = movil ? porMes.slice(-12) : porMes
  const series = [...top, 'otros', 'sin_motivo']
  const nombre = (k) => k === 'otros' ? 'Otros motivos' : k === 'sin_motivo' ? 'Sin motivo' : (catalogo.find(c => c.clave === k)?.nombre || k)
  const filas = meses.map(m => ({ ...m, rotulo: m.bajas ? String(m.bajas) : '' }))
  const maxY = Math.max(1, ...filas.map(f => f.bajas))
  if (!filas.some(f => f.bajas)) return <Vacio texto="No hubo bajas en estos meses." />
  return (
    <>
      <ResponsiveContainer width="100%" height={movil ? 250 : 290}>
        <ComposedChart data={filas} margin={{ top: 22, right: 8, left: -18, bottom: 8 }}>
          {GRID}
          <XAxis dataKey="mes" tick={<TickMes />} axisLine={false} tickLine={false} interval={movil ? 1 : 0} height={34} />
          <YAxis allowDecimals={false} tick={EJE} axisLine={false} tickLine={false} {...ejeY(maxY)} />
          <Tooltip cursor={{ fill: '#f8fafc' }} content={<TooltipCaja render={(d) => (<>
            <p className="font-bold text-slate-900">{nombreMes(d.mes)} · {d.bajas} baja{d.bajas === 1 ? '' : 's'}</p>
            {series.filter(k => d[k]).map(k => (
              <p key={k} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORES_MOTIVO[k] }} />{nombre(k)}: {d[k]}</p>
            ))}
            {d.ingresoPerdido > 0 && <p className="pt-1 text-slate-500">Ingreso mensual perdido: {fmtPesos(d.ingresoPerdido)}</p>}
          </>)} />} />
          {series.map(k => (
            <Bar key={k} dataKey={k} stackId="m" fill={COLORES_MOTIVO[k]} maxBarSize={34} />
          ))}
          {/* Total del mes sobre la pila (línea invisible que solo lleva el rótulo) */}
          <Line dataKey="bajas" stroke="none" dot={false} activeDot={false} isAnimationActive={false} legendType="none">
            <LabelList dataKey="rotulo" position="top" offset={8} fontSize={11} fontWeight={700} fill="#334155" {...HALO} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-600" aria-label="Leyenda">
        {series.map(k => (
          <li key={k} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORES_MOTIVO[k] }} />{nombre(k)}</li>
        ))}
      </ul>
    </>
  )
}

const TRAMO_CORTO = {
  'Menos de 1 mes': '<1 m', '1 a 3 meses': '1–3 m', '3 a 6 meses': '3–6 m',
  '6 a 12 meses': '6–12 m', '1 a 2 años': '1–2 a', 'Más de 2 años': '>2 a',
}

// ── 4. Cuánto tiempo estuvieron antes de irse ───────────────────────────────
export function VidaAntesDeLaBaja({ vida, movil }) {
  const filas = vida.map(v => ({ ...v, rotulo: v.bajas ? `${v.bajas} · ${pct0(v.pct)}` : '' }))
  if (!filas.some(f => f.bajas)) return <Vacio texto="Sin datos de permanencia." />
  const max = Math.max(...filas.map(f => f.bajas))
  const maxY = max
  return (
    <ResponsiveContainer width="100%" height={movil ? 230 : 250}>
      <BarChart data={filas} margin={{ top: 22, right: 8, left: -18, bottom: 0 }}>
        {GRID}
        <XAxis dataKey="tramo" tick={EJE} axisLine={false} tickLine={false} interval={0}
          tickFormatter={(t) => (movil ? (TRAMO_CORTO[t] || t) : t)} />
        <YAxis allowDecimals={false} tick={EJE} axisLine={false} tickLine={false} {...ejeY(maxY)} />
        <Tooltip cursor={{ fill: '#f8fafc' }} content={<TooltipCaja render={(d) => (<>
          <p className="font-bold text-slate-900">{d.tramo}</p>
          <p>{d.bajas} baja{d.bajas === 1 ? '' : 's'} ({pct0(d.pct)} de las que tienen fecha de activación)</p>
        </>)} />} />
        <Bar dataKey="bajas" radius={[6, 6, 0, 0]} maxBarSize={56}>
          {filas.map((f, i) => <Cell key={f.tramo} fill={i < 3 ? '#e11d48' : f.bajas === max ? '#475569' : '#94a3b8'} />)}
          <LabelList dataKey="rotulo" content={RotuloArriba} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── 5. Motivo según el plan (100 %) ─────────────────────────────────────────
export function MotivoSegunPlan({ porPlan, catalogo, movil }) {
  const claves = catalogo.map(c => c.clave).filter(k => k !== 'cambio_cuenta')
  const planes = porPlan.filter(p => p.conMotivo > 0)
  if (!planes.length) return <Vacio texto="Aún no hay suficientes bajas con motivo para comparar por plan." />
  const usados = claves.filter(k => planes.some(p => p[k] > 0))
  const filas = planes.map(p => {
    const f = { plan: p.plan.replace(/^Plan\s+/i, ''), conMotivo: p.conMotivo, bajas: p.bajas }
    for (const k of usados) {
      const v = p.conMotivo ? (p[k] / p.conMotivo) * 100 : 0
      f[k] = v
      f[`r_${k}`] = v >= 14 ? pct0(v) : ''
    }
    f.rotuloPlan = `${f.plan} (${p.conMotivo})`
    return f
  })
  const nombre = (k) => catalogo.find(c => c.clave === k)?.nombre || k
  return (
    <>
      <ResponsiveContainer width="100%" height={filas.length * 52 + 40}>
        <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }} stackOffset="expand">
          <XAxis type="number" tick={EJE} tickFormatter={(v) => pct0(v * 100)} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="rotuloPlan" width={movil ? 92 : 130} tick={{ ...EJE, fill: '#334155' }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: '#f8fafc' }} content={<TooltipCaja render={(d) => (<>
            <p className="font-bold text-slate-900">Plan {d.plan}</p>
            <p className="text-slate-500">{d.conMotivo} de {d.bajas} bajas con motivo</p>
            {usados.filter(k => d[k] > 0).map(k => <p key={k} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORES_MOTIVO[k] }} />{nombre(k)}: {pct0(d[k])}</p>)}
          </>)} />} />
          {usados.map(k => (
            <Bar key={k} dataKey={k} stackId="p" fill={COLORES_MOTIVO[k]} maxBarSize={30}>
              <LabelList dataKey={`r_${k}`} position="center" fill="#fff" fontSize={11} fontWeight={700} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-600" aria-label="Leyenda">
        {usados.map(k => <li key={k} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORES_MOTIVO[k] }} />{nombre(k)}</li>)}
      </ul>
    </>
  )
}

// ── 6. ¿Volvieron? Recuperación por motivo ──────────────────────────────────
export function RecuperacionPorMotivo({ categorias, movil }) {
  const filas = categorias.filter(c => c.bajas > 0)
    .map(c => ({ ...c, rotulo: `${pct0(c.pctRecuperados)} (${c.recuperados}/${c.bajas})` }))
    .sort((a, b) => b.pctRecuperados - a.pctRecuperados)
  if (!filas.length) return <Vacio texto="Sin bajas en el período." />
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, filas.length * 38 + 30)}>
      <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 92, left: 4, bottom: 4 }}>
        {GRID}
        <XAxis type="number" domain={[0, 100]} tick={EJE} tickFormatter={pct0} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="nombre" width={movil ? 120 : 210} tick={{ ...EJE, fill: '#334155' }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: '#f8fafc' }} content={<TooltipCaja render={(d) => (<>
          <p className="font-bold text-slate-900">{d.nombre}</p>
          <p>{d.recuperados} de {d.bajas} volvieron a comprar después de la baja</p>
        </>)} />} />
        <Bar dataKey="pctRecuperados" radius={[0, 6, 6, 0]} maxBarSize={24} fill="#16a34a" minPointSize={3}>
          {filas.map(f => <Cell key={f.clave} fill={f.clave === 'sin_motivo' ? '#cbd5e1' : '#16a34a'} />)}
          <LabelList dataKey="rotulo" content={RotuloDerecha} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
