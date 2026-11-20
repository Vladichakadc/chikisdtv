// Gráficas del Análisis de Pagos. Todas con rótulos de datos (halo blanco
// para que se lean sobre barras y cuadrícula), barras desde 0 y pesos en
// formato colombiano. Los rótulos viajan en el propio dato (campo "rotulo").
import {
  ResponsiveContainer, ComposedChart, BarChart, LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from 'recharts'
import { HALO } from '../retencion/etiquetas'
import { COLORES_TIPO, NOMBRE_TIPO, colorMedio, fmtPesos, fmtPesosCorto, fmtCompacto, fmtPct, nombreMes } from './lecturas'
import { cn } from '../../../utils/cn'

const EJE = { fontSize: 11, fill: '#64748b' }
const GRID = <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function Vacio({ texto }) {
  return <div className="h-40 flex items-center justify-center text-sm text-slate-400 text-center px-6">{texto}</div>
}
function Caja({ active, payload, render }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-lg bg-white shadow-lg ring-1 ring-slate-200 px-3 py-2 text-xs text-slate-700 space-y-0.5">{render(payload[0].payload)}</div>
}
function RotuloDerecha({ x, y, width, height, value }) {
  if (value == null || value === '' || x == null) return null
  return <text x={x + width + 6} y={y + height / 2 + 4} fontSize={11} fontWeight={700} fill="#334155" {...HALO}>{value}</text>
}
function RotuloArriba({ x, y, width, value }) {
  if (!value || x == null) return null
  return <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#334155" {...HALO}>{value}</text>
}
function Leyenda({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-600" aria-label="Leyenda">
      {items.map(i => <li key={i.nombre} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} />{i.nombre}</li>)}
    </ul>
  )
}
function ejeY(max) {
  const pasos = [1e5, 2e5, 5e5, 1e6, 2e6, 5e6, 1e7, 2e7, 5e7, 1e8]
  const paso = pasos.find(p => max / p <= 5) || 1e8
  const tope = Math.max(paso, Math.ceil((max * 1.12) / paso) * paso)
  return { domain: [0, tope], ticks: Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso) }
}
// Eje de meses: el año aparece en el primer mes y cada vez que cambia
function TickMes({ x, y, payload, index, meses = [] }) {
  const [a, m] = String(payload.value).split('-').map(Number)
  const i = meses.indexOf(payload.value)
  const previo = i > 0 ? Number(String(meses[i - 1]).slice(0, 4)) : null
  const conAnio = index === 0 || m === 1 || (previo != null && previo !== a)
  return (
    <g transform={`translate(${x},${y + 10})`}>
      <text textAnchor="middle" fontSize={10.5} fill="#64748b">{MESES_CORTOS[m - 1]}</text>
      {conAnio && <text y={13} textAnchor="middle" fontSize={10} fontWeight={700} fill="#334155">{a}</text>}
    </g>
  )
}

