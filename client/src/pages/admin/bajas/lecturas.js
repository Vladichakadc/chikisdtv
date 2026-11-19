// Lecturas en lenguaje natural del Análisis de Bajas (datos de
// GET /admin/bajas/analisis → server/services/analisisBajas.js).

export const COLORES_MOTIVO = {
  economico: '#e11d48',
  no_usa: '#f97316',
  senal: '#7c3aed',
  dispositivo: '#0891b2',
  competencia: '#2563eb',
  soporte: '#db2777',
  moroso: '#b45309',
  temporal: '#16a34a',
  cambio_cuenta: '#64748b',
  fallecimiento: '#334155',
  otro: '#94a3b8',
  otros: '#94a3b8',
  sin_motivo: '#cbd5e1',
}

const fmtPct = (v) => `${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 0 })}%`
export const fmtPesos = (v) => `$${Math.round(Number(v) || 0).toLocaleString('es-CO')}`
export const fmtPesosCorto = (v) => {
  const n = Number(v) || 0
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3).toLocaleString('es-CO')} mil`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

// Categorías con motivo real (sin "sin motivo" ni movimientos internos)
export const conMotivoReal = (cats = []) => cats.filter(c => c.clave !== 'sin_motivo' && c.clave !== 'cambio_cuenta' && c.bajas > 0)

// Titular de la página: el motivo principal, o la falta de motivos si es lo
// que impide leer el problema.
export function titular(data, periodo = 'ultimos12') {
  const m = data?.motivos?.[periodo]
  if (!m || !m.total) return { titulo: 'No hay bajas en este período', detalle: null, tono: 'bien' }
  const reales = conMotivoReal(m.categorias)
  const principal = reales[0]
  const sinMotivo = m.total - m.conMotivo
  if (!principal) {
    return {
      titulo: `Ninguna de las ${m.total} bajas tiene motivo registrado`,
      detalle: 'Sin motivos no se puede saber qué hace perder clientes. Clasifica las bajas abajo y registra el motivo en cada baja nueva.',
      tono: 'alerta',
    }
  }
  const titulo = `"${principal.nombre}" es el motivo número uno: ${fmtPct(principal.pctConMotivo)} de las bajas con motivo`
  const detalle = m.pctConMotivo < 50
    ? `Ojo: solo ${m.conMotivo} de ${m.total} bajas (${fmtPct(m.pctConMotivo)}) tienen motivo. Las otras ${sinMotivo} pueden cambiar esta lectura; clasifícalas abajo.`
    : `${m.conMotivo} de ${m.total} bajas tienen motivo (${fmtPct(m.pctConMotivo)}), suficiente para leer la tendencia.`
  return { titulo, detalle, tono: m.pctConMotivo < 50 ? 'alerta' : 'normal' }
}

// Variación de bajas frente a los 12 meses anteriores
export function variacion(actual, anterior) {
  if (!anterior) return null
  const pct = ((actual - anterior) / anterior) * 100
  return { pct, texto: `${pct > 0 ? '+' : ''}${pct.toLocaleString('es-CO', { maximumFractionDigits: 0 })}% vs. 12 meses anteriores`, tono: pct > 5 ? 'mal' : pct < -5 ? 'bien' : 'neutro' }
}

// Qué hacer, según los motivos que más pesan (máx. 3 acciones)
const ACCIONES = {
  economico: 'Ofrece el plan semestral o anual (el mes sale más barato) antes de que el cliente cancele por precio.',
  no_usa: 'Contacta a quien lleva semanas sin usar el servicio: recomiéndale contenido o ajusta su plan antes de que lo deje.',
  senal: 'Revisa las cuentas padre con más fallas y avisa a los clientes cuando haya mantenimiento.',
  dispositivo: 'Ofrece cambio o revisión del Fire TV: un equipo dañado no debería costar un cliente.',
  competencia: 'Compara tu precio y tus canales con la competencia y destaca lo que te diferencia.',
  soporte: 'Mide el tiempo de respuesta del soporte y deja un responsable por turno.',
  moroso: 'Usa la secuencia de recordatorios de cobro del Planificador antes del vencimiento, no después.',
  temporal: 'Ofrece una pausa en vez de la baja y escríbele cuando regrese de su viaje.',
}
export function acciones(data, periodo = 'ultimos12') {
  const reales = conMotivoReal(data?.motivos?.[periodo]?.categorias)
  return reales.filter(c => ACCIONES[c.clave]).slice(0, 3).map(c => ({ clave: c.clave, motivo: c.nombre, texto: ACCIONES[c.clave] }))
}
