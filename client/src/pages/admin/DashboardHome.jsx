import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Package, FileText, Tv, DollarSign, AlertCircle, Clock, TrendingUp,
  Wallet, PiggyBank, Percent, BarChart3, Lightbulb, Activity,
  Trophy, Hourglass, RefreshCw, Calendar, Receipt, Download, Upload, ShieldAlert,
  CheckCircle2, ChevronRight,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Area, PieChart, Pie, Cell, LabelList,
} from 'recharts'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { KpiCard } from '../../components/ui/KpiCard'
import { formatCurrency } from '../../utils/excelUtils'
import { cn } from '../../utils/cn'
import { calcDias, getRowVariant, diasLabel } from './planificador/rowHelpers'
import { CategoryPanel, screenToVentaPrefill, CATEGORY_CONFIG } from './planificador/CategoryPanel'
import { IngresoPorClientePanel } from './dashboard/IngresoPorClientePanel'
import {
  BiCard, GrowthBadge, SmartTag, ChartTooltip, ChartInsight,
  PIE_COLORS, MES_LABELS, LABEL_STYLE, formatCompactCurrency, renderDonutLabel,
} from './dashboard/biShared'

const CSS = `
  @keyframes dash-fade-up { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes dash-orb-1   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(30px,-20px) scale(1.08) } }
  @keyframes dash-orb-2   { 0%,100% { transform:translate(0,0) scale(1) } 50% { transform:translate(-25px,15px) scale(1.05) } }
  @keyframes dash-glow   { 0%,100% { box-shadow: 0 0 0 0 rgba(249,115,22,.4) } 50% { box-shadow: 0 0 0 8px rgba(249,115,22,0) } }
  @keyframes dash-pulse  { 0%,100% { opacity: 1 } 50% { opacity: 0.8 } }
  .dash-a1 { animation: dash-fade-up .45s cubic-bezier(.22,1,.36,1) both }
  .dash-a2 { animation: dash-fade-up .45s cubic-bezier(.22,1,.36,1) .06s both }
  .dash-a3 { animation: dash-fade-up .45s cubic-bezier(.22,1,.36,1) .12s both }
  .dash-orb-1 { animation: dash-orb-1 8s ease-in-out infinite }
  .dash-orb-2 { animation: dash-orb-2 11s ease-in-out infinite }
  .dash-cta {
    background: linear-gradient(135deg, #f97316, #fb923c);
    box-shadow: 0 4px 18px rgba(249,115,22,.4);
    transition: all .22s cubic-bezier(.22,1,.36,1);
    border: none;
    color: white;
    font-weight: 600;
  }
  .dash-cta:hover {
    box-shadow: 0 12px 32px rgba(249,115,22,.5);
    transform: translateY(-3px);
    background: linear-gradient(135deg, #fb923c, #fdba74);
  }
  .dash-card {
    transition: all .3s cubic-bezier(.22,1,.36,1);
    border: 1px solid rgba(255,255,255,.1);
    background: linear-gradient(135deg, rgba(255,255,255,.02), rgba(255,255,255,.01));
  }
  .dash-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,.15);
    border-color: rgba(249,115,22,.3);
    background: linear-gradient(135deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
  }
  .dash-kpi {
    transition: all .25s cubic-bezier(.22,1,.36,1);
    position: relative;
  }
  .dash-kpi:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,.15), 0 0 20px rgba(249,115,22,.2);
  }
  .dash-kpi::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(249,115,22,.1), transparent);
    border-radius: inherit;
    opacity: 0;
    transition: opacity .25s ease;
    pointer-events: none;
  }
  .dash-kpi:hover::before {
    opacity: 1;
  }
  .dash-chart-card {
    transition: all .3s ease;
  }
  .dash-chart-card:hover {
    box-shadow: 0 12px 32px rgba(0,0,0,.12);
  }
  @media (prefers-reduced-motion: reduce) {
    .dash-a1, .dash-a2, .dash-a3, .dash-orb-1, .dash-orb-2, .dash-card, .dash-kpi { animation: none !important; transition: none !important }
    .dash-kpi::before { display: none !important }
  }
`

// ─── Stat card (KPIs operativos) ─────────────────────────────────────────────
// Al hacer clic abre el modal explicativo del cálculo (con acceso al módulo fuente).

// StatCard → KpiCard global (dark Huashu)
// El Dashboard usa `color` (clase Tailwind) — lo mapeamos a tone
const COLOR_MAP = {
  'brand-primary': 'orange', orange: 'orange',
  blue: 'sky', green: 'emerald',
  purple: 'purple', amber: 'amber', red: 'red',
}
// ─── Centro de alertas operativas ────────────────────────────────────────────
// Patrón de dashboard ejecutivo: lo que requiere acción hoy va primero, con
// severidad semántica (rojo = urgente, ámbar = atención, verde = oportunidad).

const ALERT_TONES = {
  error:   { iconBg: 'bg-red-50',     iconText: 'text-red-600' },
  warning: { iconBg: 'bg-amber-50',   iconText: 'text-amber-600' },
  info:    { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
}
const ALERT_ORDER = { error: 0, warning: 1, info: 2 }

function AlertRow({ alerta }) {
  const t = ALERT_TONES[alerta.tone]
  const Icon = alerta.icon
  const clickable = Boolean(alerta.onClick)
  return (
    <button
      onClick={alerta.onClick}
      disabled={!clickable}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
        clickable ? 'hover:bg-orange-50/40 cursor-pointer' : 'cursor-default'
      )}
    >
      <span className={cn('p-2 rounded-lg flex-shrink-0', t.iconBg)}>
        <Icon size={16} className={t.iconText} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-brand-accent">{alerta.titulo}</span>
        <span className="block text-xs text-gray-500">{alerta.detalle}</span>
      </span>
      {clickable && <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />}
    </button>
  )
}

function StatCard({ icon, title, value, color, subtitle, onClick }) {
  const tone = Object.entries(COLOR_MAP).find(([k]) => color?.includes(k))?.[1] || 'indigo'
  return (
    <div className="dash-kpi" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <KpiCard icon={icon} label={title} value={value} sub={subtitle} tone={tone} />
    </div>
  )
}

// ─── Narrativas de las gráficas que permanecen en el Dashboard ───────────────

function narrarIngresosCostosAnio(porAnio) {
  if (!porAnio?.length) return null
  const conCrecimiento = porAnio.filter(a => a.crecimientoIngresosPct != null)
  const relatos = conCrecimiento.map(a => {
    const signoIng = a.crecimientoIngresosPct >= 0 ? '+' : ''
    const lectura = a.crecimientoCostosPct == null
      ? ''
      : a.crecimientoIngresosPct > a.crecimientoCostosPct
        ? ' (el ingreso le ganó al costo → el margen se amplía)'
        : ' (el costo creció más que el ingreso → el margen se comprime)'
    return `**${a.anio}**: ingreso ${signoIng}${a.crecimientoIngresosPct.toFixed(1)}%, margen ${a.margenPct.toFixed(1)}%${lectura}`
  })
  const ultimo = porAnio[porAnio.length - 1]
  const penultimo = porAnio[porAnio.length - 2]
  const pareceParcial = penultimo && ultimo.numVentas < penultimo.numVentas * 0.9
  return `Leyendo barra por barra, año a año: ${relatos.join('; ')}.${pareceParcial
    ? ` La barra de **${ultimo.anio}** se ve más baja porque el año está en curso (${ultimo.numVentas} ventas registradas frente a ${penultimo.numVentas} del ${penultimo.anio} ya cerrado) — no es una contracción real, es un corte parcial; para comparar de forma justa usa el comparativo "año corrido" (YTD) de arriba.`
    : ` La línea morada (margen %) se mantiene en un rango alto y estable, lo que confirma que el crecimiento del negocio no ha sacrificado eficiencia de costos.`}`
}

function narrarEvolucionAnual(porAnio) {
  if (!porAnio?.length) return null
  const primero = porAnio[0]
  const ultimo = porAnio[porAnio.length - 1]
  if (primero === ultimo) return null
  const variacion = (ini, fin) => (ini > 0 ? ((fin - ini) / ini) * 100 : null)
  const crecIngresos = variacion(primero.ingresos, ultimo.ingresos)
  const crecCostos = variacion(primero.costos, ultimo.costos)
  const crecMargen = variacion(primero.margen, ultimo.margen)
  const signo = (v) => (v >= 0 ? '+' : '')
  const lecturaFinal = crecIngresos != null && crecCostos != null
    ? (crecIngresos > crecCostos
      ? ' La curva verde (ganancia) se separa cada vez más de la gris (costos): el negocio gana eficiencia a medida que crece — cada peso adicional de ingreso deja más ganancia que el anterior.'
      : ' La curva gris (costos) crece más rápido que la naranja (ingresos): vale la pena vigilar el costo unitario, porque está erosionando la ganancia a medida que el negocio escala.')
    : ''
  return `Entre **${primero.anio}** y **${ultimo.anio}**: los ingresos pasaron de ${formatCurrency(primero.ingresos)} a ${formatCurrency(ultimo.ingresos)}${crecIngresos != null ? ` (${signo(crecIngresos)}${crecIngresos.toFixed(0)}%)` : ''}, los costos de ${formatCurrency(primero.costos)} a ${formatCurrency(ultimo.costos)}${crecCostos != null ? ` (${signo(crecCostos)}${crecCostos.toFixed(0)}%)` : ''}, y la ganancia (margen bruto en pesos) de ${formatCurrency(primero.margen)} a ${formatCurrency(ultimo.margen)}${crecMargen != null ? ` (${signo(crecMargen)}${crecMargen.toFixed(0)}%)` : ''}.${lecturaFinal}`
}