// ── 1. Recaudo mes a mes por tipo de pago ───────────────────────────────────
export function EvolucionMensual({ serie, movil, compacto = movil, onMes, tiposActivos = [], onTipo }) {
  const meses = movil ? serie.slice(-12) : serie
  // Rótulos espaciados según el ancho disponible (siempre el último mes) para que no se monten
  const maxRotulos = compacto ? 6 : 24
  const paso = Math.max(1, Math.ceil(meses.length / maxRotulos))
  const filas = meses.map((m, i) => ({
    ...m,
    rotulo: m.ingresos && (i % paso === (meses.length - 1) % paso) ? `${fmtPesosCorto(m.ingresos)}${m.parcial ? '*' : ''}` : '',
  }))
  if (!filas.some(f => f.ingresos)) return <Vacio texto="Aún no hay pagos registrados en este período." />
  const tipos = ['renovacion', 'activacion', 'otros'].filter(t => filas.some(f => f[t]))
  return (
    <>
      <ResponsiveContainer width="100%" height={movil ? 260 : 320}>
        <ComposedChart data={filas} margin={{ top: 24, right: 8, left: movil ? -6 : 4, bottom: 8 }}>
          {GRID}
          <XAxis dataKey="mes" tick={<TickMes meses={filas.map(f => f.mes)} />} axisLine={false} tickLine={false} interval={Math.max(0, Math.ceil(meses.length / (compacto ? 6 : 24)) - 1)} height={34} />
          <YAxis tick={EJE} axisLine={false} tickLine={false} tickFormatter={fmtPesosCorto} width={movil ? 62 : 72} {...ejeY(Math.max(...filas.map(f => f.ingresos)))} />
          <Tooltip cursor={{ fill: '#f8fafc' }} content={<Caja render={(d) => (<>
            <p className="font-bold text-slate-900">{nombreMes(d.mes)}{d.parcial ? ' · en curso' : ''}</p>
            <p>{fmtPesos(d.ingresos)} · {d.ventas} pagos · ticket {fmtPesos(d.ticket)}</p>
            {tipos.filter(t => d[t]).map(t => <p key={t} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORES_TIPO[t] }} />{NOMBRE_TIPO[t]}: {fmtPesos(d[t])}</p>)}
          </>)} />} />
          {tipos.map(t => (
            <Bar key={t} dataKey={t} stackId="t" fill={COLORES_TIPO[t]} maxBarSize={36}
              cursor={onMes ? 'pointer' : undefined} onClick={onMes ? (e) => { const m = e?.payload?.mes ?? e?.mes; if (m) onMes(m) } : undefined}>
              {filas.map(f => <Cell key={f.mes} fillOpacity={f.parcial ? 0.45 : 1} />)}
            </Bar>
          ))}
          <Line dataKey="ingresos" stroke="none" dot={false} activeDot={false} isAnimationActive={false} legendType="none">
            <LabelList dataKey="rotulo" position="top" offset={8} fontSize={movil ? 9.5 : 10.5} fontWeight={700} fill="#334155" {...HALO} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
      {onTipo ? (
        <ul className="flex flex-wrap gap-1.5 mt-2" aria-label="Filtrar por tipo de pago">
          {[...new Set([...tipos, ...tiposActivos])].map(t => (
            <li key={t}>
              <button type="button" onClick={() => onTipo(t)} aria-pressed={tiposActivos.includes(t)}
                className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ring-1', tiposActivos.includes(t) ? 'ring-emerald-500 bg-emerald-50 font-semibold text-emerald-800' : 'ring-slate-200 text-slate-600 hover:ring-slate-300')}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORES_TIPO[t] }} />{NOMBRE_TIPO[t]}
              </button>
            </li>
          ))}
        </ul>
      ) : <Leyenda items={tipos.map(t => ({ nombre: NOMBRE_TIPO[t], color: COLORES_TIPO[t] }))} />}
      <p className="text-[11px] text-slate-400 mt-1">* Mes en curso (incompleto), en tono claro.</p>
    </>
  )
}

