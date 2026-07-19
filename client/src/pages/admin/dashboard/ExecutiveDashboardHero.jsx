import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, AlertCircle, Download, RefreshCw, Upload } from 'lucide-react'
import { formatCurrency } from '../../../utils/excelUtils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const EXEC_STYLES = `
  .exec-metric {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1.5rem;
    border: 1px solid #e0e7ff;
    border-radius: 0.5rem;
    background: #ffffff;
    transition: all 0.2s ease;
  }

  .exec-metric:hover {
    border-color: #c7d2fe;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .exec-metric-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #64748b;
  }

  .exec-metric-value {
    font-size: 1.875rem;
    font-weight: 800;
    font-family: 'JetBrains Mono', 'Monaco', 'Courier New', monospace;
    color: #0f172a;
    line-height: 1.2;
  }

  .exec-metric-change {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
  }

  .exec-metric-change.positive {
    color: #059669;
  }

  .exec-metric-change.negative {
    color: #dc2626;
  }

  .exec-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .exec-title {
    font-size: 1.875rem;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
  }

  .exec-subtitle {
    font-size: 0.875rem;
    color: #64748b;
    line-height: 1.5;
  }

  .exec-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .exec-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #0f172a;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .exec-btn:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  .exec-btn.primary {
    background: #003366;
    color: #ffffff;
    border-color: #003366;
  }

  .exec-btn.primary:hover {
    background: #002244;
    border-color: #002244;
  }

  .exec-alert {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 1rem;
    border-radius: 0.375rem;
    background: #fee2e2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .exec-alert-icon {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
  }

  .exec-alert-text {
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .exec-chart-card {
    padding: 1.5rem;
    border: 1px solid #e0e7ff;
    border-radius: 0.5rem;
    background: #ffffff;
    margin-top: 1.5rem;
  }

  .exec-chart-title {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    margin-bottom: 1rem;
  }

  @media (prefers-color-scheme: dark) {
    .exec-metric {
      background: #1e293b;
      border-color: #334155;
    }

    .exec-metric:hover {
      border-color: #475569;
    }

    .exec-metric-label {
      color: #94a3b8;
    }

    .exec-metric-value {
      color: #f1f5f9;
    }

    .exec-header {
      border-bottom-color: #334155;
    }

    .exec-title {
      color: #f1f5f9;
    }

    .exec-subtitle {
      color: #cbd5e1;
    }

    .exec-btn {
      background: #0f172a;
      color: #e2e8f0;
      border-color: #334155;
    }

    .exec-btn:hover {
      background: #1e293b;
      border-color: #475569;
    }

    .exec-btn.primary {
      background: #1e3a8a;
    }

    .exec-btn.primary:hover {
      background: #1e40af;
    }

    .exec-chart-card {
      background: #1e293b;
      border-color: #334155;
    }
  }
`

const METRICS = [
  {
    id: 'revenue',
    label: 'Ingresos Totales',
    key: 'totalIngresos',
    format: 'currency',
    changeKey: 'changeRevenue'
  },
  {
    id: 'clients',
    label: 'Clientes Activos',
    key: 'totalClients',
    format: 'number',
    changeKey: 'changeClients'
  },
  {
    id: 'churn',
    label: 'Tasa de Baja',
    key: 'churnRate',
    format: 'percent',
    changeKey: 'changeChurn',
    isNegative: true
  },
  {
    id: 'margin',
    label: 'Margen Bruto',
    key: 'marginPercent',
    format: 'percent',
    changeKey: 'changeMargin'
  }
]

function MetricCard({ metric, value, change, isDev }) {
  const isPositive = !metric.isNegative ? change >= 0 : change <= 0
  const formattedValue = metric.format === 'currency'
    ? formatCurrency(value || 0)
    : metric.format === 'percent'
      ? `${(value || 0).toFixed(1)}%`
      : (value || 0).toLocaleString('es-CO')

  return (
    <div className="exec-metric">
      <div className="exec-metric-label">{metric.label}</div>
      <div className="exec-metric-value">{formattedValue}</div>
      {change !== null && (
        <div className={`exec-metric-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{Math.abs(change).toFixed(1)}%</span>
        </div>
      )}
    </div>
  )
}

export function ExecutiveDashboardHero({
  stats,
  onDownloadBackup,
  onRestoreBackup,
  onSync,
  downloadingBackup,
  restoringBackup,
  syncing,
  isDev,
  trendData
}) {
  const navigate = useNavigate()

  const getMetricValue = (key) => stats?.[key] || 0
  const getChangeValue = (key) => {
    const val = stats?.[key]
    return val !== undefined ? val : null
  }

  const hasAlerts = (stats?.churnRate || 0) > 20

  return (
    <>
      <style>{EXEC_STYLES}</style>

      <div className="exec-header">
        <div>
          <h1 className="exec-title">Dashboard Ejecutivo</h1>
          <p className="exec-subtitle">Resumen financiero — actualización en tiempo real</p>
        </div>

        <div className="exec-actions">
          {isDev && (
            <>
              <input
                type="file"
                accept=".sqlite"
                id="restore-db-input"
                className="hidden"
                onChange={onRestoreBackup}
              />
              <button
                onClick={() => document.getElementById('restore-db-input').click()}
                disabled={restoringBackup}
                className="exec-btn"
              >
                <Upload size={14} />
                {restoringBackup ? 'Cargando…' : 'BD Local'}
              </button>
            </>
          )}
          <button
            onClick={onDownloadBackup}
            disabled={downloadingBackup}
            className="exec-btn"
          >
            <Download size={14} />
            {downloadingBackup ? 'Descargando…' : 'Respaldo'}
          </button>
          <button
            onClick={onSync}
            disabled={syncing}
            className="exec-btn primary"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {hasAlerts && (
        <div className="exec-alert">
          <AlertCircle className="exec-alert-icon" />
          <div className="exec-alert-text">
            <strong>Atención:</strong> Tasa de baja elevada ({(stats.churnRate).toFixed(1)}%). Requiere plan de retención.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            value={getMetricValue(metric.key)}
            change={getChangeValue(metric.changeKey)}
            isDev={isDev}
          />
        ))}
      </div>

      {trendData && trendData.length > 0 && (
        <div className="exec-chart-card">
          <div className="exec-chart-title">Tendencia — Últimos 12 Meses</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="mes"
                stroke="#64748b"
                style={{ fontSize: '0.75rem' }}
              />
              <YAxis
                stroke="#64748b"
                style={{ fontSize: '0.75rem' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  padding: '0.75rem'
                }}
                labelStyle={{ color: '#0f172a' }}
              />
              <Line
                type="monotone"
                dataKey="ingresos"
                stroke="#003366"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  )
}
