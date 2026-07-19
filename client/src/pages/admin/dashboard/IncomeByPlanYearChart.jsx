/**
 * IncomeByPlanYearChart — Análisis profesional de ingresos por tipo de plan
 * Skills: data-viz-charts, kpi-dashboard-design, financial-analyst
 *
 * Análisis multi-dimensional de composición de MRR:
 * 1) Crecimiento/decline por línea (YoY %)
 * 2) Cambios en mix de producto (% contribución)
 * 3) Volatilidad y estabilidad por plan
 * 4) Inflexiones y cambios de tendencia
 */

import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, LabelList } from 'recharts'

// Paleta de colores profesional — Accesible + Financiero
// Criterios: WCAG AA contrast, color-blind safe, diferenciación clara
const PLAN_COLORS = {
  'Plan Mensual': '#ef4444',      // Rojo vibrante (base: marca naranja → rojo más profesional)
  'Plan Semestral': '#3b82f6',    // Azul cielo (confianza, profesionalismo)
  'Plan Anual': '#10b981',        // Verde esmeralda (crecimiento, estabilidad)
  'Plan Trimestral': '#f59e0b',   // Ámbar dorado (premium, destacado)
  '3+1 Mondial': '#f59e0b',       // Ámbar dorado (promoción especial)
  '7 MESES + 1 MES GRATIS': '#6366f1',  // Índigo (oferta limitada)
  'Default': '#64748b'            // Gris pizarra (neutro profesional)
}

const getColorForPlan = (plan) => PLAN_COLORS[plan] || PLAN_COLORS['Default']

// Colores alternativos accesibles para daltónicos (patrón de saturación + brillo)
const ACCESSIBLE_COLORS = {
  'Plan Mensual': { primary: '#ef4444', alt: '#dc2626' },       // Rojo alto contraste
  'Plan Semestral': { primary: '#3b82f6', alt: '#1e40af' },     // Azul oscuro
  'Plan Anual': { primary: '#10b981', alt: '#047857' },         // Verde oscuro
  'Plan Trimestral': { primary: '#f59e0b', alt: '#b45309' },    // Ámbar oscuro
  '3+1 Mondial': { primary: '#f59e0b', alt: '#b45309' },        // Ámbar oscuro
  '7 MESES + 1 MES GRATIS': { primary: '#6366f1', alt: '#4338ca' } // Índigo oscuro
}

// Cálculos financieros según financial-analyst skill
function calculateMetrics(data, tiposPlanes) {
  if (!data || data.length < 2) return { growth: 0, volatility: 0, mixChange: 0 }

  // 1. Crecimiento YoY (primer a último año)
  const firstTotal = data[0]?.total || 0
  const lastTotal = data[data.length - 1]?.total || 0
  const growth = firstTotal > 0 ? ((lastTotal - firstTotal) / firstTotal) * 100 : 0

  // 2. Volatilidad: desviación estándar de ingresos totales
  const totals = data.map(d => d.total)
  const avgTotal = totals.reduce((a, b) => a + b, 0) / totals.length
  const variance = totals.reduce((sum, t) => sum + Math.pow(t - avgTotal, 2), 0) / totals.length
  const volatility = Math.sqrt(variance)
  const volatilityPct = (volatility / avgTotal) * 100

  // 3. Cambio en mix de producto (% de contribución primer vs último año)
  const firstMix = {}
  const lastMix = {}
  tiposPlanes.forEach(plan => {
    firstMix[plan] = firstTotal > 0 ? ((data[0]?.[plan] || 0) / firstTotal) * 100 : 0
    lastMix[plan] = lastTotal > 0 ? ((data[data.length - 1]?.[plan] || 0) / lastTotal) * 100 : 0
  })
  const mixChange = Math.max(...tiposPlanes.map(p => Math.abs(lastMix[p] - firstMix[p])))

  return { growth, volatility, volatilityPct, mixChange }
}

