import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, ChevronDown, Info, Lightbulb, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle } from 'lucide-react'
import api from '../../config/api'
import { cn } from '../../utils/cn'
import { useEsMovil } from '../../hooks/useEsMovil'
import { DASH_TIPOS } from './dashboard/AlAire'
import { KpiExplainModal } from '../../components/ui/KpiExplainModal'
import { titular, tarjetas, recomendaciones, fmtPesos, fmtPesosCorto, fmtVar, tonoVar, nombreMes } from './pagos/lecturas'
import {
  EvolucionMensual, AnioContraAnio, MediosDePago, MixDePlanes, DiasDePago, MapaEstacionalidad, ConcentracionClientes,
} from './pagos/GraficasPagos'
import { FiltrosPagos, FILTROS_VACIOS, aParametros, textoPeriodo, alternar, filtrosActivos } from './pagos/FiltrosPagos'

// Análisis de Pagos: "¿cuánto entra, cuándo, por qué canal, de qué planes y de
// quién?". Datos y reglas: GET /admin/payments/analisis
// (server/services/analisisPagos.js). Todo por fecha del pago y en pesos.

function Panel({ titulo, pregunta, children, className, accion }) {
  return (
    <section className={cn('bg-white rounded-2xl ring-1 ring-slate-200/80 p-4 sm:p-5 min-w-0', className)}>
      <header className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h2 className="dash-num text-lg font-bold text-slate-900 leading-tight">{titulo}</h2>
          {pregunta && <p className="dash-txt text-[13px] text-slate-500 mt-0.5">{pregunta}</p>}
        </div>
        {accion}
      </header>
      {children}
    </section>
  )
}

// Mini serie de 12 meses dentro de una tarjeta
function MiniBarras({ datos }) {
  const max = Math.max(1, ...datos.map(d => d.ingresos))
  return (
    <div className="flex items-end gap-[3px] h-9 mt-2" aria-hidden="true">
      {datos.map((d, i) => (
        <span key={d.mes} title={`${nombreMes(d.mes)}: ${fmtPesosCorto(d.ingresos)}`}
          className={cn('flex-1 rounded-sm', i === datos.length - 1 ? 'bg-emerald-600' : 'bg-emerald-200')}
          style={{ height: `${Math.max(6, (d.ingresos / max) * 100)}%` }} />
      ))}
    </div>
  )
}

function Cambio({ valor, texto }) {
  if (valor == null) return null
  const tono = tonoVar(valor)
  const Icono = tono === 'bien' ? ArrowUpRight : tono === 'mal' ? ArrowDownRight : Minus
  return (
    <p className={cn('dash-txt text-xs mt-1 flex items-center gap-1', tono === 'bien' ? 'text-emerald-700' : tono === 'mal' ? 'text-rose-600' : 'text-slate-500')}>
      <Icono size={13} className="shrink-0" /><strong>{fmtVar(valor)}</strong> <span className="text-slate-500 font-normal">{texto}</span>
    </p>
  )
}

function Tarjeta({ t, sparkline, enCurso, onExplicar }) {
  return (
    <button type="button" onClick={() => onExplicar(t)}
      className="group text-left bg-white rounded-2xl ring-1 ring-slate-200/80 hover:ring-emerald-300 hover:shadow-md transition-[box-shadow] px-4 py-3.5 min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
      <div className="flex items-start justify-between gap-2">
        <p className="dash-txt text-[13px] font-semibold text-slate-600">{t.titulo}</p>
        <Info size={14} className="text-slate-300 group-hover:text-emerald-600 shrink-0 mt-0.5" />
      </div>
      <p className="dash-num text-[30px] font-bold leading-none text-slate-900 mt-1.5 truncate">{t.valor}</p>
      <Cambio valor={t.cambio} texto={t.cambioTexto} />
      {t.nota && <p className="dash-txt text-xs text-slate-500 mt-1">{t.nota}</p>}
      {t.alerta && <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800"><AlertTriangle size={11} />{t.alerta}</p>}
      {t.spark && sparkline?.length > 1 && <MiniBarras datos={sparkline} />}
      {t.clave === 'enCurso' && enCurso && (
        <div className="mt-2.5">
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden" role="img" aria-label={`Día ${enCurso.dia} de ${enCurso.diasMes}`}>
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(enCurso.dia / enCurso.diasMes) * 100}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{Math.round((enCurso.dia / enCurso.diasMes) * 100)}% del mes transcurrido</p>
        </div>
      )}
    </button>
  )
}

