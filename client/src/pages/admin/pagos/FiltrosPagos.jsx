// Barra de filtros del Análisis de Pagos. Dos grupos:
//  · Período (qué meses muestran las gráficas): últimos 12 meses, todo el
//    historial o personalizado por años y meses.
//  · Variables (aplican a todo, también a las tarjetas): medio de pago, tipo
//    de pago y plan.
// Las gráficas también filtran al tocar una barra (medio, plan o mes).
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X, SlidersHorizontal, Loader2 } from 'lucide-react'
import { cn } from '../../../utils/cn'
import { useEsMovil } from '../../../hooks/useEsMovil'
import { NOMBRE_TIPO } from './lecturas'

export const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
export const FILTROS_VACIOS = { periodo: '12m', anios: [], meses: [], medios: [], tipos: [], planes: [] }
export const alternar = (lista, v) => (lista.includes(v) ? lista.filter(x => x !== v) : [...lista, v])

export function filtrosActivos(f) {
  return f.periodo !== '12m' || f.anios.length || f.meses.length || f.medios.length || f.tipos.length || f.planes.length
}

export function aParametros(f) {
  const p = {}
  if (f.periodo !== '12m') p.periodo = f.periodo
  if (f.periodo === 'personalizado') {
    if (f.anios.length) p.anios = f.anios.join(',')
    if (f.meses.length) p.meses = f.meses.join(',')
  }
  if (f.medios.length) p.medios = f.medios.join(',')
  if (f.tipos.length) p.tipos = f.tipos.join(',')
  if (f.planes.length) p.planes = f.planes.join(',')
  return p
}

// Texto corto del período elegido (para los títulos de las gráficas)
export function textoPeriodo(f, doceMeses) {
  if (f.periodo === 'todo') return 'todo el historial'
  if (f.periodo === 'personalizado') {
    const anios = f.anios.length ? [...f.anios].sort().join(', ') : 'todos los años'
    const meses = f.meses.length ? [...f.meses].sort((a, b) => a - b).map(m => MESES_LARGOS[m - 1].slice(0, 3).toLowerCase()).join(', ') : null
    return meses ? `${anios} · ${meses}` : anios
  }
  return doceMeses || 'últimos 12 meses'
}

