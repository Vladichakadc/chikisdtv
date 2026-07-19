/**
 * PlansPage — Professional redesign
 * Skills applied: ui-ux-pro-max · huashu-design · taste-skill
 *
 * Interfaz profesional:
 *  – Hero header oscuro con orbs cyan/blue ambientales
 *  – KPI cards con gradientes y animaciones de entrada
 *  – Drawer lateral para edición de planes
 *  – Confirm dialog custom
 *  – Skeleton shimmer loader
 *  – Búsqueda en tiempo real
 *  – Tabla con scroll horizontal y acciones hover
 */

import { useState, useMemo, useEffect } from 'react'
import {
  Search, Plus, Pencil, Trash2, X,
  CheckCircle2, XCircle,
  Activity, AlertTriangle, Layers, Monitor, Calendar,
  Wallet, Trophy, RefreshCw, AlertCircle, ZoomIn,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, LabelList,
} from 'recharts'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { KpiCard } from '../../components/ui/KpiCard'
import { formatCurrency } from '../../utils/excelUtils'
import { GrowthBadge, ChartInsight, ChartTooltip, renderDonutLabel, formatCompactCurrency, LABEL_STYLE } from './dashboard/biShared'

/* ══════════════════════════════════════════════════════════════
   DESIGN TOKENS (Huashu — brand Cyan/Sky para Planes)
══════════════════════════════════════════════════════════════ */
const CSS = `
  @keyframes pl-fade-up  { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes pl-fade-in  { from { opacity:0 } to { opacity:1 } }
  @keyframes pl-scale-in { from { opacity:0; transform:scale(.94) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
  @keyframes pl-slide-in { from { opacity:0; transform:translateX(100%) } to { opacity:1; transform:translateX(0) } }
  @keyframes pl-shimmer  { from { background-position:-200% 0 } to { background-position:200% 0 } }
  @keyframes pl-orb-1    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes pl-orb-2    { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }

  .pl-a1 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .pl-a2 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .pl-a3 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) .12s both }
  .pl-a4 { animation: pl-fade-up .45s cubic-bezier(.22,1,.36,1) .18s both }

  .pl-skeleton {
    background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
    background-size: 200% 100%;
    animation: pl-shimmer 1.6s infinite;
    border-radius: 6px;
  }
  .pl-drawer  { animation: pl-slide-in .3s cubic-bezier(.22,1,.36,1) both }
  .pl-overlay { animation: pl-fade-in .2s ease both }
  .pl-confirm { animation: pl-scale-in .22s cubic-bezier(.22,1,.36,1) both }

  .pl-kpi { transition: transform .25s ease, box-shadow .25s ease }
  .pl-kpi:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.12) }

  .pl-cta {
    background: linear-gradient(135deg, #0ea5e9, #3b82f6);
    box-shadow: 0 4px 18px rgba(14,165,233,.4);
    transition: all .22s ease;
  }
  .pl-cta:hover  { box-shadow: 0 7px 24px rgba(14,165,233,.55); transform: translateY(-2px) }
  .pl-cta:active { transform: translateY(0) }

  .pl-btn-danger {
    background: linear-gradient(135deg,#ef4444,#f87171);
    box-shadow: 0 4px 14px rgba(239,68,68,.3);
    transition: all .2s ease;
  }
  .pl-btn-danger:hover { box-shadow: 0 6px 20px rgba(239,68,68,.45); transform: translateY(-1px) }

  .pl-orb-1 { animation: pl-orb-1 8s ease-in-out infinite }
  .pl-orb-2 { animation: pl-orb-2 11s ease-in-out infinite }

  .pl-search:focus { outline: none; box-shadow: 0 0 0 3px rgba(14,165,233,.18) }

  .pl-row { transition: background .15s ease }
  .pl-row:hover td { background: rgba(14,165,233,.04) }

  .pl-th-sort { transition: background .15s ease }
  .pl-th-sort:hover { background: rgba(255,255,255,.12) }

  .pl-action-btn { transition: all .18s ease; opacity: 0 }
  tr:hover .pl-action-btn { opacity: 1 }
  .pl-action-btn:hover { transform: scale(1.15) }

  @media (prefers-reduced-motion: reduce) {
    .pl-a1,.pl-a2,.pl-a3,.pl-a4,
    .pl-drawer,.pl-overlay,.pl-confirm,
    .pl-orb-1,.pl-orb-2,.pl-skeleton { animation: none !important; transition: none !important }
  }
`

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════ */
const EMPTY = {
  nombre: '', precio: 0, duracionDias: 30, numeroPantallas: 1,
  descripcion: '', activo: true
}