function Titular({ data, filtrado }) {
  const t = titular(data)
  const u = data.resumen.ultimoMes
  return (
    <section className="rounded-[28px] overflow-hidden text-white mb-5"
      style={{ background: 'radial-gradient(120% 150% at 0% 0%, #065f46 0%, #053d31 50%, #032620 100%)' }}>
      <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="dash-txt text-sm text-emerald-100/70">Análisis de pagos · último mes cerrado{filtrado ? ' · con los filtros de medio, tipo o plan' : ''}</p>
        </div>
        <h1 className="dash-num text-[30px] sm:text-[46px] font-bold leading-[1.05] mt-1 max-w-4xl">{t.titulo}</h1>
        {t.detalle && <p className="dash-txt text-[15px] mt-3 max-w-3xl leading-relaxed text-emerald-100/85">{t.detalle}</p>}
        {/* Composición del mes: renovaciones vs activaciones */}
        {u.ingresos > 0 && (() => {
          const mes = data.serie.find(s => s.mes === u.mes)
          if (!mes) return null
          const partes = [['renovacion', 'Renovaciones', '#34d399'], ['activacion', 'Activaciones', '#fb923c'], ['otros', 'Otros', '#94a3b8']].filter(([k]) => mes[k] > 0)
          return (
            <div className="mt-6">
              <div className="flex h-4 rounded-full overflow-hidden ring-1 ring-white/10" role="img" aria-label="Composición del recaudo del mes">
                {partes.map(([k, n, c]) => <span key={k} title={`${n}: ${fmtPesosCorto(mes[k])}`} style={{ width: `${(mes[k] / mes.ingresos) * 100}%`, background: c }} />)}
              </div>
              <ul className="dash-txt flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-emerald-100/80">
                {partes.map(([k, n, c]) => (
                  <li key={k} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{n} · {fmtPesosCorto(mes[k])} ({Math.round((mes[k] / mes.ingresos) * 100)}%)</li>
                ))}
              </ul>
            </div>
          )
        })()}
      </div>
    </section>
  )
}

function Metodologia() {
  const [abierta, setAbierta] = useState(false)
  return (
    <section className="bg-white rounded-2xl ring-1 ring-slate-200/80 mt-5">
      <button onClick={() => setAbierta(a => !a)} aria-expanded={abierta}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-slate-700">
        <span className="inline-flex items-center gap-2"><Info size={15} /> Cómo se calcula</span>
        <ChevronDown size={16} className={cn('transition-transform', abierta && 'rotate-180')} />
      </button>
      {abierta && (
        <ul className="dash-txt px-5 pb-5 space-y-1.5 text-sm text-slate-600 list-disc pl-9">
          <li><strong>Fecha:</strong> todo se cuenta por la fecha del pago (cuando la plata entra), no por el mes facturado.</li>
          <li><strong>Ingreso real:</strong> se excluyen las cortesías ($0) y los cambios de plan (registro administrativo), igual que en el Dashboard.</li>
          <li><strong>Meses cerrados:</strong> las comparaciones usan meses completos. El mes en curso va aparte, con una proyección por ritmo diario.</li>
          <li><strong>Pagos en dólares:</strong> USD, PayPal y Western Union ya están en pesos (TRM del día del pago).</li>
          <li><strong>Clientes:</strong> se identifican por Customer ID; los pagos sin ID se cuentan en el recaudo, pero no en clientes ni concentración.</li>
        </ul>
      )}
    </section>
  )
}

