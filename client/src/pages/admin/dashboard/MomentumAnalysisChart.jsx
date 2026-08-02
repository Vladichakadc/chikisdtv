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
import { BarChart, Bar, LineChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Label, LabelList } from 'recharts'
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

// ─── Componente CustomDot: renderiza el punto con etiqueta de % ─────────────
function CustomDot(props) {
  const { cx, cy, payload, width } = props
  if (payload.varPct === undefined || isNaN(payload.varPct)) return null

  const varPct = payload.varPct
  const isPositive = varPct >= 0
  const color = isPositive ? '#10b981' : '#ef4444'
  const bgColor = isPositive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'

  return (
    <g>
      {/* Punto base */}
      <circle cx={cx} cy={cy} r={4} fill="#f97316" />
      {/* Etiqueta con % */}
      <text
        x={cx}
        y={cy - 16}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill={color}
        style={{ pointerEvents: 'none', textShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
      >
        {isPositive ? '+' : ''}{varPct.toFixed(1)}%
      </text>
    </g>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────
export function MomentumAnalysisChart({ data, kMomentum }) {
  const [periodo, setPeriodo] = useState('12') // todos, 12, 6, 3
  const [comparativa, setComparativa] = useState('none') // none, yoy, mom
  const [analisis, setAnalisis] = useState({
    volatilidad: true,
    tendencia: false,
    inflexiones: false,
    anomalias: true,
  })

  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return []

    // El mes en curso (parcial) se excluye antes de cualquier cálculo: comparado
    // contra un mes cerrado completo siempre generaría una caída falsa, y podría
    // marcarse como "anomalía" (z-score > 2) sin serlo — solo es un mes que
    // todavía no ha transcurrido.
    const cerrados = data.filter(d => !d.parcial)

    // Filtrar por período
    let filtrado = cerrados
    if (periodo === '12') filtrado = cerrados.slice(-12)
    else if (periodo === '6') filtrado = cerrados.slice(-6)
    else if (periodo === '3') filtrado = cerrados.slice(-3)

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
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: '#f97316' }}
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

      {/* Métricas de salud operativa (financial-analyst + kpi-dashboard-design) */}
      {metricas && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid #f5f5f5',
        }}>
          {/* Tarjeta 1: Volatilidad — Riesgo operativo */}
          <div style={{
            padding: 14,
            borderRadius: 8,
            background: metricas.volatilidad > 15 ? '#fee2e2' : metricas.volatilidad > 8 ? '#fef3c7' : '#f0fdf4',
            border: `1px solid ${metricas.volatilidad > 15 ? '#fecaca' : metricas.volatilidad > 8 ? '#fde68a' : '#dcfce7'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: metricas.volatilidad > 15 ? '#7f1d1d' : metricas.volatilidad > 8 ? '#92400e' : '#15803d', textTransform: 'uppercase', margin: 0 }}>
                Volatilidad
              </p>
              <span style={{ fontSize: 11, fontWeight: 600, color: metricas.volatilidad > 15 ? '#dc2626' : metricas.volatilidad > 8 ? '#f59e0b' : '#10b981' }}>
                {metricas.volatilidad > 15 ? '🔴 Alto' : metricas.volatilidad > 8 ? '🟡 Moderado' : '🟢 Bajo'}
              </span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 900, color: metricas.volatilidad > 15 ? '#991b1b' : metricas.volatilidad > 8 ? '#b45309' : '#166534', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              {metricas.volatilidad}%
            </p>
            <p style={{ fontSize: 8, color: metricas.volatilidad > 15 ? '#991b1b' : metricas.volatilidad > 8 ? '#b45309' : '#166534', margin: 0, lineHeight: 1.3 }}>
              {metricas.volatilidad > 15
                ? '⚠️ Desviación muy alta. Requiere análisis de causas raíz.\n\n✓ SOLUCIONES:\n• Segmenta por canal (web/dispositivos) y tipo cliente\n• Audita bajas vs activaciones mes a mes\n• Revisa estacionalidad (factores externos)\n• Implementa alertas automáticas si churn > 5%'
                : metricas.volatilidad > 8
                ? 'Variabilidad moderada. Monitorea factores externos y estacionalidad.'
                : 'Operación predecible. Ritmo de ingresos consistente y confiable.'}
            </p>
          </div>

          {/* Tarjeta 2: Promedio mensual — Momentum de crecimiento */}
          <div style={{
            padding: 14,
            borderRadius: 8,
            background: metricas.promedio > 5 ? '#dcfce7' : metricas.promedio > 0 ? '#dbeafe' : '#fee2e2',
            border: `1px solid ${metricas.promedio > 5 ? '#bbf7d0' : metricas.promedio > 0 ? '#bfdbfe' : '#fecaca'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: metricas.promedio >= 0 ? '#15803d' : '#7f1d1d', textTransform: 'uppercase', margin: 0 }}>
                Promedio mensual
              </p>
              <span style={{ fontSize: 11, fontWeight: 600, color: metricas.promedio >= 0 ? '#10b981' : '#ef4444' }}>
                {metricas.promedio >= 0 ? '↗' : '↘'}
              </span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 900, color: metricas.promedio >= 0 ? '#166534' : '#991b1b', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              {metricas.promedio >= 0 ? '+' : ''}{metricas.promedio}%
            </p>
            <p style={{ fontSize: 8, color: metricas.promedio >= 0 ? '#166534' : '#991b1b', margin: 0, lineHeight: 1.3 }}>
              {metricas.promedio > 5
                ? 'Momentum fuerte. Crecimiento sostenido superior a benchmark de salud.'
                : metricas.promedio > 0
                ? 'Crecimiento tímido. Optimiza canales y retención para acelerar.'
                : '🔴 Contracción en ingresos. Requiere acción inmediata.\n\n✓ SOLUCIONES:\n• Audita causas de baja (producto/precio/competencia)\n• Incrementa inversión en campañas de retención\n• Revisa LTV vs CAC por segmento\n• Activa plan de reactivación (clientes en riesgo)'}
            </p>
          </div>

          {/* Tarjeta 3: Rango (Max–Min) — Amplitud de variación */}
          <div style={{
            padding: 14,
            borderRadius: 8,
            background: metricas.rango > 50 ? '#fee2e2' : metricas.rango > 25 ? '#fef3c7' : '#f0fdf4',
            border: `1px solid ${metricas.rango > 50 ? '#fecaca' : metricas.rango > 25 ? '#fde68a' : '#dcfce7'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: metricas.rango > 50 ? '#7f1d1d' : metricas.rango > 25 ? '#92400e' : '#15803d', textTransform: 'uppercase', margin: 0 }}>
                Rango (Amplitud)
              </p>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280' }}>
                {metricas.rango > 50 ? '📊' : metricas.rango > 25 ? '⚖️' : '✓'}
              </span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 900, color: metricas.rango > 50 ? '#991b1b' : metricas.rango > 25 ? '#b45309' : '#166534', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              {metricas.rango}%
            </p>
            <p style={{ fontSize: 8, color: metricas.rango > 50 ? '#991b1b' : metricas.rango > 25 ? '#b45309' : '#166534', margin: 0, lineHeight: 1.3 }}>
              {metricas.rango > 50
                ? `Escala: ${metricas.maxVar}% a ${metricas.minVar}%. 🔴 Amplitud extrema.\n\n✓ SOLUCIONES:\n• Identifica mes outlier (causa de pico/valle)\n• Analiza impacto de eventos (lanzamientos/promociones)\n• Segmenta por cohorte para ver si afecta a todos`
                : metricas.rango > 25
                ? `Escala: ${metricas.maxVar}% a ${metricas.minVar}%. Variación significativa: investiga drivers.`
                : `Escala: ${metricas.maxVar}% a ${metricas.minVar}%. Rango compacto: operación consistente.`}
            </p>
          </div>

          {/* Tarjeta 4: Salud operativa — Síntesis de riesgo */}
          <div style={{
            padding: 14,
            borderRadius: 8,
            background: metricas.salud === 'alto' ? '#fee2e2' : metricas.salud === 'moderado' ? '#fef3c7' : '#f0fdf4',
            border: `1px solid ${metricas.salud === 'alto' ? '#fecaca' : metricas.salud === 'moderado' ? '#fde68a' : '#dcfce7'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: metricas.salud === 'alto' ? '#7f1d1d' : metricas.salud === 'moderado' ? '#92400e' : '#15803d', textTransform: 'uppercase', margin: 0 }}>
                Salud operativa
              </p>
              <span style={{ fontSize: 11, fontWeight: 600, color: metricas.salud === 'alto' ? '#dc2626' : metricas.salud === 'moderado' ? '#f59e0b' : '#10b981' }}>
                {metricas.salud === 'alto' ? '🔴' : metricas.salud === 'moderado' ? '🟡' : '🟢'}
              </span>
            </div>
            <p style={{ fontSize: 18, fontWeight: 900, color: metricas.salud === 'alto' ? '#991b1b' : metricas.salud === 'moderado' ? '#b45309' : '#166534', margin: 0 }}>
              {metricas.salud === 'alto' ? 'Vigilar' : metricas.salud === 'moderado' ? 'Estable' : 'Sólida'}
            </p>
            <p style={{ fontSize: 8, color: metricas.salud === 'alto' ? '#991b1b' : metricas.salud === 'moderado' ? '#b45309' : '#166534', margin: 0, lineHeight: 1.3 }}>
              {metricas.salud === 'alto'
                ? '🔴 RIESGO CRÍTICO. Requiere decisiones estratégicas inmediatas.\n\n✓ PLAN DE ACCIÓN (7-14 DÍAS):\n• Análisis de retención por cohorte edad/canal\n• Auditoría de bajas (razones/segmentos)\n• Campaña de reactivación para clientes en riesgo\n• Revisa pricing/competencia y propuesta de valor'
                : metricas.salud === 'moderado'
                ? '⚡ Ritmo manejable. Continúa monitoreando y prepara contingencias.'
                : '✨ Desempeño confiable. Operación resiliente con fundamentals sólidos.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
