// Lecturas del Análisis de Pagos (datos de GET /admin/payments/analisis →
// server/services/analisisPagos.js): titular, tarjetas inteligentes y
// recomendaciones en lenguaje natural.

export const COLORES_TIPO = { renovacion: '#059669', activacion: '#f97316', otros: '#94a3b8' }
export const NOMBRE_TIPO = { renovacion: 'Renovaciones', activacion: 'Activaciones', otros: 'Otros' }
const PALETA_MEDIOS = ['#7c3aed', '#0891b2', '#f97316', '#16a34a', '#e11d48', '#2563eb', '#ca8a04', '#db2777', '#64748b']
export const colorMedio = (i, nombre) => (nombre === 'Sin registrar' ? '#cbd5e1' : PALETA_MEDIOS[i % PALETA_MEDIOS.length])

export const fmtPesos = (v) => `$${Math.round(Number(v) || 0).toLocaleString('es-CO')}`
export function fmtPesosCorto(v) {
  const n = Number(v) || 0
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3).toLocaleString('es-CO')} mil`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}
// Cifra compacta sin signo de pesos para celdas y rótulos estrechos: 2,6M · 431k
export function fmtCompacto(v) {
  const n = Number(v) || 0
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`
  if (Math.abs(n) >= 1e3) return `${Math.round(n / 1e3).toLocaleString('es-CO')}k`
  return Math.round(n).toLocaleString('es-CO')
}
export const fmtPct = (v, d = 0) => (v == null ? '—' : `${Number(v).toLocaleString('es-CO', { maximumFractionDigits: d })}%`)
export const fmtVar = (v) => (v == null ? null : `${v > 0 ? '+' : ''}${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`)
export const tonoVar = (v, umbral = 3) => (v == null ? 'neutro' : v > umbral ? 'bien' : v < -umbral ? 'mal' : 'neutro')

export function nombreMes(ym, { corto = false, conAnio = true } = {}) {
  const [y, m] = String(ym).split('-').map(Number)
  const t = new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: corto ? 'short' : 'long', ...(conAnio ? { year: 'numeric' } : {}) })
  return t.replace('.', '').replace(' de ', ' ')
}

export function titular(d) {
  const u = d.resumen.ultimoMes
  const mes = nombreMes(u.mes, { conAnio: false })
  if (!u.ingresos) return { titulo: `En ${mes} no se registraron pagos`, detalle: null, tono: 'mal' }
  const partes = []
  if (u.vsMesPrevio != null) partes.push(`${u.vsMesPrevio >= 0 ? `${fmtPct(Math.abs(u.vsMesPrevio), 1)} más` : `${fmtPct(Math.abs(u.vsMesPrevio), 1)} menos`} que el mes anterior`)
  if (u.vsAnioAnterior != null) partes.push(`${fmtPct(Math.abs(u.vsAnioAnterior), 1)} ${u.vsAnioAnterior >= 0 ? 'más' : 'menos'} que en ${nombreMes(sumarMesesYm(u.mes, -12), { conAnio: true })}`)
  return {
    titulo: `En ${mes} entraron ${fmtPesos(u.ingresos)}`,
    detalle: `${u.ventas} pagos con un ticket promedio de ${fmtPesos(u.ticket)}${partes.length ? ` · ${partes.join(' y ')}` : ''}.`,
    tono: tonoVar(u.vsMesPrevio),
  }
}

