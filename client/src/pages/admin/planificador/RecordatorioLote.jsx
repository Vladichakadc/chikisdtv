// Recordatorios en lote: recorre la lista de Vencidas / Próx. a vencer y va
// preparando el mensaje de renovación de cada cliente, uno tras otro. Cada
// envío es un clic del admin (WhatsApp exige abrir cada chat desde un gesto
// del usuario y no se envía nada sin que él lo vea). El mensaje de cada
// cliente usa la etapa que le toca en la secuencia de cobro y se registra.
import { useEffect, useMemo, useRef, useState } from 'react'
import { X, MessageCircle, SkipForward, Loader2, Copy, CheckCircle2, ListChecks } from 'lucide-react'
import api from '../../../config/api'
import { cn } from '../../../utils/cn'
import { useUi } from '../../../context/UiContext'
import { normalizarTelefono, urlWhatsAppTexto } from '../../../utils/telefono'
import { prepararRenovacion, etapaPendiente, etapaSugerida, ETAPAS_COBRO } from './renovacion'
import { diasLabel } from './rowHelpers'

const nombreDe = (p) => [p.nombre, p.apellido].filter(Boolean).join(' ').trim() || p.nickname || p.idPantalla

export function RecordatorioLote({ titulo, screens, recordatorios, onClose, onRegistrado }) {
  const { showToast } = useUi()
  const [soloPendientes, setSoloPendientes] = useState(true)
  const [iniciado, setIniciado] = useState(false)
  const [cola, setCola] = useState([])
  const [indice, setIndice] = useState(0)
  const [datos, setDatos] = useState({})          // idPantalla → respuesta de /comprobante
  const [etapas, setEtapas] = useState({})        // idPantalla → etapa elegida
  const [resultado, setResultado] = useState({})  // idPantalla → 'enviado' | 'copiado' | 'saltado'
  const pedidos = useRef(new Set())

  // Candidatos: con nickname (sin él no hay pagos ni contacto). Pendientes =
  // la etapa que les toca hoy aún no se envió en este ciclo.
  const candidatos = useMemo(() => screens
    .filter(p => p.nickname)
    .map(p => {
      const enviadas = recordatorios?.ultimos?.[p.idPantalla]?.etapas || []
      return { ...p, _pendiente: etapaPendiente(p._dias, enviadas), _sugerida: etapaSugerida(p._dias) }
    }), [screens, recordatorios])
  const pendientes = candidatos.filter(p => p._pendiente)
  const seleccion = soloPendientes ? pendientes : candidatos

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Precarga el actual y el siguiente para que "Enviar" abra WhatsApp al instante
  useEffect(() => {
    if (!iniciado) return
    for (const p of cola.slice(indice, indice + 2)) {
      if (pedidos.current.has(p.idPantalla)) continue
      pedidos.current.add(p.idPantalla)
      api.get(`/admin/planificador/comprobante/${encodeURIComponent(p.nickname)}`, {
        params: { idPantalla: p.idPantalla, ...(p.customerId ? { customerId: p.customerId } : {}) },
      })
        .then(r => setDatos(d => ({ ...d, [p.idPantalla]: r.data })))
        .catch(() => setDatos(d => ({ ...d, [p.idPantalla]: { error: true } })))
    }
  }, [iniciado, cola, indice])

  const iniciar = () => {
    const lista = seleccion.slice()
    setCola(lista)
    setEtapas(Object.fromEntries(lista.map(p => [p.idPantalla, p._pendiente || p._sugerida])))
    setIndice(0)
    setIniciado(true)
  }

  const actual = iniciado ? cola[indice] : null
  const d = actual ? datos[actual.idPantalla] : null
  const etapa = actual ? etapas[actual.idPantalla] : null
  const prep = useMemo(() => (actual && d && !d.error ? prepararRenovacion(actual, d, etapa) : null), [actual, d, etapa])
  const tel = useMemo(() => normalizarTelefono(d?.telefono, d?.pais), [d])
  const terminado = iniciado && indice >= cola.length
  const listo = !!prep && prep.ofertas.length > 0

  const registrar = (p, canal, et) => {
    api.post('/admin/planificador/recordatorios', { idPantalla: p.idPantalla, tipo: 'renovacion', canal, etapa: et })
      .then(() => onRegistrado?.())
      .catch(() => {})
  }
  const avanzar = (estado) => {
    setResultado(r => ({ ...r, [actual.idPantalla]: estado }))
    setIndice(i => i + 1)
  }

  const enviar = () => {
    if (!listo) return
    // Sin await antes de window.open: debe ocurrir dentro del clic
    window.open(urlWhatsAppTexto(tel.numero, prep.mensaje), '_blank')
    registrar(actual, 'whatsapp', etapa)
    avanzar('enviado')
  }
  const copiar = async () => {
    if (!listo) return
    try {
      await navigator.clipboard.writeText(prep.mensaje)
      registrar(actual, 'copiado', etapa)
      showToast('Mensaje copiado.', 'success')
      avanzar('copiado')
    } catch (e) {
      showToast(`No se pudo copiar: ${e.message || e}`, 'error')
    }
  }

  const conteo = Object.values(resultado).reduce((acc, v) => ({ ...acc, [v]: (acc[v] || 0) + 1 }), {})

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-100 rounded-2xl shadow-2xl p-4 sm:p-5 my-auto w-full max-w-[440px]" role="dialog" aria-label="Recordatorios en lote">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-700 flex items-center gap-2"><ListChecks size={16} /> Recordar a todos · {titulo}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg" aria-label="Cerrar"><X size={18} /></button>
        </div>

        {!iniciado && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-700">
              Se abrirá el mensaje de cada cliente, uno tras otro. Tú das clic en <b>Enviar</b> y WhatsApp abre el chat con el texto listo.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Qué clientes incluir">
              {[
                { v: true,  t: 'Les toca hoy', n: pendientes.length, h: 'La etapa de la secuencia que les corresponde aún no se ha enviado' },
                { v: false, t: 'Todos', n: candidatos.length, h: 'Todos los clientes de la lista con nickname' },
              ].map(o => (
                <button
                  key={String(o.v)}
                  type="button"
                  role="radio"
                  aria-checked={soloPendientes === o.v}
                  onClick={() => setSoloPendientes(o.v)}
                  title={o.h}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left transition-colors',
                    soloPendientes === o.v ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <p className="text-xs font-bold text-slate-700">{o.t}</p>
                  <p className="text-lg font-extrabold text-slate-800">{o.n}</p>
                </button>
              ))}
            </div>
            {candidatos.length < screens.length && (
              <p className="text-[11px] text-slate-400 mt-2">{screens.length - candidatos.length} sin nickname no se incluyen.</p>
            )}
            <button
              onClick={iniciar}
              disabled={seleccion.length === 0}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
            >
              <MessageCircle size={15} /> Empezar ({seleccion.length})
            </button>
          </div>
        )}

        {iniciado && !terminado && actual && (
          <>
            {/* Progreso */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>Cliente {indice + 1} de {cola.length}</span>
              <span>{conteo.enviado || 0} enviados · {conteo.copiado || 0} copiados · {conteo.saltado || 0} saltados</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-3" aria-hidden="true">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(indice / cola.length) * 100}%` }} />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="text-sm font-bold text-slate-800">{nombreDe(actual)}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">{actual.nickname}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">{diasLabel(actual._dias)}</span>
            </div>

            <div className="flex items-center gap-1 mb-2" role="radiogroup" aria-label="Etapa de la secuencia de cobro">
              {Object.entries(ETAPAS_COBRO).map(([clave, e]) => (
                <button
                  key={clave}
                  type="button"
                  role="radio"
                  aria-checked={etapa === clave}
                  onClick={() => setEtapas(s => ({ ...s, [actual.idPantalla]: clave }))}
                  title={`${e.label} · tono ${e.tono}`}
                  className={cn(
                    'flex-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors',
                    etapa === clave ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                  )}
                >
                  {e.orden}. {e.corto}
                </button>
              ))}
            </div>

            <div className="rounded-xl p-3 shadow-sm" style={{ background: '#ECE5DD' }}>
              <div className="rounded-xl rounded-tl-sm px-3.5 py-3 shadow-sm text-[12.5px] leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[38vh] overflow-y-auto" style={{ background: '#DCF8C6' }}>
                {!d
                  ? <span className="flex items-center gap-2 text-slate-500"><Loader2 size={14} className="animate-spin" /> Preparando el mensaje…</span>
                  : d.error ? <span className="text-red-600">No se pudo consultar este cliente. Sáltalo y sigue.</span>
                  : prep.mensaje}
              </div>
            </div>
            {d && !d.error && prep && prep.ofertas.length === 0 && (
              <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mt-2">No hay planes activos en el Catálogo de venta para armar la oferta.</p>
            )}
            {d && !d.error && tel.origen === 'sin_indicativo' && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">
                Teléfono sin indicativo de país ({d.telefono}): WhatsApp podría no encontrar el chat.
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 mt-3">
              <button onClick={() => avanzar('saltado')} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
                <SkipForward size={15} /> Saltar
              </button>
              <button onClick={copiar} disabled={!listo} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                <Copy size={15} /> Copiar
              </button>
              <button
                onClick={enviar}
                disabled={!listo}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 shadow-sm"
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
              >
                <MessageCircle size={15} /> Enviar
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              {tel.numero ? `Chat directo: +${tel.numero}` : 'Sin teléfono: WhatsApp abre para elegir el chat'} · al enviar pasa al siguiente.
            </p>
          </>
        )}

        {terminado && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
            <p className="mt-2 font-bold text-slate-800">Listo, recorriste {cola.length} cliente{cola.length === 1 ? '' : 's'}</p>
            <p className="text-sm text-slate-500 mt-1">
              {conteo.enviado || 0} por WhatsApp · {conteo.copiado || 0} copiados · {conteo.saltado || 0} saltados
            </p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium">Cerrar</button>
          </div>
        )}
      </div>
    </div>
  )
}
