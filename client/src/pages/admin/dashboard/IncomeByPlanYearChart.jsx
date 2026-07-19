/**
 * IncomeByPlanYearChart — Gráfica profesional de ingresos por tipo de plan por años
 * Skills: data-viz-charts, kpi-dashboard-design, financial-analyst
 *
 * Visualización de composición de MRR a través de años, segmentado por tipo de plan.
 * Identifica tendencias de crecimiento por línea de negocio.
 */

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

// Paleta de colores profesional para tipos de plan
const PLAN_COLORS = {
  'Plan Mensual': '#f97316',      // Naranja principal
  'Plan Semestral': '#8b5cf6',    // Púrpura
  'Plan Anual': '#10b981',        // Verde
  'Plan Trimestral': '#06b6d4',   // Cyan
  'Default': '#6b7280'            // Gris neutro
}

const getColorForPlan = (plan) => PLAN_COLORS[plan] || PLAN_COLORS['Default']

export function IncomeByPlanYearChart({ data, tiposPlanes = [], loading = false, error = null }) {
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

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null

    return (
      <div style={{
        background: 'rgba(255,255,255,0.97)',
        border: '1px solid #fed7aa',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
      }}>
        <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
          Año {label.anio}
        </p>
        {payload.map((entry, idx) => (
          <p key={idx} style={{ color: entry.color, fontWeight: 600, fontSize: 11 }}>
            {entry.name}: ${entry.value.toLocaleString('es-CO')}
          </p>
        ))}
        <p style={{ color: '#059669', fontWeight: 700, marginTop: 6, fontSize: 11, borderTop: '1px solid #f0f0f0', paddingTop: 6 }}>
          Total: ${label.total.toLocaleString('es-CO')}
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Descripción */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
          Composición de Ingresos por Tipo de Plan
        </p>
        <p style={{ fontSize: 12, color: '#64748b' }}>
          Análisis de evolución de MRR agrupado por tipo de plan (Mensual, Semestral, Anual) a través de años.
          Identifica cambios en mix de producto y tendencias de crecimiento por línea.
        </p>
      </div>

      {/* Gráfica */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={enrichedData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <defs>
            {tiposPlanes.map(plan => (
              <linearGradient key={plan} id={`grad-${plan}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={getColorForPlan(plan)} stopOpacity={0.9} />
                <stop offset="100%" stopColor={getColorForPlan(plan)} stopOpacity={0.6} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
          <XAxis
            dataKey="anio"
            tick={{ fontSize: 12, fill: '#64748b' }}
            label={{ value: 'Año', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: '#94a3af' }}
          />
          <YAxis
            tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
            tick={{ fontSize: 11, fill: '#64748b' }}
            label={{ value: 'Ingresos (COP)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11, fill: '#94a3af' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            iconType="square"
          />

          {/* Barras apiladas por tipo de plan */}
          {tiposPlanes.map((plan, idx) => (
            <Bar
              key={plan}
              dataKey={plan}
              stackId="plans"
              fill={`url(#grad-${plan})`}
              name={plan}
              isAnimationActive={true}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Resumen de estadísticas */}
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