export function sumarMesesYm(ym, n) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Tarjetas inteligentes: cifra, comparación y explicación (para el modal)
export function tarjetas(d) {
  const r = d.resumen
  const h = d.distribucion.ultimos12
  const mesCorte = nombreMes(r.ultimoMes.mes, { conAnio: false })
  const mesHoy = nombreMes(r.enCurso.mes, { conAnio: false })
  const medioTop = h.medios.find(m => m.nombre !== 'Sin registrar')
  return [
    {
      clave: 'enCurso', titulo: `Proyección de ${mesHoy}`, valor: fmtPesosCorto(r.enCurso.proyeccion),
      nota: `Van ${fmtPesosCorto(r.enCurso.ingresos)} al día ${r.enCurso.dia} de ${r.enCurso.diasMes}`,
      cambio: r.enCurso.vsMismaAltura, cambioTexto: 'vs. el mes anterior a la misma fecha',
      queEs: `Cuánto entraría en ${mesHoy} si se mantiene el ritmo de pagos de lo que va del mes.`,
      comoSeCalcula: `Lo recaudado hasta hoy (**${fmtPesos(r.enCurso.ingresos)}**) ÷ ${r.enCurso.dia} días × ${r.enCurso.diasMes} días del mes. La comparación es contra lo que había entrado el mes anterior hasta el mismo día (**${fmtPesos(r.enCurso.mismaAlturaMesAnterior)}**).`,
    },
    {
      clave: 'doceMeses', titulo: 'Recaudo de 12 meses', valor: fmtPesosCorto(r.doceMeses.ingresos),
      nota: `Promedio de ${fmtPesosCorto(r.doceMeses.promedioMensual)} al mes`, spark: true,
      cambio: r.doceMeses.vsAnterior, cambioTexto: 'vs. los 12 meses anteriores',
      queEs: 'Todo lo que entró en los últimos 12 meses cerrados.',
      comoSeCalcula: `Suma de los pagos de ${nombreMes(r.doceMeses.desde)} a ${nombreMes(r.doceMeses.hasta)}, sin cortesías ni cambios de plan. Los 12 meses anteriores sumaron **${fmtPesos(r.doceMeses.anterior.ingresos)}**.`,
    },
    {
      clave: 'ticket', titulo: 'Ticket promedio', valor: fmtPesos(r.doceMeses.ticket),
      nota: `${r.doceMeses.ventas.toLocaleString('es-CO')} pagos en 12 meses`,
      cambio: r.doceMeses.ticketVsAnterior, cambioTexto: 'vs. 12 meses anteriores',
      queEs: 'Cuánto deja en promedio cada pago. Sube cuando se venden más planes largos o hay menos descuentos.',
      comoSeCalcula: `Recaudo de 12 meses ÷ número de pagos. Antes era **${fmtPesos(r.doceMeses.anterior.ticket)}**.`,
    },
    {
      clave: 'renovacion', titulo: 'Peso de las renovaciones', valor: fmtPct(r.porTipo.renovacion.pctIngresos),
      nota: `${r.porTipo.renovacion.ventas.toLocaleString('es-CO')} renovaciones · ${fmtPesosCorto(r.porTipo.renovacion.ingresos)}`,
      queEs: 'Qué parte del recaudo viene de clientes que ya estaban y volvieron a pagar. Es el ingreso más estable del negocio.',
      comoSeCalcula: `Ingresos por renovación ÷ recaudo de 12 meses. Las activaciones (pantallas nuevas) aportan **${fmtPct(r.porTipo.activacion.pctIngresos)}**.`,
    },
    {
      clave: 'activaciones', titulo: 'Pantallas nuevas', valor: r.activaciones.actuales.toLocaleString('es-CO'),
      nota: `Ticket de activación ${fmtPesos(r.porTipo.activacion.ticket)}`,
      cambio: r.activaciones.vsAnterior, cambioTexto: `vs. ${r.activaciones.anteriores} en los 12 meses anteriores`,
      queEs: 'Cuántas activaciones de pantalla se cobraron en los últimos 12 meses: el motor de crecimiento.',
      comoSeCalcula: 'Pagos con tipo de pago "Activación" en los 12 meses cerrados.',
    },
    {
      clave: 'clientes', titulo: 'Clientes que pagaron', valor: r.clientes.pagaron.toLocaleString('es-CO'),
      nota: `${fmtPct(r.clientes.pctRecurrentes)} pagó 2 veces o más`,
      cambio: r.clientes.vsAnterior, cambioTexto: 'vs. 12 meses anteriores',
      queEs: 'Cuántos clientes distintos hicieron al menos un pago en los últimos 12 meses, y cuántos repitieron.',
      comoSeCalcula: `Clientes únicos (por Customer ID) con pagos en el período. **${r.clientes.recurrentes}** pagaron dos veces o más.`,
    },
    {
      clave: 'medio', titulo: 'Canal principal', valor: medioTop ? medioTop.nombre : '—',
      nota: medioTop ? `${fmtPct(medioTop.pct)} del recaudo · ${fmtPesosCorto(medioTop.ingresos)}` : 'Sin datos',
      alerta: medioTop && medioTop.pct >= 60 ? 'Alta dependencia de un canal' : null,
      queEs: 'Por dónde entra la mayor parte de la plata.',
      comoSeCalcula: `Recaudo de 12 meses por medio de pago. ${h.sinMedio.ventas ? `**${h.sinMedio.ventas}** pagos (${fmtPct(h.sinMedio.pctVentas, 1)}) no tienen medio registrado.` : 'Todos los pagos tienen medio registrado.'}`,
    },
    {
      clave: 'usd', titulo: 'Pagos en dólares', valor: fmtPct(h.usd.pct, 1),
      nota: `${h.usd.ventas} pagos · ${fmtPesosCorto(h.usd.ingresos)} (ya en pesos)`,
      queEs: 'Qué parte del recaudo llegó por USD, PayPal o Western Union: clientes en el exterior.',
      comoSeCalcula: 'Pagos con medio en dólares ÷ recaudo de 12 meses. El valor se guarda en pesos con la TRM del día del pago.',
    },
    {
      clave: 'concentracion', titulo: 'Concentración en clientes', valor: fmtPct(h.clientes.pctTop10),
      nota: `del recaudo lo pagan los 10 clientes más grandes`,
      alerta: h.clientes.pctTop10 >= 35 ? 'Concentración alta' : null,
      queEs: 'Qué tan dependiente es el negocio de pocos clientes.',
      comoSeCalcula: `Suma de los 10 clientes que más pagaron ÷ recaudo de 12 meses. El 80 % del recaudo lo hacen **${h.clientes.n80} de ${h.clientes.total}** clientes (${fmtPct(h.clientes.pctN80)}).`,
    },
  ]
}

