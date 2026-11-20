// Desplegable de selección múltiple para los filtros del módulo Pagos.
// `seleccion` vacía = sin filtro (todos). Con `unico`, se elige una sola opción.
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../../utils/cn'

export function FiltroMultiple({ etiqueta, icono: Icono, opciones, seleccion, onCambio, unico = false, nombre = (v) => v, contar }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!abierto) return
    const fuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false) }
    const esc = (e) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc) }
  }, [abierto])

  const resumen = !seleccion.length ? 'Todos' : seleccion.length === 1 ? nombre(seleccion[0]) : `${seleccion.length} elegidos`
  const elegir = (o) => {
    if (unico) { onCambio(seleccion.includes(o) ? [] : [o]); setAbierto(false); return }
    onCambio(seleccion.includes(o) ? seleccion.filter(x => x !== o) : [...seleccion, o])
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto}
        className={cn('flex items-center gap-2 px-3.5 py-2.5 border rounded-xl bg-white shadow-sm text-sm font-medium transition-colors',
          seleccion.length ? 'border-emerald-500 text-emerald-800 bg-emerald-50/60' : 'border-emerald-200 text-gray-700 hover:bg-emerald-50')}>
        {Icono && <Icono size={16} className="text-emerald-500" />}
        <span>{etiqueta}: <strong className="text-brand-accent">{resumen}</strong></span>
        <ChevronDown size={14} className={cn('text-gray-400 transition-transform', abierto && 'rotate-180')} />
      </button>
      {abierto && (
        <div className="absolute z-30 mt-2 w-60 rounded-xl border border-emerald-100 bg-white shadow-lg p-1.5" role="listbox" aria-label={etiqueta} aria-multiselectable={!unico}>
          <button type="button" onClick={() => { onCambio([]); if (unico) setAbierto(false) }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-sm font-semibold text-brand-accent hover:bg-emerald-50 border-b border-gray-100 mb-1">
            Todos
          </button>
          <div className="max-h-64 overflow-auto">
            {opciones.map(o => (
              <label key={o} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer text-sm text-gray-700">
                <input type={unico ? 'radio' : 'checkbox'} checked={seleccion.includes(o)} onChange={() => elegir(o)}
                  className="h-4 w-4 border-gray-300 text-emerald-500 focus:ring-emerald-400 rounded" />
                <span className="flex-1 truncate">{nombre(o)}</span>
                {contar && <span className="text-[11px] text-gray-400 tabular-nums">{contar(o).toLocaleString('es-CO')}</span>}
              </label>
            ))}
            {!opciones.length && <p className="px-2.5 py-1.5 text-xs text-gray-400">Sin datos</p>}
          </div>
        </div>
      )}
    </div>
  )
}