function Desplegable({ etiqueta, opciones, seleccion, onCambio, nombre = (v) => v }) {
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
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto}
        className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 transition-colors bg-white',
          seleccion.length ? 'ring-emerald-500 text-emerald-800' : 'ring-slate-200 text-slate-600 hover:ring-slate-300')}>
        {etiqueta}: <span className="font-bold">{resumen}</span>
        <ChevronDown size={13} className={cn('transition-transform', abierto && 'rotate-180')} />
      </button>
      {abierto && (
        <div className="absolute z-30 mt-1.5 w-56 max-h-72 overflow-auto rounded-xl bg-white shadow-xl ring-1 ring-slate-200 p-1.5" role="listbox" aria-label={etiqueta} aria-multiselectable="true">
          <button type="button" onClick={() => onCambio([])} className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50">Todos</button>
          {opciones.map(o => (
            <label key={o} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 cursor-pointer text-sm text-slate-700">
              <input type="checkbox" checked={seleccion.includes(o)} onChange={() => onCambio(alternar(seleccion, o))}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400" />
              {nombre(o)}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function Chip({ activo, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      className={cn('px-2.5 py-1 rounded-full text-xs font-semibold ring-1 transition-colors',
        activo ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300')}>
      {children}
    </button>
  )
}

export function FiltrosPagos({ filtros, opciones, onCambio, cargando }) {
  const movil = useEsMovil()
  // En el celular la barra fija se pliega para no tapar las gráficas
  const [abierta, setAbierta] = useState(false)
  const set = (cambios) => onCambio({ ...filtros, ...cambios })
  const activos = []
  if (filtros.periodo === 'todo') activos.push({ k: 'periodo', t: 'Todo el historial', quitar: () => set({ periodo: '12m' }) })
  for (const a of filtros.periodo === 'personalizado' ? filtros.anios : []) activos.push({ k: `a${a}`, t: a, quitar: () => set({ anios: filtros.anios.filter(x => x !== a) }) })
  for (const m of filtros.periodo === 'personalizado' ? filtros.meses : []) activos.push({ k: `m${m}`, t: MESES_LARGOS[m - 1], quitar: () => set({ meses: filtros.meses.filter(x => x !== m) }) })
  for (const m of filtros.medios) activos.push({ k: `d${m}`, t: m, quitar: () => set({ medios: filtros.medios.filter(x => x !== m) }) })
  for (const t of filtros.tipos) activos.push({ k: `t${t}`, t: NOMBRE_TIPO[t], quitar: () => set({ tipos: filtros.tipos.filter(x => x !== t) }) })
  for (const p of filtros.planes) activos.push({ k: `p${p}`, t: `Plan ${p}`, quitar: () => set({ planes: filtros.planes.filter(x => x !== p) }) })

  if (movil && !abierta) {
    return (
      <section className="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-2 mb-4 bg-ui-background/95 backdrop-blur" aria-label="Filtros de las gráficas">
        <button type="button" onClick={() => setAbierta(true)} aria-expanded="false"
          className="w-full rounded-2xl bg-white ring-1 ring-slate-200/80 px-3 py-2.5 flex items-center gap-2 text-left">
          {cargando ? <Loader2 size={15} className="animate-spin text-emerald-600" /> : <SlidersHorizontal size={15} className="text-emerald-600" />}
          <span className="text-sm font-bold text-slate-800">Filtros</span>
          <span className="text-xs text-slate-500 truncate flex-1">{activos.length ? activos.map(a => a.t).join(' · ') : 'Últimos 12 meses · todo'}</span>
          <ChevronDown size={16} className="text-slate-400 shrink-0" />
        </button>
      </section>
    )
  }

  return (
    <section className="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-2 mb-4 bg-ui-background/95 backdrop-blur" aria-label="Filtros de las gráficas">
      <div className="rounded-2xl bg-white ring-1 ring-slate-200/80 p-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
            {cargando ? <Loader2 size={14} className="animate-spin text-emerald-600" /> : <SlidersHorizontal size={14} className="text-emerald-600" />} Filtros
          </span>
          <div role="radiogroup" aria-label="Período" className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
            {[['12m', 'Últimos 12 meses'], ['todo', 'Todo'], ['personalizado', 'Por año y mes']].map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={filtros.periodo === k}
                onClick={() => set({ periodo: k, ...(k !== 'personalizado' ? { anios: [], meses: [] } : { anios: filtros.anios.length ? filtros.anios : opciones.anios.slice(0, 1) }) })}
                className={cn('px-3 py-1.5 rounded-md transition-colors', filtros.periodo === k ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                {l}
              </button>
            ))}
          </div>
          <Desplegable etiqueta="Medio" opciones={opciones.medios} seleccion={filtros.medios} onCambio={(v) => set({ medios: v })} />
          <Desplegable etiqueta="Tipo" opciones={opciones.tipos} seleccion={filtros.tipos} onCambio={(v) => set({ tipos: v })} nombre={(t) => NOMBRE_TIPO[t] || t} />
          <Desplegable etiqueta="Plan" opciones={opciones.planes} seleccion={filtros.planes} onCambio={(v) => set({ planes: v })} />
          {movil && (
            <button type="button" onClick={() => setAbierta(false)} className="ml-auto text-xs font-semibold text-emerald-700 hover:underline">Listo</button>
          )}
          {filtrosActivos(filtros) && (
            <button type="button" onClick={() => onCambio(FILTROS_VACIOS)} className="text-xs font-semibold text-rose-600 hover:underline ml-auto">Limpiar filtros</button>
          )}
        </div>

        {filtros.periodo === 'personalizado' && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 w-12">Años</span>
              {opciones.anios.map(a => <Chip key={a} activo={filtros.anios.includes(a)} onClick={() => set({ anios: alternar(filtros.anios, a) })}>{a}</Chip>)}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 w-12">Meses</span>
              {MESES_LARGOS.map((m, i) => <Chip key={m} activo={filtros.meses.includes(i + 1)} onClick={() => set({ meses: alternar(filtros.meses, i + 1) })}>{m.slice(0, 3)}</Chip>)}
            </div>
          </div>
        )}

        {activos.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Filtros activos">
            {activos.map(a => (
              <li key={a.k}>
                <button type="button" onClick={a.quitar} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 text-[11px] font-semibold hover:bg-emerald-100">
                  {a.t} <X size={11} aria-label={`Quitar ${a.t}`} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
