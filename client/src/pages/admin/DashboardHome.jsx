import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Package, FileText, Tv, DollarSign, AlertCircle, Clock, TrendingUp,
  TrendingDown, Minus, Wallet, PiggyBank, Percent, Repeat,
  BarChart3, Lightbulb, Target, Activity, Scale, UserCheck,
  UserX, Server, Monitor, ArrowRight, Sparkles, Trophy, Hourglass,
  Gem, RefreshCw, Calendar, Receipt, Download,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, AreaChart, Area, PieChart, Pie, Cell, LabelList,
} from 'recharts'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { formatCurrency } from '../../utils/excelUtils'
import { cn } from '../../utils/cn'
import { calcDias, getRowVariant } from './planificador/rowHelpers'
import { CategoryPanel, screenToVentaPrefill, CATEGORY_CONFIG } from './planificador/CategoryPanel'

// ─── Stat card (KPIs operativos) ─────────────────────────────────────────────
// Si recibe `onClick`, se vuelve interactiva: funciona como acceso directo al
// módulo relacionado (mismo patrón "tarjeta inteligente" del Planificador).

function StatCard({ icon: Icon, title, value, color, subtitle, onClick }) {
  const interactive = typeof onClick === 'function'
  return (
    <Card
      className={cn(
        'p-5',
        interactive && 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-brand-primary/40'
      )}
      {...(interactive ? {
        role: 'button',
        tabIndex: 0,
        onClick,
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } },
      } : {})}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-brand-accent mt-2">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{subtitle}</p>}
          {interactive && (
            <p className="flex items-center gap-1 text-xs font-semibold text-brand-primary mt-2">
              Ver módulo <ArrowRight size={12} />
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl flex-shrink-0 ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </Card>
  )
}

// ─── KPI card con variación (estilo BI / Power BI) ───────────────────────────

