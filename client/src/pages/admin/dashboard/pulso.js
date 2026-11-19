// "Pulso del negocio": indicadores de negocio, económicos y financieros del
// Dashboard. Funciones puras sobre datos que la página ya carga:
//   bi         → GET /dashboard-bi (porMes con ingresos, costos, margen, mrr…)
//   operacion  → GET /dashboard/operacion (pantallas, guía, deuda)
//   retencion  → GET /dashboard-bi/retencion (movimientos, salidas)
// Se prueban en pulso.test.js.

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const clave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const desplazar = (d, meses) => new Date(d.getFullYear(), d.getMonth() + meses, 1)
const r1 = (v) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10)
const pesos = (v) => `$${Math.round(v || 0).toLocaleString('es-CO')}`
const variacion = (actual, ref) => (ref ? r1(((actual - ref) / Math.abs(ref)) * 100) : null)

// Serie mensual de los últimos n meses CERRADOS (rellena con 0 los meses sin ventas)
export function serieCerrada(porMes = [], campo, n = 12, hoy = new Date()) {
  const mapa = new Map(porMes.map(m => [m.key, m]))
  return Array.from({ length: n }, (_, i) => {
    const d = desplazar(hoy, i - n)
    const m = mapa.get(clave(d))
    return { key: clave(d), etiqueta: MESES[d.getMonth()], valor: m ? Number(m[campo]) || 0 : 0 }
  })
}

// Semáforo: bueno / atención / alerta
const tono = (bueno, atencion) => (bueno ? 'bueno' : atencion ? 'atencion' : 'alerta')

