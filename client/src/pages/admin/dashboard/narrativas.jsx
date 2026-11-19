// Lecturas en lenguaje natural de los gráficos del Dashboard y el bloque
// "Análisis económico-financiero". Separado de DashboardHome para que la
// página quede en la composición y este módulo, en la lógica de las narrativas.
import { formatCurrency } from '../../../utils/excelUtils'
import { MES_LABELS } from './biShared'

// ─── Narrativas de las gráficas que permanecen en el Dashboard ───────────────

export function narrarIngresosCostosAnio(porAnio) {
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

export function narrarTendenciaMensual(porMes) {
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

export function narrarVentasLicenciaAnio(resumen, anio) {
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

export function narrarVentasLicenciaMes(resumen, mes, anio) {
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

export function narrarVentasLicenciaComparativo(comparativo, anio) {
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

export function narrarComposicion(tipoPago) {
  if (!tipoPago?.length) return null
  const principal = tipoPago[0]
  const segundo = tipoPago[1]
  return `**${principal.tipo}** domina la composición del ingreso con ${principal.pctTotal.toFixed(1)}% (${formatCurrency(principal.total)} en ${principal.cantidad} transacciones)${segundo ? `, seguido de **${segundo.tipo}** con ${segundo.pctTotal.toFixed(1)}%` : ''}. ${principal.tipo === 'Renovacion'
    ? 'Que las renovaciones encabecen la lista confirma que el ingreso es, en su mayoría, **recurrente y predecible** — la prioridad financiera es proteger esa base (retención) antes que invertir agresivamente en captar clientes nuevos.'
    : 'Conviene vigilar si esta composición se mantiene estable en el tiempo: un peso alto de activaciones nuevas frente a renovaciones puede señalar dependencia de la adquisición constante de clientes, con su correspondiente costo.'}`
}

// ─── Análisis económico-financiero (narrativa generada desde los datos) ──────

export function FinancialAnalysis({ bi }) {
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

