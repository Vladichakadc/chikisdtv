// Helpers de cálculo y clasificación de filas del planificador (estado, días, orden de columnas)

// Parsea "YYYY-MM-DD" como medianoche LOCAL. new Date('YYYY-MM-DD') interpreta
// medianoche UTC, que en Bogotá (UTC-5) cae en el día anterior — eso hacía ver
// todos los vencimientos adelantados 1 día.
export function parseFechaLocal(fecha) {
  const m = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(fecha)
  return isNaN(d.getTime()) ? null : d
}

export function calcDias(fechaFin) {
  if (!fechaFin) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const fin = parseFechaLocal(fechaFin); if (!fin) return null
  fin.setHours(0, 0, 0, 0)
  return Math.round((fin - today) / 86400000)
}

export function getRowVariant(screen, diasAlerta) {
  const nombre = (String(screen.nombre ?? '') + String(screen.apellido ?? '')).trim()
  const nickname = (screen.nickname || '').trim()
  // "Libre" solo si no hay ni nombre ni nickname asignado (o el nickname lo indica explícitamente),
  // de lo contrario una pantalla con nickname (p. ej. cuentas de cortesía/prueba sin nombre/apellido) no debe marcarse como libre
  if (nickname.toLowerCase().includes('libre')) return 'libre'
  if (!nombre && !nickname) return 'libre'
  const dias = calcDias(screen.duracionReal || screen.finalizacion)
    ?? screen.diasVencimientoReal ?? screen.diasVencimiento
  if (dias != null && dias <= 0) return 'vencido'
  if (screen.alertaReal === 'CORTESIA') return 'cortesia'
  if (dias != null && dias <= diasAlerta) return 'alerta'
  return 'vigente'
}

export const ROW_BG = {
  vigente:  'hover:bg-green-50',
  alerta:   'bg-amber-50 hover:bg-amber-100',
  vencido:  'bg-red-50 hover:bg-red-100',
  cortesia: 'bg-orange-50 hover:bg-orange-100',
  libre:    'bg-gray-50 hover:bg-gray-100',
}

export function estadoBadgeVariant(estado) {
  switch ((estado || '').toUpperCase()) {
    case 'VIGENTE':  return 'success'
    case 'VENCIDO':  return 'error'
    case 'CORTESIA': return 'orange'
    case 'ALERTA':
    case 'PROXIMO A VENCER': return 'warning'
    default:         return 'neutral'
  }
}

export function getPlanSortVal(row, key) {
  if (key === 'dias') return calcDias(row.finalizacion) ?? row.diasVencimiento
  if (key === 'diasReal') return calcDias(row.duracionReal) ?? row.diasVencimientoReal
  if (key === 'tipoPlan') {
    if (row.tipoPlan) return row.tipoPlan
    const d = row.duracionPlan != null ? Math.floor(Number(row.duracionPlan)) : 999
    if (d === 14) return 'Plan Anual'
    if (d === 7) return 'Plan Semestral'
    if (d === 1) return 'Plan Mensual'
    return 'REVISAR'
  }
  return row[key]
}

// Traduce los días restantes a lenguaje de negocio (vencimiento vs. próximo vencimiento)
export function diasLabel(dias) {
  if (dias == null) return '—'
  if (dias === 0) return 'Vence hoy'
  if (dias < 0) return `Venció hace ${Math.abs(dias)}d`
  return `Vence en ${dias}d`
}

export function diasLabelClass(dias) {
  if (dias == null) return 'text-gray-400'
  if (dias <= 0) return 'text-red-600 font-bold'
  if (dias <= 8) return 'text-amber-600 font-semibold'
  return 'text-green-700 font-medium'
}
