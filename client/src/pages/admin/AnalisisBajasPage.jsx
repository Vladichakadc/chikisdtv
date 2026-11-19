import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, Info, Loader2, Check, Lightbulb, UserMinus } from 'lucide-react'
import api from '../../config/api'
import { cn } from '../../utils/cn'
import { useUi } from '../../context/UiContext'
import { useEsMovil } from '../../hooks/useEsMovil'
import { formatDate } from '../../utils/excelUtils'
import { DASH_TIPOS } from './dashboard/AlAire'
import { MOTIVOS_BAJA } from '../../config/motivosBaja'
import { titular, variacion, acciones, conMotivoReal, fmtPesosCorto, COLORES_MOTIVO } from './bajas/lecturas'
import {
  MotivosRanking, IngresoPorMotivo, BajasPorMes, VidaAntesDeLaBaja, MotivoSegunPlan, RecuperacionPorMotivo,
} from './bajas/GraficasBajas'

// Análisis de Bajas: "¿por qué se van los clientes, cuándo, cuánto nos
// cuesta y cuántos vuelven?". Datos y reglas: GET /admin/bajas/analisis
// (server/services/analisisBajas.js). Las bajas nuevas se registran con su
// motivo desde el Planificador ("Dar de baja") o desde el módulo Bajas.

const fmtNum = (v, d = 0) => Number(v ?? 0).toLocaleString('es-CO', { maximumFractionDigits: d })

