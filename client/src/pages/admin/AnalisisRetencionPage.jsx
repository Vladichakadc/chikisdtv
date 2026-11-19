import { useEffect, useMemo, useState } from 'react'
import { Tv, ChevronDown, AlertTriangle, TrendingUp, Users, Info } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import api from '../../config/api'
import { cn } from '../../utils/cn'
import { useEsMovil } from '../../hooks/useEsMovil'
import { DASH_TIPOS } from './dashboard/AlAire'
import { causaDelMes, recomendaciones, textoDeDiez, textoMes, titular } from './retencion/lecturas'

// Análisis de Retención: "de los clientes que activamos, ¿cuántos siguen con
// nosotros y cuándo se van?". Los datos y las reglas vienen de
// GET /admin/dashboard-bi/retencion (server/services/retencion.js).

const fmtPct = (v) => (v == null ? '—' : `${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`)
const nombreMes = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }).replace('.', '')
}

// ─── Titular: diez pantallas, encendidas las de quienes siguen ───────────────
function DiezPantallas({ encendidas }) {
  return (
    <div className="grid grid-cols-10 gap-1 sm:gap-2 max-w-[560px]" role="img" aria-label={`${encendidas} de cada 10 pantallas encendidas`}>
      {Array.from({ length: 10 }, (_, i) => {
        const on = i < encendidas
        return (
          <span key={i} className={cn('aspect-[6/5] rounded-md sm:rounded-lg flex items-center justify-center transition-colors',
            on ? 'bg-[#ff9a4d]/20 ring-1 ring-[#ff9a4d]/60 shadow-[0_0_18px_rgba(255,154,77,.35)]' : 'bg-white/[.04] ring-1 ring-white/10')}>
            <Tv className={cn('w-[55%] h-[55%]', on ? 'text-[#ffb27a]' : 'text-slate-600')} />
          </span>
        )
      })}
    </div>
  )
}