/* ── Desempeño por plan (datos de Pagos + Planificador) ── */

// Color fijo por plan real para que el usuario construya memoria visual
const PLAN_COLORS = {
  'Plan Semestral': '#f97316',
  'Plan Anual': '#8b5cf6',
  'Plan Mensual': '#0ea5e9',
  'Otros': '#94a3b8',
}
const planColor = (nombre) => PLAN_COLORS[nombre] || '#94a3b8'

function narrarPlanes(perf) {
  if (!perf?.planes?.length) return null
  const [lider] = perf.planes
  const conYTD = perf.planes.filter(p => p.crecimientoYTDPct != null && p.ventas >= 10)
  const sube = conYTD.length ? conYTD.reduce((a, b) => (b.crecimientoYTDPct > a.crecimientoYTDPct ? b : a)) : null
  const baja = conYTD.length ? conYTD.reduce((a, b) => (b.crecimientoYTDPct < a.crecimientoYTDPct ? b : a)) : null
  const fiel = perf.planes.filter(p => p.pctRenovacion != null && p.ventas >= 10)
    .reduce((a, b) => (!a || b.pctRenovacion > a.pctRenovacion ? b : a), null)
  const partes = [
    `**${lider.plan}** es el motor del negocio: aporta el ${lider.pctIngresos}% del ingreso histórico por licencias y concentra ${lider.pantallasVigentes} pantallas vigentes de la base instalada.`,
  ]
  if (sube && baja && sube.plan !== baja.plan) {
    partes.push(` En el año corrido, **${sube.plan}** es el que más crece (${sube.crecimientoYTDPct >= 0 ? '+' : ''}${sube.crecimientoYTDPct}% vs. el mismo periodo del año pasado) mientras **${baja.plan}** varía ${baja.crecimientoYTDPct >= 0 ? '+' : ''}${baja.crecimientoYTDPct}%.`)
    if (baja.plan === 'Plan Mensual' && sube.mesesCobertura > 1) {
      partes.push(' La lectura: la base está migrando hacia planes de mayor cobertura — buena señal de fidelización y caja anticipada, pero conviene cuidar el plan mensual como puerta de entrada de clientes nuevos.')
    }
  }
  if (fiel) {
    partes.push(` La fidelidad más alta la tiene **${fiel.plan}**: ${fiel.pctRenovacion}% de sus ventas son renovaciones.`)
  }
  return partes.join('')
}

// Detecta viewport móvil (breakpoint sm de Tailwind) de forma reactiva
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const onChange = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

