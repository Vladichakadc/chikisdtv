// Etiquetas de datos para los gráficos de retención: texto con halo blanco
// (legible sobre líneas, barras y cuadrícula) y solo en los puntos que
// cuentan la historia, para que no se monten unas sobre otras.

export const HALO = { stroke: '#fff', strokeWidth: 3.5, strokeLinejoin: 'round', paintOrder: 'stroke' }
export const fmtCorto = (v) => (v == null ? '' : `${Number(v).toLocaleString('es-CO', { maximumFractionDigits: v >= 10 ? 0 : 1 })}%`)

// Etiqueta sobre una línea solo en los índices indicados
export function etiquetaEnIndices(indices, color, { dy = -10, formato = fmtCorto, fontSize = 11 } = {}) {
  const set = new Set(indices)
  return function Etiqueta({ x, y, index, value }) {
    if (!set.has(index) || value == null || x == null || y == null) return null
    return (
      <text x={x} y={y + dy} textAnchor="middle" fontSize={fontSize} fontWeight={700} fill={color} {...HALO}>
        {formato(value)}
      </text>
    )
  }
}

// Etiqueta al final de una línea: nombre de la serie + valor (reemplaza la leyenda)
export function etiquetaFinal(ultimoIndice, color, nombre, { dx = 6 } = {}) {
  return function EtiquetaFinal({ x, y, index, value }) {
    if (index !== ultimoIndice || value == null || x == null || y == null) return null
    return (
      <text x={x + dx} y={y + 4} textAnchor="start" fontSize={11} fontWeight={700} fill={color} {...HALO}>
        {nombre ? `${nombre} ${fmtCorto(value)}` : fmtCorto(value)}
      </text>
    )
  }
}

// Último índice con dato de una serie
export const ultimoConDato = (valores) => {
  for (let i = valores.length - 1; i >= 0; i--) if (valores[i] != null) return i
  return -1
}

// Separa verticalmente las etiquetas finales que quedarían montadas
// (recibe [{ clave, valor }] y devuelve { clave: desplazamientoY })
export function separarEtiquetas(items, altoGrafico, minimo = 13) {
  const conY = items.filter(i => i.valor != null)
    .map(i => ({ ...i, y: (1 - i.valor / 100) * altoGrafico }))
    .sort((a, b) => a.y - b.y)
  const out = {}
  let anterior = -Infinity
  for (const i of conY) {
    const y = Math.max(i.y, anterior + minimo)
    out[i.clave] = y - i.y
    anterior = y
  }
  return out
}