export function calcularPulso({ bi, operacion, retencion, stats } = {}, { comparar = 'mes', hoy = new Date() } = {}) {
  if (!bi?.porMes) return null
  const porMes = bi.porMes
  const mapa = new Map(porMes.map(m => [m.key, m]))
  const mesActual = mapa.get(clave(hoy))
  const cerrado = desplazar(hoy, -1)
  const refComparacion = comparar === 'anio' ? desplazar(hoy, -12) : desplazar(hoy, -1)
  const etiquetaRef = comparar === 'anio' ? `${MESES[refComparacion.getMonth()]} ${refComparacion.getFullYear()}` : 'el mes anterior'

  // ── 1. Proyección de cierre del mes (ritmo diario × días del mes)
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
  const dia = hoy.getDate()
  const ingresosMes = mesActual?.ingresos || 0
  const proyeccion = dia > 0 ? Math.round((ingresosMes / dia) * diasMes) : 0
  const refMes = mapa.get(clave(refComparacion))?.ingresos || 0
  const ingresosSerie = serieCerrada(porMes, 'ingresos', 12, hoy)

  // ── 2. MRR del último mes cerrado
  const mrrSerie = serieCerrada(porMes, 'mrr', 12, hoy)
  const mrr = mrrSerie[mrrSerie.length - 1].valor
  const mrrRef = comparar === 'anio' ? (mapa.get(clave(desplazar(cerrado, -12)))?.mrr || 0) : mrrSerie[mrrSerie.length - 2].valor

  // ── 3 y 4. Clientes: crecimiento neto y abandono mensual (retención)
  const mov = (retencion?.movimientos || []).slice(-12)
  const ult3 = mov.slice(-3)
  const neto3 = ult3.reduce((s, m) => s + m.neto, 0)
  const ultimo = mov[mov.length - 1]
  const penultimo = mov[mov.length - 2]
  const churnMes = ultimo && penultimo?.conServicio ? r1((ultimo.seVan / penultimo.conServicio) * 100) : null
  const churnSerie = mov.map((m, i) => ({ key: m.mes, etiqueta: MESES[Number(m.mes.slice(5)) - 1], valor: i > 0 && mov[i - 1].conServicio ? r1((m.seVan / mov[i - 1].conServicio) * 100) : 0 }))

  // ── 5. Margen bruto de los últimos 12 meses cerrados vs los 12 anteriores
  const ing12 = ingresosSerie.reduce((s, m) => s + m.valor, 0)
  const cos12 = serieCerrada(porMes, 'costos', 12, hoy).reduce((s, m) => s + m.valor, 0)
  const ing24 = serieCerrada(porMes, 'ingresos', 24, hoy).slice(0, 12).reduce((s, m) => s + m.valor, 0)
  const cos24 = serieCerrada(porMes, 'costos', 24, hoy).slice(0, 12).reduce((s, m) => s + m.valor, 0)
  const margen12 = ing12 > 0 ? r1(((ing12 - cos12) / ing12) * 100) : null
  const margenAnt = ing24 > 0 ? r1(((ing24 - cos24) / ing24) * 100) : null
  const margenSerie = serieCerrada(porMes, 'ingresos', 12, hoy).map((m, i) => {
    const c = serieCerrada(porMes, 'costos', 12, hoy)[i].valor
    return { ...m, valor: m.valor > 0 ? r1(((m.valor - c) / m.valor) * 100) : 0 }
  })

  // ── 6. Economía por pantalla (mensual)
  const ocupadas = operacion?.pantallas?.ocupadas || 0
  const totalPantallas = operacion?.pantallas?.total || 0
  const ingresoPorPantalla = ocupadas > 0 ? Math.round(ing12 / 12 / ocupadas) : 0
  const costoPorPantalla = totalPantallas > 0 ? Math.round(cos12 / 12 / totalPantallas) : 0
  const contribucion = ingresoPorPantalla - costoPorPantalla

  // ── 7. Ingresos en juego: renovaciones de los próximos 14 días (estimado)
  const guia = operacion?.guia || []
  const clientesGuia = guia.reduce((s, d) => s + d.clientes.length, 0)
  const pantallasGuia = guia.reduce((s, d) => s + d.pantallas, 0)
  const ticket = bi.kpis?.ticketPromedio || 0
  const enJuego = pantallasGuia * ticket

  // ── 8. Cartera: por cobrar frente a la venta diaria promedio
  const deuda = stats?.montoDeudaTotal || 0
  const ventaDiaria = ing12 / 365
  const diasCartera = ventaDiaria > 0 ? r1(deuda / ventaDiaria) : null

  // ── 9. Dependencia de los clientes Top (concentración)
  const top = bi.ltv?.segmentos?.concentracion?.pctIngresoTop ?? bi.kpis?.concentracionTop20Pct ?? null

  // ── 10. Regla del 40: crecimiento de ingresos (12 m) + margen
  const crecimiento12 = variacion(ing12, ing24)
  const regla40 = crecimiento12 != null && margen12 != null ? r1(crecimiento12 + margen12) : null

  const tarjetas = [
    {
      id: 'proyeccion', grupo: 'negocio', titulo: 'Cierre proyectado del mes',
      valor: proyeccion, formato: 'dinero',
      delta: variacion(proyeccion, refMes), deltaTexto: `vs ${etiquetaRef}`,
      detalle: `Van ${dia} de ${diasMes} días con ${pesos(ingresosMes)} vendidos`,
      tono: refMes > 0 ? tono(proyeccion >= refMes, proyeccion >= refMes * 0.9) : 'neutro',
      serie: ingresosSerie, serieFormato: 'dinero',
      explicacion: {
        queEs: 'Lo que se venderá este mes si el ritmo diario de ventas se mantiene hasta el último día.',
        comoSeCalcula: `Ventas del mes en curso ÷ días transcurridos × días del mes. Se compara con ${etiquetaRef}. Es una estimación: las renovaciones no llegan parejas todos los días.`,
        origen: 'Ventas de licencias (Pagos).',
      },
    },
    {
      id: 'mrr', grupo: 'negocio', titulo: 'Ingreso recurrente mensual (MRR)',
      valor: mrr, formato: 'dinero',
      delta: variacion(mrr, mrrRef), deltaTexto: comparar === 'anio' ? 'vs mismo mes del año anterior' : 'vs mes anterior',
      detalle: `Último mes cerrado · ${pesos(mrr * 12)} al año (ARR)`,
      tono: mrrRef > 0 ? tono(mrr >= mrrRef, mrr >= mrrRef * 0.95) : (mrr > 0 ? 'neutro' : 'alerta'),
      serie: mrrSerie, serieFormato: 'dinero',
      explicacion: {
        queEs: 'El ingreso que el negocio recibe cada mes por suscripciones, repartiendo los planes largos en sus meses (un anual de $480.000 suma $40.000 por mes).',
        comoSeCalcula: 'Cada venta se divide entre los meses de su plan y se suma al mes en que se vendió. Se mide el último mes cerrado para no comparar un mes a medias.',
        origen: 'Ventas de licencias por tipo de plan (Pagos).',
      },
    },
    {
      id: 'neto', grupo: 'negocio', titulo: 'Crecimiento neto de clientes',
      valor: neto3, formato: 'entero', signo: true,
      delta: null, deltaTexto: '',
      detalle: ult3.length ? `Últimos 3 meses: llegaron ${ult3.reduce((s, m) => s + m.llegan, 0)} y se fueron ${ult3.reduce((s, m) => s + m.seVan, 0)}` : 'Sin datos de clientes',
      tono: tono(neto3 > 0, neto3 === 0),
      serie: mov.map(m => ({ key: m.mes, etiqueta: MESES[Number(m.mes.slice(5)) - 1], valor: m.neto })), serieFormato: 'entero', serieTipo: 'barras',
      explicacion: {
        queEs: 'Si la base de clientes está creciendo o encogiendo: clientes nuevos menos los que dejaron de renovar.',
        comoSeCalcula: 'Suma de los últimos 3 meses cerrados: clientes con su primera activación − clientes cuyo último plan terminó sin renovar.',
        origen: 'Análisis de Retención (ventas de licencias).',
        action: { label: 'Ver Análisis de Retención', ruta: '/admin/retencion' },
      },
    },
    {
      id: 'churn', grupo: 'negocio', titulo: 'Abandono del último mes',
      valor: churnMes, formato: 'pct',
      delta: null, deltaTexto: '',
      detalle: ultimo ? `${ultimo.seVan} de ${penultimo?.conServicio ?? 0} clientes no renovaron · meta: menos de 5%` : 'Sin datos',
      tono: churnMes == null ? 'neutro' : tono(churnMes < 5, churnMes < 8),
      serie: churnSerie, serieFormato: 'pct', invertido: true,
      explicacion: {
        queEs: 'Qué parte de los clientes con servicio dejó de renovar en el último mes cerrado (churn).',
        comoSeCalcula: 'Clientes que se fueron en el mes ÷ clientes con servicio al cierre del mes anterior. En suscripciones, menos de 5% mensual es sano.',
        origen: 'Análisis de Retención.',
        action: { label: 'Ver Análisis de Retención', ruta: '/admin/retencion' },
      },
    },
    {
      id: 'margen', grupo: 'economico', titulo: 'Margen bruto (12 meses)',
      valor: margen12, formato: 'pct',
      delta: margen12 != null && margenAnt != null ? r1(margen12 - margenAnt) : null, deltaTexto: 'pts vs 12 meses anteriores', deltaPuntos: true,
      detalle: `De cada $100 vendidos quedan $${margen12 != null ? Math.round(margen12) : '—'} después del costo de las pantallas`,
      tono: margen12 == null ? 'neutro' : tono(margen12 >= 60, margen12 >= 40),
      serie: margenSerie, serieFormato: 'pct',
      explicacion: {
        queEs: 'Qué parte de cada venta queda después de pagar el costo de las cuentas/pantallas.',
        comoSeCalcula: '(Ingresos − costos de pantalla) ÷ ingresos, sumando los últimos 12 meses cerrados. La flecha compara con los 12 meses anteriores, en puntos porcentuales.',
        origen: 'Ventas de licencias (Pagos) y Costo Pantalla.',
        action: { label: 'Ver Análisis Financiero', ruta: '/admin/analisis-financiero' },
      },
    },
    {
      id: 'pantalla', grupo: 'economico', titulo: 'Ganancia por pantalla al mes',
      valor: contribucion, formato: 'dinero',
      delta: null, deltaTexto: '',
      detalle: `Ingresa ${pesos(ingresoPorPantalla)} y cuesta ${pesos(costoPorPantalla)} por pantalla`,
      tono: tono(contribucion > 0 && costoPorPantalla < ingresoPorPantalla * 0.5, contribucion > 0),
      barra: ingresoPorPantalla > 0 ? { parte: costoPorPantalla, total: ingresoPorPantalla, etiquetaParte: 'costo', etiquetaResto: 'ganancia' } : null,
      explicacion: {
        queEs: 'Cuánto deja cada pantalla ocupada al mes después de su costo: la economía unitaria del negocio.',
        comoSeCalcula: 'Ingreso mensual promedio (últimos 12 meses) ÷ pantallas ocupadas, menos el costo mensual promedio ÷ pantallas configuradas.',
        origen: 'Ventas de licencias, Costo Pantalla y Planificador.',
      },
    },
    {
      id: 'regla40', grupo: 'economico', titulo: 'Regla del 40',
      valor: regla40, formato: 'numero',
      delta: null, deltaTexto: '',
      detalle: crecimiento12 != null ? `Crecimiento ${crecimiento12 > 0 ? '+' : ''}${crecimiento12}% + margen ${margen12}% · meta: 40 o más` : 'Faltan 24 meses de datos',
      tono: regla40 == null ? 'neutro' : tono(regla40 >= 40, regla40 >= 25),
      explicacion: {
        queEs: 'Una medida de salud de los negocios de suscripción: un negocio sano suma 40 o más entre lo que crece y el margen que deja.',
        comoSeCalcula: 'Crecimiento de ingresos de los últimos 12 meses frente a los 12 anteriores (%) + margen bruto de los últimos 12 meses (%).',
        origen: 'Ventas de licencias y Costo Pantalla.',
      },
    },
    {
      id: 'enJuego', grupo: 'financiero', titulo: 'Renovaciones en juego (14 días)',
      valor: enJuego, formato: 'dinero',
      delta: null, deltaTexto: '',
      detalle: `${clientesGuia} ${clientesGuia === 1 ? 'cliente' : 'clientes'} · ${pantallasGuia} pantallas por renovar (estimado con el ticket promedio)`,
      tono: 'neutro',
      explicacion: {
        queEs: 'El dinero que entraría si renuevan todos los clientes cuyo plan termina en los próximos 14 días.',
        comoSeCalcula: 'Pantallas que vencen en los próximos 14 días × ticket promedio de venta. Es una estimación: cada plan tiene su precio.',
        origen: 'Guía de renovaciones (Planificador) y ventas de licencias.',
        action: { label: 'Ver Planificador', ruta: '/admin/planificador' },
      },
    },
    {
      id: 'cartera', grupo: 'financiero', titulo: 'Cartera por cobrar',
      valor: diasCartera, formato: 'dias',
      delta: null, deltaTexto: '',
      detalle: `${pesos(deuda)} pendientes · equivale a esos días de venta`,
      tono: diasCartera == null ? 'neutro' : tono(diasCartera <= 3, diasCartera <= 7),
      explicacion: {
        queEs: 'Cuántos días de ventas están pendientes de cobro. Mientras más bajo, menos dinero del negocio está en manos de los clientes.',
        comoSeCalcula: 'Saldo marcado como "debe" en el Planificador (COP) ÷ venta diaria promedio de los últimos 12 meses.',
        origen: 'Planificador y ventas de licencias.',
        action: { label: 'Ver Planificador', ruta: '/admin/planificador' },
      },
    },
    {
      id: 'concentracion', grupo: 'financiero', titulo: 'Dependencia de clientes Top',
      valor: top, formato: 'pct',
      delta: null, deltaTexto: '',
      detalle: 'Del ingreso histórico viene del 20% de clientes que más ha pagado',
      tono: top == null ? 'neutro' : tono(top < 50, top < 65),
      explicacion: {
        queEs: 'Qué tan concentrado está el ingreso en pocos clientes. Si es muy alto, perder a uno de ellos pesa mucho.',
        comoSeCalcula: 'Ingreso histórico del 20% de clientes con mayor LTV ÷ ingreso total. Por debajo de 50% el riesgo es bajo.',
        origen: 'Análisis Financiero → Distribución del LTV.',
        action: { label: 'Ver Análisis Financiero', ruta: '/admin/analisis-financiero' },
      },
    },
  ]
  return { tarjetas, comparar }
}

export const GRUPOS = [
  { id: 'negocio', nombre: 'Negocio' },
  { id: 'economico', nombre: 'Económico' },
  { id: 'financiero', nombre: 'Financiero' },
]