function Titular({ data }) {
  const t = titular(data)
  return (
    <section className="rounded-[28px] overflow-hidden text-white mb-6"
      style={{ background: 'radial-gradient(120% 140% at 0% 0%, #1f2563 0%, #12163a 55%, #0d1030 100%)' }}>
      <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-6">
        <p className="dash-txt text-sm text-slate-300/80">Análisis de retención</p>
        <h1 className="dash-num text-[30px] sm:text-[44px] font-bold leading-[1.05] mt-1 max-w-3xl">
          {t ? `De cada 10 clientes que activamos, ${t.deDiez} siguen con servicio al año` : '¿Cuántos clientes siguen con nosotros?'}
        </h1>
        {t && <div className="mt-5"><DiezPantallas encendidas={t.deDiez} /></div>}
        <p className="dash-txt text-[15px] text-slate-300/90 mt-5 max-w-2xl leading-relaxed">
          Hoy siguen con servicio <strong className="text-white">{data.siguenHoy}</strong> de los <strong className="text-white">{data.totalClientes}</strong> clientes que han activado una pantalla.
          Los datos llegan hasta {nombreMes(data.corte)}, el último mes cerrado.
        </p>
      </div>
      {/* Línea de tiempo: 1 → 3 → 6 → 12 meses (es una secuencia real) */}
      <ol className="grid grid-cols-2 sm:grid-cols-4 border-t border-white/10 divide-x divide-white/10 [&>li:nth-child(n+3)]:border-t sm:[&>li:nth-child(n+3)]:border-t-0 [&>li]:border-white/10">
        {data.hitos.map(h => (
          <li key={h.mes} className="px-5 sm:px-6 py-4">
            <span className="dash-txt block text-[13px] text-slate-300/80 first-letter:uppercase">{textoMes(h.mes)}</span>
            <span className="dash-num block text-[34px] sm:text-[40px] font-bold leading-tight text-white">{fmtPct(h.pct)}</span>
            <span className="dash-txt block text-[13px] text-slate-400">{textoDeDiez(h.pct)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ─── Bloque con título y explicación corta ───────────────────────────────────
function Bloque({ titulo, bajada, children, className }) {
  return (
    <section className={cn('rounded-[24px] bg-white ring-1 ring-slate-200/80 p-4 sm:p-6', className)}>
      <h2 className="dash-num text-[22px] sm:text-[24px] font-bold text-slate-900 leading-tight">{titulo}</h2>
      {bajada && <p className="dash-txt text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">{bajada}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function TooltipCurva({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="dash-txt bg-white rounded-xl shadow-lg ring-1 ring-slate-200 px-3 py-2 text-[13px]">
      <p className="font-semibold text-slate-800 first-letter:uppercase">{textoMes(p.mes)}</p>
      <p className="text-slate-600">Siguen <strong className="text-emerald-700">{fmtPct(p.pct)}</strong> de los clientes</p>
      {causaDelMes(p.mes) && <p className="text-slate-400 text-xs mt-0.5 first-letter:uppercase">{causaDelMes(p.mes)}</p>}
    </div>
  )
}

function CurvaSiguen({ curva, esMovil }) {
  const datos = curva.filter(p => p.pct != null)
  return (
    <ResponsiveContainer width="100%" height={esMovil ? 230 : 290}>
      <LineChart data={datos} margin={{ top: 22, right: esMovil ? 8 : 24, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(n) => (n === 0 ? 'Inicio' : `${n}`)} interval={esMovil ? 2 : 0} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} width={40} />
        <Tooltip content={<TooltipCurva />} />
        {[7, 14].map(n => (
          <ReferenceLine key={n} x={n} stroke="#cbd5e1" strokeDasharray="4 4"
            label={{ value: n === 7 ? 'Vence semestral' : 'Vence anual', position: 'top', fontSize: 11, fill: '#64748b' }} />
        ))}
        <Line type="stepAfter" dataKey="pct" stroke="#059669" strokeWidth={3} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function CuandoSeVan({ salidas, momentoCritico, esMovil }) {
  const datos = salidas.filter(s => s.base >= 10)
  const picos = new Set([...datos].sort((a, b) => b.pct - a.pct).slice(0, 2).filter(s => s.pct >= 3).map(s => s.mes))
  return (
    <>
      <ResponsiveContainer width="100%" height={esMovil ? 200 : 240}>
        <BarChart data={datos} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} interval={esMovil ? 1 : 0} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} width={36} allowDecimals={false} />
          <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v, _n, p) => [`${fmtPct(v)} (${p.payload.seVan} de ${p.payload.base})`, 'Se fueron ese mes']} labelFormatter={(n) => `Mes ${n}`} />
          <Bar dataKey="pct" radius={[5, 5, 0, 0]} maxBarSize={34} isAnimationActive={false}>
            {datos.map(s => <Cell key={s.mes} fill={picos.has(s.mes) ? '#dc2626' : '#cbd5e1'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {momentoCritico && (
        <p className="dash-txt mt-3 text-[15px] text-slate-700 leading-relaxed">
          <strong className="text-red-700">Mes {momentoCritico.mes}</strong>: se van {fmtPct(momentoCritico.pct)} de los clientes que llegan a ese mes
          ({momentoCritico.seVan} de {momentoCritico.base}){causaDelMes(momentoCritico.mes) ? `, ${causaDelMes(momentoCritico.mes)}` : ''}.
          Las barras en rojo son los dos meses con más salidas.
        </p>
      )}
    </>
  )
}

function SegunPlan({ porPlan }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {porPlan.map(p => (
        <div key={p.plan} className="rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 p-4">
          <p className="dash-txt text-[15px] font-semibold text-slate-800">{p.plan}</p>
          <p className="dash-txt text-xs text-slate-500">{p.clientes} clientes entraron con este plan</p>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            {[6, 12, 18].map(h => (
              <div key={h}>
                <dt className="dash-txt text-xs text-slate-500 first-letter:uppercase">{textoMes(h)}</dt>
                <dd className="dash-num text-[24px] sm:text-[26px] font-bold leading-tight text-slate-900">{fmtPct(p.hitos[h])}</dd>
                {/* barra de proporción (empieza en 0) */}
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mt-1" aria-hidden="true">
                  <div className="h-full bg-emerald-600" style={{ width: `${p.hitos[h] ?? 0}%` }} />
                </div>
              </div>
            ))}
          </dl>
          {Object.values(p.hitos).some(v => v == null) && (
            <p className="dash-txt text-[11px] text-slate-400 mt-2">— = menos de 5 clientes medidos</p>
          )}
        </div>
      ))}
    </div>
  )
}

// Color de celda: de rojo (se fueron) a verde (siguen); texto siempre legible
function colorCelda(pct) {
  if (pct == null) return { background: 'transparent', color: '#cbd5e1' }
  const h = Math.round((pct / 100) * 140) // 0 rojo → 140 verde
  return { background: `hsl(${h} 70% ${92 - pct * 0.12}%)`, color: `hsl(${h} 60% 24%)` }
}

function DetalleCohortes({ cohortes }) {
  const [todas, setTodas] = useState(false)
  const COLS = [0, 1, 2, 3, 6, 7, 9, 12, 14, 18]
  const lista = todas ? cohortes : cohortes.slice(-12)
  return (
    <>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="dash-txt w-full min-w-[640px] text-[13px] border-separate border-spacing-y-1 px-4 sm:px-0">
          <thead>
            <tr className="text-slate-500">
              <th className="sticky left-0 bg-white text-left font-medium py-1 pr-3">Activaron en</th>
              <th className="text-right font-medium pr-3">Clientes</th>
              {COLS.map(n => <th key={n} className="font-medium text-center w-14">{n === 0 ? 'Inicio' : `Mes ${n}`}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...lista].reverse().map(c => (
              <tr key={c.mes}>
                <td className="sticky left-0 bg-white pr-3 py-0.5 font-semibold text-slate-700 whitespace-nowrap first-letter:uppercase">{nombreMes(c.mes)}</td>
                <td className={cn('text-right pr-3', c.clientes < 3 ? 'text-slate-400' : 'text-slate-700')}>{c.clientes}</td>
                {COLS.map(n => (
                  <td key={n} className="text-center rounded-md py-1 font-semibold" style={colorCelda(c.retencion[n])}
                    title={c.retencion[n] == null ? 'Ese mes aún no ha pasado' : `${fmtPct(c.retencion[n])} siguen en el mes ${n}`}>
                    {c.retencion[n] == null ? '·' : Math.round(c.retencion[n])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="dash-txt text-xs text-slate-500">Cada número es el % de ese grupo que sigue con servicio. "·" = ese mes aún no llega. Los grupos de menos de 3 clientes aparecen en gris.</p>
        {cohortes.length > 12 && (
          <button type="button" onClick={() => setTodas(t => !t)} className="dash-txt min-h-[40px] px-3 text-sm font-semibold text-brand-primary">
            {todas ? 'Ver solo los últimos 12 meses' : `Ver los ${cohortes.length} meses`}
          </button>
        )}
      </div>
    </>
  )
}

function Plegable({ titulo, children, abierto: inicial = false }) {
  const [abierto, setAbierto] = useState(inicial)
  return (
    <section className="rounded-[24px] bg-white ring-1 ring-slate-200/80">
      <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto}
        className="w-full min-h-[56px] px-4 sm:px-6 flex items-center justify-between gap-3 text-left">
        <span className="dash-num text-[20px] sm:text-[22px] font-bold text-slate-900">{titulo}</span>
        <ChevronDown size={20} className={cn('text-slate-400 transition-transform', abierto && 'rotate-180')} />
      </button>
      {abierto && <div className="px-4 sm:px-6 pb-5">{children}</div>}
    </section>
  )
}

const TONO_RECO = {
  rojo: { icon: AlertTriangle, cls: 'text-red-600 bg-red-50' },
  verde: { icon: TrendingUp, cls: 'text-emerald-700 bg-emerald-50' },
  neutro: { icon: Users, cls: 'text-slate-600 bg-slate-100' },
}

export default function AnalisisRetencionPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const esMovil = useEsMovil()

  useEffect(() => {
    api.get('/admin/dashboard-bi/retencion')
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el análisis de retención. Recarga la página para intentarlo de nuevo.'))
  }, [])

  const recos = useMemo(() => recomendaciones(data), [data])

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <style>{DASH_TIPOS}</style>
      {error && <div className="dash-txt bg-red-50 ring-1 ring-red-200 rounded-2xl p-4 text-red-700 text-sm">{error}</div>}
      {!data && !error && (
        <div className="space-y-4" aria-busy="true">
          {[260, 300, 240].map(h => <div key={h} className="rounded-[24px] bg-slate-100 animate-pulse" style={{ height: h }} />)}
        </div>
      )}

      {data && data.totalClientes === 0 && (
        <div className="dash-txt rounded-[24px] bg-white ring-1 ring-slate-200 p-6 text-slate-600">
          Todavía no hay activaciones registradas. Cuando registres ventas de tipo "Activación pantalla" en Pagos, aquí verás cuántos clientes siguen con servicio.
        </div>
      )}

      {data && data.totalClientes > 0 && (
        <>
          <Titular data={data} />

          {recos.length > 0 && (
            <section aria-label="Qué hacer" className="grid gap-3 lg:grid-cols-3">
              {recos.map((r, i) => {
                const t = TONO_RECO[r.tono]
                return (
                  <article key={i} className="rounded-[20px] bg-white ring-1 ring-slate-200/80 p-4 flex gap-3">
                    <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', t.cls)}><t.icon size={18} /></span>
                    <div className="min-w-0">
                      <h3 className="dash-txt text-[15px] font-semibold text-slate-900 leading-snug">{r.titulo}</h3>
                      <p className="dash-txt text-sm text-slate-600 mt-1 leading-relaxed">{r.texto}</p>
                    </div>
                  </article>
                )
              })}
            </section>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Bloque titulo="¿Cuántos siguen con nosotros mes a mes?"
              bajada="Parte del 100% de los clientes al activar y baja cada vez que alguien no renueva. Los escalones grandes coinciden con el fin de los planes semestral y anual.">
              <CurvaSiguen curva={data.curva} esMovil={esMovil} />
            </Bloque>
            <Bloque titulo="¿En qué mes se van?"
              bajada="De los clientes que llegan a cada mes, qué porcentaje no renueva ese mes.">
              <CuandoSeVan salidas={data.salidas} momentoCritico={data.momentoCritico} esMovil={esMovil} />
            </Bloque>
          </div>

          {data.porPlan?.length > 0 && (
            <Bloque titulo="Según el plan con el que entran"
              bajada="Cuántos siguen a los 6, 12 y 18 meses según el plan de su primera activación. Los planes largos se pagan por adelantado: el semestral se pone a prueba en el mes 7 y el anual en el mes 14, por eso su 100% al año no significa que nunca se vayan.">
              <SegunPlan porPlan={data.porPlan} />
            </Bloque>
          )}

          <Plegable titulo="Detalle por mes de activación">
            <DetalleCohortes cohortes={data.cohortes} />
          </Plegable>

          <Plegable titulo="Cómo se calculan estos números">
            <ul className="dash-txt text-sm text-slate-600 leading-relaxed space-y-2 list-disc pl-5">
              <li>Cada cliente entra en el mes de su <strong>primera venta "Activación pantalla"</strong>, con el plan de esa venta.</li>
              <li>Cada venta (menos las cortesías) cubre los meses de su plan: <strong>mensual 1</strong>, <strong>semestral 7</strong> (6 + 1 gratis) y <strong>anual 14</strong> (12 + 2 gratis). Un cliente <strong>sigue con nosotros</strong> mientras alguna venta lo cubra.</li>
              <li>Si alguien paga tarde y vuelve, cuenta como que siguió: la curva nunca "revive".</li>
              <li>El mes en curso no se mide (los datos van hasta {nombreMes(data.corte)}) para no contar como perdidos a quienes aún no renuevan este mes.</li>
              <li>Los porcentajes combinan a todos los clientes según cuántos vivieron cada mes (curva de supervivencia), así un grupo pequeño no distorsiona el promedio.</li>
            </ul>
            <p className="dash-txt text-xs text-slate-400 mt-3 flex items-center gap-1.5"><Info size={13} /> Fuente: ventas de licencias del módulo Pagos.</p>
          </Plegable>
        </>
      )}
    </div>
  )
}
