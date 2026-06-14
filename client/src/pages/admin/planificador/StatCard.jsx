import { ArrowRight } from 'lucide-react'

// Paleta por "tono": permite reutilizar la misma tarjeta dándole un significado semántico
// (riesgo, cobranza, cortesías, valor financiero…) sin perder el lenguaje visual del módulo.
export const STAT_TONES = {
  orange:  { solid: 'from-orange-500 to-orange-600',  light: 'border-orange-200 text-orange-700',   outline: 'bg-orange-50 border-orange-300 text-orange-800',   iconLight: 'bg-orange-100',  iconOutline: 'bg-orange-200/60',  sub: 'text-orange-500',  ring: 'hover:ring-orange-300' },
  red:     { solid: 'from-red-500 to-red-600',        light: 'border-red-200 text-red-700',         outline: 'bg-red-50 border-red-300 text-red-800',           iconLight: 'bg-red-100',     iconOutline: 'bg-red-200/60',     sub: 'text-red-500',     ring: 'hover:ring-red-300' },
  amber:   { solid: 'from-amber-500 to-amber-600',    light: 'border-amber-200 text-amber-700',     outline: 'bg-amber-50 border-amber-300 text-amber-800',      iconLight: 'bg-amber-100',   iconOutline: 'bg-amber-200/60',   sub: 'text-amber-500',   ring: 'hover:ring-amber-300' },
  emerald: { solid: 'from-emerald-500 to-emerald-600', light: 'border-emerald-200 text-emerald-700', outline: 'bg-emerald-50 border-emerald-300 text-emerald-800', iconLight: 'bg-emerald-100', iconOutline: 'bg-emerald-200/60', sub: 'text-emerald-500', ring: 'hover:ring-emerald-300' },
  purple:  { solid: 'from-purple-500 to-purple-600',  light: 'border-purple-200 text-purple-700',   outline: 'bg-purple-50 border-purple-300 text-purple-800',   iconLight: 'bg-purple-100',  iconOutline: 'bg-purple-200/60',  sub: 'text-purple-500',  ring: 'hover:ring-purple-300' },
}

// Las tarjetas con `onClick` se convierten en accesos directos "inteligentes": despliegan
// el detalle accionable de esa categoría (lista de pantallas/clientes) con un botón para
// generar la venta correspondiente directamente desde Pagos, ya pre-cargada.
export function StatCard({ icon: Icon, label, value, sub, variant, tone = 'orange', onClick }) {
  const t = STAT_TONES[tone] || STAT_TONES.orange
  const styles = {
    solid:   `bg-gradient-to-br ${t.solid} text-white`,
    light:   `bg-white border-2 ${t.light}`,
    outline: `${t.outline} border`,
  }
  const iconBg = {
    solid:   'bg-white/20',
    light:   t.iconLight,
    outline: t.iconOutline,
  }
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`${styles[variant]} rounded-xl p-5 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 text-left w-full
        ${onClick ? `cursor-pointer hover:ring-2 hover:ring-offset-2 ${variant === 'solid' ? 'hover:ring-white/50' : t.ring}` : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${variant === 'solid' ? 'opacity-90' : ''}`}>{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sub && <p className={`text-xs mt-1 ${variant === 'solid' ? 'opacity-75' : t.sub}`}>{sub}</p>}
          {onClick && (
            <p className={`text-[11px] mt-2 inline-flex items-center gap-1 font-semibold ${variant === 'solid' ? 'text-white/85' : t.sub}`}>
              Ver y generar venta <ArrowRight size={11} />
            </p>
          )}
        </div>
        <div className={`${iconBg[variant]} rounded-lg p-3`}>
          <Icon size={24} />
        </div>
      </div>
    </Wrapper>
  )
}
