import { useState, useMemo, useEffect } from 'react'
import {
  UserX, Calendar, ArrowDownCircle, Tv, Activity,
  TrendingDown, DollarSign, Clock, Shield, Zap,
  AlertTriangle, Target, Lightbulb, Users, Wallet,
  HeartCrack, Scale, ArrowUpDown, Filter,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, LabelList, Legend,
  BarChart,
} from 'recharts'
import { ChartInsight, narrarBajasPorAnio, LABEL_STYLE } from './dashboard/biShared'
import { KpiCard } from '../../components/ui/KpiCard'
import api from '../../config/api'
import { useApiResource } from '../../hooks/useApiResource'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const formatCurrency = (v) => v != null ? `$${Math.round(v).toLocaleString('es-CO')}` : '—'

const CSS = `
  @keyframes abj-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes abj-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes abj-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  .abj-a1 { animation: abj-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .abj-a2 { animation: abj-fade-up .45s .08s cubic-bezier(.22,1,.36,1) both }
  .abj-a3 { animation: abj-fade-up .45s .16s cubic-bezier(.22,1,.36,1) both }
  .abj-orb-1 { animation: abj-orb-1 8s ease-in-out infinite }
  .abj-orb-2 { animation: abj-orb-2 11s ease-in-out infinite }
  .abj-chart-controls {
    display: flex; flex-wrap: wrap; gap: 4px; background: #f1f5f9; border-radius: 10px; padding: 3px;
  }
  .abj-chart-btn {
    padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700;
    cursor: pointer; transition: all .18s; border: none; background: transparent; color: #64748b;
    white-space: nowrap;
  }
  .abj-chart-btn.active {
    background: #fff; color: #e11d48; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .abj-filter-row {
    display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  }
  .abj-filter-tag {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em;
  }
`

// BajaCard → KpiCard global (dark Huashu)
const BajaCard = (props) => <KpiCard {...props} tone="rose" />
const FinCard  = (props) => <KpiCard {...props} tone="amber" />

