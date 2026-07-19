/**
 * MomentumAnalysisChart — Gráfica de Momentum de ventas con análisis profesional
 * Skills aplicados: data-viz-charts, kpi-dashboard-design, financial-analyst
 *
 * Características:
 * - Gráfica con banda de volatilidad (desviación estándar)
 * - Línea de tendencia (regresión lineal)
 * - Marcadores de puntos de inflexión (cambio de signo en aceleración)
 * - Controles de período, comparativa y análisis
 * - Métricas de salud operativa: volatilidad, tasa de cambio, anomalías
 */

import { useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp, TrendingDown, Activity, Zap, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { cn } from '../../../utils/cn'

// ─── Cálculos financieros (financial-analyst) ──────────────────────────────
// Volatilidad: desviación estándar de las variaciones
function calcularVolatilidad(variaciones) {
  if (!variaciones || variaciones.length < 2) return 0
  const promedio = variaciones.reduce((a, b) => a + b) / variaciones.length
  const cuadrados = variaciones.map(v => Math.pow(v - promedio, 2))
  const varianza = cuadrados.reduce((a, b) => a + b) / variaciones.length
  return Math.sqrt(varianza)
}

// Regresión lineal (tendencia) — usa ingresos o mrr según disponibilidad
function calcularTendencia(datos) {
  if (!datos || datos.length < 2) return null
  const n = datos.length
  const x = Array.from({ length: n }, (_, i) => i)
  // Usa mrr si está disponible, sino usa ingresos
  const y = datos.map(d => (d.mrr != null && d.mrr > 0) ? d.mrr : (d.ingresos || 0))

  if (y.every(v => v === 0)) return null

  const sumX = x.reduce((a, b) => a + b)
  const sumY = y.reduce((a, b) => a + b)
  const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0)
  const sumX2 = x.reduce((s, xi) => s + xi * xi, 0)

  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const ordenada = (sumY - pendiente * sumX) / n

  return { pendiente, ordenada }
}

// Detección de puntos de inflexión (cambio de dirección en aceleración)
function detectarInflexiones(variaciones) {
  if (!variaciones || variaciones.length < 3) return []

  const inflexiones = []
  for (let i = 1; i < variaciones.length - 1; i++) {
    const anterior = variaciones[i - 1]
    const actual = variaciones[i]
    const siguiente = variaciones[i + 1]

    // Cambio de signo en la aceleración (segunda derivada)
    const aceleracion1 = actual - anterior
    const aceleracion2 = siguiente - actual
    if (aceleracion1 * aceleracion2 < 0) {
      inflexiones.push(i + 1) // índice en el array original
    }
  }
  return inflexiones
}

// Detección de anomalías (desviaciones > 2 sigma)
function detectarAnomalias(variaciones, volatilidad) {
  if (!variaciones || !volatilidad || volatilidad === 0) return []

  const promedio = variaciones.reduce((a, b) => a + b) / variaciones.length
  return variaciones
    .map((v, i) => ({ indice: i, valor: v, zScore: Math.abs((v - promedio) / volatilidad) }))
    .filter(a => a.zScore > 2)
}

