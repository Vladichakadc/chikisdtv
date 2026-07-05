/**
 * KpiCard — Huashu Dark Edition (Global Shared Component)
 * Skills: ui-ux-pro-max · huashu-design · taste-skill
 *
 * Tarjeta KPI oscura premium — reemplaza todos los KpiCard locales
 * de la aplicación. Soporta dos APIs de uso:
 *
 *   1. API simple (gradFrom/gradTo — compatibilidad con código existente):
 *      <KpiCard icon={Tv} label="Total" value={42} gradFrom="#6366f1" gradTo="#818cf8" />
 *
 *   2. API por nombre de tone (nueva):
 *      <KpiCard icon={Tv} label="Total" value={42} tone="indigo" />
 *
 * Props:
 *   icon       — Lucide icon component
 *   label      — Texto uppercase (cabecera)
 *   value      — Valor principal (número o string)
 *   sub        — Texto secundario debajo del valor
 *   loading    — Muestra skeleton shimmer
 *   gradFrom   — Color inicio del gradiente (hex/rgb)
 *   gradTo     — Color fin del gradiente (hex/rgb)
 *   tone       — Nombre de paleta: indigo|purple|emerald|amber|red|orange|sky|pink|cyan
 *   delay      — Número de animación de entrada (1-6)
 *   onClick    — Handler de click (activa cursor pointer + "Ver detalle →")
 *   className  — Clases adicionales
 */

const TONES = {
  indigo:  { from: '#6366f1', to: '#818cf8',  glow: 'rgba(99,102,241,0.4)'   },
  purple:  { from: '#a855f7', to: '#c084fc',  glow: 'rgba(168,85,247,0.4)'   },
  violet:  { from: '#7c3aed', to: '#a78bfa',  glow: 'rgba(124,58,237,0.4)'   },
  emerald: { from: '#10b981', to: '#34d399',  glow: 'rgba(16,185,129,0.4)'   },
  amber:   { from: '#f59e0b', to: '#fbbf24',  glow: 'rgba(245,158,11,0.4)'   },
  orange:  { from: '#f97316', to: '#fb923c',  glow: 'rgba(249,115,22,0.4)'   },
  red:     { from: '#ef4444', to: '#f87171',  glow: 'rgba(239,68,68,0.4)'    },
  sky:     { from: '#0ea5e9', to: '#38bdf8',  glow: 'rgba(14,165,233,0.4)'   },
  pink:    { from: '#ec4899', to: '#f472b6',  glow: 'rgba(236,72,153,0.4)'   },
  cyan:    { from: '#06b6d4', to: '#22d3ee',  glow: 'rgba(6,182,212,0.4)'    },
  rose:    { from: '#f43f5e', to: '#fb7185',  glow: 'rgba(244,63,94,0.4)'    },
  teal:    { from: '#14b8a6', to: '#2dd4bf',  glow: 'rgba(20,184,166,0.4)'   },
  // ── Aliases de compatibilidad (AnalisisFinancieroPage) ──
  positive: { from: '#10b981', to: '#34d399',  glow: 'rgba(16,185,129,0.4)'  },
  negative: { from: '#ef4444', to: '#f87171',  glow: 'rgba(239,68,68,0.4)'   },
  accent:   { from: '#f97316', to: '#fb923c',  glow: 'rgba(249,115,22,0.4)'  },
  neutral:  { from: '#0ea5e9', to: '#38bdf8',  glow: 'rgba(14,165,233,0.4)'  },
}

// CSS singleton — se inyecta una sola vez
let _injected = false
function injectStyles() {
  if (_injected || typeof document === 'undefined') return
  _injected = true
  const style = document.createElement('style')
  style.textContent = `
    @keyframes kpi-shimmer { from { background-position: -200% 0 } to { background-position: 200% 0 } }
    .kpi-dark-card {
      position: relative;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.07);
      overflow: hidden;
      user-select: none;
      transition: transform 0.25s cubic-bezier(.22,1,.36,1), box-shadow 0.25s ease;
    }
    .kpi-dark-card.clickable { cursor: pointer; }
    .kpi-dark-card.clickable:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1) !important;
    }
    .kpi-dark-shimmer {
      height: 28px; width: 72px; border-radius: 6px;
      background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%);
      background-size: 200% 100%;
      animation: kpi-shimmer 1.6s infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .kpi-dark-card, .kpi-dark-card.clickable:hover { transition: none !important; transform: none !important; }
      .kpi-dark-shimmer { animation: none !important; }
    }
  `
  document.head.appendChild(style)
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  loading = false,
  gradFrom,
  gradTo,
  tone,
  delay,
  onClick,
  className = '',
}) {
  // Resolve colors: tone > gradFrom/gradTo > default indigo
  injectStyles()
  const resolved = tone
    ? (TONES[tone] || TONES.indigo)
    : gradFrom
      ? { from: gradFrom, to: gradTo || gradFrom, glow: `${gradFrom}66` }
      : TONES.indigo

  const { from, to, glow } = resolved

  // Dark backgrounds per tone depth
  const bg = `linear-gradient(135deg, #111827 0%, #0c0c1a 100%)`

  return (
    <div
      className={`kpi-dark-card${onClick ? ' clickable' : ''} ${className}`}
      style={{
        background: bg,
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      {/* Subtle grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.035, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      {/* Gradient ambient glow blob */}
      <div style={{
        position: 'absolute', top: '-30px', right: '-20px',
        width: '100px', height: '100px', borderRadius: '50%',
        background: `radial-gradient(circle, ${from}30, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, ${from}, ${to})`,
        borderRadius: '18px 18px 0 0',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', padding: '18px 20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        {/* Text */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.13em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
            marginBottom: '8px', fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
            lineHeight: 1,
          }}>
            {label}
          </p>

          {loading ? (
            <div className="kpi-dark-shimmer" />
          ) : (
            <p style={{
              fontSize: '1.9rem', fontWeight: 800, color: '#f0f0fa',
              lineHeight: 1, letterSpacing: '-0.02em',
              fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
              fontVariantNumeric: 'tabular-nums',
            }}>
              {value}
            </p>
          )}

          {sub && !loading && (
            <p style={{
              fontSize: '11px', color: 'rgba(255,255,255,0.35)',
              marginTop: '6px', fontWeight: 500,
              fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
            }}>
              {sub}
            </p>
          )}

          {onClick && !loading && (
            <p style={{
              fontSize: '10px', fontWeight: 700, color: from,
              marginTop: '8px', letterSpacing: '0.06em', textTransform: 'uppercase',
              fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
            }}>
              Ver detalle →
            </p>
          )}
        </div>

        {/* Icon badge */}
        {Icon && (
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
            background: `linear-gradient(135deg, ${from}25, ${to}35)`,
            border: `1px solid ${from}45`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 18px ${glow}`,
          }}>
            <Icon size={19} style={{ color: from }} />
          </div>
        )}
      </div>
    </div>
  )
}

// Re-export tones for external use
export { TONES as KPI_TONES }
