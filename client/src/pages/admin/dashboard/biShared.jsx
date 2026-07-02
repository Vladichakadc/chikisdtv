// Piezas compartidas de las vistas BI (DashboardHome, AnalisisFinancieroPage,
// BajasPage, ClientsPage): tarjetas KPI, tooltips, etiquetas de valor, tags
// inteligentes y narrativas generadas desde los datos.
import { TrendingUp, TrendingDown, Minus, Sparkles, Lightbulb } from 'lucide-react'
import { formatCurrency } from '../../../utils/excelUtils'
import { cn } from '../../../utils/cn'

export const PIE_COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ef4444']
export const MES_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Formato compacto para etiquetas de valor sobre las barras (ej. $1.2M, $850K)
export function formatCompactCurrency(value) {
  if (!value) return ''
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1000)}K`
  return formatCurrency(value)
}

// Tinta neutra + halo blanco: etiqueta legible sobre cualquier fondo
export const LABEL_STYLE = {
  fontWeight: 700,
  fill: '#1e293b',
  stroke: '#fff',
  strokeWidth: 3,
  strokeLinejoin: 'round',
  paintOrder: 'stroke',
}

const RADIAN = Math.PI / 180
export function renderDonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
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

// Etiqueta de variación % fuera de la barra (arriba si positiva, abajo si negativa)
export function MomentumValueLabel({ x, y, width, height, value }) {
  if (value == null) return null
  const positivo = value >= 0
  const labelY = positivo ? y - 6 : y + height + 14
  return (
    <text x={x + width / 2} y={labelY} textAnchor="middle" fontSize={11} {...LABEL_STYLE}>
      {`${positivo ? '+' : ''}${value.toFixed(1)}%`}
    </text>
  )
}

export function GrowthBadge({ pct }) {
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

export function SmartTag({ tone = 'info', icon: Icon = Sparkles, children }) {
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

// Tarjeta KPI estilo BI. `onClick` la vuelve interactiva (abre el modal
// explicativo del cálculo, o el panel de detalle que decida el padre).
export function BiCard({ icon: Icon, label, value, growth, growthLabel, sub, variant = 'light', tag, onClick, clickHint = '¿Cómo se calcula?' }) {
  const styles = {
    solid:   'bg-gradient-to-br from-orange-500 to-orange-600 text-white',
    light:   'bg-white border-2 border-orange-200 text-orange-700',
    outline: 'bg-orange-50 border border-orange-300 text-orange-800',
  }
  const iconBg = { solid: 'bg-white/20', light: 'bg-orange-100', outline: 'bg-orange-200/60' }
  const interactive = typeof onClick === 'function'
  return (
    <div
      className={cn(
        styles[variant], 'rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5',
        interactive && 'cursor-pointer'
      )}
      {...(interactive ? {
        role: 'button',
        tabIndex: 0,
        onClick,
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } },
      } : {})}
    >
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
          {interactive && (
            <p className={`text-xs font-semibold mt-2 ${variant === 'solid' ? 'text-white/90' : 'text-brand-primary'}`}>
              {clickHint}
            </p>
          )}
        </div>
        <div className={`${iconBg[variant]} rounded-lg p-3`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

export function ChartTooltip({ active, payload, label }) {
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

// Recuadro de lectura al pie de cada gráfica (storytelling desde los datos)
export function ChartInsight({ text }) {
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

// ─── Tags inteligentes de los KPIs de rentabilidad ───────────────────────────

export function tagMarkup(k) {
  if (k.markupPct >= 150) return { tone: 'good', text: 'Retorno sobre costo alto' }
  if (k.markupPct >= 80) return { tone: 'info', text: 'Retorno sobre costo saludable' }
  return { tone: 'warn', text: 'Margen ajustado sobre el costo' }
}

export function tagCobertura(k) {
  if (k.coberturaCostos >= 2.5) return { tone: 'good', text: 'Colchón financiero amplio' }
  if (k.coberturaCostos >= 1.5) return { tone: 'info', text: 'Colchón financiero adecuado' }
  return { tone: 'bad', text: 'Colchón financiero ajustado' }
}

export function tagPuntoEquilibrio(k, porAnio) {
  const cerrados = (porAnio || []).filter(a => a.crecimientoIngresosPct != null)
  const ref = cerrados[cerrados.length - 1]
  if (!ref || !k.puntoEquilibrioVentas) return { tone: 'info', text: 'Umbral mínimo de ventas para no perder' }
  const ratio = ref.numVentas / k.puntoEquilibrioVentas
  if (ratio >= 1.5) return { tone: 'good', text: `${ref.anio} operó ${ratio.toFixed(1)}× sobre el umbral` }
  if (ratio >= 1) return { tone: 'info', text: `${ref.anio} superó el umbral` }
  return { tone: 'bad', text: `${ref.anio} no alcanzó el umbral` }
}

export function tagConcentracion(k) {
  if (k.concentracionTop20Pct >= 60) return { tone: 'bad', text: 'Alta dependencia de pocos clientes' }
  if (k.concentracionTop20Pct >= 45) return { tone: 'warn', text: 'Concentración moderada — vigilar' }
  return { tone: 'good', text: 'Cartera diversificada' }
}

export function tagArpu(k) {
  const ratio = k.ticketPromedio > 0 ? k.arpu / k.ticketPromedio : 0
  return { tone: 'info', text: `≈ ${ratio.toFixed(1)} compras por cliente en su histórico` }
}

export function tagPantalla(k) {
  const margenPct = k.ingresoPorPantalla > 0 ? ((k.ingresoPorPantalla - k.costoPorPantalla) / k.ingresoPorPantalla) * 100 : 0
  if (margenPct >= 60) return { tone: 'good', text: `Unidad muy rentable (${margenPct.toFixed(0)}% margen)` }
  if (margenPct >= 40) return { tone: 'info', text: `Margen saludable (${margenPct.toFixed(0)}%)` }
  return { tone: 'warn', text: `Margen ajustado (${margenPct.toFixed(0)}%)` }
}

export function tagLtv(ltvPromedio) {
  if (ltvPromedio >= 200000) return { tone: 'good', text: 'LTV alto' }
  if (ltvPromedio >= 80000)  return { tone: 'info', text: 'LTV moderado' }
  return { tone: 'warn', text: 'LTV bajo — priorizar retención' }
}

export function tagValorEnRiesgo(valorEnRiesgo, ltvPromedio) {
  if (!ltvPromedio || !valorEnRiesgo) return { tone: 'info', text: 'Sin clientes en riesgo hoy' }
  const n = Math.round(valorEnRiesgo / ltvPromedio)
  if (n > 15) return { tone: 'bad',  text: `Equivale a ${n} LTV promedios en juego` }
  if (n > 5)  return { tone: 'warn', text: `Equivale a ${n} LTV promedios en juego` }
  return { tone: 'info', text: `Equivale a ${n} LTV promedios en juego` }
}

// ─── Narrativas de las gráficas movidas fuera del Dashboard ─────────────────

export function narrarPareto(paretoIngresos, kpis) {
  if (!paretoIngresos?.length) return null
  const p20 = paretoIngresos.find(p => p.pctClientes === 20)
  const p50 = paretoIngresos.find(p => p.pctClientes === 50)
  if (!p20 || !p50) return null
  const brecha20 = (p20.pctIngresos - 20).toFixed(1)
  return `Si la cartera estuviera repartida en partes iguales, el 20% de los clientes generaría el 20% del ingreso — esa es la diagonal punteada (distribución equitativa). En la realidad ese 20% genera **${p20.pctIngresos.toFixed(1)}%** del ingreso, **+${brecha20} puntos por encima de la equidad**, y solo la mitad de la cartera ya concentra ${p50.pctIngresos.toFixed(1)}%. ${kpis.concentracionTop20Pct > 50
    ? 'Cuanto más se "infla" la curva naranja sobre la diagonal, mayor es la dependencia de unos pocos clientes — y mayor el golpe en caja si alguno de ellos cancela. Vale la pena identificar a esos clientes "ancla" y diseñarles un plan de fidelización dedicado.'
    : 'La curva no se aleja demasiado de la diagonal: el ingreso está razonablemente repartido entre la base de clientes, lo que reduce el riesgo de que la salida de unos pocos golpee la caja de forma material.'}`
}

export function narrarProductividad(kpis) {
  const margenPantalla = kpis.ingresoPorPantalla - kpis.costoPorPantalla
  const margenPct = kpis.ingresoPorPantalla > 0 ? (margenPantalla / kpis.ingresoPorPantalla) * 100 : 0
  return `Cada una de las ${kpis.totalPantallas} pantallas activas produce, en promedio, ${formatCurrency(kpis.ingresoPorPantalla)} de ingreso y consume ${formatCurrency(kpis.costoPorPantalla)} de costo — dejando **${formatCurrency(margenPantalla)} de margen por pantalla** (${margenPct.toFixed(1)}% de su ingreso). Esta es la "unidad económica" más pequeña del negocio: si el costo por pantalla sube — por ejemplo, por variaciones en la TRM o en el precio de las credenciales — esta barra gris sería la primera en moverse, y el primer lugar donde se vería la presión sobre la rentabilidad.`
}

export function narrarMomentum(serie, kpis) {
  if (!serie?.length) return null
  const positivos = serie.filter(m => m.variacionPct >= 0).length
  const negativos = serie.length - positivos
  const ultimo = serie[serie.length - 1]
  return `De los últimos ${serie.length} meses con actividad, ${positivos} cerraron en **crecimiento** frente al mes anterior y ${negativos} en **caída**. El más reciente (${ultimo.label}) varió ${ultimo.variacionPct >= 0 ? '+' : ''}${ultimo.variacionPct.toFixed(1)}%, y el promedio de esas variaciones — el "momentum" — es de ${kpis.momentumVentasPct >= 0 ? '+' : ''}${kpis.momentumVentasPct.toFixed(1)}% mensual. ${kpis.momentumVentasPct >= 0
    ? 'Un momentum positivo y sostenido sugiere que el ritmo comercial actual debería seguir empujando los ingresos al alza en los próximos cierres mensuales.'
    : 'Un momentum negativo no es alarmante por sí solo si el histórico ya muestra estacionalidad (meses bajos seguidos de recuperación), pero si se sostiene dos o tres meses más, es la señal para activar acciones comerciales de reactivación (campañas de renovación, recuperación de cartera).'}`
}

export function narrarMrr(bi) {
  if (!bi) return null
  const { kpis, mrrPorTipoPlan, porMes } = bi
  if (!kpis?.mrrActual) return null
  const principal = mrrPorTipoPlan?.[0]
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

export function narrarLtv(ltv) {
  if (!ltv?.numClientes) return null
  const { ltvPromedio, vidaPromedioMeses, arpuMensualLtv, valorEnRiesgo, clientesEnRiesgoCount, numClientes, percentiles } = ltv
  return `Analizando **${numClientes} clientes** con al menos una activación registrada, el **LTV promedio es ${formatCurrency(ltvPromedio)}**: el ingreso que un cliente típico generó durante su **vida activa de ${vidaPromedioMeses} meses** al ritmo de **${formatCurrency(arpuMensualLtv)}/mes** (ARPU mensual normalizado). Esto establece el techo de lo que vale invertir en retener a un cliente antes de que el costo de retención supere el beneficio — si una campaña de reactivación, un descuento o una llamada de seguimiento cuesta menos de ${formatCurrency(ltvPromedio)}, siempre conviene retener antes que perder. La distribución no es uniforme: el 25% con menor LTV no supera ${formatCurrency(percentiles.p25)}, mientras que el 25% superior genera más de ${formatCurrency(percentiles.p75)} — la **asimetría premia fuertemente la retención del segmento alto**. ${clientesEnRiesgoCount > 0 ? `Hoy hay **${clientesEnRiesgoCount} clientes con pantallas próximas a vencer o ya vencidas**, con un **LTV histórico acumulado de ${formatCurrency(valorEnRiesgo)}** en juego — atender esas cuentas es la acción de mayor ROI inmediato disponible en este momento.` : 'Actualmente no hay clientes con pantallas en estado crítico de vencimiento — buen momento para acciones proactivas de fidelización.'}`
}

export function narrarBajasPorAnio(serie) {
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

export function narrarGeografia(paises) {
  if (!paises?.length) return null
  const principal = paises[0]
  const internacional = paises.slice(1).reduce((s, p) => s + p.cantidad, 0)
  const totalMuestra = paises.reduce((s, p) => s + p.cantidad, 0)
  const pctInternacional = totalMuestra > 0 ? (internacional / totalMuestra) * 100 : 0
  return `**${principal.pais}** concentra ${principal.pct}% de la cartera con país registrado — el mercado natural y de menor fricción operativa (zona horaria, idioma, medios de pago). El ${pctInternacional.toFixed(1)}% restante está repartido en otros ${paises.length - 1} países de esta muestra (${paises.slice(1, 4).map(p => p.pais).join(', ')}…), lo que confirma que el negocio ya opera como un **proveedor digital sin fronteras** — una base diversificada geográficamente diluye el riesgo de que una sola economía local (devaluación, regulación, competencia local) golpee toda la cartera a la vez, aunque también implica más husos horarios y canales de soporte que atender.`
}
