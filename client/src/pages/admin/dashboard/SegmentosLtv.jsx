import { useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Legend,
} from 'recharts'
import { AlertCircle, ChevronRight, Crown } from 'lucide-react'
import { formatCurrency } from '../../../utils/excelUtils'
import { cn } from '../../../utils/cn'
import { useEsMovil } from '../../../hooks/useEsMovil'

// Distribución del LTV por segmento (quintiles). Los cinco grupos tienen el
// mismo número de clientes (20% cada uno); lo que importa es cuánto del ingreso
// aporta cada grupo y cuántos de sus clientes siguen con servicio.
// Datos: bi.ltv.segmentos (server/services/ltvSegmentos.js).

const COLOR = { top: '#0f766e', alto: '#14b8a6', medio: '#5eead4', bajo: '#99f6e4', base: '#ccfbf1' }
const fmtPct = (v) => `${Number(v ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`
const fmtM = (v) => {
  const a = Math.abs(v || 0)
  if (a >= 1e6) return `$${(v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`
  if (a >= 1e3) return `$${Math.round(v / 1e3).toLocaleString('es-CO')}K`
  return formatCurrency(v)
}

// Textos de lectura: funciones puras (se prueban en SegmentosLtv.test.js)
export function titularSegmentos(s) {
  if (!s?.segmentos?.length) return null
  const top = s.segmentos[0]
  return `El 20% de los clientes que más ha pagado genera el ${fmtPct(top.pctIngreso)} del ingreso`
}
export function bajadaSegmentos(s) {
  if (!s?.concentracion) return null
  const c = s.concentracion
  const partes = [`${c.clientesMitadIngreso} clientes (${fmtPct(c.pctClientesMitadIngreso)} del total) suman la mitad de todo lo que ha entrado`]
  if (c.vecesTopVsBase) partes.push(`un cliente Top vale en promedio ${c.vecesTopVsBase.toLocaleString('es-CO')} veces lo que uno de la Base`)
  return `${partes.join(', y ')}.`
}

function TooltipAporte({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-slate-200 px-3 py-2 text-[13px] min-w-[200px]">
      <p className="font-semibold text-slate-800">{d.nombre} · {d.descripcion}</p>
      <p className="text-slate-600">{d.clientes} clientes ({fmtPct(d.pctClientes)})</p>
      <p className="text-slate-600">Aportan <strong className="text-teal-700">{fmtPct(d.pctIngreso)}</strong> del ingreso ({formatCurrency(d.ingresos)})</p>
      <p className="text-slate-500 text-xs mt-0.5">LTV de {formatCurrency(d.ltvMin)} a {formatCurrency(d.ltvMax)}</p>
    </div>
  )
}

