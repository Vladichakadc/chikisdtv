import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { cn } from '../../../utils/cn'
import { parseFechaLocal } from '../planificador/rowHelpers'

// Guía de renovaciones: los próximos 14 días como la guía de programación de
// un canal — cada día muestra los clientes cuyo plan termina ese día.

const VISIBLES = 4

function etiquetaDia(fecha, dias) {
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  const d = parseFechaLocal(fecha)
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }).replace('.', '')
}

function ChipCliente({ cliente, urgente, onClick }) {
  const extra = cliente.nicknames.length > 1 ? cliente.nicknames.length : null
  return (
    <button type="button" onClick={onClick}
      title={`${cliente.nombre}${cliente.nicknames.length ? ` — ${cliente.nicknames.join(', ')}` : ''}${cliente.debe ? ' · tiene saldo pendiente' : ''}`}
      className={cn('dash-txt w-full text-left min-h-[34px] px-2.5 py-1.5 rounded-lg text-[13px] leading-tight flex items-center gap-1.5 transition-colors',
        urgente ? 'bg-red-50 text-red-900 hover:bg-red-100' : 'bg-slate-100/80 text-slate-800 hover:bg-orange-50 hover:text-orange-900')}>
      <span className="truncate flex-1 min-w-0">{cliente.nombre}</span>
      {extra && <span className="dash-num text-[12px] font-semibold text-slate-500 flex-shrink-0" aria-label={`${extra} pantallas`}>×{extra}</span>}
      {cliente.debe && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" aria-label="tiene saldo pendiente" />}
    </button>
  )
}

function CeldaDia({ dia, onCliente, compacta }) {
  const [abierta, setAbierta] = useState(false)
  const lista = abierta ? dia.clientes : dia.clientes.slice(0, VISIBLES)
  const resto = dia.clientes.length - lista.length
  const vacio = dia.clientes.length === 0
  return (
    <div className={cn('min-w-0 flex flex-col', compacta ? 'py-3' : 'p-2.5 rounded-2xl', !compacta && (dia.dias === 0 ? 'bg-red-50/50 ring-1 ring-red-100' : vacio ? 'bg-white/50' : 'bg-white ring-1 ring-slate-200/70'))}>
      <div className={cn('flex items-center justify-between gap-2 whitespace-nowrap', compacta ? 'mb-2' : 'mb-2.5')}>
        <span className={cn('dash-num text-[17px] font-semibold first-letter:uppercase', dia.dias === 0 ? 'text-red-600' : 'text-slate-800')}>
          {etiquetaDia(dia.fecha, dia.dias)}
        </span>
        {!vacio && (
          <span className={cn('dash-num text-[13px] font-semibold min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center',
            dia.dias === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700')}
            aria-label={`${dia.clientes.length} ${dia.clientes.length === 1 ? 'cliente' : 'clientes'}`}>
            {dia.clientes.length}
          </span>
        )}
      </div>
      {vacio ? (
        !compacta && <p className="dash-txt text-[13px] text-slate-300">Sin vencimientos</p>
      ) : (
        <div className={cn('grid gap-1.5', compacta ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)]')}>
          {lista.map((c, i) => <ChipCliente key={i} cliente={c} urgente={dia.dias === 0} onClick={() => onCliente(c)} />)}
          {resto > 0 && (
            <button type="button" onClick={() => setAbierta(true)} className="dash-txt text-left px-2.5 py-1 text-[13px] font-semibold text-brand-primary hover:underline">
              y {resto} más
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function GuiaRenovaciones({ guia = [], onCliente }) {
  const total = guia.reduce((s, d) => s + d.clientes.length, 0)
  const semanas = [guia.slice(0, 7), guia.slice(7, 14)]
  return (
    <section aria-labelledby="guia-titulo" className="rounded-[28px] bg-slate-50 ring-1 ring-slate-200/70 p-4 sm:p-6 mb-6">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
        <div>
          <h2 id="guia-titulo" className="dash-num text-[26px] font-bold text-slate-900 leading-none flex items-center gap-2">
            <CalendarClock size={22} className="text-brand-primary" /> Guía de renovaciones
          </h2>
          <p className="dash-txt text-sm text-slate-500 mt-1.5">
            {total
              ? `${total} ${total === 1 ? 'cliente termina' : 'clientes terminan'} su plan en los próximos 14 días. Toca un nombre para verlo en el Planificador.`
              : 'Ningún plan termina en los próximos 14 días.'}
          </p>
        </div>
        <p className="dash-txt text-xs text-slate-400 flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> tiene saldo pendiente</span>
          <span><span className="dash-num font-semibold text-slate-500">×2</span> pantallas del mismo cliente</span>
        </p>
      </div>

      {/* Escritorio: dos semanas en cuadrícula, como una guía de TV */}
      <div className="hidden md:grid gap-3">
        {semanas.map((semana, i) => (
          <div key={i} className="grid grid-cols-7 gap-2.5">
            {semana.map(d => <CeldaDia key={d.fecha} dia={d} onCliente={onCliente} />)}
          </div>
        ))}
      </div>

      {/* Móvil: lista por día; los días sin vencimientos se agrupan */}
      <div className="md:hidden divide-y divide-slate-200">
        {guia.filter(d => d.clientes.length || d.dias === 0).map(d => (
          <CeldaDia key={d.fecha} dia={d} onCliente={onCliente} compacta />
        ))}
        {guia.some(d => !d.clientes.length && d.dias > 0) && (
          <p className="dash-txt py-3 text-xs text-slate-400">
            Sin vencimientos: {guia.filter(d => !d.clientes.length && d.dias > 0).map(d => etiquetaDia(d.fecha, d.dias)).join(', ')}.
          </p>
        )}
      </div>
    </section>
  )
}