// ─── Componente principal ───────────────────────────────────────────────────
export function MomentumAnalysisChart({ data, kMomentum }) {
  const [periodo, setPeriodo] = useState('todos') // todos, 12, 6, 3
  const [comparativa, setComparativa] = useState('none') // none, yoy, mom
  const [analisis, setAnalisis] = useState({
    volatilidad: true,
    tendencia: false,
    inflexiones: false,
    anomalias: true,
  })

  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return []

    // Filtrar por período
    let filtrado = data
    if (periodo === '12') filtrado = data.slice(-12)
    else if (periodo === '6') filtrado = data.slice(-6)
    else if (periodo === '3') filtrado = data.slice(-3)

    // Calcular variaciones y métricas
    // Soporta ambas estructuras: la simple con variacionPct, o la enriquecida con ingresos/mrr
    const variaciones = filtrado.map((d, i) => {
      // Si ya tiene variacionPct (de momentumSerie), usarlo; sino calcularlo
      if (d.variacionPct != null) {
        return { ...d, varPct: d.variacionPct, mrr: d.ingresos || 0 }
      }

      const metricaIngresos = d.mrr != null && d.mrr > 0 ? d.mrr : d.ingresos || 0
      const prev = i > 0 ? (filtrado[i - 1].mrr != null && filtrado[i - 1].mrr > 0
        ? filtrado[i - 1].mrr
        : filtrado[i - 1].ingresos || 0) : null
      const varPct = prev > 0 ? ((metricaIngresos - prev) / prev) * 100 : 0
      return { ...d, varPct, mrr: metricaIngresos }
    })

    const varValues = variaciones.slice(1).map(d => d.varPct)
    const volatilidad = calcularVolatilidad(varValues)
    const tendencia = calcularTendencia(variaciones)
    const inflexiones = analisis.inflexiones ? detectarInflexiones(varValues) : []
    const anomalias = analisis.anomalias ? detectarAnomalias(varValues, volatilidad) : []

    // Enriquecer datos para la gráfica
    return variaciones.map((d, i) => {
      const esInflexion = inflexiones.includes(i)
      const esAnomalia = anomalias.some(a => a.indice === i - 1)
      const bandaSuperior = analisis.volatilidad && i > 0 ? varValues[i - 1] + volatilidad : null
      const bandaInferior = analisis.volatilidad && i > 0 ? varValues[i - 1] - volatilidad : null
      const tendenciaValor = tendencia && i > 0 ? tendencia.pendiente * i + tendencia.ordenada : null

      return {
        ...d,
        varPct: d.varPct,
        bandaSuperior,
        bandaInferior,
        tendenciaValor,
        marcador: esInflexion ? '⬆️⬇️' : esAnomalia ? '⚠️' : '',
      }
    })
  }, [data, periodo, analisis])

  // Cálculos globales (financial-analyst)
  const metricas = useMemo(() => {
    if (!chartData || chartData.length === 0) return null

    const variaciones = chartData.slice(1).map(d => d.varPct)
    if (variaciones.length === 0) return null

    const volatilidad = calcularVolatilidad(variaciones)
    const promedio = variaciones.reduce((a, b) => a + b) / variaciones.length
    const tasaCambioPromedio = Math.abs(promedio)
    const maxVar = Math.max(...variaciones)
    const minVar = Math.min(...variaciones)
    const rango = maxVar - minVar

    return {
      volatilidad: volatilidad.toFixed(2),
      promedio: promedio.toFixed(2),
      tasaCambioPromedio: tasaCambioPromedio.toFixed(2),
      maxVar: maxVar.toFixed(1),
      minVar: minVar.toFixed(1),
      rango: rango.toFixed(1),
      salud: volatilidad > 15 ? 'alto' : volatilidad > 8 ? 'moderado' : 'bajo',
    }
  }, [chartData])

  // Tooltip personalizado
  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    const data = payload[0].payload

    return (
      <div style={{
        background: 'rgba(255,255,255,0.97)',
        border: '1px solid #fed7aa',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
      }}>
        <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
          {data.label}
        </p>
        <p style={{ color: data.varPct >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
          Variación: {data.varPct >= 0 ? '+' : ''}{data.varPct.toFixed(1)}%
        </p>
        <p style={{ color: '#78716c', fontSize: 11, marginTop: 3 }}>
          MRR: ${data.mrr ? data.mrr.toLocaleString('es-CO') : '—'}
        </p>
        {data.marcador && (
          <p style={{ color: '#f59e0b', marginTop: 3 }}>
            {data.marcador} Punto de interés
          </p>
        )}
      </div>
    )
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        Sin datos de momentum disponibles
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Panel de control (kpi-dashboard-design) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        paddingBottom: 12,
        borderBottom: '1px solid #f5f5f5',
      }}>
        {/* Período */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
            Período
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: '3M', value: '3' },
              { label: '6M', value: '6' },
              { label: '12M', value: '12' },
              { label: 'Todo', value: 'todos' },
            ].map(btn => (
              <button
                key={btn.value}
                onClick={() => setPeriodo(btn.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: periodo === btn.value ? '2px solid #f97316' : '1px solid #e5e7eb',
                  borderRadius: 6,
                  background: periodo === btn.value ? '#fff7ed' : '#f9fafb',
                  color: periodo === btn.value ? '#f97316' : '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Análisis avanzado */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
            Análisis
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: 'Volatilidad', key: 'volatilidad', icon: Activity },
              { label: 'Tendencia', key: 'tendencia', icon: TrendingUp },
              { label: 'Inflexiones', key: 'inflexiones', icon: Zap },
              { label: 'Anomalías', key: 'anomalias', icon: AlertCircle },
            ].map(btn => (
              <button
                key={btn.key}
                onClick={() => setAnalisis(prev => ({ ...prev, [btn.key]: !prev[btn.key] }))}
                title={`${analisis[btn.key] ? 'Ocultar' : 'Mostrar'} ${btn.label}`}
                style={{
                  padding: '6px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  border: analisis[btn.key] ? '2px solid #8b5cf6' : '1px solid #e5e7eb',
                  borderRadius: 6,
                  background: analisis[btn.key] ? '#faf5ff' : '#f9fafb',
                  color: analisis[btn.key] ? '#8b5cf6' : '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.2s',
                }}
              >
                {analisis[btn.key] ? <Eye size={13} /> : <EyeOff size={13} />}
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfica (data-viz-charts) */}
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={chartData} margin={{ top: 20, right: 24, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="colorVar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.20} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="colorBanda" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" opacity={0.3} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#78716c' }}
            label={{ value: 'Mes', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: '#9ca3af' }}
          />
          <YAxis
            tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
            tick={{ fontSize: 11, fill: '#78716c' }}
            label={{ value: 'Variación %', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11, fill: '#9ca3af' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

          {/* Banda de volatilidad (financial-analyst) */}
          {analisis.volatilidad && (
            <>
              <Area
                type="monotone"
                dataKey="bandaSuperior"
                stackId="banda"
                fill="#a78bfa"
                stroke="none"
                isAnimationActive={false}
                name="Rango volatilidad"
              />
              <Area
                type="monotone"
                dataKey="bandaInferior"
                stackId="banda"
                fill="#fff"
                stroke="none"
                isAnimationActive={false}
              />
            </>
          )}

          {/* Línea de tendencia */}
          {analisis.tendencia && (
            <Line
              type="linear"
              dataKey="tendenciaValor"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Tendencia (regresión)"
              isAnimationActive={false}
            />
          )}

          {/* Variación principal */}
          <Area
            type="monotone"
            dataKey="varPct"
            fill="url(#colorVar)"
            stroke="#f97316"
            strokeWidth={2.5}
            dot={{ fill: '#f97316', r: 4 }}
            activeDot={{ r: 6 }}
            name="Variación mensual"
          />

          {/* Línea de referencia en 0 */}
          <ReferenceLine
            y={0}
            stroke="#e5e7eb"
            strokeWidth={1}
            label={{ value: '0% (sin cambio)', position: 'right', fontSize: 10, fill: '#9ca3af', offset: 10 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Métricas de salud operativa (financial-analyst) */}
      {metricas && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid #f5f5f5',
        }}>
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: '#fef3c7',
            border: '1px solid #fde68a',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: 4 }}>
              Volatilidad
            </p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#b45309', fontVariantNumeric: 'tabular-nums' }}>
              {metricas.volatilidad}%
            </p>
            <p style={{ fontSize: 9, color: '#78350f', marginTop: 2 }}>
              Riesgo: {metricas.salud === 'alto' ? '🔴 Alto' : metricas.salud === 'moderado' ? '🟡 Moderado' : '🟢 Bajo'}
            </p>
          </div>

          <div style={{
            padding: 12,
            borderRadius: 8,
            background: '#dbeafe',
            border: '1px solid #bfdbfe',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#0c2340', textTransform: 'uppercase', marginBottom: 4 }}>
              Promedio mensual
            </p>
            <p style={{
              fontSize: 18,
              fontWeight: 800,
              color: metricas.promedio >= 0 ? '#10b981' : '#ef4444',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {metricas.promedio >= 0 ? '+' : ''}{metricas.promedio}%
            </p>
          </div>

          <div style={{
            padding: 12,
            borderRadius: 8,
            background: '#f0fdf4',
            border: '1px solid #dbeafe',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#052e16', textTransform: 'uppercase', marginBottom: 4 }}>
              Rango (Max–Min)
            </p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
              {metricas.rango}%
            </p>
            <p style={{ fontSize: 9, color: '#065f46', marginTop: 2 }}>
              {metricas.maxVar}% a {metricas.minVar}%
            </p>
          </div>

          <div style={{
            padding: 12,
            borderRadius: 8,
            background: '#f3e8ff',
            border: '1px solid #e9d5ff',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#4c1d95', textTransform: 'uppercase', marginBottom: 4 }}>
              Salud operativa
            </p>
            <p style={{
              fontSize: 18,
              fontWeight: 800,
              color: metricas.salud === 'alto' ? '#dc2626' : metricas.salud === 'moderado' ? '#f59e0b' : '#10b981',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {metricas.salud === 'alto' ? 'Vigilar' : metricas.salud === 'moderado' ? 'Estable' : 'Sólida'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