// ── Controles locales por gráfica: chips de selección única y toggles ──────
function ChartChips({ options, value, onChange }) {
  return (
    <div className="abj-chart-controls">
      {options.map(o => (
        <button key={o.key} type="button" className={`abj-chart-btn ${String(value) === String(o.key) ? 'active' : ''}`} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
function ChartToggle({ active, onClick, children }) {
  return (
    <button type="button" className={`abj-chart-btn ${active ? 'active' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}
// Fila de controles con etiqueta ("Filtros de esta gráfica"), consistente en todas las tarjetas
function ChartControlsRow({ children }) {
  return (
    <div className="abj-filter-row">
      <span className="abj-filter-tag"><Filter size={11} /> Esta gráfica</span>
      {children}
    </div>
  )
}

// ── Tooltip genérico premium ────────────────────────────────────────────────
function PremiumTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'rgba(255,255,255,0.97)', border:'1px solid #e2e8f0', borderLeft:'3px solid #f43f5e', borderRadius:10, padding:'10px 14px', fontSize:12, boxShadow:'0 4px 20px rgba(0,0,0,0.10)', minWidth:180 }}>
      <p style={{ fontWeight:700, color:'#1e293b', marginBottom:5 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#64748b', fontWeight:600 }}>
          {p.name}: {formatter ? formatter(p.value, p.name) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function AnalisisBajasPage() {
  const { data: bajas, loading } = useApiResource('/admin/bajas')
  const [bi, setBi] = useState(null)

  // ── Controles LOCALES por gráfica (reemplazan el filtro global superior) ──
  const [netGrowthPeriodo, setNetGrowthPeriodo]   = useState('12') // 6, 12, todos
  const [lifetimeAnio, setLifetimeAnio]           = useState('todos')
  const [lifetimePlan, setLifetimePlan]           = useState('todos')
  const [churnPlanAnio, setChurnPlanAnio]         = useState('todos')
  const [churnPlanExclCortesia, setChurnPlanExclCortesia] = useState(false)
  const [churnDispAnio, setChurnDispAnio]         = useState('todos')
  const [churnDispSoloDevol, setChurnDispSoloDevol] = useState(false)
  const [estacAnio, setEstacAnio]                 = useState('todos')
  const [estacPlan, setEstacPlan]                 = useState('todos')
  const [comparativoPlan, setComparativoPlan]     = useState('todos')
  const [motivoAnio, setMotivoAnio]               = useState('todos')

  useEffect(() => {
    api.get('/admin/dashboard-bi')
      .then(r => setBi(r.data))
      .catch(() => {})
  }, [])

  const kpis = bi?.kpis || {}
  const ltv  = bi?.ltv  || {}
  const bajasPorAnio = bi?.bajasPorAnioDetalle || []
  const activacionPorCliente = bi?.activacionPorCliente || {}
  const totalOcupadas = bi?.ocupacion?.totalOcupadas || 0

  // ── Opciones de filtro (extraídas de datos, siempre sobre el universo completo) ──
  const filterOptions = useMemo(() => {
    const anios = [...new Set((bajas || []).map(b => b.anio).filter(Boolean))].sort((a, b) => b - a)
    const planes = [...new Set((bajas || []).map(b => (b.tipoPlan || '').trim()).filter(Boolean))].sort()
    return { anios, planes }
  }, [bajas])
  const chipsAnio = useMemo(() => [{ key: 'todos', label: 'Histórico' }, ...filterOptions.anios.map(a => ({ key: String(a), label: String(a) }))], [filterOptions])
  const chipsPlan = useMemo(() => [{ key: 'todos', label: 'Todos' }, ...filterOptions.planes.slice(0, 6).map(p => ({ key: p, label: p.replace(/^Plan\s+/i, '') }))], [filterOptions])

  // ── Vida real del cliente: Baja.fecha NO es la activación original (verificado
  // contra Ventas: 80% de las bajas está a <15 días de fechaBaja). Se reconstruye
  // cruzando cada baja con la primera venta "Activacion Pantalla" del mismo
  // customerId (bi.activacionPorCliente, calculado server-side para el LTV). ──
  const bajasConVida = useMemo(() => {
    if (!bajas) return []
    return bajas.map(b => {
      const activ = b.customerId ? activacionPorCliente[b.customerId] : null
      let dias = null
      if (activ && b.fechaBaja) {
        const d = (new Date(b.fechaBaja) - new Date(activ)) / 86400000
        if (d > 0 && d < 3650) dias = Math.round(d)
      }
      return { ...b, diasVidaReal: dias }
    })
  }, [bajas, activacionPorCliente])
  const coberturaVidaReal = bajasConVida.length
    ? Math.round(bajasConVida.filter(b => b.diasVidaReal != null).length / bajasConVida.length * 100)
    : 0

  // ── Métricas operativas — SIEMPRE sobre el universo completo (totales de cabecera) ──
  const stats = useMemo(() => {
    const src = bajasConVida
    const total = src.length
    const devueltos = src.filter(b => b.devolucion === 'SI').length
    const cortesias = src.filter(b => b.cortesia === 'SI').length
    const anioActual = new Date().getFullYear()
    const bajasYTD = src.filter(b => Number(b.anio) === anioActual).length
    const bajasYTDPrev = src.filter(b => Number(b.anio) === anioActual - 1).length

    // Velocidad de churn (últimos 3 meses)
    const now = new Date()
    const hace3M = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const bajasRecientes = src.filter(b => {
      if (!b.fechaBaja) return false
      return new Date(b.fechaBaja) >= hace3M
    }).length
    const velocidadChurn = (bajasRecientes / 3).toFixed(1)

    // Vida media REAL (solo bajas con activación real cruzada — se descarta el
    // campo Baja.fecha por no ser confiable, ver bajasConVida arriba)
    const vidas = src.map(b => b.diasVidaReal).filter(d => d != null)
    const vidaMediaDias = vidas.length > 0 ? Math.round(vidas.reduce((a, b) => a + b) / vidas.length) : null
    const vidaMediaMeses = vidaMediaDias ? (vidaMediaDias / 30.44).toFixed(1) : null

    // Mes pico
    const meses = {}
    src.forEach(b => { if (b.mes) meses[b.mes] = (meses[b.mes] || 0) + 1 })
    const mesMasAlto = Object.keys(meses).length ? Object.entries(meses).sort((a, b) => b[1] - a[1])[0] : null

    return { total, devueltos, cortesias, bajasYTD, bajasYTDPrev, velocidadChurn, vidaMediaDias, vidaMediaMeses, mesMasAlto, anioActual, vidasMuestra: vidas.length }
  }, [bajasConVida])

  // ── Métricas financieras (cruce con BI) ─────────────────────────────────────
  const fin = useMemo(() => {
    const ticketPromedio = kpis.ticketPromedio || 0
    const arpu = kpis.arpu || 0
    const costoPorPantalla = kpis.costoPorPantalla || 0

    const revenueLost = stats.bajasYTD * ticketPromedio
    const revenueLostPrev = stats.bajasYTDPrev * ticketPromedio
    const mrrPerdido = stats.bajasYTD > 0 ? Math.round((stats.bajasYTD * arpu) / 12) : 0
    const costoDesperdiciadoCortesias = stats.cortesias * costoPorPantalla

    // Altas REALES del año (solo activaciones nuevas — no confundir con numVentas,
    // que mezcla ~82% de renovaciones de clientes existentes)
    const activacionesYTD = bi?.porAnio?.find(a => String(a.anio) === String(stats.anioActual))?.numActivaciones || 0
    const baseClientes = kpis.numClientesCompradores || 1
    const netGrowthRate = baseClientes > 0 ? ((activacionesYTD - stats.bajasYTD) / baseClientes * 100).toFixed(1) : 0

    // Tasa de cancelación REAL: bajas del año vs. base instalada actual del
    // Planificador (bi.ocupacion.totalOcupadas) — reemplaza kpis.churnPct, que
    // viene de la tabla Subscription (119 registros cargados una sola vez el
    // 2026-06-06 y nunca más actualizados, desconectada de Bajas/Planificador).
    const churnRealPct = (totalOcupadas + stats.bajasYTD) > 0
      ? Number(((stats.bajasYTD / (totalOcupadas + stats.bajasYTD)) * 100).toFixed(1))
      : 0

    return { ticketPromedio, arpu, revenueLost, revenueLostPrev, mrrPerdido, costoDesperdiciadoCortesias, netGrowthRate, activacionesYTD, churnRealPct }
  }, [kpis, stats, bi, totalOcupadas])

  // ── Churn por tipo de plan (control local: año + excluir cortesías) ────────
  const churnPorPlan = useMemo(() => {
    let src = bajasConVida
    if (churnPlanAnio !== 'todos') src = src.filter(b => String(b.anio) === String(churnPlanAnio))
    if (churnPlanExclCortesia) src = src.filter(b => b.cortesia !== 'SI')
    const counts = {}
    src.forEach(b => {
      const plan = (b.tipoPlan || '').trim() || 'Sin clasificar'
      counts[plan] = (counts[plan] || 0) + 1
    })
    const total = src.length || 1
    return Object.entries(counts)
      .map(([plan, cant]) => ({ plan, cant, pct: Number((cant / total * 100).toFixed(1)) }))
      .sort((a, b) => b.cant - a.cant)
  }, [bajasConVida, churnPlanAnio, churnPlanExclCortesia])

  // ── Churn por tipo de dispositivo (control local: año + solo con devolución) ──
  const churnPorDispositivo = useMemo(() => {
    let src = bajasConVida
    if (churnDispAnio !== 'todos') src = src.filter(b => String(b.anio) === String(churnDispAnio))
    if (churnDispSoloDevol) src = src.filter(b => b.devolucion === 'SI')
    const counts = {}
    const devCounts = {}
    src.forEach(b => {
      const tipo = (b.tipoFire || '').trim() || 'Sin clasificar'
      counts[tipo] = (counts[tipo] || 0) + 1
      if (b.devolucion === 'SI') devCounts[tipo] = (devCounts[tipo] || 0) + 1
    })
    const total = src.length || 1
    return Object.entries(counts)
      .map(([tipo, cant]) => ({
        tipo, cant,
        pct: Number((cant / total * 100).toFixed(1)),
        devolucionPct: cant > 0 ? Number(((devCounts[tipo] || 0) / cant * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.cant - a.cant)
      .slice(0, 8)
  }, [bajasConVida, churnDispAnio, churnDispSoloDevol])

  // ── Net Growth mensual (Altas REALES − bajas, con control de periodo) ───────
  const netGrowthData = useMemo(() => {
    if (!bi?.porMes?.length) return []
    const bajasMap = {}
    bajasConVida.forEach(b => {
      if (!b.anio || !b.mes) return
      const mesIdx = MESES.indexOf(b.mes)
      if (mesIdx < 0) return
      const key = `${b.anio}-${String(mesIdx + 1).padStart(2, '0')}`
      bajasMap[key] = (bajasMap[key] || 0) + 1
    })

    const n = netGrowthPeriodo === 'todos' ? bi.porMes.length : netGrowthPeriodo === '6' ? 6 : 12
    const slice = bi.porMes.slice(-n)
    let acumulado = 0
    return slice.map(m => {
      const altas = m.numActivaciones || 0
      const bajasM = bajasMap[m.key] || 0
      const net = altas - bajasM
      acumulado += net
      return { label: m.label, altas, bajas: bajasM, net, acumulado }
    })
  }, [bi, bajasConVida, netGrowthPeriodo])

  // ── Distribución de vida útil del cliente (control local: año + plan) ───────
  const lifetimeData = useMemo(() => {
    const buckets = { '<1M': 0, '1-3M': 0, '3-6M': 0, '6-12M': 0, '>12M': 0 }
    let src = bajasConVida
    if (lifetimeAnio !== 'todos') src = src.filter(b => String(b.anio) === String(lifetimeAnio))
    if (lifetimePlan !== 'todos') src = src.filter(b => (b.tipoPlan || '').trim() === lifetimePlan)
    src.forEach(b => {
      const dias = b.diasVidaReal
      if (dias == null) return
      if (dias < 30) buckets['<1M']++
      else if (dias < 90) buckets['1-3M']++
      else if (dias < 180) buckets['3-6M']++
      else if (dias < 365) buckets['6-12M']++
      else buckets['>12M']++
    })
    const colors = { '<1M': '#ef4444', '1-3M': '#f97316', '3-6M': '#eab308', '6-12M': '#22c55e', '>12M': '#06b6d4' }
    return Object.entries(buckets).map(([rango, cant]) => ({ rango, cant, color: colors[rango] }))
  }, [bajasConVida, lifetimeAnio, lifetimePlan])

  // ── Impacto financiero del churn por año (agregado histórico, sin filtro) ───
  const impactoFinanciero = useMemo(() => {
    if (!bajasPorAnio.length || !bi?.porAnio?.length) return []
    return bajasPorAnio.map(b => {
      const anioData = bi.porAnio.find(a => String(a.anio) === String(b.anio))
      const ticketAnio = anioData && anioData.numVentas > 0 ? anioData.ingresos / anioData.numVentas : fin.ticketPromedio
      return {
        anio: String(b.anio),
        bajas: b.total,
        revenueLost: Math.round(b.total * ticketAnio),
        margenPct: anioData?.margenPct || 0,
      }
    })
  }, [bajasPorAnio, bi, fin])

  // ── Estacionalidad de bajas por mes (control local: año + plan) ────────────
  const bajasPorMesCalendario = useMemo(() => {
    let src = bajasConVida
    if (estacAnio !== 'todos') src = src.filter(b => String(b.anio) === String(estacAnio))
    if (estacPlan !== 'todos') src = src.filter(b => (b.tipoPlan || '').trim() === estacPlan)
    const counts = {}
    src.forEach(b => { if (b.mes) counts[b.mes] = (counts[b.mes] || 0) + 1 })
    const max = Math.max(...Object.values(counts), 1)
    return MESES.map(m => ({ mes: m.slice(0, 3), mesNombre: m, total: counts[m] || 0, max }))
  }, [bajasConVida, estacAnio, estacPlan])

  // ── 2025 vs 2026 (control local: plan — SIN filtro de año: ese es el propio
  // eje del gráfico, filtrarlo rompería la comparación) ──────────────────────
  const bajasMensualReciente = useMemo(() => {
    const mesIdx = Object.fromEntries(MESES.map((m, i) => [m, i]))
    let src = bajasConVida
    if (comparativoPlan !== 'todos') src = src.filter(b => (b.tipoPlan || '').trim() === comparativoPlan)
    const map = {}
    src.forEach(b => {
      const anio = Number(b.anio)
      if (!b.mes || anio < 2025) return
      const idx = mesIdx[b.mes] ?? -1
      if (idx < 0) return
      if (!map[idx]) map[idx] = { mesNum: idx, mes: MESES[idx].slice(0, 3), '2025': 0, '2026': 0 }
      map[idx][String(anio)] = (map[idx][String(anio)] || 0) + 1
    })
    return MESES.map((_, i) => map[i] || { mesNum: i, mes: MESES[i].slice(0, 3), '2025': 0, '2026': 0 })
  }, [bajasConVida, comparativoPlan])

  // ── Motivos de cancelación (control local: año) ─────────────────────────────
  const bajasPorMotivo = useMemo(() => {
    let src = bajasConVida
    if (motivoAnio !== 'todos') src = src.filter(b => String(b.anio) === String(motivoAnio))
    const counts = {}
    src.forEach(b => {
      const m = (b.motivo || '').trim() || 'Sin especificar'
      counts[m] = (counts[m] || 0) + 1
    })
    return Object.entries(counts)
      .map(([motivo, total]) => ({ motivo: motivo.length > 30 ? motivo.slice(0, 28) + '…' : motivo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [bajasConVida, motivoAnio])

  // ── Recomendaciones estratégicas auto-generadas ─────────────────────────────
  const recomendaciones = useMemo(() => {
    const recs = []
    const churnPct = fin.churnRealPct || 0
    const vidaMedia = stats.vidaMediaMeses ? Number(stats.vidaMediaMeses) : null

    if (churnPct > 15) {
      recs.push({ icon: Shield, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', titulo: 'Activar retención proactiva', texto: `El churn del ${churnPct.toFixed(1)}% supera el 15%. Implementar contacto preventivo 15 días antes del vencimiento con oferta de renovación anticipada.`, prioridad: 'CRÍTICA' })
    } else if (churnPct > 8) {
      recs.push({ icon: Shield, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', titulo: 'Monitorear churn de cerca', texto: `El churn del ${churnPct.toFixed(1)}% está por encima del benchmark IPTV (8%). Considerar encuestas de satisfacción para detectar causas tempranas.`, prioridad: 'ALTA' })
    }

    if (vidaMedia && vidaMedia < 6) {
      recs.push({ icon: Clock, color: '#f97316', bg: 'rgba(249,115,22,0.08)', titulo: 'Optimizar onboarding', texto: `La vida media real del cliente es ${vidaMedia} meses. Mejorar la experiencia de los primeros 90 días es clave.`, prioridad: 'ALTA' })
    }

    if (churnPorPlan.length > 0 && churnPorPlan[0].plan !== 'Sin clasificar' && churnPorPlan[0].pct > 50) {
      recs.push({ icon: Target, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', titulo: `Revisar ${churnPorPlan[0].plan}`, texto: `El ${churnPorPlan[0].plan} concentra el ${churnPorPlan[0].pct}% de las bajas. Evaluar ajustar pricing, duración o beneficios para mejorar la retención de este segmento.`, prioridad: 'MEDIA' })
    }

    if (churnPorDispositivo.length > 0 && churnPorDispositivo[0].devolucionPct > 40) {
      recs.push({ icon: Tv, color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', titulo: `Soporte para ${churnPorDispositivo[0].tipo}`, texto: `El ${churnPorDispositivo[0].tipo} tiene ${churnPorDispositivo[0].devolucionPct}% de tasa de devolución. Evaluar guía de instalación dedicada o soporte técnico proactivo.`, prioridad: 'MEDIA' })
    }

    const netGrowth = Number(fin.netGrowthRate)
    if (netGrowth < 0) {
      recs.push({ icon: TrendingDown, color: '#dc2626', bg: 'rgba(220,38,38,0.08)', titulo: 'Base de clientes en contracción', texto: `El crecimiento neto es ${netGrowth}% — las bajas superan las altas reales (activaciones nuevas). Priorizar retención sobre adquisición hasta estabilizar la base.`, prioridad: 'CRÍTICA' })
    }

    if (fin.revenueLost > fin.ticketPromedio * 20) {
      recs.push({ icon: DollarSign, color: '#b91c1c', bg: 'rgba(185,28,28,0.08)', titulo: 'Revenue erosion significativo', texto: `Se han perdido ${formatCurrency(fin.revenueLost)} en ingresos por churn este año. Cada punto de reducción en churn equivale a ~${formatCurrency(Math.round(fin.revenueLost / (churnPct || 1)))} recuperados.`, prioridad: 'ALTA' })
    }

    return recs.length > 0 ? recs : [{ icon: Lightbulb, color: '#22c55e', bg: 'rgba(34,197,94,0.08)', titulo: 'Indicadores saludables', texto: 'Los indicadores de churn están dentro de rangos aceptables. Mantener las políticas actuales de retención y monitorear mensualmente.', prioridad: 'INFO' }]
  }, [stats, fin, churnPorPlan, churnPorDispositivo])

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mb-3" />
        <p className="text-gray-500">Cargando datos de análisis de bajas…</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 pb-12">
      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="abj-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#701a75 0%,#4c0519 100%)' }}>
        <div className="abj-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#f43f5e,transparent 70%)' }} />
        <div className="abj-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.15] pointer-events-none" style={{ background: 'radial-gradient(circle,#be123c,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/25 mb-4">
              <Activity size={12} className="text-rose-300" />
              <span className="text-rose-300 text-xs font-semibold tracking-widest uppercase">Business Intelligence</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Análisis de Bajas
            </h1>
            <p className="text-rose-100/70 text-sm mt-2">
              Drivers de negocio, impacto financiero y recomendaciones estratégicas para la alta gerencia
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-rose-200/60 text-xs font-semibold uppercase tracking-wider">Tasa de cancelación (YTD)</span>
            <span className="text-4xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              {fin.churnRealPct}%
            </span>
            <span className="text-rose-200/50 text-xs">{stats.bajasYTD} bajas / {totalOcupadas + stats.bajasYTD} base · benchmark IPTV ~8%</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 1 — KPI Cards Operativas                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="abj-a2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Users size={13} /> Métricas Operativas
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <BajaCard icon={UserX} label="Total Bajas" value={stats.total} variant="solid" sub="Histórico completo" />
          <BajaCard icon={Calendar} label={`Bajas ${stats.anioActual}`} value={stats.bajasYTD} variant="light"
            sub={`${stats.bajasYTDPrev > 0 ? `vs ${stats.bajasYTDPrev} en ${stats.anioActual - 1}` : 'Año en curso'}`}
            tag={stats.bajasYTDPrev > 0 ? { tone: stats.bajasYTD > stats.bajasYTDPrev ? 'danger' : 'success', text: `${stats.bajasYTD > stats.bajasYTDPrev ? '↑' : '↓'} ${Math.abs(Math.round((stats.bajasYTD - stats.bajasYTDPrev) / stats.bajasYTDPrev * 100))}%` } : null}
          />
          <BajaCard icon={Zap} label="Velocidad Churn" value={`${stats.velocidadChurn}/mes`} variant="outline" sub="Promedio últimos 3 meses" />
          <BajaCard icon={Clock} label="Vida Media Real" value={stats.vidaMediaMeses ? `${stats.vidaMediaMeses}M` : '—'} variant="light"
            sub={stats.vidaMediaDias ? `${stats.vidaMediaDias} días · ${coberturaVidaReal}% con dato real` : 'Sin datos cruzables'}
          />
          <BajaCard icon={ArrowDownCircle} label="Devueltos" value={stats.devueltos} variant="outline"
            sub={`${stats.total ? Math.round(stats.devueltos / stats.total * 100) : 0}% tasa de devolución`}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 2 — KPI Cards Impacto Financiero                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="abj-a3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <DollarSign size={13} /> Impacto Financiero del Churn
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <FinCard icon={HeartCrack} label="Revenue Lost YTD" value={formatCurrency(fin.revenueLost)} variant="solid" sub={`${stats.bajasYTD} bajas × ${formatCurrency(fin.ticketPromedio)} ticket`} />
          <FinCard icon={Wallet} label="MRR Erosionado" value={formatCurrency(fin.mrrPerdido)} variant="light" sub="Ingreso recurrente mensual perdido" />
          <FinCard icon={AlertTriangle} label="Valor en Riesgo" value={formatCurrency(ltv.valorEnRiesgo)} variant="outline" sub={`${ltv.clientesEnRiesgoCount || 0} clientes próximos a vencer`} />
          <FinCard icon={Tv} label="Cortesías" value={stats.cortesias} variant="light"
            sub={fin.costoDesperdiciadoCortesias > 0 ? `Costo: ${formatCurrency(fin.costoDesperdiciadoCortesias)}` : 'Servicio gratuito'}
          />
          <FinCard icon={Scale} label="Net Growth Rate" value={`${fin.netGrowthRate}%`} variant="solid"
            sub={`${fin.activacionesYTD} altas reales − ${stats.bajasYTD} bajas`}
            tag={{ tone: Number(fin.netGrowthRate) >= 0 ? 'success' : 'danger', text: Number(fin.netGrowthRate) >= 0 ? 'Crecimiento' : 'Contracción' }}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 3 — Panel de Recomendaciones Estratégicas                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Card className="border-rose-100">
        <CardHeader className="border-rose-50">
          <CardTitle>
            <Lightbulb size={16} className="inline mr-1.5 text-amber-500" />
            Recomendaciones estratégicas para la gerencia
          </CardTitle>
          <p className="text-sm text-gray-400 mt-0.5">Generadas automáticamente a partir de los indicadores actuales del negocio</p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recomendaciones.map((r, i) => (
              <div key={i} className="rounded-xl p-4 flex gap-3" style={{ background: r.bg, border: `1px solid ${r.color}20` }}>
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${r.color}18` }}>
                    <r.icon size={16} style={{ color: r.color }} />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm" style={{ color: r.color }}>{r.titulo}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${r.color}20`, color: r.color }}>{r.prioridad}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{r.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 4 — Impacto Financiero del Churn por Año                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {impactoFinanciero.length > 0 && (
        <Card className="border-rose-100">
          <CardHeader className="border-rose-50">
            <CardTitle>Impacto financiero del churn — Revenue Lost por año</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Ingreso perdido estimado (bajas × ticket promedio del año) superpuesto con el margen bruto del negocio</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={impactoFinanciero} margin={{ top: 22, right: 60, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" opacity={0.4} />
                <XAxis dataKey="anio" tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis yAxisId="rev" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#78716c' }} width={55} />
                <YAxis yAxisId="pct" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#16a34a' }} width={45} domain={[0, 'auto']} />
                <Tooltip content={<PremiumTooltip formatter={(v, name) => name.includes('Margen') ? `${v}%` : formatCurrency(v)} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="rev" dataKey="revenueLost" name="Revenue Lost" radius={[6, 6, 0, 0]} barSize={36}>
                  {impactoFinanciero.map((d, i) => <Cell key={i} fill={d.revenueLost > (impactoFinanciero[i-1]?.revenueLost || 0) ? '#ef4444' : '#fb923c'} />)}
                  <LabelList dataKey="revenueLost" position="top" formatter={v => `$${(v/1000).toFixed(0)}k`} style={{ ...LABEL_STYLE, fontSize: 11 }} />
                </Bar>
                <Line yAxisId="pct" dataKey="margenPct" name="Margen %" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: '#16a34a', stroke: '#fff', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={(() => {
              if (!impactoFinanciero.length) return null
              const totalLost = impactoFinanciero.reduce((s, d) => s + d.revenueLost, 0)
              const ultimo = impactoFinanciero[impactoFinanciero.length - 1]
              const penultimo = impactoFinanciero.length > 1 ? impactoFinanciero[impactoFinanciero.length - 2] : null
              const varPct = penultimo && penultimo.revenueLost > 0 ? ((ultimo.revenueLost - penultimo.revenueLost) / penultimo.revenueLost * 100).toFixed(1) : null
              return `El churn ha generado **${formatCurrency(totalLost)} en revenue lost** acumulado histórico. En ${ultimo.anio} se perdieron **${formatCurrency(ultimo.revenueLost)}**${varPct ? ` (${Number(varPct) >= 0 ? '+' : ''}${varPct}% vs año anterior)` : ''}. El margen bruto del último año cerró en **${ultimo.margenPct}%** — ${ultimo.margenPct < 40 ? 'la erosión por churn está presionando la rentabilidad.' : 'el margen se mantiene saludable a pesar del churn.'}`
            })()} />
          </CardBody>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 5 — Churn por Tipo de Plan + Dispositivo (side by side)       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Churn por Plan */}
        <Card className="border-rose-100">
          <CardHeader className="border-rose-50 flex-col items-start gap-2">
            <div>
              <CardTitle>Churn por tipo de plan</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">¿Qué planes pierden más clientes? — Driver para ajustar pricing y beneficios</p>
            </div>
            <ChartControlsRow>
              <ChartChips options={chipsAnio} value={churnPlanAnio} onChange={setChurnPlanAnio} />
              <ChartToggle active={churnPlanExclCortesia} onClick={() => setChurnPlanExclCortesia(v => !v)}>Excl. cortesías</ChartToggle>
            </ChartControlsRow>
          </CardHeader>
          <CardBody>
            {churnPorPlan.filter(p => p.plan !== 'Sin clasificar').length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={Math.max(160, churnPorPlan.length * 38)}>
                  <ComposedChart layout="vertical" data={churnPorPlan} margin={{ top: 4, right: 60, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" opacity={0.3} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#78716c' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="plan" tick={{ fontSize: 11, fill: '#4b5563', fontWeight: 600 }} width={120} />
                    <Tooltip formatter={(v) => [v, 'Bajas']} />
                    <Bar dataKey="cant" name="Bajas" radius={[0, 5, 5, 0]} maxBarSize={28}>
                      {churnPorPlan.map((_, i) => <Cell key={i} fill={i === 0 ? '#e11d48' : i < 2 ? '#f97316' : '#fbbf24'} />)}
                      <LabelList dataKey="pct" position="right" formatter={v => `${v}%`}
                        style={{ fontSize: 11, fontWeight: 700, fill: '#1e293b' }} />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
                <ChartInsight text={(() => {
                  const top = churnPorPlan.filter(p => p.plan !== 'Sin clasificar')[0]
                  if (!top) return null
                  return `El **${top.plan}** lidera con **${top.cant} bajas (${top.pct}%)** del total${churnPlanAnio !== 'todos' ? ` en ${churnPlanAnio}` : ' histórico'}. ${top.pct > 50 ? 'Concentración muy alta — evaluar incentivos de retención o migración a planes más largos.' : 'Distribución relativamente balanceada entre planes.'}`
                })()} />
              </>
            ) : <p className="text-sm text-gray-400 text-center py-8">Sin bajas con estos filtros</p>}
          </CardBody>
        </Card>

        {/* Churn por Dispositivo */}
        <Card className="border-rose-100">
          <CardHeader className="border-rose-50 flex-col items-start gap-2">
            <div>
              <CardTitle>Churn por tipo de dispositivo</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">¿Hay dispositivos que generan más cancelaciones? — Driver para soporte técnico</p>
            </div>
            <ChartControlsRow>
              <ChartChips options={chipsAnio} value={churnDispAnio} onChange={setChurnDispAnio} />
              <ChartToggle active={churnDispSoloDevol} onClick={() => setChurnDispSoloDevol(v => !v)}>Solo con devolución</ChartToggle>
            </ChartControlsRow>
          </CardHeader>
          <CardBody>
            {churnPorDispositivo.filter(d => d.tipo !== 'Sin clasificar').length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={Math.max(160, churnPorDispositivo.length * 38)}>
                  <ComposedChart layout="vertical" data={churnPorDispositivo} margin={{ top: 4, right: 60, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" opacity={0.3} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#78716c' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="tipo" tick={{ fontSize: 11, fill: '#4b5563', fontWeight: 600 }} width={120} />
                    <Tooltip formatter={(v, name) => [name === 'Devolución %' ? `${v}%` : v, name]} />
                    <Bar dataKey="cant" name="Bajas" radius={[0, 5, 5, 0]} maxBarSize={28}>
                      {churnPorDispositivo.map((_, i) => <Cell key={i} fill={i === 0 ? '#e11d48' : i < 3 ? '#f97316' : '#fca5a5'} />)}
                      <LabelList dataKey="devolucionPct" position="right" formatter={v => `Dev: ${v}%`}
                        style={{ fontSize: 10, fontWeight: 600, fill: '#dc2626' }} />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
                <ChartInsight text={(() => {
                  const top = churnPorDispositivo.filter(d => d.tipo !== 'Sin clasificar')[0]
                  if (!top) return null
                  return `El **${top.tipo}** concentra **${top.cant} bajas (${top.pct}%)** con tasa de devolución del **${top.devolucionPct}%**. ${top.devolucionPct > 30 ? 'Tasa de devolución elevada — posible indicador de problemas técnicos o de compatibilidad.' : 'Tasa de devolución dentro de rangos normales.'}`
                })()} />
              </>
            ) : <p className="text-sm text-gray-400 text-center py-8">Sin bajas con estos filtros</p>}
          </CardBody>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 6 — Net Growth Mensual                                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {netGrowthData.length > 0 && (
        <Card className="border-rose-100">
          <CardHeader className="border-rose-50 flex-col items-start gap-2">
            <div>
              <CardTitle>
                <ArrowUpDown size={15} className="inline mr-1.5" />
                Net Growth — Altas reales vs Bajas {netGrowthPeriodo !== 'todos' ? `(últimos ${netGrowthPeriodo} meses)` : '(histórico completo)'}
              </CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">Activaciones nuevas (no renovaciones) menos cancelaciones · La línea muestra el crecimiento acumulado de la base de clientes</p>
            </div>
            <ChartControlsRow>
              <ChartChips options={[{ key: '6', label: '6M' }, { key: '12', label: '12M' }, { key: 'todos', label: 'Todos' }]} value={netGrowthPeriodo} onChange={setNetGrowthPeriodo} />
            </ChartControlsRow>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={netGrowthData} margin={{ top: 22, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis yAxisId="bars" tick={{ fontSize: 10, fill: '#78716c' }} allowDecimals={false} />
                <YAxis yAxisId="line" orientation="right" tick={{ fontSize: 10, fill: '#7c3aed' }} allowDecimals={false} />
                <Tooltip content={<PremiumTooltip formatter={(v, name) => v} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="bars" dataKey="altas" name="Altas reales" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={24}>
                  <LabelList dataKey="altas" position="top" formatter={v => v > 0 ? v : ''} style={{ fontSize: 9, fontWeight: 700, fill: '#16a34a' }} />
                </Bar>
                <Bar yAxisId="bars" dataKey="bajas" name="Bajas" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={24}>
                  <LabelList dataKey="bajas" position="top" formatter={v => v > 0 ? v : ''} style={{ fontSize: 9, fontWeight: 700, fill: '#be123c' }} />
                </Bar>
                <Line yAxisId="line" dataKey="acumulado" name="Net acumulado" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={(() => {
              const totalAltas = netGrowthData.reduce((s, d) => s + d.altas, 0)
              const totalBajas = netGrowthData.reduce((s, d) => s + d.bajas, 0)
              const net = totalAltas - totalBajas
              const ultimo = netGrowthData[netGrowthData.length - 1]
              return `En el período mostrado: **${totalAltas} altas reales** (activaciones nuevas, sin contar renovaciones) vs **${totalBajas} bajas** = **${net >= 0 ? '+' : ''}${net} neto**. ${net > 0 ? `La base de clientes creció — net acumulado de **${ultimo.acumulado}** al último mes.` : `La base se contrajo — se necesitan **${Math.abs(net)} activaciones nuevas adicionales** solo para recuperar la base perdida.`}`
            })()} />
          </CardBody>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 7 — Customer Lifetime Distribution                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {lifetimeData.some(d => d.cant > 0) && (
        <Card className="border-rose-100">
          <CardHeader className="border-rose-50 flex-col items-start gap-2">
            <div>
              <CardTitle>Distribución de vida útil del cliente</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">¿Cuánto tiempo permanecen los clientes antes de darse de baja? — calculado con la fecha real de activación (Ventas), no con el campo "Fecha" de Bajas</p>
            </div>
            <ChartControlsRow>
              <ChartChips options={chipsAnio} value={lifetimeAnio} onChange={setLifetimeAnio} />
              <ChartChips options={chipsPlan} value={lifetimePlan} onChange={setLifetimePlan} />
            </ChartControlsRow>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={lifetimeData} margin={{ top: 22, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" opacity={0.4} />
                <XAxis dataKey="rango" tick={{ fontSize: 12, fill: '#78716c', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} width={32} />
                <Tooltip formatter={(v) => [v, 'Clientes']} />
                <Bar dataKey="cant" name="Clientes" radius={[6, 6, 0, 0]} maxBarSize={52}>
                  {lifetimeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  <LabelList dataKey="cant" position="top" style={{ fontSize: 12, fontWeight: 800, fill: '#1e293b', stroke: '#fff', strokeWidth: 3, strokeLinejoin: 'round', paintOrder: 'stroke' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ChartInsight text={(() => {
              const total = lifetimeData.reduce((s, d) => s + d.cant, 0)
              if (!total) return null
              const earlyChurn = lifetimeData.slice(0, 2).reduce((s, d) => s + d.cant, 0)
              const pctEarly = Math.round(earlyChurn / total * 100)
              const loyal = lifetimeData[lifetimeData.length - 1].cant
              const pctLoyal = Math.round(loyal / total * 100)
              return `De las bajas con activación real cruzada: el **${pctEarly}% se fue antes de 3 meses** (churn temprano — señal de problemas en onboarding/primeros días). Un **${pctLoyal}% duró más de 12 meses** (clientes fieles cuya pérdida tiene mayor impacto en LTV). ${pctEarly > 40 ? '**Acción recomendada:** Reforzar la experiencia de los primeros 90 días con soporte proactivo y check-ins.' : 'La distribución sugiere una retención inicial razonable.'}`
            })()} />
          </CardBody>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* GRÁFICAS EXISTENTES (mejoradas)                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* Comparativo año a año (agregado histórico, sin filtro) */}
      {bajasPorAnio.length > 0 && (
        <Card className="border-rose-100">
          <CardHeader className="border-rose-50">
            <CardTitle>Bajas — comparativo año a año</CardTitle>
            <p className="text-sm text-gray-400 mt-0.5">Cancelaciones registradas por año — la otra cara de la moneda del crecimiento de la cartera</p>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={bajasPorAnio} margin={{ top: 22, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" opacity={0.4} />
                <XAxis dataKey="anio" tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v, name) => [v, name === 'total' ? 'Bajas' : name]}
                  labelFormatter={(v, payload) => {
                    const d = payload?.[0]?.payload
                    return d?.variacionPct != null ? `Año ${v} · ${d.variacionPct >= 0 ? '+' : ''}${d.variacionPct}% vs. año anterior` : `Año ${v}`
                  }}
                />
                <Bar dataKey="total" name="Bajas" radius={[6, 6, 0, 0]} barSize={36}>
                  {bajasPorAnio.map((_, i) => <Cell key={i} fill="#f43f5e" />)}
                  <LabelList dataKey="total" position="top" formatter={(v) => v.toLocaleString('es-CO')} style={{ ...LABEL_STYLE, fontSize: 12 }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={narrarBajasPorAnio(bajasPorAnio)} />
          </CardBody>
        </Card>
      )}

      {/* Estacionalidad por mes */}
      {bajas?.length > 0 && (
        <Card className="border-rose-100">
          <CardHeader className="border-rose-50 flex-col items-start gap-2">
            <div>
              <CardTitle>Estacionalidad de bajas por mes</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">Cancelaciones por mes del calendario · Revela cuándo se concentra el churn</p>
            </div>
            <ChartControlsRow>
              <ChartChips options={chipsAnio} value={estacAnio} onChange={setEstacAnio} />
              <ChartChips options={chipsPlan} value={estacPlan} onChange={setEstacPlan} />
            </ChartControlsRow>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={bajasPorMesCalendario} margin={{ top: 22, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" opacity={0.4} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} width={32} />
                <Tooltip formatter={(v) => [v, 'Bajas']} />
                <Bar dataKey="total" name="Bajas" radius={[5, 5, 0, 0]} maxBarSize={44}>
                  {bajasPorMesCalendario.map((d, i) => (
                    <Cell key={i} fill={
                      d.total === d.max ? '#e11d48'
                      : d.total >= d.max * 0.7 ? '#f43f5e'
                      : d.total >= d.max * 0.4 ? '#fb923c'
                      : '#fca5a5'
                    } />
                  ))}
                  <LabelList dataKey="total" position="top"
                    style={{ fontSize: 11, fontWeight: 700, fill: '#1e293b', stroke: '#fff', strokeWidth: 3, strokeLinejoin: 'round', paintOrder: 'stroke' }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={(() => {
              const total = bajasPorMesCalendario.reduce((s, m) => s + m.total, 0)
              if (!total) return `Sin bajas con estos filtros${estacAnio !== 'todos' ? ` en ${estacAnio}` : ''}.`
              const pico = bajasPorMesCalendario.reduce((a, b) => b.total > a.total ? b : a)
              const q1 = bajasPorMesCalendario.slice(0, 3).reduce((s, m) => s + m.total, 0)
              const pctQ1 = Math.round(q1 / total * 100)
              return `El mes con más cancelaciones${estacAnio !== 'todos' ? ` en ${estacAnio}` : ' históricas'} es **${pico.mesNombre} (${pico.total} bajas)**, con ${Math.round(pico.total / total * 100)}% del total. ${pctQ1 > 35 ? `El primer trimestre (Ene–Mar) concentra el **${pctQ1}% del churn**${estacAnio === 'todos' ? ' anual' : ''} — señal de estacionalidad post-renovación de año que conviene anticipar con acciones de retención en diciembre.` : 'La distribución es relativamente uniforme, sin un pico estacional dominante — el churn ocurre todo el año.'}`
            })()} />
          </CardBody>
        </Card>
      )}

      {/* 2025 vs 2026 */}
      {bajas?.some(b => Number(b.anio) >= 2025) && (
        <Card className="border-rose-100">
          <CardHeader className="border-rose-50 flex-col items-start gap-2">
            <div>
              <CardTitle>Bajas mensuales — 2025 vs 2026</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">Comparación mes a mes entre el año anterior y el año en curso · Detecta si el churn mejora o empeora</p>
            </div>
            <ChartControlsRow>
              <ChartChips options={chipsPlan} value={comparativoPlan} onChange={setComparativoPlan} />
            </ChartControlsRow>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={bajasMensualReciente} margin={{ top: 22, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" opacity={0.4} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} width={32} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="2025" name="2025" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={22}>
                  <LabelList dataKey="2025" position="top"
                    formatter={v => v > 0 ? v : ''}
                    style={{ fontSize: 10, fontWeight: 700, fill: '#475569' }} />
                </Bar>
                <Bar dataKey="2026" name="2026" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={22}>
                  <LabelList dataKey="2026" position="top"
                    formatter={v => v > 0 ? v : ''}
                    style={{ fontSize: 10, fontWeight: 700, fill: '#be123c' }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={(() => {
              const total25 = bajasMensualReciente.reduce((s, m) => s + (m['2025'] || 0), 0)
              const total26 = bajasMensualReciente.reduce((s, m) => s + (m['2026'] || 0), 0)
              if (!total25 && !total26) return `Sin bajas con este filtro${comparativoPlan !== 'todos' ? ` (${comparativoPlan})` : ''}.`
              const meses26 = bajasMensualReciente.filter(m => m['2026'] > 0).length
              const ritmo = meses26 > 0 ? (total26 / meses26).toFixed(1) : 0
              const proyAnual = meses26 > 0 ? Math.round(total26 / meses26 * 12) : 0
              // Comparar la PROYECCIÓN anualizada (no el total parcial) contra el año
              // completo anterior — comparar total26 (año en curso) vs total25 (año
              // completo) subestima el churn real solo porque 2026 lleva menos meses.
              const varPct = total25 > 0 && meses26 > 0 ? ((proyAnual - total25) / total25 * 100).toFixed(1) : null
              return `En **2025** se registraron **${total25} bajas** en el año completo. En lo corrido de **2026** van **${total26} bajas** (${meses26} mes${meses26 !== 1 ? 'es' : ''}, ritmo: ${ritmo}/mes → proyección anual ~${proyAnual}).${varPct ? ` Al ritmo actual el año cerraría con un **${Number(varPct) >= 0 ? '+' : ''}${varPct}% vs 2025** — ${Number(varPct) > 10 ? 'tendencia preocupante que requiere acciones de retención.' : Number(varPct) < -10 ? 'tendencia positiva, el churn está mejorando.' : 'variación dentro de rangos normales.'}` : ''}`
            })()} />
          </CardBody>
        </Card>
      )}

      {/* Motivos de cancelación */}
      {bajasPorMotivo.filter(m => m.motivo !== 'Sin especificar').length > 0 && (
        <Card className="border-rose-100 mb-6">
          <CardHeader className="border-rose-50 flex-col items-start gap-2">
            <div>
              <CardTitle>Motivos de cancelación (top {bajasPorMotivo.length})</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">Razones declaradas al registrar la baja · Útil para priorizar mejoras de retención</p>
            </div>
            <ChartControlsRow>
              <ChartChips options={chipsAnio} value={motivoAnio} onChange={setMotivoAnio} />
            </ChartControlsRow>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={Math.max(200, bajasPorMotivo.length * 34)}>
              <ComposedChart layout="vertical" data={bajasPorMotivo} margin={{ top: 4, right: 48, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fecdd3" opacity={0.3} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#78716c' }} allowDecimals={false} />
                <YAxis type="category" dataKey="motivo" tick={{ fontSize: 10, fill: '#4b5563' }} width={170} />
                <Tooltip formatter={(v) => [v, 'Bajas']} />
                <Bar dataKey="total" name="Bajas" radius={[0, 5, 5, 0]} maxBarSize={28}>
                  {bajasPorMotivo.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#e11d48' : i < 3 ? '#f97316' : '#fbbf24'} />
                  ))}
                  <LabelList dataKey="total" position="right"
                    style={{ fontSize: 11, fontWeight: 700, fill: '#1e293b' }} />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <ChartInsight text={(() => {
              const conMotivo = bajasPorMotivo.filter(m => m.motivo !== 'Sin especificar')
              if (!conMotivo.length) return null
              const total = bajasPorMotivo.reduce((s, m) => s + m.total, 0)
              const top1 = conMotivo[0]
              const top3 = conMotivo.slice(0, 3).reduce((s, m) => s + m.total, 0)
              const pct3 = Math.round(top3 / total * 100)
              return `El motivo más frecuente es **"${top1.motivo}" (${top1.total} bajas)**. Los **3 primeros motivos concentran el ${pct3}%** del total con causa declarada — atacar esas raíces es lo que más impacto tiene sobre la tasa de churn.`
            })()} />
          </CardBody>
        </Card>
      )}
    </div>
  )
}
