import { ArrowRight, Sparkles } from 'lucide-react'

// PRO MAX Tones
export const STAT_TONES = {
  orange:  { gradFrom: '#f97316', gradTo: '#fb923c', text: 'text-orange-500', bg: 'bg-orange-50' },
  red:     { gradFrom: '#ef4444', gradTo: '#f87171', text: 'text-red-500', bg: 'bg-red-50' },
  amber:   { gradFrom: '#f59e0b', gradTo: '#fbbf24', text: 'text-amber-500', bg: 'bg-amber-50' },
  emerald: { gradFrom: '#10b981', gradTo: '#34d399', text: 'text-emerald-500', bg: 'bg-emerald-50' },
  purple:  { gradFrom: '#a855f7', gradTo: '#c084fc', text: 'text-purple-500', bg: 'bg-purple-50' },
  indigo:  { gradFrom: '#6366f1', gradTo: '#818cf8', text: 'text-indigo-500', bg: 'bg-indigo-50' },
  sky:     { gradFrom: '#0ea5e9', gradTo: '#38bdf8', text: 'text-sky-500', bg: 'bg-sky-50' },
}

export function StatCard({ icon: Icon, label, value, sub, variant, tone = 'orange', onClick }) {
  const t = STAT_TONES[tone] || STAT_TONES.orange
  
  // Custom PRO MAX styling based on variant
  const isSolid = variant === 'solid'
  const isOutline = variant === 'outline'
  
  const containerClass = `relative bg-white rounded-2xl overflow-hidden select-none transition-all duration-300
    ${isSolid ? 'shadow-md border border-slate-100' : isOutline ? `${t.bg} border border-${t.text.replace('text-','border-')}/30` : 'border border-slate-200 shadow-sm'}
    ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50' : ''}`

  const topBorder = isSolid 
    ? `linear-gradient(90deg, ${t.gradFrom}, ${t.gradTo})`
    : `linear-gradient(90deg, ${t.gradFrom}80, ${t.gradTo}80)`

  return (
    <div className={containerClass} onClick={onClick}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: topBorder }} />
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[10px] font-bold tracking-[.14em] uppercase mb-1 ${isOutline ? t.text : 'text-slate-400'}`}>
            {label}
          </p>
          <p className="text-3xl font-extrabold text-slate-800 tabular-nums leading-none mt-1">
            {value}
          </p>
          {sub && (
            <p className={`text-xs mt-2 font-medium ${isOutline ? t.text : 'text-slate-500'}`}>
              {sub}
            </p>
          )}
          {onClick && (
            <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-600 transition-colors">
              <Sparkles size={11} className={t.text} /> <span>Ver / Generar venta</span> <ArrowRight size={11} className={t.text} />
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${isSolid ? `${t.bg} ${t.text}` : `${t.bg} ${t.text}`}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}
