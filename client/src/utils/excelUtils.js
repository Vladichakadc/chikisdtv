export function formatDate(date) {
  if (!date) return ''
  const str = String(date).trim()

  // Formato "YYYY-MM-DD" o "YYYY-MM-DD HH:MM:SS" (lo que devuelve la API/DB):
  // se parsea manualmente para evitar desfases de zona horaria con new Date()
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const [, y, mo, d] = m
    return `${d}-${mo}-${y}`
  }

  const d = new Date(str)
  if (isNaN(d.getTime())) return str
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}

// Pesos colombianos: $1.234.567 (sin decimales, separador de miles con punto)
export function formatCurrency(value) {
  if (value == null || value === '' || isNaN(value)) return '$0'
  return '$' + Math.round(Number(value)).toLocaleString('es-CO')
}

// Dólares: $1,234.50 (dos decimales, separador de miles con coma)
export function formatUSD(value) {
  if (value == null || value === '' || isNaN(value)) return '$0.00'
  return '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Número genérico con separador de miles: 1.234,56
export function formatNumber(value, maxDecimals = 2) {
  if (value == null || value === '') return '—'
  return Number(value).toLocaleString('es-CO', { maximumFractionDigits: maxDecimals })
}