// Calcular YoY growth por plan
function calculateYoyGrowth(data, tiposPlanes) {
  return tiposPlanes.map(plan => {
    const values = data.map(d => d[plan] || 0)
    if (values.length < 2 || values[0] === 0) return { plan, growth: 0, trend: 'stable' }
    const growth = ((values[values.length - 1] - values[0]) / values[0]) * 100
    const trend = growth > 10 ? 'growth' : growth < -10 ? 'decline' : 'stable'
    return { plan, growth, trend }
  })
}

// Calcular volatilidad por plan
function calculateVolatilityPerPlan(data, tiposPlanes) {
  return tiposPlanes.map(plan => {
    const values = data.map(d => d[plan] || 0)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
    const volatility = Math.sqrt(variance)
    const volatilityPct = avg > 0 ? (volatility / avg) * 100 : 0
    const stability = volatilityPct < 15 ? 'stable' : volatilityPct < 30 ? 'moderate' : 'volatile'
    return { plan, volatilityPct: Math.round(volatilityPct), stability }
  })
}

export function IncomeByPlanYearChart({ data, tiposPlanes = [], loading = false, error = null }) {
  const [analysisMode, setAnalysisMode] = useState('composition') // composition, growth, volatility, mix
  const [visiblePlans, setVisiblePlans] = useState(
    tiposPlanes.reduce((acc, plan) => ({ ...acc, [plan]: true }), {})
  )

  if (error) {
    return (
      <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: '#dc2626' }}>
        <p style={{ fontWeight: 600 }}>❌ Error al cargar datos</p>
        <p style={{ fontSize: 12, color: '#991b1b' }}>{error}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          Cargando datos de ingresos por plan...
        </div>
      </div>
    )
  }

  if (!data || data.length === 0 || !tiposPlanes || tiposPlanes.length === 0) {
    return (
      <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        Sin datos de ingresos por tipo de plan disponibles
      </div>
    )
  }

  // Enriquecer datos con información de porcentaje
  const enrichedData = useMemo(() => {
    return data.map(year => {
      const total = year.total || 0
      const planData = {}
      tiposPlanes.forEach(plan => {
        planData[plan] = year[plan] || 0
      })
      return {
        ...year,
        ...planData,
        total
      }
    })
  }, [data, tiposPlanes])

  // Calcular métricas
  const metrics = useMemo(() => calculateMetrics(enrichedData, tiposPlanes), [enrichedData, tiposPlanes])
  const yoyGrowth = useMemo(() => calculateYoyGrowth(enrichedData, tiposPlanes), [enrichedData, tiposPlanes])
  const volatilityPerPlan = useMemo(() => calculateVolatilityPerPlan(enrichedData, tiposPlanes), [enrichedData, tiposPlanes])

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    try {
      const data = payload[0]?.payload
      const anio = data?.anio
      const total = data?.total
      if (!anio || total === undefined) return null
      return (
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          border: '1px solid #fed7aa',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
        }}>
          <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Año {anio}</p>
          {payload.map((entry, idx) => {
            if (entry.dataKey === 'total') return null
            return (
              <p key={idx} style={{ color: entry.color, fontWeight: 600, fontSize: 11 }}>
                {entry.name}: ${Number(entry.value).toLocaleString('es-CO')}
              </p>
            )
          })}
          <p style={{ color: '#059669', fontWeight: 700, marginTop: 6, fontSize: 11, borderTop: '1px solid #f0f0f0', paddingTop: 6 }}>
            Total: ${Number(total).toLocaleString('es-CO')}
          </p>
        </div>
      )
    } catch (err) {
      console.error('Error en CustomTooltip:', err)
      return null
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
          Análisis de Ingresos por Tipo de Plan (2022-2026)
        </p>
        <p style={{ fontSize: 12, color: '#64748b' }}>
          Evolución de MRR segmentado por línea de producto. Detecta crecimiento, cambios en mix, volatilidad e inflexiones de tendencia.
        </p>
      </div>

      {/* KPI Summary Cards — Professional Financial Design */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 14
      }}>
        {/* Growth Card */}
        <div style={{
          padding: 14,
          borderRadius: 10,
          background: metrics.growth > 0
            ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
            : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: `2px solid ${metrics.growth > 0 ? '#22c55e' : '#ef4444'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: metrics.growth > 0 ? '#16a34a' : '#991b1b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📈 Crecimiento Total
          </p>
          <p style={{ fontSize: 20, fontWeight: 900, color: metrics.growth > 0 ? '#15803d' : '#dc2626', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {metrics.growth > 0 ? '▲' : '▼'} {Math.abs(metrics.growth).toFixed(1)}%
          </p>
          <p style={{ fontSize: 8, color: '#64748b', margin: 0, fontStyle: 'italic' }}>
            Primer a último año
          </p>
        </div>

        {/* Volatility Card */}
        <div style={{
          padding: 14,
          borderRadius: 10,
          background: metrics.volatilityPct < 15
            ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
            : metrics.volatilityPct < 30
            ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
            : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: `2px solid ${metrics.volatilityPct < 15 ? '#3b82f6' : metrics.volatilityPct < 30 ? '#f59e0b' : '#ef4444'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: metrics.volatilityPct < 15 ? '#1e40af' : metrics.volatilityPct < 30 ? '#92400e' : '#991b1b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ⚖️ Volatilidad
          </p>
          <p style={{ fontSize: 20, fontWeight: 900, color: metrics.volatilityPct < 15 ? '#1e40af' : metrics.volatilityPct < 30 ? '#d97706' : '#dc2626', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {metrics.volatilityPct.toFixed(1)}%
          </p>
          <p style={{ fontSize: 8, color: '#64748b', margin: 0, fontStyle: 'italic' }}>
            {metrics.volatilityPct < 15 ? '✓ Estable' : metrics.volatilityPct < 30 ? '⚠ Moderada' : '✗ Alta'}
          </p>
        </div>

        {/* Mix Change Card */}
        <div style={{
          padding: 14,
          borderRadius: 10,
          background: metrics.mixChange < 10
            ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
            : metrics.mixChange < 20
            ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
            : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: `2px solid ${metrics.mixChange < 10 ? '#06b6d4' : metrics.mixChange < 20 ? '#f59e0b' : '#ef4444'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: metrics.mixChange < 10 ? '#0e7490' : metrics.mixChange < 20 ? '#92400e' : '#991b1b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🔄 Mix de Producto
          </p>
          <p style={{ fontSize: 20, fontWeight: 900, color: metrics.mixChange < 10 ? '#0891b2' : metrics.mixChange < 20 ? '#d97706' : '#dc2626', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {metrics.mixChange.toFixed(1)}pp
          </p>
          <p style={{ fontSize: 8, color: '#64748b', margin: 0, fontStyle: 'italic' }}>
            Máx. variación en %
          </p>
        </div>
      </div>

      {/* Toggle Analysis Modes — Enhanced */}
      <div style={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        alignItems: 'center',
        paddingBottom: 8
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Modo de Análisis:</span>
        {[
          { id: 'composition', label: '📊 Composición', color: '#3b82f6' },
          { id: 'growth', label: '📈 Crecimiento YoY', color: '#10b981' },
          { id: 'volatility', label: '⚠️ Volatilidad', color: '#f59e0b' },
          { id: 'mix', label: '🔄 Mix de Producto', color: '#ef4444' }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => setAnalysisMode(mode.id)}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: analysisMode === mode.id ? `2.5px solid ${mode.color}` : '1.5px solid #e2e8f0',
              background: analysisMode === mode.id ? `${mode.color}12` : '#f8fafc',
              color: analysisMode === mode.id ? mode.color : '#64748b',
              fontSize: 12,
              fontWeight: analysisMode === mode.id ? 700 : 600,
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
              boxShadow: analysisMode === mode.id ? `0 0 0 3px ${mode.color}20` : 'none',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (analysisMode === mode.id) {
                e.target.style.boxShadow = `0 0 0 4px ${mode.color}30`
                e.target.style.transform = 'translateY(-2px)'
              }
            }}
            onMouseLeave={(e) => {
              if (analysisMode === mode.id) {
                e.target.style.boxShadow = `0 0 0 3px ${mode.color}20`
                e.target.style.transform = 'translateY(0)'
              }
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Toggle Plan Filters — Improved Design */}
      <div style={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', marginRight: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filtrar Planes:</span>
        {tiposPlanes.map(plan => {
          const color = getColorForPlan(plan)
          const isVisible = visiblePlans[plan]
          return (
            <button
              key={plan}
              onClick={() => setVisiblePlans(prev => ({ ...prev, [plan]: !prev[plan] }))}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: isVisible ? `2.5px solid ${color}` : '1.5px solid #cbd5e1',
                background: isVisible ? `${color}12` : '#f1f5f9',
                color: isVisible ? color : '#94a3b8',
                fontSize: 12,
                fontWeight: isVisible ? 700 : 600,
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                opacity: isVisible ? 1 : 0.55,
                boxShadow: isVisible ? `0 0 0 3px ${color}20` : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (isVisible) e.target.style.boxShadow = `0 0 0 4px ${color}30`
                e.target.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                if (isVisible) e.target.style.boxShadow = `0 0 0 3px ${color}20`
                e.target.style.transform = 'translateY(0)'
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>■</span>
              {plan}
            </button>
          )
        })}
      </div>

      {/* Main Chart - Changes based on analysisMode */}
      <ResponsiveContainer width="100%" height={450}>
        {analysisMode === 'composition' ? (
          <BarChart data={enrichedData} margin={{ top: 30, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
            <XAxis dataKey="anio" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="square" />
            {tiposPlanes.map(plan =>
              visiblePlans[plan] ? (
                <Bar
                  key={plan}
                  dataKey={plan}
                  stackId="plans"
                  fill={getColorForPlan(plan)}
                  name={plan}
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey={plan}
                    position="center"
                    fill="#fff"
                    fontSize={11}
                    fontWeight={700}
                    formatter={(value) => {
                      if (value === 0 || !value) return ''
                      return `$${(value / 1000000).toFixed(1)}M`
                    }}
                  />
                </Bar>
              ) : null
            )}
          </BarChart>
        ) : analysisMode === 'growth' ? (
          <LineChart data={enrichedData} margin={{ top: 30, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
            <XAxis dataKey="anio" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            {tiposPlanes.map(plan =>
              visiblePlans[plan] ? (
                <Line
                  key={plan}
                  type="monotone"
                  dataKey={plan}
                  stroke={getColorForPlan(plan)}
                  strokeWidth={3}
                  dot={{ fill: getColorForPlan(plan), r: 5 }}
                  activeDot={{ r: 7 }}
                  name={plan}
                >
                  <LabelList
                    dataKey={plan}
                    position="top"
                    fill={getColorForPlan(plan)}
                    fontSize={10}
                    fontWeight={700}
                    offset={8}
                    formatter={(value) => {
                      if (value === 0 || !value) return ''
                      return `$${(value / 1000000).toFixed(1)}M`
                    }}
                  />
                </Line>
              ) : null
            )}
          </LineChart>
        ) : null}
      </ResponsiveContainer>

      {/* Analysis Insights by Mode */}
      {analysisMode === 'growth' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid #e5e7eb'
        }}>
          {yoyGrowth.map(item => (
            <div key={item.plan} style={{
              padding: 12,
              borderRadius: 8,
              background: item.trend === 'growth' ? '#dcfce7' : item.trend === 'decline' ? '#fee2e2' : '#dbeafe',
              border: `1px solid ${item.trend === 'growth' ? '#86efac' : item.trend === 'decline' ? '#fca5a5' : '#7dd3fc'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#1e293b', margin: 0, textTransform: 'uppercase' }}>
                {item.plan}
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: item.trend === 'growth' ? '#16a34a' : item.trend === 'decline' ? '#dc2626' : '#0284c7', margin: 0 }}>
                {item.growth > 0 ? '▲' : item.growth < 0 ? '▼' : '→'} {Math.abs(item.growth).toFixed(1)}%
              </p>
              <p style={{ fontSize: 9, color: '#64748b', margin: 0 }}>
                {item.trend === 'growth' ? 'En crecimiento' : item.trend === 'decline' ? 'En decline' : 'Estable'}
              </p>
            </div>
          ))}
        </div>
      )}

      {analysisMode === 'volatility' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid #e5e7eb'
        }}>
          {volatilityPerPlan.map(item => (
            <div key={item.plan} style={{
              padding: 12,
              borderRadius: 8,
              background: item.stability === 'stable' ? '#dbeafe' : item.stability === 'moderate' ? '#fed7aa' : '#fee2e2',
              border: `1px solid ${item.stability === 'stable' ? '#7dd3fc' : item.stability === 'moderate' ? '#fdba74' : '#fca5a5'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#1e293b', margin: 0, textTransform: 'uppercase' }}>
                {item.plan}
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: item.stability === 'stable' ? '#0284c7' : item.stability === 'moderate' ? '#ea580c' : '#dc2626', margin: 0 }}>
                {item.volatilityPct.toFixed(1)}%
              </p>
              <p style={{ fontSize: 9, color: '#64748b', margin: 0 }}>
                {item.stability === 'stable' ? 'Estable' : item.stability === 'moderate' ? 'Moderada' : 'Volátil'}
              </p>
            </div>
          ))}
        </div>
      )}

      {analysisMode === 'mix' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid #e5e7eb'
        }}>
          {tiposPlanes.map(plan => {
            const lastTotal = enrichedData[enrichedData.length - 1]?.total || 0
            const lastValue = enrichedData[enrichedData.length - 1]?.[plan] || 0
            const lastMix = lastTotal > 0 ? (lastValue / lastTotal) * 100 : 0
            const firstTotal = enrichedData[0]?.total || 0
            const firstValue = enrichedData[0]?.[plan] || 0
            const firstMix = firstTotal > 0 ? (firstValue / firstTotal) * 100 : 0
            const mixDelta = lastMix - firstMix
            return (
              <div key={plan} style={{
                padding: 12,
                borderRadius: 8,
                background: `${getColorForPlan(plan)}15`,
                border: `1px solid ${getColorForPlan(plan)}40`,
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: getColorForPlan(plan), margin: 0, textTransform: 'uppercase' }}>
                  {plan}
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: getColorForPlan(plan), margin: 0 }}>
                    {lastMix.toFixed(1)}%
                  </p>
                  <p style={{ fontSize: 10, color: mixDelta > 0 ? '#16a34a' : mixDelta < 0 ? '#dc2626' : '#64748b', fontWeight: 600, margin: 0 }}>
                    {mixDelta > 0 ? '▲' : mixDelta < 0 ? '▼' : '→'} {Math.abs(mixDelta).toFixed(1)}pp
                  </p>
                </div>
                <p style={{ fontSize: 9, color: '#64748b', margin: 0 }}>
                  Fue: {firstMix.toFixed(1)}%
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12,
        paddingTop: 12,
        borderTop: '1px solid #e5e7eb'
      }}>
        {tiposPlanes.map(plan => {
          const totalPorPlan = enrichedData.reduce((sum, year) => sum + (year[plan] || 0), 0)
          const promedioPorPlan = enrichedData.length > 0 ? Math.round(totalPorPlan / enrichedData.length) : 0
          const porcentaje = enrichedData[enrichedData.length - 1]?.total > 0
            ? Math.round((enrichedData[enrichedData.length - 1][plan] || 0) / enrichedData[enrichedData.length - 1].total * 100)
            : 0

          return (
            <div key={plan} style={{
              padding: 12,
              borderRadius: 8,
              background: `${getColorForPlan(plan)}15`,
              border: `1px solid ${getColorForPlan(plan)}40`,
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: getColorForPlan(plan), textTransform: 'uppercase', margin: 0 }}>
                {plan}
              </p>
              <p style={{ fontSize: 14, fontWeight: 800, color: getColorForPlan(plan), margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                ${promedioPorPlan.toLocaleString('es-CO')}
              </p>
              <p style={{ fontSize: 8, color: getColorForPlan(plan), margin: 0 }}>
                Promedio/año • {porcentaje}% (último año)
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
