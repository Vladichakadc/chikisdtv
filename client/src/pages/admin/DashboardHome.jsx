import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Tv, DollarSign, AlertCircle, Clock, TrendingUp,
  Wallet, PiggyBank, Percent, BarChart3, Lightbulb, Activity,
  Trophy, Hourglass, RefreshCw, Calendar, Receipt, Download, Upload, ShieldAlert,
  Filter, GitCompareArrows, Minus,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Area, PieChart, Pie, Cell, LabelList, ReferenceLine,
} from 'recharts'
import api from '../../config/api'
import { useUi } from '../../context/UiContext'
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { formatCurrency } from '../../utils/excelUtils'
import { cn } from '../../utils/cn'
import { diasLabel } from './planificador/rowHelpers'
import { AlAire, BotonAire, DASH_TIPOS } from './dashboard/AlAire'
import { GuiaRenovaciones } from './dashboard/GuiaRenovaciones'
import { IndicadoresClave } from './dashboard/IndicadoresClave'
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
  .dash-chart-controls { display: flex; flex-wrap: wrap; gap: 4px; background: #f1f5f9; border-radius: 10px; padding: 3px; }
  .dash-chart-btn {
    padding: 5px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 700;
    cursor: pointer; transition: all .18s; border: none; background: transparent; color: #64748b;
    white-space: nowrap; display: inline-flex; align-items: center; gap: 5px;
  }
  .dash-chart-btn.active { background: #fff; color: #c2410c; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .dash-chart-btn.active.blue { color: #1d4ed8; }
  .dash-chart-btn:not(.active):hover { color: #334155; }
  .dash-filter-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .dash-filter-tag {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em;
  }
  @media (prefers-reduced-motion: reduce) {
    .dash-a1, .dash-a2, .dash-a3, .dash-orb-1, .dash-orb-2, .dash-card, .dash-kpi { animation: none !important; transition: none !important }
    .dash-kpi::before { display: none !important }
  }
`

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
  // El backend ya marca el año en curso (`parcial`) — se usa esa fuente de verdad
  // en vez de inferirlo por volumen de ventas (heurística frágil: un año flojo
  // real podía confundirse con uno parcial, o viceversa).
  const pareceParcial = !!ultimo.parcial
  return `Leyendo barra por barra, año a año: ${relatos.join('; ')}.${pareceParcial
    ? ` La barra de **${ultimo.anio}** se ve más baja porque el año está en curso${penultimo ? ` (${ultimo.numVentas} ventas registradas frente a ${penultimo.numVentas} del ${penultimo.anio} ya cerrado)` : ''} — no es una contracción real, es un corte parcial; para comparar de forma justa usa el comparativo "año corrido" (YTD) de arriba.`
    : ` La línea morada (margen %) se mantiene en un rango alto y estable, lo que confirma que el crecimiento del negocio no ha sacrificado eficiencia de costos.`}`
}

function narrarTendenciaMensual(porMes) {
  if (!porMes?.length) return null
  // El mes en curso (parcial) queda fuera de picos/valles/promedios: comparado
  // contra meses cerrados siempre "pierde" por incompleto, y arrastraría el
  // promedio de los últimos 3 meses hacia abajo de forma artificial.
  const mesEnCurso = porMes.find(m => m.parcial)
  const conVentas = porMes.filter(m => m.numVentas > 0 && !m.parcial)
  if (conVentas.length < 2) return null
  const pico = conVentas.reduce((a, b) => (b.ingresos > a.ingresos ? b : a))
  const valle = conVentas.reduce((a, b) => (b.ingresos < a.ingresos ? b : a))
  const promedio = conVentas.reduce((s, m) => s + m.ingresos, 0) / conVentas.length
  const ultimos3 = conVentas.slice(-3)
  const promUltimos3 = ultimos3.reduce((s, m) => s + m.ingresos, 0) / ultimos3.length
  const tendencia = promUltimos3 >= promedio ? 'por encima' : 'por debajo'
  const notaEnCurso = mesEnCurso ? ` (**${mesEnCurso.label}** está en curso — no se cuenta hasta que cierre.)` : ''
  return `El mes de mayor ingreso histórico fue **${pico.label}** (${formatCurrency(pico.ingresos)}) y el más bajo **${valle.label}** (${formatCurrency(valle.ingresos)}) — esa diferencia es la huella de la **estacionalidad** (meses de mayor actividad de recargas y renovaciones). El promedio mensual histórico es ${formatCurrency(Math.round(promedio))}; los últimos tres meses cerrados promedian ${formatCurrency(Math.round(promUltimos3))}, **${tendencia}** del promedio histórico — una pista temprana de hacia dónde se dirige la tendencia de corto plazo, antes de que se refleje en el cierre anual.${notaEnCurso}`
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

function narrarVentasLicenciaComparativo(comparativo, anio) {
  if (!comparativo?.length) return null
  // Solo meses CERRADOS cuentan para el marcador: ni el mes en curso (parcial,
  // perdería siempre por incompleto) ni los meses futuros del año en curso
  // (todavía no existen — contarlos como "-100%" sería un falso negativo).
  const idxParcial = comparativo.findIndex(m => m.parcial)
  const cerrados = comparativo.filter((m, i) =>
    (idxParcial === -1 || i < idxParcial) && (m.ingresos > 0 || m.ingresosAnterior > 0))
  if (!cerrados.length) return `Sin datos suficientes para comparar ${anio} contra ${anio - 1} todavía.`
  const mesesArriba = cerrados.filter(m => m.ingresos > m.ingresosAnterior).length
  const totalActual = cerrados.reduce((s, m) => s + m.ingresos, 0)
  const totalAnterior = cerrados.reduce((s, m) => s + m.ingresosAnterior, 0)
  const varPct = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior) * 100 : null
  const mesParcial = comparativo.find(m => m.parcial)
  const brechaMax = cerrados.reduce((peor, m) => {
    const delta = m.ingresosAnterior > 0 ? ((m.ingresos - m.ingresosAnterior) / m.ingresosAnterior) * 100 : null
    return (delta != null && (peor == null || delta < peor.delta)) ? { label: m.label, delta } : peor
  }, null)
  const partes = []
  partes.push(`En **${mesesArriba} de ${cerrados.length} meses cerrados**, ${anio} vendió más que el mismo mes de **${anio - 1}**.`)
  if (varPct != null) {
    partes.push(` En conjunto, esos meses suman ${formatCurrency(totalActual)} vs. ${formatCurrency(totalAnterior)} (**${varPct >= 0 ? '+' : ''}${varPct.toFixed(1)}%**).`)
  }
  if (brechaMax && brechaMax.delta < -10) {
    partes.push(` El mes más débil frente al año anterior fue **${brechaMax.label}** (${brechaMax.delta.toFixed(1)}%) — revisar qué pasó ese mes ayuda a anticipar si se repite.`)
  }
  // La conclusión se basa en la variación agregada en pesos (lo que de verdad
  // mueve la caja), no solo en cuántos meses individuales ganaron o perdieron.
  partes.push(varPct == null
    ? ' **Conclusión**: aún no hay suficiente historial del año anterior para sacar una conclusión — vigila esta gráfica mes a mes.'
    : varPct >= 0
      ? ` **Conclusión**: el negocio va, en conjunto, mejor que el año pasado (${varPct >= 0 ? '+' : ''}${varPct.toFixed(1)}%) — es el momento de sostener lo que está funcionando.`
      : ` **Conclusión**: el negocio va por detrás del año pasado (${varPct.toFixed(1)}%) — vale la pena activar acciones comerciales antes de que se acumule más rezago.`)
  if (mesParcial) {
    partes.push(` (**${mesParcial.label}** está en curso — no se cuenta en el marcador hasta que cierre.)`)
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
  const primero = porAnio[0]

  // `aniosCompletos` = años CERRADOS (excluye el año en curso vía el flag real
  // del backend, no por posición) — `penultimo`, pese al nombre, pasa a ser
  // "el último año YA CERRADO", que es lo que consumen las narrativas de abajo
  // ("Crecimiento del último año cerrado", tijera de costos, etc.).
  const aniosCompletos = porAnio.filter(a => !a.parcial)
  const penultimo = aniosCompletos[aniosCompletos.length - 1] || null
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
    text: `La tasa de cancelación de suscripciones es de ${kpis.churnPct.toFixed(1)}% sobre el universo histórico activo+cancelado, y se registraron ${ultimo.numBajas} bajas en ${ultimo.anio}${ultimo.parcial ? ' (año en curso, cifra parcial)' : ''} (${penultimo ? `frente a ${penultimo.numBajas} en ${penultimo.anio} ya cerrado` : ''}). ${kpis.churnPct > 30
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
  // Indicadores operativos (vencidas, por vencer, deuda, capacidad, equipos):
  // GET /dashboard/operacion — reemplaza la descarga del Planificador completo
  const [operacion, setOperacion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [downloadingBackup, setDownloadingBackup] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState(false)
  const [anioVentasLicencia, setAnioVentasLicencia] = useState(null)
  const [mesVentasLicencia, setMesVentasLicencia] = useState(null)
  const [modoVistaVentas, setModoVistaVentas] = useState('mensual') // 'mensual' | 'comparar'
  const [mostrarPromedioVentas, setMostrarPromedioVentas] = useState(false)
  const [showArpuPanel, setShowArpuPanel] = useState(false)
  const [explain, setExplain] = useState(null)

  // `silent`: en las recargas de fondo (auto-refresh cada 60s y al recuperar el
  // foco de la pestaña) no queremos que un token vencido/ausente en ese instante
  // dispare el cierre de sesión — eso cerraba de golpe cualquier modal abierto
  // mientras el usuario estaba en otra pestaña. Ver client/src/config/api.js.
  const load = ({ silent = false } = {}) => Promise.all([
    api.get('/admin/dashboard-stats', { silent }).then((r) => setStats(r.data)),
    api.get('/admin/dashboard-bi', { silent }).then((r) => setBi(r.data)),
    api.get('/admin/dashboard/operacion', { silent }).then((r) => setOperacion(r.data)),
  ])

  useEffect(() => {
    load().catch(() => {}).finally(() => setLoading(false))

    const onFocus = () => load({ silent: true }).catch(() => {})
    window.addEventListener('focus', onFocus)
    const interval = setInterval(() => load({ silent: true }).catch(() => {}), 60000)

    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(interval)
    }
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      // Los datos de cuenta ya se leen directo de Cuentas Padre: no hay nada que
      // copiar, solo recargar las cifras.
      await load()
      showToast('Datos actualizados.', 'success')
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

  const diasAlerta = operacion?.diasAlerta ?? 8

  const valorEnRiesgo = bi?.ltv?.valorEnRiesgo || 0

  // "Hoy al aire": cada segmento abre su lista en el Planificador, donde están
  // las acciones completas (WhatsApp, Renovar, Editar)
  const CATEGORIA_AIRE = { vencido: 'vencido', alerta: 'alerta', deuda: 'debe', libres: 'libre' }
  const abrirEnPlanificador = (clave) => navigate('/admin/planificador', { state: { abrirCategoria: CATEGORIA_AIRE[clave] } })
  const verClienteEnPlanificador = (c) => navigate('/admin/planificador', { state: { buscar: c.nicknames[0] || c.nombre } })

  const crecimientoMargenUltimo = useMemo(() => {
    if (!bi?.porAnio?.length) return null
    // Último año CERRADO vs. el anterior — nunca el año en curso (parcial),
    // que siempre mostraría una caída falsa de margen frente a un año completo.
    const cerrados = bi.porAnio.filter(a => !a.parcial)
    const ultimo = cerrados[cerrados.length - 1]
    const penultimo = cerrados[cerrados.length - 2]
    if (!ultimo || !penultimo || penultimo.margen <= 0) return null
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
    const hoy = new Date()
    const esAnioActual = anioVentasLicencia === hoy.getFullYear()
    const mesHoy = hoy.getMonth() + 1
    return MES_LABELS.map((label, i) => {
      const m = porMesMap[i + 1]
      return {
        mes: i + 1, label, ingresos: m?.ingresos || 0, numVentas: m?.numVentas || 0,
        // Mes en curso: su valor es parcial y no es comparable con un mes cerrado.
        parcial: esAnioActual && (i + 1) === mesHoy,
      }
    })
  }, [bi, anioVentasLicencia])

  // ─── Comparativo mes a mes vs. año anterior (misma escala, para leer si el
  // negocio va mejor o peor que el año pasado, mes por mes) ─────────────────
  const ventasLicenciaComparativo = useMemo(() => {
    if (!bi || anioVentasLicencia == null) return []
    const porMesMapAnt = {}
    for (const m of bi.porMes) {
      if (Number(m.anio) === anioVentasLicencia - 1) porMesMapAnt[Number(m.key.split('-')[1])] = m
    }
    return ventasLicenciaPorMes.map(m => ({
      ...m,
      ingresosAnterior: porMesMapAnt[m.mes]?.ingresos || 0,
    }))
  }, [bi, ventasLicenciaPorMes, anioVentasLicencia])

  const resumenVentasLicencia = useMemo(() => {
    if (!bi || !ventasLicenciaPorMes.length) return null
    // El mes en curso (parcial) queda fuera de "mejor/peor mes" y del promedio
    // mensual: comparado contra meses cerrados siempre "pierde" por incompleto.
    const conDatos = ventasLicenciaPorMes.filter(m => m.numVentas > 0 && !m.parcial)
    const totalIngresos = ventasLicenciaPorMes.reduce((s, m) => s + m.ingresos, 0)
    const totalVentas = ventasLicenciaPorMes.reduce((s, m) => s + m.numVentas, 0)
    const ticketPromedio = totalVentas > 0 ? Math.round(totalIngresos / totalVentas) : 0
    const promedioMensual = conDatos.length > 0
      ? Math.round(conDatos.reduce((s, m) => s + m.ingresos, 0) / conDatos.length) : 0
    const mejorMes = conDatos.length ? conDatos.reduce((a, b) => (b.ingresos > a.ingresos ? b : a)) : null
    const peorMes = conDatos.length ? conDatos.reduce((a, b) => (b.ingresos < a.ingresos ? b : a)) : null

    // Comparativo interanual "mismo período": si el año seleccionado está en
    // curso, tanto el año actual como el anterior se topan en el último mes
    // cerrado — sin esto, "Ene-Ago parcial" quedaría comparado contra los 12
    // meses completos del año anterior (un año entero vs. 7 meses y medio).
    const mesEnCurso = ventasLicenciaPorMes.find(m => m.parcial)
    const limiteMes = mesEnCurso ? mesEnCurso.mes - 1 : 12
    const totalIngresosComparable = ventasLicenciaPorMes.filter(m => m.mes <= limiteMes).reduce((s, m) => s + m.ingresos, 0)
    const totalVentasComparable = ventasLicenciaPorMes.filter(m => m.mes <= limiteMes).reduce((s, m) => s + m.numVentas, 0)

    const anterior = bi.porMes.filter(m => Number(m.anio) === anioVentasLicencia - 1)
    const anteriorComparable = anterior.filter(m => Number(m.key.split('-')[1]) <= limiteMes)
    const totalIngresosAnterior = anteriorComparable.reduce((s, m) => s + m.ingresos, 0)
    const totalVentasAnterior = anteriorComparable.reduce((s, m) => s + m.numVentas, 0)
    const crecimientoIngresosPct = totalIngresosAnterior > 0
      ? Number((((totalIngresosComparable - totalIngresosAnterior) / totalIngresosAnterior) * 100).toFixed(1)) : null
    const crecimientoVentasPct = totalVentasAnterior > 0
      ? Number((((totalVentasComparable - totalVentasAnterior) / totalVentasAnterior) * 100).toFixed(1)) : null

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

      {showArpuPanel && (
        <IngresoPorClientePanel onClose={() => setShowArpuPanel(false)} />
      )}

      <style>{CSS}</style>

      <style>{DASH_TIPOS}</style>

      <AlAire
        operacion={operacion} stats={stats} valorEnRiesgo={valorEnRiesgo} onAbrir={abrirEnPlanificador}
        acciones={<>
          {import.meta.env.DEV && (
            <>
              <input type="file" accept=".sqlite" id="restore-db-input" className="hidden" onChange={handleRestoreLocalBackup} />
              <BotonAire icon={Upload} onClick={() => document.getElementById('restore-db-input').click()} disabled={restoringBackup}>
                {restoringBackup ? 'Cargando…' : 'BD Local'}
              </BotonAire>
            </>
          )}
          <BotonAire icon={Download} onClick={handleDownloadBackup} disabled={downloadingBackup}>
            {downloadingBackup ? 'Descargando…' : 'Respaldo'}
          </BotonAire>
          <BotonAire icon={RefreshCw} primario onClick={handleSync} disabled={syncing} className={syncing ? '[&>svg]:animate-spin' : ''}>
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </BotonAire>
        </>}
      />

      <GuiaRenovaciones guia={operacion?.guia} onCliente={verClienteEnPlanificador} />

      <IndicadoresClave bi={bi} stats={stats} operacion={operacion} onExplicar={setExplain} onIr={navigate} />

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
              sub={`${k.margenPctUltimo?.toFixed(1)}% en ${k.anioActual} (cerrado)`}
              onClick={() => setExplain({
                title: 'Margen bruto', value: `${k.margenPctTotal.toFixed(1)}%`, icon: Percent,
                queEs: 'De cada $100 que entran por ventas, cuántos quedan como ganancia después de pagar las recargas. Es el termómetro de eficiencia del negocio.',
                comoSeCalcula: '**(Ganancia ÷ Ingresos) × 100**. Por ejemplo: si entran $100 y las recargas costaron $30, el margen bruto es 70%.',
                origen: `Derivado de Pagos y Costo Pantalla. El margen del último año cerrado (${k.anioActual}) fue ${k.margenPctUltimo?.toFixed(1)}%; el año en curso todavía no cierra y por eso no se usa para este comparativo.`,
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

          {/* ─── Gráfico anual: ingresos, costos, ganancia y margen (el año en curso, atenuado) ─── */}
          <Card className="border-orange-100">
            <CardHeader className="border-orange-50">
              <CardTitle>Ingresos, costos y ganancia por año</CardTitle>
              <p className="text-sm text-gray-400 mt-0.5">
                Pesos (COP) por año, con el margen bruto en morado.
                {bi.porAnio.some(a => a.parcial) && ` ${bi.porAnio.find(a => a.parcial).anio} va en curso: sus barras se ven más claras porque el año no ha terminado.`}
              </p>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={bi.porAnio} margin={{ top: 28, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="anio" tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => (bi.porAnio.find(a => a.anio === v)?.parcial ? `${v} (en curso)` : v)} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} width={44} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, 100]} width={36} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {[['ingresos', 'Ingresos', '#f97316'], ['costos', 'Costos', '#94a3b8'], ['margen', 'Ganancia', '#16a34a']].map(([key, nombre, color]) => (
                    <Bar key={key} yAxisId="left" dataKey={key} name={nombre} fill={color} radius={[6, 6, 0, 0]} maxBarSize={34}>
                      {bi.porAnio.map(a => <Cell key={a.anio} fillOpacity={a.parcial ? 0.4 : 1} />)}
                      <LabelList dataKey={key} position="top" formatter={(v) => `${(v / 1e6).toFixed(1)}M`} style={{ ...LABEL_STYLE, fontSize: 10, fill: '#475569' }} />
                    </Bar>
                  ))}
                  <Line yAxisId="right" type="linear" dataKey="margenPct" name="Margen %" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4 }}>
                    <LabelList dataKey="margenPct" position="top" offset={10} formatter={(v) => `${v.toFixed(0)}%`} style={{ ...LABEL_STYLE, fontSize: 11, fill: '#7c3aed' }} />
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
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Ventas de licencias — mes a mes</CardTitle>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {modoVistaVentas === 'mensual'
                      ? <>Barras = ingresos por ventas de licencias (eje izq., con etiqueta $) · <span className="text-blue-600 font-semibold">Línea azul = N° de ventas</span> (eje der.)</>
                      : <>Barras = ingresos {anioVentasLicencia} · <span className="text-slate-500 font-semibold">Línea gris punteada = {anioVentasLicencia - 1}</span> — lee de un vistazo si el negocio va mejor o peor que el año pasado</>}
                  </p>
                </div>
                {aniosVentasLicencia.length > 0 && (
                  <div className="flex flex-col items-end gap-2">
                    <div className="dash-filter-row">
                      <span className="dash-filter-tag"><Filter size={11} /> Año</span>
                      <div className="dash-chart-controls">
                        {aniosVentasLicencia.map(a => (
                          <button key={a} type="button"
                            className={`dash-chart-btn ${anioVentasLicencia === a ? 'active' : ''}`}
                            onClick={() => setAnioVentasLicencia(a)}
                          >{a}</button>
                        ))}
                      </div>
                    </div>
                    <div className="dash-chart-controls">
                      <button type="button"
                        className={`dash-chart-btn ${modoVistaVentas === 'mensual' ? 'active' : ''}`}
                        onClick={() => setModoVistaVentas('mensual')}
                      ><BarChart3 size={12} /> Mes a mes</button>
                      <button type="button"
                        className={`dash-chart-btn ${modoVistaVentas === 'comparar' ? 'active' : ''}`}
                        onClick={() => { setModoVistaVentas('comparar'); setMesVentasLicencia(null) }}
                      ><GitCompareArrows size={12} /> Comparar vs. año anterior</button>
                      <button type="button"
                        className={`dash-chart-btn ${mostrarPromedioVentas ? 'active' : ''}`}
                        onClick={() => setMostrarPromedioVentas(v => !v)}
                      ><Minus size={12} /> Promedio</button>
                    </div>
                    {modoVistaVentas === 'mensual' && (
                      <div className="dash-chart-controls">
                        <button type="button"
                          className={`dash-chart-btn ${mesVentasLicencia == null ? 'active' : ''}`}
                          onClick={() => setMesVentasLicencia(null)}
                        >Todo el año</button>
                        {MES_LABELS.map((label, i) => (
                          <button key={i} type="button"
                            className={`dash-chart-btn ${mesVentasLicencia === i + 1 ? 'active' : ''}`}
                            onClick={() => setMesVentasLicencia(i + 1)}
                          >{label}</button>
                        ))}
                      </div>
                    )}
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
                    <ComposedChart
                      data={modoVistaVentas === 'comparar' ? ventasLicenciaComparativo : ventasLicenciaPorMes}
                      margin={{ top: 54, right: 32, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.4} />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#78716c' }} />
                      <YAxis
                        yAxisId="left" domain={[0, (dataMax) => Math.ceil(dataMax * 1.45)]} tick={{ fontSize: 11, fill: '#78716c' }}
                        tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : v}
                      />
                      {modoVistaVentas === 'mensual' && (
                        <YAxis yAxisId="right" orientation="right" domain={[0, (dataMax) => Math.ceil(dataMax * 1.75)]} allowDecimals={false} tick={{ fontSize: 11, fill: '#78716c' }} />
                      )}
                      <Tooltip
                        formatter={(value, name) => name === 'N° de ventas'
                          ? [`${value} venta${value === 1 ? '' : 's'}`, name]
                          : [formatCurrency(value), name]}
                        labelFormatter={(label) => `${label} ${anioVentasLicencia}`}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        yAxisId="left" dataKey="ingresos"
                        name={modoVistaVentas === 'comparar' ? `Ingresos ${anioVentasLicencia}` : 'Ingresos'}
                        fill="#f97316" radius={[6, 6, 0, 0]} barSize={26}
                      >
                        {(modoVistaVentas === 'comparar' ? ventasLicenciaComparativo : ventasLicenciaPorMes).map((m) => (
                          <Cell
                            key={m.mes}
                            fill={mesVentasLicencia === m.mes ? '#c2410c' : '#f97316'}
                            fillOpacity={m.parcial ? 0.35 : 1}
                            stroke={m.parcial ? '#f97316' : 'none'}
                            strokeDasharray={m.parcial ? '3 2' : undefined}
                          />
                        ))}
                        {/* Etiqueta dentro de la barra (barras altas ≥ $800 K) — texto oscuro con halo
                            blanco: legible tanto sobre el naranja como si se desborda al fondo blanco */}
                        <LabelList dataKey="ingresos" position="insideTop" formatter={(v) => v >= 800_000 ? formatCompactCurrency(v) : ''} style={{ ...LABEL_STYLE, fontSize: 10 }} />
                        {/* Etiqueta sobre la barra (barras pequeñas < $800 K) */}
                        <LabelList dataKey="ingresos" position="top" formatter={(v) => v > 0 && v < 800_000 ? formatCompactCurrency(v) : ''} style={{ ...LABEL_STYLE, fill: '#9a3412', fontSize: 10 }} />
                      </Bar>
                      {modoVistaVentas === 'mensual' ? (
                        <Line
                          yAxisId="right" type="monotone" dataKey="numVentas" name="N° de ventas"
                          stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }}
                          isAnimationActive={false}
                          label={({ x, y, value }) => value > 0
                            ? <text key={`lv-${x}`} x={x} y={y - 16} textAnchor="middle" fill="#1d4ed8" fontSize={11} fontWeight={700} stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" paintOrder="stroke">{value}</text>
                            : null}
                        />
                      ) : (
                        <Line
                          yAxisId="left" type="monotone" dataKey="ingresosAnterior" name={`Ingresos ${anioVentasLicencia - 1}`}
                          stroke="#64748b" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: '#64748b' }}
                          isAnimationActive={false}
                        />
                      )}
                      {mostrarPromedioVentas && resumenVentasLicencia.promedioMensual > 0 && (
                        <ReferenceLine
                          yAxisId="left" y={resumenVentasLicencia.promedioMensual} stroke="#059669" strokeDasharray="4 3" strokeWidth={1.5}
                          label={{ value: `Promedio ${formatCompactCurrency(resumenVentasLicencia.promedioMensual)}`, position: 'insideBottomLeft', fill: '#059669', fontSize: 10, fontWeight: 700 }}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                  <ChartInsight text={modoVistaVentas === 'comparar'
                    ? narrarVentasLicenciaComparativo(ventasLicenciaComparativo, anioVentasLicencia)
                    : resumenVentasLicencia.mesDetalle
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
                      // El año en curso (parcial) nunca puede ganar "Mejor año histórico"
                      // — compite en desventaja estructural contra años completos.
                      const mejorAnio = bi.porAnio
                        .filter(r => !r.parcial)
                        .reduce((best, r) => (!best || r.ingresos > best.ingresos ? r : best), null)
                      const anioEnCurso = bi.porAnio.find(r => r.parcial)?.anio
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
                        {(bi.clientesEnRiesgoResumen?.vencidos ?? 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                            {bi.clientesEnRiesgoResumen.vencidos} vencidos
                          </span>
                        )}
                        {(bi.clientesEnRiesgoResumen?.porVencer ?? 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                            {bi.clientesEnRiesgoResumen.porVencer} por vencer
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Clientes con pantallas vencidas o a ≤ {diasAlerta} días de vencer
                      {bi.clientesEnRiesgoResumen?.total > bi.clientesEnRiesgo.length ? ` — se muestran los ${bi.clientesEnRiesgo.length} de mayor LTV histórico` : ' — ordenados por LTV histórico'}
                    </p>
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
