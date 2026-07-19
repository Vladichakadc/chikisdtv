import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Wallet, Percent, PiggyBank, Activity,
  Landmark, AlertTriangle, Lightbulb, Scale, DollarSign, Hourglass,
  Target, Users, UserCheck, Tv, Repeat, Gem, Clock, AlertCircle,
  Package, ShoppingCart, BarChart2, Info,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, AreaChart, Area, Cell, ReferenceLine, LabelList,
} from 'recharts'
import api from '../../config/api'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { KpiCard } from '../../components/ui/KpiCard'
import { formatCurrency } from '../../utils/excelUtils'
import { cn } from '../../utils/cn'
import {
  BiCard, ChartInsight, LABEL_STYLE, MomentumValueLabel,
  tagMarkup, tagCobertura, tagPuntoEquilibrio, tagConcentracion, tagArpu, tagPantalla,
  tagLtv, tagValorEnRiesgo,
  narrarPareto, narrarProductividad, narrarMomentum, narrarMrr, narrarLtv,
} from './dashboard/biShared'
import { IngresoPorClientePanel } from './dashboard/IngresoPorClientePanel'

// ─── Formateadores ───────────────────────────────────────────────────────────

const fmtM = (v) => {
  if (v == null) return '—'
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`
  if (abs >= 1_000) return `$${(v / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 0 })}K`
  return `$${v.toLocaleString('es-CO')}`
}

const tooltipMoney = (value, name) => [formatCurrency(value), name]

const CSS = `
  @keyframes fin-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fin-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes fin-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  .fin-a1 { animation: fin-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .fin-a2 { animation: fin-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .fin-a3 { animation: fin-fade-up .45s cubic-bezier(.22,1,.36,1) .12s both }
  .fin-orb-1 { animation: fin-orb-1 8s ease-in-out infinite }
  .fin-orb-2 { animation: fin-orb-2 11s ease-in-out infinite }
  .fin-kpi { transition: transform .25s ease, box-shadow .25s ease }
  .fin-kpi:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.12) }
  @media (prefers-reduced-motion: reduce) {
    .fin-a1, .fin-a2, .fin-a3, .fin-orb-1, .fin-orb-2 { animation: none !important; transition: none !important }
  }
