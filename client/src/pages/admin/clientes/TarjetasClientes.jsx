// Tarjetas del módulo Clientes. Reflejan el filtro de la tabla y filtran al
// tocarlas: estado del servicio, tipo de cliente, país y datos faltantes.
import { Info, Users, Wallet, Repeat, Globe, ClipboardCheck } from 'lucide-react'
import { cn } from '../../../utils/cn'
import { ESTADOS, CAMPOS_CLAVE } from './resumenClientes'

const pesos = (v) => `$${Math.round(Number(v) || 0).toLocaleString('es-CO')}`
function corto(v) {
  const n = Number(v) || 0
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3).toLocaleString('es-CO')} mil`
  return pesos(n)
}
const num = (v) => Number(v || 0).toLocaleString('es-CO')
const PALETA = ['#0d9488', '#0891b2', '#7c3aed', '#f97316', '#e11d48', '#16a34a']

function Marco({ children, className, acento = '#14b8a6' }) {
  return (
    <section className={cn('relative bg-white rounded-2xl ring-1 ring-slate-200/80 p-4 sm:p-5 min-w-0 overflow-hidden', className)}>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${acento}, ${acento}33)` }} />
      {children}
    </section>
  )
}
function Encabezado({ icono: Icono, titulo, onExplicar, color = 'text-teal-600' }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-600"><Icono size={15} className={color} /> {titulo}</p>
      {onExplicar && (
        <button type="button" onClick={onExplicar} aria-label={`Cómo se calcula: ${titulo}`} className="p-1 -m-1 rounded-md text-slate-300 hover:text-teal-600 hover:bg-teal-50">
          <Info size={15} />
        </button>
      )}
    </div>
  )
}