function narrarTendenciaMensual(porMes) {
  if (!porMes?.length) return null
  const conVentas = porMes.filter(m => m.numVentas > 0)
  if (conVentas.length < 2) return null
  const pico = conVentas.reduce((a, b) => (b.ingresos > a.ingresos ? b : a))
  const valle = conVentas.reduce((a, b) => (b.ingresos < a.ingresos ? b : a))
  const promedio = conVentas.reduce((s, m) => s + m.ingresos, 0) / conVentas.length
  const ultimos3 = conVentas.slice(-3)
  const promUltimos3 = ultimos3.reduce((s, m) => s + m.ingresos, 0) / ultimos3.length
  const tendencia = promUltimos3 >= promedio ? 'por encima' : 'por debajo'
  return `El mes de mayor ingreso histórico fue **${pico.label}** (${formatCurrency(pico.ingresos)}) y el más bajo **${valle.label}** (${formatCurrency(valle.ingresos)}) — esa diferencia es la huella de la **estacionalidad** (meses de mayor actividad de recargas y renovaciones). El promedio mensual histórico es ${formatCurrency(Math.round(promedio))}; los últimos tres meses con actividad promedian ${formatCurrency(Math.round(promUltimos3))}, **${tendencia}** del promedio histórico — una pista temprana de hacia dónde se dirige la tendencia de corto plazo, antes de que se refleje en el cierre anual.`
}

function narrarVentasLicenciaAnio(resumen, anio) {
  if (!resumen) return null
  const { totalIngresos, totalVentas, ticketPromedio, promedioMensual, mejorMes, peorMes, crecimientoIngresosPct, crecimientoVentasPct, mesesConDatos } = resumen
  if (totalVentas === 0) {
    return `**${anio}** no registra ventas de licencias en el periodo consultado. Verifica que las ventas de ese año ya estén registradas/importadas en el módulo de Ventas, o selecciona otro año en el filtro.`
  }
  const partes = []
  partes.push(`**Resumen ${anio}**: se registraron **${totalVentas} venta${totalVentas === 1 ? '' : 's'} de licencias** por un total de **${formatCurrency(totalIngresos)}**, con un ticket promedio de ${formatCurrency(ticketPromedio)} y un promedio mensual de ${formatCurrency(promedioMensual)} sobre ${mesesConDatos} mes${mesesConDatos === 1 ? '' : 'es'} con actividad.`)
  if (mejorMes && peorMes && mejorMes.label !== peorMes.label) {
    partes.push(` El mes de mejor desempeño fue **${mejorMes.label}** (${formatCurrency(mejorMes.ingresos)} · ${mejorMes.numVentas} ventas) y el más bajo **${peorMes.label}** (${formatCurrency(peorMes.ingresos)} · ${peorMes.numVentas} ventas) — esa brecha marca la estacionalidad dentro del año.`)
  }
  if (crecimientoIngresosPct != null) {
    const signoIng = crecimientoIngresosPct >= 0 ? '+' : ''
    const signoVentas = crecimientoVentasPct != null ? (crecimientoVentasPct >= 0 ? '+' : '') : ''
    partes.push(` Frente a ${anio - 1}, el ingreso por ventas de licencias varió ${signoIng}${crecimientoIngresosPct.toFixed(1)}%${crecimientoVentasPct != null ? ` y el número de ventas ${signoVentas}${crecimientoVentasPct.toFixed(1)}%` : ''}.`)
    partes.push(crecimientoIngresosPct >= 0
      ? ` **Conclusión**: la tendencia interanual es positiva — conviene sostener las acciones comerciales y de retención que impulsaron este crecimiento, y reforzarlas en los meses de menor actividad (${peorMes?.label || '—'}) para suavizar la estacionalidad.`
      : ` **Conclusión**: ${anio} muestra una contracción frente a ${anio - 1} — conviene activar campañas de renovación/reactivación enfocadas en los meses de menor actividad (${peorMes?.label || '—'}) y revisar si la caída responde a estacionalidad o a un problema estructural (churn, competencia, precio).`)
  } else {
    partes.push(` No hay un año anterior con datos para comparar el crecimiento. **Conclusión**: usa ${anio} como línea base y vigila especialmente los meses de menor actividad (${peorMes?.label || '—'}) para anticipar la estacionalidad de los próximos cierres.`)
  }
  return partes.join('')
}

function narrarVentasLicenciaMes(resumen, mes, anio) {
  if (!resumen?.mesDetalle) return null
  const { mesActual, mesAnteriorAnio, ticketPromedioMes, crecimientoIngresosMesPct, crecimientoVentasMesPct, pctDelAnio } = resumen.mesDetalle
  const nombreMes = MES_LABELS[mes - 1]
  if (mesActual.numVentas === 0) {
    return `**${nombreMes} ${anio}** no registra ventas de licencias.${mesAnteriorAnio?.numVentas
      ? ` En ${nombreMes} ${anio - 1} sí hubo **${mesAnteriorAnio.numVentas} venta${mesAnteriorAnio.numVentas === 1 ? '' : 's'}** (${formatCurrency(mesAnteriorAnio.ingresos)}) — vale la pena revisar si hay ventas de ese mes pendientes de registrar.`
      : ' Selecciona otro mes en el filtro o verifica los datos importados en el módulo de Ventas.'}`
  }
  const partes = []
  partes.push(`**${nombreMes} ${anio}**: **${mesActual.numVentas} venta${mesActual.numVentas === 1 ? '' : 's'} de licencias** por **${formatCurrency(mesActual.ingresos)}** (ticket promedio ${formatCurrency(ticketPromedioMes)}), equivalente al **${pctDelAnio}% del ingreso total de ${anio}** por este concepto.`)
  if (crecimientoIngresosMesPct != null) {
    const signoIng = crecimientoIngresosMesPct >= 0 ? '+' : ''
    const signoVentas = crecimientoVentasMesPct != null ? (crecimientoVentasMesPct >= 0 ? '+' : '') : ''
    partes.push(` Frente a ${nombreMes} ${anio - 1} (${formatCurrency(mesAnteriorAnio.ingresos)} · ${mesAnteriorAnio.numVentas} venta${mesAnteriorAnio.numVentas === 1 ? '' : 's'}), el ingreso varió ${signoIng}${crecimientoIngresosMesPct.toFixed(1)}%${crecimientoVentasMesPct != null ? ` y el número de ventas ${signoVentas}${crecimientoVentasMesPct.toFixed(1)}%` : ''}.`)
    partes.push(crecimientoIngresosMesPct >= 0
      ? ` **Conclusión**: ${nombreMes} mejoró frente al mismo mes del año pasado — buena señal si se sostiene en los próximos cierres mensuales.`
      : ` **Conclusión**: ${nombreMes} quedó por debajo del mismo mes del año pasado — vale la pena revisar si hay una causa puntual (menos campañas, estacionalidad, competencia) antes del próximo cierre.`)
  } else {
    partes.push(` No hay datos de ${nombreMes} ${anio - 1} para comparar interanualmente.`)
  }
  return partes.join('')
}

function narrarComposicion(tipoPago) {
  if (!tipoPago?.length) return null
  const principal = tipoPago[0]
  const segundo = tipoPago[1]
  return `**${principal.tipo}** domina la composición del ingreso con ${principal.pctTotal.toFixed(1)}% (${formatCurrency(principal.total)} en ${principal.cantidad} transacciones)${segundo ? `, seguido de **${segundo.tipo}** con ${segundo.pctTotal.toFixed(1)}%` : ''}. ${principal.tipo === 'Renovacion'
    ? 'Que las renovaciones encabecen la lista confirma que el ingreso es, en su mayoría, **recurrente y predecible** — la prioridad financiera es proteger esa base (retención) antes que invertir agresivamente en captar clientes nuevos.'
    : 'Conviene vigilar si esta composición se mantiene estable en el tiempo: un peso alto de activaciones nuevas frente a renovaciones puede señalar dependencia de la adquisición constante de clientes, con su correspondiente costo.'}`
}

// ─── Análisis económico-financiero (narrativa generada desde los datos) ──────