`

// ─── KPI card (con clic → modal explicativo) ────────────────────────────────

// ─── Gráfico de Concentración (curva de Lorenz/Pareto) ───────────────────────

// Puntos clave donde se colocan etiquetas de anotación (20 %, 50 %, 80 %)
const PARETO_HITOS = [20, 50, 80]

// Tooltip enriquecido: muestra la brecha entre la curva real y la diagonal
function ParetoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const real = payload.find(p => p.dataKey === 'pctIngresos')?.value ?? null
  const brecha = real != null ? (real - label).toFixed(1) : null
  return (
    <div style={{
      background: 'rgba(255,255,255,0.97)',
      border: '1px solid #fed7aa',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
      minWidth: 210,
    }}>
      <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
        {label}% de los clientes
      </p>
      {real != null && (
        <p style={{ color: '#f97316', fontWeight: 600 }}>
          📊 Ingreso acumulado: <strong>{real}%</strong>
        </p>
      )}
      {brecha != null && Number(brecha) > 0 && (
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          ↑ {brecha}pts sobre distribución equitativa
        </p>
      )}
      <p style={{ color: '#94a3b8', marginTop: 3 }}>
        Línea punteada: distribución ideal (igual para todos)
      </p>
    </div>
  )
}

// Dot personalizado: resalta los hitos clave con un círculo naranja + etiqueta
function ParetoCustomDot({ cx, cy, payload }) {
  if (!PARETO_HITOS.includes(payload?.pctClientes)) return null
  const ingreso = payload?.pctIngresos
  if (ingreso == null) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#f97316" stroke="#fff" strokeWidth={2.5} />
      {/* Etiqueta: ingreso % sobre el punto */}
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="#ea580c"
        stroke="#fff"
        strokeWidth={3}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {ingreso}%
      </text>
    </g>
  )
}

function ParetoChart({ data }) {
  if (!data?.length) return (
    <div style={{ height: 290, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
      Sin datos de concentración disponibles
    </div>
  )
  return (
    <ResponsiveContainer width="100%" height={290}>
      <ComposedChart data={data} margin={{ top: 20, right: 24, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="paretoFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f97316" stopOpacity={0.30} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.45} />
        <XAxis
          dataKey="pctClientes"
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: '#78716c' }}
          label={{ value: '% de clientes', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: '#9ca3af' }}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#78716c' }}
          label={{ value: '% ingreso acum.', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11, fill: '#9ca3af' }}
        />
        <Tooltip content={<ParetoTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(value) => <span style={{ color: '#374151' }}>{value}</span>}
        />
        {/* Línea de referencia en el 20% de clientes — regla Pareto */}
        <ReferenceLine
          x={20}
          stroke="#a855f7"
          strokeDasharray="4 3"
          strokeWidth={1.5}
          label={{
            value: 'Pareto 80/20',
            position: 'top',
            fontSize: 10,
            fontWeight: 700,
            fill: '#a855f7',
            offset: 4,
          }}
        />
        {/* Área: curva de concentración real */}
        <Area
          type="monotone"
          dataKey="pctIngresos"
          name="Ingreso acumulado"
          stroke="#f97316"
          strokeWidth={2.5}
          fill="url(#paretoFill)"
          dot={<ParetoCustomDot />}
          activeDot={{ r: 7, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
        />
        {/* Línea diagonal: distribución perfectamente equitativa */}
        <Line
          type="monotone"
          dataKey="pctClientes"
          name="Distribución equitativa"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={false}
          activeDot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Gráfico de Productividad por pantalla ───────────────────────────────────

const PROD_COLORES = {
  Ingreso: { bar: '#f97316', gradId: 'prodIngreso', dark: '#ea580c' },
  Costo:   { bar: '#94a3b8', gradId: 'prodCosto',   dark: '#64748b' },
  Margen:  { bar: '#16a34a', gradId: 'prodMargen',  dark: '#15803d' },
}

function ProductividadTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const v = item?.value ?? 0
  const margenPct = label === 'Margen' && payload[0]?.payload?.ingreso > 0
    ? ((v / payload[0]?.payload?.ingreso) * 100).toFixed(1)
    : null
  const desc = {
    Ingreso: 'Promedio histórico de ingresos generados por cada pantalla activa',
    Costo:   'Costo promedio por pantalla (recargas + impuestos)',
    Margen:  'Lo que queda por pantalla después de cubrir costos',
  }
  const color = PROD_COLORES[label]?.dark ?? '#374151'
  return (
    <div style={{
      background: 'rgba(255,255,255,0.97)',
      border: `1px solid ${color}40`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
      minWidth: 230,
    }}>
      <p style={{ fontWeight: 700, color, marginBottom: 5 }}>{label} por pantalla</p>
      <p style={{ color: '#1e293b', fontSize: 15, fontWeight: 700 }}>{formatCurrency(v)}</p>
      {margenPct && (
        <p style={{ color: '#16a34a', marginTop: 4, fontWeight: 600 }}>
          {margenPct}% de margen sobre el ingreso
        </p>
      )}
      <p style={{ color: '#9ca3af', marginTop: 6, lineHeight: 1.5 }}>{desc[label]}</p>
    </div>
  )
}

function ProductividadChart({ kpis }) {
  const ingreso = kpis.ingresoPorPantalla ?? 0
  const costo   = kpis.costoPorPantalla   ?? 0
  const margen  = ingreso - costo
  const margenPct = ingreso > 0 ? (margen / ingreso) * 100 : 0

  const data = [
    { concepto: 'Ingreso', valor: ingreso, ingreso },
    { concepto: 'Costo',   valor: costo,   ingreso },
    { concepto: 'Margen',  valor: margen,  ingreso },
  ]

  // Semáforo de eficiencia
  const eficiencia = margenPct >= 60
    ? { color: '#16a34a', bg: '#dcfce7', texto: 'Unidad muy rentable', emoji: '🟢' }
    : margenPct >= 40
    ? { color: '#ca8a04', bg: '#fef9c3', texto: 'Margen saludable',    emoji: '🟡' }
    : { color: '#dc2626', bg: '#fee2e2', texto: 'Margen ajustado',     emoji: '🔴' }

  // Renderizador de etiqueta doble: valor + porcentaje del ingreso
  const renderLabel = (props) => {
    const { x, y, width, height, value, index } = props
    if (!value) return null
    const pct = ingreso > 0 ? ((value / ingreso) * 100).toFixed(0) : null
    const labelX = x + width + 8
    const labelY = y + height / 2
    const colors = ['#ea580c', '#475569', '#15803d']
    return (
      <g>
        <text
          x={labelX} y={labelY - 5}
          dominantBaseline="central"
          fontSize={12} fontWeight={700}
          fill={colors[index] ?? '#374151'}
          stroke="#fff" strokeWidth={3} strokeLinejoin="round" paintOrder="stroke"
        >
          {formatCurrency(value)}
        </text>
        {pct && (
          <text
            x={labelX} y={labelY + 10}
            dominantBaseline="central"
            fontSize={10} fontWeight={600}
            fill="#9ca3af"
          >
            {index === 0 ? '100%' : `${pct}% del ingreso`}
          </text>
        )}
      </g>
    )
  }

  return (
    <div>
      {/* Badge de eficiencia */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: eficiencia.bg, border: `1px solid ${eficiencia.color}30`,
        borderRadius: 20, padding: '4px 12px', marginBottom: 12, fontSize: 12,
      }}>
        <span>{eficiencia.emoji}</span>
        <span style={{ fontWeight: 700, color: eficiencia.color }}>{eficiencia.texto}</span>
        <span style={{ color: '#6b7280' }}>·</span>
        <span style={{ color: eficiencia.color, fontWeight: 600 }}>{margenPct.toFixed(1)}% margen</span>
        <span style={{ color: '#6b7280' }}>·</span>
        <span style={{ color: '#6b7280' }}>{kpis.totalPantallas} pantallas activas</span>
      </div>

      {/* Mini gauge de margen */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginBottom: 3 }}>
          <span>Margen sobre ingreso</span>
          <span style={{ fontWeight: 700, color: eficiencia.color }}>{margenPct.toFixed(1)}%</span>
        </div>
        <div style={{ background: '#f1f5f9', borderRadius: 6, height: 6, overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(margenPct, 100)}%`,
            height: '100%',
            borderRadius: 6,
            background: `linear-gradient(90deg, ${eficiencia.color}aa, ${eficiencia.color})`,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <ComposedChart
          data={data}
          layout="vertical"
          margin={{ top: 6, right: 160, left: 10, bottom: 6 }}
        >
          <defs>
            <linearGradient id="prodIngreso" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#fb923c" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="prodCosto" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#64748b" stopOpacity={0.70} />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="prodMargen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#16a34a" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
            tick={{ fontSize: 11, fill: '#78716c' }}
            label={{ value: 'Valor promedio por pantalla', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#9ca3af' }}
          />
          <YAxis
            type="category"
            dataKey="concepto"
            tick={{ fontSize: 12, fill: '#374151', fontWeight: 700 }}
            width={62}
          />
          <Tooltip content={<ProductividadTooltip />} cursor={{ fill: 'rgba(249,115,22,0.06)' }} />
          <Bar dataKey="valor" radius={[0, 8, 8, 0]} barSize={38}>
            {data.map((entry) => (
              <Cell
                key={entry.concepto}
                fill={`url(#${PROD_COLORES[entry.concepto]?.gradId ?? 'prodIngreso'})`}
              />
            ))}
            <LabelList dataKey="valor" content={renderLabel} />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── EBITDA mensual de licencias y margen ──────────────────────────────────
function EbitdaMensualTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const ebitda = payload.find(p => p.dataKey === 'ebitda')?.value
  const margen = payload.find(p => p.dataKey === 'margenEbitdaPct')?.value
  const positivo = ebitda >= 0
  return (
    <div style={{ background:'rgba(255,255,255,0.97)', border:`1px solid ${positivo?'#10b981':'#ef4444'}40`, borderLeft:`3px solid ${positivo?'#10b981':'#ef4444'}`, borderRadius:10, padding:'10px 14px', fontSize:12, boxShadow:'0 4px 20px rgba(0,0,0,0.10)', minWidth:210 }}>
      <p style={{ fontWeight:700, color:'#1e293b', marginBottom:6 }}>{label}</p>
      {ebitda != null && <p style={{ color: positivo?'#16a34a':'#dc2626', fontWeight:700, fontSize:14 }}>{positivo?'':'-'}{formatCurrency(Math.abs(ebitda))} EBITDA</p>}
      {margen != null && <p style={{ color:'#8b5cf6', fontWeight:600, marginTop:4 }}>{margen.toFixed(1)}% margen</p>}
      <p style={{ color:'#9ca3af', marginTop:5 }}>{positivo ? 'El negocio cubre todos sus costos operativos este mes.' : 'Los costos superan los ingresos este mes.'}</p>
    </div>
  )
}
function EbitdaMensualChart({ data }) {
  if (!data?.length) return <div style={{ height:290, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:13 }}>Sin datos disponibles</div>
  const maxEbitda = Math.max(...data.map(d => d.ebitda ?? 0))
  const maxMes = data.find(d => d.ebitda === maxEbitda)
  return (
    <ResponsiveContainer width="100%" height={290}>
      <ComposedChart data={data} margin={{ top:20, right:48, left:4, bottom:4 }}>
        <defs>
          <linearGradient id="ebitdaPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.9}/>
            <stop offset="100%" stopColor="#34d399" stopOpacity={0.75}/>
          </linearGradient>
          <linearGradient id="ebitdaNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.85}/>
            <stop offset="100%" stopColor="#f87171" stopOpacity={0.7}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize:10, fill:'#78716c' }} label={{ value:'Mes', position:'insideBottomRight', offset:-4, fontSize:10, fill:'#9ca3af' }}/>
        <YAxis yAxisId="cop" tickFormatter={fmtM} tick={{ fontSize:10, fill:'#78716c' }} width={60} label={{ value:'EBITDA (COP)', angle:-90, position:'insideLeft', offset:8, fontSize:10, fill:'#9ca3af' }}/>
        <YAxis yAxisId="pct" orientation="right" tickFormatter={v=>`${v}%`} tick={{ fontSize:10, fill:'#8b5cf6' }} width={44}/>
        <Tooltip content={<EbitdaMensualTooltip />} />
        <Legend wrapperStyle={{ fontSize:12 }} formatter={v => <span style={{ color:'#374151' }}>{v}</span>}/>
        <ReferenceLine yAxisId="cop" y={0} stroke="#94a3b8" strokeDasharray="4 2" strokeWidth={1.5}/>
        <Bar yAxisId="cop" dataKey="ebitda" name="EBITDA licencias" radius={[4,4,0,0]}>
          {data.map((m,i) => <Cell key={i} fill={m.ebitda >= 0 ? 'url(#ebitdaPos)' : 'url(#ebitdaNeg)'} />)}
        </Bar>
        <Line yAxisId="pct" dataKey="margenEbitdaPct" name="Margen %" stroke="#8b5cf6" strokeWidth={2.5} dot={false} connectNulls activeDot={{ r:5, fill:'#8b5cf6', stroke:'#fff', strokeWidth:2 }}/>
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Estructura anual: ingresos, OPEX y EBITDA ───────────────────────────
function EstructuraAnualTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const ingresos = payload.find(p => p.dataKey === 'ingresos')?.value
  const opex     = payload.find(p => p.dataKey === 'opex')?.value
  const ebitda   = payload.find(p => p.dataKey === 'ebitda')?.value
  const margenPct = (ingresos && ebitda) ? ((ebitda/ingresos)*100).toFixed(1) : null
  return (
    <div style={{ background:'rgba(255,255,255,0.97)', border:'1px solid #fed7aa', borderLeft:'3px solid #f97316', borderRadius:10, padding:'10px 14px', fontSize:12, boxShadow:'0 4px 20px rgba(0,0,0,0.10)', minWidth:230 }}>
      <p style={{ fontWeight:700, color:'#1e293b', marginBottom:6 }}>Ejercicio {label}</p>
      {ingresos != null && <p style={{ color:'#f97316', fontWeight:600 }}>📥 Ingresos: <strong>{formatCurrency(ingresos)}</strong></p>}
      {opex != null && <p style={{ color:'#64748b', fontWeight:600, marginTop:2 }}>💸 OPEX: <strong>{formatCurrency(opex)}</strong></p>}
      {ebitda != null && <p style={{ color:'#10b981', fontWeight:700, marginTop:4, fontSize:13 }}>✅ EBITDA: <strong>{formatCurrency(ebitda)}</strong></p>}
      {margenPct && <p style={{ color:'#9ca3af', marginTop:4 }}>Margen EBITDA: {margenPct}%</p>}
    </div>
  )
}
function EstructuraAnualLabelTop({ x, y, width, value }) {
  if (!value) return null
  return (
    <text x={x+width/2} y={y-5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#ea580c" stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" paintOrder="stroke">
      {fmtM(value)}
    </text>
  )
}
function EstructuraAnualChart({ data }) {
  if (!data?.length) return <div style={{ height:270, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:13 }}>Sin datos anuales</div>
  return (
    <ResponsiveContainer width="100%" height={270}>
      <ComposedChart data={data} margin={{ top:28, right:12, left:4, bottom:4 }}>
        <defs>
          <linearGradient id="gradIngreso" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.95}/>
            <stop offset="100%" stopColor="#fb923c" stopOpacity={0.80}/>
          </linearGradient>
          <linearGradient id="gradOpex" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity={0.6}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="anio" tick={{ fontSize:11, fill:'#374151', fontWeight:600 }}/>
        <YAxis tickFormatter={fmtM} tick={{ fontSize:10, fill:'#78716c' }} width={60} label={{ value:'COP', angle:-90, position:'insideLeft', offset:8, fontSize:10, fill:'#9ca3af' }}/>
        <Tooltip content={<EstructuraAnualTooltip />}/>
        <Legend wrapperStyle={{ fontSize:12 }} formatter={v => <span style={{ color:'#374151' }}>{v}</span>}/>
        <Bar dataKey="ingresos" name="Ingresos licencias" fill="url(#gradIngreso)" radius={[4,4,0,0]}>
          <LabelList dataKey="ingresos" content={EstructuraAnualLabelTop} />
        </Bar>
        <Bar dataKey="opex" name="OPEX" fill="url(#gradOpex)" radius={[4,4,0,0]}/>
        <Line dataKey="ebitda" name="EBITDA" stroke="#10b981" strokeWidth={2.5} dot={{ r:4, fill:'#10b981', stroke:'#fff', strokeWidth:2 }} activeDot={{ r:6 }}
          label={({ x, y, value }) => value ? (<text x={x} y={y-10} textAnchor="middle" fontSize={10} fontWeight={700} fill="#059669" stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" paintOrder="stroke">{fmtM(value)}</text>) : null}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Flujo de caja acumulado ───────────────────────────────────────────────────
function FlujoCajaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const v = payload[0]?.value ?? 0
  const positivo = v >= 0
  return (
    <div style={{ background:'rgba(255,255,255,0.97)', border:`1px solid ${positivo?'#10b981':'#ef4444'}40`, borderLeft:`3px solid ${positivo?'#10b981':'#ef4444'}`, borderRadius:10, padding:'10px 14px', fontSize:12, boxShadow:'0 4px 20px rgba(0,0,0,0.10)', minWidth:220 }}>
      <p style={{ fontWeight:700, color:'#1e293b', marginBottom:6 }}>{label}</p>
      <p style={{ color: positivo?'#16a34a':'#dc2626', fontWeight:700, fontSize:14 }}>Acumulado: {positivo?'':'-'}{formatCurrency(Math.abs(v))}</p>
      <p style={{ color:'#9ca3af', marginTop:5 }}>{positivo ? 'El negocio lleva superávit acumulado hasta este mes.' : 'El negocio aún está en zona de déficit acumulado.'}</p>
    </div>
  )
}
function FlujoCajaChart({ data }) {
  if (!data?.length) return <div style={{ height:270, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:13 }}>Sin datos de flujo</div>
  const ultimoVal = data[data.length - 1]?.flujoAcumulado ?? 0
  const positivo = ultimoVal >= 0
  const colorLinea = positivo ? '#10b981' : '#ef4444'
  const colorFill  = positivo ? '#10b981' : '#ef4444'
  return (
    <ResponsiveContainer width="100%" height={270}>
      <AreaChart data={data} margin={{ top:20, right:16, left:4, bottom:4 }}>
        <defs>
          <linearGradient id="gradFlujoLic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorFill} stopOpacity={0.30}/>
            <stop offset="100%" stopColor={colorFill} stopOpacity={0.02}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize:10, fill:'#78716c' }} interval="preserveStartEnd" label={{ value:'Mes', position:'insideBottomRight', offset:-4, fontSize:10, fill:'#9ca3af' }}/>
        <YAxis tickFormatter={fmtM} tick={{ fontSize:10, fill:'#78716c' }} width={62} label={{ value:'Acumulado (COP)', angle:-90, position:'insideLeft', offset:8, fontSize:10, fill:'#9ca3af' }}/>
        <Tooltip content={<FlujoCajaTooltip />}/>
        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" strokeWidth={1.5} label={{ value:'Punto de equilibrio', position:'insideTopLeft', fontSize:10, fill:'#94a3b8' }}/>
        <Area dataKey="flujoAcumulado" name="Flujo acumulado" stroke={colorLinea} strokeWidth={2.5} fill="url(#gradFlujoLic)" dot={false} activeDot={{ r:5, fill:colorLinea, stroke:'#fff', strokeWidth:2 }}/>
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Exposición cambiaria: TRM vs OPEX mensual ──────────────────────────────
function TrmOpexTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const opex = payload.find(p => p.dataKey === 'opex')?.value
  const trm  = payload.find(p => p.dataKey === 'trmPromedio')?.value
  return (
    <div style={{ background:'rgba(255,255,255,0.97)', border:'1px solid #bfdbfe', borderLeft:'3px solid #3b82f6', borderRadius:10, padding:'10px 14px', fontSize:12, boxShadow:'0 4px 20px rgba(0,0,0,0.10)', minWidth:230 }}>
      <p style={{ fontWeight:700, color:'#1e293b', marginBottom:6 }}>{label}</p>
      {opex != null && <p style={{ color:'#64748b', fontWeight:600 }}>💸 OPEX (recargas): <strong>{formatCurrency(opex)}</strong></p>}
      {trm != null && <p style={{ color:'#3b82f6', fontWeight:700, marginTop:4 }}>💱 TRM promedio: <strong>${Number(trm).toLocaleString('es-CO')}</strong></p>}
      {trm != null && <p style={{ color:'#9ca3af', marginTop:5 }}>Cuando la TRM sube, cada crédito cuesta más pesos aunque el precio en USD no varíe.</p>}
    </div>
  )
}
function TrmOpexChart({ data }) {
  if (!data?.length) return <div style={{ height:260, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:13 }}>Sin datos cambiarios</div>
  // Calcular variación TRM para el badge
  const primera = data.find(d => d.trmPromedio)
  const ultima  = [...data].reverse().find(d => d.trmPromedio)
  const varTrm  = (primera && ultima && primera !== ultima) ? ((ultima.trmPromedio - primera.trmPromedio) / primera.trmPromedio) * 100 : null
  const trmRiesgo = varTrm != null
    ? (varTrm > 5  ? { color:'#dc2626', bg:'#fee2e2', texto:`TRM +${varTrm.toFixed(1)}% — riesgo cambiario alto`, emoji:'🔴' }
      : varTrm < -5 ? { color:'#16a34a', bg:'#dcfce7', texto:`TRM ${varTrm.toFixed(1)}% — viento a favor`, emoji:'🟢' }
      : { color:'#ca8a04', bg:'#fef9c3', texto:`TRM ${varTrm >= 0 ? '+' : ''}${varTrm.toFixed(1)}% — estable`, emoji:'🟡' })
    : null
  return (
    <div>
      {trmRiesgo && (
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:trmRiesgo.bg, border:`1px solid ${trmRiesgo.color}30`, borderRadius:20, padding:'4px 12px', marginBottom:12, fontSize:12 }}>
          <span>{trmRiesgo.emoji}</span>
          <span style={{ fontWeight:700, color:trmRiesgo.color }}>{trmRiesgo.texto}</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top:10, right:60, left:4, bottom:4 }}>
          <defs>
            <linearGradient id="gradOpexTrm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.75}/>
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity={0.55}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize:10, fill:'#78716c' }} interval="preserveStartEnd"/>
          <YAxis yAxisId="opex" tickFormatter={fmtM} tick={{ fontSize:10, fill:'#78716c' }} width={60} label={{ value:'OPEX (COP)', angle:-90, position:'insideLeft', offset:8, fontSize:10, fill:'#9ca3af' }}/>
          <YAxis yAxisId="trm" orientation="right" tickFormatter={v=>`$${v.toLocaleString('es-CO')}`} tick={{ fontSize:10, fill:'#3b82f6' }} width={58} domain={['auto','auto']} label={{ value:'TRM ($)', angle:90, position:'insideRight', offset:8, fontSize:10, fill:'#3b82f6' }}/>
          <Tooltip content={<TrmOpexTooltip />}/>
          <Legend wrapperStyle={{ fontSize:12 }} formatter={v => <span style={{ color:'#374151' }}>{v}</span>}/>
          <Bar yAxisId="opex" dataKey="opex" name="OPEX (recargas)" fill="url(#gradOpexTrm)" radius={[3,3,0,0]}/>
          <Line yAxisId="trm" dataKey="trmPromedio" name="TRM promedio" stroke="#3b82f6" strokeWidth={2.5} dot={false} connectNulls activeDot={{ r:5, fill:'#3b82f6', stroke:'#fff', strokeWidth:2 }}/>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Momentum de ventas ───────────────────────────────────────────────────────
function MomentumTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const v = payload[0]?.value ?? 0
  const pos = v >= 0
  return (
    <div style={{ background:'rgba(255,255,255,0.97)', border:`1px solid ${pos?'#16a34a':'#ef4444'}40`, borderLeft:`3px solid ${pos?'#16a34a':'#ef4444'}`, borderRadius:10, padding:'10px 14px', fontSize:12, boxShadow:'0 4px 20px rgba(0,0,0,0.10)', minWidth:220 }}>
      <p style={{ fontWeight:700, color:'#1e293b', marginBottom:5 }}>{label}</p>
      <p style={{ color:pos?'#16a34a':'#dc2626', fontWeight:800, fontSize:15 }}>{pos?'+':''}{v.toFixed(1)}%</p>
      <p style={{ color:'#9ca3af', marginTop:5 }}>
        {pos
          ? 'Este mes los ingresos crecieron frente al mes anterior.'
          : 'Este mes los ingresos cayeron frente al mes anterior.'}
      </p>
    </div>
  )
}
function MomentumChart({ data, kMomentum }) {
  if (!data?.length) return <div style={{ height:270, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:13 }}>Sin datos de momentum</div>
  const positivos = data.filter(d => d.variacionPct >= 0).length
  const negativos = data.length - positivos
  const momentum = kMomentum ?? 0
  const momColor = momentum >= 0 ? '#16a34a' : '#dc2626'
  const momBg    = momentum >= 0 ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)'
  return (
    <div>
      {/* Badge resumen */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, background: momentum >= 0 ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)', border:`1px solid ${momColor}30`, borderRadius:20, padding:'4px 12px', fontSize:12 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:momColor, display:'inline-block' }}/>
          <span style={{ fontWeight:700, color:momColor }}>Momentum {momentum >= 0 ? '+' : ''}{momentum.toFixed(1)}% promedio</span>
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:20, padding:'4px 12px', fontSize:12 }}>
          <span style={{ fontWeight:700, color:'#10b981' }}>↑ {positivos} meses en alza</span>
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:20, padding:'4px 12px', fontSize:12 }}>
          <span style={{ fontWeight:700, color:'#ef4444' }}>↓ {negativos} meses en baja</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top:28, right:12, left:4, bottom:12 }}>
          <defs>
            <linearGradient id="momPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity={0.9}/>
              <stop offset="100%" stopColor="#4ade80" stopOpacity={0.7}/>
            </linearGradient>
            <linearGradient id="momNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.85}/>
              <stop offset="100%" stopColor="#f87171" stopOpacity={0.65}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize:10, fill:'#78716c' }} label={{ value:'Mes', position:'insideBottomRight', offset:-4, fontSize:10, fill:'#9ca3af' }}/>
          <YAxis tickFormatter={v=>`${v}%`} tick={{ fontSize:10, fill:'#78716c' }} width={42} label={{ value:'Variación %', angle:-90, position:'insideLeft', offset:8, fontSize:10, fill:'#9ca3af' }}/>
          <Tooltip content={<MomentumTooltip />}/>
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" strokeWidth={1.5} label={{ value:'0%', position:'insideTopRight', fontSize:10, fill:'#94a3b8' }}/>
          {/* Línea de momentum promedio */}
          <ReferenceLine y={momentum} stroke={momColor} strokeDasharray="6 3" strokeWidth={1.5} label={{ value:`Prom. ${momentum >= 0?'+':''}${momentum.toFixed(1)}%`, position:'insideTopLeft', fontSize:10, fill:momColor }}/>
          <Bar dataKey="variacionPct" name="Variación mensual %" radius={[5,5,0,0]} barSize={28}>
            {data.map((m,i) => <Cell key={i} fill={m.variacionPct >= 0 ? 'url(#momPos)' : 'url(#momNeg)'} />)}
            <LabelList dataKey="variacionPct" content={({ x, y, width, height, value }) => {
              if (value == null) return null
              const pos = value >= 0
              const ly = pos ? y - 7 : y + height + 14
              return (
                <text x={x + width/2} y={ly} textAnchor="middle" fontSize={11} fontWeight={700}
                  fill={pos ? '#15803d' : '#b91c1c'}
                  stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" paintOrder="stroke">
                  {pos ? '+' : ''}{value.toFixed(1)}%
                </text>
              )
            }} />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Mix de planes por contribución al MRR ────────────────────────────────────
const MIX_PLAN_GRAD = {
  'Plan Mensual':   { id:'mixMensual',   from:'#f97316', to:'#fb923c' },
  'Plan Semestral': { id:'mixSemestral', from:'#7c3aed', to:'#a78bfa' },
  'Plan Anual':     { id:'mixAnual',     from:'#16a34a', to:'#4ade80' },
}
function MixPlanesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  const grad = MIX_PLAN_GRAD[label] || { from:'#64748b', to:'#94a3b8' }
  return (
    <div style={{ background:'rgba(255,255,255,0.97)', border:`1px solid ${grad.from}40`, borderLeft:`3px solid ${grad.from}`, borderRadius:10, padding:'10px 14px', fontSize:12, boxShadow:'0 4px 20px rgba(0,0,0,0.10)', minWidth:230 }}>
      <p style={{ fontWeight:700, color:'#1e293b', marginBottom:5 }}>{label}</p>
      <p style={{ color:grad.from, fontWeight:800, fontSize:15 }}>{formatCurrency(d?.mrr ?? 0)} MRR</p>
      <p style={{ color:'#8b5cf6', fontWeight:700, marginTop:3 }}>{d?.pct ?? 0}% del MRR total</p>
      <p style={{ color:'#9ca3af', marginTop:5 }}>Contribución acumulada histórica de este tipo de plan al ingreso recurrente normalizado.</p>
    </div>
  )
}
function MixPlanesChart({ data }) {
  if (!data?.length) return <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:13 }}>Sin datos de planes</div>
  const dominante = [...data].sort((a,b) => b.mrr - a.mrr)[0]
  const domGrad = MIX_PLAN_GRAD[dominante?.plan] || { from:'#64748b', to:'#94a3b8' }
  const renderLabel = (props) => {
    const { x, y, width, height, value, index } = props
    if (!value) return null
    const item = data[index]
    const grad = MIX_PLAN_GRAD[item?.plan] || { from:'#64748b' }
    return (
      <g>
        <text x={x + width + 10} y={y + height/2 - 6} dominantBaseline="central" fontSize={12} fontWeight={700} fill={grad.from} stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" paintOrder="stroke">
          {formatCurrency(value)}
        </text>
        <text x={x + width + 10} y={y + height/2 + 9} dominantBaseline="central" fontSize={10} fill="#9ca3af">
          {item?.pct}% del MRR
        </text>
      </g>
    )
  }
  return (
    <div>
      {dominante && (
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:`${domGrad.from}14`, border:`1px solid ${domGrad.from}30`, borderRadius:20, padding:'4px 12px', marginBottom:12, fontSize:12 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:domGrad.from, display:'inline-block' }}/>
          <span style={{ fontWeight:700, color:domGrad.from }}>Plan dominante: {dominante.plan} ({dominante.pct}%)</span>
        </div>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:16, padding:'4px 0' }}>
        {data.map((p, i) => {
          const grad = MIX_PLAN_GRAD[p.plan] || { id:`mixOther${i}`, from:'#64748b', to:'#94a3b8' }
          const gradId = grad.id || `mixOther${i}`
          return (
            <div key={i}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:10, height:10, borderRadius:3, background:grad.from, display:'inline-block', flexShrink:0 }}/>
                  <span style={{ fontWeight:700, fontSize:13, color:'#1e293b' }}>{p.plan}</span>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontWeight:800, fontSize:13, color:grad.from }}>{formatCurrency(p.mrr)}</span>
                  <span style={{ color:'#9ca3af', fontSize:11, marginLeft:6 }}>{p.pct}%</span>
                </div>
              </div>
              <div style={{ position:'relative', height:28, background:'#f1f5f9', borderRadius:8, overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, width:`${p.pct}%`, background:`linear-gradient(90deg,${grad.from},${grad.to})`, borderRadius:8, transition:'width 0.6s ease', display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:8 }}>
                  {p.pct > 15 && <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.9)' }}>{p.pct}%</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Distribución del LTV por quintil ────────────────────────────────────────