function GrowthBadge({ pct }) {
  if (pct == null) return null
  const up = pct > 0
  const flat = Math.abs(pct) < 0.05
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown
  const color = flat ? 'text-gray-500 bg-gray-100' : up ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      <Icon size={12} />
      {up && !flat ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function BiCard({ icon: Icon, label, value, growth, growthLabel, sub, variant = 'light', tag }) {
  const styles = {
    solid:   'bg-gradient-to-br from-orange-500 to-orange-600 text-white',
    light:   'bg-white border-2 border-orange-200 text-orange-700',
    outline: 'bg-orange-50 border border-orange-300 text-orange-800',
  }
  const iconBg = { solid: 'bg-white/20', light: 'bg-orange-100', outline: 'bg-orange-200/60' }
  return (
    <div className={`${styles[variant]} rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${variant === 'solid' ? 'opacity-90' : ''}`}>{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {tag && <div className="mt-1.5"><SmartTag tone={tag.tone}>{tag.text}</SmartTag></div>}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {growth != null && <GrowthBadge pct={growth} />}
            {(growthLabel || sub) && (
              <span className={`text-xs ${variant === 'solid' ? 'opacity-75' : 'text-gray-400'}`}>{growthLabel || sub}</span>
            )}
          </div>
        </div>
        <div className={`${iconBg[variant]} rounded-lg p-3`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

// ─── Tooltip personalizado para charts ───────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-lg shadow-lg border border-orange-100 px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

const PIE_COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ef4444']

const MES_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Formato compacto para etiquetas de valor sobre las barras (ej. $1.2M, $850K)
// — el tooltip sigue mostrando el valor exacto con formatCurrency().
function formatCompactCurrency(value) {
  if (!value) return ''
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1000)}K`
  return formatCurrency(value)
}

// ─── Estilo unificado de etiquetas de valor sobre los gráficos ──────────────
// Tinta neutra (slate-800) + halo blanco detrás del texto (paint-order):
// queda legible sobre cualquier fondo —barra naranja, gris, línea verde o
// blanco de la tarjeta— sin competir con el color propio de cada serie.

const LABEL_STYLE = {
  fontWeight: 700,
  fill: '#1e293b',
  stroke: '#fff',
  strokeWidth: 3,
  strokeLinejoin: 'round',
  paintOrder: 'stroke',
}

// ─── Etiqueta % sobre cada porción de los gráficos de dona ──────────────────
// Solo se dibuja si la porción es lo bastante grande para no solaparse con
// sus vecinas; las porciones pequeñas quedan identificadas en la leyenda.
// Texto blanco con halo oscuro: legible sobre cualquier color de porción y
// también si el texto se asoma fuera del anillo, sobre el fondo blanco.

const RADIAN = Math.PI / 180
function renderDonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) / 2
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}
      fill="#fff" stroke="rgba(15,23,42,0.55)" strokeWidth={3} strokeLinejoin="round" paintOrder="stroke"
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  )
}

// ─── Etiqueta de variación % para el gráfico de momentum: se dibuja fuera de
// la barra (encima si es positiva, debajo si es negativa) para no chocar con
// la barra ni con la línea base de 0% ────────────────────────────────────────

function MomentumValueLabel({ x, y, width, height, value }) {
  if (value == null) return null
  const positivo = value >= 0
  const labelY = positivo ? y - 6 : y + height + 14
  return (
    <text
      x={x + width / 2} y={labelY} textAnchor="middle" fontSize={11}
      {...LABEL_STYLE}
    >
      {`${positivo ? '+' : ''}${value.toFixed(1)}%`}
    </text>
  )
}

// ─── Recuadro de lectura por gráfica (storytelling al pie de cada chart) ─────
// Texto corto, generado dinámicamente desde los datos, que explica "qué dice
// esta gráfica" en lenguaje simple pero técnico — el puente entre el dato y
// la decisión de negocio.

function ChartInsight({ text }) {
  if (!text) return null
  return (
    <div className="mt-3 flex gap-2.5 bg-orange-50/70 border border-orange-100 rounded-lg px-3.5 py-2.5">
      <Lightbulb size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-gray-600 leading-relaxed">
        {text.split('**').map((chunk, j) => (j % 2 === 1 ? <strong key={j} className="text-gray-800">{chunk}</strong> : chunk))}
      </p>
    </div>
  )
}

// ─── Etiquetas inteligentes: clasificación automática del KPI a partir de su
// valor (no texto fijo) — el atajo visual entre el número y su lectura ───────

function SmartTag({ tone = 'info', icon: Icon = Sparkles, children }) {
  const styles = {
    good: 'bg-emerald-100 text-emerald-700',
    warn: 'bg-amber-100 text-amber-700',
    bad:  'bg-red-100 text-red-700',
    info: 'bg-sky-100 text-sky-700',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${styles[tone]}`}>
      <Icon size={10} />
      {children}
    </span>
  )
}

function tagMarkup(k) {
  if (k.markupPct >= 150) return { tone: 'good', text: 'Retorno sobre costo alto' }
  if (k.markupPct >= 80) return { tone: 'info', text: 'Retorno sobre costo saludable' }
  return { tone: 'warn', text: 'Margen ajustado sobre el costo' }
}

function tagCobertura(k) {
  if (k.coberturaCostos >= 2.5) return { tone: 'good', text: 'Colchón financiero amplio' }
  if (k.coberturaCostos >= 1.5) return { tone: 'info', text: 'Colchón financiero adecuado' }
  return { tone: 'bad', text: 'Colchón financiero ajustado' }
}

function tagPuntoEquilibrio(k, porAnio) {
  const cerrados = (porAnio || []).filter(a => a.crecimientoIngresosPct != null)
  const ref = cerrados[cerrados.length - 1]
  if (!ref || !k.puntoEquilibrioVentas) return { tone: 'info', text: 'Umbral mínimo de ventas para no perder' }
  const ratio = ref.numVentas / k.puntoEquilibrioVentas
  if (ratio >= 1.5) return { tone: 'good', text: `${ref.anio} operó ${ratio.toFixed(1)}× sobre el umbral` }
  if (ratio >= 1) return { tone: 'info', text: `${ref.anio} superó el umbral` }
  return { tone: 'bad', text: `${ref.anio} no alcanzó el umbral` }
}

function tagConcentracion(k) {
  if (k.concentracionTop20Pct >= 60) return { tone: 'bad', text: 'Alta dependencia de pocos clientes' }
  if (k.concentracionTop20Pct >= 45) return { tone: 'warn', text: 'Concentración moderada — vigilar' }
  return { tone: 'good', text: 'Cartera diversificada' }
}

function tagArpu(k) {
  const ratio = k.ticketPromedio > 0 ? k.arpu / k.ticketPromedio : 0
  return { tone: 'info', text: `≈ ${ratio.toFixed(1)} compras por cliente en su histórico` }
}

function tagPantalla(k) {
  const margenPct = k.ingresoPorPantalla > 0 ? ((k.ingresoPorPantalla - k.costoPorPantalla) / k.ingresoPorPantalla) * 100 : 0
  if (margenPct >= 60) return { tone: 'good', text: `Unidad muy rentable (${margenPct.toFixed(0)}% margen)` }
  if (margenPct >= 40) return { tone: 'info', text: `Margen saludable (${margenPct.toFixed(0)}%)` }
  return { tone: 'warn', text: `Margen ajustado (${margenPct.toFixed(0)}%)` }
}

function tagMomentum(k) {
  if (k.momentumVentasPct > 5) return { tone: 'good', text: 'Acelerando' }
  if (k.momentumVentasPct > -5) return { tone: 'info', text: 'Ritmo estable' }
  return { tone: 'warn', text: 'Desacelerando — vigilar' }
}

function tagLtv(ltvPromedio) {
  if (ltvPromedio >= 200000) return { tone: 'good', text: 'LTV alto' }
  if (ltvPromedio >= 80000)  return { tone: 'info', text: 'LTV moderado' }
  return { tone: 'warn', text: 'LTV bajo — priorizar retención' }
}

function tagValorEnRiesgo(valorEnRiesgo, ltvPromedio) {
  if (!ltvPromedio || !valorEnRiesgo) return { tone: 'info', text: 'Sin clientes en riesgo hoy' }
  const n = Math.round(valorEnRiesgo / ltvPromedio)
  if (n > 15) return { tone: 'bad',  text: `Equivale a ${n} LTV promedios en juego` }
  if (n > 5)  return { tone: 'warn', text: `Equivale a ${n} LTV promedios en juego` }
  return { tone: 'info', text: `Equivale a ${n} LTV promedios en juego` }
}

// ─── Generadores de narrativa: explican el comportamiento año a año / mes a
// mes de cada gráfica con lenguaje sencillo pero técnico, a partir de datos
// reales (no texto fijo) ──────────────────────────────────────────────────────

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
    : ` La línea verde (margen %) se mantiene en un rango alto y estable, lo que confirma que el crecimiento del negocio no ha sacrificado eficiencia de costos.`}`
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

// Resumen + conclusión del gráfico "Ventas de licencias — mes a mes" para el
// año seleccionado en el filtro (incluye comparación contra el año anterior).
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

// Resumen + conclusión de "Ventas de licencias — mes a mes" cuando el filtro
// de Mes está activo: detalle del mes puntual vs. el mismo mes del año
// anterior, y su peso dentro del total del año.
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

function narrarPareto(paretoIngresos, kpis) {
  if (!paretoIngresos?.length) return null
  const p20 = paretoIngresos.find(p => p.pctClientes === 20)
  const p50 = paretoIngresos.find(p => p.pctClientes === 50)
  if (!p20 || !p50) return null
  const brecha20 = (p20.pctIngresos - 20).toFixed(1)
  return `Si la cartera estuviera repartida en partes iguales, el 20% de los clientes generaría el 20% del ingreso — esa es la diagonal punteada (distribución equitativa). En la realidad ese 20% genera **${p20.pctIngresos.toFixed(1)}%** del ingreso, **+${brecha20} puntos por encima de la equidad**, y solo la mitad de la cartera ya concentra ${p50.pctIngresos.toFixed(1)}%. ${kpis.concentracionTop20Pct > 50
    ? 'Cuanto más se "infla" la curva naranja sobre la diagonal, mayor es la dependencia de unos pocos clientes — y mayor el golpe en caja si alguno de ellos cancela. Vale la pena identificar a esos clientes "ancla" y diseñarles un plan de fidelización dedicado.'
    : 'La curva no se aleja demasiado de la diagonal: el ingreso está razonablemente repartido entre la base de clientes, lo que reduce el riesgo de que la salida de unos pocos golpee la caja de forma material.'}`
}

function narrarProductividad(kpis) {
  const margenPantalla = kpis.ingresoPorPantalla - kpis.costoPorPantalla
  const margenPct = kpis.ingresoPorPantalla > 0 ? (margenPantalla / kpis.ingresoPorPantalla) * 100 : 0
  return `Cada una de las ${kpis.totalPantallas} pantallas activas produce, en promedio, ${formatCurrency(kpis.ingresoPorPantalla)} de ingreso y consume ${formatCurrency(kpis.costoPorPantalla)} de costo — dejando **${formatCurrency(margenPantalla)} de margen por pantalla** (${margenPct.toFixed(1)}% de su ingreso). Esta es la "unidad económica" más pequeña del negocio: si el costo por pantalla sube — por ejemplo, por variaciones en la TRM o en el precio de las credenciales — esta barra gris sería la primera en moverse, y el primer lugar donde se vería la presión sobre la rentabilidad.`
}

function narrarMomentum(serie, kpis) {
  if (!serie?.length) return null
  const positivos = serie.filter(m => m.variacionPct >= 0).length
  const negativos = serie.length - positivos
  const ultimo = serie[serie.length - 1]
  return `De los últimos ${serie.length} meses con actividad, ${positivos} cerraron en **crecimiento** frente al mes anterior y ${negativos} en **caída**. El más reciente (${ultimo.label}) varió ${ultimo.variacionPct >= 0 ? '+' : ''}${ultimo.variacionPct.toFixed(1)}%, y el promedio de esas variaciones — el "momentum" — es de ${kpis.momentumVentasPct >= 0 ? '+' : ''}${kpis.momentumVentasPct.toFixed(1)}% mensual. ${kpis.momentumVentasPct >= 0
    ? 'Un momentum positivo y sostenido sugiere que el ritmo comercial actual debería seguir empujando los ingresos al alza en los próximos cierres mensuales.'
    : 'Un momentum negativo no es alarmante por sí solo si el histórico ya muestra estacionalidad (meses bajos seguidos de recuperación), pero si se sostiene dos o tres meses más, es la señal para activar acciones comerciales de reactivación (campañas de renovación, recuperación de cartera).'}`
}

function narrarMrr(bi) {
  if (!bi) return null
  const { kpis, mrrPorTipoPlan, porMes } = bi
  if (!kpis?.mrrActual) return null
  const principal = mrrPorTipoPlan?.[0]
  const distorsion = kpis.mrrActual > 0 && kpis.ticketPromedio > 0
    ? Number((kpis.ticketPromedio / (kpis.mrrActual / Math.max(1, porMes.filter(m => m.mrr > 0).slice(-1)[0]?.numVentas || 1))).toFixed(1))
    : null
  const mesAnual = porMes.filter(m => m.mrr > 0 && m.ingresos > 0)
    .reduce((worst, m) => {
      const ratio = m.ingresos / m.mrr
      return (!worst || ratio > worst.ratio) ? { label: m.label, ratio } : worst
    }, null)
  return [
    `El **MRR normalizado de ${kpis.mrrMesLabel || 'último mes'} es ${formatCurrency(kpis.mrrActual)}**, equivalente a un ARR de **${formatCurrency(kpis.arrActual)}**. `,
    `Este valor corrige el efecto "lump-sum" de los planes no-mensuales: cuando un cliente paga un plan anual de ~${formatCurrency(190000)}, ese monto aparece como ingreso bruto en el mes de la venta, aunque corresponde a 12 meses de servicio. Al dividir cada venta por la duración de su plan, el MRR muestra el ingreso recurrente real por mes — la métrica adecuada para evaluar crecimiento sostenible. `,
    mesAnual ? `El mes con mayor distorsión reciente fue **${mesAnual.label}**, donde el ingreso bruto fue **${mesAnual.ratio.toFixed(1)}× mayor** al MRR normalizado, señal de ventas concentradas en planes largos ese período. ` : '',
    principal ? `La estructura del ingreso recurrente histórico está dominada por **${principal.plan}** (${principal.pct}% del MRR total) — ` : '',
    principal?.plan === 'Plan Mensual'
      ? `lo que da **alta predictibilidad mensual** pero también mayor exposición al churn, ya que cada mes el cliente decide si renueva.`
      : principal?.plan === 'Plan Semestral'
      ? `un buen balance entre flujo de caja anticipado y flexibilidad para el cliente.`
      : `lo que genera **flujo de caja anticipado** pero puede dificultar detectar churn temprano (el cliente "desaparece" 12 meses después).`,
    kpis.momentumMrrPct != null
      ? ` El **momentum MRR** (variación promedio MoM normalizado) es ${kpis.momentumMrrPct >= 0 ? '+' : ''}${kpis.momentumMrrPct.toFixed(1)}%${Math.abs(kpis.momentumMrrPct) < Math.abs(kpis.momentumVentasPct) ? `, más moderado que el momentum bruto de ${kpis.momentumVentasPct >= 0 ? '+' : ''}${kpis.momentumVentasPct.toFixed(1)}% — la diferencia confirma que parte de la volatilidad del indicador bruto era ruido de planes largos, no señal de crecimiento real` : ''}.`
      : '',
  ].join('')
}

function narrarLtv(ltv) {
  if (!ltv?.numClientes) return null
  const { ltvPromedio, vidaPromedioMeses, arpuMensualLtv, valorEnRiesgo, clientesEnRiesgoCount, numClientes, percentiles } = ltv
  return `Analizando **${numClientes} clientes** con al menos una activación registrada, el **LTV promedio es ${formatCurrency(ltvPromedio)}**: el ingreso que un cliente típico generó durante su **vida activa de ${vidaPromedioMeses} meses** al ritmo de **${formatCurrency(arpuMensualLtv)}/mes** (ARPU mensual normalizado). Esto establece el techo de lo que vale invertir en retener a un cliente antes de que el costo de retención supere el beneficio — si una campaña de reactivación, un descuento o una llamada de seguimiento cuesta menos de ${formatCurrency(ltvPromedio)}, siempre conviene retener antes que perder. La distribución no es uniforme: el 25% con menor LTV no supera ${formatCurrency(percentiles.p25)}, mientras que el 25% superior genera más de ${formatCurrency(percentiles.p75)} — la **asimetría premia fuertemente la retención del segmento alto**. ${clientesEnRiesgoCount > 0 ? `Hoy hay **${clientesEnRiesgoCount} clientes con pantallas próximas a vencer o ya vencidas**, con un **LTV histórico acumulado de ${formatCurrency(valorEnRiesgo)}** en juego — atender esas cuentas es la acción de mayor ROI inmediato disponible en este momento.` : 'Actualmente no hay clientes con pantallas en estado crítico de vencimiento — buen momento para acciones proactivas de fidelización.'}`
}

function narrarComposicion(tipoPago) {
  if (!tipoPago?.length) return null
  const principal = tipoPago[0]
  const segundo = tipoPago[1]
  return `**${principal.tipo}** domina la composición del ingreso con ${principal.pctTotal.toFixed(1)}% (${formatCurrency(principal.total)} en ${principal.cantidad} transacciones)${segundo ? `, seguido de **${segundo.tipo}** con ${segundo.pctTotal.toFixed(1)}%` : ''}. ${principal.tipo === 'Renovacion'
    ? 'Que las renovaciones encabecen la lista confirma que el ingreso es, en su mayoría, **recurrente y predecible** — la prioridad financiera es proteger esa base (retención) antes que invertir agresivamente en captar clientes nuevos.'
    : 'Conviene vigilar si esta composición se mantiene estable en el tiempo: un peso alto de activaciones nuevas frente a renovaciones puede señalar dependencia de la adquisición constante de clientes, con su correspondiente costo.'}`
}

// ─── Narrativas del cruce por módulo: Bajas, Clientes, Planificador ──────────

function narrarBajasPorAnio(serie) {
  if (!serie?.length) return null
  const aniosCompletos = serie.slice(0, -1)
  const ultimo = serie[serie.length - 1]
  const penultimo = serie[serie.length - 2]
  if (!aniosCompletos.length) return null
  const pico = aniosCompletos.reduce((a, b) => (b.total > a.total ? b : a))
  const tendenciaTexto = aniosCompletos.length > 1
    ? (aniosCompletos[aniosCompletos.length - 1].total >= aniosCompletos[0].total
        ? `creció de ${aniosCompletos[0].total} bajas en ${aniosCompletos[0].anio} a ${aniosCompletos[aniosCompletos.length - 1].total} en ${aniosCompletos[aniosCompletos.length - 1].anio}`
        : `bajó de ${aniosCompletos[0].total} bajas en ${aniosCompletos[0].anio} a ${aniosCompletos[aniosCompletos.length - 1].total} en ${aniosCompletos[aniosCompletos.length - 1].anio}`)
    : null
  const parcial = penultimo && ultimo.total < penultimo.total
  return `El año con más cancelaciones registradas hasta ahora es **${pico.anio}** (${pico.total} bajas, principalmente de ${pico.tipoPrincipal}).${tendenciaTexto ? ` Mirando los años ya cerrados, el volumen anual de bajas ${tendenciaTexto} — ${aniosCompletos[aniosCompletos.length - 1].total >= aniosCompletos[0].total ? 'una señal de que el churn crece junto con la base de clientes (algo esperable en un negocio en expansión), pero que conviene monitorear como % de la cartera activa, no solo en valor absoluto' : 'una mejora que vale la pena sostener con las prácticas actuales de retención'}.` : ''}${parcial
    ? ` La barra de **${ultimo.anio}** luce más baja porque el año sigue en curso (${ultimo.total} bajas registradas frente a ${penultimo.total} del ${penultimo.anio} ya cerrado) — no es necesariamente una mejora real, es un corte parcial; compárala contra el mismo punto del año anterior antes de sacar conclusiones.`
    : ''}`
}

function narrarGeografia(paises) {
  if (!paises?.length) return null
  const principal = paises[0]
  const internacional = paises.slice(1).reduce((s, p) => s + p.cantidad, 0)
  const totalMuestra = paises.reduce((s, p) => s + p.cantidad, 0)
  const pctInternacional = totalMuestra > 0 ? (internacional / totalMuestra) * 100 : 0
  return `**${principal.pais}** concentra ${principal.pct}% de la cartera con país registrado — el mercado natural y de menor fricción operativa (zona horaria, idioma, medios de pago). El ${pctInternacional.toFixed(1)}% restante está repartido en otros ${paises.length - 1} países de esta muestra (${paises.slice(1, 4).map(p => p.pais).join(', ')}…), lo que confirma que el negocio ya opera como un **proveedor digital sin fronteras** — una base diversificada geográficamente diluye el riesgo de que una sola economía local (devaluación, regulación, competencia local) golpee toda la cartera a la vez, aunque también implica más husos horarios y canales de soporte que atender.`
}

function narrarSaludPlanificador(alertas, pantallasConDeuda, totalPantallas) {
  if (!alertas?.length || !totalPantallas) return null
  const find = (k) => alertas.find(a => a.alerta === k)?.cantidad || 0
  const vencidas = find('VENCIDO')
  const proximas = find('PROXIMO A VENCER')
  const cortesias = find('CORTESIA')
  const sinNovedad = find('Sin novedad')
  const pctSano = (sinNovedad / totalPantallas) * 100
  return `De las ${totalPantallas} pantallas activas en el Planificador, ${sinNovedad} (${pctSano.toFixed(1)}%) están **sin novedad** — la base operativa sana del negocio. El resto requiere algún tipo de gestión: ${proximas} **próxima${proximas === 1 ? '' : 's'} a vencer** (oportunidad de renovación inmediata, ya priorizada en el módulo), ${vencidas} ya **vencida${vencidas === 1 ? '' : 's'}** (requiere contacto urgente para no perder el cupo), ${cortesias} marcada${cortesias === 1 ? '' : 's'} como **cortesía** (no generan ingreso — vale la pena revisar periódicamente si siguen vigentes) y ${pantallasConDeuda} con **saldo pendiente** (\`debe\`) registrado directamente en el planificador. ${(vencidas + proximas) > 0
    ? `Atender primero esas ${vencidas + proximas} pantallas vencidas o próximas a vencer es la acción de mayor retorno inmediato: convertirlas en renovación protege ingreso que ya existe, a un costo de adquisición prácticamente nulo.`
    : 'No hay pantallas vencidas ni próximas a vencer en este momento — buen punto para usar el tiempo en campañas de fidelización proactivas en lugar de gestión reactiva de cartera.'}`
}

// ─── Análisis económico-financiero (narrativa generada desde los datos) ──────

function FinancialAnalysis({ bi }) {
  if (!bi) return null
  const { kpis, porAnio, comparativoYTD, tipoPago } = bi
  const ultimo = porAnio[porAnio.length - 1]
  const penultimo = porAnio[porAnio.length - 2]
  const primero = porAnio[0]

  // CAGR de ingresos entre el primer y penúltimo año completo
  const aniosCompletos = porAnio.slice(0, -1)
  const cagr = aniosCompletos.length > 1
    ? (Math.pow(aniosCompletos[aniosCompletos.length - 1].ingresos / aniosCompletos[0].ingresos, 1 / (aniosCompletos.length - 1)) - 1) * 100
    : null

  const renovacion = tipoPago.find(t => t.tipo === 'Renovacion')
  const activacion = tipoPago.find(t => t.tipo === 'Activacion Pantalla')

  const items = []

  // 1) Lectura macro del crecimiento histórico
  if (cagr != null) {
    items.push({
      tone: cagr > 15 ? 'good' : cagr > 0 ? 'neutral' : 'bad',
      title: 'Crecimiento estructural (CAGR)',
      text: `Entre ${aniosCompletos[0].anio} y ${aniosCompletos[aniosCompletos.length - 1].anio} los ingresos crecieron a una tasa compuesta anual (CAGR) de ${cagr.toFixed(1)}%, pasando de ${formatCurrency(aniosCompletos[0].ingresos)} a ${formatCurrency(aniosCompletos[aniosCompletos.length - 1].ingresos)}. ${cagr > 30 ? 'Es una expansión muy acelerada, típica de una etapa de captación agresiva de mercado.' : cagr > 10 ? 'Es un ritmo de expansión saludable y sostenido.' : 'El ritmo de expansión se ha moderado frente a etapas anteriores.'}`,
    })
  }

  // 2) Desaceleración reciente
  if (penultimo?.crecimientoIngresosPct != null) {
    const desacelera = aniosCompletos.length >= 3 && aniosCompletos[aniosCompletos.length - 2].crecimientoIngresosPct > penultimo.crecimientoIngresosPct
    items.push({
      tone: penultimo.crecimientoIngresosPct > 10 ? 'good' : penultimo.crecimientoIngresosPct > 0 ? 'neutral' : 'bad',
      title: `Crecimiento del último año cerrado (${penultimo.anio})`,
      text: `Los ingresos crecieron ${penultimo.crecimientoIngresosPct.toFixed(1)}% frente a ${primero === penultimo ? 'el año base' : porAnio[porAnio.indexOf(penultimo) - 1]?.anio} (${formatCurrency(porAnio[porAnio.indexOf(penultimo) - 1]?.ingresos || 0)} → ${formatCurrency(penultimo.ingresos)}), mientras que los costos lo hicieron en ${penultimo.crecimientoCostosPct?.toFixed(1)}%. ${desacelera ? 'Se observa una **desaceleración** respecto al ciclo de crecimiento anterior — la curva de adopción empieza a madurar y el negocio entra en una fase de consolidación más que de expansión explosiva.' : 'El ritmo se mantiene relativamente estable frente al ciclo anterior.'} ${penultimo.crecimientoIngresosPct > penultimo.crecimientoCostosPct ? 'Lo más relevante: el ingreso creció más rápido que el costo, lo que **amplía el margen operativo** — apalancamiento operativo positivo.' : 'De atención: el costo creció más rápido que el ingreso, lo que **comprime el margen** — la estructura de costos pierde eficiencia relativa frente al crecimiento comercial.'}`,
    })
  }

  // 3) Lectura del año en curso (YTD)
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

  // 4) Estructura del margen
  items.push({
    tone: kpis.margenPctTotal > 60 ? 'good' : kpis.margenPctTotal > 40 ? 'neutral' : 'bad',
    title: 'Estructura de márgenes y unit economics',
    text: `El margen bruto histórico es de ${kpis.margenPctTotal.toFixed(1)}% (${formatCurrency(kpis.margenTotal)} sobre ${formatCurrency(kpis.ingresosTotales)} de ingresos, frente a ${formatCurrency(kpis.costosTotales)} de costo de pantallas/cuentas). Es un margen ${kpis.margenPctTotal > 60 ? 'alto, propio de un modelo de reventa de licencias digitales con muy bajo costo marginal por usuario adicional' : 'razonable, aunque con espacio para optimizar el costo unitario por pantalla'}. El ticket promedio por transacción es de ${formatCurrency(kpis.ticketPromedio)}, y el ${kpis.tasaRenovacionPct.toFixed(1)}% de las ventas corresponden a **renovaciones** (vs. ${activacion ? activacion.pctTotal.toFixed(1) : '—'}% de activaciones nuevas). ${kpis.tasaRenovacionPct > 70 ? 'Esta proporción confirma que el negocio vive principalmente de su **base instalada** — la prioridad estratégica debería ser la retención (reducir churn) más que la adquisición pura, porque cada punto de churn cuesta proporcionalmente más que un punto de nueva activación.' : 'La proporción de activaciones nuevas es relevante — conviene vigilar el costo de adquisición frente al valor de vida del cliente (LTV) para asegurar que cada activación nueva sea rentable en el mediano plazo.'}`,
  })

  // 4b) Rentabilidad sobre el costo y riesgo de concentración de cartera
  items.push({
    tone: kpis.coberturaCostos > 2 ? 'good' : kpis.coberturaCostos > 1.3 ? 'neutral' : 'bad',
    title: 'Rentabilidad sobre el costo y punto de equilibrio',
    text: `Visto desde el costo (no desde el ingreso): por cada $1.000 invertidos en pantallas/cuentas, el negocio recupera ${formatCurrency(Math.round(kpis.markupPct * 10))} de margen — un **markup de ${kpis.markupPct.toFixed(1)}%** — y el ingreso cubre ${kpis.coberturaCostos.toFixed(2)} veces el costo operativo (cobertura de costos). Esto implica un **punto de equilibrio de ${kpis.puntoEquilibrioVentas.toLocaleString('es-CO')} ventas** al ticket promedio de ${formatCurrency(kpis.ticketPromedio)} — todo lo que se venda por encima de ese umbral es, en términos de costo de pantalla, prácticamente **utilidad incremental** (apalancamiento operativo favorable: la estructura de costo es mayormente variable y escala con cada activación/renovación). \n\nDesde el ángulo de **concentración de cartera**, el 20% de los clientes (≈${Math.ceil(kpis.numClientesCompradores * 0.2)} de ${kpis.numClientesCompradores}) explica el ${kpis.concentracionTop20Pct.toFixed(1)}% del ingreso histórico. ${kpis.concentracionTop20Pct > 50
      ? 'Esa concentración es **alta**: una porción relativamente pequeña de la cartera sostiene más de la mitad del ingreso, lo que crea **riesgo de dependencia** — la pérdida de unos pocos clientes "ancla" tendría un impacto desproporcionado en caja. Conviene mapear a esos clientes top y diseñar un plan de fidelización dedicado (planes anuales, descuentos por permanencia).'
      : 'Esa concentración es **moderada/saludable**: el ingreso está razonablemente distribuido entre la base de clientes, lo que reduce el riesgo de que la salida de unos pocos afecte materialmente la caja — un perfil de riesgo de cartera favorable para un negocio de suscripción.'} El ingreso promedio por cliente (**ARPU**) es de ${formatCurrency(kpis.arpu)}, y cada una de las ${kpis.totalPantallas} pantallas en operación produce en promedio ${formatCurrency(kpis.ingresoPorPantalla)} frente a un costo de ${formatCurrency(kpis.costoPorPantalla)} — es decir, **cada pantalla deja cerca de ${formatCurrency(kpis.ingresoPorPantalla - kpis.costoPorPantalla)} de margen** a lo largo de su vida útil registrada, el indicador más cercano a una "unidad económica" (unit economics) de este modelo de negocio.`,
  })

  // 5) Riesgo de cancelación / churn
  items.push({
    tone: kpis.churnPct < 20 ? 'good' : kpis.churnPct < 35 ? 'neutral' : 'bad',
    title: 'Riesgo de cancelación (churn) y solidez de la base',
    text: `La tasa de cancelación de suscripciones es de ${kpis.churnPct.toFixed(1)}% sobre el universo histórico activo+cancelado, y se registraron ${ultimo.numBajas} bajas en ${ultimo.anio} (${penultimo ? `frente a ${penultimo.numBajas} en ${penultimo.anio}` : ''}). ${kpis.churnPct > 30
      ? 'Este nivel de churn es **alto para un negocio de suscripción** — cada cliente que se cancela debe ser reemplazado por uno nuevo solo para mantener el ingreso plano, lo que castiga el crecimiento neto y eleva el costo efectivo de adquisición. Recomendación: instrumentar alertas tempranas de vencimiento (el Planificador ya identifica cuentas próximas a vencer) y campañas de retención proactivas antes del corte del servicio.'
      : 'Es un nivel de churn manejable, coherente con un negocio de contenidos digitales de bajo costo de cambio (switching cost). Aun así, cada punto de reducción de churn impacta directamente el margen, porque el costo de retener a un cliente existente es estructuralmente menor que el de activar uno nuevo.'}`,
  })

  // 6) Conclusión / recomendación ejecutiva
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
  const [anioVentasLicencia, setAnioVentasLicencia] = useState(null)
  const [mesVentasLicencia, setMesVentasLicencia] = useState(null)
  const [showVencidasPanel, setShowVencidasPanel] = useState(false)
  const [showProximasPanel, setShowProximasPanel] = useState(false)

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

  // Sincroniza Cuentas Padre → Planificador (cuenta/contraseña/crédito/inicio/fin)
  // y refresca de inmediato las estadísticas del dashboard con esos cambios ya
  // guardados en la base de datos.
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

  // Descarga una copia .sqlite de la base de datos actual del servidor
  // (la de producción, si se usa desde el panel desplegado en Railway).
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

  const pieData = useMemo(() => {
    if (!bi) return []
    return bi.tipoPago.map(t => ({ name: t.tipo, value: t.total, pct: t.pctTotal }))
  }, [bi])

  // Pantallas del Planificador enriquecidas con su variante y días — misma
  // clasificación (getRowVariant/calcDias) que usa PlanificadorPage.
  const pantallasEnriquecidas = useMemo(() => {
    if (!planificador) return []
    const { pantallas, diasAlerta } = planificador
    return pantallas.map(p => ({
      ...p,
      _variant: getRowVariant(p, diasAlerta),
      _dias: calcDias(p.duracionReal || p.finalizacion) ?? p.diasVencimientoReal ?? p.diasVencimiento ?? null,
    }))
  }, [planificador])

  const byDiasAsc = (a, b) => (a._dias ?? Infinity) - (b._dias ?? Infinity)

  // Cuentas vencidas: misma data que la tarjeta "Vencidas" del Planificador (categoría 'vencido').
  const cuentasVencidas = useMemo(
    () => pantallasEnriquecidas.filter(p => p._variant === 'vencido').sort(byDiasAsc),
    [pantallasEnriquecidas]
  )

  // Próximas a vencer: misma data que la tarjeta "Próx. a vencer" del Planificador (categoría 'alerta').
  const proximasAVencer = useMemo(
    () => pantallasEnriquecidas.filter(p => p._variant === 'alerta').sort(byDiasAsc),
    [pantallasEnriquecidas]
  )

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

  // Serie de variación mensual de ingresos (momentum) — derivada de porMes,
  // tomando solo meses con ventas registradas para no distorsionar con ceros.
  const momentumSerie = useMemo(() => {
    if (!bi) return []
    const meses = bi.porMes.filter(m => m.numVentas > 0)
    const out = []
    for (let i = 1; i < meses.length; i++) {
      const prev = meses[i - 1].ingresos
      const cur = meses[i].ingresos
      if (prev > 0) {
        out.push({ label: meses[i].label, variacionPct: Number((((cur - prev) / prev) * 100).toFixed(1)) })
      }
    }
    return out.slice(-12)
  }, [bi])

  // ─── Ventas de licencias — mes a mes, filtrable por año ────────────────────
  const aniosVentasLicencia = useMemo(() => {
    if (!bi) return []
    return [...new Set(bi.porMes.map(m => Number(m.anio)))].filter(Boolean).sort((a, b) => b - a)
  }, [bi])

  // Por defecto, selecciona el año más reciente con datos en cuanto estén disponibles.
  useEffect(() => {
    if (anioVentasLicencia == null && aniosVentasLicencia.length > 0) {
      setAnioVentasLicencia(aniosVentasLicencia[0])
    }
  }, [aniosVentasLicencia, anioVentasLicencia])

  // Serie de 12 meses (Ene-Dic) del año seleccionado, completando con ceros
  // los meses sin ventas registradas para una vista "mes a mes" completa.
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

  // Resumen ejecutivo del año seleccionado, con comparativo vs. el año anterior.
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

    // Si hay un mes seleccionado en el filtro, agrega su detalle puntual
    // (comparado contra el mismo mes del año anterior y su peso en el año).
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

      <div className="mb-2 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-accent">Dashboard</h1>
          <p className="text-gray-500">Panel general de ChikisdTV</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadBackup} variant="secondary" disabled={downloadingBackup}
            className="border-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-white hover:border-brand-accent"
          >
            <Download size={15} /> {downloadingBackup ? 'Descargando…' : 'Respaldo BD'}
          </Button>
          <Button
            onClick={handleSync} variant="secondary" disabled={syncing}
            className="border-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-white hover:border-brand-accent"
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Sincronizando…' : 'Sincronizar Datos'}
          </Button>
        </div>
      </div>

      {/* ─── KPIs operativos: clientes, catálogo y capacidad ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users} title="Clientes Activos" value={stats.totalClients} color="bg-brand-primary"
          subtitle={`${stats.clientesFinal} finales · ${stats.clientesRevendedor} revendedores — presencia en ${stats.paisesCount} países (ver Clientes)`}
          onClick={() => navigate('/admin/clients')}
        />
        <StatCard
          icon={Package} title="Planes" value={stats.totalPlans} color="bg-blue-500"
          subtitle={`Catálogo vigente que respalda ${stats.activeSubscriptions} suscripciones activas hoy`}
          onClick={() => navigate('/admin/plans')}
        />
        <StatCard
          icon={FileText} title="Suscripciones Activas" value={stats.activeSubscriptions} color="bg-green-500"
          subtitle={stats.upcomingExpirations > 0
            ? `${stats.upcomingExpirations} vencen en los próximos 7 días — el Planificador ya las prioriza en "Próx. a vencer"`
            : 'Sin vencimientos en los próximos 7 días — cartera de renovaciones al día'}
          onClick={() => navigate('/admin/subscriptions')}
        />
        <StatCard
          icon={Tv} title="Dispositivos Activos" value={stats.totalDevices} color="bg-purple-500"
          subtitle={`Módulo sin registros propios — el control operativo real vive en el Planificador: ${stats.totalPantallas} pantallas, ${stats.pantallasLibres} libres`}
          onClick={() => navigate('/admin/devices')}
        />
      </div>

      {/* ─── KPIs operativos: ingresos y cartera ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign} title="Ingresos Totales" value={formatCurrency(stats.totalIngresos)} color="bg-emerald-500"
          subtitle={k
            ? `Pagos confirmados — sostienen un margen bruto histórico de ${k.margenPctTotal.toFixed(1)}% (ver análisis BI abajo)`
            : 'Histórico de pagos confirmados en el módulo de Pagos'}
          onClick={() => navigate('/admin/payments')}
        />
        <StatCard
          icon={Clock} title="Pagos Pendientes" value={stats.pendingPayments} color="bg-amber-500"
          subtitle="A la espera de conciliación — revísalos en Pagos antes de que se vuelvan cartera vencida"
          onClick={() => navigate('/admin/payments')}
        />
        <StatCard
          icon={AlertCircle} title="Pagos Vencidos" value={cuentasVencidas.length} color="bg-red-500"
          subtitle={cuentasVencidas.length > 0
            ? 'Cuentas vencidas del Planificador — haz clic para ver cliente, fecha de vencimiento y días de mora'
            : 'Sin cuentas vencidas en el Planificador — cartera sana por ahora'}
          onClick={() => setShowVencidasPanel(true)}
        />
        <StatCard
          icon={TrendingUp} title="Próximas a vencer" value={proximasAVencer.length} color="bg-orange-500"
          subtitle={proximasAVencer.length > 0
            ? `Cuentas del Planificador a ≤${planificador?.diasAlerta ?? 8} días de vencer — haz clic para ver cliente, fecha y días restantes`
            : 'Sin cuentas próximas a vencer — buen momento para campañas de retención preventiva'}
          onClick={() => setShowProximasPanel(true)}
        />
      </div>

      {/* ─── Pulso de otros módulos: lo que no se ve a simple vista ──────── */}
      <div>
        <div className="flex items-center gap-3 mb-4 pt-2">
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-2.5 shadow-md">
            <Activity size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand-accent">Pulso de otros módulos</h2>
            <p className="text-sm text-gray-500">Señales clave de Bajas, Cuentas Padre, Costo Pantalla y Planificador que no aparecen en el resumen operativo, pero mueven el negocio</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={UserX} title={`Bajas en ${stats.anioActual}`} value={stats.bajasEsteAnio} color="bg-rose-500"
            subtitle={`${stats.bajasHistorico} históricas — equivalen a ${Math.round((stats.bajasHistorico / Math.max(stats.totalClients, 1)) * 100)}% de la base activa actual. Cada cancelación evitada protege el ingreso recurrente.`}
            onClick={() => navigate('/admin/bajas')}
          />
          <StatCard
            icon={Server} title="Cuentas Padre" value={stats.cuentasPadreTotal} color="bg-sky-600"
            subtitle={`${stats.creditoCuentasPadreTotal.toLocaleString('es-CO')} cupos de pantalla en inventario — la materia prima detrás de cada nueva venta`}
            onClick={() => navigate('/admin/cuentas-padre')}
          />
          <StatCard
            icon={PiggyBank} title={`Inversión en recargas ${stats.anioActual}`} value={formatCurrency(stats.inversionRecargasAnio)} color="bg-slate-500"
            subtitle="Costo operativo del año en curso — el insumo que define directamente el margen bruto reportado en la sección de Inteligencia de Negocio"
            onClick={() => navigate('/admin/costo-pantalla')}
          />
          <StatCard
            icon={Monitor} title="Pantallas disponibles" value={`${stats.pantallasLibres} de ${stats.totalPantallas}`} color="bg-emerald-500"
            subtitle={stats.pantallasLibres > 0
              ? 'Sin asignar en el Planificador — listas para activar una nueva venta hoy mismo, sin comprar más cupos'
              : 'Ocupación al máximo — considera ampliar cupos en Cuentas Padre antes de la próxima campaña de activaciones'}
            onClick={() => navigate('/admin/planificador')}
          />
        </div>
      </div>

      {bi && (
        <>
          {/* ─── Encabezado BI ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 pt-2">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-2.5 shadow-md">
              <BarChart3 size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-accent">Inteligencia de Negocio · Ventas vs. Costos</h2>
              <p className="text-sm text-gray-500">Comparativos año a año, márgenes y análisis financiero del comportamiento del negocio</p>
            </div>
          </div>

          {/* ─── KPIs comparativos BI ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <BiCard
              icon={Wallet} variant="solid" label="Ingresos históricos"
              value={formatCurrency(k.ingresosTotales)}
              growth={k.crecimientoIngresosUltimo}
              growthLabel={`vs. ${k.anioAnterior} (año cerrado)`}
            />
            <BiCard
              icon={PiggyBank} variant="light" label="Costos históricos"
              value={formatCurrency(k.costosTotales)}
              growth={k.crecimientoCostosUltimo}
              growthLabel={`vs. ${k.anioAnterior} (año cerrado)`}
            />
            <BiCard
              icon={Percent} variant="outline" label="Margen bruto"
              value={`${k.margenPctTotal.toFixed(1)}%`}
              sub={`${formatCurrency(k.margenTotal)} acumulado · ${k.margenPctUltimo?.toFixed(1)}% en ${k.anioActual}`}
            />
            <BiCard
              icon={Repeat} variant="light" label="Renovaciones"
              value={`${k.tasaRenovacionPct.toFixed(1)}%`}
              sub={`del ingreso total · churn ${k.churnPct.toFixed(1)}%`}
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

          {/* ─── Indicadores de rentabilidad y ventas (lectura financiera) ──── */}
          <div className="flex items-center gap-3 pt-4">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-2.5 shadow-md">
              <Target size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-accent">Rentabilidad y Ventas · Lectura financiera</h2>
              <p className="text-sm text-gray-500">Indicadores que un analista financiero y un economista usarían para medir eficiencia, riesgo de cartera y productividad comercial</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <BiCard
              icon={Scale} variant="solid" label="Markup sobre el costo"
              value={`${k.markupPct.toFixed(1)}%`}
              sub={`cada $1.000 de costo deja ${formatCurrency(Math.round(k.markupPct * 10))} de margen bruto`}
              tag={tagMarkup(k)}
            />
            <BiCard
              icon={Activity} variant="light" label="Cobertura de costos"
              value={`${k.coberturaCostos.toFixed(2)}×`}
              sub="veces que el ingreso operativo cubre el costo de pantallas/cuentas"
              tag={tagCobertura(k)}
            />
            <BiCard
              icon={Target} variant="outline" label="Punto de equilibrio"
              value={`${k.puntoEquilibrioVentas.toLocaleString('es-CO')} ventas`}
              sub={`al ticket promedio de ${formatCurrency(k.ticketPromedio)} para cubrir el costo total`}
              tag={tagPuntoEquilibrio(k, bi.porAnio)}
            />
            <BiCard
              icon={Users} variant="light" label="Concentración de cartera"
              value={`${k.concentracionTop20Pct.toFixed(1)}%`}
              sub={`del ingreso histórico lo aporta el 20% top de clientes (${Math.ceil(k.numClientesCompradores * 0.2)} de ${k.numClientesCompradores})`}
              tag={tagConcentracion(k)}
            />
            <BiCard
              icon={UserCheck} variant="outline" label="ARPU · ingreso por cliente"
              value={formatCurrency(k.arpu)}
              sub={`promedio histórico sobre ${k.numClientesCompradores} clientes con compras registradas`}
              tag={tagArpu(k)}
            />
            <BiCard
              icon={Tv} variant="light" label="Ingreso por pantalla"
              value={formatCurrency(k.ingresoPorPantalla)}
              sub={`costo por pantalla ${formatCurrency(k.costoPorPantalla)} · ${k.totalPantallas} pantallas en operación`}
              tag={tagPantalla(k)}
            />
            <BiCard
              icon={TrendingUp} variant={k.momentumMrrPct >= 0 ? 'solid' : 'outline'} label="Momentum MRR"
              value={`${k.momentumMrrPct > 0 ? '+' : ''}${k.momentumMrrPct.toFixed(1)}%`}
              sub={`bruto: ${k.momentumVentasPct > 0 ? '+' : ''}${k.momentumVentasPct.toFixed(1)}% · MRR corregido (sin ruido de planes largos)`}
              tag={k.momentumMrrPct > 5  ? { tone: 'good',  text: 'Acelerando (MRR)' }
                : k.momentumMrrPct > -5  ? { tone: 'info',  text: 'Ritmo estable' }
                : { tone: 'warn', text: 'Desacelerando — vigilar' }}
            />
          </div>

          {/* ─── Gráficos: concentración de cartera y productividad ────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-orange-100">
              <CardHeader className="border-orange-50">
                <CardTitle>Concentración de ingresos por cliente</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">% del ingreso acumulado según el % de clientes (ordenados de mayor a menor aporte) — la brecha frente a la diagonal mide el riesgo de dependencia de la cartera</p>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={bi.paretoIngresos} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="paretoFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                    <XAxis dataKey="pctClientes" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#78716c' }} />
                    <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} tick={{ fontSize: 11, fill: '#78716c' }} />
                    <Tooltip formatter={(v, name) => [`${v}%`, name]} labelFormatter={(v) => `${v}% de los clientes`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="pctIngresos" name="% del ingreso acumulado" stroke="#f97316" strokeWidth={2.5} fill="url(#paretoFill)" />
                    <Line type="monotone" dataKey="pctClientes" name="Distribución equitativa (referencia)" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
                <ChartInsight text={narrarPareto(bi.paretoIngresos, k)} />
              </CardBody>
            </Card>

            <Card className="border-orange-100">
              <CardHeader className="border-orange-50">
                <CardTitle>Productividad por pantalla</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Ingreso, costo y margen promedio por cada una de las {k.totalPantallas} pantallas en operación — la "unidad económica" del negocio</p>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart
                    data={[
                      { concepto: 'Ingreso', valor: k.ingresoPorPantalla },
                      { concepto: 'Costo', valor: k.costoPorPantalla },
                      { concepto: 'Margen', valor: k.ingresoPorPantalla - k.costoPorPantalla },
                    ]}
                    layout="vertical"
                    margin={{ top: 10, right: 70, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: '#78716c' }} />
                    <YAxis type="category" dataKey="concepto" tick={{ fontSize: 12, fill: '#78716c', fontWeight: 600 }} width={70} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={32}>
                      <Cell fill="#f97316" />
                      <Cell fill="#94a3b8" />
                      <Cell fill="#16a34a" />
                      <LabelList dataKey="valor" position="right" formatter={(v) => formatCurrency(v)} style={{ ...LABEL_STYLE, fontSize: 12 }} />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
                <ChartInsight text={narrarProductividad(k)} />
              </CardBody>
            </Card>
          </div>

          {/* ─── Gráfico: momentum mensual de ventas ───────────────────────── */}
          <Card className="border-orange-100">
            <CardHeader className="border-orange-50">
              <CardTitle>Momentum de ventas — variación mensual de ingresos</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">
                Variación porcentual mes a mes de los últimos periodos con actividad; su promedio es el indicador "Momentum de ventas" (
                {k.momentumVentasPct > 0 ? '+' : ''}{k.momentumVentasPct.toFixed(1)}%)
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

          {/* ─── Gráfico: ventas vs costos por año ─────────────────────────── */}
          <Card className="border-orange-100">
            <CardHeader className="border-orange-50">
              <CardTitle>Ingresos vs. Costos por año</CardTitle>
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
                  <Bar yAxisId="left" dataKey="ingresos" name="Ingresos" fill="#f97316" radius={[6, 6, 0, 0]} barSize={36}>
                    <LabelList dataKey="ingresos" position="insideTop" formatter={(v) => `${(v / 1e6).toFixed(1)}M`} style={{ ...LABEL_STYLE, fontSize: 10 }} />
                  </Bar>
                  <Bar yAxisId="left" dataKey="costos" name="Costos" fill="#94a3b8" radius={[6, 6, 0, 0]} barSize={36}>
                    <LabelList dataKey="costos" position="insideTop" formatter={(v) => `${(v / 1e6).toFixed(1)}M`} style={{ ...LABEL_STYLE, fontSize: 10 }} />
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="margenPct" name="Margen %" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4 }}>
                    <LabelList dataKey="margenPct" position="top" formatter={(v) => `${v.toFixed(0)}%`} style={{ ...LABEL_STYLE, fontSize: 11 }} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
              <ChartInsight text={narrarIngresosCostosAnio(bi.porAnio)} />
            </CardBody>
          </Card>

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
                  {/* Resumen: si hay un mes seleccionado se muestra su detalle puntual,
                      de lo contrario el resumen del año completo. */}
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
                    <ComposedChart data={ventasLicenciaPorMes} margin={{ top: 28, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#78716c' }} />
                      <YAxis
                        yAxisId="left" domain={[0, 'auto']} tick={{ fontSize: 11, fill: '#78716c' }}
                        tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : v}
                      />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} />
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
                        <LabelList dataKey="ingresos" position="top" formatter={formatCompactCurrency} style={{ ...LABEL_STYLE, fontSize: 10 }} />
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="numVentas" name="N° de ventas" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }}>
                        <LabelList dataKey="numVentas" position="top" offset={12} formatter={(v) => v > 0 ? v : ''} style={{ ...LABEL_STYLE, fontSize: 11 }} />
                      </Line>
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

          {/* ─── MRR / ARR normalizado ─────────────────────────────────────── */}
          {(() => {
            const k = bi.kpis
            return (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl p-2.5 shadow-md">
                    <Repeat size={22} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-brand-accent">MRR · Ingreso Recurrente Mensual</h2>
                    <p className="text-sm text-gray-500">Ingresos normalizados por duración de plan — corrige la distorsión de planes anuales y semestrales en el momentum</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <BiCard icon={Wallet} variant="solid" label={`MRR · ${k.mrrMesLabel || 'Último mes'}`}
                    value={formatCurrency(k.mrrActual)}
                    sub="ingreso recurrente mensual normalizado por duración de plan"
                    tag={k.mrrActual > 0 ? { tone: 'info', text: 'Base recurrente real' } : null}
                  />
                  <BiCard icon={PiggyBank} variant="light" label="ARR estimado"
                    value={formatCurrency(k.arrActual)}
                    sub="MRR × 12 — proyección anualizada del ingreso recurrente actual"
                    tag={k.arrActual > 0 ? { tone: 'info', text: 'Proyección sostenida' } : null}
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
                  />
                  <BiCard icon={Activity}
                    variant={k.momentumMrrPct >= 0 ? 'solid' : 'outline'}
                    label="Momentum MRR (7 meses)"
                    value={`${k.momentumMrrPct > 0 ? '+' : ''}${k.momentumMrrPct.toFixed(1)}%`}
                    sub="promedio MoM del MRR normalizado — señal de tendencia sin ruido de planes largos"
                    tag={k.momentumMrrPct > 5  ? { tone: 'good', text: 'Acelerando (MRR)' }
                      : k.momentumMrrPct > -5  ? { tone: 'info', text: 'Ritmo MRR estable' }
                      : { tone: 'warn', text: 'MRR desacelerando' }}
                  />
                </div>

                {/* Mix de planes por contribución MRR */}
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
            )
          })()}

          {/* ─── LTV · Valor de Vida del Cliente ──────────────────────────── */}
          {bi.ltv && (() => {
            const ltv = bi.ltv
            const QUINTIL_COLORS = ['#94a3b8', '#60a5fa', '#34d399', '#f97316', '#a855f7']
            return (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl p-2.5 shadow-md">
                    <Gem size={22} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-brand-accent">LTV · Valor de Vida del Cliente</h2>
                    <p className="text-sm text-gray-500">Cuánto ingreso generó cada cliente desde su primera activación — define el techo de lo que vale invertir en retenerlo antes de perderlo</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <BiCard icon={Gem} variant="solid" label="LTV promedio"
                    value={formatCurrency(ltv.ltvPromedio)}
                    sub={`sobre ${ltv.numClientes} clientes con historial de compras`}
                    tag={tagLtv(ltv.ltvPromedio)}
                  />
                  <BiCard icon={Wallet} variant="light" label="ARPU mensual"
                    value={formatCurrency(ltv.arpuMensualLtv)}
                    sub="ingreso promedio por cliente por mes activo"
                    tag={{ tone: 'info', text: 'Tasa de consumo mensual' }}
                  />
                  <BiCard icon={Clock} variant="outline" label="Vida promedio"
                    value={`${ltv.vidaPromedioMeses} meses`}
                    sub="desde primera activación hasta última transacción registrada"
                    tag={ltv.vidaPromedioMeses >= 12
                      ? { tone: 'good', text: 'Clientes de largo aliento' }
                      : ltv.vidaPromedioMeses >= 6
                      ? { tone: 'info', text: 'Vida media razonable' }
                      : { tone: 'warn', text: 'Alta rotación — reforzar retención' }}
                  />
                  <BiCard
                    icon={AlertCircle}
                    variant={ltv.valorEnRiesgo > 0 ? 'outline' : 'light'}
                    label="Valor LTV en riesgo"
                    value={formatCurrency(ltv.valorEnRiesgo)}
                    sub={`LTV histórico de ${ltv.clientesEnRiesgoCount} clientes con pantallas vencidas o próximas`}
                    tag={tagValorEnRiesgo(ltv.valorEnRiesgo, ltv.ltvPromedio)}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="border-teal-100">
                    <CardHeader className="border-teal-50">
                      <CardTitle>Distribución del LTV por quintil</CardTitle>
                      <p className="text-sm text-gray-400 mt-0.5">Clientes agrupados en 5 segmentos según su LTV acumulado — de menor a mayor aporte histórico</p>
                    </CardHeader>
                    <CardBody>
                      <ResponsiveContainer width="100%" height={220}>
                        <ComposedChart data={ltv.distribucion} margin={{ top: 22, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#99f6e4" opacity={0.4} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716c' }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} />
                          <Tooltip
                            formatter={(v, name) => [v, 'Clientes']}
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
                      <p className="text-sm text-gray-400 mt-0.5">La brecha entre P25 y P90 revela la asimetría de la cartera — cuánto "valen" los clientes en distintos segmentos</p>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-4 py-2">
                        {[
                          { label: 'P25 · cuartil bajo',   val: ltv.percentiles.p25, pct: 25,  color: '#94a3b8' },
                          { label: 'P50 · mediana',         val: ltv.percentiles.p50, pct: 50,  color: '#60a5fa' },
                          { label: 'P75 · cuartil alto',   val: ltv.percentiles.p75, pct: 75,  color: '#34d399' },
                          { label: 'P90 · top 10%',        val: ltv.percentiles.p90, pct: 90,  color: '#a855f7' },
                          { label: 'Máximo histórico',     val: ltv.percentiles.max, pct: 100, color: '#f97316' },
                        ].map(({ label, val, pct, color }) => {
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
            )
          })()}

          {/* ─── Desglose por tipo de pago ─────────────────────────────────── */}
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

            {/* ─── Tabla comparativa por año ───────────────────────────────── */}
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
                              {anioEnCurso && r.anio === anioEnCurso && (
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

          {/* ─── Cruce por módulo: Bajas, Clientes y Planificador ──────────── */}
          <div className="flex items-center gap-3 pt-4">
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-2.5 shadow-md">
              <Scale size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-accent">Cruce por módulo · Bajas, Clientes y Planificador</h2>
              <p className="text-sm text-gray-500">Comparativos año a año y composición de cartera, leídos directamente desde Bajas, Clientes y Planificador — no solo desde Pagos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-orange-100">
              <CardHeader className="border-orange-50">
                <CardTitle>Bajas — comparativo año a año</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Cancelaciones registradas por año, según el módulo de Bajas — la otra cara de la moneda del crecimiento de la cartera</p>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={bi.bajasPorAnioDetalle} margin={{ top: 22, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                    <XAxis dataKey="anio" tick={{ fontSize: 12, fill: '#78716c' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} />
                    <Tooltip formatter={(v, name) => [v, name === 'total' ? 'Bajas' : name]} labelFormatter={(v) => `Año ${v}`} />
                    <Bar dataKey="total" name="Bajas" radius={[6, 6, 0, 0]} barSize={36}>
                      {(bi.bajasPorAnioDetalle || []).map((_, i) => <Cell key={i} fill="#f43f5e" />)}
                      <LabelList dataKey="total" position="top" formatter={(v) => v.toLocaleString('es-CO')} style={{ ...LABEL_STYLE, fontSize: 12 }} />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
                <ChartInsight text={narrarBajasPorAnio(bi.bajasPorAnioDetalle)} />
              </CardBody>
            </Card>

            <Card className="border-orange-100">
              <CardHeader className="border-orange-50">
                <CardTitle>Clientes — distribución geográfica</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Países con más clientes registrados, según el módulo de Clientes (tabla de clientes importada)</p>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={bi.paisesClientes} layout="vertical" margin={{ top: 10, right: 40, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} />
                    <YAxis type="category" dataKey="pais" tick={{ fontSize: 11, fill: '#78716c' }} width={90} />
                    <Tooltip formatter={(v, name, p) => [`${v} clientes (${p.payload.pct}%)`, 'Cantidad']} />
                    <Bar dataKey="cantidad" name="Clientes" radius={[0, 6, 6, 0]} barSize={18}>
                      {(bi.paisesClientes || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      <LabelList dataKey="cantidad" position="right" formatter={(v) => v.toLocaleString('es-CO')} style={{ ...LABEL_STYLE, fontSize: 11 }} />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
                <ChartInsight text={narrarGeografia(bi.paisesClientes)} />
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <Card className="border-orange-100 lg:col-span-2">
              <CardHeader className="border-orange-50">
                <CardTitle>Planificador — salud operativa</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Pantallas según su tipo de alerta en el Planificador</p>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={(bi.planificadorAlertas || []).map(a => ({ name: a.alerta, value: a.cantidad }))}
                      dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}
                      label={renderDonutLabel} labelLine={false}
                    >
                      {(bi.planificadorAlertas || []).map((a, i) => (
                        <Cell key={i} fill={a.alerta === 'Sin novedad' ? '#16a34a' : a.alerta === 'VENCIDO' ? '#ef4444' : a.alerta === 'PROXIMO A VENCER' ? '#f97316' : '#a855f7'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${v} pantallas`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {(bi.planificadorAlertas || []).map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: a.alerta === 'Sin novedad' ? '#16a34a' : a.alerta === 'VENCIDO' ? '#ef4444' : a.alerta === 'PROXIMO A VENCER' ? '#f97316' : '#a855f7' }} />
                        {a.alerta}
                      </span>
                      <span className="font-semibold text-brand-accent">{a.cantidad}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card className="border-orange-100 lg:col-span-3">
              <CardHeader className="border-orange-50">
                <CardTitle>Lectura operativa del Planificador</CardTitle>
                <p className="text-sm text-gray-400 mt-0.5">Qué tan saludable está la base instalada de pantallas hoy, y dónde priorizar la gestión</p>
              </CardHeader>
              <CardBody>
                <ChartInsight text={narrarSaludPlanificador(bi.planificadorAlertas, bi.pantallasConDeuda, k.totalPantallas)} />
              </CardBody>
            </Card>
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
