// Tarjetas del módulo Pagos. Reflejan el filtro de la tabla (búsqueda, año,
// mes, tipo y medio) y sirven para filtrar: tocar un tipo de pago o un medio
// filtra la tabla, y "Mes en curso" lleva la tabla al mes actual.
import { Info, ArrowUpRight, ArrowDownRight, Minus, CalendarClock, Wallet, Receipt, Users } from 'lucide-react'
import { cn } from '../../../utils/cn'
import { TIPOS } from './resumenPagos'
import { MESES } from '../../../config/equipos'

const pesos = (v) => `$${Math.round(Number(v) || 0).toLocaleString('es-CO')}`
function corto(v) {
  const n = Number(v) || 0
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3).toLocaleString('es-CO')} mil`
  return pesos(n)
}
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const nombreMes = (ym) => `${MESES_CORTOS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`
const PALETA_MEDIOS = ['#7c3aed', '#0891b2', '#f97316', '#16a34a', '#e11d48', '#2563eb', '#ca8a04']

function Marco({ children, className, acento = '#10b981' }) {
  return (
    <section className={cn('relative bg-white rounded-2xl ring-1 ring-slate-200/80 p-4 sm:p-5 min-w-0 overflow-hidden', className)}>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${acento}, ${acento}33)` }} />
      {children}
    </section>
  )
}

function Encabezado({ icono: Icono, titulo, onExplicar, color = 'text-emerald-600' }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-600">
        <Icono size={15} className={color} /> {titulo}
      </p>
      {onExplicar && (
        <button type="button" onClick={onExplicar} aria-label={`Cómo se calcula: ${titulo}`}
          className="p-1 -m-1 rounded-md text-slate-300 hover:text-emerald-600 hover:bg-emerald-50">
          <Info size={15} />
        </button>
      )}
    </div>
  )
}