// Recomendaciones con números (máx. 5)
export function recomendaciones(d) {
  const r = d.resumen
  const h = d.distribucion.ultimos12
  const out = []
  if (r.enCurso.vsMismaAltura != null && Math.abs(r.enCurso.vsMismaAltura) >= 10) {
    out.push(r.enCurso.vsMismaAltura < 0
      ? { tono: 'mal', texto: `El mes va **${fmtPct(Math.abs(r.enCurso.vsMismaAltura))} por debajo** del anterior a la misma fecha. Revisa las vencidas en el Planificador y envía la secuencia de cobro.` }
      : { tono: 'bien', texto: `El mes va **${fmtPct(r.enCurso.vsMismaAltura)} por encima** del anterior a la misma fecha; la proyección de cierre es ${fmtPesos(r.enCurso.proyeccion)}.` })
  }
  const medioTop = h.medios.find(m => m.nombre !== 'Sin registrar')
  if (medioTop && medioTop.pct >= 60) out.push({ tono: 'alerta', texto: `**${medioTop.nombre}** recibe el **${fmtPct(medioTop.pct)}** del recaudo. Si ese canal falla, se frena la caja: mantén activo un segundo medio (Llave BreB o banco) y menciónalo en los mensajes de cobro.` })
  const diaTop = [...h.dias].sort((a, b) => b.ingresos - a.ingresos)[0]
  if (diaTop?.ingresos) out.push({ tono: 'neutro', texto: `La mayor parte de los pagos llega entre el **${diaTop.tramo}** de cada mes (${fmtPct(diaTop.pct)}). Programa los recordatorios de cobro unos días antes de esa ventana.` })
  if (r.activaciones.vsAnterior != null && r.activaciones.vsAnterior <= -10) out.push({ tono: 'mal', texto: `Las activaciones bajaron **${fmtPct(Math.abs(r.activaciones.vsAnterior))}** frente al año anterior (${r.activaciones.actuales} vs ${r.activaciones.anteriores}): el crecimiento depende de conseguir clientes nuevos.` })
  if (r.doceMeses.ticketVsAnterior != null && Math.abs(r.doceMeses.ticketVsAnterior) >= 5) out.push(r.doceMeses.ticketVsAnterior > 0
    ? { tono: 'bien', texto: `El ticket promedio subió **${fmtPct(r.doceMeses.ticketVsAnterior, 1)}**: se están vendiendo planes más largos. Sigue ofreciendo semestral y anual en cada renovación.` }
    : { tono: 'mal', texto: `El ticket promedio bajó **${fmtPct(Math.abs(r.doceMeses.ticketVsAnterior), 1)}**: revisa descuentos y empuja planes semestrales y anuales.` })
  if (h.sinMedio.pctVentas >= 5) out.push({ tono: 'alerta', texto: `**${fmtPct(h.sinMedio.pctVentas)}** de los pagos no tiene medio registrado: llénalo al registrar cada venta para medir bien los canales.` })
  if (h.clientes.pctTop10 >= 35) out.push({ tono: 'alerta', texto: `Los 10 clientes más grandes pagan el **${fmtPct(h.clientes.pctTop10)}** del recaudo: dales seguimiento personal en cada renovación.` })
  return out.slice(0, 5)
}
