import { useMemo, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, Tooltip, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, Minus, ChevronRight } from 'lucide-react'
import { formatCurrency } from '../../../utils/excelUtils'
import { cn } from '../../../utils/cn'
import { useEsMovil } from '../../../hooks/useEsMovil'
import { calcularPulso, GRUPOS } from './pulso'

// "Pulso del negocio": tarjetas inteligentes de negocio, economía y finanzas.
// Cada tarjeta trae su cifra, la variación, un semáforo, la tendencia de 12
// meses y, al tocarla, la explicación de cómo se calcula.

const TONOS = {
  bueno: { punto: 'bg-emerald-500', texto: 'text-emerald-700', anillo: 'hover:ring-emerald-300', linea: '#059669', etiqueta: 'Bien' },
  atencion: { punto: 'bg-amber-400', texto: 'text-amber-700', anillo: 'hover:ring-amber-300', linea: '#d97706', etiqueta: 'Atención' },
  alerta: { punto: 'bg-red-500', texto: 'text-red-700', anillo: 'hover:ring-red-300', linea: '#dc2626', etiqueta: 'Alerta' },
  neutro: { punto: 'bg-slate-300', texto: 'text-slate-500', anillo: 'hover:ring-slate-300', linea: '#475569', etiqueta: '' },
}

const fmtCompacto = (v) => {
  const a = Math.abs(v || 0)
  if (a >= 1e6) return `$${(v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`
  if (a >= 1e4) return `$${Math.round(v / 1e3).toLocaleString('es-CO')}K`
  return formatCurrency(v)
}
export function formatear(valor, formato, signo) {
  if (valor == null) return '—'
  if (formato === 'dinero') return fmtCompacto(valor)
  if (formato === 'pct') return `${Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`
  if (formato === 'dias') return `${Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 1 })} días`
  const n = Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 1 })
  return signo && valor > 0 ? `+${n}` : n
}

function Delta({ t }) {
  if (t.delta == null) return null
  const sube = t.delta > 0, igual = t.delta === 0
  const bueno = t.invertido ? !sube : sube
  const Icon = igual ? Minus : sube ? ArrowUpRight : ArrowDownRight
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] tabular-nums">
      <span className={cn('inline-flex items-center gap-0.5 font-semibold', igual ? 'text-slate-500' : bueno ? 'text-emerald-700' : 'text-red-600')}>
        <Icon size={14} />{sube ? '+' : ''}{t.delta.toLocaleString('es-CO', { maximumFractionDigits: 1 })}{t.deltaPuntos ? ' pts' : '%'}
      </span>
      <span className="text-slate-400">{t.deltaTexto.replace(/^pts /, '')}</span>
    </span>
  )
}