function FinancialAnalysis({ bi }) {
  if (!bi) return null
  const { kpis, porAnio, comparativoYTD, tipoPago } = bi
  const ultimo = porAnio[porAnio.length - 1]
  const penultimo = porAnio[porAnio.length - 2]
  const primero = porAnio[0]

  const aniosCompletos = porAnio.slice(0, -1)
  const cagr = aniosCompletos.length > 1
    ? (Math.pow(aniosCompletos[aniosCompletos.length - 1].ingresos / aniosCompletos[0].ingresos, 1 / (aniosCompletos.length - 1)) - 1) * 100
    : null

  const activacion = tipoPago.find(t => t.tipo === 'Activacion Pantalla')

  const items = []

  if (cagr != null) {
    items.push({
      tone: cagr > 15 ? 'good' : cagr > 0 ? 'neutral' : 'bad',
      title: 'Crecimiento estructural (CAGR)',
      text: `Entre ${aniosCompletos[0].anio} y ${aniosCompletos[aniosCompletos.length - 1].anio} los ingresos crecieron a una tasa compuesta anual (CAGR) de ${cagr.toFixed(1)}%, pasando de ${formatCurrency(aniosCompletos[0].ingresos)} a ${formatCurrency(aniosCompletos[aniosCompletos.length - 1].ingresos)}. ${cagr > 30 ? 'Es una expansión muy acelerada, típica de una etapa de captación agresiva de mercado.' : cagr > 10 ? 'Es un ritmo de expansión saludable y sostenido.' : 'El ritmo de expansión se ha moderado frente a etapas anteriores.'}`,
    })
  }

  if (penultimo?.crecimientoIngresosPct != null) {
    const desacelera = aniosCompletos.length >= 3 && aniosCompletos[aniosCompletos.length - 2].crecimientoIngresosPct > penultimo.crecimientoIngresosPct
    items.push({
      tone: penultimo.crecimientoIngresosPct > 10 ? 'good' : penultimo.crecimientoIngresosPct > 0 ? 'neutral' : 'bad',
      title: `Crecimiento del último año cerrado (${penultimo.anio})`,
      text: `Los ingresos crecieron ${penultimo.crecimientoIngresosPct.toFixed(1)}% frente a ${primero === penultimo ? 'el año base' : porAnio[porAnio.indexOf(penultimo) - 1]?.anio} (${formatCurrency(porAnio[porAnio.indexOf(penultimo) - 1]?.ingresos || 0)} → ${formatCurrency(penultimo.ingresos)}), mientras que los costos lo hicieron en ${penultimo.crecimientoCostosPct?.toFixed(1)}%. ${desacelera ? 'Se observa una **desaceleración** respecto al ciclo de crecimiento anterior — la curva de adopción empieza a madurar y el negocio entra en una fase de consolidación más que de expansión explosiva.' : 'El ritmo se mantiene relativamente estable frente al ciclo anterior.'} ${penultimo.crecimientoIngresosPct > penultimo.crecimientoCostosPct ? 'Lo más relevante: el ingreso creció más rápido que el costo, lo que **amplía el margen operativo** — apalancamiento operativo positivo.' : 'De atención: el costo creció más rápido que el ingreso, lo que **comprime el margen** — la estructura de costos pierde eficiencia relativa frente al crecimiento comercial.'}`,
    })
  }

  if (comparativoYTD) {
    const { etiqueta, anioActual, anioAnterior, ingresosActual, ingresosAnterior, costosActual, costosAnterior, crecimientoIngresosPct, crecimientoCostosPct } = comparativoYTD
    const tijera = crecimientoIngresosPct - crecimientoCostosPct
    items.push({
      tone: crecimientoIngresosPct > 0 ? 'good' : crecimientoIngresosPct > -10 ? 'neutral' : 'bad',
      title: `Comparativo año corrido — ${etiqueta} ${anioActual} vs. ${anioAnterior}`,
      text: `En el mismo periodo (${etiqueta}), los ingresos pasaron de ${formatCurrency(ingresosAnterior)} a ${formatCurrency(ingresosActual)} (${crecimientoIngresosPct >= 0 ? '+' : ''}${crecimientoIngresosPct.toFixed(1)}%), mientras que los costos pasaron de ${formatCurrency(costosAnterior)} a ${formatCurrency(costosActual)} (${crecimientoCostosPct >= 0 ? '+' : ''}${crecimientoCostosPct.toFixed(1)}%). ${tijera < 0
        ? `Se abre una **"tijera" desfavorable de ${Math.abs(tijera).toFixed(1)} puntos**: el costo crece más rápido que el ingreso (o el ingreso cae mientras el costo sube). Si la tendencia continúa el resto del año, el margen bruto del periodo cerraría por debajo del año anterior y debería activarse un plan de contención de costos y/o reactivación comercial (campañas de renovación, recuperación de cartera vencida, nuevas activaciones).`
        : `Se mantiene una **"tijera" favorable de ${tijera.toFixed(1)} puntos**: el ingreso crece más rápido que el costo, lo que sostiene o mejora el margen bruto del periodo. Es la dinámica que conviene proteger — cualquier inversión adicional en adquisición de clientes tiene, hoy, un retorno marginal positivo sobre el margen.`}`,
    })
  }

  items.push({
    tone: kpis.margenPctTotal > 60 ? 'good' : kpis.margenPctTotal > 40 ? 'neutral' : 'bad',
    title: 'Estructura de márgenes y unit economics',
    text: `El margen bruto histórico es de ${kpis.margenPctTotal.toFixed(1)}% (${formatCurrency(kpis.margenTotal)} sobre ${formatCurrency(kpis.ingresosTotales)} de ingresos, frente a ${formatCurrency(kpis.costosTotales)} de costo de pantallas/cuentas). Es un margen ${kpis.margenPctTotal > 60 ? 'alto, propio de un modelo de reventa de licencias digitales con muy bajo costo marginal por usuario adicional' : 'razonable, aunque con espacio para optimizar el costo unitario por pantalla'}. El ticket promedio por transacción es de ${formatCurrency(kpis.ticketPromedio)}, y el ${kpis.tasaRenovacionPct.toFixed(1)}% de las ventas corresponden a **renovaciones** (vs. ${activacion ? activacion.pctTotal.toFixed(1) : '—'}% de activaciones nuevas). ${kpis.tasaRenovacionPct > 70 ? 'Esta proporción confirma que el negocio vive principalmente de su **base instalada** — la prioridad estratégica debería ser la retención (reducir churn) más que la adquisición pura, porque cada punto de churn cuesta proporcionalmente más que un punto de nueva activación.' : 'La proporción de activaciones nuevas es relevante — conviene vigilar el costo de adquisición frente al valor de vida del cliente (LTV) para asegurar que cada activación nueva sea rentable en el mediano plazo.'}`,
  })

  items.push({
    tone: kpis.churnPct < 20 ? 'good' : kpis.churnPct < 35 ? 'neutral' : 'bad',
    title: 'Riesgo de cancelación (churn) y solidez de la base',
    text: `La tasa de cancelación de suscripciones es de ${kpis.churnPct.toFixed(1)}% sobre el universo histórico activo+cancelado, y se registraron ${ultimo.numBajas} bajas en ${ultimo.anio} (${penultimo ? `frente a ${penultimo.numBajas} en ${penultimo.anio}` : ''}). ${kpis.churnPct > 30
      ? 'Este nivel de churn es **alto para un negocio de suscripción** — cada cliente que se cancela debe ser reemplazado por uno nuevo solo para mantener el ingreso plano, lo que castiga el crecimiento neto y eleva el costo efectivo de adquisición. Recomendación: instrumentar alertas tempranas de vencimiento (el Planificador ya identifica cuentas próximas a vencer) y campañas de retención proactivas antes del corte del servicio.'
      : 'Es un nivel de churn manejable, coherente con un negocio de contenidos digitales de bajo costo de cambio (switching cost). Aun así, cada punto de reducción de churn impacta directamente el margen, porque el costo de retener a un cliente existente es estructuralmente menor que el de activar uno nuevo.'}`,
  })

  const tendenciaGlobal = comparativoYTD?.crecimientoIngresosPct ?? penultimo?.crecimientoIngresosPct
  items.push({
    tone: 'reco',
    title: 'Lectura ejecutiva y recomendaciones',
    text: `**Diagnóstico**: el negocio consolidó una base rentable (margen ${kpis.margenPctTotal.toFixed(1)}%, markup de ${kpis.markupPct.toFixed(1)}% sobre el costo, CAGR histórico ${cagr != null ? cagr.toFixed(1) + '%' : 'n/d'}), con un punto de equilibrio de apenas ${kpis.puntoEquilibrioVentas.toLocaleString('es-CO')} ventas frente a un volumen muy superior ya alcanzado, pero ${tendenciaGlobal != null && tendenciaGlobal < 0
      ? `muestra señales de **desaceleración en el periodo más reciente**, con el costo presionando el margen relativo y un momentum de ventas de ${kpis.momentumVentasPct > 0 ? '+' : ''}${kpis.momentumVentasPct.toFixed(1)}% mes a mes`
      : `mantiene una **dinámica de crecimiento saludable** con el ingreso por delante del costo y un momentum de ventas de ${kpis.momentumVentasPct > 0 ? '+' : ''}${kpis.momentumVentasPct.toFixed(1)}% mes a mes`}. \n\n**Cuatro palancas priorizadas:**\n1. **Retención sobre adquisición** — con ${kpis.tasaRenovacionPct.toFixed(1)}% del ingreso viniendo de renovaciones y un churn de ${kpis.churnPct.toFixed(1)}%, reducir la fuga de clientes existentes tiene mayor ROI marginal que captar clientes nuevos.\n2. **Eficiencia de costo unitario** — el costo de pantallas creció ${penultimo?.crecimientoCostosPct?.toFixed(1) ?? '—'}% el último año cerrado; negociar mejores condiciones de recarga/credenciales (TRM, volumen) protege directamente el margen bruto y el markup de ${kpis.markupPct.toFixed(1)}%.\n3. **Gestión del riesgo de concentración** — el 20% de los clientes aporta ${kpis.concentracionTop20Pct.toFixed(1)}% del ingreso (ARPU de ${formatCurrency(kpis.arpu)}); diversificar la base y fidelizar a los clientes "ancla" con planes anuales reduce la exposición a una caída súbita de ingreso.\n4. **Estacionalidad y caja** — con ${ultimo.numVentas} ventas registradas en lo corrido de ${ultimo.anio} y un momentum reciente de ${kpis.momentumVentasPct > 0 ? '+' : ''}${kpis.momentumVentasPct.toFixed(1)}% mes a mes, conviene proyectar el flujo de caja mensual (ingresos por renovación son recurrentes y predecibles) para anticipar capital de trabajo en los meses de mayor actividad de recargas.`,
  })

  const toneStyles = {
    good:    { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700', label: 'Favorable' },
    neutral: { bar: 'bg-amber-400',   chip: 'bg-amber-100 text-amber-700',     label: 'A vigilar' },
    bad:     { bar: 'bg-red-500',     chip: 'bg-red-100 text-red-700',         label: 'Atención' },
    reco:    { bar: 'bg-orange-500',  chip: 'bg-orange-100 text-orange-700',   label: 'Recomendación' },
  }

  return (
    <div className="space-y-3">
      {items.map((it, i) => {
        const ts = toneStyles[it.tone]
        return (
          <div key={i} className="flex gap-3 bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
            <div className={`w-1.5 ${ts.bar} flex-shrink-0`} />
            <div className="py-3 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-brand-accent text-sm">{it.title}</h4>
                <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${ts.chip}`}>{ts.label}</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {it.text.split('**').map((chunk, j) => j % 2 === 1 ? <strong key={j} className="text-gray-800">{chunk}</strong> : chunk)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DashboardHome() {
  const navigate = useNavigate()
  const { showToast } = useUi()
  const [stats, setStats] = useState(null)
  const [bi, setBi] = useState(null)
  const [planificador, setPlanificador] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [downloadingBackup, setDownloadingBackup] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState(false)
  const [anioVentasLicencia, setAnioVentasLicencia] = useState(null)
  const [mesVentasLicencia, setMesVentasLicencia] = useState(null)
  const [showVencidasPanel, setShowVencidasPanel] = useState(false)
  const [showProximasPanel, setShowProximasPanel] = useState(false)
  const [showArpuPanel, setShowArpuPanel] = useState(false)
  const [explain, setExplain] = useState(null)

  const load = () => Promise.all([
    api.get('/admin/dashboard-stats').then((r) => setStats(r.data)),
    api.get('/admin/dashboard-bi').then((r) => setBi(r.data)),
    api.get('/admin/planificador').then((r) => setPlanificador(r.data)),
  ])

  useEffect(() => {
    load().finally(() => setLoading(false))

    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    const interval = setInterval(load, 60000)

    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(interval)
    }
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const r = await api.post('/admin/planificador/sync-cuentas-padre')
      await load()
      showToast(r.data.message, 'success')
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleDownloadBackup = async () => {
    setDownloadingBackup(true)
    try {
      const res = await api.get('/admin/backup/database', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `chikisdtv-backup-${new Date().toISOString().slice(0, 10)}.sqlite`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      showToast(e.response?.data?.error || e.message, 'error')
    } finally {
      setDownloadingBackup(false)
    }
  }

  const handleRestoreLocalBackup = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setRestoringBackup(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const r = await api.post('/admin/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      showToast(r.data.message, 'success')
      setTimeout(() => window.location.reload(), 800)
    } catch (e2) {
      showToast(e2.response?.data?.error || e2.message, 'error')
      setRestoringBackup(false)
    }
  }

  const pieData = useMemo(() => {
    if (!bi) return []
    return bi.tipoPago.map(t => ({ name: t.tipo, value: t.total, pct: t.pctTotal }))
  }, [bi])

  const pantallasEnriquecidas = useMemo(() => {
    if (!planificador) return []
    const { pantallas, diasAlerta } = planificador
    return pantallas.map(p => ({
      ...p,
      _variant: getRowVariant(p, diasAlerta),
      _dias: calcDias(p.duracionReal || p.finalizacion) ?? p.diasVencimientoReal ?? p.diasVencimiento ?? null,
    }))
  }, [planificador])

  const pantallasActivasTotal = useMemo(() => {
    if (!planificador?.pantallas) return 0
    return planificador.pantallas.reduce((sum, p) => sum + (Number(p.pantallas) || 0), 0)
  }, [planificador])

  const byDiasAsc = (a, b) => (a._dias ?? Infinity) - (b._dias ?? Infinity)

  const cuentasVencidas = useMemo(
    () => pantallasEnriquecidas.filter(p => p._variant === 'vencido').sort(byDiasAsc),
    [pantallasEnriquecidas]
  )

  const proximasAVencer = useMemo(
    () => pantallasEnriquecidas.filter(p => p._variant === 'alerta').sort(byDiasAsc),
    [pantallasEnriquecidas]
  )

  // Alertas operativas: se derivan de datos ya cargados (sin peticiones extra).
  const alertas = useMemo(() => {
    if (!stats) return []
    const list = []
    const nV = cuentasVencidas.length
    if (nV > 0) {
      list.push({
        tone: 'error', icon: AlertCircle,
        titulo: `${nV} cuenta${nV === 1 ? '' : 's'} vencida${nV === 1 ? '' : 's'} sin renovar`,
        detalle: 'Cada día sin contacto aumenta el riesgo de perder al cliente — abrir la lista para gestionar',
        onClick: () => setShowVencidasPanel(true),
      })
    }
    const nP = proximasAVencer.length
    if (nP > 0) {
      list.push({
        tone: 'warning', icon: Clock,
        titulo: `${nP} cuenta${nP === 1 ? '' : 's'} vence${nP === 1 ? '' : 'n'} en ≤ ${planificador?.diasAlerta ?? 8} días`,
        detalle: 'Ventana ideal para asegurar la renovación antes del corte del servicio',
        onClick: () => setShowProximasPanel(true),
      })
    }
    if (stats.pendingPayments > 0) {
      list.push({
        tone: 'warning', icon: Hourglass,
        titulo: `${stats.pendingPayments} pago${stats.pendingPayments === 1 ? '' : 's'} pendiente${stats.pendingPayments === 1 ? '' : 's'} de conciliar`,
        detalle: 'Dinero registrado que aún no está confirmado en el módulo de Pagos',
        onClick: () => navigate('/admin/payments'),
      })
    }
    const oc = bi?.ocupacion
    if (oc) {
      if (oc.pctOcupacionGlobal >= 90) {
        list.push({
          tone: 'error', icon: Tv,
          titulo: `Capacidad instalada al ${oc.pctOcupacionGlobal}%`,
          detalle: oc.totalLibres === 0
            ? 'Sin pantallas libres — la próxima venta requiere comprar una cuenta padre nueva'
            : `Solo ${oc.totalLibres} pantalla${oc.totalLibres === 1 ? '' : 's'} libre${oc.totalLibres === 1 ? '' : 's'} — planear compra de cuentas padre antes de la próxima venta`,
          onClick: () => navigate('/admin/planificador'),
        })
      } else if (oc.pctOcupacionGlobal >= 75) {
        list.push({
          tone: 'warning', icon: Tv,
          titulo: `Capacidad instalada al ${oc.pctOcupacionGlobal}%`,
          detalle: `${oc.totalLibres} pantalla${oc.totalLibres === 1 ? '' : 's'} libre${oc.totalLibres === 1 ? '' : 's'} — vigilar antes de que se agote el cupo`,
          onClick: () => navigate('/admin/planificador'),
        })
      } else if (oc.totalLibres > 0) {
        list.push({
          tone: 'info', icon: TrendingUp,
          titulo: `${oc.totalLibres} pantalla${oc.totalLibres === 1 ? '' : 's'} libre${oc.totalLibres === 1 ? '' : 's'} para vender`,
          detalle: 'La capacidad ya está pagada — cada venta sobre estos cupos es ingreso sin costo adicional',
          onClick: () => navigate('/admin/planificador'),
        })
      }
    }
    return list.sort((a, b) => ALERT_ORDER[a.tone] - ALERT_ORDER[b.tone])
  }, [stats, bi, planificador, cuentasVencidas, proximasAVencer])

  const alertasUrgentes = alertas.filter(a => a.tone !== 'info').length
  const valorEnRiesgo = bi?.ltv?.valorEnRiesgo || 0

  const handleGenerateVentaPlanificador = (screen, catKey) => {
    setShowVencidasPanel(false)
    setShowProximasPanel(false)
    navigate('/admin/payments', {
      state: {
        prefillVenta: screenToVentaPrefill(screen, catKey),
        prefillSource: CATEGORY_CONFIG[catKey]?.title || 'Planificador',
      },
    })
  }

  const crecimientoMargenUltimo = useMemo(() => {
    if (!bi?.porAnio?.length) return null
    const ultimo = bi.porAnio[bi.porAnio.length - 1]
    const penultimo = bi.porAnio[bi.porAnio.length - 2]
    if (!penultimo || penultimo.margen <= 0) return null
    return Number((((ultimo.margen - penultimo.margen) / penultimo.margen) * 100).toFixed(1))
  }, [bi])

  // ─── Ventas de licencias — mes a mes, filtrable por año ────────────────────
  const aniosVentasLicencia = useMemo(() => {
    if (!bi) return []
    return [...new Set(bi.porMes.map(m => Number(m.anio)))].filter(Boolean).sort((a, b) => b - a)
  }, [bi])

  useEffect(() => {
    if (anioVentasLicencia == null && aniosVentasLicencia.length > 0) {
      setAnioVentasLicencia(aniosVentasLicencia[0])
    }
  }, [aniosVentasLicencia, anioVentasLicencia])

  const ventasLicenciaPorMes = useMemo(() => {
    if (!bi || anioVentasLicencia == null) return []
    const porMesMap = {}
    for (const m of bi.porMes) {
      if (Number(m.anio) === anioVentasLicencia) porMesMap[Number(m.key.split('-')[1])] = m
    }
    return MES_LABELS.map((label, i) => {
      const m = porMesMap[i + 1]
      return { mes: i + 1, label, ingresos: m?.ingresos || 0, numVentas: m?.numVentas || 0 }
    })
  }, [bi, anioVentasLicencia])

  const resumenVentasLicencia = useMemo(() => {
    if (!bi || !ventasLicenciaPorMes.length) return null
    const conDatos = ventasLicenciaPorMes.filter(m => m.numVentas > 0)
    const totalIngresos = ventasLicenciaPorMes.reduce((s, m) => s + m.ingresos, 0)
    const totalVentas = ventasLicenciaPorMes.reduce((s, m) => s + m.numVentas, 0)
    const ticketPromedio = totalVentas > 0 ? Math.round(totalIngresos / totalVentas) : 0
    const promedioMensual = conDatos.length > 0 ? Math.round(totalIngresos / conDatos.length) : 0
    const mejorMes = conDatos.length ? conDatos.reduce((a, b) => (b.ingresos > a.ingresos ? b : a)) : null
    const peorMes = conDatos.length ? conDatos.reduce((a, b) => (b.ingresos < a.ingresos ? b : a)) : null

    const anterior = bi.porMes.filter(m => Number(m.anio) === anioVentasLicencia - 1)
    const totalIngresosAnterior = anterior.reduce((s, m) => s + m.ingresos, 0)
    const totalVentasAnterior = anterior.reduce((s, m) => s + m.numVentas, 0)
    const crecimientoIngresosPct = totalIngresosAnterior > 0
      ? Number((((totalIngresos - totalIngresosAnterior) / totalIngresosAnterior) * 100).toFixed(1)) : null
    const crecimientoVentasPct = totalVentasAnterior > 0
      ? Number((((totalVentas - totalVentasAnterior) / totalVentasAnterior) * 100).toFixed(1)) : null

    let mesDetalle = null
    if (mesVentasLicencia != null) {
      const mesActual = ventasLicenciaPorMes.find(m => m.mes === mesVentasLicencia)
      const mesAnteriorAnio = anterior.find(m => Number(m.key.split('-')[1]) === mesVentasLicencia) || null
      const ticketPromedioMes = mesActual.numVentas > 0 ? Math.round(mesActual.ingresos / mesActual.numVentas) : 0
      const crecimientoIngresosMesPct = mesAnteriorAnio?.ingresos > 0
        ? Number((((mesActual.ingresos - mesAnteriorAnio.ingresos) / mesAnteriorAnio.ingresos) * 100).toFixed(1)) : null
      const crecimientoVentasMesPct = mesAnteriorAnio?.numVentas > 0
        ? Number((((mesActual.numVentas - mesAnteriorAnio.numVentas) / mesAnteriorAnio.numVentas) * 100).toFixed(1)) : null
      const pctDelAnio = totalIngresos > 0 ? Number(((mesActual.ingresos / totalIngresos) * 100).toFixed(1)) : 0
      mesDetalle = { mesActual, mesAnteriorAnio, ticketPromedioMes, crecimientoIngresosMesPct, crecimientoVentasMesPct, pctDelAnio }
    }

    return {
      totalIngresos, totalVentas, ticketPromedio, promedioMensual, mejorMes, peorMes,
      crecimientoIngresosPct, crecimientoVentasPct, mesesConDatos: conDatos.length, mesDetalle,
    }
  }, [bi, ventasLicenciaPorMes, anioVentasLicencia, mesVentasLicencia])

  if (loading) return <p className="text-gray-500">Cargando estadísticas…</p>
  if (!stats) return <p className="text-red-500">Error al cargar datos</p>

  const k = bi?.kpis

  return (
    <div className="space-y-8">
      <KpiExplainModal info={explain} onClose={() => setExplain(null)} />

      {showVencidasPanel && (
        <CategoryPanel
          catKey="vencido"
          screens={cuentasVencidas}
          onClose={() => setShowVencidasPanel(false)}
          onGenerate={handleGenerateVentaPlanificador}
        />
      )}

      {showProximasPanel && (
        <CategoryPanel
          catKey="alerta"
          screens={proximasAVencer}
          onClose={() => setShowProximasPanel(false)}
          onGenerate={handleGenerateVentaPlanificador}
        />
      )}

      {showArpuPanel && (
        <IngresoPorClientePanel onClose={() => setShowArpuPanel(false)} />
      )}

      <style>{CSS}</style>

      {/* ── HERO HEADER ── */}
      <div className="dash-a1 relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)' }}>
        <div className="dash-orb-1 absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-[.25] pointer-events-none" style={{ background: 'radial-gradient(circle,#a855f7,transparent 70%)' }} />
        <div className="dash-orb-2 absolute -bottom-16 right-0 w-72 h-72 rounded-full opacity-[.20] pointer-events-none" style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/25 mb-4">
              <Activity size={12} className="text-indigo-300" />
              <span className="text-indigo-300 text-xs font-semibold tracking-widest uppercase">Operaciones</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: '-0.02em' }}>
              Dashboard
            </h1>
            <p className="text-indigo-100/70 text-sm mt-2 max-w-xl">
              Pulso diario de ChikidsTV — el análisis financiero profundo vive en <button onClick={() => navigate('/admin/analisis-financiero')} className="text-indigo-400 font-bold hover:text-white transition-colors">Análisis Financiero</button>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {import.meta.env.DEV && (
              <>
                <input
                  type="file" accept=".sqlite" id="restore-db-input" className="hidden"
                  onChange={handleRestoreLocalBackup}
                />
                <button
                  onClick={() => document.getElementById('restore-db-input').click()}
                  disabled={restoringBackup}
                  className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-bold text-white transition-all flex items-center gap-2"
                >
                  <Upload size={15} /> {restoringBackup ? 'Cargando…' : 'BD Local'}
                </button>
              </>
            )}
            <button
              onClick={handleDownloadBackup} disabled={downloadingBackup}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-bold text-white transition-all flex items-center gap-2"
            >
              <Download size={15} /> {downloadingBackup ? 'Descargando…' : 'Respaldo'}
            </button>
            <button
              onClick={handleSync} disabled={syncing}
              className="dash-cta px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Sincronizando…' : 'Sincronizar'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Centro de alertas: lo que requiere acción hoy ───────────────── */}
      <div className="dash-a2">
        <Card className={cn(
          alertas.some(a => a.tone === 'error') ? 'border-red-200' :
          alertas.some(a => a.tone === 'warning') ? 'border-amber-200' : 'border-emerald-100'
        )}>
          <CardHeader className="border-gray-50 py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className={alertasUrgentes > 0 ? 'text-red-500' : 'text-emerald-500'} />
                <CardTitle className="text-base">Centro de alertas</CardTitle>
                {alertasUrgentes > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold tabular-nums">
                    {alertasUrgentes} {alertasUrgentes === 1 ? 'asunto requiere' : 'asuntos requieren'} acción
                  </span>
                )}
              </div>
              {valorEnRiesgo > 0 && alertasUrgentes > 0 && (
                <span className="text-xs text-gray-500">
                  Valor en riesgo (vencidas + por vencer): <span className="font-bold text-red-600">{formatCurrency(valorEnRiesgo)}</span>
                </span>
              )}
            </div>
          </CardHeader>
          <CardBody className="p-0 divide-y divide-gray-50">
            {alertas.length > 0 ? (
              alertas.map((a, i) => <AlertRow key={i} alerta={a} />)
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="p-2 rounded-lg bg-emerald-50 flex-shrink-0">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-brand-accent">Sin alertas operativas</p>
                  <p className="text-xs text-gray-500">Cartera al día y capacidad bajo control</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ─── KPIs operativos: clientes, catálogo y capacidad ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 dash-a2">
        <StatCard
          icon={Users} title="Clientes Activos" value={stats.totalClients} color="bg-brand-primary"
          subtitle={`${stats.clientesFinal} finales · ${stats.clientesRevendedor} revendedores — presencia en ${stats.paisesCount} países`}
          onClick={() => setExplain({
            title: 'Clientes Activos', value: stats.totalClients, icon: Users,
            queEs: 'La cantidad de clientes que hoy tienen su cuenta habilitada en el sistema — la base viva del negocio.',
            comoSeCalcula: 'Se cuentan todos los clientes registrados cuyo estado sea **Activo**. Los clientes dados de baja o suspendidos no entran en este número.',
            origen: `Módulo de **Clientes**. De esa misma tabla salen los ${stats.clientesFinal} clientes finales, ${stats.clientesRevendedor} revendedores y la presencia en ${stats.paisesCount} países.`,
            action: { label: 'Ver Clientes', onClick: () => navigate('/admin/clients') },
          })}
        />
        <StatCard
          icon={Package} title="Planes" value={stats.totalPlans} color="bg-blue-500"
          subtitle={`Catálogo vigente que respalda ${stats.activeSubscriptions} suscripciones activas hoy`}
          onClick={() => setExplain({
            title: 'Planes', value: stats.totalPlans, icon: Package,
            queEs: 'Cuántos planes de venta (mensual, semestral, anual…) están disponibles hoy en el catálogo para ofrecer a los clientes.',
            comoSeCalcula: 'Se cuentan los planes marcados como **activos** en el catálogo. Los planes desactivados quedan por fuera aunque tengan historial.',
            origen: `Módulo de **Planes**. Estos planes respaldan las ${stats.activeSubscriptions} suscripciones activas actuales.`,
            action: { label: 'Ver Planes', onClick: () => navigate('/admin/plans') },
          })}
        />
        <StatCard
          icon={FileText} title="Pantallas activas" value={pantallasActivasTotal} color="bg-green-500"
          subtitle="Suma de pantallas por plan del Planificador"
          onClick={() => setExplain({
            title: 'Pantallas activas', value: pantallasActivasTotal, icon: FileText,
            queEs: 'El total de pantallas de streaming que están configuradas para clientes en el Planificador — la "base instalada" que genera el ingreso recurrente.',
            comoSeCalcula: 'Se **suma la columna #** (cantidad de pantallas) de cada fila del Planificador. No es un conteo de filas: un cliente con 2 pantallas bajo el mismo registro aporta 2 a este total.',
            origen: 'Módulo **Planificador** — cada fila representa un slot de pantalla dentro de una cuenta padre.',
            action: { label: 'Ver Planificador', onClick: () => navigate('/admin/planificador', { state: { openEstatusPanel: true } }) },
          })}
        />
        <StatCard
          icon={Tv} title="Dispositivos Activos" value={stats.totalDevices} color="bg-purple-500"
          subtitle={`Inventario de equipos — ${stats.totalPantallas} pantallas, ${stats.pantallasLibres} libres en el Planificador`}
          onClick={() => setExplain({
            title: 'Dispositivos Activos', value: stats.totalDevices, icon: Tv,
            queEs: 'Cuántos equipos físicos (Fire TV, ONN…) están registrados como activos en el inventario.',
            comoSeCalcula: 'Se cuentan los dispositivos del inventario marcados como **activos**. Si este número está en cero es porque el módulo de inventario no tiene registros propios — el control operativo real vive en el Planificador.',
            origen: `Módulo **Inventario Equipos**. El Planificador, por su parte, registra ${stats.totalPantallas} pantallas con ${stats.pantallasLibres} libres.`,
            action: { label: 'Ver Inventario', onClick: () => navigate('/admin/devices') },
          })}
        />
      </div>

      {/* ─── KPIs operativos: cartera y vencimientos ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 dash-a2 mt-4">
        <StatCard
          icon={Clock} title="Pagos Pendientes" value={stats.pendingPayments} color="bg-amber-500"
          subtitle="A la espera de conciliación en el módulo de Pagos"
          onClick={() => setExplain({
            title: 'Pagos Pendientes', value: stats.pendingPayments, icon: Clock,
            queEs: 'Pagos que fueron registrados pero aún no se han confirmado/conciliado — dinero que debería entrar pero todavía no está asegurado.',
            comoSeCalcula: 'Se cuentan los registros de pago cuyo estado es **Pendiente**.',
            origen: 'Módulo de **Pagos** (campo estado de cada pago).',
            action: { label: 'Ver Pagos', onClick: () => navigate('/admin/payments') },
          })}
        />
        <StatCard
          icon={AlertCircle} title="Pagos Vencidos" value={cuentasVencidas.length} color="bg-red-500"
          subtitle={cuentasVencidas.length > 0
            ? 'Cuentas vencidas del Planificador — requieren contacto urgente'
            : 'Sin cuentas vencidas en el Planificador — cartera sana por ahora'}
          onClick={() => setExplain({
            title: 'Pagos Vencidos', value: cuentasVencidas.length, icon: AlertCircle,
            queEs: 'Pantallas de clientes cuya fecha de vencimiento **ya pasó** y siguen sin renovar — cada día que pasa aumenta el riesgo de perder al cliente.',
            comoSeCalcula: 'Para cada pantalla del Planificador se compara la **fecha de finalización** (o fin real) contra la fecha de hoy. Si ya pasó, la pantalla se clasifica como vencida. Es la misma clasificación que usa la tarjeta "Vencidas" del Planificador.',
            origen: 'Módulo **Planificador** — campos de fecha de finalización y fin real de cada pantalla.',
            action: { label: 'Ver detalle de vencidas', onClick: () => setShowVencidasPanel(true) },
          })}
        />
        <StatCard
          icon={TrendingUp} title="Próximas a vencer" value={proximasAVencer.length} color="bg-orange-500"
          subtitle={proximasAVencer.length > 0
            ? `Cuentas a ≤${planificador?.diasAlerta ?? 8} días de vencer — oportunidad de renovación`
            : 'Sin cuentas próximas a vencer'}
          onClick={() => setExplain({
            title: 'Próximas a vencer', value: proximasAVencer.length, icon: TrendingUp,
            queEs: 'Pantallas que vencen dentro de los próximos días — la ventana ideal para contactar al cliente y asegurar la renovación **antes** del corte del servicio.',
            comoSeCalcula: `Se calculan los días que faltan entre hoy y la fecha de vencimiento de cada pantalla. Si faltan **${planificador?.diasAlerta ?? 8} días o menos** (y aún no venció), entra en esta lista.`,
            origen: 'Módulo **Planificador** — el umbral de alerta es configurable en el servidor.',
            action: { label: 'Ver detalle', onClick: () => setShowProximasPanel(true) },
          })}
        />
      </div>

      {bi && (
        <>
          {/* ─── Encabezado BI ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 pt-2">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-2.5 shadow-md">
              <BarChart3 size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-accent">Resultados del negocio · Ventas vs. Costos</h2>
              <p className="text-sm text-gray-500">Los cuatro números que resumen la salud financiera — haz clic en cualquier tarjeta para ver cómo se calcula</p>
            </div>
          </div>

          {/* ─── KPIs comparativos BI ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 dash-a3">
            <BiCard
              icon={Wallet} variant="solid" label="Ingresos históricos"
              value={formatCurrency(k.ingresosTotales)}
              growth={k.crecimientoIngresosUltimo}
              growthLabel={`vs. ${k.anioAnterior} (año cerrado)`}
              onClick={() => setExplain({
                title: 'Ingresos históricos', value: formatCurrency(k.ingresosTotales), icon: Wallet,
                queEs: 'Todo el dinero que ha entrado al negocio por ventas de licencias desde que hay registros — el tamaño acumulado del negocio.',
                comoSeCalcula: 'Se **suma el precio de venta de todas las ventas** registradas (renovaciones, activaciones y activaciones de pantalla). El % de variación compara el último año cerrado contra el anterior.',
                origen: 'Módulo de **Pagos** — la tabla de ventas de licencias registrada e importada desde el Excel original.',
                action: { label: 'Ver Pagos', onClick: () => navigate('/admin/payments') },
              })}
            />
            <BiCard
              icon={PiggyBank} variant="light" label="Costos históricos"
              value={formatCurrency(k.costosTotales)}
              growth={k.crecimientoCostosUltimo}
              growthLabel={`vs. ${k.anioAnterior} (año cerrado)`}
              onClick={() => setExplain({
                title: 'Costos históricos', value: formatCurrency(k.costosTotales), icon: PiggyBank,
                queEs: 'Todo lo que el negocio ha gastado en comprar los créditos/recargas que hacen funcionar las pantallas — el costo directo del servicio.',
                comoSeCalcula: 'Se suma el **costo en pesos de cada recarga** más el **impuesto 4x1000** de cada transacción. No incluye otros gastos (equipos, tiempo, internet) porque no están registrados en el sistema.',
                origen: 'Módulo **Costo Pantalla** — cada fila es una recarga de créditos con su costo en USD, la TRM del día y el costo final en pesos.',
                action: { label: 'Ver Costo Pantalla', onClick: () => navigate('/admin/costo-pantalla') },
              })}
            />
            <BiCard
              icon={TrendingUp} variant="solid" label="Ganancia histórica"
              value={formatCurrency(k.margenTotal)}
              growth={crecimientoMargenUltimo}
              growthLabel={`vs. ${k.anioAnterior} (año cerrado) · margen ${k.margenPctTotal.toFixed(1)}%`}
              onClick={() => setExplain({
                title: 'Ganancia histórica', value: formatCurrency(k.margenTotal), icon: TrendingUp,
                queEs: 'Lo que queda en el bolsillo después de pagar el costo de las recargas — la utilidad bruta acumulada del negocio.',
                comoSeCalcula: '**Ingresos históricos − Costos históricos**. Es una resta directa: todo lo vendido menos todo lo gastado en recargas e impuesto 4x1000.',
                origen: 'Cruce entre el módulo de **Pagos** (ingresos) y **Costo Pantalla** (costos).',
                action: { label: 'Ver Análisis Financiero', onClick: () => navigate('/admin/analisis-financiero') },
              })}
            />
            <BiCard
              icon={Percent} variant="outline" label="Margen bruto"
              value={`${k.margenPctTotal.toFixed(1)}%`}
              sub={`${k.margenPctUltimo?.toFixed(1)}% en ${k.anioActual}`}
              onClick={() => setExplain({
                title: 'Margen bruto', value: `${k.margenPctTotal.toFixed(1)}%`, icon: Percent,
                queEs: 'De cada $100 que entran por ventas, cuántos quedan como ganancia después de pagar las recargas. Es el termómetro de eficiencia del negocio.',
                comoSeCalcula: '**(Ganancia ÷ Ingresos) × 100**. Por ejemplo: si entran $100 y las recargas costaron $30, el margen bruto es 70%.',
                origen: `Derivado de Pagos y Costo Pantalla. El margen del año en curso (${k.anioActual}) va en ${k.margenPctUltimo?.toFixed(1)}%.`,
                action: { label: 'Ver Análisis Financiero', onClick: () => navigate('/admin/analisis-financiero') },
              })}
            />
          </div>

          {bi.comparativoYTD && (
            <Card className="border-orange-100">
              <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Comparativo año corrido (YTD)</p>
                  <p className="text-sm text-gray-600">{bi.comparativoYTD.etiqueta} {bi.comparativoYTD.anioActual} vs. {bi.comparativoYTD.anioAnterior}</p>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-orange-500" />
                  <span className="text-sm text-gray-500">Ingresos:</span>
                  <span className="font-bold text-brand-accent">{formatCurrency(bi.comparativoYTD.ingresosActual)}</span>
                  <GrowthBadge pct={bi.comparativoYTD.crecimientoIngresosPct} />
                </div>
                <div className="flex items-center gap-2">
                  <PiggyBank size={16} className="text-orange-500" />
                  <span className="text-sm text-gray-500">Costos:</span>
                  <span className="font-bold text-brand-accent">{formatCurrency(bi.comparativoYTD.costosActual)}</span>
                  <GrowthBadge pct={bi.comparativoYTD.crecimientoCostosPct} />
                </div>
              </CardBody>
            </Card>
          )}

          {/* ─── Gráficos: evolución anual (línea) + comparativo por año (barras) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-orange-100">
              <CardHeader className="border-orange-50">
                <CardTitle>Evolución anual: ingresos, costos y ganancia</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">
                  Tendencia desde {bi.porAnio[0]?.anio} hasta {bi.porAnio[bi.porAnio.length - 1]?.anio} — la brecha entre la curva naranja (ingresos) y la gris (costos) es la curva verde (ganancia); el % morado sobre cada punto verde es el margen bruto de ese año
                </p>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={bi.porAnio} margin={{ top: 28, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                    <XAxis dataKey="anio" tick={{ fontSize: 12, fill: '#78716c' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="costos" name="Costos" stroke="#94a3b8" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="margen" name="Ganancia" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Bar dataKey="ingresos" fill="transparent" legendType="none" barSize={2} isAnimationActive={false}>
                      <LabelList dataKey="ingresos" position="top" formatter={(v) => `${(v / 1e6).toFixed(1)}M`} style={{ ...LABEL_STYLE, fontSize: 10, fill: '#f97316' }} />
                    </Bar>
                    <Bar dataKey="costos" fill="transparent" legendType="none" barSize={2} isAnimationActive={false}>
                      <LabelList dataKey="costos" position="insideTop" formatter={(v) => `${(v / 1e6).toFixed(1)}M`} style={{ ...LABEL_STYLE, fontSize: 10, fill: '#94a3b8' }} />
                    </Bar>
                    <Bar dataKey="margen" fill="transparent" legendType="none" barSize={2} isAnimationActive={false}>
                      <LabelList dataKey="margen" position="top" offset={4} formatter={(v) => `${(v / 1e6).toFixed(1)}M`} style={{ ...LABEL_STYLE, fontSize: 10, fill: '#16a34a' }} />
                      <LabelList dataKey="margenPct" position="top" offset={17} formatter={(v) => `${v.toFixed(0)}%`} style={{ ...LABEL_STYLE, fontSize: 10, fill: '#7c3aed' }} />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
                <ChartInsight text={narrarEvolucionAnual(bi.porAnio)} />
              </CardBody>
            </Card>

            <Card className="border-orange-100">
              <CardHeader className="border-orange-50">
                <CardTitle>Ingresos, costos y ganancia por año</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Comparativo histórico con margen bruto (%)</p>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart data={bi.porAnio} margin={{ top: 28, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                    <XAxis dataKey="anio" tick={{ fontSize: 12, fill: '#78716c' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="left" dataKey="ingresos" name="Ingresos" fill="#f97316" radius={[6, 6, 0, 0]} barSize={28}>
                      <LabelList dataKey="ingresos" position="insideTop" formatter={(v) => `${(v / 1e6).toFixed(1)}M`} style={{ ...LABEL_STYLE, fontSize: 10 }} />
                    </Bar>
                    <Bar yAxisId="left" dataKey="costos" name="Costos" fill="#94a3b8" radius={[6, 6, 0, 0]} barSize={28}>
                      <LabelList dataKey="costos" position="insideTop" formatter={(v) => `${(v / 1e6).toFixed(1)}M`} style={{ ...LABEL_STYLE, fontSize: 10 }} />
                    </Bar>
                    <Bar yAxisId="left" dataKey="margen" name="Ganancia" fill="#16a34a" radius={[6, 6, 0, 0]} barSize={28}>
                      <LabelList dataKey="margen" position="insideTop" formatter={(v) => `${(v / 1e6).toFixed(1)}M`} style={{ ...LABEL_STYLE, fontSize: 10 }} />
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="margenPct" name="Margen %" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4 }}>
                      <LabelList dataKey="margenPct" position="top" formatter={(v) => `${v.toFixed(0)}%`} style={{ ...LABEL_STYLE, fontSize: 11 }} />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
                <ChartInsight text={narrarIngresosCostosAnio(bi.porAnio)} />
              </CardBody>
            </Card>
          </div>

          {/* ─── Gráfico: tendencia mensual + MRR normalizado ─────────────── */}
          <Card className="border-orange-100">
            <CardHeader className="border-orange-50">
              <CardTitle>Tendencia mensual de ingresos y costos</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">
                Barras = ingresos/costos brutos · <span className="text-violet-600 font-semibold">Línea violeta = MRR normalizado</span> (elimina distorsión de planes anuales/semestrales)
              </p>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={bi.porMes} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradCostos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716c' }} interval={2} />
                  <YAxis tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="ingresos" name="Ingresos brutos" stroke="#f97316" strokeWidth={1.5} fill="url(#gradIngresos)" />
                  <Area type="monotone" dataKey="costos" name="Costos" stroke="#64748b" strokeWidth={1.5} fill="url(#gradCostos)" />
                  <Line type="monotone" dataKey="mrr" name="MRR normalizado" stroke="#7c3aed" strokeWidth={2.5} dot={false} strokeDasharray="0" />
                </ComposedChart>
              </ResponsiveContainer>
              <ChartInsight text={narrarTendenciaMensual(bi.porMes)} />
            </CardBody>
          </Card>

          {/* ─── Ventas de licencias — mes a mes, filtrable por año ────────── */}
          <Card className="border-orange-100">
            <CardHeader className="border-orange-50">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Ventas de licencias — mes a mes</CardTitle>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Barras = ingresos por ventas de licencias (eje izq., con etiqueta $) · <span className="text-blue-600 font-semibold">Línea azul = N° de ventas</span> (eje der., con etiqueta de unidades)
                  </p>
                </div>
                {aniosVentasLicencia.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 text-sm flex-shrink-0">
                      <Calendar size={16} className="text-orange-500" />
                      <span className="text-gray-500 font-medium">Año</span>
                      <select
                        value={anioVentasLicencia ?? ''}
                        onChange={(e) => setAnioVentasLicencia(Number(e.target.value))}
                        className="px-3 py-1.5 border border-orange-200 rounded-lg bg-white font-semibold text-brand-accent focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                      >
                        {aniosVentasLicencia.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-sm flex-shrink-0">
                      <span className="text-gray-500 font-medium">Mes</span>
                      <select
                        value={mesVentasLicencia ?? ''}
                        onChange={(e) => setMesVentasLicencia(e.target.value === '' ? null : Number(e.target.value))}
                        className="px-3 py-1.5 border border-orange-200 rounded-lg bg-white font-semibold text-brand-accent focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                      >
                        <option value="">Todo el año</option>
                        {MES_LABELS.map((label, i) => <option key={i} value={i + 1}>{label}</option>)}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {resumenVentasLicencia?.totalVentas > 0 ? (
                <>
                  {resumenVentasLicencia.mesDetalle ? (() => {
                    const { mesActual, mesAnteriorAnio, ticketPromedioMes, crecimientoIngresosMesPct, crecimientoVentasMesPct, pctDelAnio } = resumenVentasLicencia.mesDetalle
                    const nombreMes = MES_LABELS[mesVentasLicencia - 1]
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <BiCard
                          icon={Receipt} variant="solid" label={`Ventas ${nombreMes} ${anioVentasLicencia}`}
                          value={mesActual.numVentas}
                          growth={crecimientoVentasMesPct}
                          growthLabel={crecimientoVentasMesPct != null ? `vs. ${nombreMes} ${anioVentasLicencia - 1}` : `sin ${nombreMes} ${anioVentasLicencia - 1} para comparar`}
                        />
                        <BiCard
                          icon={DollarSign} variant="light" label="Ingresos del mes"
                          value={formatCurrency(mesActual.ingresos)}
                          growth={crecimientoIngresosMesPct}
                          growthLabel={crecimientoIngresosMesPct != null ? `vs. ${nombreMes} ${anioVentasLicencia - 1}` : `sin ${nombreMes} ${anioVentasLicencia - 1} para comparar`}
                        />
                        <BiCard
                          icon={Wallet} variant="outline" label="Ticket promedio del mes"
                          value={formatCurrency(ticketPromedioMes)}
                          sub={`${pctDelAnio}% del ingreso de ${anioVentasLicencia}`}
                        />
                        <BiCard
                          icon={Calendar} variant="light" label={`${nombreMes} ${anioVentasLicencia - 1}`}
                          value={mesAnteriorAnio ? formatCurrency(mesAnteriorAnio.ingresos) : '—'}
                          sub={mesAnteriorAnio ? `${mesAnteriorAnio.numVentas} venta${mesAnteriorAnio.numVentas === 1 ? '' : 's'}` : `Sin datos de ${anioVentasLicencia - 1}`}
                        />
                      </div>
                    )
                  })() : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <BiCard
                        icon={Receipt} variant="solid" label={`Ventas de licencias ${anioVentasLicencia}`}
                        value={resumenVentasLicencia.totalVentas}
                        growth={resumenVentasLicencia.crecimientoVentasPct}
                        growthLabel={resumenVentasLicencia.crecimientoVentasPct != null ? `vs. ${anioVentasLicencia - 1}` : `sin ${anioVentasLicencia - 1} para comparar`}
                      />
                      <BiCard
                        icon={DollarSign} variant="light" label="Ingresos del año"
                        value={formatCurrency(resumenVentasLicencia.totalIngresos)}
                        growth={resumenVentasLicencia.crecimientoIngresosPct}
                        growthLabel={resumenVentasLicencia.crecimientoIngresosPct != null ? `vs. ${anioVentasLicencia - 1}` : `sin ${anioVentasLicencia - 1} para comparar`}
                      />
                      <BiCard
                        icon={Wallet} variant="outline" label="Ticket promedio"
                        value={formatCurrency(resumenVentasLicencia.ticketPromedio)}
                        sub={`promedio mensual: ${formatCurrency(resumenVentasLicencia.promedioMensual)}`}
                      />
                      <BiCard
                        icon={Trophy} variant="light" label="Mejor mes"
                        value={resumenVentasLicencia.mejorMes?.label || '—'}
                        sub={resumenVentasLicencia.mejorMes ? `${formatCurrency(resumenVentasLicencia.mejorMes.ingresos)} · ${resumenVentasLicencia.mejorMes.numVentas} ventas` : 'Sin ventas registradas'}
                      />
                    </div>
                  )}

                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={ventasLicenciaPorMes} margin={{ top: 54, right: 32, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#78716c' }} />
                      <YAxis
                        yAxisId="left" domain={[0, (dataMax) => Math.ceil(dataMax * 1.45)]} tick={{ fontSize: 11, fill: '#78716c' }}
                        tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : v}
                      />
                      <YAxis yAxisId="right" orientation="right" domain={[0, (dataMax) => Math.ceil(dataMax * 1.75)]} allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} />
                      <Tooltip
                        formatter={(value, name) => name === 'N° de ventas'
                          ? [`${value} venta${value === 1 ? '' : 's'}`, name]
                          : [formatCurrency(value), name]}
                        labelFormatter={(label) => `${label} ${anioVentasLicencia}`}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar yAxisId="left" dataKey="ingresos" name="Ingresos" fill="#f97316" radius={[6, 6, 0, 0]} barSize={26}>
                        {ventasLicenciaPorMes.map((m) => (
                          <Cell key={m.mes} fill={mesVentasLicencia === m.mes ? '#c2410c' : '#f97316'} />
                        ))}
                        {/* Etiqueta dentro de la barra (barras altas ≥ $800 K) */}
                        <LabelList dataKey="ingresos" position="insideTop" formatter={(v) => v >= 800_000 ? formatCompactCurrency(v) : ''} style={{ fill: '#fff', fontWeight: 700, fontSize: 10 }} />
                        {/* Etiqueta sobre la barra (barras pequeñas < $800 K) */}
                        <LabelList dataKey="ingresos" position="top" formatter={(v) => v > 0 && v < 800_000 ? formatCompactCurrency(v) : ''} style={{ ...LABEL_STYLE, fill: '#9a3412', fontSize: 10 }} />
                      </Bar>
                      <Line
                        yAxisId="right" type="monotone" dataKey="numVentas" name="N° de ventas"
                        stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }}
                        isAnimationActive={false}
                        label={({ x, y, value }) => value > 0
                          ? <text key={`lv-${x}`} x={x} y={y - 16} textAnchor="middle" fill="#1d4ed8" fontSize={11} fontWeight={700} stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" paintOrder="stroke">{value}</text>
                          : null}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <ChartInsight text={resumenVentasLicencia.mesDetalle
                    ? narrarVentasLicenciaMes(resumenVentasLicencia, mesVentasLicencia, anioVentasLicencia)
                    : narrarVentasLicenciaAnio(resumenVentasLicencia, anioVentasLicencia)} />
                </>
              ) : (
                <div className="py-12 text-center text-sm text-gray-400">
                  No hay ventas de licencias registradas para <strong className="text-gray-600">{anioVentasLicencia}</strong>. Selecciona otro año en el filtro o verifica los datos importados en el módulo de Ventas.
                </div>
              )}
            </CardBody>
          </Card>

          {/* ─── Composición del ingreso + tabla año a año ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <Card className="border-orange-100 lg:col-span-2">
              <CardHeader className="border-orange-50">
                <CardTitle>Composición del ingreso</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Por tipo de transacción</p>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} label={renderDonutLabel} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <ChartInsight text={narrarComposicion(bi.tipoPago)} />
                <div className="space-y-1.5 mt-2">
                  {pieData.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        {p.name}
                      </span>
                      <span className="font-semibold text-brand-accent">{p.pct}%</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card className="border-orange-100 lg:col-span-3">
              <CardHeader className="border-orange-50">
                <CardTitle>Comparativo año a año</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Ingresos, costos, margen y crecimiento</p>
              </CardHeader>
              <CardBody className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-left">
                      <th className="px-4 py-2.5 font-semibold">Año</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Ingresos</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Costos</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Margen</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Crec. Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const mejorAnio = bi.porAnio.reduce((best, r) => (!best || r.ingresos > best.ingresos ? r : best), null)
                      const anioEnCurso = bi.comparativoYTD?.anioActual
                      return bi.porAnio.map((r, i) => (
                        <tr key={r.anio} className={`border-b border-orange-50 ${i % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}`}>
                          <td className="px-4 py-2.5 font-bold text-orange-700">
                            <span className="inline-flex items-center gap-1.5">
                              {r.anio}
                              {mejorAnio && r.anio === mejorAnio.anio && (
                                <SmartTag tone="good" icon={Trophy}>Mejor año histórico</SmartTag>
                              )}
                              {anioEnCurso && Number(r.anio) === Number(anioEnCurso) && (
                                <SmartTag tone="info" icon={Hourglass}>Año en curso</SmartTag>
                              )}
                            </span>
                          </td>
                        <td className="px-4 py-2.5 text-right">{formatCurrency(r.ingresos)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{formatCurrency(r.costos)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">{r.margenPct.toFixed(1)}%</td>
                        <td className="px-4 py-2.5 text-right">
                          {r.crecimientoIngresosPct != null ? <GrowthBadge pct={r.crecimientoIngresosPct} /> : <span className="text-gray-300">—</span>}
                        </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </div>

          {/* ─── Operaciones · Panel de control ────────────────────────────── */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-2.5 shadow-md">
                <Activity size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-brand-accent">Operaciones · Panel de control</h2>
                <p className="text-sm text-gray-500">Ocupación de capacidad instalada y clientes que requieren atención inmediata</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Ocupación de Cuentas Padre */}
              {bi.ocupacion && (
                <Card className="border-slate-200">
                  <CardHeader className="border-slate-100">
                    <div className="flex items-center justify-between">
                      <CardTitle>Ocupación de Cuentas Padre</CardTitle>
                      <span className={cn(
                        'text-2xl font-bold tabular-nums',
                        bi.ocupacion.pctOcupacionGlobal >= 90 ? 'text-red-600' :
                        bi.ocupacion.pctOcupacionGlobal >= 75 ? 'text-amber-600' : 'text-green-600'
                      )}>{bi.ocupacion.pctOcupacionGlobal}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          bi.ocupacion.pctOcupacionGlobal >= 90 ? 'bg-red-500' :
                          bi.ocupacion.pctOcupacionGlobal >= 75 ? 'bg-amber-400' : 'bg-green-500'
                        )}
                        style={{ width: `${bi.ocupacion.pctOcupacionGlobal}%` }}
                      />
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span><span className="font-semibold text-brand-accent">{bi.ocupacion.totalOcupadas}</span> ocupadas</span>
                      <span><span className="font-semibold text-green-600">{bi.ocupacion.totalLibres}</span> libres</span>
                      <span><span className="font-semibold text-gray-400">{bi.ocupacion.totalCapacidad}</span> capacidad total</span>
                    </div>
                  </CardHeader>
                  <CardBody className="p-0">
                    <div className="overflow-auto max-h-64">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="sticky top-0 bg-slate-50 text-gray-500">
                            <th className="px-4 py-2 text-left font-semibold">Cuenta</th>
                            <th className="px-4 py-2 text-center font-semibold">Cap.</th>
                            <th className="px-4 py-2 text-center font-semibold">Ocup.</th>
                            <th className="px-4 py-2 text-left font-semibold w-28">Uso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bi.ocupacion.detalle.map((c, i) => (
                            <tr key={c.cuentaId} className={cn('border-t border-gray-50', i % 2 === 1 && 'bg-gray-50/50')}>
                              <td className="px-4 py-2 font-mono text-brand-accent font-medium">{c.cuentaId}</td>
                              <td className="px-4 py-2 text-center text-gray-500">{c.capacidad}</td>
                              <td className="px-4 py-2 text-center font-semibold text-brand-accent">{c.ocupadas}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-1.5">
                                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={cn('h-full rounded-full',
                                        c.pctOcupacion >= 100 ? 'bg-red-500' :
                                        c.pctOcupacion >= 80  ? 'bg-amber-400' : 'bg-brand-primary'
                                      )}
                                      style={{ width: `${Math.min(c.pctOcupacion, 100)}%` }}
                                    />
                                  </div>
                                  <span className={cn('text-xs tabular-nums',
                                    c.pctOcupacion >= 100 ? 'text-red-600' :
                                    c.pctOcupacion >= 80  ? 'text-amber-600' : 'text-gray-500'
                                  )}>{c.pctOcupacion}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {bi.ocupacion.totalLibres > 0 && (
                      <div className="px-4 py-2.5 border-t border-gray-100 bg-green-50 text-xs text-green-700 font-medium flex items-center gap-1.5">
                        <TrendingUp size={12} />
                        {bi.ocupacion.totalLibres} pantalla{bi.ocupacion.totalLibres !== 1 ? 's' : ''} disponible{bi.ocupacion.totalLibres !== 1 ? 's' : ''} para vender sin costo adicional
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}

              {/* Clientes en riesgo de churn */}
              {bi.clientesEnRiesgo?.length > 0 && (
                <Card className="border-red-100">
                  <CardHeader className="border-red-50">
                    <div className="flex items-center justify-between">
                      <CardTitle>Clientes en riesgo de churn</CardTitle>
                      <div className="flex gap-1.5">
                        {bi.clientesEnRiesgo.filter(c => c.alerta === 'VENCIDO').length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                            {bi.clientesEnRiesgo.filter(c => c.alerta === 'VENCIDO').length} vencidos
                          </span>
                        )}
                        {bi.clientesEnRiesgo.filter(c => c.alerta === 'PROXIMO A VENCER').length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                            {bi.clientesEnRiesgo.filter(c => c.alerta === 'PROXIMO A VENCER').length} por vencer
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Pantallas con fin real vencido o a ≤ 8 días según el Planificador — ordenados por LTV histórico</p>
                  </CardHeader>
                  <CardBody className="p-0">
                    <div className="overflow-auto max-h-72">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="sticky top-0 bg-red-50 text-gray-500">
                            <th className="px-4 py-2 text-left font-semibold">Cliente</th>
                            <th className="px-4 py-2 text-left font-semibold">Nickname</th>
                            <th className="px-4 py-2 text-right font-semibold">LTV</th>
                            <th className="px-4 py-2 text-center font-semibold">Vence</th>
                            <th className="px-4 py-2 text-center font-semibold">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bi.clientesEnRiesgo.map((c, i) => (
                            <tr key={c.customerId || i} className={cn('border-t border-gray-50', i % 2 === 1 && 'bg-gray-50/50')}>
                              <td className="px-4 py-2 font-medium text-brand-accent">{c.nombre}</td>
                              <td className="px-4 py-2 font-mono text-gray-500">{c.nickname || '—'}</td>
                              <td className="px-4 py-2 text-right font-semibold text-brand-accent tabular-nums">
                                {c.ltvHistorico > 0 ? formatCurrency(c.ltvHistorico) : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-2 text-center whitespace-nowrap tabular-nums">
                                {c.venceEl ? (
                                  <>
                                    <span className="text-gray-600">{c.venceEl}</span>
                                    <span className={cn('block text-[10px] font-semibold', c.diasRestantes <= 0 ? 'text-red-600' : 'text-amber-600')}>
                                      {diasLabel(c.diasRestantes)}
                                    </span>
                                  </>
                                ) : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {c.alerta === 'VENCIDO'
                                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold whitespace-nowrap"><AlertCircle size={9} /> Vencido</span>
                                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold whitespace-nowrap"><Clock size={9} /> Por vencer</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-2.5 border-t border-gray-100 bg-red-50/50 text-xs text-red-600 font-medium flex items-center gap-1.5">
                      <ShieldAlert size={12} />
                      Valor total en riesgo: <span className="font-bold ml-1">{formatCurrency(bi.ltv?.valorEnRiesgo || 0)}</span>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          </div>

          {/* ─── Análisis económico-financiero ─────────────────────────────── */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-2.5 shadow-md">
                <Lightbulb size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-brand-accent">Análisis económico-financiero</h2>
                <p className="text-sm text-gray-500">Lectura experta del comportamiento del negocio a partir de los datos actuales</p>
              </div>
            </div>
            <FinancialAnalysis bi={bi} />
          </div>
        </>
      )}
    </div>
  )
}