const QUINTIL_GRAD_PAIRS = [
  { id:'q1', from:'#94a3b8', to:'#cbd5e1' },
  { id:'q2', from:'#60a5fa', to:'#93c5fd' },
  { id:'q3', from:'#34d399', to:'#6ee7b7' },
  { id:'q4', from:'#f97316', to:'#fdba74' },
  { id:'q5', from:'#a855f7', to:'#d8b4fe' },
]
const QUINTIL_COLORS = QUINTIL_GRAD_PAIRS.map(g => g.from)
const QUINTIL_LABELS = ['Segmento base', 'Clientes emergentes', 'Clientes consolidados', 'Clientes premium', 'Top clientes']
function LtvQuintilTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  const idx = ['Q1','Q2','Q3','Q4','Q5'].indexOf(label)
  const grad = QUINTIL_GRAD_PAIRS[idx] || QUINTIL_GRAD_PAIRS[0]
  const segLabel = QUINTIL_LABELS[idx] || label
  return (
    <div style={{ background:'rgba(255,255,255,0.97)', border:`1px solid ${grad.from}40`, borderLeft:`3px solid ${grad.from}`, borderRadius:10, padding:'10px 14px', fontSize:12, boxShadow:'0 4px 20px rgba(0,0,0,0.10)', minWidth:230 }}>
      <p style={{ fontWeight:700, color:'#1e293b', marginBottom:4 }}>{label} · {segLabel}</p>
      <p style={{ color:grad.from, fontWeight:800, fontSize:15 }}>{d?.cantidad ?? 0} clientes</p>
      <p style={{ color:'#475569', marginTop:3 }}>LTV hasta <strong>{formatCurrency(d?.maxLtv ?? 0)}</strong></p>
      <p style={{ color:'#9ca3af', marginTop:5 }}>Clientes cuyo ingreso total histórico cae en el {label} inferior de la distribución.</p>
    </div>
  )
}
function LtvQuintilChart({ data }) {
  if (!data?.length) return <div style={{ height:240, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:13 }}>Sin datos de distribución</div>
  const total = data.reduce((s,d) => s + (d.cantidad||0), 0)
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top:28, right:20, left:4, bottom:4 }}>
        <defs>
          {QUINTIL_GRAD_PAIRS.map(g => (
            <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={g.from} stopOpacity={0.95}/>
              <stop offset="100%" stopColor={g.to} stopOpacity={0.75}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize:10, fill:'#78716c' }}/>
        <YAxis allowDecimals={false} tick={{ fontSize:10, fill:'#78716c' }} width={42} label={{ value:'Clientes', angle:-90, position:'insideLeft', offset:8, fontSize:10, fill:'#9ca3af' }}/>
        <Tooltip content={<LtvQuintilTooltip />}/>
        <Bar dataKey="cantidad" name="Clientes" radius={[6,6,0,0]} barSize={40}>
          {(data||[]).map((_, i) => <Cell key={i} fill={`url(#${QUINTIL_GRAD_PAIRS[i % QUINTIL_GRAD_PAIRS.length].id})`} />)}
          <LabelList dataKey="cantidad" content={({ x, y, width, height, value, index }) => {
            if (!value) return null
            const grad = QUINTIL_GRAD_PAIRS[index % QUINTIL_GRAD_PAIRS.length]
            const pct = total > 0 ? ((value/total)*100).toFixed(0) : 0
            return (
              <g>
                <text x={x+width/2} y={y-14} textAnchor="middle" fontSize={12} fontWeight={700} fill={grad.from} stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" paintOrder="stroke">{value}</text>
                <text x={x+width/2} y={y-3} textAnchor="middle" fontSize={9} fill="#9ca3af">{pct}%</text>
              </g>
            )
          }} />
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Percentiles de LTV ───────────────────────────────────────────────────────
const PERCENTIL_META = [
  { key:'p25',  label:'P25 · Cuartil bajo',  from:'#94a3b8', to:'#cbd5e1',  desc:'La mitad inferior de los clientes tiene un LTV igual o menor a este valor.' },
  { key:'p50',  label:'P50 · Mediana',        from:'#60a5fa', to:'#93c5fd',  desc:'El cliente típico — la mitad tiene más, la mitad tiene menos.' },
  { key:'p75',  label:'P75 · Cuartil alto',  from:'#34d399', to:'#6ee7b7',  desc:'Solo el 25% de los clientes supera este LTV.' },
  { key:'p90',  label:'P90 · Top 10%',       from:'#a855f7', to:'#d8b4fe',  desc:'Los clientes más valiosos — el 10% que más ingreso ha generado.' },
  { key:'max',  label:'Máximo histórico',    from:'#f97316', to:'#fdba74',  desc:'El cliente de mayor valor en toda la historia del negocio.' },
]
function LtvPercentilesChart({ percentiles }) {
  if (!percentiles) return null
  const maxVal = percentiles.max || 1
  const asimetria = percentiles.p90 > 0 && percentiles.p25 > 0 ? (percentiles.p90 / percentiles.p25).toFixed(1) : null
  return (
    <div>
      {asimetria && (
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(168,85,247,0.08)', border:'1px solid rgba(168,85,247,0.2)', borderRadius:20, padding:'4px 12px', marginBottom:16, fontSize:12 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'#a855f7', display:'inline-block' }}/>
          <span style={{ fontWeight:700, color:'#7c3aed' }}>Asimetría P90/P25: {asimetria}×</span>
          <span style={{ color:'#9ca3af' }}>· {asimetria > 5 ? 'cartera muy concentrada en pocos clientes premium' : asimetria > 2 ? 'distribución heterogénea esperada' : 'base de clientes bastante homogénea'}</span>
        </div>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {PERCENTIL_META.map(({ key, label, from, to, desc }) => {
          const val = percentiles[key] ?? 0
          const barPct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0
          return (
            <div key={key}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                <div>
                  <span style={{ fontWeight:700, fontSize:12, color:'#1e293b' }}>{label}</span>
                  <p style={{ fontSize:10, color:'#94a3b8', marginTop:1 }}>{desc}</p>
                </div>
                <span style={{ fontWeight:800, fontSize:14, color:from, marginLeft:12, flexShrink:0 }}>{formatCurrency(val)}</span>
              </div>
              <div style={{ position:'relative', height:10, background:'#f1f5f9', borderRadius:6, overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, width:`${barPct}%`, background:`linear-gradient(90deg,${from},${to})`, borderRadius:6, transition:'width 0.6s ease' }}/>
              </div>
              <div style={{ fontSize:10, color:'#9ca3af', marginTop:2, textAlign:'right' }}>{barPct}% del máximo</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Narrativa experta EBITDA ────────────────────────────────────────────────

function NarrativaFinanciera({ fin, kpisLic }) {
  if (!fin || !kpisLic) return null
  const { serieAnual, serieMensual } = fin
  const items = []

  if (kpisLic.margenEbitdaPct != null) {
    const nivel = kpisLic.margenEbitdaPct >= 50 ? 'excepcional' : kpisLic.margenEbitdaPct >= 30 ? 'sólido' : kpisLic.margenEbitdaPct >= 15 ? 'moderado' : 'estrecho'
    items.push({
      icon: PiggyBank,
      titulo: 'Nivel y calidad del EBITDA (licencias)',
      texto: `El negocio de suscripciones acumula un EBITDA histórico de ${formatCurrency(kpisLic.ebitdaHistorico)} sobre ingresos de licencias con un margen del ${kpisLic.margenEbitdaPct}% — un nivel ${nivel} para un distribuidor digital. Al no registrarse nómina ni gastos administrativos, este EBITDA coincide con la utilidad bruta operativa de la línea de TV.`,
    })
  }

  if (kpisLic.opexRatioPct != null) {
    const ultimo = serieAnual[serieAnual.length - 1]
    items.push({
      icon: Scale,
      titulo: 'Estructura de costos (OPEX)',
      texto: `Por cada $100 de ingreso de licencias, $${Math.round(kpisLic.opexRatioPct)} se destinan a recargas de créditos e impuesto 4x1000 — el único costo operativo registrado. ${ultimo?.opexRatioPct != null ? `En ${ultimo.anio} el ratio va en ${ultimo.opexRatioPct}%.` : ''} Al ser un costo variable ligado al dólar, el margen queda expuesto a la TRM.`,
    })
  }

  if (fin.kpis.tirAnualPct != null) {
    items.push({
      icon: TrendingUp,
      titulo: 'Retorno (TIR)',
      texto: `La TIR de los flujos netos mensuales es ${fin.kpis.tirMensualPct}% mensual (≈${fin.kpis.tirAnualPct}% anualizada)${fin.kpis.paybackMes ? `, con recuperación de la inversión inicial en ${fin.kpis.paybackMes.label}` : ''}.`,
    })
  } else if (fin.kpis.roiSobreOpex != null) {
    items.push({
      icon: TrendingUp,
      titulo: 'Retorno sobre el gasto operativo',
      texto: `La TIR clásica no es calculable porque la serie de flujos mensuales nunca fue negativa — el negocio operó en positivo desde el inicio registrado. La métrica sustituta es el ROI sobre OPEX: cada peso gastado en recargas generó $${fin.kpis.roiSobreOpex.toLocaleString('es-CO')} adicionales de excedente (${(fin.kpis.roiSobreOpex * 100).toFixed(0)}% de retorno acumulado sobre el costo).`,
    })
  }

  const trms = serieMensual.filter(m => m.trmPromedio != null)
  if (trms.length >= 2) {
    const primera = trms[0], ultima = trms[trms.length - 1]
    const varTrm = ((ultima.trmPromedio - primera.trmPromedio) / primera.trmPromedio) * 100
    items.push({
      icon: Landmark,
      titulo: 'Exposición cambiaria (TRM)',
      texto: `El costo de los créditos se paga referenciado al dólar. La TRM promedio pasó de $${primera.trmPromedio.toLocaleString('es-CO')} (${primera.label}) a $${ultima.trmPromedio.toLocaleString('es-CO')} (${ultima.label}), una variación del ${varTrm.toFixed(1)}%. ${varTrm > 5 ? 'Una devaluación sostenida comprime el margen EBITDA si no se trasladan los aumentos al precio de venta.' : varTrm < -5 ? 'La apreciación del peso ha jugado a favor del margen.' : 'La estabilidad cambiaria reciente da margen para planear precios sin sobresaltos.'}`,
    })
  }

  items.push({
    icon: AlertTriangle,
    titulo: 'CAPEX y calidad del dato',
    texto: `El negocio es asset-light: no hay CAPEX de infraestructura registrado y los equipos (Fire TV, ONN) se compran para reventa — contablemente son inventario/costo de venta, no inversión de capital. ${fin.kpis.cogsEquiposHistorico > 0 ? `Se han registrado ${formatCurrency(fin.kpis.cogsEquiposHistorico)} en costo de equipos (ver pestaña Equipos).` : 'El campo de costo de adquisición de los equipos está vacío en los registros: sin ese dato, el margen de hardware aparece sobreestimado. Registrar ese costo es la mejora #1 de calidad contable.'}`,
  })

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <Card key={i} className="border-orange-100">
            <CardBody className="flex gap-3">
              <div className="bg-orange-100 text-orange-600 rounded-lg p-2 h-fit flex-shrink-0">
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-brand-accent text-sm">{item.titulo}</p>
                <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{item.texto}</p>
              </div>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}

// ─── Encabezado de sección ───────────────────────────────────────────────────

function SectionHeader({ icon: Icon, gradient, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`bg-gradient-to-br ${gradient} rounded-xl p-2.5 shadow-md`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-brand-accent">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  )
}

// ─── Tab button ──────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, icon: Icon, label, sub }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all',
        active
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400'
          : 'bg-white text-slate-500 border border-slate-200 hover:border-emerald-300 hover:text-emerald-600'
      )}
    >
      <Icon size={18} />
      <span>{label}</span>
      {sub && <span className={cn('text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-1', active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>{sub}</span>}
    </button>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function AnalisisFinancieroPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('licencias')
  const [fin, setFin] = useState(null)
  const [bi, setBi] = useState(null)
  const [finEq, setFinEq] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [explain, setExplain] = useState(null)
  const [showArpuPanel, setShowArpuPanel] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard-bi/finanzas').then(r => setFin(r.data)),
      api.get('/admin/dashboard-bi').then(r => setBi(r.data)),
      api.get('/admin/dashboard-bi/finanzas-equipos').then(r => setFinEq(r.data)),
    ])
      .catch(e => setError(e.response?.data?.error || 'Error cargando datos financieros'))
      .finally(() => setLoading(false))
  }, [])

  // Serie momentum
  const momentumSerie = useMemo(() => {
    if (!bi) return []
    const meses = bi.porMes.filter(m => m.numVentas > 0)
    const out = []
    for (let i = 1; i < meses.length; i++) {
      const prev = meses[i - 1].ingresos
      const cur = meses[i].ingresos
      if (prev > 0) out.push({ label: meses[i].label, variacionPct: Number((((cur - prev) / prev) * 100).toFixed(1)) })
    }
    return out.slice(-12)
  }, [bi])

  // KPIs y series de licencias (derivadas del serieMensual del backend)
  const kpisLicencias = useMemo(() => {
    if (!fin) return null
    const totLic  = fin.serieMensual.reduce((s, m) => s + m.ingLicencias, 0)
    const totOpex = fin.serieMensual.reduce((s, m) => s + m.opex, 0)
    const ebitda  = totLic - totOpex
    const mesesConDatos = fin.serieMensual.filter(m => m.ingLicencias > 0 || m.opex > 0)
    const ltm12   = fin.serieMensual.slice(-12)
    const ltmIng  = ltm12.reduce((s, m) => s + m.ingLicencias, 0)
    const ltmOpex = ltm12.reduce((s, m) => s + m.opex, 0)
    const ltmEbitda = ltmIng - ltmOpex
    return {
      ebitdaHistorico:      Math.round(ebitda),
      margenEbitdaPct:      totLic > 0 ? Number(((ebitda / totLic) * 100).toFixed(1)) : null,
      opexHistorico:        Math.round(totOpex),
      opexRatioPct:         totLic > 0 ? Number(((totOpex / totLic) * 100).toFixed(1)) : null,
      ebitdaPromedioMensual: mesesConDatos.length > 0 ? Math.round(ebitda / mesesConDatos.length) : 0,
      ltm: {
        ebitda:         Math.round(ltmEbitda),
        margenEbitdaPct: ltmIng > 0 ? Number(((ltmEbitda / ltmIng) * 100).toFixed(1)) : null,
      },
    }
  }, [fin])

  const serieLicencias = useMemo(() => {
    if (!fin) return []
    let acum = 0
    return fin.serieMensual.map(m => {
      const ebitda = m.ingLicencias - m.opex
      acum += ebitda
      return {
        ...m,
        ingresos: m.ingLicencias,
        ebitda,
        margenEbitdaPct: m.ingLicencias > 0 ? Number(((ebitda / m.ingLicencias) * 100).toFixed(1)) : null,
        flujoAcumulado: acum,
      }
    })
  }, [fin])

  const serieAnualLicencias = useMemo(() => {
    if (!fin) return []
    const byAnio = {}
    for (const m of fin.serieMensual) {
      if (!byAnio[m.anio]) byAnio[m.anio] = { anio: m.anio, ingresos: 0, opex: 0, ebitda: 0 }
      byAnio[m.anio].ingresos += m.ingLicencias
      byAnio[m.anio].opex    += m.opex
      byAnio[m.anio].ebitda  += (m.ingLicencias - m.opex)
    }
    return Object.values(byAnio).sort((a, b) => a.anio.localeCompare(b.anio)).map(a => ({
      anio: a.anio,
      ingresos: Math.round(a.ingresos),
      opex:     Math.round(a.opex),
      ebitda:   Math.round(a.ebitda),
    }))
  }, [fin])

  if (loading) return <div className="py-20 text-center text-gray-400">Calculando indicadores financieros…</div>
  if (error)   return <div className="py-20 text-center text-red-500">{error}</div>
  if (!fin || fin.serieMensual.length === 0) {
    return <div className="py-20 text-center text-gray-400">Sin datos de ventas o costos registrados todavía.</div>
  }

  const { serieMensual } = fin
  const trmSerie = serieMensual.filter(m => m.trmPromedio != null)
  const k   = bi?.kpis
  const ltv = bi?.ltv
  const QUINTIL_COLORS = ['#94a3b8', '#60a5fa', '#34d399', '#f97316', '#a855f7']

  return (
    <div className="space-y-8">
      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />
      {showArpuPanel && <IngresoPorClientePanel onClose={() => setShowArpuPanel(false)} />}

      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="fin-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#022c22 0%,#064e3b 100%)' }}>
        <div className="fin-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.25] pointer-events-none" style={{ background: 'radial-gradient(circle,#10b981,transparent 70%)' }} />
        <div className="fin-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#34d399,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 mb-4">
              <Landmark size={12} className="text-emerald-300" />
              <span className="text-emerald-300 text-xs font-semibold tracking-widest uppercase">Análisis Financiero</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Rendimiento y EBITDA
            </h1>
            <p className="text-emerald-100/70 text-sm mt-2 max-w-xl">
              EBITDA, rentabilidad, MRR y LTV — todos los valores en pesos colombianos (COP)
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 flex-wrap fin-a2">
        <TabBtn
          active={tab === 'licencias'}
          onClick={() => setTab('licencias')}
          icon={Tv}
          label="Licencias · TV"
          sub="EBITDA · MRR · LTV"
        />
        <TabBtn
          active={tab === 'equipos'}
          onClick={() => setTab('equipos')}
          icon={Package}
          label="Equipos"
          sub={finEq ? `${finEq.kpis.totalRegistros} registros` : undefined}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: LICENCIAS / TV
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'licencias' && kpisLicencias && (
        <div className="space-y-8">

          {/* ─── EBITDA: KPIs fila 1 ──────────────────────────────────────── */}
          <div className="fin-a2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-3 flex items-center gap-1.5">
              <Tv size={14} /> Ingresos de licencias/suscripciones · OPEX excluido de equipos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                icon={PiggyBank}
                label="EBITDA histórico · licencias"
                tone={kpisLicencias.ebitdaHistorico >= 0 ? 'positive' : 'negative'}
                value={fmtM(kpisLicencias.ebitdaHistorico)}
                sub="Ingresos licencias − OPEX (recargas + 4x1000)"
                badge={
                  kpisLicencias.margenEbitdaPct >= 50
                    ? { text: 'EBITDA excelente', color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
                    : kpisLicencias.margenEbitdaPct >= 30
                    ? { text: 'EBITDA sólido', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
                    : kpisLicencias.ebitdaHistorico >= 0
                    ? { text: 'Margen ajustado', color: '#f97316', bg: 'rgba(249,115,22,0.12)' }
                    : { text: 'EBITDA negativo', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
                }
                trend={
                  kpisLicencias.ltm?.ebitda != null && kpisLicencias.ebitdaPromedioMensual
                    ? ((kpisLicencias.ltm.ebitda - kpisLicencias.ebitdaPromedioMensual * 12) / Math.abs(kpisLicencias.ebitdaPromedioMensual * 12)) * 100
                    : null
                }
                onClick={() => setExplain({
                  title: 'EBITDA histórico · licencias', value: formatCurrency(kpisLicencias.ebitdaHistorico), icon: PiggyBank,
                  queEs: 'La utilidad operativa acumulada del negocio de suscripciones TV: lo que queda después de pagar las recargas de créditos, antes de impuestos.',
                  comoSeCalcula: '**Ingresos de licencias − OPEX (recargas + 4x1000)**. No incluye ni los ingresos ni los costos de venta de equipos (Fire TV, ONN) — esos están en la pestaña Equipos.',
                  origen: 'Ventas de licencias (módulo Pagos) menos las recargas (módulo Costo Pantalla).',
                })}
              />
              <KpiCard
                icon={Percent}
                label="Margen EBITDA · licencias"
                tone="accent"
                value={kpisLicencias.margenEbitdaPct != null ? `${kpisLicencias.margenEbitdaPct}%` : '—'}
                sub="De cada $100 de licencias que entran"
                badge={
                  kpisLicencias.margenEbitdaPct >= 60
                    ? { text: 'Margen premium', color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
                    : kpisLicencias.margenEbitdaPct >= 40
                    ? { text: 'Margen saludable', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
                    : kpisLicencias.margenEbitdaPct >= 20
                    ? { text: 'Margen moderado', color: '#f97316', bg: 'rgba(249,115,22,0.12)' }
                    : { text: 'Margen bajo — vigilar', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
                }
                trend={
                  kpisLicencias.ltm?.margenEbitdaPct != null && kpisLicencias.margenEbitdaPct != null
                    ? kpisLicencias.ltm.margenEbitdaPct - kpisLicencias.margenEbitdaPct
                    : null
                }
                onClick={() => setExplain({
                  title: 'Margen EBITDA · licencias', value: `${kpisLicencias.margenEbitdaPct}%`, icon: Percent,
                  queEs: 'De cada $100 de licencias que entran, cuántos quedan como utilidad operativa.',
                  comoSeCalcula: '**(EBITDA licencias ÷ Ingresos licencias) × 100**.',
                  origen: 'Derivado de ventas de licencias y recargas (Costo Pantalla).',
                })}
              />
              <KpiCard
                icon={Wallet}
                label="OPEX ratio"
                tone="neutral"
                value={kpisLicencias.opexRatioPct != null ? `${kpisLicencias.opexRatioPct}%` : '—'}
                sub={`OPEX histórico: ${fmtM(kpisLicencias.opexHistorico)}`}
                badge={
                  kpisLicencias.opexRatioPct <= 25
                    ? { text: 'Costo muy controlado', color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
                    : kpisLicencias.opexRatioPct <= 40
                    ? { text: 'Costo moderado', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
                    : kpisLicencias.opexRatioPct <= 55
                    ? { text: 'Costo elevado', color: '#f97316', bg: 'rgba(249,115,22,0.12)' }
                    : { text: 'Costo crítico', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
                }
                onClick={() => setExplain({
                  title: 'OPEX ratio', value: `${kpisLicencias.opexRatioPct}%`, icon: Wallet,
                  queEs: 'Qué porcentaje de cada peso de ingreso de licencias se va en el gasto operativo (recargas de créditos).',
                  comoSeCalcula: '**(OPEX ÷ Ingresos licencias) × 100**.',
                  origen: 'Módulo **Costo Pantalla** — cada recarga con su costo COP e impuesto.',
                  action: { label: 'Ver Costo Pantalla', onClick: () => navigate('/admin/costo-pantalla') },
                })}
              />
              <KpiCard
                icon={TrendingUp}
                label={fin.kpis.tirAnualPct != null ? 'TIR anualizada' : 'ROI sobre OPEX'}
                tone="positive"
                value={fin.kpis.tirAnualPct != null ? `${fin.kpis.tirAnualPct}%` : fin.kpis.roiSobreOpex != null ? `${(fin.kpis.roiSobreOpex * 100).toFixed(0)}%` : '—'}
                sub={fin.kpis.tirAnualPct != null ? `TIR mensual: ${fin.kpis.tirMensualPct}%` : 'TIR no calculable: flujos siempre positivos'}
                badge={(() => {
                  const pct = fin.kpis.tirAnualPct ?? (fin.kpis.roiSobreOpex != null ? fin.kpis.roiSobreOpex * 100 : null)
                  if (pct == null) return null
                  return pct >= 80
                    ? { text: 'Retorno excepcional', color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
                    : pct >= 40
                    ? { text: 'Retorno sólido', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
                    : pct >= 10
                    ? { text: 'Retorno moderado', color: '#f97316', bg: 'rgba(249,115,22,0.12)' }
                    : { text: 'Retorno bajo', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
                })()}
                onClick={() => setExplain({
                  title: fin.kpis.tirAnualPct != null ? 'TIR anualizada' : 'ROI sobre OPEX',
                  value: fin.kpis.tirAnualPct != null ? `${fin.kpis.tirAnualPct}%` : `${(fin.kpis.roiSobreOpex * 100).toFixed(0)}%`,
                  icon: TrendingUp,
                  queEs: fin.kpis.tirAnualPct != null
                    ? 'La rentabilidad anual equivalente de los flujos de caja del negocio.'
                    : 'Cuánto excedente generó cada peso invertido en recargas.',
                  comoSeCalcula: fin.kpis.tirAnualPct != null
                    ? 'Tasa de descuento que hace que todos los flujos sumen cero (método TIR estándar), luego anualizada.'
                    : '**(EBITDA acumulado ÷ OPEX acumulado) × 100**.',
                  origen: 'Serie mensual de ingresos (Pagos + Venta Dispositivos) y gastos (Costo Pantalla).',
                })}
              />
            </div>
          </div>

          {/* ─── EBITDA: KPIs fila 2 ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 fin-a3">
            <KpiCard
              icon={Activity}
              label="EBITDA licencias · LTM"
              tone={kpisLicencias.ltm.ebitda >= 0 ? 'positive' : 'negative'}
              value={fmtM(kpisLicencias.ltm.ebitda)}
              sub={kpisLicencias.ltm.margenEbitdaPct != null ? `Margen LTM: ${kpisLicencias.ltm.margenEbitdaPct}%` : undefined}
              badge={
                kpisLicencias.ltm.ebitda > 0 && kpisLicencias.ebitdaPromedioMensual > 0
                  ? kpisLicencias.ltm.ebitda > kpisLicencias.ebitdaPromedioMensual * 12
                    ? { text: 'LTM supera el histórico anualizado', color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
                    : { text: 'LTM por debajo del histórico anualizado', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
                  : kpisLicencias.ltm.ebitda < 0
                  ? { text: 'Últimos 12 meses en negativo', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
                  : null
              }
              trend={
                kpisLicencias.ltm?.ebitda != null && kpisLicencias.ebitdaPromedioMensual
                  ? ((kpisLicencias.ltm.ebitda - kpisLicencias.ebitdaPromedioMensual * 12) / Math.abs(kpisLicencias.ebitdaPromedioMensual * 12)) * 100
                  : null
              }
              onClick={() => setExplain({
                title: 'EBITDA licencias · últimos 12 meses', value: formatCurrency(kpisLicencias.ltm.ebitda), icon: Activity,
                queEs: 'La utilidad operativa de licencias en los últimos 12 meses — la foto reciente del negocio de suscripciones.',
                comoSeCalcula: 'Suma de los últimos 12 meses: ingLicencias menos OPEX de ese período.',
                origen: 'Serie mensual de licencias y recargas, acotada a 12 meses.',
              })}
            />
            <KpiCard
              icon={DollarSign}
              label="EBITDA promedio mensual"
              tone="neutral"
              value={fmtM(kpisLicencias.ebitdaPromedioMensual)}
              sub="Sobre meses con actividad registrada"
              badge={
                kpisLicencias.ebitdaPromedioMensual > 0
                  ? { text: 'Rentable en promedio mensual', color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
                  : { text: 'Promedio mensual negativo', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
              }
              onClick={() => setExplain({
                title: 'EBITDA promedio mensual · licencias', value: formatCurrency(kpisLicencias.ebitdaPromedioMensual), icon: DollarSign,
                queEs: 'Cuánta utilidad operativa de licencias deja el negocio en un mes típico.',
                comoSeCalcula: '**EBITDA histórico licencias ÷ número de meses con actividad**.',
                origen: 'Serie mensual de licencias y recargas.',
              })}
            />
            <KpiCard
              icon={Hourglass}
              label="Payback"
              tone="neutral"
              value={fin.kpis.paybackMes ? fin.kpis.paybackMes.label : 'Inmediato'}
              sub={fin.kpis.paybackMes ? `Mes ${fin.kpis.paybackMes.index} de operación` : 'El flujo acumulado nunca fue negativo'}
              badge={
                !fin.kpis.paybackMes
                  ? { text: 'Sin zona de pérdida acumulada', color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
                  : fin.kpis.paybackMes.index <= 6
                  ? { text: 'Payback rápido (≤6 meses)', color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
                  : fin.kpis.paybackMes.index <= 18
                  ? { text: 'Payback moderado', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
                  : { text: 'Payback lento (>18 meses)', color: '#f97316', bg: 'rgba(249,115,22,0.12)' }
              }
              onClick={() => setExplain({
                title: 'Payback', value: fin.kpis.paybackMes ? fin.kpis.paybackMes.label : 'Inmediato', icon: Hourglass,
                queEs: 'En qué momento el negocio recuperó lo invertido y empezó a estar "en verde" de forma acumulada.',
                comoSeCalcula: 'Se va sumando el flujo neto mes a mes; el payback es el primer mes en que la suma acumulada se vuelve positiva.',
                origen: 'Serie mensual acumulada de EBITDA.',
              })}
            />
            <KpiCard
              icon={AlertTriangle}
              label="CAPEX registrado"
              tone="neutral"
              value={fmtM(fin.kpis.capexRegistrado)}
              sub="Negocio asset-light — sin inversión de capital registrada"
              badge={{ text: 'Modelo asset-light ✓', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' }}
              onClick={() => setExplain({
                title: 'CAPEX registrado', value: formatCurrency(fin.kpis.capexRegistrado), icon: AlertTriangle,
                queEs: 'La inversión en activos de largo plazo. En este negocio es prácticamente cero: modelo asset-light.',
                comoSeCalcula: 'No hay compras de activos registradas. Los equipos Fire TV/ONN que se compran son para reventa (inventario), no inversión de capital.',
                origen: 'No existe un módulo de activos fijos — este valor es una constatación.',
              })}
            />
          </div>

          {/* ─── Gráfico 1: EBITDA mensual + margen ───────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>EBITDA mensual de licencias y margen</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">Barras: EBITDA de suscripciones (COP). Línea: margen EBITDA % — solo ingresos de licencias menos OPEX</p>
            </CardHeader>
            <CardBody>
              <EbitdaMensualChart data={serieLicencias} />
            </CardBody>
          </Card>

          {/* ─── Gráficos 2 + 3 ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Estructura anual: ingresos licencias, OPEX y EBITDA</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">La brecha entre la barra naranja y la gris es el EBITDA de la línea TV</p>
              </CardHeader>
              <CardBody>
                <EstructuraAnualChart data={serieAnualLicencias} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Flujo de caja acumulado · licencias</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Suma corrida del EBITDA mensual de suscripciones</p>
              </CardHeader>
              <CardBody>
                <FlujoCajaChart data={serieLicencias} />
              </CardBody>
            </Card>
          </div>

          {/* ─── Gráfico 4: TRM vs OPEX ──────────────────────────────────────── */}
          {trmSerie.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Exposición cambiaria: TRM vs OPEX mensual</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Las recargas se pagan en dólares — cuando la TRM (línea azul) sube, cada crédito cuesta más pesos</p>
              </CardHeader>
              <CardBody>
                <TrmOpexChart data={trmSerie} />
              </CardBody>
            </Card>
          )}

          {/* ─── Rentabilidad y Ventas ──────────────────────────────────── */}
          {k && (
            <div>
              <SectionHeader
                icon={Target} gradient="from-emerald-500 to-emerald-600"
                title="Rentabilidad y Ventas · Lectura financiera"
                subtitle="Eficiencia, riesgo de cartera y productividad comercial"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <BiCard
                  icon={Scale} variant="solid" label="Markup sobre el costo"
                  value={`${k.markupPct.toFixed(1)}%`}
                  sub={`cada $1.000 de costo deja ${formatCurrency(Math.round(k.markupPct * 10))} de margen bruto`}
                  tag={tagMarkup(k)}
                  onClick={() => setExplain({
                    title: 'Markup sobre el costo', value: `${k.markupPct.toFixed(1)}%`, icon: Scale,
                    queEs: 'Cuánto "multiplica" cada peso invertido en costo.',
                    comoSeCalcula: '**(Ganancia ÷ Costos) × 100**.',
                    origen: 'Ganancia histórica (Pagos − Costo Pantalla) dividida entre los costos históricos.',
                    detalle: {
                      titulo: 'Detalle por año',
                      columnas: ['Año', 'Ingresos', 'Costos', 'Ganancia', 'Markup'],
                      filas: [
                        ...bi.porAnio.map(a => [
                          a.anio, formatCurrency(a.ingresos), formatCurrency(a.costos), formatCurrency(a.margen),
                          a.costos > 0 ? `${((a.margen / a.costos) * 100).toFixed(1)}%` : '—',
                        ]),
                        ['Total histórico', formatCurrency(k.ingresosTotales), formatCurrency(k.costosTotales), formatCurrency(k.margenTotal), `${k.markupPct.toFixed(1)}%`],
                      ],
                      resaltarUltima: true,
                      nota: 'El markup de la tarjeta es el histórico (ganancia total ÷ costos totales). Los años sin costos registrados no calculan markup.',
                    },
                  })}
                />
                <BiCard
                  icon={Activity} variant="light" label="Cobertura de costos"
                  value={`${k.coberturaCostos.toFixed(2)}×`}
                  sub="veces que el ingreso operativo cubre el costo de pantallas/cuentas"
                  tag={tagCobertura(k)}
                  onClick={() => setExplain({
                    title: 'Cobertura de costos', value: `${k.coberturaCostos.toFixed(2)}×`, icon: Activity,
                    queEs: 'Cuántas veces alcanza el ingreso para pagar todo el costo operativo.',
                    comoSeCalcula: '**Ingresos ÷ Costos**.',
                    origen: 'Ingresos históricos sobre costos históricos (Costo Pantalla).',
                    detalle: {
                      titulo: 'Detalle por año',
                      columnas: ['Año', 'Ingresos', 'Costos', 'Cobertura'],
                      filas: [
                        ...bi.porAnio.map(a => [
                          a.anio, formatCurrency(a.ingresos), formatCurrency(a.costos),
                          a.costos > 0 ? `${(a.ingresos / a.costos).toFixed(2)}×` : '—',
                        ]),
                        ['Total histórico', formatCurrency(k.ingresosTotales), formatCurrency(k.costosTotales), `${k.coberturaCostos.toFixed(2)}×`],
                      ],
                      resaltarUltima: true,
                      nota: 'Cobertura ≥ 1× significa que el ingreso de ese año pagó todo su costo operativo.',
                    },
                  })}
                />
                <BiCard
                  icon={Target} variant="outline" label="Punto de equilibrio"
                  value={`${k.puntoEquilibrioVentas.toLocaleString('es-CO')} ventas`}
                  sub={`al ticket promedio de ${formatCurrency(k.ticketPromedio)} para cubrir el costo total`}
                  tag={tagPuntoEquilibrio(k, bi.porAnio)}
                  onClick={() => setExplain({
                    title: 'Punto de equilibrio', value: `${k.puntoEquilibrioVentas.toLocaleString('es-CO')} ventas`, icon: Target,
                    queEs: 'El número mínimo de ventas que el negocio necesita para no perder plata.',
                    comoSeCalcula: '**Costos totales ÷ ticket promedio**, redondeado hacia arriba.',
                    origen: 'Costos históricos (Costo Pantalla) y ticket promedio de las ventas (Pagos).',
                    detalle: {
                      titulo: 'Variables del cálculo, año por año',
                      columnas: ['Año', 'Costos', 'Ticket prom.', 'Vtas. equilibrio', 'Vtas. reales'],
                      filas: [
                        ...bi.porAnio.map(a => {
                          const ticket = a.numVentas > 0 ? Math.round(a.ingresos / a.numVentas) : null
                          const eq = ticket > 0 ? Math.ceil(a.costos / ticket) : null
                          return [
                            a.anio, formatCurrency(a.costos),
                            ticket != null ? formatCurrency(ticket) : '—',
                            eq != null ? eq.toLocaleString('es-CO') : '—',
                            a.numVentas.toLocaleString('es-CO'),
                          ]
                        }),
                        ['Total histórico', formatCurrency(k.costosTotales), formatCurrency(k.ticketPromedio),
                          k.puntoEquilibrioVentas.toLocaleString('es-CO'),
                          bi.porAnio.reduce((s, a) => s + a.numVentas, 0).toLocaleString('es-CO')],
                      ],
                      resaltarUltima: true,
                      nota: 'Cuando las ventas reales superan las de equilibrio, ese año cubrió sus costos y dejó margen.',
                    },
                  })}
                />
                <BiCard
                  icon={Users} variant="light" label="Concentración de cartera"
                  value={`${k.concentracionTop20Pct.toFixed(1)}%`}
                  sub={`del ingreso histórico lo aporta el 20% top de clientes (${Math.ceil(k.numClientesCompradores * 0.2)} de ${k.numClientesCompradores})`}
                  tag={tagConcentracion(k)}
                  onClick={() => setExplain({
                    title: 'Concentración de cartera', value: `${k.concentracionTop20Pct.toFixed(1)}%`, icon: Users,
                    queEs: 'Qué tan dependiente es el negocio de sus mejores clientes.',
                    comoSeCalcula: 'Se ordena el **20% superior** de clientes por ingreso y se calcula su % del total.',
                    origen: 'Ventas por cliente del módulo de **Pagos**.',
                    detalle: {
                      titulo: 'Ingreso acumulado por decil de clientes',
                      columnas: ['% top de clientes', 'Nº clientes', '% del ingreso acumulado'],
                      filas: bi.paretoIngresos.map(p => [
                        `Top ${p.pctClientes}%`,
                        Math.max(1, Math.round((p.pctClientes / 100) * k.numClientesCompradores)).toLocaleString('es-CO'),
                        `${p.pctIngresos.toFixed(1)}%`,
                      ]),
                      nota: `El 20% top (${Math.ceil(k.numClientesCompradores * 0.2)} de ${k.numClientesCompradores} clientes) aporta el ${k.concentracionTop20Pct.toFixed(1)}% del ingreso histórico.`,
                    },
                    action: { label: 'Ver detalle por cliente', onClick: () => setShowArpuPanel(true) },
                  })}
                />
                <BiCard
                  icon={UserCheck} variant="outline" label="ARPU · ingreso por cliente"
                  value={formatCurrency(k.arpu)}
                  sub={`promedio histórico sobre ${k.numClientesCompradores} clientes con compras registradas`}
                  tag={tagArpu(k)}
                  clickHint="Ver detalle por cliente"
                  onClick={() => setShowArpuPanel(true)}
                />
                <BiCard
                  icon={Tv} variant="light" label="Ingreso por pantalla"
                  value={formatCurrency(k.ingresoPorPantalla)}
                  sub={`costo por pantalla ${formatCurrency(k.costoPorPantalla)} · ${k.totalPantallas} pantallas en operación`}
                  tag={tagPantalla(k)}
                  onClick={() => setExplain({
                    title: 'Ingreso por pantalla', value: formatCurrency(k.ingresoPorPantalla), icon: Tv,
                    queEs: 'Cuánto ingreso ha producido, en promedio, cada pantalla en operación.',
                    comoSeCalcula: `**Ingresos históricos ÷ ${k.totalPantallas} pantallas activas**.`,
                    origen: 'Ingresos de Pagos divididos entre la suma de pantallas del Planificador.',
                    detalle: {
                      titulo: 'Variables del cálculo',
                      columnas: ['Variable', 'Valor'],
                      filas: [
                        ['Ingresos históricos (Pagos)', formatCurrency(k.ingresosTotales)],
                        ['Pantallas en operación (Planificador)', k.totalPantallas.toLocaleString('es-CO')],
                        ['Ingreso por pantalla', formatCurrency(k.ingresoPorPantalla)],
                        ['Costos históricos (Costo Pantalla)', formatCurrency(k.costosTotales)],
                        ['Costo por pantalla', formatCurrency(k.costoPorPantalla)],
                        ['Margen por pantalla', formatCurrency(k.ingresoPorPantalla - k.costoPorPantalla)],
                      ],
                      nota: 'Promedios históricos: ingreso y costo acumulados divididos entre las pantallas hoy en operación.',
                    },
                    action: { label: 'Ver Planificador', onClick: () => navigate('/admin/planificador') },
                  })}
                />
                <BiCard
                  icon={TrendingUp} variant={k.momentumMrrPct >= 0 ? 'solid' : 'outline'} label="Momentum MRR"
                  value={`${k.momentumMrrPct > 0 ? '+' : ''}${k.momentumMrrPct.toFixed(1)}%`}
                  sub={`bruto: ${k.momentumVentasPct > 0 ? '+' : ''}${k.momentumVentasPct.toFixed(1)}%`}
                  tag={k.momentumMrrPct > 5  ? { tone: 'good',  text: 'Acelerando (MRR)' }
                    : k.momentumMrrPct > -5  ? { tone: 'info',  text: 'Ritmo estable' }
                    : { tone: 'warn', text: 'Desacelerando — vigilar' }}
                  onClick={() => setExplain({
                    title: 'Momentum MRR', value: `${k.momentumMrrPct > 0 ? '+' : ''}${k.momentumMrrPct.toFixed(1)}%`, icon: TrendingUp,
                    queEs: 'El "velocímetro" del negocio: si los últimos meses vienen creciendo o cayendo.',
                    comoSeCalcula: 'Variación % del MRR de cada mes frente al anterior (últimos 7 meses), promediada.',
                    origen: 'Serie mensual de MRR normalizado (Pagos).',
                    detalle: (() => {
                      const meses = (bi.porMes || []).filter(m => m.mrr > 0).slice(-7)
                      return {
                        titulo: 'MRR mes a mes (los meses que promedia la tarjeta)',
                        columnas: ['Mes', 'MRR', 'Variación vs mes anterior'],
                        filas: meses.map((m, i) => {
                          const prev = i > 0 ? meses[i - 1].mrr : null
                          const varPct = prev > 0 ? ((m.mrr - prev) / prev) * 100 : null
                          return [m.label, formatCurrency(m.mrr), varPct != null ? `${varPct > 0 ? '+' : ''}${varPct.toFixed(1)}%` : '—']
                        }),
                        nota: `El momentum (${k.momentumMrrPct > 0 ? '+' : ''}${k.momentumMrrPct.toFixed(1)}%) es el promedio de estas variaciones. MRR normaliza cada venta a su equivalente mensual según la duración del plan.`,
                      }
                    })(),
                  })}
                />
                <BiCard
                  icon={Repeat} variant="light" label="Renovaciones"
                  value={`${k.tasaRenovacionPct.toFixed(1)}%`}
                  sub={`del ingreso total · churn ${k.churnPct.toFixed(1)}%`}
                  onClick={() => setExplain({
                    title: 'Renovaciones', value: `${k.tasaRenovacionPct.toFixed(1)}%`, icon: Repeat,
                    queEs: 'Qué porcentaje de las ventas son clientes que volvieron a pagar.',
                    comoSeCalcula: '**Ventas tipo "Renovación" ÷ total de ventas × 100**.',
                    origen: 'Campo tipo de pago de cada venta (módulo Pagos).',
                    detalle: {
                      titulo: 'Desglose por tipo de venta',
                      columnas: ['Tipo', 'Ventas', 'Ingresos', '% del ingreso'],
                      filas: (bi.tipoPago || []).map(t => [
                        t.tipo,
                        t.cantidad.toLocaleString('es-CO'),
                        formatCurrency(t.total),
                        `${t.pctTotal.toFixed(1)}%`,
                      ]),
                      nota: `La tasa de la tarjeta (${k.tasaRenovacionPct.toFixed(1)}%) se calcula por número de transacciones, no por ingresos.`,
                    },
                    action: { label: 'Ver Análisis Retención', onClick: () => navigate('/admin/retencion') },
                  })}
                />
              </div>

              {/* Concentración + productividad */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <Card className="border-orange-100">
                  <CardHeader className="border-orange-50">
                    <CardTitle>Concentración de ingresos por cliente</CardTitle>
                    <p className="text-sm text-gray-400 mt-0.5">% del ingreso acumulado según el % de clientes (curva de Lorenz) — la brecha mide el riesgo de dependencia</p>
                  </CardHeader>
                  <CardBody>
                    <ParetoChart data={bi.paretoIngresos} />
                    <ChartInsight text={narrarPareto(bi.paretoIngresos, k)} />
                  </CardBody>
                </Card>

                <Card className="border-orange-100">
                  <CardHeader className="border-orange-50">
                    <CardTitle>Productividad por pantalla</CardTitle>
                    <p className="text-sm text-gray-400 mt-0.5">Ingreso, costo y margen promedio por cada una de las {k.totalPantallas} pantallas en operación</p>
                  </CardHeader>
                  <CardBody>
                    <ProductividadChart kpis={k} />
                    <ChartInsight text={narrarProductividad(k)} />
                  </CardBody>
                </Card>
              </div>

              {/* Momentum mensual */}
              <Card className="border-orange-100 mt-4">
                <CardHeader className="border-orange-50">
                  <CardTitle>Momentum de ventas — variación mensual de ingresos</CardTitle>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Variación % mes a mes de los últimos periodos con actividad (promedio: {k.momentumVentasPct > 0 ? '+' : ''}{k.momentumVentasPct.toFixed(1)}%)
                  </p>
                </CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={momentumSerie} margin={{ top: 24, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#78716c' }} />
                      <Tooltip formatter={(v) => [`${v}%`, 'Variación']} />
                      <Bar dataKey="variacionPct" name="Variación mensual %" radius={[6, 6, 0, 0]} barSize={28}>
                        {momentumSerie.map((m, i) => (
                          <Cell key={i} fill={m.variacionPct >= 0 ? '#16a34a' : '#ef4444'} />
                        ))}
                        <LabelList dataKey="variacionPct" content={<MomentumValueLabel />} />
                      </Bar>
                    </ComposedChart>
                  </ResponsiveContainer>
                  <ChartInsight text={narrarMomentum(momentumSerie, k)} />
                </CardBody>
              </Card>
            </div>
          )}

          {/* ─── MRR ────────────────────────────────────────────────────── */}
          {k && (
            <div>
              <SectionHeader
                icon={Repeat} gradient="from-violet-500 to-violet-700"
                title="MRR · Ingreso Recurrente Mensual"
                subtitle="Ingresos normalizados por duración de plan — corrige la distorsión de planes anuales y semestrales"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <BiCard icon={Wallet} variant="solid" label={`MRR · ${k.mrrMesLabel || 'Último mes'}`}
                  value={formatCurrency(k.mrrActual)}
                  sub="ingreso recurrente mensual normalizado por duración de plan"
                  tag={k.mrrActual > 0 ? { tone: 'info', text: 'Base recurrente real' } : null}
                  onClick={() => setExplain({
                    title: 'MRR', value: formatCurrency(k.mrrActual), icon: Wallet,
                    queEs: 'El ingreso recurrente "real" de un mes: cuánto entra de manera sostenida.',
                    comoSeCalcula: 'Cada venta se **divide por la duración de su plan**: un plan anual de $190.000 aporta $15.833 al MRR, no $190.000.',
                    origen: 'Ventas del módulo de **Pagos**, usando el tipo de plan para saber la duración.',
                  })}
                />
                <BiCard icon={PiggyBank} variant="light" label="ARR estimado"
                  value={formatCurrency(k.arrActual)}
                  sub="MRR × 12 — proyección anualizada del ingreso recurrente actual"
                  tag={k.arrActual > 0 ? { tone: 'info', text: 'Proyección sostenida' } : null}
                  onClick={() => setExplain({
                    title: 'ARR estimado', value: formatCurrency(k.arrActual), icon: PiggyBank,
                    queEs: 'Cuánto ingresaría en un año completo si el ritmo recurrente actual se mantiene.',
                    comoSeCalcula: '**MRR del último mes × 12**.',
                    origen: 'Derivado directamente del MRR.',
                  })}
                />
                <BiCard icon={TrendingUp}
                  variant={k.crecimientoMrrMomPct == null ? 'light' : k.crecimientoMrrMomPct >= 0 ? 'solid' : 'outline'}
                  label="Crecimiento MRR · MoM"
                  value={k.crecimientoMrrMomPct != null ? `${k.crecimientoMrrMomPct >= 0 ? '+' : ''}${k.crecimientoMrrMomPct.toFixed(1)}%` : '—'}
                  sub="variación del MRR normalizado respecto al mes anterior"
                  tag={k.crecimientoMrrMomPct != null
                    ? k.crecimientoMrrMomPct >= 5  ? { tone: 'good', text: 'Crecimiento MRR sólido' }
                    : k.crecimientoMrrMomPct >= -5 ? { tone: 'info', text: 'MRR estable' }
                    : { tone: 'warn', text: 'MRR en contracción' }
                    : null}
                  onClick={() => setExplain({
                    title: 'Crecimiento MRR mes a mes', value: k.crecimientoMrrMomPct != null ? `${k.crecimientoMrrMomPct >= 0 ? '+' : ''}${k.crecimientoMrrMomPct.toFixed(1)}%` : '—', icon: TrendingUp,
                    queEs: 'Si el ingreso recurrente del último mes creció o cayó frente al mes anterior.',
                    comoSeCalcula: '**(MRR del último mes − MRR del mes anterior) ÷ MRR del mes anterior × 100**.',
                    origen: 'Serie mensual de MRR normalizado.',
                  })}
                />
                <BiCard icon={Activity}
                  variant={k.momentumMrrPct >= 0 ? 'solid' : 'outline'}
                  label="Momentum MRR (7 meses)"
                  value={`${k.momentumMrrPct > 0 ? '+' : ''}${k.momentumMrrPct.toFixed(1)}%`}
                  sub="promedio MoM del MRR normalizado — señal de tendencia"
                  tag={k.momentumMrrPct > 5  ? { tone: 'good', text: 'Acelerando (MRR)' }
                    : k.momentumMrrPct > -5  ? { tone: 'info', text: 'Ritmo MRR estable' }
                    : { tone: 'warn', text: 'MRR desacelerando' }}
                  onClick={() => setExplain({
                    title: 'Momentum MRR (7 meses)', value: `${k.momentumMrrPct > 0 ? '+' : ''}${k.momentumMrrPct.toFixed(1)}%`, icon: Activity,
                    queEs: 'La tendencia de fondo del ingreso recurrente: el promedio de 7 meses muestra la dirección real.',
                    comoSeCalcula: 'Variación mensual del MRR en los últimos 7 meses con datos, promediada.',
                    origen: 'Serie mensual de MRR normalizado.',
                  })}
                />
              </div>

              <Card className="border-violet-100">
                <CardHeader className="border-violet-50">
                  <CardTitle>Mix de planes por contribución al MRR histórico</CardTitle>
                  <p className="text-sm text-gray-400 mt-0.5">Distribución del ingreso recurrente total generado, por tipo de plan</p>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3">
                    {(bi.mrrPorTipoPlan || []).map((p, i) => {
                      const PLAN_COLORS = { 'Plan Mensual': '#f97316', 'Plan Semestral': '#7c3aed', 'Plan Anual': '#16a34a' }
                      const color = PLAN_COLORS[p.plan] || '#64748b'
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-semibold text-slate-700">{p.plan}</span>
                            <span className="text-slate-500">{formatCurrency(p.mrr)} · <strong style={{ color }}>{p.pct}%</strong></span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${p.pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <ChartInsight text={narrarMrr(bi)} />
                </CardBody>
              </Card>
            </div>
          )}

          {/* ─── LTV ────────────────────────────────────────────────────── */}
          {ltv && (
            <div>
              <SectionHeader
                icon={Gem} gradient="from-teal-500 to-teal-700"
                title="LTV · Valor de Vida del Cliente"
                subtitle="Cuánto ingreso generó cada cliente desde su primera activación"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <BiCard icon={Gem} variant="solid" label="LTV promedio"
                  value={formatCurrency(ltv.ltvPromedio)}
                  sub={`sobre ${ltv.numClientes} clientes con historial de compras`}
                  tag={tagLtv(ltv.ltvPromedio)}
                  onClick={() => setExplain({
                    title: 'LTV promedio', value: formatCurrency(ltv.ltvPromedio), icon: Gem,
                    queEs: 'Cuánto dinero deja un cliente típico durante toda su relación con el negocio.',
                    comoSeCalcula: 'Para cada cliente se **suman todas sus compras** y se promedia sobre todos los clientes con historial.',
                    origen: 'Ventas por cliente del módulo de **Pagos**.',
                  })}
                />
                <BiCard icon={Wallet} variant="light" label="ARPU mensual"
                  value={formatCurrency(ltv.arpuMensualLtv)}
                  sub="ingreso promedio por cliente por mes activo"
                  tag={{ tone: 'info', text: 'Tasa de consumo mensual' }}
                  onClick={() => setExplain({
                    title: 'ARPU mensual', value: formatCurrency(ltv.arpuMensualLtv), icon: Wallet,
                    queEs: 'Cuánto paga en promedio un cliente por cada mes que permanece activo.',
                    comoSeCalcula: 'Para cada cliente: **su ingreso total ÷ sus meses de vida activa**, luego promediado.',
                    origen: 'Ventas y fechas de actividad de cada cliente (módulo Pagos).',
                  })}
                />
                <BiCard icon={Clock} variant="outline" label="Vida promedio"
                  value={`${ltv.vidaPromedioMeses} meses`}
                  sub="desde primera activación hasta última transacción registrada"
                  tag={ltv.vidaPromedioMeses >= 12
                    ? { tone: 'good', text: 'Clientes de largo aliento' }
                    : ltv.vidaPromedioMeses >= 6
                    ? { tone: 'info', text: 'Vida media razonable' }
                    : { tone: 'warn', text: 'Alta rotación — reforzar retención' }}
                  onClick={() => setExplain({
                    title: 'Vida promedio', value: `${ltv.vidaPromedioMeses} meses`, icon: Clock,
                    queEs: 'Cuántos meses dura, en promedio, la relación de un cliente con el negocio.',
                    comoSeCalcula: 'Meses entre la **primera activación** y la **última transacción**, promediados.',
                    origen: 'Fechas de las ventas de cada cliente (módulo Pagos).',
                  })}
                />
                <BiCard
                  icon={AlertCircle}
                  variant={ltv.valorEnRiesgo > 0 ? 'outline' : 'light'}
                  label="Valor LTV en riesgo"
                  value={formatCurrency(ltv.valorEnRiesgo)}
                  sub={`LTV histórico de ${ltv.clientesEnRiesgoCount} clientes con pantallas vencidas o próximas`}
                  tag={tagValorEnRiesgo(ltv.valorEnRiesgo, ltv.ltvPromedio)}
                  onClick={() => setExplain({
                    title: 'Valor LTV en riesgo', value: formatCurrency(ltv.valorEnRiesgo), icon: AlertCircle,
                    queEs: 'El valor histórico de los clientes que hoy están a punto de irse.',
                    comoSeCalcula: 'Se identifican los clientes con pantallas **VENCIDAS o PRÓXIMAS A VENCER** y se **suma su LTV histórico**.',
                    origen: 'Cruce entre el Planificador y el historial de ventas de Pagos.',
                    action: { label: 'Ver Planificador', onClick: () => navigate('/admin/planificador') },
                  })}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-teal-100">
                  <CardHeader className="border-teal-50">
                    <CardTitle>Distribución del LTV por quintil</CardTitle>
                    <p className="text-sm text-gray-400 mt-0.5">Clientes agrupados en 5 segmentos según su LTV acumulado</p>
                  </CardHeader>
                  <CardBody>
                    <ResponsiveContainer width="100%" height={220}>
                      <ComposedChart data={ltv.distribucion} margin={{ top: 22, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#99f6e4" opacity={0.4} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716c' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} />
                        <Tooltip
                          formatter={(v) => [v, 'Clientes']}
                          labelFormatter={(label, payload) => {
                            const d = payload?.[0]?.payload
                            return d ? `${label} · hasta ${formatCurrency(d.maxLtv)}` : label
                          }}
                        />
                        <Bar dataKey="cantidad" name="Clientes" radius={[6, 6, 0, 0]} barSize={38}>
                          {(ltv.distribucion || []).map((_, i) => (
                            <Cell key={i} fill={QUINTIL_COLORS[i % QUINTIL_COLORS.length]} />
                          ))}
                          <LabelList dataKey="cantidad" position="top" formatter={(v) => v.toLocaleString('es-CO')} style={{ ...LABEL_STYLE, fontSize: 11 }} />
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardBody>
                </Card>

                <Card className="border-teal-100">
                  <CardHeader className="border-teal-50">
                    <CardTitle>Percentiles de LTV</CardTitle>
                    <p className="text-sm text-gray-400 mt-0.5">La brecha entre P25 y P90 revela la asimetría de la cartera</p>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-4 py-2">
                      {[
                        { label: 'P25 · cuartil bajo',  val: ltv.percentiles.p25, color: '#94a3b8' },
                        { label: 'P50 · mediana',        val: ltv.percentiles.p50, color: '#60a5fa' },
                        { label: 'P75 · cuartil alto',  val: ltv.percentiles.p75, color: '#34d399' },
                        { label: 'P90 · top 10%',       val: ltv.percentiles.p90, color: '#a855f7' },
                        { label: 'Máximo histórico',    val: ltv.percentiles.max, color: '#f97316' },
                      ].map(({ label, val, color }) => {
                        const barPct = ltv.percentiles.max > 0 ? Math.round((val / ltv.percentiles.max) * 100) : 0
                        return (
                          <div key={label}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium text-slate-600">{label}</span>
                              <span className="font-bold" style={{ color }}>{formatCurrency(val)}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <ChartInsight text={narrarLtv(ltv)} />
                  </CardBody>
                </Card>
              </div>
            </div>
          )}

          {/* ─── Narrativa experta ──────────────────────────────────────── */}
          <div>
            <SectionHeader
              icon={Lightbulb} gradient="from-orange-500 to-orange-600"
              title="Lectura del analista · Licencias TV"
              subtitle="Interpretación financiera generada a partir de los datos reales del negocio de suscripciones"
            />
            <NarrativaFinanciera fin={fin} kpisLic={kpisLicencias} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: EQUIPOS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'equipos' && (
        <div className="space-y-8">
          {!finEq ? (
            <div className="py-20 text-center text-gray-400">Cargando datos de equipos…</div>
          ) : (
            <>
              {/* Advertencia si no hay costos registrados */}
              {finEq.kpis.sinCostoPct > 60 && (
                <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <Info size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Datos de costo incompletos — margen estimado</p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      El {finEq.kpis.sinCostoPct}% de los registros de equipos ({finEq.kpis.sinCostoCount} de {finEq.kpis.totalRegistros}) no tienen costo de adquisición registrado. El margen bruto mostrado está sobreestimado. Para mejorar la precisión, ingresa el costo de compra en cada registro de Venta de Dispositivos.
                    </p>
                  </div>
                </div>
              )}

              {/* KPI cards */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-3 flex items-center gap-1.5">
                  <Package size={13} /> Venta de equipos · Fire TV, ONN y otros dispositivos
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    icon={ShoppingCart} label="Ingresos totales equipos" tone="accent"
                    value={fmtM(finEq.kpis.totalIngresos)}
                    sub={`${finEq.kpis.totalRegistros} registros de venta`}
                  />
                  <KpiCard
                    icon={DollarSign} label="Costo registrado (COGS)" tone="neutral"
                    value={fmtM(finEq.kpis.totalCogs)}
                    sub={finEq.kpis.sinCostoCount > 0 ? `${finEq.kpis.sinCostoCount} registros sin costo` : 'Todos los costos registrados'}
                  />
                  <KpiCard
                    icon={TrendingUp} label="Margen bruto" tone={finEq.kpis.margenBruto >= 0 ? 'positive' : 'negative'}
                    value={fmtM(finEq.kpis.margenBruto)}
                    sub={finEq.kpis.margenBrutoPct != null ? `${finEq.kpis.margenBrutoPct}% sobre ingresos${finEq.kpis.sinCostoCount > 0 ? ' (estimado)' : ''}` : '—'}
                  />
                  <KpiCard
                    icon={BarChart2} label="Ticket promedio por venta" tone="neutral"
                    value={fmtM(finEq.kpis.ticketPromedio)}
                    sub={`sobre ${finEq.kpis.totalRegistros} registros`}
                  />
                </div>
              </div>

              {/* Gráfico: ingresos vs cogs por mes */}
              <Card>
                <CardHeader>
                  <CardTitle>Ingresos y margen de equipos por mes</CardTitle>
                  <p className="text-sm text-gray-400 mt-0.5">Barras: ingresos (naranja) y COGS registrado (gris). Línea: margen bruto %</p>
                </CardHeader>
                <CardBody>
                  {finEq.porMes.length === 0 ? (
                    <p className="py-12 text-center text-gray-400 text-sm">Sin datos de ventas de equipos por mes</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={finEq.porMes} margin={{ top: 10, right: 40, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis yAxisId="cop" tickFormatter={fmtM} tick={{ fontSize: 10 }} width={58} />
                        <YAxis yAxisId="pct" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} width={40} />
                        <Tooltip formatter={(v, name) => name === 'Margen %' ? [`${v}%`, name] : tooltipMoney(v, name)} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="cop" dataKey="ingresos" name="Ingresos equipos" fill="#f97316" radius={[3, 3, 0, 0]} />
                        <Bar yAxisId="cop" dataKey="cogs" name="COGS registrado" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                        <Line yAxisId="pct" dataKey="margenPct" name="Margen %" stroke="#6366f1" strokeWidth={2} dot={false} connectNulls />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </CardBody>
              </Card>

              {/* Gráfico: desglose por tipo de equipo */}
              <Card>
                <CardHeader>
                  <CardTitle>Desglose por tipo de equipo</CardTitle>
                  <p className="text-sm text-gray-400 mt-0.5">Ingresos acumulados por tipo de dispositivo vendido (Fire TV, ONN, etc.)</p>
                </CardHeader>
                <CardBody>
                  {finEq.porTipo.length === 0 ? (
                    <p className="py-12 text-center text-gray-400 text-sm">Sin datos de tipo de equipo</p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={Math.max(200, finEq.porTipo.length * 52)}>
                        <ComposedChart
                          data={finEq.porTipo}
                          layout="vertical"
                          margin={{ top: 8, right: 80, left: 8, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" tickFormatter={fmtM} tick={{ fontSize: 10 }} />
                          <YAxis type="category" dataKey="tipo" tick={{ fontSize: 11, fill: '#374151' }} width={120} />
                          <Tooltip
                            formatter={(v, name) => name === '% del total' ? [`${v}%`, name] : tooltipMoney(v, name)}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="ingresos" name="Ingresos" radius={[0, 6, 6, 0]} barSize={28}>
                            {finEq.porTipo.map((_, i) => (
                              <Cell key={i} fill={['#f97316', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#14b8a6'][i % 8]} />
                            ))}
                            <LabelList dataKey="pct" position="right" formatter={v => `${v}%`} style={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
                          </Bar>
                        </ComposedChart>
                      </ResponsiveContainer>

                      {/* Tabla resumen por tipo */}
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              <th className="text-left py-2 pr-4">Tipo de equipo</th>
                              <th className="text-right py-2 pr-4">Ingresos</th>
                              <th className="text-right py-2 pr-4">COGS</th>
                              <th className="text-right py-2 pr-4">Margen bruto</th>
                              <th className="text-right py-2">% del total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {finEq.porTipo.map((t, i) => (
                              <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                <td className="py-2 pr-4 font-medium text-gray-700">{t.tipo}</td>
                                <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(t.ingresos)}</td>
                                <td className="py-2 pr-4 text-right tabular-nums text-gray-500">{t.cogs > 0 ? formatCurrency(t.cogs) : <span className="text-amber-500 text-xs">sin dato</span>}</td>
                                <td className="py-2 pr-4 text-right tabular-nums">
                                  <span className={t.margen >= 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
                                    {formatCurrency(t.margen)}
                                  </span>
                                  {t.margenPct != null && <span className="text-gray-400 text-xs ml-1">({t.margenPct}%)</span>}
                                </td>
                                <td className="py-2 text-right">
                                  <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                    {t.pct}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-gray-200 font-semibold bg-gray-50">
                              <td className="py-2 pr-4">Total</td>
                              <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(finEq.kpis.totalIngresos)}</td>
                              <td className="py-2 pr-4 text-right tabular-nums text-gray-500">{formatCurrency(finEq.kpis.totalCogs)}</td>
                              <td className="py-2 pr-4 text-right tabular-nums text-green-700">{formatCurrency(finEq.kpis.margenBruto)}</td>
                              <td className="py-2 text-right">
                                <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-full">100%</span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}