// ── Controles del gráfico de serie mensual: año + planes visibles ──
// En móvil cada grupo se desliza horizontalmente (sin cortar targets táctiles);
// en escritorio conviven en una sola fila con wrap.
function SerieControls({ anios, anio, onAnio, keys, activos, onToggle }) {
  return (
    <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-x-4 sm:gap-y-2 sm:flex-wrap">
      <div className="overflow-x-auto pb-1 sm:pb-0 sm:overflow-visible">
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold w-max">
          <button
            onClick={() => onAnio(null)}
            className={`px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg whitespace-nowrap transition-all ${anio == null ? 'bg-white shadow text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Últimos 12m
          </button>
          {anios.map(a => (
            <button
              key={a}
              onClick={() => onAnio(a)}
              className={`px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg whitespace-nowrap transition-all ${anio === a ? 'bg-white shadow text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:overflow-visible sm:flex-wrap">
        {keys.map(k => {
          const on = activos.has(k)
          return (
            <button
              key={k}
              onClick={() => onToggle(k)}
              title={on ? `Ocultar ${k}` : `Mostrar ${k}`}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-full text-xs font-semibold border whitespace-nowrap flex-shrink-0 transition-all ${on ? 'text-white border-transparent shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
              style={on ? { background: planColor(k) } : undefined}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? '#fff' : planColor(k) }} />
              {k}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Gráfico de barras apiladas con etiqueta del total mensual ──
// La etiqueta muestra el total de los planes VISIBLES (honestidad: lo que se
// ve sumado, no un total oculto); el detalle por plan vive en el tooltip.
// Los chips de SerieControls hacen de leyenda interactiva — no se duplica una
// leyenda estática. En móvil (`compact`) las etiquetas se ocultan para evitar
// colisiones de texto y los ejes se aligeran; el tooltip conserva los valores.
function SeriePlanChart({ data, keys, className, compact = false }) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: compact ? 8 : 26, right: compact ? 4 : 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} vertical={false} />
          <XAxis
            dataKey="label" tick={{ fontSize: compact ? 10 : 11, fill: '#78716c' }}
            tickLine={false} axisLine={{ stroke: '#e2e8f0' }} minTickGap={compact ? 14 : 4}
          />
          <YAxis
            tick={{ fontSize: compact ? 10 : 11, fill: '#78716c' }} width={compact ? 40 : 60}
            tickLine={false} axisLine={false}
            tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}K`)}
          />
          <Tooltip content={<ChartTooltip />} />
          {keys.map(k => (
            <Bar key={k} dataKey={k} name={k} stackId="planes" fill={planColor(k)} />
          ))}
          {/* Línea invisible que sostiene la etiqueta del total del mes en el
              tope del stack, sin depender de qué serie quede de última */}
          <Line type="monotone" dataKey="__total" name="Total mes" stroke="#475569" strokeWidth={0} dot={false} activeDot={false} legendType="none" isAnimationActive={false}>
            {!compact && (
              <LabelList dataKey="__total" position="top" formatter={(v) => (v > 0 ? formatCompactCurrency(v) : '')} style={{ ...LABEL_STYLE, fontSize: 10 }} />
            )}
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chip de margen %: verde = sano, ámbar = vigilar, rojo = pérdida
function MargenBadge({ pct }) {
  if (pct == null) return null
  const tone = pct >= 60 ? 'bg-emerald-100 text-emerald-700'
    : pct >= 40 ? 'bg-amber-100 text-amber-700'
    : pct >= 0 ? 'bg-orange-100 text-orange-700'
    : 'bg-red-100 text-red-700'
  return <span className={`inline-block px-1.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${tone}`}>{pct.toFixed(1)}%</span>
}

function MiniStat({ label, value, extra }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
      <p className="text-sm font-bold text-slate-700 tabular-nums">
        {value}
        {extra && <span className="ml-1.5 text-[11px] font-semibold text-red-500">{extra}</span>}
      </p>
    </div>
  )
}

function PlanPerfCard({ p, anioActual }) {
  const color = planColor(p.plan)
  const cobertura = p.mesesCobertura
    ? (p.mesesCobertura === 1 ? 'mensual' : `${p.mesesCobertura} meses`)
    : 'promoción'
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <h3 className="font-bold text-slate-800 truncate">{p.plan}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cobertura {cobertura}
            {!p.enCatalogo && <span className="text-amber-600 font-semibold"> · no está en el catálogo</span>}
          </p>
        </div>
        <GrowthBadge pct={p.crecimientoYTDPct} />
      </div>

      <div>
        <p className="text-2xl font-extrabold text-slate-800 tabular-nums">{formatCurrency(p.ingresos)}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(p.pctIngresos, 100)}%`, background: color }} />
          </div>
          <span className="text-xs font-semibold text-slate-500 tabular-nums whitespace-nowrap">{p.pctIngresos}% del ingreso</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <MiniStat label="Ventas" value={p.ventas.toLocaleString('es-CO')} />
        <MiniStat label="Ticket promedio" value={formatCurrency(p.ticketPromedio)} />
        <MiniStat
          label="Pantallas vigentes" value={p.pantallasVigentes}
          extra={p.pantallasVencidas > 0 ? `+${p.pantallasVencidas} vencidas` : null}
        />
        <MiniStat label="Clientes activos" value={p.clientesActivos} />
      </div>

      {p.pctRenovacion != null && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500 font-medium">Fidelidad (renovaciones)</span>
            <span className="font-bold text-slate-700 tabular-nums">{p.pctRenovacion}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${p.pctRenovacion >= 70 ? 'bg-emerald-500' : p.pctRenovacion >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${p.pctRenovacion}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{p.renovaciones.toLocaleString('es-CO')} renovaciones · {p.activaciones.toLocaleString('es-CO')} activaciones</p>
        </div>
      )}

      <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-2.5 mt-auto">
        Año corrido {anioActual}: <strong className="text-slate-600">{formatCurrency(p.ingresosYTD)}</strong>
        {p.ingresosYTDAnterior > 0 && <> · mismo periodo {anioActual - 1}: {formatCurrency(p.ingresosYTDAnterior)}</>}
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════ */

/** KPI card */

/** Skeleton table */
function SkeletonTable() {
  return (
    <div className="divide-y divide-slate-100">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
          <div className="flex-1 space-y-2">
            <div className="pl-skeleton h-4 rounded w-1/3" />
            <div className="pl-skeleton h-3 rounded w-1/2" />
          </div>
          <div className="pl-skeleton w-24 h-4 rounded hidden sm:block" />
          <div className="pl-skeleton w-16 h-4 rounded hidden md:block" />
          <div className="pl-skeleton w-14 h-5 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** Empty state */
function EmptyState({ onNew, hasSearch }) {
  return (
    <div className="py-20 flex flex-col items-center gap-5 text-center px-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-100 to-blue-50
                        flex items-center justify-center shadow-inner">
          <Layers size={36} className="text-sky-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-sky-500
                        flex items-center justify-center shadow-md">
          <Plus size={14} className="text-white" />
        </div>
      </div>
      <div className="max-w-xs">
        <p className="text-lg font-semibold text-slate-700">
          {hasSearch ? 'Sin resultados' : 'No hay planes'}
        </p>
        <p className="text-slate-400 text-sm mt-1.5">
          {hasSearch ? 'No se encontraron planes con esa búsqueda.' : 'Crea tu primer plan para comenzar a vender suscripciones.'}
        </p>
      </div>
      {!hasSearch && (
        <button onClick={onNew}
          className="pl-cta px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2">
          <Plus size={15} /> Nuevo Plan
        </button>
      )}
    </div>
  )
}

/** Confirm delete dialog */
function ConfirmDialog({ name, onConfirm, onCancel }) {
  return (
    <div className="pl-overlay fixed inset-0 bg-black/50 backdrop-blur-[3px] flex items-center justify-center z-[70] p-4" onClick={onCancel}>
      <div className="pl-confirm bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex gap-4 items-start">
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">¿Eliminar plan?</h3>
              {name && <p className="text-slate-500 text-sm mt-0.5">Plan: <strong className="text-slate-700">{name}</strong>.</p>}
              <p className="text-slate-400 text-xs mt-1">Si hay suscripciones usando este plan, podrían verse afectadas. Esta acción no se puede deshacer.</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="pl-btn-danger px-4 py-2 text-sm font-semibold text-white rounded-xl">Sí, eliminar</button>
        </div>
      </div>
    </div>
  )
}

/** Form field label */
function FieldLabel({ children }) {
  return <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{children}</label>
}

const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"

/** Section header inside drawer */
function DrawerSection({ children }) {
  return (
    <div className="flex items-center gap-3 pt-2 mb-1">
      <span className="text-[10px] font-bold tracking-[.14em] uppercase text-slate-400">{children}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

/** Slide-in drawer form */
function PlanDrawer({ editing, form, setForm, onSubmit, onClose }) {
  const [saving, setSaving] = useState(false)
  const submit = async (e) => { e.preventDefault(); setSaving(true); await onSubmit(e); setSaving(false) }

  return (
    <>
      <div className="pl-overlay fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50" onClick={onClose} />
      <div className="pl-drawer fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="absolute top-0 left-0 right-0 h-[3px]"
               style={{ background: 'linear-gradient(90deg,#0ea5e9,#3b82f6)' }} />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[.14em] uppercase text-sky-500 mb-0.5">
                {editing ? 'Editar registro' : 'Nuevo registro'}
              </p>
              <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {editing ? 'Editar Plan' : 'Nuevo Plan'}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Configura las características y el precio.</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all mt-0.5">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            <DrawerSection>Información General</DrawerSection>
            <div>
              <FieldLabel>Nombre del plan *</FieldLabel>
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required
                className={inputCls} placeholder="Ej. Plan Familiar Mensual" />
            </div>
            <div>
              <FieldLabel>Descripción</FieldLabel>
              <textarea value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                className={inputCls} rows={3} placeholder="Detalles de lo que incluye el plan..." />
            </div>

            <DrawerSection>Detalles Comerciales</DrawerSection>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Precio *</FieldLabel>
                <CurrencyInput value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} decimals={0}
                  className="border-slate-200 focus:ring-sky-400 text-sm rounded-xl" required />
              </div>
              <div>
                <FieldLabel>Estado</FieldLabel>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button type="button" onClick={() => setForm({ ...form, activo: true })}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${form.activo ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    Activo
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, activo: false })}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${!form.activo ? 'bg-white shadow text-slate-700' : 'text-slate-500 hover:text-slate-700'}`}>
                    Inactivo
                  </button>
                </div>
              </div>
              <div>
                <FieldLabel>Duración (días) *</FieldLabel>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="number" min="1" value={form.duracionDias} onChange={e => setForm({ ...form, duracionDias: e.target.value })} required
                    className={`${inputCls} pl-9`} />
                </div>
              </div>
              <div>
                <FieldLabel>N° Pantallas *</FieldLabel>
                <div className="relative">
                  <Monitor size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="number" min="1" value={form.numeroPantallas} onChange={e => setForm({ ...form, numeroPantallas: e.target.value })} required
                    className={`${inputCls} pl-9`} />
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600
                         border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="pl-cta flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                         flex items-center justify-center gap-2 disabled:opacity-60">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
                : editing ? 'Guardar cambios' : <><Plus size={15} />Crear plan</>
              }
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function PlansPage() {
  const { showToast } = useUi()
  const isMobile = useIsMobile()
  const [plans, setPlans] = useState([])
  const [perf, setPerf] = useState(null)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [catalogoRes, perfRes] = await Promise.all([
        api.get('/admin/plans'),
        api.get('/admin/plans/performance'),
      ])
      setPlans(catalogoRes.data)
      setPerf(perfRes.data)
    } catch (e) {
      showToast('Error al cargar los planes.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  /* ── Filter ── */
  const filtered = useMemo(() => {
    if (!search.trim()) return plans
    const s = search.toLowerCase()
    return plans.filter(p =>
      (p.nombre || '').toLowerCase().includes(s) ||
      (p.descripcion || '').toLowerCase().includes(s)
    )
  }, [plans, search])

  /* ── Stats del catálogo (sección de configuración) ── */
  const stats = useMemo(() => {
    const total = plans.length
    const activos = plans.filter(p => p.activo).length
    return { total, activos }
  }, [plans])

  /* ── Derivados del desempeño por plan ── */
  const planesPrincipales = useMemo(() => perf?.planes.filter(p => p.ventas >= 10) || [], [perf])
  const planesMenores = useMemo(() => perf?.planes.filter(p => p.ventas < 10) || [], [perf])

  const renovGlobal = useMemo(() => {
    if (!perf) return null
    const r = perf.planes.reduce((s, p) => s + p.renovaciones, 0)
    const a = perf.planes.reduce((s, p) => s + p.activaciones, 0)
    return r + a > 0 ? Number(((r / (r + a)) * 100).toFixed(1)) : null
  }, [perf])

  const donutData = useMemo(
    () => (perf ? perf.planes.filter(p => p.ingresos > 0).map(p => ({ name: p.plan, value: p.ingresos, pct: p.pctIngresos })) : []),
    [perf]
  )

  const serieKeys = useMemo(() => {
    if (!perf) return []
    const keys = [...perf.topPlanes]
    if (perf.serieMensual.some(m => m.Otros != null)) keys.push('Otros')
    return keys
  }, [perf])

  const planesFueraDeCatalogo = useMemo(
    () => planesPrincipales.filter(p => !p.enCatalogo),
    [planesPrincipales]
  )

  /* ── Serie mensual: ventana por año, planes visibles y lupa ── */
  const [serieAnio, setSerieAnio] = useState(null)          // null = últimos 12 meses
  const [seriePlanesOcultos, setSeriePlanesOcultos] = useState(() => new Set())
  const [chartZoom, setChartZoom] = useState(false)

  const aniosSerie = useMemo(
    () => (perf ? [...new Set(perf.serieMensual.map(m => m.key.slice(0, 4)))].sort((a, b) => b.localeCompare(a)) : []),
    [perf]
  )
  const serieActivos = useMemo(
    () => new Set(serieKeys.filter(k => !seriePlanesOcultos.has(k))),
    [serieKeys, seriePlanesOcultos]
  )
  const keysVisibles = useMemo(() => serieKeys.filter(k => serieActivos.has(k)), [serieKeys, serieActivos])

  const serieVisible = useMemo(() => {
    if (!perf) return []
    const rows = serieAnio == null
      ? perf.serieMensual.slice(-12)
      : perf.serieMensual.filter(m => m.key.startsWith(serieAnio))
    return rows.map(r => {
      const out = { ...r }
      let total = 0
      for (const k of serieKeys) {
        out[k] = r[k] || 0
        if (serieActivos.has(k)) total += r[k] || 0
      }
      out.__total = total
      return out
    })
  }, [perf, serieAnio, serieKeys, serieActivos])

  const toggleSeriePlan = (k) => {
    setSeriePlanesOcultos(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      // Nunca dejar el gráfico vacío: si se ocultó el último plan, se muestran todos
      if (serieKeys.every(x => next.has(x))) return new Set()
      return next
    })
  }

  const tituloSerie = serieAnio == null ? 'últimos 12 meses' : serieAnio

  // Cerrar la lupa con Escape
  useEffect(() => {
    if (!chartZoom) return
    const onKey = (e) => { if (e.key === 'Escape') setChartZoom(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chartZoom])

  // Economía de cada plan del catálogo con el costo VIGENTE por pantalla-mes:
  // costo = pantallas × (duración/30 meses) × costo pantalla-mes
  const costoCatalogo = (p) => {
    const vigente = perf?.costoPantalla?.vigente
    if (!vigente) return null
    const meses = (Number(p.duracionDias) || 0) / 30
    const costo = (Number(p.numeroPantallas) || 1) * meses * vigente
    const precio = Number(p.precio) || 0
    return {
      costo: Math.round(costo),
      margen: Math.round(precio - costo),
      pct: precio > 0 ? (precio - costo) / precio * 100 : null,
    }
  }

  /* ── Handlers ── */
  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = (p) => { setEditing(p); setForm({ ...EMPTY, ...p }); setShowForm(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      precio: Number(form.precio),
      duracionDias: Number(form.duracionDias),
      numeroPantallas: Number(form.numeroPantallas)
    }
    try {
      if (editing) {
        await api.put(`/admin/plans/${editing.id}`, payload)
        showToast('Plan actualizado correctamente.', 'success')
      } else {
        await api.post('/admin/plans', payload)
        showToast('Plan creado correctamente.', 'success')
      }
      setShowForm(false)
      load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/admin/plans/${deleteTarget.id}`)
      showToast('Plan eliminado correctamente.', 'success')
      load()
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="space-y-6 pb-8">

        {/* ── HERO HEADER ── */}
        <div className="pl-a1 relative rounded-3xl overflow-hidden"
             style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)' }}>
          <div className="pl-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.15] pointer-events-none"
               style={{ background: 'radial-gradient(circle,#0ea5e9,transparent 70%)' }} />
          <div className="pl-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.10] pointer-events-none"
               style={{ background: 'radial-gradient(circle,#3b82f6,transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[.03] pointer-events-none"
               style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

          <div className="relative px-5 py-6 sm:px-7 sm:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/25 mb-4">
                <Activity size={12} className="text-sky-400" />
                <span className="text-sky-400 text-xs font-semibold tracking-widest uppercase">Desempeño comercial</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight"
                  style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
                Planes
              </h1>
              <p className="text-slate-400 text-sm mt-2">
                Qué plan vende, retiene y sostiene el negocio — datos reales de Pagos y Planificador
              </p>
            </div>
            <button onClick={openNew}
              className="pl-cta shrink-0 px-5 py-3 rounded-2xl text-sm font-bold text-white flex items-center gap-2">
              <Plus size={17} /> Nuevo Plan
            </button>
          </div>
        </div>

        {/* ── KPIs de desempeño ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard icon={Wallet}    label="Ingresos por planes" value={perf ? formatCurrency(perf.totales.ingresos) : '—'} loading={loading} gradFrom="#f97316" gradTo="#fb923c" delay={2} sub="Histórico · sin cortesías ni cambios de plan" />
          <KpiCard icon={Monitor}   label="Base instalada"      value={perf ? `${perf.totales.pantallasVigentes} pantallas` : '—'} loading={loading} gradFrom="#0ea5e9" gradTo="#38bdf8" delay={3} sub="Vigentes hoy, según la última venta de cada una" />
          <KpiCard icon={Trophy}    label="Plan líder"          value={perf?.planes[0]?.plan || '—'} loading={loading} gradFrom="#8b5cf6" gradTo="#a78bfa" delay={4} sub={perf?.planes[0] ? `${perf.planes[0].pctIngresos}% del ingreso histórico` : ''} />
          <KpiCard icon={RefreshCw} label="Renovación global"   value={renovGlobal != null ? `${renovGlobal}%` : '—'} loading={loading} gradFrom="#10b981" gradTo="#34d399" delay={5} sub="De las ventas son renovaciones" />
        </div>

        {/* ── Desempeño por plan ── */}
        {perf && planesPrincipales.length > 0 && (
          <div className="pl-a3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {planesPrincipales.map(p => <PlanPerfCard key={p.plan} p={p} anioActual={perf.anioActual} />)}
            </div>
            <ChartInsight text={narrarPlanes(perf)} />
          </div>
        )}

        {/* ── Charts: composición del ingreso + tendencia mensual ── */}
        {perf && donutData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 pl-a4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 lg:col-span-2">
              <h3 className="font-bold text-slate-800">Composición del ingreso por plan</h3>
              <p className="text-xs text-slate-400 mb-2">Histórico de ventas de licencias ($ COP)</p>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={88} paddingAngle={3} label={renderDonutLabel} labelLine={false}>
                    {donutData.map((d, i) => <Cell key={i} fill={planColor(d.name)} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {donutData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: planColor(d.name) }} />
                      {d.name}
                    </span>
                    <span className="font-semibold text-slate-700 tabular-nums">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 lg:col-span-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-slate-800">Ingresos por plan — {tituloSerie}</h3>
                  <p className="text-xs text-slate-400">Barras apiladas ($ COP) · la etiqueta sobre cada barra es el total del mes de los planes visibles</p>
                </div>
                <button
                  onClick={() => setChartZoom(true)} title="Ampliar gráfico"
                  className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors flex-shrink-0"
                >
                  <ZoomIn size={17} />
                </button>
              </div>
              <div className="mb-3">
                <SerieControls anios={aniosSerie} anio={serieAnio} onAnio={setSerieAnio} keys={serieKeys} activos={serieActivos} onToggle={toggleSeriePlan} />
              </div>
              {serieVisible.length > 0
                ? <SeriePlanChart data={serieVisible} keys={keysVisibles} className="h-60 sm:h-72" compact={isMobile} />
                : <div className="py-16 text-center text-sm text-slate-400">Sin ventas registradas en {tituloSerie}.</div>}
            </div>
          </div>
        )}

        {/* ── Promociones y planes menores ── */}
        {perf && planesMenores.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 pl-a4">
            <h3 className="font-bold text-slate-800">Promociones y planes menores</h3>
            <p className="text-xs text-slate-400 mb-3">
              Con pocas ventas registradas — costo estimado con el costo por pantalla-mes del año de cada venta (módulo Costo Pantalla)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="py-2 pr-4 font-semibold">Plan</th>
                    <th className="py-2 pr-4 font-semibold text-right">Ventas</th>
                    <th className="py-2 pr-4 font-semibold text-right">Ingresos</th>
                    <th className="py-2 pr-4 font-semibold text-right">Costo pantallas</th>
                    <th className="py-2 pr-4 font-semibold text-right">Rentabilidad</th>
                    <th className="py-2 font-semibold text-right">Pantallas vigentes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {planesMenores.map(p => (
                    <tr key={p.plan}>
                      <td className="py-2.5 pr-4 font-medium text-slate-700">{p.plan}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">{p.ventas}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">{formatCurrency(p.ingresos)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">
                        {p.costoEstimado != null ? formatCurrency(p.costoEstimado) : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {p.margenEstimado != null ? (
                          <span className="inline-flex items-center gap-2">
                            <span className={`font-semibold tabular-nums ${p.margenEstimado >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                              {formatCurrency(p.margenEstimado)}
                            </span>
                            <MargenBadge pct={p.margenPctEstimado} />
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-slate-600">{p.pantallasVigentes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CATÁLOGO DE VENTA (configuración) ── */}
        <div className="pl-a4 pt-2">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-slate-800">Catálogo de venta</h2>
            <p className="text-xs text-slate-400">
              {stats.total} plan{stats.total === 1 ? '' : 'es'} definido{stats.total === 1 ? '' : 's'} · {stats.activos} activo{stats.activos === 1 ? '' : 's'} — es la plantilla de configuración para crear suscripciones, no el histórico de ventas
            </p>
            {perf?.costoPantalla?.vigente > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                Costo pantallas estimado con el costo vigente por pantalla-mes: <strong className="text-slate-600">{formatCurrency(perf.costoPantalla.vigente)}</strong> (promedio de {perf.costoPantalla.recargasVigente} recarga{perf.costoPantalla.recargasVigente === 1 ? '' : 's'} de {perf.costoPantalla.anioVigente} en el módulo Costo Pantalla)
              </p>
            )}
          </div>
          {planesFueraDeCatalogo.length > 0 && (
            <div className="flex gap-2.5 items-start bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                El catálogo no coincide con los planes que realmente se venden: <strong>{planesFueraDeCatalogo.map(p => p.plan).join(', ')}</strong> no existe{planesFueraDeCatalogo.length === 1 ? '' : 'n'} aquí. Créalos para alinear la configuración con la operación real.
              </p>
            </div>
          )}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="search" placeholder="Buscar por nombre o descripción…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-search w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200
                           bg-white text-sm text-slate-700 placeholder:text-slate-400 transition-shadow" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            {loading
              ? <SkeletonTable />
              : filtered.length === 0
                ? <EmptyState onNew={openNew} hasSearch={search.trim().length > 0} />
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500 font-semibold">
                          <th className="px-6 py-4">Nombre del Plan</th>
                          <th className="px-6 py-4">Precio</th>
                          <th className="px-6 py-4">Duración</th>
                          <th className="px-6 py-4 text-center">Pantallas</th>
                          <th className="px-6 py-4 text-right">Costo pantallas</th>
                          <th className="px-6 py-4 text-right">Rentabilidad</th>
                          <th className="px-6 py-4 text-center">Estado</th>
                          <th className="px-6 py-4 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map(p => {
                          const eco = costoCatalogo(p)
                          return (
                          <tr key={p.id} className="pl-row hover:bg-slate-50/50">
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-800">{p.nombre}</p>
                              {p.descripcion && <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{p.descripcion}</p>}
                            </td>
                            <td className="px-6 py-4 font-bold text-sky-600">
                              {formatCurrency(p.precio)}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              <span className="inline-flex items-center gap-1.5"><Calendar size={14} className="text-slate-400"/> {Math.round(p.duracionDias)} días</span>
                            </td>
                            <td className="px-6 py-4 text-center text-slate-600">
                              <span className="inline-flex items-center gap-1.5"><Monitor size={14} className="text-slate-400"/> {p.numeroPantallas}</span>
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums text-slate-600">
                              {eco ? formatCurrency(eco.costo) : '—'}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              {eco ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className={`font-semibold tabular-nums ${eco.margen >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                                    {formatCurrency(eco.margen)}
                                  </span>
                                  <MargenBadge pct={eco.pct} />
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {p.activo
                                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><CheckCircle2 size={10} />Activo</span>
                                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500"><XCircle size={10} />Inactivo</span>}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEdit(p)}
                                  className="pl-action-btn w-8 h-8 rounded-lg flex items-center justify-center text-sky-500 hover:bg-sky-50"
                                  title="Editar">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => setDeleteTarget(p)}
                                  className="pl-action-btn w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50"
                                  title="Eliminar">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
            }
          </div>
        </div>

      </div>

      {/* ── LUPA: gráfico de serie mensual ampliado ──
           En móvil es una hoja a pantalla completa; en escritorio, un modal centrado */}
      {chartZoom && perf && (
        <div
          className="pl-overlay fixed inset-0 bg-black/60 backdrop-blur-[3px] z-[70] flex items-stretch sm:items-center justify-center p-0 sm:p-8"
          onClick={() => setChartZoom(false)}
        >
          <div
            className="pl-confirm bg-white w-full h-full sm:h-auto sm:rounded-2xl sm:shadow-2xl sm:max-w-6xl sm:max-h-[92vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">Ingresos por plan — {tituloSerie}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Barras apiladas ($ COP){isMobile ? ' · toca una barra para ver el detalle' : ' · la etiqueta sobre cada barra es el total del mes de los planes visibles · Esc para cerrar'}
                </p>
              </div>
              <button
                onClick={() => setChartZoom(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-4 sm:px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <SerieControls anios={aniosSerie} anio={serieAnio} onAnio={setSerieAnio} keys={serieKeys} activos={serieActivos} onToggle={toggleSeriePlan} />
              {serieVisible.length > 0
                ? <SeriePlanChart data={serieVisible} keys={keysVisibles} className="h-[60vh] sm:h-[460px]" compact={isMobile} />
                : <div className="py-16 text-center text-sm text-slate-400">Sin ventas registradas en {tituloSerie}.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER ── */}
      {showForm && (
        <PlanDrawer
          editing={editing}
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* ── CONFIRM DELETE ── */}
      {deleteTarget && (
        <ConfirmDialog
          name={deleteTarget.nombre}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