// ── 2. Año contra año (acumulado) ───────────────────────────────────────────
const COLORES_ANIO = ['#cbd5e1', '#64748b', '#059669']
export function AnioContraAnio({ comparativo, movil }) {
  const anios = comparativo.filter(c => c.puntos.some(p => p != null))
  if (!anios.length) return <Vacio texto="Sin datos para comparar años." />
  const filas = MESES_CORTOS.map((m, i) => Object.fromEntries([['mes', m], ...anios.map(a => [a.anio, a.puntos[i]])]))
  const colores = Object.fromEntries(anios.map((a, i) => [a.anio, COLORES_ANIO[COLORES_ANIO.length - anios.length + i]]))
  const max = Math.max(...anios.flatMap(a => a.puntos.filter(p => p != null)))
  // Rótulo al final de cada línea: año + total acumulado
  const finDe = (a) => a.puntos.reduce((u, p, i) => (p != null ? i : u), -1)
  // Con pocos meses (filtro de meses) se dibujan los puntos para que se vean
  const pocos = Math.max(...anios.map(a => a.puntos.filter(p => p != null).length)) <= 3
  return (
    <>
      <ResponsiveContainer width="100%" height={movil ? 250 : 290}>
        <LineChart data={filas} margin={{ top: 12, right: movil ? 78 : 96, left: movil ? -6 : 4, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="mes" tick={EJE} axisLine={false} tickLine={false} interval={movil ? 1 : 0} />
          <YAxis tick={EJE} axisLine={false} tickLine={false} tickFormatter={fmtPesosCorto} width={movil ? 62 : 72} {...ejeY(max)} />
          <Tooltip content={({ active, payload, label }) => (active && payload?.length ? (
            <div className="rounded-lg bg-white shadow-lg ring-1 ring-slate-200 px-3 py-2 text-xs text-slate-700">
              <p className="font-bold text-slate-900">Acumulado a {label}</p>
              {payload.filter(p => p.value != null).map(p => <p key={p.dataKey} style={{ color: colores[p.dataKey] === '#cbd5e1' ? '#64748b' : colores[p.dataKey] }}>{p.dataKey}: {fmtPesos(p.value)}</p>)}
            </div>
          ) : null)} />
          {anios.map(a => {
            const fin = finDe(a)
            return (
              <Line key={a.anio} dataKey={a.anio} stroke={colores[a.anio]} strokeWidth={a === anios.at(-1) ? 3 : 2} isAnimationActive={false}
                connectNulls dot={pocos ? { r: 4, fill: colores[a.anio], strokeWidth: 0 } : false}>
                <LabelList dataKey={a.anio} content={({ x, y, index, value }) => (index === fin && value != null ? (
                  <text x={x + 6} y={y + 4} fontSize={11} fontWeight={700} fill={colores[a.anio] === '#cbd5e1' ? '#94a3b8' : colores[a.anio]} {...HALO}>{a.anio} · {movil ? fmtCompacto(value) : fmtPesosCorto(value)}</text>
                ) : null)} />
              </Line>
            )
          })}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-slate-400 mt-1">El año en curso llega hasta el último mes cerrado.</p>
    </>
  )
}

// ── 3. Medios de pago ───────────────────────────────────────────────────────
export function MediosDePago({ medios, movil, activos = [], onElegir }) {
  const filas = medios.map((m, i) => ({ ...m, color: colorMedio(i, m.nombre), rotulo: `${fmtPesosCorto(m.ingresos)} · ${fmtPct(m.pct, m.pct < 1 ? 1 : 0)}` }))
  if (!filas.length) return <Vacio texto="Sin pagos en el período." />
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, filas.length * 36 + 30)}>
      <BarChart data={filas} layout="vertical" margin={{ top: 4, right: movil ? 92 : 110, left: 4, bottom: 4 }}>
        {GRID}
        <XAxis type="number" tick={EJE} tickFormatter={fmtPesosCorto} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="nombre" width={movil ? 84 : 110} tick={{ ...EJE, fill: '#334155' }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: '#f8fafc' }} content={<Caja render={(d) => (<>
          <p className="font-bold text-slate-900">{d.nombre}</p>
          <p>{fmtPesos(d.ingresos)} · {fmtPct(d.pct, 1)} del recaudo</p>
          <p>{d.ventas} pagos · ticket {fmtPesos(d.ticket)}</p>
        </>)} />} />
        <Bar dataKey="ingresos" radius={[0, 6, 6, 0]} maxBarSize={24} minPointSize={3}
          cursor={onElegir ? 'pointer' : undefined} onClick={onElegir ? (e) => { const n = e?.payload?.nombre ?? e?.nombre; if (n) onElegir(n) } : undefined}>
          {filas.map(f => <Cell key={f.nombre} fill={f.color} stroke={activos.includes(f.nombre) ? '#0f172a' : undefined} strokeWidth={activos.includes(f.nombre) ? 1.5 : 0} />)}
          <LabelList dataKey="rotulo" content={RotuloDerecha} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── 4. Planes ───────────────────────────────────────────────────────────────