export default function AnalisisPagosPage() {
  const movil = useEsMovil()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [cargando, setCargando] = useState(false)
  const pedido = useRef(0)
  const [explicar, setExplicar] = useState(null)

  useEffect(() => {
    // ?hoy=AAAA-MM-DD en la URL muestra el análisis a esa fecha de corte
    const hoy = new URLSearchParams(window.location.search).get('hoy')
    const n = ++pedido.current
    setCargando(true)
    const t = setTimeout(() => {
      api.get('/admin/payments/analisis', { params: { ...(hoy ? { hoy } : {}), ...aParametros(filtros) } })
        .then(r => { if (n === pedido.current) { setData(r.data); setError(null) } })
        .catch(e => { if (n === pedido.current) setError(e.response?.data?.error || 'No se pudo cargar el análisis de pagos.') })
        .finally(() => { if (n === pedido.current) setCargando(false) })
    }, 150)
    return () => clearTimeout(t)
  }, [filtros])

  const cards = useMemo(() => (data ? tarjetas(data) : []), [data])
  const recos = useMemo(() => (data ? recomendaciones(data) : []), [data])

  if (error && !data) return <div className="p-6 text-sm text-red-600">{error}</div>
  if (!data) return <div className="p-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>

  const d = data.distribucion.seleccion
  const sel = data.seleccion
  const etiqueta = textoPeriodo(filtros, `últimos 12 meses (${nombreMes(data.resumen.doceMeses.desde, { corto: true })} – ${nombreMes(data.resumen.doceMeses.hasta, { corto: true })})`)
  const variables = filtros.medios.length || filtros.tipos.length || filtros.planes.length
  // Filtrar tocando las gráficas
  const porMedio = (m) => setFiltros(f => ({ ...f, medios: alternar(f.medios, m) }))
  const porPlan = (p) => setFiltros(f => ({ ...f, planes: alternar(f.planes, p) }))
  const porTipo = (t) => setFiltros(f => ({ ...f, tipos: alternar(f.tipos, t) }))
  const porMes = (ym) => setFiltros(f => ({ ...f, periodo: 'personalizado', anios: [ym.slice(0, 4)], meses: [Number(ym.slice(5, 7))] }))

  return (
    <div className="dash-txt max-w-7xl mx-auto">
      <style>{DASH_TIPOS}</style>
      <Titular data={data} filtrado={!!variables} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {cards.map(t => (
          <Tarjeta key={t.clave} t={t} sparkline={data.sparkline} enCurso={data.resumen.enCurso}
            onExplicar={(c) => setExplicar({ title: c.titulo, value: c.valor, queEs: c.queEs, comoSeCalcula: c.comoSeCalcula, origen: 'Pagos (ventas registradas), por fecha del pago.' })} />
        ))}
      </div>
      <KpiExplainModal info={explicar} onClose={() => setExplicar(null)} />

      {recos.length > 0 && (
        <section className="mb-5 rounded-2xl bg-slate-900 text-white p-4 sm:p-5">
          <h2 className="dash-num text-lg font-bold flex items-center gap-2"><Lightbulb size={18} className="text-amber-300" /> Qué hacer con lo que muestran los pagos</h2>
          <ul className="mt-2 grid gap-2 md:grid-cols-2">
            {recos.map((r, i) => (
              <li key={i} className={cn('rounded-xl bg-white/5 ring-1 p-3 text-sm text-slate-200 leading-snug',
                r.tono === 'mal' ? 'ring-rose-400/40' : r.tono === 'bien' ? 'ring-emerald-400/40' : r.tono === 'alerta' ? 'ring-amber-400/40' : 'ring-white/10')}>
                {r.texto.split('**').map((c, j) => (j % 2 ? <strong key={j} className="text-white">{c}</strong> : c))}
              </li>
            ))}
          </ul>
        </section>
      )}

      <FiltrosPagos filtros={filtros} opciones={data.opciones} onCambio={setFiltros} cargando={cargando} />

      <section className={cn('mb-5 rounded-2xl bg-emerald-50/70 ring-1 ring-emerald-200 px-4 py-3 transition-opacity', cargando && 'opacity-60')} aria-live="polite">
        <p className="text-xs font-semibold text-emerald-900">Selección: {etiqueta}{variables ? ' · con filtros' : ''}</p>
        <dl className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2">
          {[
            ['Recaudo', fmtPesos(sel.ingresos)],
            ['Pagos', sel.ventas.toLocaleString('es-CO')],
            ['Ticket promedio', fmtPesos(sel.ticket)],
            ['Clientes', sel.clientes.toLocaleString('es-CO')],
            ['Promedio por mes', fmtPesosCorto(sel.promedioMensual)],
            ['Renovación / activación', sel.ingresos ? `${Math.round((sel.porTipo.renovacion / sel.ingresos) * 100)}% / ${Math.round((sel.porTipo.activacion / sel.ingresos) * 100)}%` : '—'],
          ].map(([k, v]) => (
            <div key={k}><dt className="text-[11px] text-emerald-800/70">{k}</dt><dd className="dash-num text-lg font-bold text-slate-900 leading-tight">{v}</dd></div>
          ))}
        </dl>
        {!sel.ventas && <p className="text-sm text-slate-600 mt-1">No hay pagos con estos filtros. {filtrosActivos(filtros) && <button className="font-semibold text-emerald-700 underline" onClick={() => setFiltros(FILTROS_VACIOS)}>Limpiar filtros</button>}</p>}
      </section>

      <div className={cn('grid gap-5 lg:grid-cols-2 transition-opacity', cargando && 'opacity-60')}>
        <Panel titulo="¿Cuánto entra cada mes?" pregunta={`Recaudo por mes y tipo de pago · ${filtros.periodo === '12m' ? `últimos ${movil ? 12 : 24} meses` : etiqueta}. Toca un mes para filtrarlo.`} className="lg:col-span-2">
          <EvolucionMensual serie={data.serie} movil={movil && filtros.periodo === '12m'} compacto={movil} onMes={porMes} tiposActivos={filtros.tipos} onTipo={porTipo} />
        </Panel>
        <Panel titulo="¿Vamos mejor que el año pasado?" pregunta={`Recaudo acumulado de enero a cada mes, por año${filtros.meses.length ? ' (solo los meses elegidos)' : ''}`}>
          <AnioContraAnio comparativo={data.comparativo} movil={movil} />
        </Panel>
        <Panel titulo="¿Qué días del mes pagan?" pregunta={`Recaudo según el día del pago · ${etiqueta}`}>
          <DiasDePago dias={d.dias} movil={movil} />
        </Panel>
        <Panel titulo="¿Por dónde entra la plata?" pregunta={`Recaudo por medio de pago · ${etiqueta}. Toca un medio para filtrarlo.`}>
          <MediosDePago medios={d.medios} movil={movil} activos={filtros.medios} onElegir={porMedio} />
        </Panel>
        <Panel titulo="¿Qué planes pagan más?" pregunta={`Recaudo, participación y ticket por tipo de plan · ${etiqueta}. Toca un plan para filtrarlo.`}>
          <MixDePlanes planes={d.planes} movil={movil} activos={filtros.planes} onElegir={porPlan} />
        </Panel>
        <Panel titulo="¿En qué meses entra más?" pregunta="Recaudo por año y mes (estacionalidad). Toca una celda para ver ese mes." className="lg:col-span-2">
          <MapaEstacionalidad estacionalidad={data.estacionalidad} onMes={porMes} />
        </Panel>
        <Panel titulo="¿De quién depende el recaudo?"
          pregunta={`Clientes que más pagaron · ${etiqueta}. El 80 % lo hacen ${d.clientes.n80} de ${d.clientes.total} clientes; los 10 primeros, el ${Math.round(d.clientes.pctTop10 || 0)} %.`}
          className="lg:col-span-2">
          <ConcentracionClientes clientes={d.clientes} movil={movil} />
        </Panel>
      </div>

      <Metodologia />
    </div>
  )
}
