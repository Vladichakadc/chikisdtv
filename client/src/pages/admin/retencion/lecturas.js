// Lecturas en español claro del Análisis de Retención. Funciones puras: se
// prueban en lecturas.test.js.

// 87,6 % → 9 de cada 10
export const deCadaDiez = (pct) => (pct == null ? null : Math.round(pct / 10))

// "8 de cada 10 siguen"; si redondea a 10 sin ser 100%, "casi todos siguen"
export function textoDeDiez(pct) {
  const n = deCadaDiez(pct)
  if (n == null) return 'aún sin datos'
  if (n === 10 && pct < 100) return 'casi todos siguen'
  return `${n} de cada 10 siguen`
}

export function textoMes(n) {
  if (n === 0) return 'al activar'
  if (n === 12) return 'al año'
  return n === 1 ? 'al mes' : `a los ${n} meses`
}

// Por qué se van en ese mes: los vencimientos de plan explican los picos
export function causaDelMes(n) {
  if (n === 1) return 'en la primera renovación mensual'
  if (n === 7) return 'cuando termina el plan semestral (6 + 1 gratis)'
  if (n === 14) return 'cuando termina el plan anual (12 + 2 gratis)'
  return null
}

const fmt = (n) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: 1 })

export function titular(data) {
  const anio = data?.hitos?.find(h => h.mes === 12)
  if (!anio || anio.pct == null) return null
  return { mes: 12, pct: anio.pct, deDiez: deCadaDiez(anio.pct) }
}

// Hasta tres recomendaciones, en orden de impacto
export function recomendaciones(data) {
  if (!data) return []
  const out = []
  const mc = data.momentoCritico
  if (mc && mc.pct > 0) {
    const causa = causaDelMes(mc.mes)
    out.push({
      titulo: `El mes ${mc.mes} es el momento en que más clientes se van`,
      texto: `De cada 100 clientes que llegan a su mes ${mc.mes}${causa ? `, ${causa}` : ''}, se van ${fmt(mc.pct)}. Escríbeles unos días antes de que venza su plan: la Guía de renovaciones del Dashboard te muestra a quién le toca.`,
      tono: 'rojo',
    })
  }
  const plan = (nombre) => data.porPlan?.find(p => p.plan === nombre)
  const mensual = plan('Plan Mensual'), anual = plan('Plan Anual'), semestral = plan('Plan Semestral')
  // Se compara a 18 meses (cuando ya vencieron los planes largos) o, si no hay datos, al año
  const mes = [18, 12].find(h => mensual?.hitos?.[h] != null && [anual, semestral].some(p => p?.hitos?.[h] != null))
  const largo = mes && [anual, semestral].filter(p => p?.hitos?.[mes] != null).sort((a, b) => b.hitos[mes] - a.hitos[mes])[0]
  if (largo && largo.hitos[mes] - mensual.hitos[mes] >= 5) {
    out.push({
      titulo: `Los clientes de ${largo.plan.toLowerCase()} se quedan más`,
      texto: `${mes === 18 ? 'A los 18 meses' : 'Al año'} siguen ${fmt(largo.hitos[mes])}% de quienes entran con ${largo.plan.toLowerCase()}, frente a ${fmt(mensual.hitos[mes])}% de los que entran con plan mensual. Ofrecer el plan largo al activar ayuda a retener.`,
      tono: 'verde',
    })
  }
  if (data.totalClientes > 0) {
    const pct = (data.siguenHoy / data.totalClientes) * 100
    out.push({
      titulo: `Hoy siguen con servicio ${data.siguenHoy} de ${data.totalClientes} clientes activados`,
      texto: `Es el ${fmt(Math.round(pct * 10) / 10)}% de todos los clientes que han activado desde el inicio. Los que se fueron son candidatos para una campaña de regreso.`,
      tono: 'neutro',
    })
  }
  return out
}
