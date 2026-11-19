import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, LineChart, BarChart, Bar, Line, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine, LabelList,
} from 'recharts'
import { cn } from '../../../utils/cn'
import { HALO, etiquetaEnIndices, fmtCorto, separarEtiquetas, ultimoConDato } from './etiquetas'

// Gráficas complementarias del Análisis de Retención. Colores fijos por
// significado: verde = llegan / siguen, rojo = se van, tinta = base de clientes.

const VERDE = '#059669'
const ROJO = '#dc2626'
const TINTA = '#1e2563'
const fmtPct = (v) => (v == null ? '—' : `${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`)
const etiquetaMes = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }).replace('.', '')
}
const ejeIzq = (esMovil) => ({ tick: { fontSize: 11, fill: '#64748b' }, width: esMovil ? 40 : 42 })

function Tarjeta({ titulo, bajada, acciones, children, className }) {
  return (
    <section className={cn('rounded-[24px] bg-white ring-1 ring-slate-200/80 p-4 sm:p-6 min-w-0', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="dash-num text-[22px] sm:text-[24px] font-bold text-slate-900 leading-tight">{titulo}</h2>
          {bajada && <p className="dash-txt text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">{bajada}</p>}
        </div>
        {acciones}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Selector({ opciones, valor, onCambio }) {
  return (
    <div className="dash-txt inline-flex rounded-xl bg-slate-100 p-1 text-[13px] font-semibold" role="group">
      {opciones.map(o => (
        <button key={o.valor} type="button" onClick={() => onCambio(o.valor)} aria-pressed={valor === o.valor}
          className={cn('min-h-[34px] px-3 rounded-lg transition-colors', valor === o.valor ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}

// ─── 1. Llegan y se van cada mes ─────────────────────────────────────────────
export function MovimientoMensual({ movimientos = [], esMovil }) {
  const [rango, setRango] = useState(12)
  const datos = useMemo(() => {
    const lista = rango === 'todo' ? movimientos : movimientos.slice(-rango)
    return lista.map(m => ({ ...m, salida: -m.seVan, etiqueta: etiquetaMes(m.mes) }))
  }, [movimientos, rango])
  const totales = datos.reduce((t, m) => ({ llegan: t.llegan + m.llegan, seVan: t.seVan + m.seVan }), { llegan: 0, seVan: 0 })
  const neto = totales.llegan - totales.seVan
  const etiquetaRango = rango === 'todo' ? 'desde el inicio' : `en los últimos ${rango} meses`
  // Con muchas barras las cifras se montan: solo se etiquetan hasta 12 (móvil) o 24 meses
  const conCifras = datos.length <= (esMovil ? 12 : 24)
  const cifra = (color, abajo) => function Cifra({ x, y, width, height, value }) {
    const v = Math.abs(value || 0)
    if (!v || x == null) return null
    const arriba = Math.min(y, y + height), fondo = Math.max(y, y + height)
    const alto = fondo - arriba
    const fs = esMovil ? 9 : 10
    // Barras altas: la cifra va dentro, en blanco; barras bajas: fuera de la barra
    if (alto > 22) {
      const yy = abajo ? fondo - 6 : arriba + 13
      return <text x={x + width / 2} y={yy} textAnchor="middle" fontSize={fs} fontWeight={700} fill="#fff">{v}</text>
    }
    const yy = abajo ? fondo + 11 : arriba - 4
    return <text x={x + width / 2} y={yy} textAnchor="middle" fontSize={fs} fontWeight={700} fill={color} {...HALO}>{v}</text>
  }
  return (
    <Tarjeta
      titulo="Clientes que llegan y que se van cada mes"
      bajada="Barras verdes: clientes nuevos (primera activación). Barras rojas: clientes cuyo último plan terminó y no renovaron. La línea es cuántos clientes tenían servicio al cierre de cada mes."
      acciones={<Selector valor={rango} onCambio={setRango} opciones={[{ valor: 12, etiqueta: '12 meses' }, { valor: 24, etiqueta: '24 meses' }, { valor: 'todo', etiqueta: 'Todo' }]} />}
    >
      <p className="dash-txt text-[15px] text-slate-700 mb-3">
        {etiquetaRango.charAt(0).toUpperCase() + etiquetaRango.slice(1)} llegaron <strong className="text-emerald-700">{totales.llegan}</strong> y se fueron <strong className="text-red-700">{totales.seVan}</strong>:
        la base {neto >= 0 ? 'creció' : 'se redujo'} en <strong className={neto >= 0 ? 'text-emerald-700' : 'text-red-700'}>{Math.abs(neto)}</strong> {Math.abs(neto) === 1 ? 'cliente' : 'clientes'}.
      </p>
      <ResponsiveContainer width="100%" height={esMovil ? 250 : 300}>
        <ComposedChart data={datos} margin={{ top: 22, right: esMovil ? 26 : 34, left: 0, bottom: 6 }} stackOffset="sign">
          <CartesianGrid stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="etiqueta" tick={{ fontSize: 10, fill: '#64748b' }} interval={esMovil ? 'preserveStartEnd' : 0} minTickGap={esMovil ? 20 : 2} />
          <YAxis yAxisId="mov" {...ejeIzq(esMovil)} allowDecimals={false} tickFormatter={(v) => Math.abs(v)} />
          <YAxis yAxisId="base" orientation="right" tick={{ fontSize: 11, fill: TINTA }} width={esMovil ? 30 : 40} allowDecimals={false} hide={esMovil} />
          <ReferenceLine yAxisId="mov" y={0} stroke="#94a3b8" />
          <Tooltip
            formatter={(v, name) => [name === 'Se van' ? Math.abs(v) : v, name]}
            labelFormatter={(l, p) => (p?.[0]?.payload ? `${l} · neto ${p[0].payload.neto >= 0 ? '+' : ''}${p[0].payload.neto}` : l)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="mov" dataKey="llegan" name="Llegan" stackId="m" fill={VERDE} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false}>
            {conCifras && <LabelList dataKey="llegan" content={cifra('#047857', false)} />}
          </Bar>
          <Bar yAxisId="mov" dataKey="salida" name="Se van" stackId="m" fill={ROJO} radius={[0, 0, 4, 4]} maxBarSize={26} isAnimationActive={false}>
            {conCifras && <LabelList dataKey="salida" content={cifra('#b91c1c', true)} />}
          </Bar>
          <Line yAxisId="base" type="monotone" dataKey="conServicio" name="Con servicio" stroke={TINTA} strokeWidth={2.5} isAnimationActive={false}
            dot={({ cx, cy, index }) => (index === 0 || index === datos.length - 1 ? <circle key={index} cx={cx} cy={cy} r={3.5} fill={TINTA} stroke="#fff" strokeWidth={1.5} /> : <g key={index} />)}
            label={etiquetaEnIndices([0, datos.length - 1], TINTA, { dy: -9, formato: (v) => String(v) })} />
        </ComposedChart>
      </ResponsiveContainer>
    </Tarjeta>
  )
}

// ─── 2. ¿Los clientes nuevos se quedan más? (por año de activación) ──────────
const COLORES_ANIO = ['#cbd5e1', '#94a3b8', '#64748b', '#f59e0b', '#ea580c', '#7c2d12']

function curvasADatos(series, clave) {
  const largo = Math.max(0, ...series.map(s => s.curva.length))
  return Array.from({ length: largo }, (_, mes) => {
    const fila = { mes }
    for (const s of series) fila[s[clave]] = s.curva[mes] ?? null
    return fila
  })
}

export function RetencionPorAnio({ porAnio = [], esMovil }) {
  const series = porAnio.slice(-5)
  const datos = useMemo(() => curvasADatos(series, 'anio'), [series])
  const ultimo = series[series.length - 1]
  const anterior = series[series.length - 2]
  // Comparación en el mes más lejano que ambos ya vivieron
  const mesComparable = ultimo && anterior
    ? [12, 6, 3, 1].find(m => ultimo.curva[m] != null && anterior.curva[m] != null)
    : null
  const finales = useMemo(() => {
    const items = series.map(s => {
      const i = ultimoConDato(s.curva)
      return { clave: s.anio, indice: i, valor: s.curva[i] }
    })
    const desp = separarEtiquetas(items, esMovil ? 180 : 220)
    return Object.fromEntries(items.map(i => [i.clave, { ...i, dy: desp[i.clave] || 0 }]))
  }, [series, esMovil])
  if (!series.length) return null
  return (
    <Tarjeta titulo="¿Los clientes nuevos se quedan más?"
      bajada="Una curva por año de activación. Si las curvas recientes (naranja) van por encima de las antiguas (gris), la retención está mejorando.">
      {mesComparable != null && (
        <p className="dash-txt text-[15px] text-slate-700 mb-3">
          A los {mesComparable} {mesComparable === 1 ? 'mes' : 'meses'} siguen {fmtPct(ultimo.curva[mesComparable])} de los clientes de {ultimo.anio},
          frente a {fmtPct(anterior.curva[mesComparable])} de los de {anterior.anio}{' '}
          <strong className={ultimo.curva[mesComparable] >= anterior.curva[mesComparable] ? 'text-emerald-700' : 'text-red-700'}>
            ({ultimo.curva[mesComparable] >= anterior.curva[mesComparable] ? 'mejor' : 'peor'})
          </strong>.
        </p>
      )}
      <ResponsiveContainer width="100%" height={esMovil ? 230 : 270}>
        <LineChart data={datos} margin={{ top: 12, right: esMovil ? 76 : 80, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(n) => (n === 0 ? 'Inicio' : n)} interval={esMovil ? 2 : 0} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} {...ejeIzq(esMovil)} />
          <Tooltip formatter={(v, name) => [fmtPct(v), `Activaron en ${name}`]} labelFormatter={(n) => (n === 0 ? 'Inicio' : `Mes ${n}`)} />
          {series.map((s, i) => {
            const color = COLORES_ANIO[COLORES_ANIO.length - series.length + i]
            const f = finales[s.anio]
            // Los grises claros se rotulan con un tono más oscuro para que se lean
            const colorTexto = i < series.length - 2 ? '#475569' : color
            return (
              <Line key={s.anio} type="stepAfter" dataKey={s.anio} name={s.anio} connectNulls={false}
                stroke={color} strokeWidth={i === series.length - 1 ? 3 : 2} isAnimationActive={false}
                dot={({ cx, cy, index }) => (index === f.indice ? <circle key={index} cx={cx} cy={cy} r={3} fill={color} /> : <g key={index} />)}
                label={({ x, y, index, value }) => (index === f.indice && value != null
                  ? <text key={index} x={x + 5} y={y + 4 + f.dy} fontSize={esMovil ? 10 : 11} fontWeight={700} fill={colorTexto} {...HALO}>{s.anio} · {fmtCorto(value)}</text>
                  : null)} />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
      <p className="dash-txt text-xs text-slate-400 mt-2">Las curvas se cortan donde quedan menos de 5 clientes por medir.</p>
    </Tarjeta>
  )
}

// ─── 3. Antigüedad de quienes siguen hoy ─────────────────────────────────────
export function AntiguedadActual({ antiguedad = [], siguenHoy }) {
  const total = antiguedad.reduce((s, a) => s + a.clientes, 0) || 1
  const datos = antiguedad.map(a => {
    const pct = Math.round((a.clientes / total) * 100)
    return { ...a, pct, rotulo: a.clientes ? `${a.clientes}|${pct}` : '' }
  })
  const fieles = datos.filter(a => a.tramo === '1 a 2 años' || a.tramo === 'Más de 2 años').reduce((s, a) => s + a.clientes, 0)
  return (
    <Tarjeta titulo="¿Hace cuánto están con nosotros?"
      bajada={`Antigüedad de los ${siguenHoy} clientes que siguen con servicio, contada desde su primera activación.`}>
      <p className="dash-txt text-[15px] text-slate-700 mb-3">
        <strong className="text-emerald-700">{fieles}</strong> de {siguenHoy} ({Math.round((fieles / total) * 100)}%) llevan más de un año: son la base fiel del negocio.
      </p>
      <ResponsiveContainer width="100%" height={Math.max(200, datos.length * 46)}>
        <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 70, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#eef2f7" horizontal={false} />
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="tramo" width={118} tick={{ fontSize: 12, fill: '#334155' }} />
          <Tooltip formatter={(v, _n, p) => [`${v} clientes (${p.payload.pct}%)`, 'Siguen con servicio']} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="clientes" radius={[0, 6, 6, 0]} maxBarSize={28} isAnimationActive={false}>
            {datos.map((a, i) => <Cell key={a.tramo} fill={i >= 3 ? VERDE : '#86efac'} />)}
            <LabelList dataKey="rotulo" position="right" content={({ x, y, width, height, value }) => {
              if (!value) return null
              const [n, pct] = String(value).split('|')
              return <text x={x + width + 6} y={y + height / 2 + 4} fontSize={12} fontWeight={700} fill="#1e293b">{n} <tspan fill="#64748b" fontWeight={500}>· {pct}%</tspan></text>
            }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Tarjeta>
  )
}

// ─── 4. Curvas por plan de entrada ───────────────────────────────────────────
const COLORES_PLAN = { 'Plan Mensual': '#7c3aed', 'Plan Semestral': '#0891b2', 'Plan Anual': VERDE }

export function CurvasPorPlan({ porPlan = [], esMovil }) {
  const series = porPlan.filter(p => p.curva?.length)
  const datos = useMemo(() => curvasADatos(series, 'plan'), [series])
  const finales = useMemo(() => {
    const items = series.map(p => {
      const i = ultimoConDato(p.curva)
      return { clave: p.plan, indice: i, valor: p.curva[i] }
    })
    const desp = separarEtiquetas(items, esMovil ? 170 : 210)
    return Object.fromEntries(items.map(i => [i.clave, { ...i, dy: desp[i.clave] || 0 }]))
  }, [series, esMovil])
  if (!series.length) return null
  return (
    <ResponsiveContainer width="100%" height={esMovil ? 230 : 270}>
      <LineChart data={datos} margin={{ top: 26, right: esMovil ? 86 : 104, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(n) => (n === 0 ? 'Inicio' : n)} interval={esMovil ? 2 : 0} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} {...ejeIzq(esMovil)} />
        <Tooltip formatter={(v, name) => [fmtPct(v), name]} labelFormatter={(n) => (n === 0 ? 'Inicio' : `Mes ${n}`)} />
        {[7, 14].map(n => (
          <ReferenceLine key={n} x={n} stroke="#cbd5e1" strokeDasharray="4 4"
            label={{ value: esMovil ? (n === 7 ? 'Semestral' : 'Anual') : (n === 7 ? 'Vence semestral' : 'Vence anual'), position: 'insideBottomLeft', offset: 8, fontSize: esMovil ? 10 : 11, fill: '#64748b' }} />
        ))}
        {series.map(p => {
          const color = COLORES_PLAN[p.plan] || TINTA
          const f = finales[p.plan]
          return (
            <Line key={p.plan} type="stepAfter" dataKey={p.plan} name={p.plan} stroke={color}
              strokeWidth={2.5} connectNulls={false} isAnimationActive={false}
              dot={({ cx, cy, index }) => (index === f.indice ? <circle key={index} cx={cx} cy={cy} r={3} fill={color} /> : <g key={index} />)}
              label={({ x, y, index, value }) => (index === f.indice && value != null
                ? <text key={index} x={x + 5} y={y + 4 + f.dy} fontSize={esMovil ? 10 : 11} fontWeight={700} fill={color} {...HALO}>{p.plan.replace('Plan ', '')} · {fmtCorto(value)}</text>
                : null)} />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}
