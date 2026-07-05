/**
 * StatCard — Huashu Dark Edition
 * Skills: ui-ux-pro-max · huashu-design · taste-skill
 *
 * Tarjeta KPI oscura con:
 *  – Fondo dark glassmorphism con patrón de grid sutil
 *  – Ícono en círculo de color con glow
 *  – Número grande bold blanco
 *  – Label uppercase pequeño
 *  – Hover lift + glow en accent color
 *  – Borde superior degradado
 */

// Paleta de tones oscuros: gradiente + colores del ícono
export const STAT_TONES = {
  orange:  { from: '#f97316', to: '#fb923c',  glow: 'rgba(249,115,22,0.35)',   icon: '#f97316' },
  red:     { from: '#ef4444', to: '#f87171',  glow: 'rgba(239,68,68,0.35)',    icon: '#ef4444' },
  amber:   { from: '#f59e0b', to: '#fbbf24',  glow: 'rgba(245,158,11,0.35)',   icon: '#f59e0b' },
  emerald: { from: '#10b981', to: '#34d399',  glow: 'rgba(16,185,129,0.35)',   icon: '#10b981' },
  purple:  { from: '#a855f7', to: '#c084fc',  glow: 'rgba(168,85,247,0.35)',   icon: '#a855f7' },
  indigo:  { from: '#6366f1', to: '#818cf8',  glow: 'rgba(99,102,241,0.35)',   icon: '#6366f1' },
  sky:     { from: '#0ea5e9', to: '#38bdf8',  glow: 'rgba(14,165,233,0.35)',   icon: '#0ea5e9' },
  pink:    { from: '#ec4899', to: '#f472b6',  glow: 'rgba(236,72,153,0.35)',   icon: '#ec4899' },
  cyan:    { from: '#06b6d4', to: '#22d3ee',  glow: 'rgba(6,182,212,0.35)',    icon: '#06b6d4' },
}

// Fondo base de cada variante (todos oscuros)
const VARIANT_BG = {
  solid:   'linear-gradient(135deg,#1e1b4b 0%,#1a1a2e 100%)',
  outline: 'linear-gradient(135deg,#111827 0%,#0f172a 100%)',
  light:   'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)',
}

export function StatCard({ icon: Icon, label, value, sub, variant = 'light', tone = 'purple', onClick }) {
  const t = STAT_TONES[tone] || STAT_TONES.purple
  const bg = VARIANT_BG[variant] || VARIANT_BG.light

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick() } : undefined}
      style={{
        background: bg,
        cursor: onClick ? 'pointer' : 'default',
        // Subtle grid overlay via CSS background-image (done inline for isolation)
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '18px',
        border: `1px solid rgba(255,255,255,0.07)`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)`,
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        userSelect: 'none',
      }}
      className="stat-card-dark"
    >
      {/* Subtle grid pattern overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      {/* Top gradient border */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, ${t.from}, ${t.to})`,
        borderRadius: '18px 18px 0 0',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', padding: '20px 20px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        {/* Text block */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)',
            marginBottom: '8px', fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {label}
          </p>
          <p style={{
            fontSize: '2rem', fontWeight: 800, color: '#f0f0fa',
            lineHeight: 1, tabularNums: 'numeric',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: '-0.02em',
          }}>
            {value}
          </p>
          {sub && (
            <p style={{
              fontSize: '11px', color: 'rgba(255,255,255,0.38)',
              marginTop: '6px', fontWeight: 500,
            }}>
              {sub}
            </p>
          )}
          {onClick && (
            <p style={{
              fontSize: '10px', fontWeight: 700, color: t.icon,
              marginTop: '8px', letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              Ver detalle →
            </p>
          )}
        </div>

        {/* Icon badge */}
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
          background: `linear-gradient(135deg, ${t.from}22, ${t.to}33)`,
          border: `1px solid ${t.from}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 16px ${t.glow}`,
        }}>
          <Icon size={20} style={{ color: t.icon }} />
        </div>
      </div>

      {/* Inline hover style */}
      <style>{`
        .stat-card-dark:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1) !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .stat-card-dark { transition: none !important; }
          .stat-card-dark:hover { transform: none !important; }
        }
      `}</style>
    </div>
  )
}
