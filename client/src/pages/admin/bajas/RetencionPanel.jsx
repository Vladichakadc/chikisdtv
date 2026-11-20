// Plan de retención: clientes dados de baja que todavía no vuelven, con una
// oferta de regreso armada sobre su último plan y lista para WhatsApp.
// Datos: GET /admin/bajas/retencion (server/services/retencionBajas.js).
import { useEffect, useMemo, useState } from 'react'
import { Gift, Loader2, Search, Phone, PhoneOff, Send } from 'lucide-react'
import api from '../../../config/api'
import { cn } from '../../../utils/cn'
import { formatDate } from '../../../utils/excelUtils'
import { COLORES_MOTIVO, fmtPesosCorto } from './lecturas'
import { estrategiaDe } from './ofertaRetencion'

const EST = estrategiaDe()
import { RetencionModal } from './RetencionModal'

const CLAVE_ENVIADAS = 'bajas.retencion.enviadas'
const leerEnviadas = () => { try { return JSON.parse(localStorage.getItem(CLAVE_ENVIADAS) || '{}') } catch { return {} } }
const guardarEnviadas = (m) => { try { localStorage.setItem(CLAVE_ENVIADAS, JSON.stringify(m)) } catch { /* sin almacenamiento */ } }
const pesos = (v) => `$${Math.round(Number(v) || 0).toLocaleString('es-CO')}`
const hace = (dias) => (dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : dias < 60 ? `hace ${dias} días` : `hace ${Math.round(dias / 30)} meses`)

const VENTANAS = [
  { clave: 90, nombre: 'Últimos 90 días' },
  { clave: 365, nombre: 'Último año' },
  { clave: 0, nombre: 'Todos' },
]

export function RetencionPanel() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [ventana, setVentana] = useState(365)
  const [motivo, setMotivo] = useState('todos')
  const [buscar, setBuscar] = useState('')
  const [ver, setVer] = useState(6)
  const [abierto, setAbierto] = useState(null)
  const [enviadas, setEnviadas] = useState(leerEnviadas)

  useEffect(() => {
    api.get('/admin/bajas/retencion')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'No se pudo cargar el plan de retención.'))
  }, [])

  const enVentana = useMemo(
    () => (data?.candidatos || []).filter(c => !ventana || c.diasDesdeBaja <= ventana),
    [data, ventana],
  )
  const motivos = useMemo(() => {
    const m = new Map()
    for (const c of enVentana) m.set(c.categoria, { clave: c.categoria, nombre: c.categoriaNombre, n: (m.get(c.categoria)?.n || 0) + 1 })
    return [...m.values()].sort((a, b) => b.n - a.n)
  }, [enVentana])
  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    return enVentana.filter(c => (motivo === 'todos' || c.categoria === motivo)
      && (!q || `${c.nombre || ''} ${c.nickname || ''} ${c.customerId || ''}`.toLowerCase().includes(q)))
  }, [enVentana, motivo, buscar])
  const enJuego = enVentana.reduce((s, c) => s + (c.ingresoMensual || 0), 0)

  const marcarEnviada = (c) => {
    const m = { ...enviadas, [c.idBaja]: new Date().toISOString().slice(0, 10) }
    setEnviadas(m); guardarEnviadas(m)
  }

  return (
    <section className="mb-5 rounded-2xl ring-1 ring-emerald-200 bg-gradient-to-b from-emerald-50/70 to-white p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="dash-num text-lg font-bold text-slate-900 leading-tight flex items-center gap-2"><Gift size={18} className="text-emerald-600" /> Plan de retención</h2>
          <p className="dash-txt text-[13px] text-slate-600 mt-0.5 max-w-2xl">
            Clientes que se fueron y no han vuelto. A todos se les envía la misma oferta agresiva sobre su último plan: <strong>{EST.descuento}% de descuento</strong>, plan anual destacado y solo {EST.vigenciaDias} días para decidir, con precio mensual, semestral y anual.
          </p>
        </div>
        {data && (
          <div className="text-right">
            <p className="dash-num text-[26px] font-bold leading-none text-emerald-700">{enVentana.length}</p>
            <p className="text-xs text-slate-500">por recuperar · {fmtPesosCorto(enJuego)}/mes en juego</p>
          </div>
        )}
      </header>

      {!data && !error && <div className="py-8 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <>
          <div className="flex flex-col lg:flex-row gap-2 mb-3">
            <div role="radiogroup" aria-label="Desde cuándo" className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold self-start">
              {VENTANAS.map(v => (
                <button key={v.clave} role="radio" aria-checked={ventana === v.clave} onClick={() => { setVentana(v.clave); setVer(6) }}
                  className={cn('px-3 py-1.5 rounded-md transition-colors', ventana === v.clave ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  {v.nombre}
                </button>
              ))}
            </div>
            <label className="relative flex-1 lg:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar cliente" aria-label="Buscar cliente"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </label>
          </div>
          {motivos.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-3" aria-label="Filtrar por motivo">
              {[{ clave: 'todos', nombre: 'Todos', n: enVentana.length }, ...motivos].map(m => (
                <button key={m.clave} onClick={() => { setMotivo(m.clave); setVer(6) }} aria-pressed={motivo === m.clave}
                  className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 transition-colors',
                    motivo === m.clave ? 'bg-slate-800 text-white ring-slate-800' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300')}>
                  {m.clave !== 'todos' && <span className="w-2 h-2 rounded-full" style={{ background: COLORES_MOTIVO[m.clave] }} />}
                  {m.nombre} · {m.n}
                </button>
              ))}
            </div>
          )}

          {!lista.length ? (
            <p className="py-6 text-center text-sm text-slate-500">No hay clientes por recuperar con estos filtros.</p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {lista.slice(0, ver).map(c => {
                const enviada = enviadas[c.idBaja]
                return (
                  <li key={c.idBaja} className="min-w-0 rounded-xl bg-white ring-1 ring-slate-200 p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{c.nombre || c.nickname}</p>
                        <p className="text-xs text-slate-500 truncate">
                          Se fue {hace(c.diasDesdeBaja)} ({formatDate(c.fechaBaja)})
                          {c.ultimaVenta ? ` · ${c.ultimaVenta.tipoPlan || c.tipoPlan} ${pesos(c.ultimaVenta.precioVenta)}` : ''}
                          {` · ${c.pantallas} pant.`}
                        </p>
                      </div>
                      <span title={c.telefono ? 'Tiene teléfono registrado' : 'Sin teléfono registrado'} className={cn('shrink-0 mt-0.5', c.telefono ? 'text-emerald-600' : 'text-slate-300')}>
                        {c.telefono ? <Phone size={14} /> : <PhoneOff size={14} />}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORES_MOTIVO[c.categoria] }} />{c.categoriaNombre}
                      </span>
                      {enviada && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">Oferta enviada {formatDate(enviada)}</span>}
                    </div>
                    <button onClick={() => setAbierto(c)}
                      className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm">
                      <Send size={13} /> {enviada ? 'Volver a ofrecer' : 'Armar oferta y enviar'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {ver < lista.length && (
            <button onClick={() => setVer(v => v + 10)} className="mt-3 text-sm font-semibold text-emerald-800 hover:underline">
              Ver más ({lista.length - ver} restantes)
            </button>
          )}
        </>
      )}

      {abierto && (
        <RetencionModal candidato={abierto} planes={data.planes} onClose={() => setAbierto(null)}
          onEnviada={(c) => marcarEnviada(c)} />
      )}
    </section>
  )
}