function AporteChart({ segmentos, esMovil }) {
  const total = segmentos.reduce((s, x) => s + x.clientes, 0) || 1
  const datos = segmentos.map(x => ({ ...x, pctClientes: Math.round((x.clientes / total) * 1000) / 10 }))
  const rotulo = (color) => function Rotulo({ x, y, width, height, value }) {
    if (value == null) return null
    return <text x={x + width + 6} y={y + height / 2 + 4} fontSize={12} fontWeight={700} fill={color}>{fmtPct(value)}</text>
  }
  return (
    <ResponsiveContainer width="100%" height={esMovil ? 300 : 420}>
      <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 54, left: 0, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" domain={[0, (max) => Math.max(50, Math.ceil(max / 10) * 10)]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis type="category" dataKey="nombre" width={esMovil ? 48 : 60} tick={{ fontSize: 13, fill: '#1e293b', fontWeight: 600 }} />
        <Tooltip content={<TooltipAporte />} cursor={{ fill: '#f8fafc' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="pctClientes" name="% de los clientes" fill="#cbd5e1" radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={false}>
          <LabelList dataKey="pctClientes" content={rotulo('#64748b')} />
        </Bar>
        <Bar dataKey="pctIngreso" name="% del ingreso" fill="#0f766e" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
          <LabelList dataKey="pctIngreso" content={rotulo('#0f766e')} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Barra apilada de estado: con servicio / vencidos / sin pantalla
function BarraEstado({ s }) {
  const t = s.clientes || 1
  const partes = [
    { n: s.conServicio, cls: 'bg-emerald-500', txt: 'con servicio' },
    { n: s.vencidos, cls: 'bg-amber-400', txt: 'vencidos' },
    { n: s.sinPantalla, cls: 'bg-slate-300', txt: 'sin pantalla' },
  ]
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100" role="img"
        aria-label={partes.map(p => `${p.n} ${p.txt}`).join(', ')}>
        {partes.map(p => p.n > 0 && <div key={p.txt} className={p.cls} style={{ width: `${(p.n / t) * 100}%` }} />)}
      </div>
      <p className="text-[12px] text-slate-500 mt-1 tabular-nums">
        <span className="text-emerald-700 font-semibold">{s.conServicio}</span> con servicio ·{' '}
        <span className="text-amber-700 font-semibold">{s.vencidos}</span> vencidos ·{' '}
        <span className="text-slate-600 font-semibold">{s.sinPantalla}</span> sin pantalla
      </p>
    </div>
  )
}

export function SegmentosLtv({ datos, onVerCliente }) {
  const esMovil = useEsMovil()
  const [abierto, setAbierto] = useState('top')
  if (!datos?.segmentos?.length) {
    return <p className="text-sm text-slate-400 py-10 text-center">Todavía no hay clientes con compras para segmentar.</p>
  }
  const top = datos.segmentos[0]
  const conVencidos = datos.segmentos.filter(s => s.vencidosLista?.length)
  const seg = datos.segmentos.find(s => s.clave === abierto) || top

  return (
    <div className="space-y-5">
      {/* Titular */}
      <div>
        <p className="text-[19px] sm:text-[22px] font-bold text-slate-900 leading-snug" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {titularSegmentos(datos)}
        </p>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-3xl">{bajadaSegmentos(datos)}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Aporte: % de clientes vs % del ingreso */}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-700 mb-1">Cada grupo es el 20% de los clientes, pero no aporta lo mismo</p>
          <AporteChart segmentos={datos.segmentos} esMovil={esMovil} />
        </div>

        {/* Tabla por segmento */}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-700 mb-2">Quiénes son y si siguen con servicio</p>
          <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200 overflow-hidden">
            {datos.segmentos.map(s => (
              <li key={s.clave} className="px-3.5 py-3 bg-white">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 ring-1 ring-teal-700/20" style={{ background: COLOR[s.clave] }} />
                    <span className="font-semibold text-slate-900">{s.nombre}</span>
                    <span className="text-xs text-slate-400 truncate">{s.descripcion}</span>
                  </span>
                  <span className="text-[13px] font-bold text-teal-800 tabular-nums flex-shrink-0">{fmtPct(s.pctIngreso)} del ingreso</span>
                </div>
                <p className="text-[12.5px] text-slate-600 mt-1 tabular-nums">
                  {s.clientes} clientes · pagaron de {fmtM(s.ltvMin)} a {fmtM(s.ltvMax)} · promedio {fmtM(s.ltvPromedio)} · {s.vidaPromedioMeses} meses con nosotros
                </p>
                <div className="mt-1.5"><BarraEstado s={s} /></div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* A quién llamar: clientes valiosos con pantallas vencidas */}
      {conVencidos.length > 0 && (
        <div className="rounded-2xl bg-amber-50/70 ring-1 ring-amber-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-amber-900 flex items-center gap-2">
              <AlertCircle size={17} className="text-amber-600" />
              Clientes valiosos con pantallas vencidas
            </p>
            <div className="inline-flex max-w-full overflow-x-auto rounded-xl bg-white/80 p-1 text-[13px] font-semibold ring-1 ring-amber-200" role="group">
              {conVencidos.map(s => (
                <button key={s.clave} type="button" onClick={() => setAbierto(s.clave)} aria-pressed={seg.clave === s.clave}
                  className={cn('min-h-[32px] px-3 rounded-lg whitespace-nowrap flex-shrink-0', seg.clave === s.clave ? 'bg-amber-500 text-white' : 'text-amber-800 hover:bg-amber-100')}>
                  {s.nombre} · {s.vencidos}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-amber-900/80 mt-1">
            {seg.vencidos} {seg.vencidos === 1 ? 'cliente' : 'clientes'} del grupo {seg.nombre} tienen sus pantallas vencidas: son los primeros a quienes escribir para renovar. Se muestran los de mayor valor.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(seg.vencidosLista || []).map(c => (
              <li key={c.customerId}>
                <button type="button" onClick={() => onVerCliente?.(c)}
                  className="w-full min-h-[48px] text-left rounded-xl bg-white ring-1 ring-amber-200 hover:ring-amber-400 px-3 py-2 flex items-center gap-2">
                  {seg.clave === 'top' && <Crown size={14} className="text-amber-500 flex-shrink-0" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-slate-800 truncate">{c.nombre}</span>
                    <span className="block text-xs text-slate-500 tabular-nums">Ha pagado {formatCurrency(c.ltv)}</span>
                  </span>
                  <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-400 leading-relaxed">
        LTV = todo lo que ha pagado cada cliente en licencias desde su primera activación (sin cortesías ni cambios de plan).
        Los clientes se ordenan de mayor a menor y se parten en cinco grupos del mismo tamaño. El estado sale del Planificador:
        con servicio = alguna pantalla vigente o por vencer; vencidos = todas sus pantallas vencidas; sin pantalla = ya no tiene pantallas asignadas.
        {top && ` Total: ${datos.totalClientes} clientes y ${formatCurrency(datos.totalIngresos)}.`}
      </p>
    </div>
  )
}
