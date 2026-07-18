import { X, HelpCircle, Calculator, Database, ArrowRight, Table2 } from 'lucide-react'
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
//   detalle: {                    // opcional: desglose del cálculo en tabla
//     titulo: string,             //   p. ej. "Detalle por año"
//     columnas: string[],         //   encabezados; la 1ª va a la izquierda
//     filas: string[][],          //   celdas ya formateadas (moneda, %, …)
//     resaltarUltima: boolean,    //   true → última fila en negrilla (TOTAL)
//     nota: string,               //   pie de tabla aclaratorio
//   },
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
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}

function DetalleTabla({ detalle }) {
  if (!detalle?.filas?.length) return null
  return (
    <div className="mt-1 border border-orange-100 rounded-lg overflow-hidden">
      <div className="max-h-60 overflow-y-auto overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-orange-50 text-orange-700 sticky top-0">
              {detalle.columnas.map((c, i) => (
                <th key={i} className={`px-2.5 py-1.5 font-semibold whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {detalle.filas.map((fila, ri) => (
              <tr
                key={ri}
                className={`border-t border-orange-50 ${detalle.resaltarUltima && ri === detalle.filas.length - 1
                  ? 'bg-orange-50/70 font-bold text-gray-800'
                  : 'text-gray-600'}`}
              >
                {fila.map((cell, ci) => (
                  <td key={ci} className={`px-2.5 py-1.5 whitespace-nowrap ${ci === 0 ? 'text-left font-medium' : 'text-right tabular-nums'}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detalle.nota && (
        <p className="px-2.5 py-1.5 text-[11px] text-gray-400 bg-orange-50/40 border-t border-orange-50 leading-snug">{detalle.nota}</p>
      )}
    </div>
  )
}

export function KpiExplainModal({ info, onClose }) {
  if (!info) return null
  const { title, value, icon: Icon, queEs, comoSeCalcula, origen, detalle, action } = info

  return (
    // En móvil se comporta como bottom-sheet (desliza desde abajo, ancho completo);
    // en pantallas medianas+ vuelve a ser el modal centrado clásico.
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${detalle ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[88vh] sm:max-h-[90vh] flex flex-col animate-sheet-up`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Asa de arrastre — affordance de bottom-sheet, solo móvil */}
        <div className="sm:hidden flex justify-center pt-2 -mb-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-t-2xl">
          <div className="w-10 h-1 rounded-full bg-white/40" />
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 sm:rounded-t-2xl px-5 py-4 flex items-start justify-between gap-3 flex-shrink-0">
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
          {detalle && (
            <Section icon={Table2} label={detalle.titulo || 'Detalle del cálculo'}>
              <DetalleTabla detalle={detalle} />
            </Section>
          )}
          {origen && (
            <Section icon={Database} label="¿De dónde salen los datos?">
              <RichText text={origen} />
            </Section>
          )}
        </div>

        {/* Footer — botones a ancho completo en móvil, compactos en desktop */}
        <div className="px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-gray-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 flex-shrink-0">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">Cerrar</Button>
          {action && (
            <Button onClick={() => { onClose(); action.onClick() }} className="w-full sm:w-auto">
              {action.label} <ArrowRight size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