function Panel({ titulo, pregunta, children, className, accion }) {
  return (
    <section className={cn('bg-white rounded-2xl ring-1 ring-slate-200/80 p-4 sm:p-5', className)}>
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

// ─── Titular ────────────────────────────────────────────────────────────────
function Titular({ data, periodo, onPeriodo }) {
  const t = titular(data, periodo)
  const m = data.motivos[periodo]
  const reales = conMotivoReal(m.categorias)
  const total = Math.max(1, m.total)
  return (
    <section className="rounded-[28px] overflow-hidden text-white mb-5"
      style={{ background: 'radial-gradient(120% 150% at 0% 0%, #5b1530 0%, #3a0d22 50%, #23081a 100%)' }}>
      <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="dash-txt text-sm text-rose-100/70">Análisis de bajas</p>
          <div role="radiogroup" aria-label="Período del análisis" className="inline-flex rounded-lg bg-white/10 p-0.5 text-xs font-semibold">
            {[['ultimos12', 'Últimos 12 meses'], ['historico', 'Todo el historial']].map(([k, l]) => (
              <button key={k} role="radio" aria-checked={periodo === k} onClick={() => onPeriodo(k)}
                className={cn('px-3 py-1.5 rounded-md transition-colors', periodo === k ? 'bg-white text-rose-800' : 'text-rose-100/80 hover:text-white')}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <h1 className="dash-num text-[28px] sm:text-[40px] font-bold leading-[1.08] mt-1 max-w-4xl">{t.titulo}</h1>
        {t.detalle && (
          <p className={cn('dash-txt text-[15px] mt-3 max-w-3xl leading-relaxed', t.tono === 'alerta' ? 'text-amber-200' : 'text-rose-100/85')}>
            {t.tono === 'alerta' && <AlertTriangle size={15} className="inline -mt-0.5 mr-1.5" />}{t.detalle}
          </p>
        )}
        {/* Barra de composición: cada baja del período, por motivo */}
        {m.total > 0 && (
          <div className="mt-6">
            <div className="flex h-4 rounded-full overflow-hidden ring-1 ring-white/10" role="img"
              aria-label={`${m.conMotivo} bajas con motivo y ${m.total - m.conMotivo} sin motivo`}>
              {[...reales, ...m.categorias.filter(c => c.clave === 'cambio_cuenta' && c.bajas), ...m.categorias.filter(c => c.clave === 'sin_motivo' && c.bajas)].map(c => (
                <span key={c.clave} title={`${c.nombre}: ${c.bajas}`} style={{ width: `${(c.bajas / total) * 100}%`, background: c.clave === 'sin_motivo' ? 'rgba(255,255,255,.14)' : COLORES_MOTIVO[c.clave] }} />
              ))}
            </div>
            <ul className="dash-txt flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-rose-100/80">
              {reales.slice(0, 4).map(c => (
                <li key={c.clave} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORES_MOTIVO[c.clave] }} />{c.nombre} · {c.bajas}</li>
              ))}
              {m.total - m.conMotivo > 0 && <li className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/25" />Sin motivo · {m.total - m.conMotivo}</li>}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Indicadores ────────────────────────────────────────────────────────────
function Indicador({ valor, etiqueta, nota, tono }) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 px-4 py-3.5">
      <p className="dash-num text-[30px] font-bold leading-none text-slate-900">{valor}</p>
      <p className="dash-txt text-[13px] font-semibold text-slate-700 mt-1.5">{etiqueta}</p>
      {nota && <p className={cn('dash-txt text-xs mt-0.5', tono === 'mal' ? 'text-rose-600' : tono === 'bien' ? 'text-emerald-600' : 'text-slate-500')}>{nota}</p>}
    </div>
  )
}

function Indicadores({ r }) {
  const v = variacion(r.bajas12, r.bajasAnt12)
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <Indicador valor={fmtNum(r.bajas12)} etiqueta="Bajas en 12 meses" nota={v ? v.texto : `${r.pantallas12} pantallas`} tono={v?.tono} />
      <Indicador valor={fmtPesosCorto(r.ingresoPerdido12)} etiqueta="Ingreso mensual que se fue" nota="Lo que esos clientes pagaban al mes" />
      <Indicador valor={r.vidaPromedio12 == null ? '—' : `${fmtNum(r.vidaPromedio12, 1)} m`} etiqueta="Permanencia antes de irse" nota="Promedio, desde la activación" />
      <Indicador valor={`${fmtNum(r.pctRecuperados12)}%`} etiqueta="Volvieron a comprar" nota={`${r.recuperados12} de ${r.bajas12} clientes`} tono={r.pctRecuperados12 >= 20 ? 'bien' : 'neutro'} />
    </div>
  )
}

// ─── Clasificar bajas sin motivo ────────────────────────────────────────────
function ClasificarSinMotivo({ lista, onClasificada }) {
  const { showToast } = useUi()
  const [ver, setVer] = useState(5)
  const [elegidos, setElegidos] = useState({})
  const [guardando, setGuardando] = useState(null)
  const [hechos, setHechos] = useState({})
  if (!lista.length) return null

  const guardar = async (b) => {
    const motivo = elegidos[b.id]
    if (!motivo) return
    setGuardando(b.id)
    try {
      await api.patch(`/admin/bajas/${b.id}/motivo`, { motivo })
      setHechos(h => ({ ...h, [b.id]: motivo }))
      onClasificada?.()
    } catch (e) {
      showToast(e.response?.data?.error || 'No se pudo guardar el motivo.', 'error')
    } finally {
      setGuardando(null)
    }
  }

  return (
    <Panel titulo={`Clasifica las bajas sin motivo (${lista.length})`}
      pregunta="Cada motivo que registres afina todo el análisis. Empieza por las más recientes."
      className="mb-5 ring-amber-200 bg-amber-50/40">
      <ul className="divide-y divide-amber-100">
        {lista.slice(0, ver).map(b => (
          <li key={b.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{b.nickname || b.nombre || b.idBaja}
                {b.recuperado && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Volvió</span>}
              </p>
              <p className="text-xs text-slate-500">{b.idBaja} · {formatDate(b.fechaBaja)}{b.tipoPlan ? ` · ${b.tipoPlan}` : ''}{b.observaciones && b.observaciones !== 'Migrado desde Excel' ? ` · ${b.observaciones}` : ''}</p>
            </div>
            {hechos[b.id] ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><Check size={14} /> {hechos[b.id]}</span>
            ) : (
              <div className="flex gap-2">
                <select aria-label={`Motivo de la baja de ${b.nickname || b.idBaja}`} value={elegidos[b.id] || ''}
                  onChange={e => setElegidos(s => ({ ...s, [b.id]: e.target.value }))}
                  className="flex-1 sm:w-60 px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                  <option value="">Elegir motivo…</option>
                  {MOTIVOS_BAJA.map(m => <option key={m.clave} value={m.nombre}>{m.nombre}</option>)}
                </select>
                <button onClick={() => guardar(b)} disabled={!elegidos[b.id] || guardando === b.id}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold disabled:opacity-40 inline-flex items-center gap-1.5">
                  {guardando === b.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {ver < lista.length && (
        <button onClick={() => setVer(v => v + 10)} className="mt-2 text-sm font-semibold text-amber-800 hover:underline">
          Ver más ({lista.length - ver} restantes)
        </button>
      )}
    </Panel>
  )
}

// ─── Metodología ────────────────────────────────────────────────────────────
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
          <li><strong>Motivo:</strong> el que se registró en la baja, agrupado en el catálogo de motivos. Los textos antiguos se asignan por palabras clave. Las bajas sin motivo se muestran aparte; nunca se reparten entre los demás.</li>
          <li><strong>Ingreso mensual que se fue:</strong> lo que el cliente pagaba al mes según su última venta antes de la baja (precio ÷ meses del plan). Es un estimado.</li>
          <li><strong>Permanencia:</strong> meses entre la primera activación de pantalla del cliente y la fecha de baja.</li>
          <li><strong>Volvieron a comprar:</strong> el cliente tiene una venta (que no sea cortesía) después de la fecha de baja.</li>
          <li><strong>"Cambio de cuenta o de pantalla"</strong> es un movimiento interno: aparece en el registro, pero no cuenta como cliente perdido.</li>
          <li>Las bajas nuevas se registran con su motivo desde el Planificador (botón <strong>Dar de baja</strong>) o desde el módulo Bajas.</li>
        </ul>
      )}
    </section>
  )
}

export default function AnalisisBajasPage() {
  const movil = useEsMovil()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [periodo, setPeriodo] = useState('ultimos12')

  const cargar = () => api.get('/admin/bajas/analisis')
    .then(r => { setData(r.data); setError(null) })
    .catch(e => setError(e.response?.data?.error || 'No se pudo cargar el análisis de bajas.'))
  useEffect(() => { cargar() }, [])

  const m = data?.motivos?.[periodo]
  const reales = useMemo(() => conMotivoReal(m?.categorias), [m])
  const todas = useMemo(() => (m?.categorias || []).filter(c => c.bajas > 0), [m])
  const queHacer = useMemo(() => (data ? acciones(data, periodo) : []), [data, periodo])

  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>
  if (!data) return <div className="p-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>

  const etiquetaPeriodo = periodo === 'ultimos12' ? 'últimos 12 meses' : 'todo el historial'

  return (
    <div className="dash-txt max-w-7xl mx-auto">
      <style>{DASH_TIPOS}</style>
      <Titular data={data} periodo={periodo} onPeriodo={setPeriodo} />
      <Indicadores r={data.resumen} />

      {queHacer.length > 0 && (
        <section className="mb-5 rounded-2xl bg-slate-900 text-white p-4 sm:p-5">
          <h2 className="dash-num text-lg font-bold flex items-center gap-2"><Lightbulb size={18} className="text-amber-300" /> Qué hacer con lo que muestran los datos</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-3">
            {queHacer.map(a => (
              <li key={a.clave} className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                <p className="text-xs font-semibold" style={{ color: COLORES_MOTIVO[a.clave] === '#334155' ? '#cbd5e1' : COLORES_MOTIVO[a.clave] }}>{a.motivo}</p>
                <p className="text-sm text-slate-200 mt-1 leading-snug">{a.texto}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ClasificarSinMotivo lista={data.sinMotivo} onClasificada={cargar} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel titulo="¿Por qué se van?" pregunta={`Bajas por motivo · cantidad y % de las que tienen motivo · ${etiquetaPeriodo}`}>
          <MotivosRanking categorias={reales} movil={movil} />
          {m.total > m.conMotivo && (
            <p className="text-xs text-slate-500 mt-2">No incluye {m.total - m.conMotivo} baja{m.total - m.conMotivo === 1 ? '' : 's'} sin motivo registrado.</p>
          )}
        </Panel>
        <Panel titulo="¿Cuánto cuesta cada motivo?" pregunta={`Ingreso mensual que dejó de entrar, en pesos · ${etiquetaPeriodo}`}>
          <IngresoPorMotivo categorias={todas} movil={movil} />
        </Panel>
        <Panel titulo="¿Cuándo se fueron?" pregunta={`Bajas por mes y motivo · últimos ${movil ? 12 : 24} meses`} className="lg:col-span-2">
          <BajasPorMes porMes={data.porMes} top={data.topMotivos} catalogo={data.catalogo} movil={movil} />
        </Panel>
        <Panel titulo="¿Cuánto tiempo alcanzaron a estar?" pregunta="Permanencia antes de la baja · todo el historial. En rojo, las que se van en los primeros 6 meses.">
          <VidaAntesDeLaBaja vida={data.vida} movil={movil} />
        </Panel>
        <Panel titulo="¿El motivo cambia según el plan?" pregunta="Reparto de motivos por plan · entre paréntesis, bajas con motivo · todo el historial">
          <MotivoSegunPlan porPlan={data.porPlan} catalogo={data.catalogo} movil={movil} />
        </Panel>
        <Panel titulo="¿Cuántos vuelven?" pregunta={`Clientes que volvieron a comprar después de la baja, por motivo · ${etiquetaPeriodo}`} className="lg:col-span-2">
          <RecuperacionPorMotivo categorias={todas} movil={movil} />
        </Panel>
      </div>

      <p className="text-xs text-slate-500 mt-4 flex items-center gap-1.5">
        <UserMinus size={13} /> Para registrar una baja nueva con su motivo usa <strong>Dar de baja</strong> en el Planificador: la pantalla queda Libre en el mismo paso.
      </p>
      <Metodologia />
    </div>
  )
}