function Variacion({ valor, texto }) {
  if (valor == null) return <p className="text-xs text-slate-400 mt-1">{texto}</p>
  const tono = valor > 3 ? 'bien' : valor < -3 ? 'mal' : 'neutro'
  const Icono = tono === 'bien' ? ArrowUpRight : tono === 'mal' ? ArrowDownRight : Minus
  return (
    <p className={cn('text-xs mt-1 flex items-center gap-1', tono === 'bien' ? 'text-emerald-700' : tono === 'mal' ? 'text-rose-600' : 'text-slate-500')}>
      <Icono size={13} /><strong>{valor > 0 ? '+' : ''}{valor.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%</strong>
      <span className="text-slate-500">{texto}</span>
    </p>
  )
}

// Mini serie de 12 meses con tooltip nativo
function Serie({ serie }) {
  const max = Math.max(1, ...serie.map(s => s.monto))
  return (
    <div className="mt-3">
      <div className="flex items-end gap-[3px] h-12" role="img" aria-label="Recaudo de los últimos 12 meses del filtro">
        {serie.map((s, i) => (
          <span key={s.mes} title={`${nombreMes(s.mes)}: ${pesos(s.monto)}`}
            className={cn('flex-1 rounded-t-sm transition-colors', i === serie.length - 1 ? 'bg-emerald-600' : 'bg-emerald-200 hover:bg-emerald-400')}
            style={{ height: `${Math.max(4, (s.monto / max) * 100)}%` }} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>{serie[0] && nombreMes(serie[0].mes)}</span><span>{serie.at(-1) && nombreMes(serie.at(-1).mes)}</span>
      </div>
    </div>
  )
}

export function TarjetasPagos({ resumen: r, mes, filtroActivo, tipoActivo, mediosActivos, onTipo, onMedio, onMesEnCurso, onExplicar }) {
  const totalTipos = Object.values(r.porTipo).reduce((s, t) => s + t.ventas, 0) || 1
  const mesTexto = MESES[Number(mes.mes.slice(5, 7)) - 1]
  const avanceMes = mes.dia / mes.diasMes
  const avanceMeta = mes.mismaFechaAnterior ? Math.min(1, mes.recaudo / Math.max(mes.mismaFechaAnterior, 1)) : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 mb-6">
      {/* Recaudo del filtro */}
      <Marco className="xl:col-span-5">
        <Encabezado icono={Wallet} titulo={filtroActivo ? 'Recaudo de la selección' : 'Recaudo histórico'}
          onExplicar={() => onExplicar({
            title: filtroActivo ? 'Recaudo de la selección' : 'Recaudo histórico', value: pesos(r.recaudo),
            queEs: 'La plata que entró por las ventas que muestra la tabla (con la búsqueda y los filtros activos).',
            comoSeCalcula: `Suma del precio de venta de **${r.pagos.toLocaleString('es-CO')} pagos**. No cuenta las cortesías ($0) ni los cambios de plan, igual que el Dashboard y el Análisis de Pagos.`,
            origen: 'Tabla de ventas de este módulo.',
          })} />
        <p className="dash-num text-[34px] sm:text-[40px] font-bold leading-none text-slate-900 mt-2 tabular-nums">{pesos(r.recaudo)}</p>
        <p className="text-xs text-slate-500 mt-1.5">
          {r.pagos.toLocaleString('es-CO')} pagos · {r.clientes.toLocaleString('es-CO')} clientes · {r.pagosPorCliente.toLocaleString('es-CO', { maximumFractionDigits: 1 })} pagos por cliente
          {r.registros !== r.pagos && ` · ${(r.registros - r.pagos).toLocaleString('es-CO')} registros sin ingreso`}
        </p>
        {r.serie.length > 1 && <Serie serie={r.serie} />}
      </Marco>

      {/* Mes en curso */}
      <Marco className="xl:col-span-4" acento="#0ea5e9">
        <Encabezado icono={CalendarClock} titulo={`${mesTexto} hasta hoy`} color="text-sky-600"
          onExplicar={() => onExplicar({
            title: `${mesTexto} hasta hoy`, value: pesos(mes.recaudo),
            queEs: 'Lo que ha entrado en el mes en curso, sin importar los filtros de la tabla, y cómo va frente al mes anterior.',
            comoSeCalcula: `Pagos del 1 al ${mes.dia} de este mes. Se compara con lo que había entrado el mes anterior hasta el mismo día (**${pesos(mes.mismaFechaAnterior)}**). La proyección es el ritmo diario × ${mes.diasMes} días.`,
            origen: 'Tabla de ventas de este módulo, por fecha del pago.',
          })} />
        <p className="dash-num text-[34px] sm:text-[40px] font-bold leading-none text-slate-900 mt-2 tabular-nums">{corto(mes.recaudo)}</p>
        <Variacion valor={mes.variacion} texto={mes.variacion == null ? 'Sin pagos el mes anterior a esta fecha' : 'vs. el mes anterior a la misma fecha'} />
        <div className="mt-3 space-y-2">
          <div>
            <div className="flex justify-between text-[11px] text-slate-500"><span>Mes transcurrido</span><span>día {mes.dia} de {mes.diasMes}</span></div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-0.5"><div className="h-full bg-sky-400 rounded-full" style={{ width: `${avanceMes * 100}%` }} /></div>
          </div>
          {avanceMeta != null && (
            <div>
              <div className="flex justify-between text-[11px] text-slate-500"><span>Frente al mes anterior a esta fecha</span><span>{Math.round((mes.recaudo / Math.max(mes.mismaFechaAnterior, 1)) * 100)}%</span></div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-0.5"><div className={cn('h-full rounded-full', mes.recaudo >= mes.mismaFechaAnterior ? 'bg-emerald-500' : 'bg-amber-400')} style={{ width: `${avanceMeta * 100}%` }} /></div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
          <p className="text-xs text-slate-500">{mes.pagos} pagos · hoy {mes.hoyPagos} ({corto(mes.hoyRecaudo)}) · cierre estimado <strong className="text-slate-700">{corto(mes.proyeccion)}</strong></p>
          <button type="button" onClick={onMesEnCurso} className="text-xs font-semibold text-sky-700 hover:underline">Ver en la tabla</button>
        </div>
      </Marco>

      {/* Ticket */}
      <Marco className="xl:col-span-3" acento="#f97316">
        <Encabezado icono={Receipt} titulo="Ticket promedio" color="text-orange-500"
          onExplicar={() => onExplicar({
            title: 'Ticket promedio', value: pesos(r.ticket),
            queEs: 'Cuánto deja en promedio cada pago de la selección.',
            comoSeCalcula: `Recaudo ÷ número de pagos. La **mediana** (${pesos(r.mediana)}) es el pago del medio: la mitad paga menos y la otra mitad más; si está muy por debajo del promedio, unos pocos pagos grandes están subiendo el promedio.`,
            origen: 'Tabla de ventas de este módulo.',
          })} />
        <p className="dash-num text-[34px] font-bold leading-none text-slate-900 mt-2 tabular-nums">{pesos(r.ticket)}</p>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[['Mediana', r.mediana], ['Mínimo', r.minimo], ['Máximo', r.maximo]].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-orange-50/70 px-1.5 py-1.5">
              <dt className="text-[10px] text-orange-800/70">{k}</dt>
              <dd className="text-xs font-bold text-slate-800 tabular-nums">{corto(v)}</dd>
            </div>
          ))}
        </dl>
        <dl className="mt-3 space-y-1 text-xs">
          {[['renovacion', 'Por renovación'], ['activacion', 'Por activación']].map(([k, n]) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full" style={{ background: TIPOS[k].color }} />{n}</dt>
              <dd className="font-semibold text-slate-800 tabular-nums">{pesos(r.ticketPorTipo[k])}</dd>
            </div>
          ))}
        </dl>
      </Marco>

      {/* Tipos de pago: barra segmentada que filtra */}
      <Marco className="xl:col-span-6" acento="#059669">
        <Encabezado icono={Users} titulo="Tipo de pago" onExplicar={() => onExplicar({
          title: 'Tipo de pago', value: `${r.registros.toLocaleString('es-CO')} registros`,
          queEs: 'Cómo se reparten los registros de la selección: renovaciones (clientes que vuelven a pagar), activaciones (pantallas nuevas), cortesías y cambios de plan.',
          comoSeCalcula: 'Conteo y suma del precio por el campo "Tipo de pago". Toca un tipo para filtrar la tabla; tócalo otra vez para quitar el filtro.',
          origen: 'Tabla de ventas de este módulo.',
        })} />
        <div className="flex h-3.5 rounded-full overflow-hidden mt-3 ring-1 ring-slate-100" role="img" aria-label="Reparto por tipo de pago">
          {Object.entries(r.porTipo).filter(([, t]) => t.ventas).map(([k, t]) => (
            <span key={k} title={`${TIPOS[k].nombre}: ${t.ventas}`} style={{ width: `${(t.ventas / totalTipos) * 100}%`, background: TIPOS[k].color, opacity: tipoActivo && tipoActivo !== k ? 0.3 : 1 }} />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {Object.entries(r.porTipo).map(([k, t]) => (
            <button key={k} type="button" onClick={() => onTipo(k)} aria-pressed={tipoActivo === k} disabled={!t.ventas && tipoActivo !== k}
              className={cn('text-left rounded-xl px-3 py-2 ring-1 transition-colors disabled:opacity-40',
                tipoActivo === k ? 'ring-2 ring-slate-800 bg-slate-50' : 'ring-slate-200 hover:ring-slate-300 hover:bg-slate-50')}>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600"><span className="w-2 h-2 rounded-full" style={{ background: TIPOS[k].color }} />{TIPOS[k].nombre}</span>
              <span className="block dash-num text-xl font-bold text-slate-900 tabular-nums leading-tight mt-0.5">{t.ventas.toLocaleString('es-CO')}</span>
              <span className="block text-[11px] text-slate-500 tabular-nums">{corto(t.monto)} · {Math.round((t.ventas / totalTipos) * 100)}%</span>
            </button>
          ))}
        </div>
      </Marco>

      {/* Medios de pago: barras que filtran */}
      <Marco className="xl:col-span-6" acento="#7c3aed">
        <Encabezado icono={Wallet} titulo="Medios de pago" color="text-violet-600" onExplicar={() => onExplicar({
          title: 'Medios de pago', value: r.medios[0] ? `${r.medios[0].nombre} ${Math.round(r.medios[0].pct)}%` : '—',
          queEs: 'Por dónde entra la plata de la selección. "NU" agrupa también lo escrito como "Nu" o "UN".',
          comoSeCalcula: 'Suma del precio por medio de pago (sin cortesías ni cambios de plan). Toca un medio para filtrar la tabla.',
          origen: 'Tabla de ventas de este módulo.',
        })} />
        {!r.medios.length && <p className="text-sm text-slate-400 mt-3">Sin pagos en la selección.</p>}
        <ul className="mt-3 space-y-1.5">
          {r.medios.slice(0, 5).map((m, i) => {
            const activo = mediosActivos.includes(m.nombre)
            const color = m.nombre === 'Sin registrar' ? '#cbd5e1' : PALETA_MEDIOS[i % PALETA_MEDIOS.length]
            return (
              <li key={m.nombre}>
                <button type="button" onClick={() => onMedio(m.nombre)} aria-pressed={activo}
                  className={cn('w-full grid grid-cols-[92px_1fr_auto] sm:grid-cols-[110px_1fr_auto] items-center gap-2 rounded-lg px-2 py-1 transition-colors text-left',
                    activo ? 'bg-violet-50 ring-1 ring-violet-300' : 'hover:bg-slate-50')}>
                  <span className="text-xs font-semibold text-slate-700 truncate">{m.nombre}</span>
                  <span className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${Math.max(2, m.pct)}%`, background: color }} /></span>
                  <span className="text-[11px] text-slate-600 tabular-nums whitespace-nowrap"><strong className="text-slate-800">{corto(m.monto)}</strong> · {Math.round(m.pct)}%</span>
                </button>
              </li>
            )
          })}
        </ul>
        {r.medios.length > 5 && <p className="text-[11px] text-slate-400 mt-1.5">+{r.medios.length - 5} medios más con menos participación</p>}
      </Marco>
    </div>
  )
}