const COLORES_PLAN = { Mensual: '#0891b2', Semestral: '#059669', Anual: '#7c3aed', Promociones: '#f97316', 'Sin plan': '#cbd5e1' }
export function MixDePlanes({ planes, movil, activos = [], onElegir }) {
  const filas = planes.map(p => ({ ...p, rotulo: `${fmtPesosCorto(p.ingresos)} · ${fmtPct(p.pct)} · ticket ${fmtPesosCorto(p.ticket)}` }))
  if (!filas.length) return <Vacio texto="Sin pagos en el período." />
  return (
    <ResponsiveContainer width="100%" height={Math.max(150, filas.length * 44 + 30)}>
      <BarChart data={filas} layout="vertical" margin={{ top: 4, right: movil ? 150 : 190, left: 4, bottom: 4 }}>
        {GRID}
        <XAxis type="number" tick={EJE} tickFormatter={fmtPesosCorto} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="nombre" width={movil ? 76 : 96} tick={{ ...EJE, fill: '#334155' }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: '#f8fafc' }} content={<Caja render={(d) => (<>
          <p className="font-bold text-slate-900">Plan {d.nombre}</p>
          <p>{fmtPesos(d.ingresos)} · {fmtPct(d.pct, 1)} del recaudo</p>
          <p>{d.ventas} pagos · ticket {fmtPesos(d.ticket)}</p>
        </>)} />} />
        <Bar dataKey="ingresos" radius={[0, 6, 6, 0]} maxBarSize={28} minPointSize={3}
          cursor={onElegir ? 'pointer' : undefined} onClick={onElegir ? (e) => { const n = e?.payload?.nombre ?? e?.nombre; if (n) onElegir(n) } : undefined}>
          {filas.map(f => <Cell key={f.nombre} fill={COLORES_PLAN[f.nombre] || '#94a3b8'} stroke={activos.includes(f.nombre) ? '#0f172a' : undefined} strokeWidth={activos.includes(f.nombre) ? 1.5 : 0} />)}
          <LabelList dataKey="rotulo" content={RotuloDerecha} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── 5. ¿Qué días del mes pagan? ─────────────────────────────────────────────
export function DiasDePago({ dias, movil }) {
  const max = Math.max(0, ...dias.map(d => d.ingresos))
  const filas = dias.map(d => ({ ...d, rotulo: d.ingresos ? `${fmtPct(d.pct)}` : '' }))
  if (!max) return <Vacio texto="Sin pagos en el período." />
  return (
    <ResponsiveContainer width="100%" height={movil ? 220 : 240}>
      <BarChart data={filas} margin={{ top: 22, right: 8, left: movil ? -6 : 4, bottom: 0 }}>
        {GRID}
        <XAxis dataKey="tramo" tick={EJE} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={EJE} axisLine={false} tickLine={false} tickFormatter={fmtPesosCorto} width={movil ? 62 : 72} {...ejeY(max)} />
        <Tooltip cursor={{ fill: '#f8fafc' }} content={<Caja render={(d) => (<>
          <p className="font-bold text-slate-900">Días {d.tramo}</p>
          <p>{fmtPesos(d.ingresos)} · {fmtPct(d.pct, 1)} del recaudo · {d.ventas} pagos</p>
        </>)} />} />
        <Bar dataKey="ingresos" radius={[6, 6, 0, 0]} maxBarSize={60}>
          {filas.map(f => <Cell key={f.tramo} fill={f.ingresos === max ? '#059669' : '#a7d8c6'} />)}
          <LabelList dataKey="rotulo" content={RotuloArriba} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── 6. Estacionalidad: mapa de calor año × mes ──────────────────────────────
export function MapaEstacionalidad({ estacionalidad, onMes }) {
  const valores = estacionalidad.flatMap(a => a.meses.filter(m => m && !m.parcial).map(m => m.ingresos))
  const max = Math.max(1, ...valores)
  if (!valores.some(Boolean)) return <Vacio texto="Sin datos." />
  const fondo = (v) => `rgba(5,150,105,${0.08 + 0.82 * (v / max)})`
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[640px] border-separate border-spacing-1 text-[11px]">
        <thead>
          <tr>
            <th className="text-left font-semibold text-slate-500 px-1">Año</th>
            {MESES_CORTOS.map(m => <th key={m} className="font-semibold text-slate-500 capitalize">{m}</th>)}
            <th className="font-semibold text-slate-500">Total</th>
          </tr>
        </thead>
        <tbody>
          {estacionalidad.map(a => (
            <tr key={a.anio}>
              <td className="font-bold text-slate-700 px-1">{a.anio}</td>
              {a.meses.map((m, i) => (
                <td key={i} title={m ? `${nombreMes(m.mes)}: ${fmtPesos(m.ingresos)}${m.parcial ? ' (en curso)' : ''}` : ''}
                  className={cn('h-9 rounded-md text-center font-semibold tabular-nums p-0', !m && 'bg-slate-50')}
                  style={m ? { background: m.parcial ? 'repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 4px,#e2e8f0 4px,#e2e8f0 8px)' : fondo(m.ingresos), color: !m.parcial && m.ingresos / max > 0.55 ? '#fff' : '#0f172a' } : undefined}>
                  {m && m.ingresos ? (onMes
                    ? <button type="button" onClick={() => onMes(m.mes)} className="w-full h-9 rounded-md hover:ring-2 hover:ring-slate-900/40 focus-visible:ring-2 focus-visible:ring-slate-900 focus:outline-none" aria-label={`Ver ${nombreMes(m.mes)}`}>{fmtCompacto(m.ingresos)}</button>
                    : fmtCompacto(m.ingresos)) : ''}
                </td>
              ))}
              <td className="text-right font-bold text-slate-800 tabular-nums px-1 whitespace-nowrap">{fmtPesosCorto(a.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-slate-400 mt-1">Más oscuro = más recaudo. M = millones, k = miles. El mes en curso aparece rayado.</p>
    </div>
  )
}

// ── 7. Concentración por cliente ────────────────────────────────────────────
export function ConcentracionClientes({ clientes, movil }) {
  const filas = clientes.top.slice(0, movil ? 10 : 15).map(c => ({ ...c, rotulo: `${fmtPesosCorto(c.ingresos)} · ${fmtPct(c.pct, 1)}` }))
  if (!filas.length) return <Vacio texto="Sin pagos en el período." />
  return (
    <ResponsiveContainer width="100%" height={filas.length * 30 + 40}>
      <BarChart data={filas} layout="vertical" margin={{ top: 4, right: movil ? 96 : 110, left: 4, bottom: 4 }}>
        {GRID}
        <XAxis type="number" tick={EJE} tickFormatter={fmtPesosCorto} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="nombre" width={movil ? 110 : 170} tick={{ ...EJE, fill: '#334155' }} axisLine={false} tickLine={false} interval={0} />
        <Tooltip cursor={{ fill: '#f8fafc' }} content={<Caja render={(d) => (<>
          <p className="font-bold text-slate-900">{d.nombre}</p>
          <p>{fmtPesos(d.ingresos)} · {d.ventas} pagos</p>
          <p>{fmtPct(d.pct, 1)} del recaudo · acumulado {fmtPct(d.pctAcum, 1)}</p>
        </>)} />} />
        <Bar dataKey="ingresos" radius={[0, 6, 6, 0]} maxBarSize={20} fill="#059669">
          <LabelList dataKey="rotulo" content={RotuloDerecha} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
