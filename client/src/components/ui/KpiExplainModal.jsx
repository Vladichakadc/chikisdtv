import { X, HelpCircle, Calculator, Database, ArrowRight } from 'lucide-react'
import { Button } from './Button'

// Modal explicativo de un KPI: qué significa, cómo se calcula (en lenguaje
// sencillo) y de dónde salen los datos, con acceso directo al módulo fuente.
//
// info = {
//   title, value,
//   icon: LucideIcon (opcional),
//   queEs: string,
//   comoSeCalcula: string,        // admite **negrilla** con dobles asteriscos
//   origen: string,
//   action: { label, onClick }    // opcional: "Ver módulo…"
// }

function RichText({ text }) {
  if (!text) return null
  return (
    <p className="text-sm text-gray-600 leading-relaxed">
      {text.split('**').map((chunk, j) => (j % 2 === 1 ? <strong key={j} className="text-gray-800">{chunk}</strong> : chunk))}
    </p>
  )
}

function Section({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <div className="bg-orange-100 text-orange-600 rounded-lg p-2 h-fit flex-shrink-0">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}

export function KpiExplainModal({ info, onClose }) {
  if (!info) return null
  const { title, value, icon: Icon, queEs, comoSeCalcula, origen, action } = info

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-t-2xl px-5 py-4 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="bg-white/20 rounded-lg p-2.5 flex-shrink-0">
                <Icon size={20} className="text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">{title}</p>
              <p className="text-white text-2xl font-bold truncate">{value}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors flex-shrink-0" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="overflow-y-auto px-5 py-5 space-y-5">
          {queEs && (
            <Section icon={HelpCircle} label="¿Qué significa?">
              <RichText text={queEs} />
            </Section>
          )}
          {comoSeCalcula && (
            <Section icon={Calculator} label="¿Cómo se calcula?">
              <RichText text={comoSeCalcula} />
            </Section>
          )}
          {origen && (
            <Section icon={Database} label="¿De dónde salen los datos?">
              <RichText text={origen} />
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-end gap-2 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          {action && (
            <Button onClick={() => { onClose(); action.onClick() }}>
              {action.label} <ArrowRight size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