export function TarjetasClientes({ r, filtros, onEstado, onTipo, onPais, onFalta, onExplicar, hayFiltro }) {
  const total = Math.max(1, r.total)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
      {/* Clientes y estado del servicio */}
      <Marco className="xl:col-span-5">
        <Encabezado icono={Users} titulo={hayFiltro ? 'Clientes de la selección' : 'Clientes registrados'} onExplicar={() => onExplicar({
          title: 'Estado del servicio', value: num(r.total),
          queEs: 'Cuántos clientes hay en la tabla (con los filtros) y cómo está su servicio según sus pantallas en el Planificador.',
          comoSeCalcula: '**Activo**: la próxima pantalla vence en más de 7 días (o es cortesía). **Por vencer**: alguna vence en los próximos 7 días. **Vencido**: alguna ya venció. **Sin servicio**: no tiene pantallas asignadas. Toca un estado para filtrar la tabla.',
          origen: 'Tabla de clientes + Planificador.',
        })} />
        <p className="dash-num text-[40px] font-bold leading-none text-slate-900 mt-2 tabular-nums">{num(r.total)}</p>
        <p className="text-xs text-slate-500 mt-1.5">{num(r.conServicio)} con servicio · {num(r.pantallas)} pantallas · {r.pantallasPorCliente.toLocaleString('es-CO', { maximumFractionDigits: 1 })} por cliente</p>
        <div className="flex h-3.5 rounded-full overflow-hidden mt-3 ring-1 ring-slate-100" role="img" aria-label="Clientes por estado del servicio">
          {Object.entries(r.porEstado).filter(([, n]) => n).map(([k, n]) => (
            <span key={k} title={`${ESTADOS[k].nombre}: ${n}`} style={{ width: `${(n / total) * 100}%`, background: ESTADOS[k].color, opacity: filtros.estados.length && !filtros.estados.includes(k) ? 0.3 : 1 }} />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {Object.entries(ESTADOS).map(([k, e]) => (
            <button key={k} type="button" onClick={() => onEstado(k)} aria-pressed={filtros.estados.includes(k)}
              className={cn('text-left rounded-xl px-3 py-2 ring-1 transition-colors', filtros.estados.includes(k) ? 'ring-2 ring-slate-800 bg-slate-50' : 'ring-slate-200 hover:ring-slate-300 hover:bg-slate-50')}>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600"><span className="w-2 h-2 rounded-full" style={{ background: e.color }} />{e.nombre}</span>
              <span className="block dash-num text-xl font-bold text-slate-900 tabular-nums leading-tight mt-0.5">{num(r.porEstado[k])}</span>
              <span className="block text-[11px] text-slate-500">{Math.round((r.porEstado[k] / total) * 100)}%</span>
            </button>
          ))}
        </div>
      </Marco>

      {/* Valor de los clientes */}
      <Marco className="xl:col-span-4" acento="#10b981">
        <Encabezado icono={Wallet} titulo="Lo que pagan" color="text-emerald-600" onExplicar={() => onExplicar({
          title: 'Lo que pagan', value: pesos(r.recaudo12m),
          queEs: 'Cuánto pagaron estos clientes en los últimos 12 meses y cuánto deja en promedio un cliente en toda su historia.',
          comoSeCalcula: 'Suma de sus ventas reales (sin cortesías ni cambios de plan) de los últimos 12 meses. **Valor por cliente** = total pagado en toda la historia ÷ clientes que han pagado algo.',
          origen: 'Tabla de ventas (Pagos), por Customer ID.',
        })} />
        <p className="dash-num text-[40px] font-bold leading-none text-slate-900 mt-2 tabular-nums">{corto(r.recaudo12m)}</p>
        <p className="text-xs text-slate-500 mt-1.5">en los últimos 12 meses · pagaron {num(r.pagaron12m)} clientes</p>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-emerald-50/70 px-3 py-2">
            <dt className="text-[11px] text-emerald-800/70">Valor por cliente</dt>
            <dd className="text-sm font-bold text-slate-800 tabular-nums">{pesos(r.ltv)}</dd>
          </div>
          <div className="rounded-lg bg-emerald-50/70 px-3 py-2 min-w-0">
            <dt className="text-[11px] text-emerald-800/70">Más pagó (12 meses)</dt>
            <dd className="text-sm font-bold text-slate-800 truncate">{r.top ? `${r.top.nombre} · ${corto(r.top.monto)}` : '—'}</dd>
          </div>
        </dl>
      </Marco>

      {/* Tipo de cliente */}
      <Marco className="xl:col-span-3" acento="#f59e0b">
        <Encabezado icono={Repeat} titulo="Tipo de cliente" color="text-amber-500" onExplicar={() => onExplicar({
          title: 'Tipo de cliente', value: r.tipos.map(t => `${t.nombre} ${t.n}`).join(' · '),
          queEs: 'Clientes finales (usan el servicio) y revendedores (compran para revender).',
          comoSeCalcula: 'Conteo por el campo Tipo y sus pantallas en el Planificador. Toca un tipo para filtrar.',
          origen: 'Tabla de clientes + Planificador.',
        })} />
        <ul className="mt-3 space-y-2">
          {r.tipos.map(t => (
            <li key={t.nombre}>
              <button type="button" onClick={() => onTipo(t.nombre)} aria-pressed={filtros.tipos.includes(t.nombre)}
                className={cn('w-full text-left rounded-xl px-3 py-2 ring-1 transition-colors', filtros.tipos.includes(t.nombre) ? 'ring-2 ring-slate-800 bg-slate-50' : 'ring-slate-200 hover:bg-slate-50')}>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-700">{t.nombre}</span>
                  <span className="dash-num text-xl font-bold text-slate-900 tabular-nums">{num(t.n)}</span>
                </span>
                <span className="block text-[11px] text-slate-500">{Math.round((t.n / total) * 100)}% · {num(t.pantallas)} pantallas</span>
              </button>
            </li>
          ))}
        </ul>
      </Marco>

      {/* Países */}
      <Marco className="xl:col-span-6" acento="#0ea5e9">
        <Encabezado icono={Globe} titulo="Dónde están" color="text-sky-600" onExplicar={() => onExplicar({
          title: 'Dónde están', value: `${r.paises.filter(p => p.nombre !== 'Sin país').length} países`,
          queEs: 'En qué países están los clientes de la selección.',
          comoSeCalcula: `Conteo por el campo País. Hay ${num(r.ciudades)} ciudades distintas registradas. Toca un país para filtrar.`,
          origen: 'Tabla de clientes.',
        })} />
        <ul className="mt-3 space-y-1.5">
          {r.paises.slice(0, 5).map((p, i) => {
            const activo = filtros.paises.includes(p.nombre)
            return (
              <li key={p.nombre}>
                <button type="button" onClick={() => onPais(p.nombre)} aria-pressed={activo}
                  className={cn('w-full grid grid-cols-[100px_1fr_auto] items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors', activo ? 'bg-sky-50 ring-1 ring-sky-300' : 'hover:bg-slate-50')}>
                  <span className="text-xs font-semibold text-slate-700 truncate">{p.nombre}</span>
                  <span className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${Math.max(2, (p.n / total) * 100)}%`, background: p.nombre === 'Sin país' ? '#cbd5e1' : PALETA[i % PALETA.length] }} /></span>
                  <span className="text-[11px] text-slate-600 tabular-nums whitespace-nowrap"><strong className="text-slate-800">{num(p.n)}</strong> · {Math.round((p.n / total) * 100)}%</span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="text-[11px] text-slate-400 mt-1.5">{r.paises.length > 5 ? `+${r.paises.length - 5} países más · ` : ''}{num(r.ciudades)} ciudades</p>
      </Marco>

      {/* Calidad de los datos */}
      <Marco className="xl:col-span-6" acento="#8b5cf6">
        <Encabezado icono={ClipboardCheck} titulo="Datos completos" color="text-violet-600" onExplicar={() => onExplicar({
          title: 'Datos completos', value: `${Math.round(r.pctCompletos)}%`,
          queEs: 'Qué tan completas están las fichas de los clientes. Sin móvil no se les puede escribir por WhatsApp desde la app.',
          comoSeCalcula: 'Una ficha está completa si tiene móvil, país, apellido, género y ciudad. Toca un dato faltante para ver esos clientes y completarlos.',
          origen: 'Tabla de clientes.',
        })} />
        <div className="flex items-end gap-3 mt-2">
          <p className="dash-num text-[40px] font-bold leading-none text-slate-900 tabular-nums">{Math.round(r.pctCompletos)}%</p>
          <p className="text-xs text-slate-500 pb-1">{num(r.completos)} de {num(r.total)} fichas completas · {num(r.referidos)} llegaron referidos</p>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {Object.entries(CAMPOS_CLAVE).map(([k, n]) => (
            <button key={k} type="button" onClick={() => onFalta(k)} aria-pressed={filtros.faltan.includes(k)} disabled={!r.datos[k] && !filtros.faltan.includes(k)}
              className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 transition-colors disabled:opacity-40',
                filtros.faltan.includes(k) ? 'bg-violet-700 text-white ring-violet-700' : r.datos[k] ? 'bg-violet-50 text-violet-800 ring-violet-200 hover:bg-violet-100' : 'bg-white text-slate-400 ring-slate-200')}>
              {n} <span className="tabular-nums">{num(r.datos[k])}</span>
            </button>
          ))}
        </div>
      </Marco>
    </div>
  )
}