function Tendencia({ t }) {
  if (!t.serie?.length) return null
  const color = TONOS[t.tono]?.linea || '#475569'
  const fmt = (v) => formatear(v, t.serieFormato)
  const tip = (
    <Tooltip cursor={false} wrapperStyle={{ zIndex: 20 }}
      content={({ active, payload }) => (active && payload?.length
        ? <div className="bg-white rounded-lg shadow ring-1 ring-slate-200 px-2 py-1 text-[11.5px]"><span className="text-slate-500">{payload[0].payload.etiqueta}</span> <strong>{fmt(payload[0].value)}</strong></div>
        : null)} />
  )
  return (
    <div className="h-11 -mx-1 mt-2" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        {t.serieTipo === 'barras' ? (
          <BarChart data={t.serie} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
            {tip}
            <Bar dataKey="valor" radius={[2, 2, 2, 2]} isAnimationActive={false}>
              {t.serie.map(p => <Cell key={p.key} fill={p.valor >= 0 ? '#10b981' : '#f87171'} />)}
            </Bar>
          </BarChart>
        ) : (
          <AreaChart data={t.serie} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
            <defs>
              <linearGradient id={`pulso-${t.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={['dataMin', 'dataMax']} />
            {tip}
            <Area type="monotone" dataKey="valor" stroke={color} strokeWidth={2} fill={`url(#pulso-${t.id})`} isAnimationActive={false} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

function BarraParte({ b }) {
  const pct = Math.min(100, Math.round((b.parte / b.total) * 100))
  return (
    <div className="mt-3" aria-hidden="true">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-emerald-500">
        <div className="bg-slate-400" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11.5px] text-slate-500 mt-1">{pct}% {b.etiquetaParte} · {100 - pct}% {b.etiquetaResto}</p>
    </div>
  )
}

function Tarjeta({ t, onAbrir }) {
  const tn = TONOS[t.tono] || TONOS.neutro
  return (
    <button type="button" onClick={() => onAbrir(t)}
      className={cn('group text-left rounded-[20px] bg-white ring-1 ring-slate-200/80 p-4 flex flex-col min-w-0 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary', tn.anillo)}>
      <span className="flex items-start justify-between gap-2">
        <span className="dash-txt text-[13.5px] font-semibold text-slate-700 leading-snug">{t.titulo}</span>
        {tn.etiqueta && (
          <span className={cn('dash-txt inline-flex items-center gap-1 text-[11px] font-semibold flex-shrink-0', tn.texto)}>
            <span className={cn('w-2 h-2 rounded-full', tn.punto)} /> {tn.etiqueta}
          </span>
        )}
      </span>
      <span className="dash-num text-[32px] font-bold leading-tight text-slate-900 mt-1 tabular-nums truncate">{formatear(t.valor, t.formato, t.signo)}</span>
      <Delta t={t} />
      <span className="dash-txt text-[12.5px] text-slate-500 leading-snug mt-1">{t.detalle}</span>
      {t.barra && <BarraParte b={t.barra} />}
      <Tendencia t={t} />
      <span className="dash-txt mt-auto pt-2 text-[12px] font-semibold text-brand-primary inline-flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
        Cómo se calcula <ChevronRight size={13} />
      </span>
    </button>
  )
}

function Selector({ opciones, valor, onCambio, etiqueta }) {
  return (
    <div className="dash-txt inline-flex rounded-xl bg-slate-100 p-1 text-[13px] font-semibold max-w-full overflow-x-auto" role="group" aria-label={etiqueta}>
      {opciones.map(o => (
        <button key={o.valor} type="button" onClick={() => onCambio(o.valor)} aria-pressed={valor === o.valor}
          className={cn('min-h-[36px] px-3 rounded-lg whitespace-nowrap transition-colors', valor === o.valor ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}

export function PulsoNegocio({ bi, operacion, retencion, stats, onExplicar, onIr }) {
  const esMovil = useEsMovil()
  const [grupo, setGrupo] = useState(null) // null = según pantalla (todos en escritorio, Negocio en móvil)
  const [comparar, setComparar] = useState('mes')
  const pulso = useMemo(() => calcularPulso({ bi, operacion, retencion, stats }, { comparar }), [bi, operacion, retencion, stats, comparar])
  if (!pulso) return null
  const activo = grupo ?? (esMovil ? 'negocio' : 'todos')
  const visibles = activo === 'todos' ? pulso.tarjetas : pulso.tarjetas.filter(t => t.grupo === activo)
  const alertas = pulso.tarjetas.filter(t => t.tono === 'alerta').length

  const abrir = (t) => onExplicar({
    title: t.titulo,
    value: formatear(t.valor, t.formato, t.signo),
    queEs: t.explicacion.queEs,
    comoSeCalcula: t.explicacion.comoSeCalcula,
    origen: t.explicacion.origen,
    action: t.explicacion.action ? { label: t.explicacion.action.label, onClick: () => onIr(t.explicacion.action.ruta) } : undefined,
  })

  return (
    <section aria-labelledby="pulso-titulo" className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 id="pulso-titulo" className="dash-num text-[26px] font-bold text-slate-900 leading-none">Pulso del negocio</h2>
          <p className="dash-txt text-sm text-slate-500 mt-1.5">
            {alertas ? `${alertas} ${alertas === 1 ? 'indicador pide' : 'indicadores piden'} atención. ` : 'Todos los indicadores en rango sano. '}
            Toca una tarjeta para ver cómo se calcula.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Selector etiqueta="Grupo de indicadores" valor={activo} onCambio={setGrupo}
            opciones={[{ valor: 'todos', etiqueta: 'Todos' }, ...GRUPOS.map(g => ({ valor: g.id, etiqueta: g.nombre }))]} />
          <Selector etiqueta="Comparar con" valor={comparar} onCambio={setComparar}
            opciones={[{ valor: 'mes', etiqueta: 'vs mes anterior' }, { valor: 'anio', etiqueta: 'vs año anterior' }]} />
        </div>
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {visibles.map(t => <Tarjeta key={t.id} t={t} onAbrir={abrir} />)}
      </div>
    </section>
  )
}
